# Pravaah Backend

This directory contains the FastAPI backend for Pravaah. It provides authentication, report submission, report retrieval, geospatial persistence, queue integration, media storage integration, health checks, and supporting services for verification and offline synchronization.

## Runtime

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

## Environment

The backend reads settings from `backend/.env` through `app/core/config.py`.

Important variables:

```env
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@localhost/pravaah_db
SECRET_KEY=change_this_to_a_secure_secret
FRONTEND_URL=http://localhost:5173
RABBITMQ_URL=amqp://guest:guest@localhost/
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
AWS_S3_REGION=
WEATHERAPI_KEY=
GEMINI_API_KEY=
```

## Active API Mounts

`app/api.py` currently mounts:

- `/api/auth`
- `/api/reports`

Other endpoint modules exist under `app/api/endpoints/`; they contain supporting or additional route logic and need to be included in `app/api.py` before they become part of the active FastAPI router.

## API Documentation

Base local URL:

```text
http://localhost:8000
```

API prefix:

```text
/api
```

FastAPI also exposes generated documentation when the server is running:

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### Authentication

#### Register User

```http
POST /api/auth/register
Content-Type: application/json
```

Request body:

```json
{
  "email": "citizen@example.com",
  "full_name": "Citizen User",
  "phone": "+91 98765 43210",
  "password": "secure-password",
  "role": "citizen"
}
```

Valid `role` values:

```text
citizen, official, analyst
```

Success response: `201 Created`

```json
{
  "email": "citizen@example.com",
  "full_name": "Citizen User",
  "phone": "+91 98765 43210",
  "id": "9d8d6e48-b80c-4d48-9824-15499851b550",
  "role": "citizen",
  "is_active": true,
  "bio": null,
  "location": null,
  "profile_picture": null,
  "created_at": "2026-05-09T10:00:00Z"
}
```

Common errors:

- `400 Bad Request`: email already exists.
- `422 Unprocessable Entity`: invalid email, role, or password constraints.
- `500 Internal Server Error`: registration failed unexpectedly.
- `504 Gateway Timeout`: password hashing or database work timed out.

#### Login

```http
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded
```

Request body:

```text
username=citizen@example.com&password=secure-password
```

Success response: `200 OK`

```json
{
  "access_token": "jwt-token",
  "token_type": "bearer"
}
```

Common errors:

- `401 Unauthorized`: incorrect email or password.
- `400 Bad Request`: inactive user.
- `500 Internal Server Error`: login failed unexpectedly.
- `504 Gateway Timeout`: password verification or database work timed out.

### Reports

All report submission requests require a bearer token:

```http
Authorization: Bearer <access_token>
```

#### Submit Hazard Report

```http
POST /api/reports/submit
Content-Type: multipart/form-data
Authorization: Bearer <access_token>
latitude: 12.9716
longitude: 77.5946
```

Form fields:

| Field | Type | Required | Description |
|---|---:|---:|---|
| `user_hazard_type` | string enum | yes | User-selected hazard category. |
| `user_description` | string | no | User-written report description. |
| `media_files` | file list | no | Image, video, or audio evidence files. |

Valid `user_hazard_type` values:

```text
Tsunami
High Waves / Swell
Coastal Flooding
Storm Surge
Rip Current
Coastal Erosion
Water Discoloration / Algal Bloom
Marine Debris / Pollution
Other
```

Success response: `202 Accepted`

```json
{
  "message": "Hazard report has been accepted for processing.",
  "report_id": "c35e8f5a-5c9a-4a59-9c9c-e8b236266bde"
}
```

When the backend falls back to offline storage, the response can include additional fields:

```json
{
  "message": "Report saved offline. Will sync when connection is restored.",
  "report_id": "c35e8f5a-5c9a-4a59-9c9c-e8b236266bde",
  "offline_id": 1,
  "is_offline": true
}
```

Processing behavior:

- Media files are uploaded to S3 when online storage is available.
- The accepted report payload is published to `report_processing_queue`.
- The backend report worker persists the report and fans out verification jobs to `nlp_queue`, `weather_queue`, and `peer_notification_queue`.

Common errors:

- `401 Unauthorized`: missing, invalid, or expired token.
- `422 Unprocessable Entity`: missing latitude, longitude, or invalid form values.
- `500 Internal Server Error`: offline fallback failed or media storage failed.

#### List Hotspots

```http
GET /api/reports/hotspots
```

Success response: `200 OK`

