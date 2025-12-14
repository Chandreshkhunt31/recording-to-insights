from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Load environment variables from a project-root .env (if present), plus real OS env vars.
    # This resolves reliably even if you run uvicorn from another working directory.
    _project_root = Path(__file__).resolve().parents[3]
    model_config = SettingsConfigDict(
        env_file=str(_project_root / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str | None = None
    openai_transcription_model: str = "gpt-4o-mini-transcribe"
    openai_chat_model: str = "gpt-4o-mini"

    data_dir: str = "./data"
    output_dir: str = "./outputs"

    # PostgreSQL connection string, e.g.
    # postgresql+psycopg://postgres:postgres@localhost:5432/insightrelay
    database_url: str = "postgresql+psycopg://chandresh:1111@localhost:5432/insightrelay"

    # CORS (comma-separated). In Render, set this to your frontend URL(s).
    cors_allow_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    def database_url_sqlalchemy(self) -> str:
        """
        Render often provides DATABASE_URL like: postgres://user:pass@host:5432/db
        SQLAlchemy expects: postgresql+psycopg://...
        """
        url = (self.database_url or "").strip()
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://") :]
        if url.startswith("postgresql://"):
            return "postgresql+psycopg://" + url[len("postgresql://") :]
        return url

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in (self.cors_allow_origins or "").split(",") if o.strip()]


settings = Settings()


