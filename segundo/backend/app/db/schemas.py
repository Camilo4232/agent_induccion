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
    # Industria del negocio: define el equipo de agentes semilla y las plantillas sugeridas
    industry: Optional[str] = None


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
    refresh_token: Optional[str] = None


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
    domain: Optional[str] = "general"
    sensitivity: Optional[str] = "public"
    created_at: datetime
    is_active: bool
    usage_count: int = 0

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
    fact_a_id: Optional[UUID] = None
    fact_b_id: Optional[UUID] = None
    explanation: Optional[str]
    resolved: bool
    created_at: datetime
    fact_a_text: Optional[str] = None
    fact_b_text: Optional[str] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Equipos de agentes (v3) — roster, misiones, tareas y timeline
# ---------------------------------------------------------------------------

from pydantic import model_validator  # noqa: E402


# Agents
class AgentCreate(BaseModel):
    # Contratar desde plantilla (template_key) o crear un agente custom
    template_key: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    role_title: Optional[str] = Field(None, min_length=1, max_length=200)
    persona: Optional[str] = Field(None, max_length=4000)
    domain_scopes: List[str] = []
    can_hire: bool = False
    is_reviewer: bool = False

    @model_validator(mode="after")
    def check_template_or_custom(self):
        if not self.template_key and not (self.name and self.role_title):
            raise ValueError("Se requiere template_key o los campos name y role_title")
        return self


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    role_title: Optional[str] = Field(None, min_length=1, max_length=200)
    persona: Optional[str] = Field(None, max_length=4000)
    domain_scopes: Optional[List[str]] = None
    system_prompt: Optional[str] = None
    status: Optional[str] = None

    @model_validator(mode="after")
    def check_status(self):
        if self.status is not None and self.status not in ("active", "archived"):
            raise ValueError("status debe ser 'active' o 'archived'")
        return self


class AgentResponse(BaseModel):
    id: UUID
    business_id: UUID
    template_key: Optional[str] = None
    name: str
    role_title: str
    persona: Optional[str] = None
    system_prompt: Optional[str] = None
    domain_scopes: List[str] = []
    can_hire: bool = False
    is_reviewer: bool = False
    parent_agent_id: Optional[UUID] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AgentTemplateResponse(BaseModel):
    key: str
    name: str
    role_title: str
    persona: Optional[str] = None
    domain_scopes: List[str] = []
    industries: List[str] = []
    can_hire: bool = False
    is_reviewer: bool = False


# Chat directo con un agente del roster
class AgentChatHistoryMessage(BaseModel):
    role: str = Field(..., max_length=20)
    content: str = Field(..., max_length=4000)


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    # V3-4: tope de tamaño del body — el endpoint solo usa los últimos
    # CHAT_HISTORY_LIMIT mensajes; el frontend envía como máximo 20.
    history: Optional[List[AgentChatHistoryMessage]] = Field(None, max_length=50)


class AgentChatSource(BaseModel):
    id: str
    fact: str


class AgentChatResponse(BaseModel):
    response: str
    agent_id: str
    agent_name: str
    sources: List[AgentChatSource] = []


# Missions
class MissionCreate(BaseModel):
    objective: str = Field(..., min_length=10, max_length=4000)
    title: Optional[str] = Field(None, max_length=200)


class MissionTaskResponse(BaseModel):
    id: UUID
    agent_id: Optional[UUID] = None
    agent_name: Optional[str] = None  # se llena en la API
    parent_task_id: Optional[UUID] = None
    title: str
    description: str
    status: str
    output: Optional[str] = None
    review_notes: Optional[str] = None
    attempts: int = 0
    order_index: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class TaskEventResponse(BaseModel):
    id: UUID
    task_id: Optional[UUID] = None
    agent_id: Optional[UUID] = None
    type: str
    payload: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MissionResponse(BaseModel):
    id: UUID
    title: str
    objective: str
    status: str
    manager_agent_id: Optional[UUID] = None
    result_summary: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MissionDetailResponse(MissionResponse):
    tasks: List[MissionTaskResponse] = []
    events: List[TaskEventResponse] = []
    # Equipo involucrado en la misión
    agents: List[AgentResponse] = []
