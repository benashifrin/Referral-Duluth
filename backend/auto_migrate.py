#!/usr/bin/env python3
"""
Auto-migration utility that can be imported by app.py
This will automatically add the generated_by_admin_id column if it doesn't exist
"""

import logging
from sqlalchemy import text, inspect

logger = logging.getLogger(__name__)

def ensure_generated_by_admin_id_column(db):
    """
    Ensure the generated_by_admin_id column exists in the onboarding_token table
    This is called automatically when the app starts
    """
    try:
        # Check if the column exists
        inspector = inspect(db.engine)
        columns = inspector.get_columns('onboarding_token')
        column_names = [col['name'] for col in columns]
        
        if 'generated_by_admin_id' not in column_names:
            logger.info("🔧 Auto-migration: Adding generated_by_admin_id column...")
            
            # Add the column
            db.session.execute(text("""
                ALTER TABLE onboarding_token 
                ADD COLUMN generated_by_admin_id INTEGER REFERENCES "user"(id)
            """))
            
            # Add index
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_onboarding_token_generated_by_admin_id 
                ON onboarding_token(generated_by_admin_id)
            """))
            
            db.session.commit()
            logger.info("✅ Auto-migration: generated_by_admin_id column added successfully")
            return True
        else:
            logger.debug("✅ generated_by_admin_id column already exists")
            return True
            
    except Exception as e:
        logger.warning(f"⚠️ Auto-migration failed (this is OK if column already exists): {e}")
        try:
            db.session.rollback()
        except:
            pass
        return False