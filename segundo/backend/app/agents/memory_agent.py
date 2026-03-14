import json
import re
import logging
from app.services.claude import complete

logger = logging.getLogger(__name__)

MEMORY_SYSTEM_PROMPT = """\
Eres un asistente que extrae y estructura el conocimiento operacional de un negocio.
El dueño te está enseñando cómo funciona su empresa.

Tu tarea:
1. Identificar el hecho principal que está comunicando
2. Reformularlo de forma clara y consultable (como una wiki interna)
3. Asignarle una categoría: precios | procesos | clientes | proveedores | horarios | otro
4. Asignarle un dominio según estas reglas:
   - ventas: precios, descuentos, comisiones, promociones, políticas de venta
   - operaciones: proveedores, inventario, horarios, turnos, procesos internos
   - clientes: clientes específicos, historial, preferencias, VIPs
   - legal: contratos, garantías, devoluciones, temas legales o regulatorios
   - general: todo lo que no encaja en las categorías anteriores
5. Si el mensaje es ambiguo, hacer UNA pregunta de aclaración
6. Si el texto contiene múltiples hechos distintos, devolver un array de hechos

Responde SIEMPRE en JSON válido con este formato:
{
  "facts": [
    {
      "fact": "el hecho reformulado claramente",
      "category": "string",
      "domain": "string",
      "needs_clarification": false,
      "clarification_question": null
    }
  ]
}

Si hay un solo hecho, el array tendrá un solo elemento.
Si necesitas aclaración sobre algún hecho, pon needs_clarification=true y la pregunta en clarification_question.
"""


def _parse_llm_json(raw: str) -> dict:
    """Best-effort JSON extraction from LLM output."""
    text = raw.strip()
    # Strip markdown code fences
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting the outermost JSON object
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")


def extract_facts(raw_input: str) -> list[dict]:
    """
    Returns a list of extracted fact dicts:
    { fact, category, needs_clarification, clarification_question }
    """
    max_attempts = 2
    last_error = None

    for attempt in range(max_attempts):
        response_text = complete(
            system=MEMORY_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": raw_input}],
            max_tokens=1024,
        )

        try:
            data = _parse_llm_json(response_text)
            return data.get("facts", [])
        except (ValueError, json.JSONDecodeError) as e:
            last_error = e
            logger.warning("LLM returned invalid JSON (attempt %d): %s", attempt + 1, str(e))

    # All retries failed — return a passthrough fact so the user isn't blocked
    logger.error("extract_facts failed after %d attempts, using raw input as fact", max_attempts)
    return [{
        "fact": raw_input.strip(),
        "category": "otro",
        "domain": "general",
        "needs_clarification": False,
        "clarification_question": None,
    }]
