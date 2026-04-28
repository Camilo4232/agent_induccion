"""
Extraction Agent — converts arbitrary CSV/JSON data into structured knowledge facts.

Uses Claude to intelligently interpret tabular or structured data and produce
human-readable facts suitable for the knowledge base.
"""
import csv
import io
import json
import logging
import re

from app.services.claude import complete

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM_PROMPT = """\
Eres un agente de extraccion de conocimiento. Tu tarea es convertir datos estructurados \
(tablas CSV, JSON, etc.) en hechos legibles y utiles para la base de conocimiento de un negocio.

Reglas:
1. Analiza las columnas/campos de los datos para entender que tipo de informacion contienen.
2. Genera hechos claros y concisos en lenguaje natural a partir de cada fila o registro.
3. Agrupa o resume datos repetitivos — no generes un hecho por cada fila si son 100 filas similares. \
   Resume patrones, totales, o datos clave.
4. Cada hecho debe ser autocontenido (entendible sin ver la tabla original).
5. Asigna categoria: precios | procesos | clientes | proveedores | horarios | estadisticas | otro
6. Asigna dominio: ventas | operaciones | clientes | legal | general

Responde SIEMPRE en JSON valido con este formato:
{
  "facts": [
    {
      "fact": "descripcion del hecho",
      "category": "string",
      "domain": "string"
    }
  ]
}

Limites:
- Maximo 50 hechos por bloque de datos.
- Si los datos son muy extensos, prioriza los datos mas relevantes y resume el resto.
- Si los datos no contienen informacion util para un negocio, devuelve un array vacio.
"""

# Max rows to send to LLM per chunk to avoid token overflow
MAX_ROWS_PER_CHUNK = 50
MAX_CHARS_PER_CHUNK = 10000
# Max chunks to process (each chunk = 1 LLM call)
MAX_CHUNKS = 3


def _parse_llm_json(raw: str) -> dict:
    """Best-effort JSON extraction from LLM output."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")


def _csv_to_text_chunks(csv_text: str) -> list[str]:
    """Split CSV into text chunks small enough for the LLM."""
    reader = csv.DictReader(io.StringIO(csv_text))
    rows = list(reader)
    if not rows:
        return []

    headers = list(rows[0].keys())
    chunks = []

    for i in range(0, len(rows), MAX_ROWS_PER_CHUNK):
        batch = rows[i:i + MAX_ROWS_PER_CHUNK]
        lines = [",".join(headers)]
        for row in batch:
            lines.append(",".join(str(row.get(h, "")) for h in headers))
        chunk = "\n".join(lines)
        if len(chunk) > MAX_CHARS_PER_CHUNK:
            chunk = chunk[:MAX_CHARS_PER_CHUNK] + "\n[... datos truncados]"
        chunks.append(chunk)

    return chunks


def _json_to_text_chunks(json_text: str) -> list[str]:
    """Split JSON data into text chunks."""
    data = json.loads(json_text)

    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        # If it has a main array key, use it
        for key in data:
            if isinstance(data[key], list):
                items = data[key]
                break
        else:
            return [json.dumps(data, ensure_ascii=False, indent=2)[:MAX_CHARS_PER_CHUNK]]
    else:
        return [str(data)[:MAX_CHARS_PER_CHUNK]]

    chunks = []
    for i in range(0, len(items), MAX_ROWS_PER_CHUNK):
        batch = items[i:i + MAX_ROWS_PER_CHUNK]
        chunk = json.dumps(batch, ensure_ascii=False, indent=2)
        if len(chunk) > MAX_CHARS_PER_CHUNK:
            chunk = chunk[:MAX_CHARS_PER_CHUNK] + "\n... datos truncados"
        chunks.append(chunk)

    return chunks


def _count_rows(file_content: str, is_csv: bool) -> int:
    """Count total rows/records in the file for context."""
    if is_csv:
        return file_content.count("\n") - 1  # minus header
    try:
        data = json.loads(file_content)
        if isinstance(data, list):
            return len(data)
        for key in data:
            if isinstance(data[key], list):
                return len(data[key])
    except Exception:
        pass
    return 0


def extract_facts_from_file(file_content: str, filename: str) -> list[dict]:
    """
    Use Claude to extract knowledge facts from arbitrary file content.
    Returns list of {fact, category, domain} dicts.

    Processes at most MAX_CHUNKS chunks to control LLM costs.
    For large files, the LLM is told the total size so it can summarize.
    """
    is_csv = filename.lower().endswith(".csv")

    try:
        if is_csv:
            chunks = _csv_to_text_chunks(file_content)
        else:
            chunks = _json_to_text_chunks(file_content)
    except Exception as e:
        logger.error("Failed to parse file %s: %s", filename, e)
        return []

    if not chunks:
        logger.warning("No data chunks extracted from file %s", filename)
        return []

    total_rows = _count_rows(file_content, is_csv)
    total_chunks = len(chunks)
    chunks_to_process = chunks[:MAX_CHUNKS]

    logger.info(
        "Extraction agent: %s has %d rows, %d chunks — processing %d",
        filename, total_rows, total_chunks, len(chunks_to_process),
    )

    all_facts = []
    for idx, chunk in enumerate(chunks_to_process):
        prompt = (
            f"Archivo: {filename} ({total_rows} registros en total)\n"
            f"Mostrando bloque {idx + 1} de {total_chunks} "
            f"(procesando {len(chunks_to_process)} bloques).\n"
            f"Resume patrones generales en vez de crear un hecho por cada fila.\n\n"
            f"{chunk}"
        )

        try:
            response_text = complete(
                system=EXTRACTION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048,
            )
            data = _parse_llm_json(response_text)
            facts = data.get("facts", [])
            all_facts.extend(facts)
            logger.info("Extraction agent: chunk %d/%d produced %d facts", idx + 1, len(chunks_to_process), len(facts))
        except Exception as e:
            logger.warning("Extraction agent failed on chunk %d: %s", idx + 1, e)

    # Cap at 100 facts total
    if len(all_facts) > 100:
        all_facts = all_facts[:100]

    return all_facts
