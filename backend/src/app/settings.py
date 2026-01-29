"""
Patient 360 Backend - Settings Module

Loads configuration from environment variables with validation.
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str
    db_pool_min_size: int = 2
    db_pool_max_size: int = 10
    
    # Azure AI Language (for PHI redaction)
    azure_ai_endpoint: str
    azure_ai_key: str
    
    # Azure OpenAI (optional - for embeddings and chat)
    azure_openai_endpoint: Optional[str] = None
    azure_openai_key: Optional[str] = None
    azure_openai_embedding_deployment: str = "text-embedding-ada-002"
    azure_openai_chat_deployment: str = "gpt-5.2"
    # Note: api_version not needed for /v1 Responses API
    
    # Demo settings
    demo_allow_raw: bool = False
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    # App settings
    app_name: str = "Patient 360 API"
    debug: bool = False
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def has_azure_openai(self) -> bool:
        """Check if Azure OpenAI is configured."""
        return bool(self.azure_openai_endpoint and self.azure_openai_key)
    
    # Look for .env in parent directory (backend/) when running from src/
    model_config = SettingsConfigDict(
        env_file=[".env", "../.env"],
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
