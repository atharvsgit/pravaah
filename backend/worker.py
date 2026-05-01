import asyncio
import json
import uuid
from aio_pika.abc import AbstractIncomingMessage

from app.db.session import get_db
from app.db.models import Report, Media, HazardType, MediaType, User
from app.services.rabbitmq_service import rabbitmq_service

async def process_report_message(message: AbstractIncomingMessage):
    """
    Callback function to process a message from the report_processing_queue.
    This worker's main jobs are:
    1. Save the initial report and media file records to the database.
    2. Dispatch new, specialized tasks to the verification queues (fan-out).
    """
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            report_id = uuid.UUID(body["report_id"])
            user_id = uuid.UUID(body["user_id"])
            report_data = body["report_data"]
            media_files_data = body["media_files"]

            print(f"[+] Received initial report {report_id}. Saving to DB and dispatching.")

            async for db in get_db():
                new_report = Report(
                    id=report_id,
                    user_id=user_id,
                    user_hazard_type=HazardType(report_data["user_hazard_type"]),
                    user_description=report_data["user_description"],
                    user_location=f'SRID=4326;POINT({report_data["longitude"]} {report_data["latitude"]})'
                )
                db.add(new_report)

                for media_data in media_files_data:
                    new_media = Media(
                        report_id=report_id,
                        file_url=media_data["file_url"],
                        media_type=MediaType(media_data["media_type"]),
                    )
                    db.add(new_media)

                await db.commit()
                print(f"  - Successfully saved report {report_id} and {len(media_files_data)} media file(s) to the database.")

            nlp_message = {
                "report_id": str(report_id),
                "user_description": report_data["user_description"],
                "media_files": media_files_data,
            }
            await rabbitmq_service.publish_message("nlp_queue", nlp_message)
            print(f"  - Dispatched task to nlp_queue for report {report_id}")

            weather_message = {
                "report_id": str(report_id),
                "latitude": report_data["latitude"],
                "longitude": report_data["longitude"],
                "user_hazard_type": report_data["user_hazard_type"]
            }
            await rabbitmq_service.publish_message("weather_queue", weather_message)
            print(f"  - Dispatched task to weather_queue for report {report_id}")

            peer_message = {
                "report_id": str(report_id),
                "latitude": report_data["latitude"],
                "longitude": report_data["longitude"],
                "hazard_type": report_data["user_hazard_type"],
            }
            await rabbitmq_service.publish_message("peer_notification_queue", peer_message)
            print(f"  - Dispatched task to peer_notification_queue for report {report_id}")

            print(f"[✔] Finished processing and dispatching for report {report_id}.")

        except Exception as e:
            print(f"[!] Error processing message: {e}")

async def main():
    """Main function to connect to RabbitMQ and start the worker."""
    print("Starting Coordinator Worker...")
    await rabbitmq_service.connect()
    await rabbitmq_service.consume_messages("report_processing_queue", process_report_message)

    print("[*] Coordinator worker is running and waiting for reports...")
    try:
        await asyncio.Future()
    finally:
        await rabbitmq_service.close()
        print("Coordinator worker shut down.")

if __name__ == "__main__":
    asyncio.run(main())