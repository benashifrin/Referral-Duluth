import json
import os
import sys
import jwt
from datetime import datetime, timedelta
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.database import json_response, error_response, verify_otp_token

def handler(event, context):
    """Verify OTP and return JWT token"""
    try:
        if event.get('httpMethod') == 'OPTIONS':
            return json_response({})
        
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').strip().lower()
        token = body.get('token', '').strip()
        
        if not email or not token:
            return error_response('Email and token are required')
        
        # Verify OTP
        user = verify_otp_token(email, token)
        if not user:
            return error_response('Invalid or expired OTP', 401)
        
        # Create JWT token
        secret_key = os.environ.get('SECRET_KEY', 'dental-referral-secret-key')
        payload = {
            'user_id': user['id'],
            'email': user['email'],
            'is_admin': user['is_admin'],
            'exp': datetime.utcnow() + timedelta(days=7)
        }
        
        jwt_token = jwt.encode(payload, secret_key, algorithm='HS256')
        
        return json_response({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'is_admin': user['is_admin'],
                'referral_code': user['referral_code'],
                'total_earnings': float(user['total_earnings'])
            },
            'token': jwt_token
        })
        
    except Exception as e:
        return error_response(f'Error verifying OTP: {str(e)}', 500)