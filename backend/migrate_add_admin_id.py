#!/usr/bin/env python3
"""
Migration script to add generated_by_admin_id column to onboarding_token table
Run this script to update the production database schema.
"""

import os
import sys
from sqlalchemy import text

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app, db
    print("✅ Successfully imported Flask app")
except ImportError as e:
    print(f"❌ Failed to import app: {e}")
    sys.exit(1)

def run_migration():
    """Add generated_by_admin_id column to onboarding_token table"""
    
    with app.app_context():
        try:
            print("🔍 Checking current database schema...")
            
            # Check if the column already exists
            result = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'onboarding_token' 
                AND column_name = 'generated_by_admin_id'
            """)).fetchone()
            
            if result:
                print("✅ Column 'generated_by_admin_id' already exists. Nothing to do.")
                return True
            
            print("🔧 Adding generated_by_admin_id column...")
            
            # Add the column
            db.session.execute(text("""
                ALTER TABLE onboarding_token 
                ADD COLUMN generated_by_admin_id INTEGER REFERENCES "user"(id)
            """))
            
            # Add index for performance
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_onboarding_token_generated_by_admin_id 
                ON onboarding_token(generated_by_admin_id)
            """))
            
            # Commit the changes
            db.session.commit()
            
            print("✅ Successfully added generated_by_admin_id column and index")
            
            # Verify the column was added
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'onboarding_token' 
                AND column_name = 'generated_by_admin_id'
            """)).fetchone()
            
            if result:
                print(f"✅ Verification successful: {result[0]} ({result[1]}, nullable: {result[2]})")
                return True
            else:
                print("❌ Verification failed: Column not found after migration")
                return False
                
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            db.session.rollback()
            return False

if __name__ == "__main__":
    print("🚀 Starting database migration...")
    print(f"📊 Database URL: {app.config.get('SQLALCHEMY_DATABASE_URI', 'Not set')}")
    
    success = run_migration()
    
    if success:
        print("\n🎉 Migration completed successfully!")
        print("You can now generate QR codes with admin tracking.")
    else:
        print("\n💥 Migration failed!")
        sys.exit(1)