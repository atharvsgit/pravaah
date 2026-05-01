#!/usr/bin/env python3
"""
Worker Management Script for SIH2025 Backend
This script helps manage all the background workers for the notification system.
"""

import asyncio
import subprocess
import sys
import time
from pathlib import Path

# Worker configurations
WORKERS = {
    "coordinator": {
        "file": "worker.py",
        "description": "Main coordinator worker - processes reports and dispatches tasks"
    },
    "weather": {
        "file": "weather_worker.py", 
        "description": "Weather verification worker - validates reports against weather data"
    },
    "peer": {
        "file": "peer_notif_worker.py",
        "description": "Peer notification worker - sends notifications to nearby users"
    }
}

def print_banner():
    print("=" * 60)
    print("    SIH2025 WORKER MANAGEMENT SYSTEM")
    print("=" * 60)
    print()

def print_worker_status():
    print("Available Workers:")
    print("-" * 40)
    for key, config in WORKERS.items():
        print(f"  {key:12} - {config['description']}")
    print()

def run_worker(worker_name: str):
    """Run a specific worker."""
    if worker_name not in WORKERS:
        print(f"❌ Unknown worker: {worker_name}")
        print_worker_status()
        return False
        
    worker_file = WORKERS[worker_name]["file"]
    if not Path(worker_file).exists():
        print(f"❌ Worker file not found: {worker_file}")
        return False
        
    print(f"🚀 Starting {worker_name} worker...")
    print(f"   File: {worker_file}")
    print(f"   Description: {WORKERS[worker_name]['description']}")
    print()
    
    try:
        # Run the worker
        subprocess.run([sys.executable, worker_file], check=True)
    except KeyboardInterrupt:
        print(f"\n⏹️  {worker_name} worker stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ {worker_name} worker failed with exit code {e.returncode}")
        return False
    
    return True

def main():
    print_banner()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print(f"  python {sys.argv[0]} <worker_name>")
        print(f"  python {sys.argv[0]} all")
        print()
        print_worker_status()
        print("Examples:")
        print(f"  python {sys.argv[0]} coordinator    # Run coordinator worker")
        print(f"  python {sys.argv[0]} weather        # Run weather worker")
        print(f"  python {sys.argv[0]} peer           # Run peer notification worker")
        print(f"  python {sys.argv[0]} all            # Show instructions for running all")
        return
    
    worker_name = sys.argv[1].lower()
    
    if worker_name == "all":
        print("To run all workers simultaneously, open multiple terminals and run:")
        print()
        for key in WORKERS.keys():
            print(f"  Terminal {len([k for k in WORKERS.keys() if k <= key])}: python manage_workers.py {key}")
        print()
        print("Or use a process manager like PM2 or supervisord for production.")
        return
    
    success = run_worker(worker_name)
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()