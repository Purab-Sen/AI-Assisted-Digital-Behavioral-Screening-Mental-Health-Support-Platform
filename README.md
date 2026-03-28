# ASD Screening & Support Platform

AI-assisted behavioral screening and support system for Autism Spectrum Disorder.

**Note:** This is a screening and support tool — NOT a medical diagnostic system.

## Project Structure

```
My Project/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application entry
│   │   ├── config.py         # Configuration settings
│   │   ├── database.py       # Database connection
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic services
│   │   ├── repositories/     # Database access layer
│   │   └── utils/            # Utility functions
│   ├── ml_models/            # Versioned ML models
│   ├── alembic/              # Database migrations
│   ├── tests/                # Test suite
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/       # Reusable components
    │   ├── pages/            # Page components
    │   ├── services/         # API services
    │   ├── hooks/            # Custom hooks
    │   └── context/          # React context
    ├── package.json
    └── vite.config.js
```

## Architecture

```
Frontend (React)
      ↓
FastAPI API Layer
      ↓
Service Layer
      ↓
Repository Layer
      ↓
MySQL Database
```

## Database Schema

### Core Tables
- **Users** - User accounts (id, email, password_hash, first_name, last_name, role, is_active)
- **ScreeningSession** - Screening sessions (id, user_id, started_at, completed_at, raw_score, risk_level, ml_risk_score, model_version)
- **ScreeningResponse** - Responses (id, screening_id, question_id, selected_option_id, response_time_ms)
- **Question** - Screening questions (id, text, category)
- **Option** - Question options (id, question_id, text, score_value)
- **Task** - Behavioral tasks (id, name, type, description)
- **TaskSession** - Task sessions (id, user_id, task_id, started_at, completed_at)
- **TaskResult** - Task results (id, task_session_id, metric_name, metric_value)
- **JournalEntry** - Journal entries (id, user_id, content, mood_rating, stress_rating)
- **JournalAnalysis** - ML analysis (id, journal_id, sentiment_score, emotion_label, model_version)
- **UserAnalysisSnapshot** - Risk analysis (id, user_id, asd_risk_score, mood_trend_score, task_performance_score, overall_risk_index, model_version)
- **Resource** - Educational resources (id, title, type, content_or_url, target_risk_level)
- **Recommendation** - User recommendations (id, user_id, resource_id, analysis_snapshot_id, reason, status)
- **Professional** - Mental health professionals (id, name, specialization, email, verified)
- **ConsultationRequest** - Consultation requests (id, user_id, professional_id, status, scheduled_time)
- **ConsentLog** - User consent tracking (id, user_id, consent_type, timestamp)

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.0+

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file from example:
```bash
cp .env.example .env
```

5. Update `.env` with your MySQL database credentials

6. Initialize database and create all tables:
```bash
# This creates the DB, runs any Alembic migrations, then creates
# all remaining tables directly from SQLAlchemy models:
python db_manage.py init
```

### Seeding initial data (questions, admin, tasks)

After `db_manage.py init`, seed baseline data. Each script auto-creates tables if they don't exist, so you can also run them standalone:

```bash
# create initial admin user  (email: admin@example.com  pw: AdminPassword123)
python seed_admin.py

# seed AQ-10 questions for all three age groups (child / adolescent / adult)
# reads from app/data/aq10_child.json, aq10_adolescent.json, aq10_adult.json
python seed_aq10_questions.py

# to wipe and re-seed questions (e.g. after editing the JSON files):
python seed_aq10_questions.py --force

# seed example behavioral tasks
python seed_tasks.py
```

Notes:
- All seed scripts are idempotent — they skip if records already exist.
- `seed_admin.py` prints the created credentials; change the password after first login.
- Run seeds in order: admin → questions → tasks.

7. Run the server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API documentation available at: http://localhost:8000/docs

### Database Management Commands

```bash
# Check migration status
python db_manage.py status

# Run pending migrations
python db_manage.py migrate

# Generate new migration (after model changes)
python db_manage.py generate -m "description of changes"

# Rollback last migration
python db_manage.py rollback

# Rollback multiple migrations
python db_manage.py rollback -s 3
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

Frontend available at: http://localhost:3000

## Recent Updates (local workspace)

- **DB init fixed**: `db_manage.py init` now calls `Base.metadata.create_all()` directly, so all tables are created even when there are no Alembic migration files present.
- **All seed scripts are standalone**: each script imports models and calls `create_tables()` before inserting so they work even if `db_manage.py init` hasn't been run yet.
- **AQ-10 seeding revamped**: `seed_aq10_questions.py` now reads all three age-group JSON files (`aq10_child.json`, `aq10_adolescent.json`, `aq10_adult.json`), stores each question with its `label` (e.g. AQ1–AQ10), correct `age_group`, and option `score_value` from the `value` field in the JSONs. Add `--force` flag to wipe and re-seed.
- **Question model** has a new `label` column (AQ1, AQ2, …) and `age_group` enum (child / adolescent / adult).
- **Screening API** now returns `family_asd`, `jaundice`, `completed_by`, and `age_group_used` in both result and history responses so the frontend can show who took the test and all pre-screening data.
- **Journal encryption**: entries stored encrypted in DB; decrypted by the API before returning to client.
- **Journal UI**: edit form scrolls + focuses on open; long entries show Read More / Show Less toggle.
- **NavBar** styling standardized across all pages.

## How to run (quick)

```bash
# --- Backend (from backend/) ---
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # edit DATABASE_URL and SECRET_KEY
python db_manage.py init          # creates DB + all tables
python seed_admin.py              # admin@example.com / AdminPassword123
python seed_aq10_questions.py     # 30 AQ-10 questions (3 age groups)
python seed_tasks.py              # 4 example tasks
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# --- Frontend (from frontend/) ---
npm install
npm run dev
```

URLs:
- Frontend: http://localhost:3000  
- API docs (Swagger): http://localhost:8000/docs

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/me` - Update user profile
- `POST /api/v1/auth/change-password` - Change password

## Security Features
- JWT-based authentication
- Bcrypt password hashing
- Protected API routes
- Token refresh mechanism
- CORS configuration

## Tech Stack
- **Frontend**: React, React Router, Axios, Vite
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Database**: MySQL
- **Auth**: JWT, bcrypt

## Modules (Implementation Status)
- [x] User Authentication
- [x] ASD Screening (AQ-10) — all 3 age groups, pre-screening data stored
- [x] Behavioral Task Tracking
- [x] Journal + Mood Tracking (with encryption)
- [ ] ML Analysis
- [ ] Recommendation Engine
- [ ] Report Generation
- [x] Professional Sharing
