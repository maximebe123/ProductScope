from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import json


class Settings(BaseSettings):
    OPENAI_API_KEY: str

    # Legacy single model (for backward compatibility)
    OPENAI_MODEL: str = "gpt-4o-2024-08-06"

    # Multi-Agent Model Configuration
    # GPT-5.2 for deep reasoning
    MODEL_ARCHITECT: str = "gpt-5.2"
    MODEL_COMPONENT: str = "gpt-5.2"
    MODEL_REVIEWER: str = "gpt-5.2"

    # GPT-5.2 for fast reasoning
    MODEL_CONNECTION: str = "gpt-5.2"
    MODEL_GROUPING: str = "gpt-5.2"

    # GPT-4o for execution
    MODEL_LAYOUT: str = "gpt-4o-2024-08-06"
    MODEL_FINALIZER: str = "gpt-4o-2024-08-06"

    # Realtime voice
    MODEL_REALTIME: str = "gpt-4o-realtime-preview"

    # GitHub Import - Code Analysis Models
    MODEL_CODE_ANALYZER: str = "gpt-5.2"
    MODEL_DIAGRAM_PLANNER: str = "gpt-5.2"

    # Feature Discovery Agent Models
    MODEL_FEATURE_CODE_ANALYZER: str = "gpt-5.2"
    MODEL_FEATURE_DISCOVERER: str = "gpt-5.2"
    MODEL_FEATURE_GAP_ANALYST: str = "gpt-5.2"
    MODEL_FEATURE_TECH_DEBT: str = "gpt-5.2"
    MODEL_FEATURE_ENRICHER: str = "gpt-5.2"
    MODEL_FEATURE_RANKER: str = "gpt-4o-2024-08-06"

    # KPI Discovery Agent Models
    MODEL_KPI_DOMAIN_ANALYZER: str = "gpt-5.2"
    MODEL_KPI_DISCOVERER: str = "gpt-5.2"
    MODEL_KPI_ENRICHER: str = "gpt-5.2"
    MODEL_KPI_VALUE_RANKER: str = "gpt-4o-2024-08-06"

    # GitHub Import Settings
    GITHUB_MAX_FILE_SIZE: int = 100_000  # 100KB
    GITHUB_MAX_FILES: int = 500

    # GitHub OAuth Settings
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_OAUTH_REDIRECT_URI: str = "http://localhost:5173/github/callback"

    # Multi-Agent Settings
    USE_MULTI_AGENT: bool = True  # GPT-5.2 is slow but produces better results
    DEFAULT_MAX_ATTEMPTS: int = 3
    MAX_REVIEW_ITERATIONS: int = 2

    # Existing settings
    CORS_ORIGINS: str = '["http://localhost:5173"]'
    RATE_LIMIT_PER_MINUTE: int = 10
    MAX_DESCRIPTION_LENGTH: int = 10000

    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://rdiagrams:rdiagrams_dev@localhost:5432/rdiagrams"
    DATABASE_ECHO: bool = False  # Set True for SQL debugging

    # JWT Configuration
    JWT_SECRET_KEY: str = ""
    JWT_REFRESH_SECRET_KEY: str = ""
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
