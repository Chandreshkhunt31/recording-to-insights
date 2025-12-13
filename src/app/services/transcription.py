from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from openai import OpenAI

from ..core.config import settings


@dataclass(frozen=True)
class TranscriptionResult:
    transcript: str
    provider: str
    model: str


MAX_OPENAI_AUDIO_BYTES = 25 * 1024 * 1024  # 25MB (typical API limit)


def transcribe_audio(file_path: str) -> TranscriptionResult:
    """
    Transcribe audio at file_path.

    - If OPENAI_API_KEY is set: uses OpenAI audio transcription API.
    - Otherwise: returns a deterministic stub transcript (so the API remains runnable).
    """
    p = Path(file_path)
    if not p.exists():
        raise FileNotFoundError(file_path)

    if settings.openai_api_key:
        size_bytes = p.stat().st_size
        if size_bytes > MAX_OPENAI_AUDIO_BYTES:
            raise ValueError(
                f"Audio file too large for hosted transcription: {size_bytes} bytes. "
                f"Please keep it under {MAX_OPENAI_AUDIO_BYTES} bytes (~25MB), or split/compress it, "
                "or switch to local Whisper."
            )
        client = OpenAI(api_key=settings.openai_api_key)
        with open(p, "rb") as f:
            resp = client.audio.transcriptions.create(
                model=settings.openai_transcription_model,
                file=f,
            )
        # openai returns a structured object; `.text` is the transcript string
        transcript = getattr(resp, "text", None) or ""
        return TranscriptionResult(
            transcript=transcript,
            provider="openai",
            model=settings.openai_transcription_model,
        )

    # Stub mode: lets you develop the rest of the pipeline without any API keys.
    return TranscriptionResult(
        transcript=(
            "STUB_TRANSCRIPT: OpenAI is not configured (OPENAI_API_KEY missing). "
            "Upload received and saved; replace this with real transcription by setting the key."
        ),
        provider="stub",
        model="stub",
    )


