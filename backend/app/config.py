"""Configuration settings for Q-CHAT backend."""
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env file from backend directory before creating Settings
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=False)


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

    model_config = SettingsConfigDict(
        # Use the .env file path (already loaded above, but this ensures pydantic also reads it)
        env_file=str(_env_path),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra fields instead of forbidding them
        # Load from environment variables first, then .env file
        env_ignore_empty=True,
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
