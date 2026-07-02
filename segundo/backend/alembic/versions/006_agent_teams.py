"""Agent teams: agents, missions, mission_tasks and task_events tables

Revision ID: 006
Revises: 005
Create Date: 2026-07-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Roster de agentes IA por negocio (incluye subagentes contratados)
    op.create_table(
        "agents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("template_key", sa.String(50), nullable=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("role_title", sa.Text, nullable=False),
        sa.Column("persona", sa.Text),  # descripción de personalidad/experiencia
        sa.Column("system_prompt", sa.Text, nullable=True),
        sa.Column("domain_scopes", sa.ARRAY(sa.String()), server_default=sa.text("'{}'")),
        sa.Column("can_hire", sa.Boolean, server_default=sa.text("false")),
        sa.Column("is_reviewer", sa.Boolean, server_default=sa.text("false")),
        # Subagente contratado por otro agente (jerarquía de 1 nivel)
        sa.Column("parent_agent_id", UUID(as_uuid=True), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'active'")),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.CheckConstraint("status IN ('active', 'archived')", name="agents_status_check"),
    )
    op.create_index("idx_agents_business_status", "agents", ["business_id", "status"])

    # Misiones lanzadas por el dueño y ejecutadas por el equipo de agentes
    op.create_table(
        "missions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("business_id", UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("objective", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), server_default=sa.text("'planning'")),
        sa.Column("manager_agent_id", UUID(as_uuid=True), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("result_summary", sa.Text, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('planning', 'running', 'reviewing', 'completed', 'failed', 'cancelled')",
            name="missions_status_check",
        ),
    )
    op.create_index("idx_missions_business_status", "missions", ["business_id", "status"])

    # Tareas de una misión, asignadas a agentes y revisadas por el revisor
    op.create_table(
        "mission_tasks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("mission_id", UUID(as_uuid=True), sa.ForeignKey("missions.id"), nullable=False),
        sa.Column("agent_id", UUID(as_uuid=True), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("parent_task_id", UUID(as_uuid=True), sa.ForeignKey("mission_tasks.id"), nullable=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'")),
        sa.Column("output", sa.Text, nullable=True),
        sa.Column("review_notes", sa.Text, nullable=True),
        sa.Column("reviewer_agent_id", UUID(as_uuid=True), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("attempts", sa.Integer, server_default=sa.text("0")),
        sa.Column("order_index", sa.Integer, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending', 'in_progress', 'review', 'rejected', 'approved', 'failed')",
            name="mission_tasks_status_check",
        ),
    )
    op.create_index("idx_mission_tasks_mission", "mission_tasks", ["mission_id"])

    # Timeline auditable de eventos de la misión
    op.create_table(
        "task_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("mission_id", UUID(as_uuid=True), sa.ForeignKey("missions.id"), nullable=False),
        sa.Column("task_id", UUID(as_uuid=True), sa.ForeignKey("mission_tasks.id"), nullable=True),
        sa.Column("agent_id", UUID(as_uuid=True), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("type", sa.String(40), nullable=False),
        sa.Column("payload", sa.Text, nullable=True),  # JSON string
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("idx_task_events_mission_created", "task_events", ["mission_id", "created_at"])


def downgrade() -> None:
    op.drop_index("idx_task_events_mission_created", table_name="task_events")
    op.drop_table("task_events")
    op.drop_index("idx_mission_tasks_mission", table_name="mission_tasks")
    op.drop_table("mission_tasks")
    op.drop_index("idx_missions_business_status", table_name="missions")
    op.drop_table("missions")
    op.drop_index("idx_agents_business_status", table_name="agents")
    op.drop_table("agents")
