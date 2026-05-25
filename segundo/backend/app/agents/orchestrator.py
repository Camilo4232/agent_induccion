"""
Orchestrator v3 — Uses tool use to decide which specialist sub-agents to invoke.
Sub-agents reason with their own context and return answers.
The orchestrator synthesizes if multiple agents responded.
"""
import json
import logging
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.db.models import ChatSession, ChatMessage, UnansweredQuestion, KnowledgeProposal, KnowledgeEntry
from app.agents.sub_agents import run_parallel_sub_agents
from app.services.claude import complete, complete_with_tools
from app.core.config import settings


async def _create_escalation_notification(business_id: UUID, question: str, db: AsyncSession):
    """Create notification for business owner when a question is escalated."""
    from app.db.models import User, Notification
    result = await db.execute(
        select(User).where(User.business_id == business_id, User.role == "owner")
    )
    owner = result.scalar_one_or_none()
    if owner:
        notification = Notification(
            user_id=owner.id,
            type="escalation",
            title="Pregunta escalada",
            body=f"Un empleado preguntó: {question[:200]}",
        )
        db.add(notification)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tool definitions — orchestrator decides WHICH agents to call
# ---------------------------------------------------------------------------

ORCHESTRATOR_TOOLS = [
    {
        "name": "delegate_to_agents",
        "description": (
            "Delega la pregunta a los agentes especialistas adecuados. "
            "Puedes activar uno o varios dominios a la vez."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "domains": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["ventas", "operaciones", "clientes", "general"],
                    },
                    "description": (
                        "Lista de dominios a consultar. "
                        "ventas=precios/descuentos, operaciones=proveedores/horarios, "
                        "clientes=historial/VIPs, general=todo lo demás."
                    ),
                },
                "reasoning": {
                    "type": "string",
                    "description": "Por qué elegiste estos dominios.",
                },
            },
            "required": ["domains"],
        },
    },
    {
        "name": "escalate_to_owner",
        "description": (
            "Usa esto cuando la situación involucra: dinero que no cuadra, "
            "conflictos graves con clientes, temas legales, o decisiones que solo "
            "puede tomar el dueño."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {"type": "string"},
                "urgency": {"type": "string", "enum": ["alta", "media"]},
            },
            "required": ["reason", "urgency"],
        },
    },
    {
        "name": "flag_new_knowledge",
        "description": (
            "Usa esto cuando el empleado menciona cómo resolvió algo que no estaba "
            "en el manual, o comparte una política o proceso nuevo."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "knowledge": {"type": "string"},
                "category": {"type": "string"},
            },
            "required": ["knowledge", "category"],
        },
    },
]

ORCHESTRATOR_SYSTEM = """\
Eres el orquestrador de Segundo en {business_name}.
Tu rol es analizar la pregunta del empleado y decidir qué agentes especialistas activar.

AGENTES DISPONIBLES:
- ventas: precios, descuentos, promociones, políticas comerciales
- operaciones: proveedores, inventario, horarios, turnos, procesos internos
- clientes: historial de clientes, clientes VIP, preferencias especiales
- general: cualquier cosa que no encaje en las categorías anteriores

INSTRUCCIONES:
1. Lee la pregunta y decide qué dominios son relevantes.
2. Usa delegate_to_agents con los dominios correctos (puede ser más de uno).
3. Si la pregunta involucra dinero que no cuadra, conflicto legal o decisión crítica → usa escalate_to_owner.
4. Si el empleado menciona cómo resolvió algo nuevo → usa flag_new_knowledge.
5. Si la pregunta es ambigua, activa general como fallback.
6. Si es un saludo, despedida o conversación casual (hola, gracias, cómo estás, etc.) → usa delegate_to_agents con ["general"].
"""

SYNTHESIZER_SYSTEM = """\
Eres "Segundo", el asistente interno de {business_name}.
Tienes respuestas de uno o más agentes especialistas sobre la pregunta del empleado.

Tu tarea:
- Si hay UNA respuesta relevante: preséntala directamente, de forma clara y amigable.
- Si hay VARIAS respuestas: sintetízalas en una respuesta coherente, sin repetir.
- Si NINGUNA tiene información: di "No tengo información sobre eso. Le avisaré al encargado."

Habla como un colega con experiencia. Directo, claro, amigable.
"""


# ---------------------------------------------------------------------------
# Orchestrator decision loop
# ---------------------------------------------------------------------------

