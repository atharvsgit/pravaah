first clone the repo

```bash
git clone https://github.com/seaquel-sih2025/Pravaah.git
cd Pravaah
```


make one terminal for backend
Navigate to the backend directory:
```bash
cd backend
```

Create and activate a Python virtual environment:
```bash
# Create the environment
python -m venv venv

# Activate it (on Windows)
venv\Scripts\activate

# On macOS/Linux, use: source venv/bin/activate
```

Install the required Python packages:
```bash
pip install -r requirements.txt
```

Create your environment file:
```bash
# backend/.env
DATABASE_URL="postgresql://user:password@localhost/your_db_name"
SECRET_KEY="your_super_secret_key_for_jwt"
```

Run the backend server:
```bash
uvicorn app.main:app --reload
```

The backend should now be running at [http://127.0.0.1:8000](http://127.0.0.1:8000).



make another terminal for the web dashboard

Navigate to the web app directory:
```bash
cd frontend/web_app
```

Install the Node.js packages:
```bash
npm install
```

Create your environment file:
```bash
# frontend/web_app/.env.local
VITE_API_BASE_URL="http://127.0.0.1:8000"
```

Run the development server:
```bash
npm run dev
```


The React dashboard should now be running at [http://localhost:5173](http://localhost:5173)


To ensure code consistency across the team, please use the configured code formatters.

- **Python**: Use `black` and `ruff`. We recommend installing the official VS Code extensions for these tools to format your code automatically on save.
- **React**: Use `Prettier` and `ESLint`. The VS Code "Prettier - Code formatter" and "ESLint" extensions are highly recommended.


## Optional: NLP worker

The NLP verification worker lives in `ai/`. It consumes from RabbitMQ
(`nlp_queue`) and is only needed if you want to exercise the full
verification fan-out locally.

```bash
cd ai
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python worker.py
```

`ai/.env` needs `RABBITMQ_URL`, `BACKEND_URL`, and (optionally)
`HF_FALLBACK_URL`. See `ai/README.md`.

backend has .env