```json
{
  "items": [
    {
      "report_id": "c35e8f5a-5c9a-4a59-9c9c-e8b236266bde",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "confidence": 0.5,
      "status": "under_verification",
      "hazard_type": "Coastal Flooding",
      "created_at": "2026-05-09T10:00:00Z"
    }
  ],
  "count": 1
}
```

Notes:

- Reports without valid geospatial coordinates are skipped.
- Reports below the confidence threshold are not returned.
- Coordinates are extracted from the PostGIS `reports.user_location` geography column.

#### List Recent Reports

```http
GET /api/reports/recent?limit=9
```

Query parameters:

| Name | Type | Default | Bounds | Description |
|---|---:|---:|---:|---|
| `limit` | integer | `9` | `1..24` | Maximum number of recent reports to return. |

Success response: `200 OK`

```json
{
  "items": [
    {
      "id": "c35e8f5a-5c9a-4a59-9c9c-e8b236266bde",
      "hazard_type": "Coastal Flooding",
      "status": "under_verification",
      "created_at": "2026-05-09T10:00:00Z",
      "user_description": "Water level is rising near the coast.",
      "user_city": null,
      "user_name": "Citizen User",
      "thumbnail_url": "https://bucket.s3.region.amazonaws.com/images/example.jpg"
    }
  ],
  "count": 1
}
```

### Monitoring

#### Root Metadata

```http
GET /
```

Returns API status, version, environment, and configured CORS origins.

#### Health Check

```http
GET /health
```

Returns API health, database connectivity, users-table diagnostics, RabbitMQ state, and an overall status message.

#### RabbitMQ Status

```http
GET /rabbitmq/status
```

Returns connection status and queue metrics for:

- `report_processing_queue`
- `nlp_queue`
- `weather_queue`
- `peer_notification_queue`

## API Schemas

### Request Schemas

#### `UserCreate`

```json
{
  "email": "string, valid email",
  "full_name": "string",
  "phone": "string | null",
  "password": "string, 8 to 128 characters",
  "role": "citizen | official | analyst"
}
```

#### `OAuth2PasswordRequestForm`

```json
{
  "username": "string, email",
  "password": "string"
}
```

The login route receives this as `application/x-www-form-urlencoded`, not JSON.

#### `ReportSubmit`

```json
{
  "headers": {
    "Authorization": "Bearer <access_token>",
    "latitude": "float",
    "longitude": "float"
  },
  "form": {
    "user_hazard_type": "HazardType",
    "user_description": "string | null",
    "media_files": "File[]"
  }
}
```

### Response Schemas

#### `UserRead`

```json
{
  "id": "uuid",
  "email": "string",
  "full_name": "string",
  "phone": "string | null",
  "role": "citizen | official | analyst",
  "is_active": "boolean",
  "bio": "string | null",
  "location": "string | null",
  "profile_picture": "string | null",
  "created_at": "datetime"
}
```

#### `Token`

```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

#### `ReportSubmitResponse`

```json
{
  "message": "string",
  "report_id": "uuid"
}
```

#### `HotspotListResponse`

```json
{
  "items": [
    {
      "report_id": "uuid",
      "latitude": "float",
      "longitude": "float",
      "confidence": "float",
      "status": "under_verification | verified | rejected",
      "hazard_type": "HazardType",
      "created_at": "datetime | null"
    }
  ],
  "count": "integer"
}
```

#### `RecentReportsResponse`

```json
{
  "items": [
    {
      "id": "uuid",
      "hazard_type": "HazardType",
      "status": "under_verification | verified | rejected",
      "created_at": "datetime | null",
      "user_description": "string | null",
      "user_city": "string | null",
      "user_name": "string",
      "thumbnail_url": "string | null"
    }
  ],
  "count": "integer"
}
```

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ REPORTS : submits
    USERS ||--o{ SAFETY_CIRCLES : creates
    REPORTS ||--o{ MEDIA : has
    REPORTS ||--o{ VERIFICATIONS : receives

    USERS {
        uuid id PK
        string email UK
        string full_name
        string phone
        string bio
        string location
        string profile_picture
        string hashed_password
        user_role role
        boolean is_active
        timestamptz created_at
        float latitude
        float longitude
        timestamptz location_updated_at
        int reputation_score
        boolean is_verified
    }

    REPORTS {
        uuid id PK
        uuid user_id FK
        hazard_type user_hazard_type
        geography user_location
        string user_description
        string user_city
        report_status status
        float final_confidence_score
        timestamptz created_at
    }

    MEDIA {
        uuid id PK
        uuid report_id FK
        string file_url
        media_type media_type
        jsonb file_metadata
        timestamptz created_at
    }

    VERIFICATIONS {
        uuid id PK
        uuid report_id FK
        verification_source source
        jsonb result_data
        timestamptz created_at
    }

    SAFETY_CIRCLES {
        uuid id PK
        uuid user_id FK
        uuid notification_id
        float latitude
        float longitude
        boolean is_safe
        string color
        timestamptz created_at
        timestamptz expires_at
    }
```

