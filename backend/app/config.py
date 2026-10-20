import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Plug-and-Play Support Component API"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/support_db"
    )
    SQLITE_FALLBACK: bool = True
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
