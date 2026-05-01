"""
Base worker class to reduce code duplication across worker implementations.
"""
import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from aio_pika.abc import AbstractIncomingMessage
from app.db.session import AsyncSessionLocal
from app.services.rabbitmq_service import rabbitmq_service

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BaseWorker(ABC):
    """
    Base class for all workers to reduce code duplication.
    Provides common patterns for message processing and database operations.
    """
    
    def __init__(self, worker_name: str):
        self.worker_name = worker_name
        self.logger = logging.getLogger(f"worker.{worker_name}")
    
    async def process_message(self, message: AbstractIncomingMessage):
        """
        Common message processing wrapper that handles JSON parsing and error handling.
        """
        async with message.process():
            try:
                body = json.loads(message.body.decode())
                self.logger.info(f"Processing message: {body}")
                
                # Call the specific worker's implementation
                await self.handle_message(body)
                
            except json.JSONDecodeError as e:
                self.logger.error(f"Failed to parse message JSON: {e}")
                raise
            except Exception as e:
                self.logger.error(f"Error processing message: {e}")
                raise
    
    @abstractmethod
    async def handle_message(self, message_data: Dict[str, Any]):
        """
        Abstract method that each worker must implement to handle the actual message processing.
        """
        pass
    
    async def get_db_session(self):
        """
        Common database session management.
        """
        return AsyncSessionLocal()
    
    async def publish_message(self, queue_name: str, message: Dict[str, Any]):
        """
        Common method to publish messages to other queues.
        """
        try:
            await rabbitmq_service.publish_message(queue_name, message)
            self.logger.info(f"Published message to {queue_name}: {message}")
        except Exception as e:
            self.logger.error(f"Failed to publish message to {queue_name}: {e}")
            raise
    
    def log_success(self, operation: str, details: Optional[str] = None):
        """
        Common success logging.
        """
        message = f"Successfully completed {operation}"
        if details:
            message += f": {details}"
        self.logger.info(message)
    
    def log_error(self, operation: str, error: Exception, details: Optional[str] = None):
        """
        Common error logging.
        """
        message = f"Failed to complete {operation}: {error}"
        if details:
            message += f" ({details})"
        self.logger.error(message)