### Relationships and Cardinality

| Relationship | Cardinality | Database Rule |
|---|---:|---|
| `users` to `reports` | One user can submit many reports. Each report belongs to one user. | `reports.user_id -> users.id` |
| `reports` to `media` | One report can have many media files. Each media row belongs to one report. | `media.report_id -> reports.id`, cascade delete through ORM relationship |
| `reports` to `verifications` | One report can receive many verification records. Each verification belongs to one report. | `verifications.report_id -> reports.id`, cascade delete through ORM relationship |
| `users` to `safety_circles` | One user can create many safety circles. Each safety circle belongs to one user. | `safety_circles.user_id -> users.id` |
| `safety_circles.notification_id` | References a notification concept by UUID but is not declared as a database foreign key in the current model. | Plain UUID column |

### Tables

#### `users`

Stores registered accounts and role information.

Primary key:

- `id`

Important constraints:

- `email` is unique and indexed.
- `role` uses the `user_role` enum.
- `hashed_password` is required.

#### `reports`

Stores user-submitted hazard reports.

Primary key:

- `id`

Foreign keys:

- `user_id` references `users.id`.

Important columns:

- `user_hazard_type`: enum-backed hazard category.
- `user_location`: PostGIS `Geography(POINT, 4326)`.
- `status`: enum-backed verification status.
- `final_confidence_score`: calculated or initial confidence score.

#### `media`

Stores uploaded report evidence.

Primary key:

- `id`

Foreign keys:

- `report_id` references `reports.id`.

Important columns:

- `file_url`: uploaded file URL, usually S3.
- `media_type`: image, video, or audio.
- `file_metadata`: optional JSON metadata.

#### `verifications`

Stores verification output from NLP, weather, and peer sources.

Primary key:

- `id`

Foreign keys:

- `report_id` references `reports.id`.

Important columns:

- `source`: `nlp_pipeline`, `weather_api`, or `peer_report`.
- `result_data`: flexible JSON payload from the verification source.

#### `safety_circles`

Stores temporary safe/unsafe user status markers.

Primary key:

- `id`

Foreign keys:

- `user_id` references `users.id`.

Important columns:

- `notification_id`: UUID associated with the notification that prompted the response.
- `is_safe`: safe/unsafe state.
- `color`: map display color.
- `expires_at`: expiration timestamp.

### Enums

#### `user_role`

```text
citizen
official
analyst
```

#### `hazard_type`

```text
Tsunami
High Waves / Swell
Coastal Flooding
Storm Surge
Rip Current
Coastal Erosion
Water Discoloration / Algal Bloom
Marine Debris / Pollution
Other
```

#### `report_status`

```text
under_verification
verified
rejected
```

#### `media_type`

```text
image
video
audio
```

#### `verification_source`

```text
nlp_pipeline
weather_api
peer_report
```

## Backend Flow

```mermaid
flowchart LR
    client["Frontend client"] --> api["FastAPI app"]
    api --> auth["Auth endpoints"]
    api --> reports["Report endpoints"]
    reports --> s3["S3 service"]
    reports --> queue["RabbitMQ"]
    queue --> processor["process_report_message"]
    processor --> db["PostgreSQL + PostGIS"]
    processor --> nlp["nlp_queue"]
    processor --> weather["weather_queue"]
    processor --> peer["peer_notification_queue"]
```

## Crucial Files

### `app/main.py`

This is the FastAPI application entry point.

#### App creation and CORS

- Creates the `FastAPI` app with title, description, and version.
- Builds allowed CORS origins from `ENVIRONMENT`, `FRONTEND_URL`, `VERCEL_URL`, and `ADDITIONAL_CORS_ORIGINS`.
- Adds `CORSMiddleware`.
- Adds development-only request-origin logging when `ENVIRONMENT=development`.

#### `process_report_message(message)`

