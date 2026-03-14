import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, ForeignKey,
    DateTime, CheckConstraint, ARRAY
)
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from app.db.session import Base


class Business(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


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
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("role IN ('owner', 'employee')", name="users_role_check"),
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


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow)


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
    )


class UnansweredQuestion(Base):
    __tablename__ = "unanswered_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    question = Column(Text, nullable=False)
    asked_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class KnowledgeProposal(Base):
    __tablename__ = "knowledge_proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    proposed_fact = Column(Text, nullable=False)
    domain = Column(String(50), default="general")
    category = Column(String(50))
    source_session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class KnowledgeConflict(Base):
    __tablename__ = "knowledge_conflicts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    fact_a_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_entries.id"), nullable=False)
    fact_b_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_entries.id"), nullable=False)
    explanation = Column(Text)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
