# AI services (NLP worker)

This folder contains the NLP background worker that consumes hazard reports
from RabbitMQ for analysis.

> Note: earlier revisions of this folder also contained `twitter-scraper/` and
> `youtube-scraper/` subdirs for social-media corroboration. They are not
> present in this checkout; if you need them, restore from upstream
> (`seaquel-sih2025/Pravaah`) git history.

## Component

`worker.py` consumes the `nlp_queue` from RabbitMQ. It pulls
`user_description` and `report_id` from each message and classifies the
description into a `hazard_type`.

Current state of the worker:
- Classification goes through an optional Hugging Face Space, configured via
  `HF_FALLBACK_URL`. If the env var is unset, the worker short-circuits to
  `{"hazard_type": "other"}` without making a network call.
- The DB-update step is **not implemented** — there is a TODO to call back
  into the backend (`POST /api/verifications/nlp`) with the result. Right now
  the worker logs the classification and ACKs the message. Implement that
  callback before relying on the worker for confidence scoring.

## Environment

Create `ai/.env`:

| Var | Purpose |
|-----|---------|
| `RABBITMQ_URL` | AMQP URL, e.g. `amqp://guest:guest@localhost:5672/` |
| `BACKEND_URL` | Base URL of the FastAPI backend (used by the not-yet-implemented callback) |
| `HF_FALLBACK_URL` | Optional. Hugging Face Space `/analyze` endpoint. Leave empty to skip the HF call. |
| `GEMINI_API_KEY` | Optional. Reserved for when the worker is upgraded to call Gemini directly instead of the HF Space. |

Settings are loaded by `config.py` (pydantic-settings).

## Running

```bash
cd ai
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python worker.py
```

The backend's `/rabbitmq/status` endpoint should show `consumer_count > 0`
on `nlp_queue` once the worker is running.

## Troubleshooting

- **Worker not consuming?** Verify `RABBITMQ_URL` is reachable and that the
  `nlp_queue` queue has been declared (the FastAPI backend declares it on
  startup; if you're running the worker without the backend, declare it
  manually or run the backend first).
- **All classifications return `"other"`.** Either `HF_FALLBACK_URL` is unset
  (intended fallback) or the HF Space is sleeping. Free-tier HF Spaces sleep
  on idle and the first request after a sleep can time out.
- **No effect on report confidence.** Expected — see "current state" above;
  the callback to the backend is still a TODO.