This is the backend's report-processing queue callback.

- Reads a report message from `report_processing_queue`.
- Extracts report ID, user ID, report form values, location, and uploaded media metadata.
- Creates the `Report` row with a PostGIS point and an initial confidence score.
- Creates associated `Media` rows for uploaded files.
- Publishes follow-up jobs to `nlp_queue`, `weather_queue`, and `peer_notification_queue`.

#### `start_background_worker()`

Starts RabbitMQ consumption for `report_processing_queue` and attaches `process_report_message` as the callback.

#### Startup event

The startup handler prepares runtime services.

- Verifies database connectivity.
- Enables PostGIS when available.
- Creates required enum types if they are missing.
- Creates SQLAlchemy tables.
- Initializes the local SQLite database used by offline sync services.
- Connects to RabbitMQ and starts the report-processing worker when RabbitMQ is available.
- Starts connectivity monitoring and the sync service.

#### Shutdown event

Stops the sync service, connectivity monitor, and RabbitMQ connection.

#### Root and monitoring endpoints

- `/` returns basic API metadata.
- `/health` checks API, database, table, and RabbitMQ status.
- `/rabbitmq/status` reports queue connectivity and message/consumer counts.

### `app/api.py`

Defines the top-level `APIRouter` and includes the currently active endpoint modules:

- `auth.router` mounted at `/auth`.
- `reports.router` mounted at `/reports`.

### `app/api/dependencies.py`

Contains dependency helpers for authenticated routes.

- `get_current_user` decodes the JWT, reads the user ID from `sub`, fetches the user, and raises `401` on failure.
- `get_current_citizen`, `get_current_official`, `get_current_analyst`, and `get_current_official_or_analyst` enforce role-specific access.

### `app/api/endpoints/auth.py`

Authentication endpoint module.

- `async_hash_password` and `async_verify_password` run bcrypt work in an executor with timeouts.
- `POST /register` validates uniqueness, hashes the password, creates the user, and returns a `UserRead` response.
- `POST /login` accepts OAuth2 form credentials, verifies the user, checks password and activity status, and returns a JWT access token.

### `app/api/endpoints/reports.py`

Report endpoint module.

#### `submit_hazard_report`

- Requires an authenticated user.
- Reads latitude and longitude from headers.
- Reads hazard type, description, and optional media from multipart form data.
- Checks connectivity through `connectivity_service`.
- Uploads media files to S3 when online.
- Publishes a report payload to `report_processing_queue`.
- Falls back to local offline storage if online submission fails or connectivity is unavailable.

#### `_submit_report_offline`

- Creates an `OfflineReportCreate` model.
- Copies uploaded media to a temporary offline path.
- Stores report and media metadata through `offline_storage_service`.
- Returns a response indicating that the report was saved offline.

#### `list_hotspots`

- Reads reports from PostgreSQL.
- Converts PostGIS points to latitude and longitude using `ST_AsText`.
- Filters out low-confidence reports.
- Returns map-ready hotspot objects with confidence, status, hazard type, and timestamp.

#### `list_recent_reports`

- Joins reports with users.
- Fetches the first media file as a thumbnail when present.
- Returns recent report summaries for dashboard cards.

### `app/db/models.py`

Defines SQLAlchemy ORM models and enum types.

- `HazardType`, `UserRole`, `ReportStatus`, `ReportUrgency`, `ReportSentiment`, `MediaType`, and `VerificationSource` define controlled values.
- `User` stores account, role, location, reputation, and verification profile fields.
- `Report` stores user-submitted hazard type, PostGIS location, description, status, confidence, and relationships.
- `Media` stores file URLs and media type for report evidence.
- `Verification` stores verification results from NLP, weather, and peer sources.
- `SafetyCircle` stores short-lived safe/unsafe user status markers.

### `app/core/config.py`

Defines the `Settings` class loaded from `.env`.

- Includes database, RabbitMQ, JWT, AWS S3, weather, AI, frontend, backend, and Firebase-related settings.
- Provides `sync_database_url`, which converts async PostgreSQL URLs into sync URLs for Alembic and sync-only operations.

### `app/core/security.py`

Contains password and JWT helpers.

- Normalizes passwords before bcrypt hashing so values longer than bcrypt's 72-byte limit are pre-hashed with SHA-256.
- Hashes passwords with bcrypt.
- Verifies bcrypt hashes and supports a legacy `sha256$...` fallback format.
- Creates signed JWT access tokens with an expiration claim.

