"""
Launcher for the standalone workers. Use this from the `backend/` directory:

    python -m app.workers.manage weather
    python -m app.workers.manage peer

The "coordinator" worker doesn't appear here — its logic is wired into the
FastAPI app's startup in `app.main`, so a separate process running the same
coordinator code would just race with the app.
"""
import subprocess
import sys

WORKERS = {
    "weather": {
        "module": "app.workers.weather",
        "description": "Weather verification — validates reports against WeatherAPI.com",
    },
    "peer": {
        "module": "app.workers.peer_notification",
        "description": "Peer notification — alerts nearby users when reports come in",
    },
}


def _print_help() -> None:
    print("Usage: python -m app.workers.manage <weather|peer>\n")
    print("Available workers:")
    for name, cfg in WORKERS.items():
        print(f"  {name:8} {cfg['description']}")
    print(
        "\nTo run more than one, open multiple terminals or use a process "
        "manager (PM2 / supervisord / systemd)."
    )


def main() -> None:
    if len(sys.argv) < 2:
        _print_help()
        return

    name = sys.argv[1].lower()
    cfg = WORKERS.get(name)
    if cfg is None:
        print(f"Unknown worker: {name}\n")
        _print_help()
        sys.exit(1)

    print(f"Starting {name} worker — {cfg['description']}")
    try:
        subprocess.run([sys.executable, "-m", cfg["module"]], check=True)
    except KeyboardInterrupt:
        print(f"\n{name} worker stopped.")
    except subprocess.CalledProcessError as e:
        print(f"{name} worker exited with code {e.returncode}")
        sys.exit(e.returncode)


if __name__ == "__main__":
    main()
