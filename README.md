## Audio → Transcript → LLM Insights (FastAPI)

This service accepts an audio file upload, transcribes it, sends the transcript to an LLM with a **hard-coded prompt**, and stores the LLM response locally as a JSON file.

### Project layout

- `src/app/main.py`: FastAPI app + routes
- `src/app/core/config.py`: env config
- `src/app/services/transcription.py`: transcription (OpenAI if configured; stub otherwise)
- `src/app/services/llm.py`: LLM call (OpenAI if configured; stub otherwise)
- `src/app/services/storage.py`: local JSON storage for results

### Setup

Create a virtualenv and install deps:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` (or export env vars) from `.env.example`.

### Run

```bash
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000
```

### API

- `GET /health`
- `POST /analyze` (multipart form-data)
  - field: `audio_file` (file)
  - optional: `source_id` (string)

The response includes:
- `transcript`
- `insights` (LLM response)
- `saved_to` (local path of JSON file)


