# Gunicorn configuration file for Render deployment - Ultra Memory Optimized
import os

bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"
workers = 1  # Single worker
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 100  # Much lower
max_requests = 100  # Force restart to prevent memory leaks
max_requests_jitter = 10
timeout = 180  # Longer timeout for startup
keepalive = 1
preload_app = False  # Don't preload to save memory

# Memory optimization
worker_tmp_dir = "/dev/shm"  # Use shared memory for temp files

# Minimal logging
accesslog = None  # Disable access logs
errorlog = "-"   # Only error logs to stderr
loglevel = "error"  # Only errors
capture_output = True

# Process naming
proc_name = "pravaah-api"

# Fast shutdown
graceful_timeout = 15
max_worker_memory = 350 * 1024 * 1024  # 350MB limit per worker