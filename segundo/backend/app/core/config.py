import logging
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    database_url: str
    anthropic_api_key: str = "placeholder-not-used"
    gemini_api_key: str = ""
    groq_api_key: str = ""
    voyage_api_key: str | None = None
    llm_provider: str = "ollama"  # "ollama" | "claude" | "groq"
    groq_model: str = "llama-3.3-70b-versatile"
    jwt_secret: str
    jwt_expire_minutes: int = 1440  # 24 horas
    jwt_refresh_expire_days: int = 7
    ask_rate_limit: str = "10/minute"
    cors_origins: str = "http://localhost:5173"
    # Search tuning
    similarity_threshold: float = 0.75
    search_top_k: int = 5
    chat_history_limit: int = 6
    # DB pool
    db_pool_size: int = 10
    db_max_overflow: int = 20

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres")
        return v

    @field_validator("cors_origins")
    @classmethod
    def cors_warn_if_wildcard(cls, v: str) -> str:
        if "*" in v:
            logging.warning("SECURITY WARNING: CORS origins contains wildcard '*' — credentials may be exposed")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
