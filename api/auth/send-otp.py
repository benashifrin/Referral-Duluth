import json
import random
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.database import json_response, error_response, store_otp_token

def handler(event, context):
    """Send OTP to user's email"""
    try:
        # Parse request body
        if event.get('httpMethod') == 'OPTIONS':
            return json_response({})
        
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').strip().lower()
        
        if not email:
            return error_response('Email is required')
        
        # Generate 6-digit OTP
        otp_token = str(random.randint(100000, 999999))
        
        # For development, use demo OTP
        if os.environ.get('FLASK_ENV') != 'production':
            otp_token = '123456'
        
        # Store OTP in database
        store_otp_token(email, otp_token)
        
        # In production, send email here
        # For now, return success (demo mode)
        return json_response({
            'message': 'OTP sent successfully',
            'demo_otp': otp_token if os.environ.get('FLASK_ENV') != 'production' else None
        })
        
    except Exception as e:
        return error_response(f'Error sending OTP: {str(e)}', 500)