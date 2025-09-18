#!/usr/bin/env python3
"""
Production migration runner - adds generated_by_admin_id column
This script connects to the production database and runs the migration
"""

import os
import sys
from sqlalchemy import create_engine, text
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_production_migration():
    """Run the migration on production database"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        return False
        
    logger.info(f"Connecting to database: {database_url[:20]}...")
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Start a transaction
            with conn.begin():
                logger.info("Checking if generated_by_admin_id column exists...")
                
                # Check if column already exists
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'onboarding_token' 
                    AND column_name = 'generated_by_admin_id'
                """)).fetchone()
                
                if result:
                    logger.info("✅ Column 'generated_by_admin_id' already exists. Nothing to do.")
                    return True
                
                logger.info("🔧 Adding generated_by_admin_id column...")
                
                # Add the column
                conn.execute(text("""
                    ALTER TABLE onboarding_token 
                    ADD COLUMN generated_by_admin_id INTEGER REFERENCES "user"(id)
                """))
                
                logger.info("✅ Column added successfully")
                
                # Add index for performance
                logger.info("🔧 Adding index...")
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_onboarding_token_generated_by_admin_id 
                    ON onboarding_token(generated_by_admin_id)
                """))
                
                logger.info("✅ Index added successfully")
                
                # Verify the column was added
                result = conn.execute(text("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'onboarding_token' 
                    AND column_name = 'generated_by_admin_id'
                """)).fetchone()
                
                if result:
                    logger.info(f"✅ Verification successful: {result[0]} ({result[1]}, nullable: {result[2]})")
                    return True
                else:
                    logger.error("❌ Verification failed: Column not found after migration")
                    return False
                    
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting production database migration...")
    
    success = run_production_migration()
    
    if success:
        logger.info("\n🎉 Migration completed successfully!")
        logger.info("QR generation with admin tracking should now work.")
    else:
        logger.error("\n💥 Migration failed!")
        sys.exit(1)