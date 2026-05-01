"""
Standalone background workers that consume from RabbitMQ queues.

The coordinator (which fans messages out from `report_processing_queue`) runs
inside the FastAPI app's startup hook in `app.main`. Other workers run as
their own processes:

  python -m app.workers.weather
  python -m app.workers.peer_notification

`manage.py` is a small launcher that exec's whichever one you ask for.
"""
