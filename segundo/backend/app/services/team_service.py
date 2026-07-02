"""
Servicio de equipo — Segundo v3.

Construye agentes del roster a partir de plantillas del catálogo y crea el
equipo semilla de cada negocio: manager contratador + revisor QA + los 4
especialistas de dominio del chat existente (ventas, operaciones, clientes
y el asistente general "Segundo").
"""
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Agent
from app.services.agent_templates import get_template

logger = logging.getLogger(__name__)

# Plantillas del equipo semilla (el dominio "general" se crea como agente custom)
SEED_TEMPLATE_KEYS = ["manager_contratador", "revisor_qa", "ventas", "operaciones", "clientes"]

GENERAL_SEED_AGENT = {
    "template_key": "general",
    "name": "Segundo",
    "role_title": "Asistente General",
    "persona": (
        "Asistente general del negocio: conoce un poco de todo y sabe a quién "
        "acudir cuando un tema requiere un especialista. Es el primer punto de "
        "contacto del equipo para cualquier duda que no encaje en un dominio "
        "específico, y responde siempre con claridad y sentido práctico."
    ),
    "domain_scopes": ["general"],
}


def render_system_prompt(
    base: str | None,
    name: str,
    role_title: str,
    persona: str | None,
) -> str | None:
    """
    Interpola name/role_title/persona en el system_prompt_base de una plantilla.
    Usa replace (no str.format) para tolerar llaves inesperadas en los textos.
    """
    if not base:
        return None
    return (
        base.replace("{name}", name)
        .replace("{role_title}", role_title)
        .replace("{persona}", persona or "")
    )


def build_custom_system_prompt(name: str, role_title: str, persona: str | None) -> str:
    """System prompt genérico para agentes creados sin plantilla."""
    parts = [f"Eres {name}, {role_title} de la empresa."]
    if persona:
        parts.append(persona)
    parts.append(
        "Ayudas al equipo con tu especialidad usando solo la información disponible "
        "en el contexto del negocio; cuando falte algo, lo dices con claridad en "
        "lugar de inventar.\n\nRespondes en español neutro, de forma clara y práctica."
    )
    return "\n\n".join(parts)


def build_agent_from_template(
    template: dict,
    business_id: UUID,
    created_by: UUID | None,
    *,
    name: str | None = None,
    role_title: str | None = None,
    persona: str | None = None,
    domain_scopes: list[str] | None = None,
    parent_agent_id: UUID | None = None,
) -> Agent:
    """
    Construye (sin agregar a la sesión) un Agent desde una plantilla del catálogo,
    con overrides opcionales. El system_prompt queda con la persona interpolada.
    """
    final_name = (name or template.get("name") or "Agente").strip()[:200]
    final_role = (role_title or template.get("role_title") or "Especialista").strip()[:200]
    final_persona = persona if persona is not None else template.get("persona")
    scopes = domain_scopes if domain_scopes else (template.get("domain_scopes") or ["general"])

    system_prompt = render_system_prompt(
        template.get("system_prompt_base"), final_name, final_role, final_persona
    ) or build_custom_system_prompt(final_name, final_role, final_persona)

    template_key = template.get("key")
    return Agent(
        business_id=business_id,
        template_key=str(template_key)[:50] if template_key else None,
        name=final_name,
        role_title=final_role,
        persona=final_persona,
        system_prompt=system_prompt,
        domain_scopes=[str(s) for s in scopes],
        can_hire=bool(template.get("can_hire", False)),
        is_reviewer=bool(template.get("is_reviewer", False)),
        parent_agent_id=parent_agent_id,
        status="active",
        created_by=created_by,
    )


def _build_general_seed_agent(business_id: UUID, created_by: UUID | None) -> Agent:
    """Agente custom "Segundo" — conserva el dominio general del chat existente."""
    spec = GENERAL_SEED_AGENT
    return Agent(
        business_id=business_id,
        template_key=spec["template_key"],
        name=spec["name"],
        role_title=spec["role_title"],
        persona=spec["persona"],
        system_prompt=build_custom_system_prompt(
            spec["name"], spec["role_title"], spec["persona"]
        ),
        domain_scopes=list(spec["domain_scopes"]),
        can_hire=False,
        is_reviewer=False,
        status="active",
        created_by=created_by,
    )


async def create_seed_team(
    business_id: UUID,
    industry: str | None,
    created_by: UUID | None,
    db: AsyncSession,
) -> list[Agent]:
    """
    Crea el equipo semilla del negocio: manager contratador, revisor QA y los
    4 especialistas de dominio (ventas, operaciones, clientes y general).

    - IDEMPOTENTE: si el negocio ya tiene agentes activos, no crea nada y
      devuelve los existentes.
    - NO hace commit: el caller decide cuándo comitear. Sí hace flush para
      que los agentes nuevos tengan id.
    - `industry` se acepta para variaciones futuras del equipo semilla; hoy
      el equipo base es el mismo para todas las industrias (las plantillas
      semilla aplican a "*").
    """
    result = await db.execute(
        select(Agent)
        .where(Agent.business_id == business_id, Agent.status == "active")
        .order_by(Agent.created_at)
    )
    existing = list(result.scalars().all())
    if existing:
        logger.info(
            "Negocio %s ya tiene %d agentes activos: se omite el equipo semilla",
            business_id, len(existing),
        )
        return existing

    agents: list[Agent] = []
    for key in SEED_TEMPLATE_KEYS:
        template = get_template(key)
        if not template:
            logger.warning("Plantilla '%s' no encontrada al crear el equipo semilla", key)
            continue
        agents.append(build_agent_from_template(template, business_id, created_by))

    agents.append(_build_general_seed_agent(business_id, created_by))

    for agent in agents:
        db.add(agent)
    await db.flush()

    logger.info(
        "Equipo semilla creado para negocio %s (industria: %s): %d agentes",
        business_id, industry or "sin definir", len(agents),
    )
    return agents
