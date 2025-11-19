"""Configuration settings for Q-CHAT backend."""
from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Storage
    data_storage_path: str = "./data/sessions"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080"

    # Server
    port: int = 8000
    base_url: str = "http://localhost:8000"

    # Database
    database_url: str = ""

    # JWT
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # App Environment
    app_env: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # LLM Provider
    llm_provider: str = "openai"
    openai_api_key: str = ""
    serpapi_api_key: str = ""
    google_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"

    # LangSmith
    langsmith_tracing: bool = False
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_api_key: str = ""
    langsmith_project: str = "M-Chat-Langchain"

    # Rate Limiting
    rate_limit_per_minute: int = 100

    # SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "M-CHAT Screening"

    # Session
    session_expiry_hours: int = 24

    # ElevenLabs
    elevenlabs_api_key: str = ""
    elevenlabs_model: str = "eleven_multilingual_v2"
    elevenlabs_voice_id_ar_female: str = ""
    elevenlabs_voice_id_en_female: str = ""
    elevenlabs_asr_model: str = "scribe_v1"

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"  # Ignore extra fields instead of forbidding them
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Convert CORS origins string to list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def allowed_origins_list(self) -> list[str]:
        """Convert allowed origins string to list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()
