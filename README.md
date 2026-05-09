# Pravaah

Pravaah is a web-based ocean hazard reporting platform. It provides a React dashboard for citizens to submit geotagged coastal and marine hazard reports, and a FastAPI backend for authentication, report intake, media handling, geospatial storage, and report retrieval.

The system is designed around verified incident collection: users authenticate, submit reports with location and optional media evidence, and view recent reports and map hotspots backed by PostgreSQL/PostGIS data.

## Architecture

```mermaid
flowchart LR
    user["User"] --> web["React web app<br/>Vite"]
    web --> api["FastAPI backend"]
    web --> maps["OpenStreetMap tiles"]

    api --> auth["JWT authentication"]
    api --> db["PostgreSQL + PostGIS"]
    api --> storage["AWS S3 media storage"]
    api --> queue["RabbitMQ report queue"]

    queue --> worker["Backend report worker"]
    worker --> db
```

## Repository Structure

```text
.
+-- backend/              FastAPI application, database models, services, and migrations
+-- frontend/web_app/     React application built with Vite
+-- render.yaml           Render deployment configuration for the backend and database
+-- README.md             Project overview and setup guide
```

## Implemented Components

- React web application with authentication flow, role-aware routing, citizen dashboard, report form, map view, and recent report display.
- FastAPI backend with JWT-based registration and login.
- Hazard report submission with GPS coordinates, description, hazard type, and optional media files.
- Report hotspot and recent-report APIs for dashboard and map views.
- PostgreSQL/PostGIS schema managed through SQLAlchemy and Alembic migrations.
- RabbitMQ-backed report queue used by the backend worker to persist accepted reports.
- AWS S3 integration for report media storage when media uploads are enabled.
- Health and RabbitMQ status endpoints for runtime monitoring.

## Backend Setup

Requirements:

- Python 3.11
- PostgreSQL with PostGIS enabled
- RabbitMQ for queued report processing
- AWS S3 credentials if report media uploads are required

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Configure `backend/.env` with the required values:

```env
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@localhost/pravaah_db
SECRET_KEY=change_this_to_a_secure_secret
FRONTEND_URL=http://localhost:5173
RABBITMQ_URL=amqp://guest:guest@localhost/
```

For media uploads, also configure:

```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
AWS_S3_REGION=
```

Apply migrations and start the API:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

## Frontend Setup

Requirements:

- Node.js
- npm

```bash
cd frontend/web_app
npm install
copy .env.example .env.local
npm run dev
```

Set the backend URL in `frontend/web_app/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

The web application runs at `http://localhost:5173`.

## API Surface

The mounted backend API includes:

- `POST /api/auth/register` for account registration.
- `POST /api/auth/login` for token-based login.
- `POST /api/reports/submit` for authenticated hazard report submission.
- `GET /api/reports/hotspots` for geospatial report hotspots.
- `GET /api/reports/recent` for recent report summaries.
- `GET /health` for API and database health.
- `GET /rabbitmq/status` for queue connection and queue status.

## Database Migrations

Alembic migrations live in `backend/alembic`.

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

The initial schema creates the main application tables and enables PostGIS support for report coordinates.

## Development Commands

Backend:

```bash
cd backend
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend/web_app
npm run dev
npm run build
npm run lint
```

## Deployment

`render.yaml` defines a Render backend service and PostgreSQL database. Production deployments should set all required environment variables in the hosting platform, including database, JWT, CORS, RabbitMQ, and S3 configuration.
