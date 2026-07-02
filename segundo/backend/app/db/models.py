import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, ForeignKey,
    DateTime, CheckConstraint, ARRAY, Index, Integer
)
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from app.db.session import Base


class Business(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    industry = Column(String(50), nullable=True)
    plan = Column(String(20), nullable=False, default="trial")
    plan_started_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "plan IN ('trial', 'changarro', 'negocio', 'patron')",
            name="businesses_plan_check",
        ),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=True)
    email = Column(Text, unique=True, nullable=True)
    phone = Column(Text, unique=True, nullable=True)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False)
    name = Column(Text)
    must_change_password = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("role IN ('owner', 'employee')", name="users_role_check"),
        Index("idx_user_business", "business_id"),
    )


class KnowledgeEntry(Base):
    __tablename__ = "knowledge_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    raw_input = Column(Text, nullable=False)
    processed_fact = Column(Text, nullable=False)
    category = Column(String(50))
    domain = Column(String(50), default="general")
    # pgvector column — name matches the migration column 'embedding_vec'
    embedding = Column("embedding_vec", Vector(1536))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    # "public" = visible to all employees | "confidential" = owner only
    sensitivity = Column(String(20), default="public")
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_knowledge_business_domain", "business_id", "domain", "is_active"),
        Index("idx_knowledge_business_sensitivity", "business_id", "sensitivity", "is_active"),
    )


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_session_user", "user_id"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"))
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    knowledge_used = Column(ARRAY(UUID(as_uuid=True)))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant')", name="chat_messages_role_check"),
        Index("idx_chatmsg_session_created", "session_id", "created_at"),
    )


class UnansweredQuestion(Base):
    __tablename__ = "unanswered_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    question = Column(Text, nullable=False)
    asked_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_unanswered_business", "business_id", "resolved"),
    )


class KnowledgeProposal(Base):
    __tablename__ = "knowledge_proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    proposed_fact = Column(Text, nullable=False)
    domain = Column(String(50), default="general")
    category = Column(String(50))
    source_session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=True)
    proposed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'approved', 'rejected')", name="proposal_status_check"),
        Index("idx_proposal_business_status", "business_id", "status"),
    )


class KnowledgeConflict(Base):
    __tablename__ = "knowledge_conflicts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    fact_a_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_entries.id", ondelete="SET NULL"), nullable=True)
    fact_b_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_entries.id", ondelete="SET NULL"), nullable=True)
    explanation = Column(Text)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_hash = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_refresh_token_user", "user_id"),
    )


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_hash = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(String(30), nullable=False)  # escalation, proposal, conflict
    title = Column(String(200), nullable=False)
    body = Column(Text)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_notification_user_read", "user_id", "read"),
    )


class KnowledgeVersion(Base):
    __tablename__ = "knowledge_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_entries.id"), nullable=False)
    processed_fact = Column(Text, nullable=False)
    category = Column(String(50))
    domain = Column(String(50))
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_version_entry", "entry_id"),
    )


# ---------------------------------------------------------------------------
# Equipos de agentes (v3) — roster, misiones, tareas y timeline
# ---------------------------------------------------------------------------

class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    template_key = Column(String(50), nullable=True)
    name = Column(Text, nullable=False)
    role_title = Column(Text, nullable=False)
    # Descripción de personalidad/experiencia del agente
    persona = Column(Text)
    system_prompt = Column(Text, nullable=True)
    domain_scopes = Column(ARRAY(String), default=list)
    can_hire = Column(Boolean, default=False)
    is_reviewer = Column(Boolean, default=False)
    # Subagente contratado por otro agente (jerarquía de 1 nivel)
    parent_agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    status = Column(String(20), default="active")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("status IN ('active', 'archived')", name="agents_status_check"),
        Index("idx_agents_business_status", "business_id", "status"),
    )


class Mission(Base):
    __tablename__ = "missions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    title = Column(Text, nullable=False)
    objective = Column(Text, nullable=False)
    status = Column(String(20), default="planning")
    manager_agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    result_summary = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('planning', 'running', 'reviewing', 'completed', 'failed', 'cancelled')",
            name="missions_status_check",
        ),
        Index("idx_missions_business_status", "business_id", "status"),
    )


class MissionTask(Base):
    __tablename__ = "mission_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("mission_tasks.id"), nullable=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(20), default="pending")
    output = Column(Text, nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewer_agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    attempts = Column(Integer, default=0)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'in_progress', 'review', 'rejected', 'approved', 'failed')",
            name="mission_tasks_status_check",
        ),
        Index("idx_mission_tasks_mission", "mission_id"),
    )


class TaskEvent(Base):
    __tablename__ = "task_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mission_id = Column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("mission_tasks.id"), nullable=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    type = Column(String(40), nullable=False)
    # JSON string con detalles del evento
    payload = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_task_events_mission_created", "mission_id", "created_at"),
    )
