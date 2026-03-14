"""
LLM service — uses Ollama (local) via OpenAI-compatible endpoint.
The module is still called 'claude' so no imports need to change across the codebase.
"""
import json
import re
from types import SimpleNamespace
from openai import OpenAI

_client = None
MODEL = "llama3.2"


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key="ollama",
            base_url="http://localhost:11434/v1",
        )
    return _client


def complete(system: str, messages: list[dict], max_tokens: int = 1024) -> str:
    client = get_client()
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "system", "content": system}] + messages,
    )
    return response.choices[0].message.content


def complete_with_tools(
    system: str,
    messages: list[dict],
    tools: list[dict],
    max_tokens: int = 1024,
):
    """
    Calls Ollama with a JSON-based tool selection prompt.
    Returns a mock response object compatible with the orchestrator.
    """
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

    client = get_client()
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "system", "content": tool_prompt}] + messages,
    )

    raw = response.choices[0].message.content or ""

    # Extract JSON from the response
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

    # Build a mock response object the orchestrator can use
    tool_call = SimpleNamespace(
        function=SimpleNamespace(
            name=tool_name,
            arguments=json.dumps(arguments),
        )
    )
    message = SimpleNamespace(tool_calls=[tool_call])
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])
