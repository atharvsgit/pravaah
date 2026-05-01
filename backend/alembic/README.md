# Alembic migrations

This directory replaces the startup-time `Base.metadata.create_all` +
`DROP TABLE CASCADE` recovery path that used to live in `app/main.py`.

## Workflow

```bash
# create a new migration after changing models
alembic revision --autogenerate -m "describe the change"

# apply pending migrations
alembic upgrade head

# roll back one
alembic downgrade -1
```

## On an existing prod DB

The current schema (the one that was already running before Alembic was
introduced) corresponds to revision **`0001_initial_schema`**. If your
database already has those tables, mark the revision as applied without
running it:

```bash
alembic stamp 0001_initial_schema
```

Then `alembic upgrade head` will only run migrations newer than that point.

## On a fresh DB

```bash
alembic upgrade head
```

This creates everything from scratch.

## Notes

- `env.py` reads `DATABASE_URL` via `app.core.config.settings` and converts
  the asyncpg URL to a sync URL for psycopg2 (Alembic uses sync drivers).
- `compare_type=True` is enabled so autogenerate notices column-type changes,
  not just adds/drops.
- PostGIS is required for the `Geography` column on `reports.user_location`.
  The initial migration enables the extension before creating tables.
