from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# Auth
class RegisterRequest(BaseModel):
    business_name: str
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: Optional[str] = None   # email (dueño) o teléfono (empleado)
    phone: Optional[str] = None
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    business_id: str
    user_id: str
    must_change_password: bool = False


# Teach
class TeachRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class TeachResponse(BaseModel):
    saved: bool
    fact: str
    category: str
    domain: str = "general"
    needs_clarification: bool
    clarification_question: Optional[str] = None
    entry_id: Optional[str] = None
    conflict_warning: Optional[dict] = None


# Knowledge
class KnowledgeEntryOut(BaseModel):
    id: UUID
    raw_input: str
    processed_fact: str
    category: Optional[str]
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class KnowledgeUpdateRequest(BaseModel):
    processed_fact: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


# Ask
class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    session_id: Optional[str] = None


class SourceEntry(BaseModel):
    id: str
    fact: str
    category: Optional[str]


class AskResponse(BaseModel):
    response: str
    sources: List[SourceEntry]
    confidence: str
    session_id: str
    tools_used: List[str] = []
    knowledge_flagged: bool = False


# Chat history
class ChatMessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# Invite
class InviteRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    custom_password: Optional[str] = Field(None, min_length=4, max_length=50)


class InviteResponse(BaseModel):
    invited: bool
    temp_password: str
    message: str
    message_sent: bool = False


class TeamMemberOut(BaseModel):
    id: UUID
    name: Optional[str]
    phone: Optional[str]
    must_change_password: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Unanswered
class UnansweredOut(BaseModel):
    id: UUID
    question: str
    resolved: bool
    created_at: datetime
    asked_by: Optional[UUID]

    class Config:
        from_attributes = True


class ResolveRequest(BaseModel):
    answer: str


# Proposals
class ProposalOut(BaseModel):
    id: UUID
    proposed_fact: str
    domain: Optional[str]
    category: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# Conflicts
class ConflictOut(BaseModel):
    id: UUID
    fact_a_id: UUID
    fact_b_id: UUID
    explanation: Optional[str]
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True
