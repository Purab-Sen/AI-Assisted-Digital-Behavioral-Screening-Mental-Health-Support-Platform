# Backend — AI Assisted Digital Behavioral Screening Platform

This folder contains the FastAPI backend for the platform.

## Prerequisites
- Python 3.11+ (venv recommended)
- MySQL server (connection configured via environment variables)
- Node/npm only required for frontend (see frontend/README.md)

## Quick setup
1. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Configure environment (example `.env` or shell vars):

- `DATABASE_URL` — SQLAlchemy DB URL (e.g. `mysql+pymysql://user:pass@host/dbname`)
- any JWT / secret settings from `app/config.py` if customized

4. Apply database migrations:

```bash
# from backend/
source venv/bin/activate
alembic upgrade head
```

If Alembic complains about multiple heads, run `alembic heads` to inspect or use the merge migration already provided.

5. (Optional) Seed admin account:

```bash
python seed_admin.py
```

6. Run the development server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API base path: `/api/v1` (see `app/routes/` for endpoints). Open interactive docs at `http://localhost:8000/docs`.

## Migrations
- Migration files are under `alembic/versions/`.
- To create a new migration after model changes:

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Testing
- If tests are available, run with `pytest` (install dev deps if needed):

```bash
pip install pytest
pytest -q
```

## Useful files
- `app/main.py` — application entry
- `app/models/` — SQLAlchemy models
- `app/routes/` — FastAPI route modules
- `alembic/` — DB migrations

If you want, I can run the migrations and restart the backend server for you.
