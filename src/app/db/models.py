from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    file_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    option_id: Mapped[str] = mapped_column(String(64), nullable=False)

    status: Mapped[str] = mapped_column(String(32), nullable=False)  # processing|completed|failed
    duration: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    audio_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    result: Mapped["JobResult | None"] = relationship(
        back_populates="job",
        uselist=False,
        cascade="all, delete-orphan",
    )


class JobResult(Base):
    __tablename__ = "job_results"

    job_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    transcript_segments: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    deliverable: Mapped[str] = mapped_column(Text, nullable=False)
    insights_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    llm_provider: Mapped[str] = mapped_column(String(64), nullable=False)
    llm_model: Mapped[str] = mapped_column(String(128), nullable=False)
    transcription_provider: Mapped[str] = mapped_column(String(64), nullable=False)
    transcription_model: Mapped[str] = mapped_column(String(128), nullable=False)

    job: Mapped["Job"] = relationship(back_populates="result")


