#!/usr/bin/env python3
"""
Consolidated worker for all background tasks - Ultra Memory Optimized for Render Free Tier
This single process handles all worker tasks with minimal memory footprint
"""

import asyncio
import logging
import signal
import sys
import gc
import os
import subprocess
import time
from importlib import import_module

# Ultra minimal logging to save memory
logging.basicConfig(
    level=logging.ERROR,  # Only errors
    format='%(levelname)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Force aggressive garbage collection
gc.set_threshold(100, 5, 5)  # More aggressive GC

class MemoryOptimizedWorker:
    """Ultra lightweight worker that loads modules only when needed"""
    
    def __init__(self):
        self.running = True
        self.worker_instances = {}
        
    def setup_signal_handlers(self):
        """Setup graceful shutdown handlers"""
        def signal_handler(signum, frame):
            logger.error(f"Signal {signum} received, shutting down...")
            self.running = False
            
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
    
    def get_worker_instance(self, worker_type):
        """Lazy load worker instances only when needed"""
        if worker_type in self.worker_instances:
            return self.worker_instances[worker_type]
            
        try:
            if worker_type == "weather":
                from weather_worker import WeatherWorker
                self.worker_instances[worker_type] = WeatherWorker()
                logger.error("Weather worker loaded")
            elif worker_type == "general":
                from worker import Worker
                self.worker_instances[worker_type] = Worker()
                logger.error("General worker loaded")
            elif worker_type == "peer":
                from peer_notif_worker import PeerNotificationWorker
                self.worker_instances[worker_type] = PeerNotificationWorker()
                logger.error("Peer worker loaded")
            else:
                return None
                
            # Force garbage collection after loading
            gc.collect()
            return self.worker_instances[worker_type]
            
        except Exception as e:
            logger.error(f"Failed to load {worker_type} worker: {e}")
            return None
    
    async def run_worker_cycle(self, worker_type, sleep_time):
        """Run a single worker cycle"""
        worker = self.get_worker_instance(worker_type)
        if not worker:
            return
            
        try:
            await worker.process_messages()
        except Exception as e:
            logger.error(f"{worker_type} worker error: {e}")
        finally:
            # Force cleanup after each cycle
            gc.collect()
    
    async def run_lightweight_scheduler(self):
        """Lightweight scheduler that runs workers sequentially to save memory"""
        cycle = 0
        
        while self.running:
            try:
                # Run only one worker per cycle to minimize memory usage
                if cycle % 3 == 0:
                    await self.run_worker_cycle("weather", 30)
                elif cycle % 3 == 1:
                    await self.run_worker_cycle("general", 20)
                else:
                    await self.run_worker_cycle("peer", 45)
                
                cycle += 1
                
                # Memory check every 10 cycles
                if cycle % 10 == 0:
                    try:
                        import psutil
                        process = psutil.Process()
                        memory_mb = process.memory_info().rss / 1024 / 1024
                        if memory_mb > 450:  # Warning at 450MB
                            logger.error(f"HIGH MEMORY: {memory_mb:.1f}MB")
                            # Clear worker instances to free memory
                            self.worker_instances.clear()
                            gc.collect()
                    except:
                        pass
                
                # Base sleep between cycles
                await asyncio.sleep(15)
                
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(30)
    
    def run_ai_worker_minimal(self):
        """Run AI worker with minimal memory footprint"""
        try:
            # Use subprocess to isolate AI worker memory
            cmd = ["python", "-c", """
import sys
sys.path.append('.')
sys.path.append('../ai')
try:
    from ai.worker import AIWorker
    worker = AIWorker()
    worker.process_messages()
except Exception as e:
    print(f'AI worker error: {e}')
"""]
            subprocess.run(cmd, timeout=300, cwd=os.getcwd())
        except subprocess.TimeoutExpired:
            logger.error("AI worker timeout")
        except Exception as e:
            logger.error(f"AI worker subprocess error: {e}")
    
    def run(self):
        """Main entry point - ultra lightweight execution"""
        logger.error("Starting memory-optimized consolidated worker...")
        self.setup_signal_handlers()
        
        try:
            # Force initial cleanup
            gc.collect()
            
            # Run main scheduler
            asyncio.run(self.run_lightweight_scheduler())
            
        except KeyboardInterrupt:
            logger.error("Keyboard interrupt received")
        except Exception as e:
            logger.error(f"Worker failed: {e}")
        finally:
            self.running = False
            self.worker_instances.clear()
            gc.collect()
            logger.error("Consolidated worker stopped")


if __name__ == "__main__":
    # Ultra aggressive startup cleanup
    gc.collect()
    
    # Set lower memory limits
    try:
        import resource
        # Limit virtual memory to 400MB (if supported)
        resource.setrlimit(resource.RLIMIT_AS, (400 * 1024 * 1024, 400 * 1024 * 1024))
    except:
        pass  # Not supported on Windows
    
    worker = MemoryOptimizedWorker()
    worker.run()