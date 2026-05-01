import asyncio
from sqlalchemy import text
from app.db.session import engine
from app.db.models import Base

async def check_and_create_enums(conn):
    """
    Safely create ENUM types if they don't exist.
    Handles multi-worker conflicts by checking existence first.
    """
    enum_types = [
        ("user_role", ["citizen", "verified_reporter", "emergency_responder", "admin"]),
        ("hazard_type", ["flood", "fire", "earthquake", "cyclone", "landslide", "accident", "medical_emergency", "security_threat", "infrastructure_failure", "other"]),
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
                print(f"✓ ENUM type {enum_name} already exists")
                
        except Exception as e:
            # If creation fails (likely due to race condition), check if it exists now
            if "already exists" in str(e) or "duplicate key" in str(e):
                print(f"✓ ENUM type {enum_name} was created by another worker")
            else:
                print(f"⚠️  Error creating ENUM {enum_name}: {e}")
                # Don't raise - let SQLAlchemy handle table creation
                # which might fail more gracefully

async def create_all_tables():
    """Connects to the database and creates all tables from SQLAlchemy models."""
    try:
        async with engine.begin() as conn:
            print("🔄 Setting up database extensions...")
            
            # Enable PostGIS extension (required for geography types)
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                print("✅ PostGIS extension enabled")
            except Exception as ext_error:
                print(f"⚠️  PostGIS extension setup failed: {ext_error}")
                print("🔧 This may require manual database configuration in Render")
            
            print("🔄 Pre-creating ENUM types to avoid conflicts...")
            await check_and_create_enums(conn)
            
            print("🔄 Creating all tables from models...")
            
            # Create all tables defined in models
            try:
                await conn.run_sync(Base.metadata.create_all)
                print("✅ All tables created successfully!")
            except Exception as table_error:
                # Handle common ENUM-related errors gracefully
                if "duplicate key value violates unique constraint" in str(table_error) and "pg_type_typname_nsp_index" in str(table_error):
                    print("⚠️  ENUM type conflict detected - this is normal in multi-worker deployments")
                    print("🔄 Retrying table creation...")
                    # Wait a moment and try again
                    await asyncio.sleep(1)
                    await conn.run_sync(Base.metadata.create_all)
                    print("✅ Tables created successfully on retry!")
                else:
                    raise table_error
                
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        print("🔧 If you see 'geography type does not exist', enable PostGIS in your database:")
        print("   1. Go to Render Dashboard → Your PostgreSQL database")
        print("   2. Connect to database shell")
        print("   3. Run: CREATE EXTENSION IF NOT EXISTS postgis;")
        raise e

async def drop_all_tables():
    """Drops all existing tables and their associated types (for fresh database creation)."""
    async with engine.begin() as conn:
        print("🗑️  Dropping all existing tables (with CASCADE)...")
        
        # Drop tables in correct order to handle foreign key constraints
        await conn.execute(text("DROP TABLE IF EXISTS safety_circles CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS verifications CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS media CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS reports CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
        
        print("🧹 Cleaning up ENUM types...")
        # Drop ENUM types that might cause conflicts
        enum_types = ["media_type", "verification_source", "user_role", "hazard_type", "report_status"]
        for enum_type in enum_types:
            try:
                await conn.execute(text(f"DROP TYPE IF EXISTS {enum_type} CASCADE;"))
                print(f"✓ Dropped ENUM type: {enum_type}")
            except Exception as e:
                print(f"⚠️  Could not drop ENUM {enum_type}: {e}")
        
        print("🧹 Cleaning up composite types...")
        # Drop composite types that PostgreSQL creates automatically for tables
        # This prevents "type already exists" errors when recreating tables
        await conn.execute(text("DROP TYPE IF EXISTS safety_circles CASCADE;"))
        await conn.execute(text("DROP TYPE IF EXISTS verifications CASCADE;"))
        await conn.execute(text("DROP TYPE IF EXISTS media CASCADE;"))
        await conn.execute(text("DROP TYPE IF EXISTS reports CASCADE;"))
        await conn.execute(text("DROP TYPE IF EXISTS users CASCADE;"))
        
        print("✅ All tables and types dropped successfully!")

async def create_fresh_database():
    """Creates a fresh database by dropping and recreating all tables."""
    await drop_all_tables()
    await create_all_tables()
    print("🎉 Fresh database created with latest schema!")

async def main():
    """Main function with options for different operations."""
    import sys
    import os
    
    # Verify DATABASE_URL is available
    if not os.getenv("DATABASE_URL"):
        print("❌ ERROR: DATABASE_URL environment variable is not set!")
        print("Make sure your database is properly configured in Render.")
        sys.exit(1)
    
    print(f"🔗 Using database: {os.getenv('DATABASE_URL', 'Not set')[:50]}...")
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "fresh":
            # Create fresh database (destroys existing data)
            print("🚀 Creating fresh database...")
            await create_fresh_database()
            
        elif command == "create":
            # Create tables only (preserves existing data)
            print("🔄 Creating tables...")
            await create_all_tables()
            
        elif command == "drop":
            # Drop all tables (be careful!)
            print("�️  Dropping all tables...")
            await drop_all_tables()
            
        else:
            print("❌ Unknown command. Available commands:")
            print("  python create_tables.py fresh  - Create fresh database (destroys all data)")
            print("  python create_tables.py create - Create tables only (preserves existing data)")
            print("  python create_tables.py drop   - Drop all tables (destroys all data)")
    else:
        # Default behavior - create tables (safer default)
        print("🔄 Creating database tables (default behavior)...")
        print("💡 Use 'python create_tables.py fresh' to create fresh database")
        await create_all_tables()

if __name__ == "__main__":
    asyncio.run(main())
