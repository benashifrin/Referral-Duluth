import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime, timedelta

def get_db_connection():
    """Get database connection using Supabase connection string"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")
    
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def json_response(data, status_code=200):
    """Helper to create JSON response for Vercel functions"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true'
        },
        'body': json.dumps(data, default=str)
    }

def error_response(message, status_code=400):
    """Helper to create error response"""
    return json_response({'error': message}, status_code)

def get_user_by_email(email):
    """Get user by email address"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        return dict(user) if user else None
    finally:
        cursor.close()
        conn.close()

def create_user(email, is_admin=False):
    """Create new user with unique referral code"""
    import random
    import string
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Generate unique referral code
        while True:
            referral_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            cursor.execute("SELECT id FROM users WHERE referral_code = %s", (referral_code,))
            if not cursor.fetchone():
                break
        
        cursor.execute("""
            INSERT INTO users (email, referral_code, is_admin)
            VALUES (%s, %s, %s)
            RETURNING *
        """, (email, referral_code, is_admin))
        
        user = cursor.fetchone()
        conn.commit()
        return dict(user)
    finally:
        cursor.close()
        conn.close()

def store_otp_token(email, token):
    """Store OTP token with expiration"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Delete old tokens for this email
        cursor.execute("DELETE FROM otp_tokens WHERE email = %s", (email,))
        
        # Insert new token with 10 minute expiration
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        cursor.execute("""
            INSERT INTO otp_tokens (email, token, expires_at)
            VALUES (%s, %s, %s)
        """, (email, token, expires_at))
        
        conn.commit()
    finally:
        cursor.close()
        conn.close()

def verify_otp_token(email, token):
    """Verify OTP token and return user if valid"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM otp_tokens 
            WHERE email = %s AND token = %s AND expires_at > NOW()
        """, (email, token))
        
        otp_record = cursor.fetchone()
        if not otp_record:
            return None
        
        # Delete used token
        cursor.execute("DELETE FROM otp_tokens WHERE email = %s", (email,))
        conn.commit()
        
        # Get or create user
        user = get_user_by_email(email)
        if not user:
            user = create_user(email)
        
        return user
    finally:
        cursor.close()
        conn.close()