### `app/db/session.py`

Creates the async SQLAlchemy engine and session dependency.

- Normalizes PostgreSQL URLs to `postgresql+asyncpg`.
- Enables connection pre-ping and pool recycling.
- Exposes `AsyncSessionLocal` and `get_db`.

### `app/db/sqlite_setup.py`

Initializes `offline_data.db` for offline sync state.

- Creates `offline_reports`, `offline_media`, and `sync_status` tables.
- Adds indexes for sync status, user ID, and report-media lookup.
- Exposes `get_sqlite_connection`.

## Services

### `app/services/rabbitmq_service.py`

Encapsulates RabbitMQ operations with `aio_pika`.

- Connects with a robust async connection.
- Publishes durable JSON messages.
- Registers queue consumers.
- Reports queue status for monitoring.

### `app/services/s3_service.py`

Uploads media files to AWS S3.

- Builds an S3 client from configured credentials.
- Generates unique object keys per report and media type.
- Uploads files with their content type and returns a public S3 URL.

### `app/services/connectivity_service.py`

Tracks online/offline status for backend-side offline workflows.

- Checks internet reachability against known external URLs.
- Runs a background monitor at a fixed interval.
- Supports callbacks when connectivity changes.

### `app/services/offline_storage_service.py`

Stores reports and media locally when online processing is unavailable.

- Inserts offline report metadata into SQLite.
- Copies media files into an `offline_media` directory.
- Reads pending reports and media for later synchronization.
- Updates sync status and error messages.
- Cleans up synced reports after a retention period.

### `app/services/sync_service.py`

Synchronizes locally stored offline reports into PostgreSQL.

- Starts a background sync monitor.
- Triggers sync when connectivity returns.
- Reads pending reports from SQLite.
- Creates PostgreSQL `Report` and `Media` rows.
- Attempts to upload offline media to S3.
- Marks reports as synced or failed in SQLite.

### `app/services/confidence_calculator.py`

Computes a weighted confidence score from verification records.

- Weather and NLP sources each carry 0.4 weight.
- Peer reports carry 0.2 weight.
- Converts source-specific verification data into scores.
- Returns final score, confidence level, source details, and calculation method.

### `app/services/verification_tracker.py`

Coordinates automatic confidence calculation.

- Checks whether required verification sources are present for a report.
- Skips automatic calculation when verification data contains errors.
- Updates report confidence and report status based on the computed level.

### `app/services/img_to_hazard.py`

Analyzes an image with Gemini through LangChain.

- Loads `GEMINI_API_KEY`.
- Opens the image with Pillow.
- Encodes the image as a base64 data URL.
- Sends a structured hazard-detection prompt and image to the model.
- Returns a formatted hazard, description, and severity response.

## Endpoint Modules

- `app/api/endpoints/analyst.py`: Analyst-facing route handlers.
- `app/api/endpoints/feed.py`: Feed aggregation route handlers.
- `app/api/endpoints/image_upload.py`: Image upload and image-analysis route handlers.
- `app/api/endpoints/notifications.py`: Notification route handlers.
- `app/api/endpoints/official.py`: Official dashboard and management route handlers.
- `app/api/endpoints/safety_circles.py`: Safety-circle creation and retrieval route handlers.
- `app/api/endpoints/sync.py`: Offline-sync status, trigger, retry, cleanup, and health route handlers.
- `app/api/endpoints/users.py`: User profile and account-related route handlers.
- `app/api/endpoints/verifications.py`: Weather/NLP verification submission and confidence lookup route handlers.

## Models and Schemas

- `app/models/pydantic_models.py`: Request and response schemas for users, tokens, reports, verifications, peer notifications, and safety circles.
- `app/models/offline_models.py`: Pydantic models used by offline storage and sync flows.
- `app/db/base.py`: SQLAlchemy declarative base.

## Workers

- `app/workers/base_worker.py`: Shared worker base structure.
- `app/workers/weather.py`: Weather verification worker logic.
- `app/workers/peer_notification.py`: Peer notification worker logic.
- `app/workers/manage.py`: Worker management entry point.

## Tests and Tooling

- `tests/test_security.py`: Security helper tests.
- `tests/test_confidence_calculator.py`: Confidence scoring tests.
- `tests/conftest.py`: Shared pytest setup.
- `pyproject.toml`: Black, Ruff, mypy, and pytest configuration.
- `alembic.ini` and `alembic/`: Alembic migration configuration and revisions.
