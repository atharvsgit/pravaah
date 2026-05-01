import asyncio
import json
from typing import List
from aio_pika.abc import AbstractIncomingMessage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from app.core.config import settings
from app.services.rabbitmq_service import rabbitmq_service
from app.db.session import AsyncSessionLocal
from app.db.models import User, Report
from datetime import datetime, timedelta
import math

async def find_nearby_users(latitude: float, longitude: float, radius_km: float = 10.0) -> List[User]:
    """
    Find users within a certain radius of the given coordinates using PostGIS.
    """
    async with AsyncSessionLocal() as db:
        try:
            # Use PostGIS distance calculation with geography type
            # ST_DWithin uses meters, so convert km to meters
            radius_meters = radius_km * 1000
            
            # Create a query to find users within the specified radius
            query = select(User).where(
                and_(
                    User.is_active == True,
                    User.role == "citizen",
                    User.latitude.isnot(None),
                    User.longitude.isnot(None),
                    text(f"""
                        ST_DWithin(
                            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                            ST_SetSRID(ST_MakePoint({longitude}, {latitude}), 4326)::geography,
                            {radius_meters}
                        )
                    """)
                )
            ).limit(50)  # Limit to prevent too many notifications
            
            result = await db.execute(query)
            users = result.scalars().all()
            return users
            
        except Exception as e:
            print(f"[!] Error finding nearby users with PostGIS: {e}")
            # Fallback to simple distance calculation
            return await find_nearby_users_fallback(latitude, longitude, radius_km, db)

async def find_nearby_users_fallback(latitude: float, longitude: float, radius_km: float, db: AsyncSession) -> List[User]:
    """
    Fallback method using simple distance calculation when PostGIS is not available.
    """
    try:
        # Get all active users with location data
        result = await db.execute(
            select(User).where(
                and_(
                    User.is_active == True,
                    User.role == "citizen",
                    User.latitude.isnot(None),
                    User.longitude.isnot(None)
                )
            ).limit(200)
        )
        
        all_users = result.scalars().all()
        nearby_users = []
        
        for user in all_users:
            distance = calculate_distance(latitude, longitude, user.latitude, user.longitude)
            if distance <= radius_km:
                nearby_users.append(user)
        
        return nearby_users[:50]  # Limit to 50 users
        
    except Exception as e:
        print(f"[!] Error in fallback nearby users search: {e}")
        return []

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on earth (in kilometers).
    """
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    return c * r

async def create_peer_notification(user: User, report_data: dict) -> bool:
    """
    Create a peer notification record in the database for a specific user.
    Note: This creates a notification that will show up in the user's notification feed,
    rather than sending an immediate push notification.
    """
    async with AsyncSessionLocal() as db:
        try:
            # For now, we'll just log that a notification would be created
            # In a full implementation, you might want to create actual notification records
            # or trigger push notifications via Firebase/FCM
            
            print(f"[✔] Would create peer notification for user {user.id} ({user.full_name})")
            print(f"    Report: {report_data['report_id']} - {report_data['hazard_type']}")
            
            # Here you could:
            # 1. Create a notification record in a notifications table
            # 2. Send a push notification via Firebase
            # 3. Send an email alert
            # 4. Log the notification for analytics
            
            return True
            
        except Exception as e:
            print(f"[!] Error creating peer notification for user {user.id}: {e}")
            return False

async def process_peer_notification_message(message: AbstractIncomingMessage):
    """
    Process peer notification messages from the queue.
    Find nearby users and send them notifications about the hazard report.
    """
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            report_id = body.get("report_id")
            latitude = body.get("latitude")
            longitude = body.get("longitude")
            hazard_type = body.get("hazard_type")
            
            print(f"[🔄] Processing peer notification for report {report_id}")
            print(f"    Location: ({latitude}, {longitude})")
            print(f"    Hazard Type: {hazard_type}")
            
            # Find nearby users within 10km radius
            nearby_users = await find_nearby_users(latitude, longitude, radius_km=10.0)
            
            if not nearby_users:
                print(f"[ℹ] No nearby users found for report {report_id}")
                return
                
            print(f"[ℹ] Found {len(nearby_users)} nearby users")
            
            # Create notifications for nearby users
            sent_count = 0
            for user in nearby_users:
                success = await create_peer_notification(user, {
                    "report_id": report_id,
                    "hazard_type": hazard_type,
                    "latitude": latitude,
                    "longitude": longitude
                })
                
                if success:
                    sent_count += 1
                    
                # Add small delay to avoid overwhelming the database
                await asyncio.sleep(0.1)
            
            print(f"[✔] Successfully sent {sent_count}/{len(nearby_users)} peer notifications for report {report_id}")
            
        except json.JSONDecodeError:
            print("[!] Failed to decode message body as JSON")
        except KeyError as e:
            print(f"[!] Missing required field in message: {e}")
        except Exception as e:
            print(f"[!] Error processing peer notification message: {e}")

async def main():
    """Main function to connect to RabbitMQ and start the peer notification worker."""
    print("Starting Peer Notification Worker...")
    await rabbitmq_service.connect()
    await rabbitmq_service.consume_messages("peer_notification_queue", process_peer_notification_message)

    print("[*] Peer notification worker is running and waiting for jobs...")
    try:
        await asyncio.Future()
    except KeyboardInterrupt:
        print("\n[!] Received interrupt signal")
    finally:
        await rabbitmq_service.close()
        print("Peer notification worker shut down.")

if __name__ == "__main__":
    asyncio.run(main())