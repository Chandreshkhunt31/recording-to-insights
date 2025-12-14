from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .core.config import settings
from .db.base import Base
from .db.session import engine
from sqlalchemy import text
from .db.session import get_db
from .services.jobs import create_job, get_job, get_job_result, list_jobs, process_job, save_upload_to_disk, job_to_dict
from .services.llm import run_llm_on_transcript
from .services.storage import store_json
from .services.transcription import transcribe_audio


app = FastAPI(title="Audio → Transcript → LLM Insights", version="0.1.0")

# Local dev: allow Vite dev server to call FastAPI directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
def _startup_create_tables() -> None:
    # Prototype-friendly: auto-create tables if missing.
    # In production you would use Alembic migrations.
    Base.metadata.create_all(bind=engine)
    # Prototype migration: add new columns if missing.
    # (Safe for Postgres; no-op if already present.)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE job_results ADD COLUMN IF NOT EXISTS transcript_segments JSONB"))
            conn.execute(text("ALTER TABLE job_results ADD COLUMN IF NOT EXISTS insights_json JSONB"))
    except Exception:
        # If the DB isn't reachable yet, startup will fail elsewhere anyway.
        pass


@app.post("/api/jobs")
async def api_create_job(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    audio_file: UploadFile = File(...),
    option_id: str = Form(...),
    source_id: str | None = Form(default=None),
) -> JSONResponse:
    job = create_job(db, file_name=audio_file.filename, option_id=option_id, source_id=source_id)
    try:
        audio_path = save_upload_to_disk(settings.output_dir, job["id"], audio_file.file, audio_file.filename)
    except Exception as e:
        return JSONResponse({"detail": f"Failed to save upload: {e}"}, status_code=500)

    background_tasks.add_task(
        process_job,
        settings.database_url_sqlalchemy(),
        settings.output_dir,
        job["id"],
        audio_path,
    )
    return JSONResponse(job)


@app.get("/api/jobs")
def api_list_jobs(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)) -> JSONResponse:
    items = list_jobs(db, limit=limit, offset=offset)
    return JSONResponse({"items": items, "limit": limit, "offset": offset})


@app.get("/api/jobs/{job_id}")
def api_get_job(job_id: str, db: Session = Depends(get_db)) -> JSONResponse:
    try:
        job = get_job(db, job_id)
        return JSONResponse(job_to_dict(job))
    except FileNotFoundError:
        return JSONResponse({"detail": "Job not found"}, status_code=404)


@app.get("/api/jobs/{job_id}/result")
def api_get_job_result(job_id: str, db: Session = Depends(get_db)) -> JSONResponse:
    try:
        result = get_job_result(db, job_id)
        return JSONResponse(result)
    except FileNotFoundError:
        return JSONResponse({"detail": "Result not ready"}, status_code=404)


@app.post("/analyze")
async def analyze(
    audio_file: UploadFile = File(...),
    source_id: str | None = Form(default=None),
) -> JSONResponse:
    # Save upload to a temp file so downstream services can read it reliably.
    suffix = Path(audio_file.filename or "").suffix or ".bin"
    try:
        with tempfile.TemporaryDirectory(prefix="audio_upload_") as tmpdir:
            tmp_path = str(Path(tmpdir) / f"upload{suffix}")
            with open(tmp_path, "wb") as out:
                shutil.copyfileobj(audio_file.file, out)

            tr = transcribe_audio(tmp_path)
            llm = run_llm_on_transcript(tr.transcript)
    except ValueError as e:
        # e.g. file too large, invalid parameters, etc.
        return JSONResponse({"detail": str(e)}, status_code=413)
    except Exception as e:
        return JSONResponse({"detail": f"Failed to analyze audio: {e}"}, status_code=500)

    payload: dict[str, Any] = {
        "source_id": source_id,
        "audio_filename": audio_file.filename,
        "transcription": {
            "provider": tr.provider,
            "model": tr.model,
        },
        "llm": {
            "provider": llm.provider,
            "model": llm.model,
        },
        "transcript": tr.transcript,
        "insights_raw": llm.raw_text,
        "insights_json": llm.parsed_json,
    }

    stored = store_json(settings.output_dir, payload)

    return JSONResponse(
        {
            "result_id": stored.result_id,
            "saved_to": stored.path,
            "transcript": tr.transcript,
            "insights": llm.parsed_json if llm.parsed_json is not None else llm.raw_text,
        }
    )


@app.post("/analyze-from-file")
def analyze_from_file(
    file_name: str = Form(...),
    source_id: str | None = Form(default=None),
) -> JSONResponse:
    """
    Analyze an audio file that already exists on disk under settings.data_dir.
    You only pass the file name (no directories).
    """
    safe_name = Path(file_name).name
    if safe_name != file_name:
        return JSONResponse({"detail": "Invalid file_name (must be a plain file name)."}, status_code=400)

    audio_path = (Path(settings.data_dir) / safe_name).resolve()
    data_root = Path(settings.data_dir).resolve()
    if data_root not in audio_path.parents and audio_path != data_root:
        return JSONResponse({"detail": "Invalid file_name path."}, status_code=400)
    if not audio_path.exists() or not audio_path.is_file():
        return JSONResponse(
            {"detail": f"File not found under DATA_DIR: {safe_name}"},
            status_code=404,
        )

    try:
        tr = transcribe_audio(str(audio_path))
        llm = run_llm_on_transcript(tr.transcript)
    except ValueError as e:
        return JSONResponse({"detail": str(e)}, status_code=413)
    except Exception as e:
        return JSONResponse({"detail": f"Failed to analyze audio: {e}"}, status_code=500)

    payload: dict[str, Any] = {
        "source_id": source_id,
        "audio_filename": safe_name,
        "audio_path": str(audio_path),
        "transcription": {
            "provider": tr.provider,
            "model": tr.model,
        },
        "llm": {
            "provider": llm.provider,
            "model": llm.model,
        },
        "transcript": tr.transcript,
        "insights_raw": llm.raw_text,
        "insights_json": llm.parsed_json,
    }

    stored = store_json(settings.output_dir, payload)

    return JSONResponse(
        {
            "result_id": stored.result_id,
            "saved_to": stored.path,
            "transcript": tr.transcript,
            "insights": llm.parsed_json if llm.parsed_json is not None else llm.raw_text,
        }
    )


