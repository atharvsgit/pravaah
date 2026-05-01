"""
Connectivity detection service for offline sync functionality
"""
import asyncio
import httpx
import logging
from typing import Optional, Callable
from datetime import datetime, timezone
from app.models.offline_models import ConnectivityStatus

logger = logging.getLogger(__name__)

class ConnectivityService:
    def __init__(self):
        self._is_online = False
        self._last_check = datetime.now(timezone.utc)
        self._connection_type = None
        self._check_interval = 30  # seconds
        self._check_task: Optional[asyncio.Task] = None
        self._callbacks: list[Callable[[bool], None]] = []
        
    def add_connectivity_callback(self, callback: Callable[[bool], None]):
        """Add callback to be called when connectivity status changes"""
        self._callbacks.append(callback)
    
    def remove_connectivity_callback(self, callback: Callable[[bool], None]):
        """Remove connectivity callback"""
        if callback in self._callbacks:
            self._callbacks.remove(callback)
    
    async def _notify_callbacks(self, is_online: bool):
        """Notify all callbacks about connectivity change"""
        for callback in self._callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(is_online)
                else:
                    callback(is_online)
            except Exception as e:
                logger.error(f"Error in connectivity callback: {e}")
    
    async def check_connectivity(self) -> bool:
        """Check internet connectivity by making requests to reliable endpoints"""
        test_urls = [
            "https://www.google.com",
            "https://www.cloudflare.com",
            "https://httpbin.org/get"
        ]
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            for url in test_urls:
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        return True
                except (httpx.RequestError, httpx.TimeoutException):
                    continue
        
        return False
    
    async def update_connectivity_status(self) -> ConnectivityStatus:
        """Update and return current connectivity status"""
        previous_status = self._is_online
        self._is_online = await self.check_connectivity()
        self._last_check = datetime.now(timezone.utc)
        
        # If status changed, notify callbacks
        if previous_status != self._is_online:
            logger.info(f"Connectivity status changed: {'online' if self._is_online else 'offline'}")
            await self._notify_callbacks(self._is_online)
        
        return ConnectivityStatus(
            is_online=self._is_online,
            last_check=self._last_check,
            connection_type=self._connection_type
        )
    
    async def start_monitoring(self):
        """Start continuous connectivity monitoring"""
        if self._check_task and not self._check_task.done():
            return
            
        self._check_task = asyncio.create_task(self._connectivity_monitor())
        logger.info("Started connectivity monitoring")
    
    async def stop_monitoring(self):
        """Stop connectivity monitoring"""
        if self._check_task:
            self._check_task.cancel()
            try:
                await self._check_task
            except asyncio.CancelledError:
                pass
        logger.info("Stopped connectivity monitoring")
    
    async def _connectivity_monitor(self):
        """Background task to continuously monitor connectivity"""
        while True:
            try:
                await self.update_connectivity_status()
                await asyncio.sleep(self._check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in connectivity monitor: {e}")
                await asyncio.sleep(self._check_interval)
    
    def get_status(self) -> ConnectivityStatus:
        """Get current connectivity status without checking"""
        return ConnectivityStatus(
            is_online=self._is_online,
            last_check=self._last_check,
            connection_type=self._connection_type
        )
    
    @property
    def is_online(self) -> bool:
        """Check if currently online"""
        return self._is_online

# Global connectivity service instance
connectivity_service = ConnectivityService()