"""Configuration settings for Q-CHAT backend."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Storage
    data_storage_path: str = "./data/sessions"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Server
    port: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_origins_list(self) -> list[str]:
        """Convert CORS origins string to list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
