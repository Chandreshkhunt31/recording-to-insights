from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.models import Job, JobResult
from .llm import run_llm_on_transcript
from .transcription import transcribe_audio


def _now_iso_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uploads_dir(output_dir: str) -> Path:
    return Path(output_dir) / "uploads"


def create_job(
    db: Session,
    *,
    file_name: str | None,
    option_id: str,
    source_id: str | None,
) -> dict[str, Any]:
    job_id = f"job_{uuid4().hex}"
    now = datetime.now(timezone.utc)
    row = Job(
        id=job_id,
        created_at=now,
        file_name=file_name,
        option_id=option_id,
        status="processing",
        duration=None,
        source_id=source_id,
        error=None,
        audio_path=None,
    )
    db.add(row)
    db.commit()
    return job_to_dict(row)


def save_upload_to_disk(output_dir: str, job_id: str, src_file, original_name: str | None) -> str:
    suffix = Path(original_name or "").suffix or ".bin"
    upload_path = _uploads_dir(output_dir) / f"{job_id}{suffix}"
    upload_path.parent.mkdir(parents=True, exist_ok=True)
    with open(upload_path, "wb") as out:
        shutil.copyfileobj(src_file, out)
    return str(upload_path)


def get_job(db: Session, job_id: str) -> Job:
    row = db.get(Job, job_id)
    if not row:
        raise FileNotFoundError(job_id)
    return row


def list_jobs(db: Session, *, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
    stmt = select(Job).order_by(Job.created_at.desc()).limit(limit).offset(offset)
    rows = db.execute(stmt).scalars().all()
    return [job_to_dict(r) for r in rows]


def update_job(db: Session, job_id: str, patch: dict[str, Any]) -> None:
    row = get_job(db, job_id)
    for k, v in patch.items():
        if k == "createdAt":
            continue
        if k == "fileName":
            row.file_name = v
        elif k == "optionId":
            row.option_id = v
        elif k == "sourceId":
            row.source_id = v
        elif k == "status":
            row.status = v
        elif k == "duration":
            row.duration = v
        elif k == "error":
            row.error = v
        elif k == "audioPath":
            row.audio_path = v
    db.commit()


def process_job(database_url: str, output_dir: str, job_id: str, audio_path: str) -> None:
    """
    Background task: transcribe -> LLM -> save result -> update job status.
    """
    # Import locally so the background task doesn't rely on FastAPI dependency injection.
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(database_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db: Session = SessionLocal()
    try:
        update_job(db, job_id, {"audioPath": audio_path, "status": "processing", "error": None})
        tr = transcribe_audio(audio_path)
        llm = run_llm_on_transcript(tr.transcript)

        existing = db.get(JobResult, job_id)
        now = datetime.now(timezone.utc)
        if existing:
            existing.created_at = now
            existing.transcript = tr.transcript
            existing.transcript_segments = tr.segments
            existing.deliverable = llm.raw_text
            existing.insights_json = llm.parsed_json
            existing.llm_provider = llm.provider
            existing.llm_model = llm.model
            existing.transcription_provider = tr.provider
            existing.transcription_model = tr.model
        else:
            db.add(
                JobResult(
                    job_id=job_id,
                    created_at=now,
                    transcript=tr.transcript,
                    transcript_segments=tr.segments,
                    deliverable=llm.raw_text,
                    insights_json=llm.parsed_json,
                    llm_provider=llm.provider,
                    llm_model=llm.model,
                    transcription_provider=tr.provider,
                    transcription_model=tr.model,
                )
            )

        update_job(db, job_id, {"status": "completed", "error": None})
    except Exception as e:
        update_job(db, job_id, {"status": "failed", "error": str(e)})
    finally:
        db.close()


def get_job_result(db: Session, job_id: str) -> dict[str, Any]:
    row = db.get(JobResult, job_id)
    if not row:
        raise FileNotFoundError("result not ready")
    return {
        "jobId": row.job_id,
        "createdAt": row.created_at.isoformat(),
        "audioPath": db.get(Job, job_id).audio_path if db.get(Job, job_id) else None,
        "transcript": row.transcript,
        "segments": row.transcript_segments,
        "deliverable": row.deliverable,
        "insights": row.insights_json,
        "llm": {"provider": row.llm_provider, "model": row.llm_model},
        "transcription": {"provider": row.transcription_provider, "model": row.transcription_model},
    }


def job_to_dict(row: Job) -> dict[str, Any]:
    return {
        "id": row.id,
        "createdAt": row.created_at.isoformat(),
        "fileName": row.file_name,
        "optionId": row.option_id,
        "status": row.status,
        "duration": row.duration,
        "sourceId": row.source_id,
        "error": row.error,
        "resultPath": "db",  # kept for frontend compatibility; data is stored in DB now
    }


