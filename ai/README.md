# AI Worker

This directory contains the standalone NLP worker for Pravaah. The worker consumes report messages from RabbitMQ, classifies the report description, and posts the resulting NLP verification back to the FastAPI backend.

## Runtime

```bash
cd ai
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python worker.py
```

## Environment

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
BACKEND_URL=http://localhost:8000
HF_FALLBACK_URL=
GEMINI_API_KEY=
HUGGING_FACE_TOKEN=
```

`HF_FALLBACK_URL` is optional. When it is empty, the worker skips the Hugging Face request and returns `other` as the fallback hazard type.

## Processing Flow

```mermaid
flowchart LR
    queue["RabbitMQ nlp_queue"] --> worker["worker.py"]
    worker --> classifier["Hugging Face fallback classifier"]
    classifier --> worker
    worker --> backend["POST /api/verifications/nlp"]
```

The backend route for NLP verification exists in `backend/app/api/endpoints/verifications.py`. It must be included in the backend API router before this worker callback is reachable through the running API.

## File-Level Explanation

### `worker.py`

This is the worker process and contains the main queue-consumption logic.

#### Imports and configuration

- Loads standard modules for environment values, JSON parsing, HTTP requests, logging, and RabbitMQ access.
- Imports `settings` from `config.py`.
- Reads `HF_FALLBACK_URL` from the environment. This controls whether the worker calls an external classifier or returns the local fallback classification.

#### `classify_description_with_hf_api(description)`

This function classifies a report description.

- If `HF_FALLBACK_URL` is not configured, it returns `{"hazard_type": "other"}` immediately.
- If configured, it sends `{"query": description, "limit": 5}` to the Hugging Face endpoint.
- It reads the first item from `hazardous_tweets`, extracts the first detected hazard from `ner.hazards`, and normalizes it to lowercase underscore format.
- If the API fails, returns an empty result, or returns an unexpected shape, it falls back to `other`.

#### `post_nlp_verification(report_id, hazard_type, source)`

This function sends the worker result back to the backend.

- Builds the URL from `BACKEND_URL` and `/api/verifications/nlp`.
- Posts a JSON payload containing `report_id` and `result_data`.
- Logs request failures instead of raising them so a backend issue does not permanently block queue consumption.

#### `process_message(channel, method, properties, body)`

This is the RabbitMQ message callback.

- Parses the message body as JSON.
- Extracts `report_id` and `user_description`.
- Acknowledges and skips malformed messages that lack required fields.
- Calls the classifier, extracts the final hazard type, posts the NLP verification to the backend, and acknowledges the message.
- Rejects unexpected failures with `requeue=False` to prevent repeated processing loops.

#### `start_worker()`

This function starts the blocking RabbitMQ consumer.

- Connects with `pika.BlockingConnection`.
- Declares `nlp_queue` as durable.
- Sets `prefetch_count=1` so the worker handles one message at a time.
- Registers `process_message` as the queue callback.
- Closes the RabbitMQ connection during shutdown when possible.

### `config.py`

This file defines worker settings with `pydantic-settings`.

- `Settings` reads `.env` values for Gemini, Hugging Face, RabbitMQ, backend URL, and PostgreSQL-related values.
- The module creates a global `settings` instance used by `worker.py`.
- It also exports selected values such as `RABBITMQ_URL`, `BACKEND_URL`, and `POSTGRES_CONFIG`.

### `.env.example`

Lists the environment variables expected by the worker process.

### `requirements.txt`

Lists Python dependencies for RabbitMQ consumption, HTTP calls, settings loading, and optional AI integrations.
