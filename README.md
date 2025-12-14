## Audio → Transcript → LLM Insights (FastAPI)

This service accepts an audio file upload, transcribes it, sends the transcript to an LLM with a **hard-coded prompt**, and stores the LLM response locally as a JSON file.

There is also a simple React frontend in `frontend/` that can upload an audio file, create a processing job, show job history, and view results.

### Project layout

- `src/app/main.py`: FastAPI app + routes
- `src/app/core/config.py`: env config
- `src/app/services/transcription.py`: transcription (OpenAI if configured; stub otherwise)
- `src/app/services/llm.py`: LLM call (OpenAI if configured; stub otherwise)
- `src/app/services/storage.py`: local JSON storage for results
- `src/app/services/jobs.py`: job queue + local persistence
- `frontend/`: Vite + React UI
- `src/app/db/`: PostgreSQL models + session

### Setup

Create a virtualenv and install deps:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` (or export env vars) from `.env.example`.

Note: creating `.env.example` is blocked in this environment, so use `env.example`:

```bash
cp env.example .env
```

### PostgreSQL

This project uses **PostgreSQL** for job history + results.

Set `DATABASE_URL` in your `.env`, for example:

```bash
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/insightrelay
```

Tables are auto-created on backend startup (prototype-friendly).

### Deploy on Render

This repo includes a Render Blueprint: `render.yaml` (Postgres + FastAPI API + React static site).

Steps:

1) Push this repo to GitHub.
2) In Render, create a new Blueprint and select your repo.
3) After services are created, update env vars:
   - **Backend (`insightrelay-api`)**
     - `OPENAI_API_KEY` (required for real transcription + insights)
     - `CORS_ALLOW_ORIGINS` = your frontend URL (Render static site URL), e.g. `https://YOUR-FRONTEND.onrender.com`
   - **Frontend (`insightrelay-frontend`)**
     - `VITE_API_BASE_URL` = your backend URL, e.g. `https://YOUR-API.onrender.com`
4) Redeploy both services.

Notes:
- Render provides `DATABASE_URL` as `postgres://...`; the backend automatically converts it to a SQLAlchemy-compatible URL.
- Frontend is built from `frontend/` and served as a static site.

### Run

```bash
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000
```

Run frontend (separately):

```bash
cd frontend
npm install
npm run dev
```

### API

- `GET /health`
- `POST /analyze` (multipart form-data)
  - field: `audio_file` (file)
  - optional: `source_id` (string)
- `POST /api/jobs` (multipart form-data)
  - field: `audio_file` (file)
  - field: `option_id` (string) (frontend currently sends one of the `opt_*` ids)
  - optional: `source_id` (string)
- `GET /api/jobs` (history)
- `GET /api/jobs/{job_id}`
- `GET /api/jobs/{job_id}/result`

The response includes:
- `transcript`
- `insights` (LLM response)
- `saved_to` (local path of JSON file)



