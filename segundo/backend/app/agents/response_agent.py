from app.services.claude import complete

RESPONSE_SYSTEM_TEMPLATE = """\
Eres "Segundo", el asistente interno del negocio {business_name}.
Ayudas a los empleados nuevos respondiendo sus preguntas sobre cómo funciona el negocio.

REGLAS:
- Responde ÚNICAMENTE usando el conocimiento del contexto proporcionado
- Si no tienes información suficiente, di exactamente:
  "No tengo información sobre eso. Le avisaré al encargado para que lo resuelva."
- Sé claro, directo y amigable. Habla como un colega con experiencia, no como un manual
- Nunca inventes información ni supongas
- Si la información está en el contexto, responde con confianza y cita el hecho relevante

CONOCIMIENTO DISPONIBLE:
{retrieved_knowledge}
"""


def generate_response(
    question: str,
    business_name: str,
    retrieved_entries: list[dict],
    chat_history: list[dict],
) -> tuple[str, str]:
    """
    Returns (response_text, confidence).
    confidence: 'high' | 'low' | 'none'
    """
    if not retrieved_entries:
        knowledge_block = "No hay información disponible sobre este tema."
        confidence = "none"
    else:
        lines = []
        for e in retrieved_entries:
            lines.append(f"[{e['category'] or 'otro'}] {e['processed_fact']}")
        knowledge_block = "\n".join(lines)
        confidence = "high"

    system = RESPONSE_SYSTEM_TEMPLATE.format(
        business_name=business_name,
        retrieved_knowledge=knowledge_block,
    )

    # Build messages: history (last 6) + current question
    messages = list(chat_history[-6:]) + [{"role": "user", "content": question}]

    response_text = complete(system=system, messages=messages, max_tokens=512)

    # Detect escalation
    if "No tengo información sobre eso" in response_text:
        confidence = "none"

    return response_text, confidence
