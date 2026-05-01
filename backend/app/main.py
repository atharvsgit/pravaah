from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.api import api_router
from app.core.config import settings
import os
import asyncio
import json
import uuid
from aio_pika.abc import AbstractIncomingMessage
from app.services.rabbitmq_service import rabbitmq_service
from app.services.connectivity_service import connectivity_service
from app.services.sync_service import sync_service
from app.db.sqlite_setup import init_sqlite_db

# Worker functions for background processing
async def process_report_message(message: AbstractIncomingMessage):
    """
    Callback function to process a message from the report_processing_queue.
    This worker's main jobs are:
    1. Save the initial report and media file records to the database.
    2. Dispatch new, specialized tasks to the verification queues (fan-out).
    """
    async with message.process():
        try:
            from app.db.session import get_db
            from app.db.models import Report, Media, HazardType, MediaType, User
            
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
                    user_location=f'SRID=4326;POINT({report_data["longitude"]} {report_data["latitude"]})',
                    final_confidence_score=0.5  # Set initial confidence to 0.5 so reports appear on map
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

            # Dispatch to other queues for further processing
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
            print(f"[!] Error processing report message: {e}")

async def start_background_worker():
    """Start the background worker to process reports from RabbitMQ"""
    try:
        print("🚀 Starting background report processing worker...")
        await rabbitmq_service.consume_messages("report_processing_queue", process_report_message)
        print("✅ Background worker started and listening for messages")
    except Exception as e:
        print(f"❌ Failed to start background worker: {e}")

app = FastAPI(
    title="Pravaah API",
    description="API for crowdsourced ocean hazard reporting and social media analytics.",
    version="0.1.0"
)

# Get environment - default to production for safety
environment = os.getenv("ENVIRONMENT", "production")

# Configure CORS based on environment
if environment == "development":
    # Local development - allow all origins temporarily for debugging
    allowed_origins = ["*"]
