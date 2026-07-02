"""
Catálogo de plantillas de agentes — Segundo v3.

Las plantillas viven como JSON en app/data/agent_templates/ (uno o varios
archivos; cada archivo puede ser una lista o un objeto {"templates": [...]}).
Cada plantilla normalizada tiene:
    key, name, role_title, persona, system_prompt_base,
    domain_scopes[], industries[], can_hire, is_reviewer

El catálogo se carga una sola vez y queda cacheado en memoria.
"""
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

AGENT_TEMPLATES_DIR = Path(__file__).parent.parent / "data" / "agent_templates"

_templates_cache: list[dict] | None = None


def _normalize_template(raw: dict) -> dict | None:
    """Valida y normaliza una plantilla cruda del JSON. None si es inválida."""
    key = str(raw.get("key") or "").strip()
    name = str(raw.get("name") or "").strip()
    role_title = str(raw.get("role_title") or "").strip()
    if not key or not name or not role_title:
        return None

    domain_scopes = raw.get("domain_scopes") or []
    if not isinstance(domain_scopes, list):
        domain_scopes = []
    industries = raw.get("industries") or ["*"]
    if not isinstance(industries, list) or not industries:
        industries = ["*"]

    return {
        "key": key,
        "name": name,
        "role_title": role_title,
        "persona": raw.get("persona"),
        "system_prompt_base": raw.get("system_prompt_base"),
        "domain_scopes": [str(s) for s in domain_scopes],
        "industries": [str(i) for i in industries],
        "can_hire": bool(raw.get("can_hire", False)),
        "is_reviewer": bool(raw.get("is_reviewer", False)),
    }


def load_agent_templates() -> list[dict]:
    """Devuelve todas las plantillas del catálogo (con cache en memoria)."""
    global _templates_cache
    if _templates_cache is not None:
        return _templates_cache

    templates: list[dict] = []
    seen: set[str] = set()

    if AGENT_TEMPLATES_DIR.exists():
        for path in sorted(AGENT_TEMPLATES_DIR.glob("*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError) as e:
                logger.warning("No se pudo leer el catálogo de plantillas %s: %s", path.name, e)
                continue

            items = data.get("templates", []) if isinstance(data, dict) else data
            if not isinstance(items, list):
                logger.warning("Formato inesperado en %s: se esperaba una lista de plantillas", path.name)
                continue

            for raw in items:
                if not isinstance(raw, dict):
                    continue
                template = _normalize_template(raw)
                if template is None:
                    logger.warning("Plantilla inválida en %s (key=%s): se ignora", path.name, raw.get("key"))
                    continue
                if template["key"] in seen:
                    logger.warning("Plantilla duplicada '%s' en %s: se ignora", template["key"], path.name)
                    continue
                seen.add(template["key"])
                templates.append(template)
    else:
        logger.warning("Directorio de plantillas de agentes no encontrado: %s", AGENT_TEMPLATES_DIR)

    _templates_cache = templates
    return templates


def get_template(key: str) -> dict | None:
    """Devuelve la plantilla con ese key, o None si no existe."""
    if not key:
        return None
    key = key.strip()
    for template in load_agent_templates():
        if template["key"] == key:
            return template
    return None


# Las industrias del registro (y de las plantillas de conocimiento en
# app/data/templates/) no siempre coinciden con las del catálogo de agentes:
# este mapa las traduce antes de filtrar.
INDUSTRY_ALIASES = {
    "startup_software": "tecnologia",
    "software": "tecnologia",
    "agencia_digital": "agencia",
}


def filter_templates_by_industry(industry: str | None) -> list[dict]:
    """
    Filtra el catálogo por industria. Una plantilla aplica si su lista de
    industries contiene la industria pedida (o su alias) o el comodín "*".
    """
    templates = load_agent_templates()
    if not industry:
        return templates
    needle = industry.strip().lower()
    needle = INDUSTRY_ALIASES.get(needle, needle)
    return [
        t for t in templates
        if "*" in t["industries"] or needle in (i.lower() for i in t["industries"])
    ]


def clear_templates_cache() -> None:
    """Limpia el cache en memoria (útil en tests)."""
    global _templates_cache
    _templates_cache = None
