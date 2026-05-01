# MindBridge — AI-Assisted Digital Behavioral Screening Platform

> An integrated digital platform for autism spectrum disorder (ASD) behavioral screening, cognitive assessment, comorbidity profiling, and AI-driven clinical decision support.

**Important Disclaimer:** This platform is a screening and clinical decision-support tool. It does **not** provide a medical diagnosis. All results should be interpreted by a qualified healthcare professional.

---

## Table of Contents

1. [Why This Platform Exists](#1-why-this-platform-exists)
2. [What It Does (Feature Overview)](#2-what-it-does)
3. [Architecture & Tech Stack](#3-architecture--tech-stack)
4. [Project Structure](#4-project-structure)
5. [Data Models & Database Schema](#5-data-models--database-schema)
6. [Clinical Instruments & Scoring](#6-clinical-instruments--scoring)
7. [Machine Learning Pipeline](#7-machine-learning-pipeline)
8. [AI-Powered Services](#8-ai-powered-services)
9. [Normative Score Mapping](#9-normative-score-mapping)
10. [Referral Pathway System](#10-referral-pathway-system)
11. [Clinical PDF Report Generation](#11-clinical-pdf-report-generation)
12. [Security & Privacy](#12-security--privacy)
13. [API Reference](#13-api-reference)
14. [Setup & Installation](#14-setup--installation)
15. [Environment Variables](#15-environment-variables)
16. [Frontend Pages](#16-frontend-pages)
17. [Implementation Status](#17-implementation-status)
18. [Clinical Validation & Evidence Base](#18-clinical-validation--evidence-base)

---

## 1. Why This Platform Exists

ASD screening today is fragmented: a parent might fill out one questionnaire at a pediatrician's office, then wait months for a cognitive evaluation, and never receive an integrated view of the results. Existing tools are siloed — screening instruments don't talk to cognitive assessments, mood tracking is separate from behavioral observation, and clinicians assemble the picture manually.

**MindBridge solves this by:**

- **Unifying multiple validated screening instruments** (AQ-10, RAADS-R, CAST, SCQ, SRS-2) into a single platform where results cross-reference each other.
- **Adding comorbidity screening** (PHQ-9 for depression, GAD-7 for anxiety, ASRS for ADHD) because 70%+ of ASD individuals have at least one co-occurring condition — missing these leads to incomplete care.
- **Integrating 12 gamified cognitive tasks** that map to clinical constructs (executive function, social cognition, joint attention, sensory processing) and comparing performance to age-stratified normative data.
- **Providing structured behavioral observation logging** using the clinical ABC (Antecedent-Behavior-Consequence) framework so patterns emerge from self-report or caregiver data over time.
- **Using AI (Gemini 2.5 Flash)** to synthesize all data sources into holistic recommendations, risk assessments, and referral suggestions — the kind of cross-domain synthesis that normally requires hours of a clinician's time.
- **Generating a comprehensive clinical PDF report** that a user can bring to their healthcare provider, containing every data point in a structured, professional format.

The key design principle: **nothing is isolated**. Every screening result, every task score, every journal entry, and every behavioral observation feeds into the same analysis pipeline and AI recommendation engine. The platform functions as one cohesive clinical support system.

---

## 2. What It Does

### Core Screening & Assessment
| Feature | Clinical Purpose |
|---|---|
| **AQ-10 Screening** (3 age groups: child, adolescent, adult) | Validated 10-item ASD screening questionnaire with ML-enhanced risk prediction |
| **RAADS-R** (80 items) | Gold-standard adult ASD self-report across 4 domains (social relatedness, circumscribed interests, language, sensory-motor) |
| **CAST** (37 items) | Childhood Autism Spectrum Test for ages 4–11 |
| **SCQ** (40 items) | Social Communication Questionnaire across 3 domains (reciprocal social interaction, communication, restricted/repetitive behaviors) |
| **SRS-2** (65 items) | Social Responsiveness Scale across 5 subscales (social awareness, cognition, communication, motivation, restricted interests) |

### Comorbidity Screening
| Instrument | Condition | Items | Scoring |
|---|---|---|---|
| **PHQ-9** | Depression | 9 | 0–27, with suicidal ideation flag on item 9 |
| **GAD-7** | Anxiety | 7 | 0–21, severity thresholds at 5/10/15 |
| **ASRS** | ADHD | 6 | 0–24, threshold items for clinical significance |

### Cognitive Task Battery (12 tasks)
| Pillar | Tasks | What It Measures |
|---|---|---|
| **Executive Function** | N-Back, Go/No-Go, DCCS (Card Sort), Tower of London | Working memory, inhibitory control, cognitive flexibility, planning |
| **Social Cognition** | Facial Emotion Recognition, False Belief, Social Stories, Conversation Cues | Emotion identification, theory of mind, social narrative comprehension |
| **Joint Attention** | Responsive JA (RJA), Initiating JA (IJA) | Ability to follow and direct shared attention |
| **Sensory Processing** | Visual-Temporal, Auditory Processing | Temporal discrimination, auditory pattern detection |

### Behavioral Observation (ABC Framework)
- 9 categories: social, communication, repetitive behavior, sensory, emotional regulation, daily living, meltdown, sleep, feeding
- Structured fields: antecedent, behavior description, consequence, frequency, duration, intensity (mild/moderate/severe), setting
- Pattern detection: top behavioral patterns surfaced automatically in the analysis

### AI-Powered Features
- **Journal Analysis**: Natural language mood/behavior journals analyzed by Gemini for 6 clinical attributes (mood valence, anxiety, social engagement, sensory sensitivity, emotional regulation, repetitive behavior)
- **Holistic Recommendations**: AI synthesizes ALL data sources (screening + tasks + journals + observations + comorbidity) into personalized task suggestions, resource recommendations, and lifestyle tips
- **Referral Suggestions**: Algorithmic referral pathway generation based on composite risk profile
- **Clinical PDF Report**: Comprehensive multi-section professional report

### Professional Features
- Verified professional accounts (clinicians, psychologists, therapists)
- Patient consultation request system
- Full read access to connected patients' data
- Professional notes visible to patients
- Resource recommendation to specific patients
- Patient clinical report download

### Administrative Features
- User management (activate/deactivate, role changes)
- Resource management (create, edit, categorize educational resources)
- Platform-wide dashboards

---

## 3. Architecture & Tech Stack

```
┌──────────────────────────────────────────────────┐
│                   Frontend                        │
│  React 18 · React Router v6 · Axios · Vite       │
│  Port 3000 (proxied to backend at 8000)          │
└──────────────────┬───────────────────────────────┘
                   │ REST API (JSON)
┌──────────────────▼───────────────────────────────┐
│              FastAPI Backend                      │
│  Pydantic schemas · JWT auth · Rate limiting     │
│  Port 8000                                       │
├──────────────────────────────────────────────────┤
│  Service Layer                                   │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────┐ │
│  │ ML Service  │ │ Gemini AI    │ │ Normative │ │
│  │ (sklearn RF)│ │ (Journal +   │ │ Service   │ │
│  │             │ │  Recommend)  │ │ (T-scores)│ │
│  └─────────────┘ └──────────────┘ └───────────┘ │
│  ┌──────────────────┐ ┌────────────────────────┐ │
│  │ Clinical Scoring  │ │ Report Generation     │ │
│  │ (7 instruments)   │ │ (ReportLab PDF)       │ │
│  └──────────────────┘ └────────────────────────┘ │
├──────────────────────────────────────────────────┤
│  Repository Layer (SQLAlchemy ORM 2.0)           │
├──────────────────────────────────────────────────┤
│  MySQL 8.0 (Aiven cloud or local)                │
│  Alembic migrations · Fernet encryption at rest  │
└──────────────────────────────────────────────────┘
```

### Backend Dependencies
`fastapi`, `uvicorn`, `gunicorn`, `sqlalchemy`, `alembic`, `pymysql`, `cryptography`, `pydantic`, `pydantic-settings`, `python-jose`, `passlib`, `bcrypt`, `python-multipart`, `python-dotenv`, `reportlab`, `slowapi`, `scikit-learn`, `joblib`, `pandas`, `google-genai`

### Frontend Dependencies
`react`, `react-dom`, `react-router-dom`, `axios`, `vite`

---

## 4. Project Structure

```
├── Dockerfile
├── README.md
├── backend/
│   ├── alembic.ini                    # Alembic config
│   ├── db_manage.py                   # DB management CLI (init, migrate, rollback)
│   ├── requirements.txt
│   ├── seed_admin.py                  # Seed admin user
│   ├── seed_aq10_questions.py         # Seed AQ-10 questions (3 age groups)
│   ├── seed_tasks_new.py             # Seed cognitive tasks (12 tasks)
│   │
│   ├── alembic/versions/
│   │   ├── 001_ml_fields.py           # ML prediction columns
│   │   ├── 002_journal_analysis_asd.py# Journal ASD analysis
│   │   ├── 003_widen_encrypted_columns.py
│   │   ├── 004_recommendation_redirect_link.py
│   │   ├── 005_recommendation_batch_comment.py
│   │   ├── 006_email_verification.py  # Email OTP verification
│   │   └── 007_clinical_features.py   # Additional/comorbidity screenings, observations, referrals
│   │
│   ├── app/
│   │   ├── main.py                    # FastAPI app, CORS, router registration
│   │   ├── config.py                  # Pydantic Settings (env vars)
│   │   ├── database.py                # SQLAlchemy engine + session
│   │   │
│   │   ├── data/                      # Clinical instrument definitions (JSON)
│   │   │   ├── aq10_child.json        # AQ-10 child (≤11)
│   │   │   ├── aq10_adolescent.json   # AQ-10 adolescent (12–17)
│   │   │   ├── aq10_adult.json        # AQ-10 adult (18+)
│   │   │   ├── raads_r.json           # RAADS-R (80 items, 4 domains)
│   │   │   ├── cast.json              # CAST (37 items)
│   │   │   ├── scq.json              # SCQ (40 items, 3 domains)
│   │   │   ├── srs_2.json            # SRS-2 (65 items, 5 domains)
│   │   │   ├── phq9.json             # PHQ-9 (9 items, suicidal ideation flag)
│   │   │   ├── gad7.json             # GAD-7 (7 items)
│   │   │   └── asrs.json             # ASRS (6 items, threshold items)
│   │   │
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   ├── user.py                # User, roles, all relationships
│   │   │   ├── screening.py           # ScreeningSession, ScreeningResponse, Question, Option
│   │   │   ├── task.py                # Task, TaskSession, TaskResult
│   │   │   ├── journal.py             # JournalEntry, JournalAnalysis
│   │   │   ├── analysis.py            # UserAnalysisSnapshot
│   │   │   ├── recommendation.py      # Recommendation
│   │   │   ├── professional.py        # ProfessionalProfile, ConsultationRequest
│   │   │   ├── notification.py        # Notification
│   │   │   ├── consent.py             # ConsentLog
│   │   │   ├── email_verification.py  # EmailVerification (OTP)
│   │   │   ├── additional_screening.py# AdditionalScreening (RAADS-R, CAST, SCQ, SRS-2)
│   │   │   ├── comorbidity_screening.py# ComorbidityScreening (PHQ-9, GAD-7, ASRS)
│   │   │   ├── behavioral_observation.py# BehavioralObservation (ABC framework)
│   │   │   └── referral.py            # Referral (10 referral types)
│   │   │
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── screening.py
│   │   │   ├── task.py
│   │   │   ├── admin.py
│   │   │   ├── professional.py
│   │   │   └── clinical.py            # Schemas for all clinical features
│   │   │
│   │   ├── routes/                    # API route handlers
│   │   │   ├── auth.py                # Register, login, OTP verify, password reset
│   │   │   ├── admin.py               # Admin dashboard, user management
│   │   │   ├── users.py               # Profile, notes
│   │   │   ├── screening.py           # AQ-10 flow
│   │   │   ├── tasks.py               # Task sessions, results
│   │   │   ├── journal.py             # Journal CRUD + AI analysis trigger
│   │   │   ├── analysis.py            # Aggregated analysis summary
│   │   │   ├── recommendations.py     # AI recommendations
│   │   │   ├── resources.py           # Educational resources
│   │   │   ├── notifications.py       # User notifications
│   │   │   ├── professional.py        # Professional patient management
│   │   │   ├── additional_screening.py# RAADS-R, CAST, SCQ, SRS-2 routes
│   │   │   ├── comorbidity.py         # PHQ-9, GAD-7, ASRS routes
│   │   │   ├── behavioral_observations.py # ABC observation logging
│   │   │   ├── referrals.py           # Referral pathway management
│   │   │   └── reports.py             # PDF report generation
│   │   │
│   │   ├── services/                  # Business logic
│   │   │   ├── auth_service.py        # JWT, password hashing, token management
│   │   │   ├── email_service.py       # SMTP email (Gmail) with dev fallback
│   │   │   ├── ml_service.py          # ML inference pipeline
│   │   │   ├── screening_service.py   # AQ-10 scoring + ML integration
│   │   │   ├── task_service.py        # Task session management
│   │   │   ├── journal_analysis_service.py # Gemini journal analysis
│   │   │   ├── recommendation_service.py   # Gemini holistic recommendations
│   │   │   ├── clinical_scoring_service.py # Scoring for all 7 instruments
│   │   │   ├── normative_service.py   # Age-stratified normative mapping
│   │   │   ├── referral_service.py    # Algorithmic referral generation
│   │   │   └── report_service.py      # ReportLab PDF generation
│   │   │
│   │   ├── repositories/             # Data access layer
│   │   └── utils/
│   │       ├── crypto.py              # Fernet encryption/decryption
│   │       └── dependencies.py        # FastAPI dependency injection
│   │
│   ├── ml_models/
│   │   └── asd_pipeline.joblib        # Trained ML pipeline
│   │
│   ├── scripts/                       # Utility scripts
│   └── tests/                         # Test suite
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js                 # Dev server on 3000, proxy /api → 8000
    └── src/
        ├── App.jsx                    # Route definitions
        ├── main.jsx                   # React entry point
        ├── index.css                  # Global styles
        ├── components/                # Navbar, ProtectedRoute, etc.
        ├── context/                   # AuthContext (JWT + user state)
        ├── hooks/                     # Custom React hooks
        ├── services/                  # API service layer
        │   ├── api.js                 # Axios instance with interceptors
        │   └── clinicalService.js     # Clinical feature API calls
        ├── pages/                     # All page components
        └── utils/                     # Frontend utilities
```

---

## 5. Data Models & Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|---|---|---|
| `users` | User accounts | id, email, password_hash, first_name, last_name, date_of_birth, gender, ethnicity, role (user/professional/admin), is_active, is_email_verified |
| `screening_sessions` | AQ-10 sessions | user_id, age_group, raw_score, risk_level, ml_prediction, ml_probability, ml_risk_label, model_version, completed_at |
| `screening_responses` | Individual AQ-10 answers | screening_id, question_id, selected_option_id, response_time_ms |
| `questions` | AQ-10 questions | text, label (AQ1–AQ10), category, age_group |
| `options` | Question choices | question_id, text, score_value |
| `tasks` | Cognitive task definitions | name, category (12 types), pillar, description, difficulty_levels |
| `task_sessions` | Task attempt records | user_id, task_id, difficulty_level, started_at, completed_at |
| `task_results` | Per-metric task results | task_session_id, metric_name, metric_value |
| `journal_entries` | Encrypted mood journals | user_id, content (encrypted), mood_rating (1–5), stress_rating (1–5) |
| `journal_analyses` | AI analysis per entry | journal_id, mood_valence, anxiety_level, social_engagement, sensory_sensitivity, emotional_regulation, repetitive_behavior, reasoning |
| `recommendations` | AI-generated suggestions | user_id, category, reason, priority, status (pending/completed/dismissed), professional_comment |
| `resources` | Educational materials | title, type, content_or_url, target_risk_level |
| `professional_profiles` | Clinician profiles | user_id, license_number, specialization, organization, verified |
| `consultation_requests` | Patient-professional links | user_id, professional_id, status, notes |
| `notifications` | User notification system | user_id, type, message, read, link |
| `consent_logs` | Consent tracking | user_id, consent_type, granted, timestamp |
| `email_verifications` | OTP records | user_id, otp_hash, purpose, attempts, expires_at |

### Clinical Feature Tables (Migration 007)

| Table | Purpose | Key Fields |
|---|---|---|
| `additional_screenings` | RAADS-R, CAST, SCQ, SRS-2 results | user_id, instrument, total_score, max_score, domain_scores (JSON), severity, responses (JSON), interpretation (encrypted) |
| `comorbidity_screenings` | PHQ-9, GAD-7, ASRS results | user_id, instrument, total_score, max_score, severity, clinical_flags (encrypted JSON), interpretation (encrypted) |
| `behavioral_observations` | ABC framework observations | user_id, observer_id, category, behavior_type, antecedent/behavior/consequence (all encrypted), frequency, intensity, duration, setting |
| `referrals` | Clinical referral tracking | user_id, professional_id, referral_type, urgency (routine/soon/urgent), status (recommended/acknowledged/scheduled/completed/declined), reason (encrypted) |

### Relationships

```
User ──┬── ScreeningSessions (AQ-10)
       ├── AdditionalScreenings (RAADS-R, CAST, SCQ, SRS-2)
       ├── ComorbidityScreenings (PHQ-9, GAD-7, ASRS)
       ├── TaskSessions → TaskResults
       ├── JournalEntries → JournalAnalyses
       ├── BehavioralObservations (self + professional-reported)
       ├── Referrals (self + professional-created)
       ├── Recommendations (AI-generated)
       ├── ConsultationRequests ←→ ProfessionalProfile
       └── Notifications
```

---

## 6. Clinical Instruments & Scoring

### AQ-10 (Autism-Spectrum Quotient – 10 items)

- **Source**: Baron-Cohen et al. (2001); shortened from AQ-50
- **Age groups**: Child (≤11), Adolescent (12–17), Adult (18+) — each has its own item set
- **Scoring**: 10 items, each scored 0 or 1; total 0–10; threshold ≥6 suggests further evaluation
- **Enhancement**: ML model overlays AQ-10 raw score with demographic features for probability-based risk (see Section 7)

### RAADS-R (Ritvo Autism Asperger Diagnostic Scale – Revised)

- **Items**: 80 self-report items across 4 domains
- **Domains**: Social Relatedness, Circumscribed Interests, Language, Sensory-Motor
- **Scoring**: 0–3 per item (never true → true now and when young); max 240
- **Threshold**: ≥65 clinical significance; severity levels: non-clinical (<65), mild (65–89), moderate (90–129), clinical (≥130)
- **Age range**: Adolescent/Adult (12+)

### CAST (Childhood Autism Spectrum Test)

- **Items**: 37 yes/no questions (6 non-scored filler items)
- **Scoring**: 31 scored items; directional scoring (some items score on "yes", others on "no")
- **Threshold**: ≥15 suggests ASD; severity: non-clinical (<15), mild (15–21), clinical (≥22)
- **Age range**: Child (4–11)

### SCQ (Social Communication Questionnaire)

- **Items**: 40 yes/no questions
- **Domains**: Reciprocal Social Interaction, Communication, Restricted/Repetitive Behaviors
- **Scoring**: 39 scored items (Q1 is a verbal language filter); max 39
- **Threshold**: ≥15 suggests ASD evaluation needed
- **Age range**: Child/Adolescent (4–17)

### SRS-2 (Social Responsiveness Scale – Second Edition)

- **Items**: 65 items rated 1–4
- **Domains**: Social Awareness, Social Cognition, Social Communication, Social Motivation, Restricted Interests & Repetitive Behavior
- **Scoring**: Sum 65–260; T-score interpretation
- **Severity**: Within normal (<76), Mild (76–97), Moderate (98–130), Severe (>130)
- **Age range**: All ages

### PHQ-9 (Patient Health Questionnaire – 9)

- **Purpose**: Depression screening (DSM-5 criteria)
- **Items**: 9 items rated 0–3 (not at all → nearly every day); max 27
- **Severity**: Minimal (0–4), Mild (5–9), Moderate (10–14), Moderately Severe (15–19), Severe (20–27)
- **Clinical flag**: Item 9 (suicidal ideation) — flagged if response ≥1; triggers safety messaging
- **Why included**: Depression co-occurs in 40–70% of ASD individuals

### GAD-7 (Generalized Anxiety Disorder – 7)

- **Purpose**: Anxiety screening
- **Items**: 7 items rated 0–3; max 21
- **Severity**: Minimal (0–4), Mild (5–9), Moderate (10–14), Severe (15–21)
- **Why included**: Anxiety affects 40–50% of ASD individuals

### ASRS (Adult ADHD Self-Report Scale – v1.1 Screener)

- **Purpose**: ADHD screening
- **Items**: 6 items rated 0–4; max 24
- **Threshold items**: Items 1–4 have elevated threshold (≥3 = clinically significant)
- **Severity**: Unlikely (<14), Possible (14–17), Likely (≥18)
- **Why included**: ADHD co-occurs in 30–80% of ASD individuals

---

## 7. Machine Learning Pipeline

### Model Architecture

```
Input Features                     Pipeline                        Output
─────────────                      ────────                        ──────
A1–A9 (item scores)  ─┐
A10 (AQ-10 total)     │
Age_Years              │     ┌──────────────┐    ┌─────────────┐
Ethnicity              ├────→│ OneHotEncoder ├───→│ RandomForest ├──→ P(ASD) ∈ [0, 1]
Sex                    │     │ (categoricals)│    │ Classifier   │
Jaundice               │     └──────────────┘    └─────────────┘
Family_mem_with_ASD    │
Who_completed_the_test─┘
```

### Details

- **Algorithm**: Random Forest Classifier with 3 age-stratified sub-models (child ≤11, adolescent 12–15, adult 16+)
- **Training**: Pre-trained, saved as `asd_pipeline.joblib` using scikit-learn + joblib
- **Features**: AQ-10 individual item scores (A1–A9), total quotient (A10), demographic variables
- **Encoding**: OneHotEncoder for categorical features (ethnicity, sex, jaundice, family ASD history, who completed test)
- **Output**: Probability float `[0.0, 1.0]` representing likelihood of ASD traits
- **Risk labels**: Low (<0.3), Moderate (0.3–0.6), High (0.6–0.85), Very High (>0.85)
- **Integration**: Called automatically after each AQ-10 completion; probability stored alongside raw score
- **Independence**: The ML model is NEVER modified by new clinical features — additional screenings, comorbidity data, and observations feed only into the AI recommendation layer, not the ML prediction

---

## 8. AI-Powered Services

### Journal Analysis (Gemini 2.5 Flash)

When a user saves a journal entry, the system sends the text to Google Gemini with a structured output schema. The AI returns scores (0.0–1.0) for 6 clinically relevant attributes:

| Attribute | Scale | Clinical Relevance |
|---|---|---|
| `mood_valence` | 0 (distressed) → 1 (content) | Baseline emotional state |
| `anxiety_level` | 0 (none) → 1 (overwhelming) | Anxiety symptom tracking |
| `social_engagement` | 0 (withdrawal) → 1 (positive engagement) | Social functioning indicator |
| `sensory_sensitivity` | 0 (none) → 1 (severe distress) | Sensory processing difficulties |
| `emotional_regulation` | 0 (dysregulated) → 1 (well-regulated) | Emotional control capacity |
| `repetitive_behavior` | 0 (none) → 1 (pervasive) | Restricted/repetitive behavior indicator |

Also returns a `reasoning` field (≤60 words) explaining the assessment in plain English. These 6 attributes were chosen because they map directly to DSM-5 ASD diagnostic criteria and commonly co-occurring clinical presentations.

### Recommendation Engine (Gemini 2.5 Flash)

The recommendation engine is triggered after each journal entry, screening submission, or task completion. It aggregates:

1. **Latest AQ-10** results (score, risk level, ML probability)
2. **Journal analysis** trends (average of last 5 entries across all 6 attributes)
3. **Task performance** (pillar-level analytics with percent change trends)
4. **Additional ASD screening** results (last 5, with instrument/severity/domain scores)
5. **Comorbidity screening** results (last 5, with severity and clinical flags)
6. **Behavioral observation** summary (category counts, severe episode count)

The AI synthesizes this into a structured output:

```json
{
  "overall_summary": "2-3 sentence plain-English summary",
  "risk_assessment": { "level": "low|moderate|high", "reason": "..." },
  "key_concerns": ["concern 1", "concern 2", "concern 3"],
  "strengths": ["strength 1", "strength 2"],
  "recommended_tasks": [
    { "category": "nback", "reason": "...", "priority": 1, "difficulty_level": "medium" }
  ],
  "recommended_resources": [
    { "resource_id": 5, "reason": "..." }
  ],
  "lifestyle_tips": ["tip 1", "tip 2"]
}
```

The number of recommended tasks scales with assessed risk (low→3, moderate→5, high→8). Resource recommendations are matched from the platform's curated resource database.

---

## 9. Normative Score Mapping

### Purpose

Raw task scores are meaningless without context. A 450ms reaction time on a Go/No-Go task might be excellent for a 7-year-old but concerning for a 20-year-old. The normative service converts raw task metrics into standardized scores.

### Method

1. **Age stratification**: Three groups — child (≤11), adolescent (12–17), adult (18+)
2. **Z-score computation**: `z = (raw - reference_mean) / reference_sd` (inverted for metrics where lower is better, like response time)
3. **T-score conversion**: `T = 50 + (10 × z)` (mean 50, SD 10 — standard clinical format)
4. **Percentile**: Derived from cumulative normal distribution of z-score
5. **Classification**:
   - **Within Normal Limits**: T ≥ 40
   - **Low Average**: T 35–40
   - **Borderline**: T 30–35
   - **Clinically Impaired**: T < 30

### Reference Data Sources

| Task | Norms Based On |
|---|---|
| N-Back | Luciana & Nelson (2002) — developmental working memory norms |
| Go/No-Go | Cragg & Nation (2008) — inhibitory control across development |
| DCCS | Zelazo (2006) — cognitive flexibility norms |
| Tower | Bull, Espy & Senn (2004) — planning ability norms |
| FER | Herba et al. (2006) — emotion recognition developmental data |
| False Belief | Wellman, Cross & Watson (2001) — theory of mind meta-analysis |

### Composite Pillar Scores

Individual task normative scores are aggregated into pillar-level composites (Executive Function, Social Cognition, Joint Attention, Sensory Processing), each with its own composite T-score and classification. This gives clinicians a quick summary: "Executive function is within normal limits (T=48), but social cognition is borderline (T=33)."

---

## 10. Referral Pathway System

### How Referrals Are Generated

The referral service examines the user's complete clinical profile and generates suggestions using a tiered algorithm:

**Tier 1 — ASD Risk Level** (from latest AQ-10 ML prediction):
- High/Very High → Urgent referral for `diagnostic_evaluation` + `psychology`
- Moderate → Soon referral for `developmental_pediatrics` + `psychoeducation`
- Low → Routine `psychoeducation` only

**Tier 2 — Comorbidity Flags**:
- PHQ-9 severe (≥15) → `psychiatry` referral (urgent)
- GAD-7 moderate+ (≥10) → `psychology` referral (soon)
- ASRS likely (≥18) → `psychiatry` referral for ADHD evaluation (soon)

**Tier 3 — Behavioral Observation Patterns**:
- ≥5 sensory observations → `occupational_therapy`
- ≥5 communication observations → `speech_therapy`
- ≥3 meltdown observations → `behavioral_therapy`

### Referral Types

| Type | When Suggested |
|---|---|
| `diagnostic_evaluation` | High ASD risk — comprehensive evaluation by developmental specialist |
| `speech_therapy` | Communication concerns or language domain deficits |
| `occupational_therapy` | Sensory processing difficulties |
| `behavioral_therapy` | Meltdown management, behavioral regulation |
| `psychology` | Anxiety, depression, social skill building |
| `psychiatry` | Severe depression, ADHD, medication considerations |
| `developmental_pediatrics` | Moderate risk — developmental monitoring |
| `social_skills_group` | Social cognition deficits |
| `educational_support` | Academic accommodations |
| `psychoeducation` | Understanding ASD traits and coping strategies |

### Referral Lifecycle

`recommended` → `acknowledged` → `scheduled` → `completed` (or `declined`)

---

## 11. Clinical PDF Report Generation

The report service generates a comprehensive A4 PDF using ReportLab. Sections include:

1. **Patient Demographics**: Name, date of birth, age, gender, report date, disclaimer
2. **AQ-10 Screening Results**: Last 5 sessions with raw score, risk level, ML probability, risk label
3. **Additional ASD Screening Results**: Each instrument with total score, domain scores, severity, interpretation
4. **Comorbidity Screening Results**: PHQ-9/GAD-7/ASRS with scores, severity, clinical flags (suicidal ideation highlighted)
5. **Cognitive Task Performance**: Per-task metrics with normative T-scores, percentiles, and clinical classification
6. **Journal Analysis Summary**: Average of 6 behavioral attributes with clinical significance thresholds
7. **Behavioral Observations Summary**: Category counts, predominant intensity, total observations
8. **AI Recommendations**: Current AI-generated suggestions and risk assessment
9. **Referral Suggestions**: Active referrals with urgency and status

All severity levels are color-coded (green/yellow/orange/red). Tables are formatted for clinical readability.

---

## 12. Security & Privacy

### Authentication & Authorization

- **JWT tokens**: HS256-signed access tokens (30min TTL) + refresh tokens (7 day TTL)
- **Password hashing**: bcrypt via passlib
- **OTP generation**: HOTP (RFC 4226) + TOTP-style counter (RFC 6238) — see details below
- **Three roles**: `user`, `professional`, `admin` with route-level authorization
- **Professional access**: Requires accepted `ConsultationRequest` — professionals can only view connected patients' data

### OTP Algorithm — HOTP (RFC 4226) with TOTP Counter (RFC 6238)

The platform uses the **HMAC-Based One-Time Password (HOTP)** algorithm standardized in [RFC 4226](https://datatracker.ietf.org/doc/html/rfc4226), the same algorithm used by Google Authenticator, bank 2FA, and enterprise auth systems.

**Algorithm steps:**

```
1. SECRET DERIVATION:
   secret = HMAC-SHA256(app_SECRET_KEY, random_16_byte_nonce)
   ↳ Unique per OTP request — same app key, different nonce each time

2. COUNTER (TOTP-style, RFC 6238):
   counter = floor(unix_timestamp / 30)
   ↳ 30-second time step ensures temporal uniqueness

3. HOTP GENERATION (RFC 4226 Section 5):
   a) hmac_hash = HMAC-SHA1(secret, counter_as_8_byte_big_endian)
   b) offset = hmac_hash[19] & 0x0F                          (dynamic truncation)
   c) truncated = hmac_hash[offset..offset+4] & 0x7FFFFFFF   (31-bit extraction)
   d) otp = truncated mod 10^6                                (6-digit code)
   e) zero-pad to 6 characters: "007291"

4. STORAGE:
   stored_hash = SHA-256(otp_plaintext)
   ↳ Only the hash is stored in DB — plaintext sent to user via email

5. VERIFICATION:
   SHA-256(user_input) == stored_hash → valid
```

**Security properties:**
- OTP is cryptographically derived, not random — uniform distribution over 000000–999999
- Stored as SHA-256 hash — database compromise doesn't reveal OTPs
- One-time use: marked `is_used=True` after verification
- Expiry: configurable (default 10 minutes via `OTP_EXPIRE_MINUTES`)
- Brute-force protection: max 5 attempts per OTP (`OTP_MAX_ATTEMPTS`)
- Previous OTPs invalidated when new one is requested

**Standards compliance:**
| Standard | What It Defines | Our Usage |
|---|---|---|
| [RFC 4226](https://datatracker.ietf.org/doc/html/rfc4226) | HOTP: HMAC-Based One-Time Password | Core OTP generation algorithm |
| [RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238) | TOTP: Time-Based One-Time Password | Time-step counter (30s intervals) |
| [RFC 2104](https://datatracker.ietf.org/doc/html/rfc2104) | HMAC: Keyed-Hashing for Message Authentication | HMAC-SHA1 in HOTP, HMAC-SHA256 for key derivation |

### Encryption at Rest

- **Method**: Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256)
- **Key derivation**: SHA-256 hash of `SECRET_KEY` → base64-encoded → Fernet key
- **What's encrypted**: Journal content, behavioral observation descriptions (antecedent, behavior, consequence, notes), referral reasons, clinical interpretations, comorbidity clinical flags
- **Why**: Medical data at rest must be protected — even if the database is compromised, sensitive narrative text is unreadable without the `SECRET_KEY`

### Rate Limiting

- **slowapi**: Configurable rate limiting (default: 100 requests/60 seconds)

### CORS

- Configured to allow only specified frontend origins (localhost:3000, localhost:5173)

---

## 13. API Reference

All routes are prefixed with `/api/v1`.

### Authentication (`/auth`)
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/register` | Register new user |
| POST | `/login` | Login → JWT tokens |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update profile |
| POST | `/change-password` | Change password |
| POST | `/forgot-password` | Request password reset OTP |
| POST | `/reset-password` | Reset password with OTP |
| POST | `/verify-email/send` | Send email verification OTP |
| POST | `/verify-email/verify` | Verify email with OTP |

### AQ-10 Screening (`/screening`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/questions` | Get AQ-10 questions for age group |
| POST | `/submit` | Submit screening responses → ML prediction |
| GET | `/history` | List past screening sessions |
| GET | `/results/{session_id}` | Detailed result with ML breakdown |

### Additional ASD Screening (`/additional-screening`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/instruments` | List available instruments (RAADS-R, CAST, SCQ, SRS-2) |
| GET | `/questions/{instrument}` | Get questions for instrument |
| POST | `/submit` | Submit responses → scored + interpreted |
| GET | `/history` | List past additional screenings |
| GET | `/{screening_id}` | Detail view |

### Comorbidity Screening (`/comorbidity`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/instruments` | List instruments (PHQ-9, GAD-7, ASRS) |
| GET | `/questions/{instrument}` | Get questions |
| POST | `/submit` | Submit → scored with clinical flags |
| GET | `/history` | History |
| GET | `/{screening_id}` | Detail view |

### Cognitive Tasks (`/tasks`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | List all tasks with status |
| GET | `/{task_id}` | Task detail |
| POST | `/{task_id}/start` | Start a task session |
| POST | `/sessions/{session_id}/complete` | Submit task results |
| GET | `/history` | Task session history |

### Behavioral Observations (`/behavioral-observations`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/categories` | List all 9 categories with behavior types |
| POST | `/` | Log observation (self-report) |
| POST | `/patient/{patient_id}` | Log for patient (professional) |
| GET | `/` | Own observations |
| GET | `/summary` | Clinical summary with pattern detection |
| GET | `/patient/{patient_id}` | Patient observations (professional) |
| DELETE | `/{observation_id}` | Delete observation |

### Referrals (`/referrals`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/types` | List referral types with descriptions |
| GET | `/suggestions` | Generate AI referral suggestions |
| POST | `/` | Create referral |
| POST | `/accept-suggestion` | Accept an AI suggestion |
| GET | `/` | Own referrals |
| GET | `/patient/{patient_id}` | Patient referrals (professional) |
| PUT | `/{referral_id}` | Update referral status |

### Clinical Reports (`/reports`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/my-report` | Download own clinical PDF |
| GET | `/patient/{patient_id}` | Download patient PDF (professional) |

### Journal (`/journal`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | List journal entries |
| POST | `/` | Create entry → triggers AI analysis |
| PUT | `/{entry_id}` | Update entry |
| DELETE | `/{entry_id}` | Delete entry |

### Analysis (`/analysis`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/summary` | Full aggregated analysis (all data sources) |

### Recommendations (`/recommendations`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Current AI recommendations |
| POST | `/refresh` | Force recommendation refresh |
| PATCH | `/{rec_id}/complete` | Mark recommendation as completed |

### Professional (`/professional`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/patients` | List connected patients |
| GET | `/patients/{id}` | Patient detail with all data |
| GET | `/patients/{id}/task-analytics` | Patient task analytics |
| GET | `/patients/{id}/recommendations` | Patient recommendations |
| POST | `/patients/{id}/notes` | Add note to patient |

### Admin (`/admin`)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/dashboard` | Platform statistics |
| GET | `/users` | User management |
| PATCH | `/users/{id}/role` | Change user role |
| PATCH | `/users/{id}/status` | Activate/deactivate user |

---

## 14. Setup & Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8.0+ (local or cloud, e.g. Aiven)

### Quick Start

```bash
# ── Backend ──────────────────────────────────────
cd backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # Edit with your DB credentials, SECRET_KEY, GEMINI_API_KEY
python db_manage.py init            # Creates database + all tables
python seed_admin.py                # admin@example.com / AdminPassword123
python seed_aq10_questions.py       # 30 AQ-10 questions (3 age groups)
python seed_tasks_new.py            # 12 cognitive tasks
python seed_resources.py            # 40 curated resources (articles, videos, guides, tools)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ── Frontend ─────────────────────────────────────
cd frontend
npm install
npm run dev
```

### Database Migration

The database schema is managed by Alembic. If your database already has tables created by `create_all()`:

```bash
# Stamp to current revision (skip already-applied migrations)
alembic stamp 007_clinical_features

# For fresh databases, run all migrations
alembic upgrade head
```

### Seed Data

All seed scripts are idempotent (skip if data exists):

```bash
python seed_admin.py              # Admin user
python seed_aq10_questions.py     # AQ-10 questions (use --force to reseed)
python seed_tasks_new.py          # 12 cognitive tasks
python seed_resources.py          # 40 curated resources with real external links
```

### Database Management CLI

```bash
python db_manage.py init           # Create DB + all tables
python db_manage.py status         # Check migration status
python db_manage.py migrate        # Run pending migrations
python db_manage.py generate -m "description"  # Generate new migration
python db_manage.py rollback       # Rollback last migration
python db_manage.py rollback -s 3  # Rollback multiple
```

### URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API Swagger Docs | http://localhost:8000/docs |
| API ReDoc | http://localhost:8000/redoc |

---

## 15. Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | MySQL connection string (`mysql+pymysql://user:pass@host:port/db`) |
| `SECRET_KEY` | Yes | — | JWT signing + Fernet encryption key derivation |
| `GEMINI_API_KEY` | Yes* | — | Google Gemini API key (journal analysis + recommendations) |
| `MAIL_USERNAME` | No | — | SMTP username (empty = log-only dev mode) |
| `MAIL_PASSWORD` | No | — | SMTP password |
| `MAIL_SERVER` | No | smtp.gmail.com | SMTP server |
| `MAIL_PORT` | No | 587 | SMTP port |
| `MAIL_FROM` | No | noreply@mindbridge.com | Sender address |
| `FRONTEND_URL` | No | http://localhost:5173 | Frontend URL for email links |
| `CORS_ORIGINS` | No | localhost:3000,5173 | Comma-separated allowed origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 30 | JWT access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | 7 | JWT refresh token TTL |
| `OTP_EXPIRE_MINUTES` | No | 10 | Email OTP expiry |
| `DEBUG` | No | False | Debug mode |

*Required for AI features (journal analysis, recommendations). Platform functions without it but AI features return empty results.

---

## 16. Frontend Pages

### User Pages

| Page | Route | Purpose |
|---|---|---|
| Dashboard | `/dashboard` | Feature grid with cards for all platform features |
| Screening (AQ-10) | `/screening` | AQ-10 questionnaire flow |
| Screening History | `/screening/history` | Past AQ-10 results |
| Screening Result | `/screening/results/:id` | Detailed AQ-10 result with ML prediction |
| Additional Screening | `/additional-screening` | RAADS-R, CAST, SCQ, SRS-2 |
| Comorbidity Screening | `/comorbidity-screening` | PHQ-9, GAD-7, ASRS |
| Tasks | `/tasks` | Cognitive task selection grid |
| Task Player | `/tasks/:id/play` | Interactive task (12 game types) |
| Task History | `/tasks/history` | Past task results |
| Behavioral Log | `/behavioral-log` | ABC framework observation logging |
| Journal | `/journal` | Mood/behavior journal with AI analysis |
| Analysis | `/analysis` | 6-tab analysis dashboard (Overview, Journal, Screening, Tasks, Clinical Profile, Recommendations) |
| Referrals | `/referrals` | AI referral suggestions + PDF report download |
| Resources | `/resources` | Educational resource library |
| Connect Professional | `/connect-professional` | Find and connect with professionals |
| Profile | `/profile` | User profile management |

### Professional Pages

| Page | Route | Purpose |
|---|---|---|
| Professional Dashboard | `/professional` | Overview of connected patients |
| Patients | `/professional/patients` | Patient list |
| Patient Detail | `/professional/patients/:id` | Full patient data view + notes + clinical data + PDF download |
| Consultations | `/professional/consultations` | Manage consultation requests |

### Admin Pages

| Page | Route | Purpose |
|---|---|---|
| Admin Dashboard | `/admin` | Platform statistics |
| User Management | `/admin/users` | Manage users, roles, activation |
| Admin Resources | `/admin/resources` | Create/edit educational resources |

---

## 17. Implementation Status

- [x] User authentication (register, login, JWT, refresh, OTP email verification, password reset)
- [x] Role-based access control (user / professional / admin)
- [x] AQ-10 screening — 3 age groups, pre-screening demographics, ML-enhanced risk prediction
- [x] ML pipeline — Random Forest with age-stratified models, probability output, risk labels
- [x] Additional ASD screening — RAADS-R (80 items, 4 domains), CAST (37 items), SCQ (40 items, 3 domains), SRS-2 (65 items, 5 domains)
- [x] Comorbidity screening — PHQ-9 (depression), GAD-7 (anxiety), ASRS (ADHD) with clinical flags
- [x] Cognitive task battery — 12 interactive gamified tasks across 4 clinical pillars
- [x] Normative score mapping — Age-stratified T-scores, percentiles, clinical classification
- [x] Journal + mood tracking — Encrypted storage, AI analysis (6 clinical attributes via Gemini)
- [x] AI recommendation engine — Holistic cross-source synthesis via Gemini (screening + tasks + journals + observations + comorbidity)
- [x] Structured behavioral observation logging — ABC framework, 9 categories, pattern detection
- [x] Referral pathway system — Algorithmic tiered referral generation based on composite risk
- [x] Clinical PDF report — Comprehensive multi-section report via ReportLab
- [x] Professional consultation system — Patient sharing, notes, resource recommendations, full data access
- [x] Educational resource management — Admin-curated, risk-level targeted
- [x] Notification system — In-app notifications with links
- [x] Email service — OTP verification, professional application alerts (SMTP with dev fallback)
- [x] Encryption at rest — Fernet AES encryption for all sensitive narrative data
- [x] Rate limiting — slowapi-based request throttling
- [x] Admin dashboard — User management, platform statistics

---

## 18. Clinical Validation & Evidence Base

### Instrument Sources & Provenance

Every screening instrument in this platform is sourced from peer-reviewed, clinically validated research published by recognized institutions:

| Instrument | Source Organization | Original Publication | Official Link | Freely Available? |
|---|---|---|---|---|
| **AQ-10** | Autism Research Centre, University of Cambridge | Baron-Cohen et al. (2001). *Journal of Autism and Developmental Disorders*, 31(1), 5–17 | [docs.autismresearchcentre.com/tests/AQ10.pdf](https://docs.autismresearchcentre.com/tests/AQ10.pdf) | Yes (public domain) |
| **RAADS-R** | University of California, Los Angeles | Ritvo et al. (2011). *Journal of Autism and Developmental Disorders*, 41(8), 1076–1089 | [PubMed: 21086033](https://pubmed.ncbi.nlm.nih.gov/21086033/) | Yes (research use) |
| **CAST** | Autism Research Centre, University of Cambridge | Scott, Baron-Cohen et al. (2002). *Autism*, 6(1), 9–31 | [docs.autismresearchcentre.com/tests/CAST.pdf](https://docs.autismresearchcentre.com/tests/CAST.pdf) | Yes (research use) |
| **SCQ** | Based on ADI-R by Lord, Rutter, Le Couteur | Rutter, Bailey & Lord (2003). Western Psychological Services | [wpspublish.com/scq](https://www.wpspublish.com/scq-social-communication-questionnaire) | Published norms; items in public literature |
| **SRS-2** | Washington University School of Medicine | Constantino & Gruber (2012). Western Psychological Services | [wpspublish.com/srs-2](https://www.wpspublish.com/srs-2-social-responsiveness-scale-second-edition) | Published norms; item structure in literature |
| **PHQ-9** | Columbia University / Pfizer Inc. | Kroenke, Spitzer & Williams (2001). *Journal of General Internal Medicine*, 16(9), 606–613 | [phqscreeners.com](https://www.phqscreeners.com/select-screener) | Yes (public domain, no permission required) |
| **GAD-7** | Columbia University / Pfizer Inc. | Spitzer, Kroenke, Williams & Löwe (2006). *Archives of Internal Medicine*, 166(10), 1092–1097 | [phqscreeners.com](https://www.phqscreeners.com/select-screener) | Yes (public domain, no permission required) |
| **ASRS** | World Health Organization / Harvard Medical School | Kessler et al. (2005). *Psychological Medicine*, 35(2), 245–256 | [hcp.med.harvard.edu/ncs/asrs.php](https://www.hcp.med.harvard.edu/ncs/asrs.php) | Yes (WHO public domain) |

### Do the 70–80 Question Instruments Actually Contribute to AI Analysis?

**Yes — here is exactly how:**

Every response from RAADS-R (80 items), SRS-2 (65 items), CAST (37 items), and SCQ (40 items) is:

1. **Scored per the published clinical algorithm** — items are summed into domain-specific subscales and a total score
2. **Classified into severity levels** using the instrument's published clinical cutoffs (e.g., RAADS-R: <65 = non-clinical, 65–89 = mild, 90–129 = moderate, ≥130 = clinical)
3. **Fed directly into the AI recommendation engine** — Gemini receives the instrument name, total score, max possible score, severity classification, and per-domain scores
4. **Fed into the algorithmic referral system** — severity of "clinical" or "severe" triggers Tier 1 referrals; "moderate" triggers Tier 2

The individual item responses are stored for potential professional review, but the **AI uses the aggregated scores and severity**, not raw item-level data. This means:
- RAADS-R domain scores (social relatedness, circumscribed interests, language, sensory-motor) tell the AI which specific areas are affected
- SRS-2 subscale scores (awareness, cognition, communication, motivation, restricted interests) give fine-grained social profile information
- The AI cross-references these domain scores with task performance to recommend specific targeted interventions

### How AI Recommendation Works — Exact Rules

The recommendation system uses **Google Gemini 2.5 Flash** with structured output. Here is the exact decision chain:

```
TRIGGER: Any of these events → background task → refresh_recommendations()
  • Journal entry saved
  • AQ-10 screening completed
  • Additional screening (RAADS-R/CAST/SCQ/SRS-2) submitted
  • Comorbidity screening (PHQ-9/GAD-7/ASRS) submitted
  • Cognitive task completed

STEP 1: GATHER SNAPSHOT
  • Latest AQ-10: raw_score, risk_level, ml_probability, ml_risk_label
  • Last 10 journal analyses: averages of 6 attributes (mood, anxiety, social, sensory, regulation, repetitive)
  • Task results: one per category (most recent), raw metrics per task
  • Last 5 additional ASD screenings: instrument, total/max, severity, domain_scores
  • Last 5 comorbidity screenings: instrument, total/max, severity
  • Last 30 behavioral observations: category counts, severe_count

STEP 2: SEND TO GEMINI (structured output)
  System prompt enforces these rules:
  • Consider ALL data holistically — no single source dominates
  • If comorbidity shows elevated depression → suggest calming tasks, lower difficulty
  • If behavioral observations show meltdowns → recommend emotional regulation tasks
  • If sensory observations are frequent → recommend sensory processing tasks
  • Cross-reference AQ-10 with additional screenings for convergent evidence
  • Task count SCALES with severity: low risk = 1-2, moderate = 2-4, high = 4-6

STEP 3: OUTPUT (validated by Pydantic schema)
  • overall_summary: max 60 words
  • risk_assessment: "low|moderate|high" + reason (max 20 words)
  • key_concerns: top 3 (max 8 words each)
  • strengths: top 3 (max 8 words each)
  • recommended_tasks: [{category, reason, priority 1-5, level}]
  • recommended_resources: [{resource_id, reason}] (from seeded resource library)
  • lifestyle_tips: max 3 (max 12 words each)

STEP 4: PERSIST
  • Old pending batch recommendations → DISMISSED
  • New recommendations saved with direct links (e.g., /tasks/5/play?level=2)
  • Resource recommendations linked to actual resource URLs
  • Notification created for user
```

### Algorithmic Referral Rules (Non-AI, Deterministic)

The referral system is rule-based (no AI involved). Exact trigger rules:

| Condition | Referral Generated | Urgency |
|---|---|---|
| AQ-10 ML risk = high/very_high | Diagnostic Evaluation + Psychology | Urgent |
| AQ-10 ML risk = moderate | Developmental Pediatrics + Psychoeducation | Soon |
| AQ-10 ML risk = low | Psychoeducation | Routine |
| PHQ-9 severity = severe (20–27) | Psychiatry | Urgent |
| PHQ-9 severity = moderately_severe (15–19) | Psychiatry + Psychology | Soon |
| PHQ-9 severity = moderate (10–14) | Psychology | Routine |
| GAD-7 severity = severe (15–21) | Psychology | Soon |
| GAD-7 severity = moderate (10–14) | Psychology | Routine |
| ASRS severity = likely (≥18) | Psychiatry (ADHD eval) | Routine |
| ≥5 sensory behavioral observations | Occupational Therapy | Routine |
| ≥5 communication observations | Speech Therapy | Routine |
| ≥3 meltdown observations | Behavioral Therapy | Soon |
| Any additional ASD screening = clinical/severe | Triggers "high" composite risk | — |

Deduplication: If the same referral type is triggered by multiple rules, only the highest-urgency instance is kept.
Exclusion: Referral types that the user has already accepted/completed/in-progress are excluded from new suggestions.

### Why Some Instruments Have 65–80 Questions

Instruments like RAADS-R (80 items) and SRS-2 (65 items) are **not** arbitrary — they ARE the internationally validated standard. Their length is required because:

1. **Domain coverage**: Each item maps to specific diagnostic criteria. RAADS-R covers 4 distinct ASD domains; SRS-2 covers 5 subscales. Fewer items would miss entire clinical dimensions.
2. **Psychometric validity**: These instruments have published reliability (Cronbach's α > 0.85) and validity data that depend on the full item set. Shortening them would invalidate the scoring norms and severity cutoffs.
3. **Clinical consensus**: These are the same tools used in diagnostic centers worldwide. Using the standard version means results are directly interpretable by any clinician.

**User burden is mitigated by design:**
- Users choose which instruments to complete — they are NOT required to do all
- Short-form options are available: AQ-10 (10 items), GAD-7 (7 items), ASRS (6 items), PHQ-9 (9 items)
- Progress is saved; users can pause and resume
- Only age-appropriate instruments are displayed (server-side filtering based on date of birth)

### Age-Based Dynamic Instrument Selection

The platform dynamically filters available instruments based on the user's date of birth:

| Age Group | Available Instruments | Excluded |
|---|---|---|
| Child (≤11) | AQ-10 Child, CAST, SCQ, SRS-2 | RAADS-R (requires abstract self-reflection inappropriate for children) |
| Adolescent (12–17) | AQ-10 Adolescent, SCQ, SRS-2 | CAST (normed on 4–11 only) |
| Adult (18+) | AQ-10 Adult, RAADS-R, SCQ, SRS-2 | CAST (normed on 4–11 only) |

If the user's date of birth is not provided, all instruments are shown with age-range labels for self-selection.

### How Behavioral Observations Are Used in AI Analysis

Behavioral observations (ABC logs) flow through the system as follows:

```
User logs observation  ──→  Encrypted storage (antecedent/behavior/consequence)
        │
        ▼
Recommendation Engine (on next trigger: journal/screening/task completion)
        │
        ├── Counts observations by category (social, communication, sensory, etc.)
        ├── Counts severe-intensity episodes
        └── Feeds summary into Gemini AI prompt
        │
        ▼
AI Integration Rules:
  • Frequent meltdowns → recommend emotional regulation tasks + lower difficulty
  • Sensory observations → recommend sensory processing tasks
  • Communication concerns → recommend social cognition tasks
        │
        ▼
Referral Service (independent algorithm):
  • ≥5 sensory observations → suggest Occupational Therapy referral
  • ≥5 communication observations → suggest Speech Therapy referral
  • ≥3 meltdown observations → suggest Behavioral Therapy referral
```

Behavioral logs are **never** fed into the ML model — they only inform the AI recommendation layer and algorithmic referral system.

### Data Flow: How Each Feature Feeds the System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA COLLECTION LAYER                           │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│   AQ-10      │  Additional  │ Comorbidity  │  Cognitive   │  Journal /  │
│  Screening   │  ASD Screen  │  Screening   │   Tasks      │ Behavioral  │
│              │(RAADS/CAST/  │(PHQ9/GAD7/   │ (12 tasks)   │    Logs     │
│              │ SCQ/SRS-2)   │   ASRS)      │              │             │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴──────┬──────┘
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         PROCESSING LAYER                                 │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│  ML Model    │  Clinical    │  Clinical    │  Normative   │  Gemini AI  │
│ (RF Predict) │  Scoring     │  Scoring     │  T-Scores    │ (6 Attrs)   │
│  P(ASD)      │  + Severity  │  + Flags     │  + Classify  │  + Reason   │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴──────┬──────┘
       │              │              │              │              │
       └──────────────┴──────────────┴──────────────┴──────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         SYNTHESIS LAYER                                   │
├──────────────────────────────┬───────────────────────────────────────────┤
│  AI Recommendation Engine    │  Algorithmic Referral Service             │
│  (Gemini 2.5 Flash)         │  (Rule-based, 3-tier)                     │
│  • Overall risk summary      │  • Tier 1: ASD risk → diagnostic eval    │
│  • Personalized task plans   │  • Tier 2: Comorbidity → psychiatry     │
│  • Resource suggestions      │  • Tier 3: Behavior patterns → therapy   │
│  • Lifestyle tips            │  • Deduplication + urgency ranking       │
└──────────────────────────────┴───────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         OUTPUT LAYER                                      │
├──────────┬──────────────────────┬──────────────────┬─────────────────────┤
│ Analysis │  AI Recommendations  │  Referral        │  Clinical PDF       │
│ Dashboard│  + Resource Links    │  Suggestions     │  Report             │
└──────────┴──────────────────────┴──────────────────┴─────────────────────┘
```

### Clinical Validation of Cognitive Tasks

Each cognitive task maps to established neuropsychological constructs with published normative data:

| Task | Clinical Construct | Published Norms Reference |
|---|---|---|
| **N-Back** | Working memory (Baddeley model) | Luciana & Nelson (2002). *Developmental Neuropsychology*, 22(3), 595–624 |
| **Go/No-Go** | Inhibitory control (executive function) | Cragg & Nation (2008). *Developmental Neuropsychology*, 33(1), 93–112 |
| **DCCS** | Cognitive flexibility | Zelazo (2006). *Nature Protocols*, 1(1), 297–301 |
| **Tower Task** | Planning ability | Bull, Espy & Senn (2004). *Journal of Experimental Child Psychology*, 87(2), 135–155 |
| **FER** | Facial emotion recognition | Herba, Landau, Russell, Ecker & Phillips (2006). *Journal of Child Psychology and Psychiatry*, 47(11), 1098–1106 |
| **False Belief** | Theory of Mind | Wellman, Cross & Watson (2001). *Child Development*, 72(3), 655–684 |
| **Social Stories** | Social narrative comprehension | Gray (1998). *Focus on Autistic Behavior*, 13(1), 1–10 |
| **Conversation Cues** | Pragmatic language | Adams, Lockton, Freed et al. (2012). *International Journal of Language & Communication Disorders*, 47(3), 283–295 |
| **Joint Attention (RJA/IJA)** | Shared attention capacity | Mundy et al. (2007). *Child Development*, 78(3), 938–954 |
| **Visual-Temporal** | Temporal processing | Stevenson et al. (2014). *Journal of Neuroscience*, 34(3), 691–697 |
| **Auditory Processing** | Auditory discrimination | O'Connor (2012). *International Journal of Audiology*, 51(2), 120–133 |

### Behavioral Observation Framework Source

The ABC (Antecedent-Behavior-Consequence) framework is the clinical gold standard for behavioral data collection in Applied Behavior Analysis (ABA):

- **Source**: Cooper, Heron & Heward (2020). *Applied Behavior Analysis* (3rd ed.). Pearson.
- **Why ABC**: Captures the functional relationship between environment and behavior — essential for understanding triggers and maintaining consequences
- **9 categories**: Derived from DSM-5 ASD diagnostic criteria domains + commonly co-occurring areas (social, communication, repetitive behavior, sensory, emotional regulation, daily living, meltdown, sleep, feeding)
- **Clinical use**: Behavioral observations feed into both AI recommendations and algorithmic referral generation, providing longitudinal behavioral data that screening instruments alone cannot capture

### Why Comorbidity Screening Is Included

Research consistently shows that ASD rarely occurs in isolation:

| Co-occurring Condition | Prevalence in ASD | Our Instrument | Citation |
|---|---|---|---|
| Depression | 40–70% | PHQ-9 | Hudson et al. (2019). *Autism Research*, 12(5), 708–718 |
| Anxiety | 40–50% | GAD-7 | van Steensel, Bögels & Perrin (2011). *Clinical Psychology Review*, 31(3), 349–362 |
| ADHD | 30–80% | ASRS | Rommelse, Franke, Geurts et al. (2010). *Neuroscience & Biobehavioral Reviews*, 34(4), 674–689 |

Missing these conditions leads to incomplete clinical pictures. The platform flags comorbid conditions and routes appropriate referrals (e.g., PHQ-9 severe → psychiatric consultation; ASRS likely → ADHD evaluation).

### Referral Bug Fix (v1.1)

**Issue**: Referral suggestions continued appearing even after being marked as completed/accepted.

**Root cause**: The `generate_referrals()` function was purely algorithmic — it re-generated suggestions from current screening data without checking existing referral records.

**Fix**: Before returning suggestions, the system now queries existing referrals with statuses `recommended`, `accepted`, `in_progress`, or `completed`, and excludes those referral types from new suggestions. A referral type only reappears if the user explicitly declines it (indicating they want to be re-prompted if data changes).

### Resource Library — Seeded Content for Professional Recommendations

The platform includes a curated library of **40 resources** with real, verified external links. These are seeded via `python seed_resources.py` (idempotent). The AI recommendation engine draws from this library when suggesting resources to users.

**How resources are used:**
1. AI (Gemini) receives the full resource list with IDs, titles, types, and descriptions
2. Based on the user's clinical profile, AI selects 0–3 relevant resources
3. When recommended, the user sees the resource with a direct clickable link to the external content
4. Professionals can also manually recommend specific resources to their connected patients

**Resource Types (40 total):**

| Type | Count | Purpose |
|---|---|---|
| Article | 14 | Educational reading from NIMH, CDC, NHS, Mayo Clinic, Harvard Health, Autism Speaks |
| Video | 8 | YouTube videos — TED Talks, NHS explanations, National Autistic Society content |
| Guide | 7 | Structured intervention guides (ABA, visual supports, self-advocacy, sleep, communication) |
| Tool | 5 | Interactive apps and directories (Headspace, Proloquo2Go, Autism Speaks provider directory) |
| Exercise | 6 | Therapeutic activities (breathing, sensory diets, social skills practice, journaling) |

**Sample resources with links:**

| Resource | Source | Link |
|---|---|---|
| What Is ASD? | NIMH | https://www.nimh.nih.gov/health/topics/autism-spectrum-disorders-asd |
| ASD Signs & Symptoms | CDC | https://www.cdc.gov/autism/signs-symptoms/index.html |
| Understanding Autism | NHS UK | https://www.nhs.uk/conditions/autism/ |
| Autism in Adults | Harvard Health | https://www.health.harvard.edu/blog/what-to-know-about-autism-in-adults-202110272622 |
| Co-occurring Conditions | Autism Speaks | https://www.autismspeaks.org/co-occurring-conditions |
| ABA Therapy Explained | Autism Speaks | https://www.autismspeaks.org/applied-behavior-analysis |
| Sensory Processing | Autism Speaks | https://www.autismspeaks.org/sensory-issues |
| Temple Grandin TED Talk | TED/YouTube | https://www.youtube.com/watch?v=fn_9f5x0f1Q |
| Amazing Things Happen! | YouTube | https://www.youtube.com/watch?v=RbwRrVw-CRo |
| NAS Sensory Video | National Autistic Society | https://www.youtube.com/watch?v=plPNhooUUuc |
| Find Local Services | Autism Speaks | https://www.autismspeaks.org/resource-guide |
| Mindfulness App | Headspace | https://www.headspace.com/ |
| AAC Communication | Proloquo2Go | https://www.assistiveware.com/products/proloquo2go |
| Autism Navigator | Florida State University | https://autismnavigator.com/ |
| Zones of Regulation | Evidence-based framework | https://www.zonesofregulation.com/learn-more-about-the-zones.html |
| ASHA Autism Practice | ASHA | https://www.asha.org/practice-portal/clinical-topics/autism/ |
| PHQ-9 Explained | UW HIV/AIDS Education | https://www.hiv.uw.edu/page/mental-health-screening/phq-9 |
| GAD-7 Explained | UW HIV/AIDS Education | https://www.hiv.uw.edu/page/mental-health-screening/gad-7 |

**Seeding command:**
```bash
cd backend
python seed_resources.py
# Output: ✓ Resources seeded: 40 added, 0 already existed.
```

All resources are globally available (no patient_id restriction) and tagged by `target_risk_level` (low/moderate/high) so the AI can match resources to the user's assessed risk.

---

## License

This project is developed for research and educational purposes.

---

*Built with FastAPI, React, scikit-learn, Google Gemini, and ReportLab.*
