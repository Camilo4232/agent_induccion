from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from uuid import UUID

from app.db.models import UnansweredQuestion
from app.services.claude import complete

BRIEFING_SYSTEM = """\
Eres "Segundo", el asistente interno del negocio {business_name}.
Genera un briefing diario breve y útil para un empleado, basado en el contexto del negocio.

El briefing debe:
1. Mencionar el día de la semana y algo relevante para ese día (si hay info en el conocimiento)
2. Destacar máximo 2-3 puntos importantes para tener en cuenta hoy
3. Mencionar si hay preguntas sin resolver que el empleado debe escalar si surgen
4. Ser conciso: máximo 4-5 oraciones
5. Sonar natural, como un colega que te da el contexto antes de empezar el turno

No inventes información. Solo usa lo que está en el contexto proporcionado.
"""


async def generate_daily_briefing(
    business_id: UUID,
    business_name: str,
    db: AsyncSession,
) -> str:
    weekday_es = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    today = datetime.utcnow()
    day_name = weekday_es[today.weekday()]

    # Get top knowledge entries (most recent, up to 10)
    sql = text("""
        SELECT processed_fact, domain, category
        FROM knowledge_entries
        WHERE business_id = :business_id
          AND is_active = true
          AND (sensitivity = 'public' OR sensitivity IS NULL)
        ORDER BY created_at DESC
        LIMIT 10
    """)
    result = await db.execute(sql, {"business_id": str(business_id)})
    entries = result.fetchall()

    knowledge_text = "\n".join(
        f"- [{r.domain}/{r.category}] {r.processed_fact}" for r in entries
    ) or "Sin conocimiento registrado aún."

    # Count unresolved questions
    uq_result = await db.execute(
        select(UnansweredQuestion).where(
            UnansweredQuestion.business_id == business_id,
            UnansweredQuestion.resolved == False,
        )
    )
    unanswered_count = len(uq_result.scalars().all())

    prompt = f"""
Hoy es {day_name} {today.strftime('%d/%m/%Y')}.

Conocimiento del negocio:
{knowledge_text}

Preguntas sin resolver pendientes: {unanswered_count}

Genera el briefing del día para el empleado.
"""

    return complete(
        system=BRIEFING_SYSTEM.format(business_name=business_name),
        messages=[{"role": "user", "content": prompt}],
        max_tokens=256,
    )
