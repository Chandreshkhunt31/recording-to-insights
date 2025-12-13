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


settings = Settings()