async def _orchestrate(
    question: str,
    business_name: str,
    business_id: UUID,
    db: AsyncSession,
    role: str = "employee",
) -> tuple[str, str, list[str], list[dict], list[str], list[str]]:
    """
    Returns: (response_text, confidence, agents_used, flagged_knowledge, source_ids, source_facts)
    """
    system = ORCHESTRATOR_SYSTEM.format(business_name=business_name)
    messages = [{"role": "user", "content": question}]

    agents_used: list[str] = []
    flagged_knowledge: list[dict] = []
    escalated = False

    # Step 1 — Orchestrator decides which agents to call
    t_start = time.time()
    logger.info("Orchestrating: question_len=%d, business=%s", len(question), business_id)

    response = complete_with_tools(
        system=system,
        messages=messages,
        tools=ORCHESTRATOR_TOOLS,
        max_tokens=512,
    )

    choice = response.choices[0]
    tool_calls = choice.message.tool_calls or []

    domains_to_call: list[str] = []

    for tc in tool_calls:
        try:
            args = json.loads(tc.function.arguments)
        except json.JSONDecodeError:
            args = {}

        if tc.function.name == "delegate_to_agents":
            domains_to_call = args.get("domains", ["general"])
            agents_used.extend(domains_to_call)

        elif tc.function.name == "escalate_to_owner":
            # Only escalate for genuinely urgent situations — guard against LLM misfires
            escalation_keywords = ["dinero", "caja", "robo", "legal", "conflicto", "accidente", "denuncia", "fraude"]
            if any(kw in question.lower() for kw in escalation_keywords):
                escalated = True
                agents_used.append("escalate")
            else:
                # LLM chose escalate erroneously — fallback to general search
                domains_to_call = ["general"]
                agents_used.append("general")

        elif tc.function.name == "flag_new_knowledge":
            flagged_knowledge.append({
                "knowledge": args.get("knowledge", ""),
                "category": args.get("category", "otro"),
            })

    # If orchestrator didn't call any tool, use general as fallback
    if not domains_to_call and not escalated:
        domains_to_call = ["general"]
        agents_used.append("general")

    logger.info("Routing decision: domains=%s, escalated=%s, flagged=%d",
                 domains_to_call, escalated, len(flagged_knowledge))

    if escalated:
        await _create_escalation_notification(business_id, question, db)
        return (
            "Esta situación requiere la atención del encargado. Le voy a avisar para que te contacte.",
            "escalated",
            agents_used,
            flagged_knowledge,
            [],
            [],
        )

    # Step 2 — Run specialist sub-agents
    sub_results = await run_parallel_sub_agents(
        domains=domains_to_call,
        question=question,
        business_name=business_name,
        business_id=business_id,
        db=db,
        role=role,
    )

    # Step 2b — Fallback: search across ALL domains if specialists found nothing
    if not sub_results and "general" not in domains_to_call:
        agents_used.append("general_fallback")
        sub_results = await run_parallel_sub_agents(
            domains=["general"],
            question=question,
            business_name=business_name,
            business_id=business_id,
            db=db,
            role=role,
        )

    # Step 3 — Synthesize
    if not sub_results:
        final_answer, confidence = _handle_no_context(question, business_name)
        return final_answer, confidence, agents_used, flagged_knowledge, [], []

    found_results = [r for r in sub_results if r["found_context"]]

    source_ids: list[str] = []
    source_facts: list[str] = []

    if len(found_results) == 1:
        # Single agent answered — return directly without extra LLM call
        final_answer = found_results[0]["answer"]
        confidence = "high"
        source_ids = found_results[0].get("source_ids", [])
        source_facts = found_results[0].get("source_facts", [])
    elif len(found_results) > 1:
        # Multiple agents answered — synthesize a unified response that includes
        # all relevant info instead of dropping the non-"best" agents.
        synth_input_lines = []
        for r in found_results:
            synth_input_lines.append(
                f"[{r.get('agent_name', r['domain'])}]\n{r['answer']}"
            )
        synth_input = "\n\n".join(synth_input_lines)

        synth_system = SYNTHESIZER_SYSTEM.format(business_name=business_name)
        synth_user = (
            f"Pregunta del empleado: {question}\n\n"
            f"Respuestas de los agentes especialistas:\n\n{synth_input}\n\n"
            f"Sintetiza una sola respuesta clara para el empleado. "
            f"Si los agentes mencionan ítems/variantes distintas pero relevantes a la pregunta, "
            f"inclúyelas TODAS (no descartes ninguna). Sin frases de relleno."
        )
        final_answer = complete(
            system=synth_system,
            messages=[{"role": "user", "content": synth_user}],
            max_tokens=600,
        ).strip()
        confidence = "high"
        # Merge sources from all contributing agents, preserving order, dedup by id
        seen_ids: set[str] = set()
        for r in found_results:
            for sid, sfact in zip(r.get("source_ids", []), r.get("source_facts", [])):
                if sid not in seen_ids:
                    seen_ids.add(sid)
                    source_ids.append(sid)
                    source_facts.append(sfact)
        logger.info("Synthesized response from %d agents: %s",
                    len(found_results), [r["domain"] for r in found_results])
    else:
        # No business knowledge found — check if it's casual conversation
        final_answer, confidence = _handle_no_context(question, business_name)

    duration_ms = round((time.time() - t_start) * 1000, 2)
    logger.info("Orchestration complete: confidence=%s, agents=%s, duration_ms=%s",
                 confidence, agents_used, duration_ms)

    return final_answer, confidence, agents_used, flagged_knowledge, source_ids, source_facts


