import json
import os
import sys
import jwt
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.database import json_response, error_response, get_user_by_email

def get_user_from_token(event):
    """Extract user from JWT token"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        secret_key = os.environ.get('SECRET_KEY', 'dental-referral-secret-key')
        
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        return get_user_by_email(payload['email'])
    except:
        return None

def handler(event, context):
    """Get current user info"""
    try:
        if event.get('httpMethod') == 'OPTIONS':
            return json_response({})
        
        user = get_user_from_token(event)
        if not user:
            return error_response('Unauthorized', 401)
        
        return json_response({
            'user': {
                'id': user['id'],
                'email': user['email'],
                'is_admin': user['is_admin'],
                'referral_code': user['referral_code'],
                'total_earnings': float(user['total_earnings'])
            }
        })
        
    except Exception as e:
        return error_response(f'Error getting user: {str(e)}', 500)