else:
    # Production - always explicit origins
    allowed_origins = [] #change this to empty array
    
    # Add frontend URL from environment variable (primary)
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        # Clean the URL (remove trailing slash)
        frontend_url = frontend_url.rstrip('/')
        allowed_origins.append(frontend_url)
    
    # Fallback to default Render URL if FRONTEND_URL not set
    if not allowed_origins:
        allowed_origins.append("https://pravaah-frontend.onrender.com")
    
    # Add Vercel deployment URLs if present
    vercel_url = os.getenv("VERCEL_URL")
    if vercel_url:
        allowed_origins.append(f"https://{vercel_url}")
    
    # Add any additional production origins
    additional_origins = os.getenv("ADDITIONAL_CORS_ORIGINS")
    if additional_origins:
        origins_list = [origin.strip() for origin in additional_origins.split(",")]
        allowed_origins.extend(origins_list)
    
    # Add localhost origins for local development testing
    localhost_origins = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173"
    ]
    allowed_origins.extend(localhost_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False if "*" in allowed_origins else True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Add debugging middleware for CORS issues (development only)
if environment == "development":
    @app.middleware("http")
    async def cors_debug_middleware(request: Request, call_next):
        origin = request.headers.get("origin")
        if origin:
            print(f"🔍 Request from origin: {origin}")
            if origin not in allowed_origins and "*" not in allowed_origins:
                print(f"⚠️  Origin {origin} not in allowed origins: {allowed_origins}")
        
        response = await call_next(request)
        return response

@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print(f"🚀 Starting Pravaah API")
    print(f"Environment: {environment}")
    print(f"CORS allowed origins: {allowed_origins}")
    print("=" * 60)
    
    # CRITICAL: Create database tables with proper ENUM handling
    try:
        from app.db.session import engine
        from app.db.base import Base
        from sqlalchemy import text
        
        print("Creating/verifying database tables...")
        async with engine.begin() as conn:
            # First, enable PostGIS extension if needed
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                print("✓ PostGIS extension enabled")
            except Exception as ext_error:
                print(f"⚠️  PostGIS extension warning: {ext_error}")
            
            # Pre-create ENUM types to avoid conflicts
            enum_types = [
                ("user_role", ["citizen", "official", "analyst"]),
                ("hazard_type", ["tsunami", "high_waves", "coastal_flooding", "storm_surge", "rip_current", "coastal_erosion", "water_discoloration", "marine_debris", "other"]),
                ("report_status", ["under_verification", "verified", "rejected", "resolved"]),
                ("media_type", ["image", "video", "audio"]),
                ("verification_source", ["ai_analysis", "expert_review", "crowd_verification", "official_confirmation"])
            ]
            
            for enum_name, enum_values in enum_types:
                try:
                    # Check if the ENUM type already exists
                    result = await conn.execute(text(f"""
                        SELECT 1 FROM pg_type WHERE typname = '{enum_name}';
                    """))
                    
                    if result.fetchone() is None:
                        # ENUM doesn't exist, create it
                        values_str = ", ".join([f"'{value}'" for value in enum_values])
                        await conn.execute(text(f"""
                            CREATE TYPE {enum_name} AS ENUM ({values_str});
                        """))
                        print(f"✅ Created ENUM type: {enum_name}")
                    else:
                        # ENUM exists - check if it has the correct values
                        if enum_name in ["hazard_type", "user_role"]:
                            try:
                                # Check current enum values
                                result = await conn.execute(text(f"""
                                    SELECT unnest(enum_range(NULL::{enum_name}))::text;
                                """))
                                current_values = [row[0] for row in result.fetchall()]
                                
                                # Check if we have the correct values
                                missing_values = [v for v in enum_values if v not in current_values]
                                if missing_values:
                                    print(f"🔄 Updating {enum_name} enum to include missing values: {missing_values}")
                                    
                                    if enum_name == "hazard_type":
                                        # Drop tables that depend on this enum
                                        await conn.execute(text("DROP TABLE IF EXISTS reports CASCADE;"))
                                        await conn.execute(text("DROP TABLE IF EXISTS media CASCADE;"))
                                        print("  - Dropped dependent tables")
                                    elif enum_name == "user_role":
                                        # Drop tables that depend on this enum
                                        await conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
                                        await conn.execute(text("DROP TABLE IF EXISTS reports CASCADE;"))
                                        await conn.execute(text("DROP TABLE IF EXISTS media CASCADE;"))
                                        await conn.execute(text("DROP TABLE IF EXISTS safety_circles CASCADE;"))
                                        print("  - Dropped dependent tables")
                                    
                                    # Drop and recreate the enum
                                    await conn.execute(text(f"DROP TYPE IF EXISTS {enum_name} CASCADE;"))
                                    values_str = ", ".join([f"'{value}'" for value in enum_values])
                                    await conn.execute(text(f"""
                                        CREATE TYPE {enum_name} AS ENUM ({values_str});
                                    """))
                                    print(f"  - Recreated {enum_name} enum with correct values")
                                else:
                                    print(f"✓ ENUM type {enum_name} has correct values")
                            except Exception as enum_check_error:
                                print(f"⚠️  Could not verify {enum_name} values: {enum_check_error}")
                        else:
                            print(f"✓ ENUM type {enum_name} already exists")
                        
                except Exception as e:
                    if "already exists" in str(e) or "duplicate key" in str(e):
                        print(f"✓ ENUM type {enum_name} was created by another worker")
                    else:
                        print(f"⚠️  Error with ENUM {enum_name}: {e}")
            
            # Now create tables (handle "already exists" gracefully)
            try:
                await conn.run_sync(Base.metadata.create_all)
                print("✅ All tables created successfully")
            except Exception as table_error:
                if "already exists" in str(table_error) or "DuplicateTableError" in str(table_error):
                    print("✅ Tables already exist (this is normal)")
                else:
                    # For other errors, try to continue anyway
                    print(f"⚠️  Table creation warning: {table_error}")
            
            # Verify critical table structure
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position;
            """))
            user_columns = [row[0] for row in result.fetchall()]
            
            # Check for critical columns
            required_columns = ['id', 'email', 'role', 'hashed_password', 'full_name']
            missing_columns = [col for col in required_columns if col not in user_columns]
            
            if missing_columns:
                print(f"❌ CRITICAL: Missing columns in users table: {missing_columns}")
                print(f"📋 Found columns: {user_columns}")
                # Force drop and recreate if schema is wrong
                print("🔧 Forcing table recreation...")
                await conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
                await conn.run_sync(Base.metadata.create_all)
                print("✅ Tables recreated with complete schema")
            elif user_columns:
                print(f"✅ Users table verified with {len(user_columns)} columns: {user_columns[:5]}...")
                # Get user count for status
                try:
                    result = await conn.execute(text("SELECT COUNT(*) FROM users"))
                    user_count = result.scalar()
                    print(f"✅ Database contains {user_count} users")
                except Exception as e:
                    print(f"⚠️  Could not count users: {e}")
            else:
                print("❌ Users table exists but has no columns - this should not happen")
                
        print("✓ Database tables created/verified successfully.")
    except Exception as e:
        print(f"✗ CRITICAL: Database table creation failed: {e}")
        print("Application may not function correctly without database tables!")
        # Don't raise - let app start so you can debug via health endpoint
    
    # Initialize SQLite database for offline sync
    try:
        await asyncio.wait_for(init_sqlite_db(), timeout=10.0)
        print("✓ SQLite database initialized successfully.")
    except asyncio.TimeoutError:
        print("✗ SQLite initialization timed out")
    except Exception as e:
        print(f"✗ SQLite initialization failed: {e}")
    
    # Try to connect to RabbitMQ with timeout (optional in production)
    try:
        await asyncio.wait_for(rabbitmq_service.connect(), timeout=5.0)
        print("✓ Successfully connected to RabbitMQ.")
        
        # Start background worker for processing reports
        try:
            # Create background task for report processing worker
            asyncio.create_task(start_background_worker())
            print("✓ Background report processing worker started.")
        except Exception as worker_error:
            print(f"⚠ Failed to start background worker: {worker_error}")
            
    except asyncio.TimeoutError:
        print("⚠ RabbitMQ connection timed out (running without message queue)")
    except Exception as e:
        print(f"⚠ RabbitMQ connection failed (running without message queue): {e}")
    
    # Start connectivity monitoring (non-blocking)
    try:
        await asyncio.wait_for(connectivity_service.start_monitoring(), timeout=5.0)
        print("✓ Connectivity monitoring started.")
    except asyncio.TimeoutError:
        print("⚠ Connectivity monitoring timed out")
    except Exception as e:
        print(f"⚠ Connectivity monitoring failed: {e}")
    
    # Start sync service (non-blocking)
    try:
        await asyncio.wait_for(sync_service.start_sync_service(), timeout=5.0)
        print("✓ Sync service started.")
    except asyncio.TimeoutError:
        print("⚠ Sync service timed out")
    except Exception as e:
        print(f"⚠ Sync service failed: {e}")
    
    # Note: Safety circle cleanup moved to separate endpoint to avoid startup errors
    # You can manually trigger cleanup via DELETE /api/safety-circles/expired
    
    print("=" * 60)
    print("✅ Pravaah API startup complete!")
    print("=" * 60)

@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down Pravaah API...")
    
    # Stop sync services
    try:
        await sync_service.stop_sync_service()
        print("✓ Sync service stopped.")
    except Exception as e:
        print(f"✗ Error stopping sync service: {e}")
    
    try:
        await connectivity_service.stop_monitoring()
        print("✓ Connectivity monitoring stopped.")
    except Exception as e:
        print(f"✗ Error stopping connectivity monitoring: {e}")
    
    # Close RabbitMQ connection
    try:
        await rabbitmq_service.close()
        print("✓ RabbitMQ connection closed.")
    except Exception as e:
        print(f"✗ Error closing RabbitMQ: {e}")
    
    print("Pravaah API shutdown complete.")

app.include_router(api_router, prefix="/api")

# Create uploads directories if they don't exist
os.makedirs("uploads/profile_pictures", exist_ok=True)
os.makedirs("uploads/media", exist_ok=True)

# Mount static files for serving uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/", tags=["Root"])
def read_root():
    return {
        "status": "active", 
        "message": "Welcome to the Pravaah API!",
        "version": "0.1.0",
        "environment": environment,
        "cors_origins": allowed_origins
    }

@app.get("/rabbitmq/status", tags=["Monitoring"])
async def rabbitmq_status():
    """Check RabbitMQ connection and queue status"""
    try:
        queue_status = await rabbitmq_service.get_queue_status()
        return queue_status
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to get RabbitMQ status: {str(e)}"
        }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify API and database connectivity"""
    health_status = {
        "status": "healthy",
        "api": "running",
        "environment": environment,
        "cors_origins": allowed_origins,
    }
    
    # Test database connection
    try:
        from app.db.session import engine
        from sqlalchemy import text
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
        health_status["database"] = "connected"
        
        # Check if tables exist and have proper schema
        try:
            async with engine.begin() as conn:
                # Check users table structure
                result = await conn.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    ORDER BY ordinal_position;
                """))
                user_columns = [(row[0], row[1]) for row in result.fetchall()]
                
                if user_columns:
                    health_status["users_table"] = "exists"
                    health_status["users_columns"] = dict(user_columns)
                    health_status["users_column_count"] = len(user_columns)
                    
                    # Check for critical columns
                    column_names = [col[0] for col in user_columns]
                    required_columns = ['id', 'email', 'role', 'hashed_password', 'full_name']
                    missing_columns = [col for col in required_columns if col not in column_names]
                    
                    if missing_columns:
                        health_status["schema_issue"] = f"Missing columns: {missing_columns}"
                        health_status["status"] = "degraded"
                    else:
                        # Get user count
                        result = await conn.execute(text("SELECT COUNT(*) FROM users"))
                        user_count = result.scalar()
                        health_status["user_count"] = user_count
                else:
                    health_status["users_table"] = "missing"
                    health_status["status"] = "degraded"
        except Exception as e:
            health_status["users_table"] = "error"
            health_status["tables_error"] = str(e)
            health_status["status"] = "degraded"
            
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["database"] = "disconnected"
        health_status["database_error"] = str(e)
    
    # Check RabbitMQ status
    try:
        if rabbitmq_service.is_connected():
            health_status["rabbitmq"] = "connected"
        else:
            health_status["rabbitmq"] = "disconnected"
    except:
        health_status["rabbitmq"] = "unavailable"
    
    # Overall status
    if health_status.get("database") == "disconnected":
        health_status["status"] = "unhealthy"
        health_status["message"] = "Database connection failed"
    elif health_status.get("users_table") == "missing":
        health_status["status"] = "unhealthy"
        health_status["message"] = "Database tables missing - run migrations"
    else:
        health_status["message"] = "All systems operational"
    
    return health_status