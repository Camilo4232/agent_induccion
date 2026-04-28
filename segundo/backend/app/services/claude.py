"""
LLM service — supports Ollama (local) and Claude (Anthropic) providers.
The module keeps the name 'claude' so no imports need to change across the codebase.
Provider is selected via LLM_PROVIDER env var ("ollama" or "claude").
"""
import json
import logging
import re
from types import SimpleNamespace

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ollama provider (local, via OpenAI-compatible endpoint)
# ---------------------------------------------------------------------------

_ollama_client = None
OLLAMA_MODEL = "llama3.2"


def _get_ollama_client():
    global _ollama_client
    if _ollama_client is None:
        from openai import OpenAI
        _ollama_client = OpenAI(
            api_key="ollama",
            base_url="http://localhost:11434/v1",
        )
    return _ollama_client


def _ollama_complete(system: str, messages: list[dict], max_tokens: int = 1024) -> str:
    client = _get_ollama_client()
    response = client.chat.completions.create(
        model=OLLAMA_MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "system", "content": system}] + messages,
    )
    return response.choices[0].message.content


def _ollama_complete_with_tools(
    system: str,
    messages: list[dict],
    tools: list[dict],
    max_tokens: int = 1024,
):
    """Emulates tool use via JSON prompt for Ollama."""
    tool_names = [t["name"] for t in tools]
    tool_descriptions = "\n".join(
        f'- {t["name"]}: {t["description"]}' for t in tools
    )

    tool_prompt = (
        f"{system}\n\n"
        f"Tienes estas herramientas disponibles:\n{tool_descriptions}\n\n"
        f"Responde SOLO con un JSON válido con este formato:\n"
        f'{{"tool": "<nombre_herramienta>", "arguments": {{...}}}}\n'
        f"Si la pregunta es general usa: "
        f'{{"tool": "delegate_to_agents", "arguments": {{"domains": ["general"]}}}}'
    )

    client = _get_ollama_client()
    response = client.chat.completions.create(
        model=OLLAMA_MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "system", "content": tool_prompt}] + messages,
    )

    raw = response.choices[0].message.content or ""

    try:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        data = json.loads(match.group()) if match else {}
    except (json.JSONDecodeError, AttributeError):
        data = {}

    tool_name = data.get("tool", "delegate_to_agents")
    arguments = data.get("arguments", {"domains": ["general"]})

    if tool_name not in tool_names:
        tool_name = "delegate_to_agents"
        arguments = {"domains": ["general"]}

    return _build_mock_tool_response(tool_name, arguments)


# ---------------------------------------------------------------------------
# Claude provider (Anthropic API with native tool use)
# ---------------------------------------------------------------------------

_claude_client = None
CLAUDE_MODEL = "claude-sonnet-4-6"


def _get_claude_client():
    global _claude_client
    if _claude_client is None:
        import anthropic
        _claude_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _claude_client


def _claude_complete(system: str, messages: list[dict], max_tokens: int = 1024) -> str:
    client = _get_claude_client()
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    return response.content[0].text


def _claude_complete_with_tools(
    system: str,
    messages: list[dict],
    tools: list[dict],
    max_tokens: int = 1024,
):
    """Uses Claude's native tool use for structured decisions."""
    client = _get_claude_client()

    # Convert our tool format to Claude's tool format
    claude_tools = []
    for t in tools:
        claude_tools.append({
            "name": t["name"],
            "description": t["description"],
            "input_schema": t.get("input_schema", {"type": "object", "properties": {}}),
        })

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system,
        tools=claude_tools,
        messages=messages,
    )

    # Extract tool use from Claude response
    for block in response.content:
        if block.type == "tool_use":
            return _build_mock_tool_response(block.name, block.input)

    # No tool call — fallback to general delegation
    logger.warning("Claude did not return a tool call, falling back to general")
    return _build_mock_tool_response("delegate_to_agents", {"domains": ["general"]})


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _build_mock_tool_response(tool_name: str, arguments: dict):
    """Build a mock response object compatible with the orchestrator."""
    tool_call = SimpleNamespace(
        function=SimpleNamespace(
            name=tool_name,
            arguments=json.dumps(arguments),
        )
    )
    message = SimpleNamespace(tool_calls=[tool_call])
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


# ---------------------------------------------------------------------------
# Public API — provider-agnostic (used by all agents)
# ---------------------------------------------------------------------------

def complete(system: str, messages: list[dict], max_tokens: int = 1024) -> str:
    if settings.llm_provider == "claude":
        return _claude_complete(system, messages, max_tokens)
    return _ollama_complete(system, messages, max_tokens)


def complete_with_tools(
    system: str,
    messages: list[dict],
    tools: list[dict],
    max_tokens: int = 1024,
):
    if settings.llm_provider == "claude":
        return _claude_complete_with_tools(system, messages, tools, max_tokens)
    return _ollama_complete_with_tools(system, messages, tools, max_tokens)
