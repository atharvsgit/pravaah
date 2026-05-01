import aio_pika
import json
from app.core.config import settings
from typing import Callable, Coroutine, Any

class RabbitMQService:
    def __init__(self):
        self.connection: aio_pika.abc.AbstractRobustConnection | None = None
        self.channel: aio_pika.abc.AbstractChannel | None = None

    async def connect(self):
        if not settings.RABBITMQ_URL:
            print("No RabbitMQ URL provided, running without message queue.")
            return
            
        try:
            self.connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=1)
            print("Successfully connected to RabbitMQ.")
        except Exception as e:
            print(f"Failed to connect to RabbitMQ: {e}")
            # Don't raise - let the app continue without RabbitMQ
            self.connection = None
            self.channel = None

    async def close(self):
        if self.channel:
            await self.channel.close()
        if self.connection:
            await self.connection.close()
        print("RabbitMQ connection closed.")

    async def publish_message(self, queue_name: str, message_body: dict):
        if not self.channel:
            print(f"RabbitMQ not available, skipping message publication to {queue_name}")
            return
        
        try:
            await self.channel.declare_queue(queue_name, durable=True)

            message = aio_pika.Message(
                body=json.dumps(message_body).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            )
            await self.channel.default_exchange.publish(message, routing_key=queue_name)
        except Exception as e:
            print(f"Failed to publish message to {queue_name}: {e}")

    async def consume_messages(
        self,
        queue_name: str,
        callback: Callable[[aio_pika.abc.AbstractIncomingMessage], Coroutine[Any, Any, None]]
    ):
        if not self.channel:
            print(f"RabbitMQ not available, cannot consume messages from {queue_name}")
            return

        queue = await self.channel.declare_queue(queue_name, durable=True)

        await queue.consume(callback)
        print(f"[*] Started consuming from queue: {queue_name}")

    def is_connected(self) -> bool:
        """Check if RabbitMQ connection is active."""
        return self.connection is not None and not self.connection.is_closed

    async def get_queue_status(self) -> dict:
        """Get status of all queues used by the application."""
        if not self.channel:
            return {"status": "disconnected", "error": "RabbitMQ not connected"}
        
        try:
            queues_to_check = [
                "report_processing_queue",
                "nlp_queue", 
                "weather_queue",
                "peer_notification_queue"
            ]
            
            queue_status = {}
            for queue_name in queues_to_check:
                try:
                    # Declare queue to ensure it exists and get info
                    queue = await self.channel.declare_queue(queue_name, durable=True)
                    
                    # Get queue information (message count, consumer count)
                    queue_info = await queue.declare()
                    queue_status[queue_name] = {
                        "message_count": queue_info.message_count,
                        "consumer_count": queue_info.consumer_count,
                        "status": "active"
                    }
                except Exception as e:
                    queue_status[queue_name] = {
                        "status": "error",
                        "error": str(e)
                    }
            
            return {
                "status": "connected",
                "connection_status": "open" if not self.connection.is_closed else "closed",
                "queues": queue_status
            }
            
        except Exception as e:
            return {"status": "error", "error": str(e)}

rabbitmq_service = RabbitMQService()