def _handle_no_context(question: str, business_name: str) -> tuple[str, str]:
    """
    When no business knowledge is found, decide whether to respond conversationally
    or escalate. Uses Claude to answer casual questions naturally.
    """
    from app.services.claude import complete

    system = f"""\
Eres Segundo, el asistente interno de {business_name}. Eres amigable y natural.

Si el mensaje es un saludo, despedida, agradecimiento o conversación casual → responde de forma breve y amigable.
Si es una pregunta sobre el negocio que no puedes responder sin información específica → responde exactamente: "ESCALAR"

Responde SOLO con tu mensaje al empleado, o con "ESCALAR". Sin explicaciones adicionales."""

    raw = complete(
        system=system,
        messages=[{"role": "user", "content": question}],
        max_tokens=150,
    ).strip()

    if raw == "ESCALAR" or "escalar" in raw.lower():
        return (
            "No tengo información sobre eso. Le avisaré al encargado para que lo resuelva.",
            "none",
        )

    return raw, "conversational"


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------

async def _get_or_create_session(
    user_id: UUID, business_id: UUID, session_id_str: str | None, db: AsyncSession,
) -> ChatSession:
    if session_id_str:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == UUID(session_id_str),
                ChatSession.user_id == user_id,
            )
        )
        session = result.scalar_one_or_none()
        if session:
            return session

    session = ChatSession(user_id=user_id, business_id=business_id)
    db.add(session)
    await db.flush()
    return session


async def _get_chat_history(session_id: UUID, db: AsyncSession) -> list[dict]:
    limit = settings.chat_history_limit
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    messages = list(reversed(result.scalars().all()))
    return [{"role": m.role, "content": m.content} for m in messages]


# ---------------------------------------------------------------------------
# Public entry point (same signature as before — no changes in api/ask.py needed)
# ---------------------------------------------------------------------------

async def handle_ask(
    question: str,
    user_id: UUID,
    business_id: UUID,
    business_name: str,
    session_id_str: str | None,
    db: AsyncSession,
    role: str = "employee",
) -> dict:
    session = await _get_or_create_session(user_id, business_id, session_id_str, db)
    chat_history = await _get_chat_history(session.id, db)

    # Add chat history context to the question if available
    question_with_context = question
    if chat_history:
        history_text = "\n".join(f"{m['role']}: {m['content']}" for m in chat_history[-4:])
        question_with_context = f"Historial reciente:\n{history_text}\n\nPregunta actual: {question}"

    response_text, confidence, agents_used, flagged_knowledge, source_ids, source_facts = await _orchestrate(
        question=question_with_context,
        business_name=business_name,
        business_id=business_id,
        db=db,
        role=role,
    )

    db.add(ChatMessage(session_id=session.id, role="user", content=question))
    db.add(ChatMessage(
        session_id=session.id, role="assistant", content=response_text,
        knowledge_used=[UUID(sid) for sid in source_ids] if source_ids else None,
    ))

    # Track usage_count and last_used_at for knowledge entries used in this response
    if source_ids:
        from datetime import datetime
        for sid in source_ids:
            try:
                entry_result = await db.execute(
                    select(KnowledgeEntry).where(KnowledgeEntry.id == UUID(sid))
                )
                entry = entry_result.scalar_one_or_none()
                if entry:
                    entry.usage_count = (entry.usage_count or 0) + 1
                    entry.last_used_at = datetime.utcnow()
            except Exception:
                pass

    if confidence in ("none", "escalated"):
        db.add(UnansweredQuestion(
            business_id=business_id,
            question=question,
            asked_by=user_id,
        ))

    for item in flagged_knowledge:
        db.add(KnowledgeProposal(
            business_id=business_id,
            proposed_fact=item["knowledge"],
            category=item["category"],
            domain="general",
            source_session_id=session.id,
            status="pending",
        ))

    await db.commit()

    sources = [
        {"id": sid, "fact": sfact, "category": None}
        for sid, sfact in zip(source_ids, source_facts)
    ]

    return {
        "response": response_text,
        "sources": sources,
        "confidence": confidence,
        "session_id": str(session.id),
        "tools_used": agents_used,
        "knowledge_flagged": len(flagged_knowledge) > 0,
    }
