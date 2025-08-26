import json
import os
import sys
import jwt
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.database import json_response, error_response, get_db_connection, get_user_by_email

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
    """Get user dashboard data"""
    try:
        if event.get('httpMethod') == 'OPTIONS':
            return json_response({})
        
        user = get_user_from_token(event)
        if not user:
            return error_response('Unauthorized', 401)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get referral stats
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_referrals,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_referrals,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_referrals,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN reward_amount ELSE 0 END), 0) as total_earned
                FROM referrals 
                WHERE referrer_id = %s
            """, (user['id'],))
            
            stats = cursor.fetchone()
            
            # Get recent referrals
            cursor.execute("""
                SELECT email, status, reward_amount, created_at, completed_at
                FROM referrals 
                WHERE referrer_id = %s
                ORDER BY created_at DESC
                LIMIT 10
            """, (user['id'],))
            
            recent_referrals = cursor.fetchall()
            
            return json_response({
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'referral_code': user['referral_code'],
                    'total_earnings': float(user['total_earnings'])
                },
                'stats': {
                    'total_referrals': stats['total_referrals'],
                    'completed_referrals': stats['completed_referrals'],
                    'pending_referrals': stats['pending_referrals'],
                    'total_earned': float(stats['total_earned'])
                },
                'recent_referrals': [dict(r) for r in recent_referrals]
            })
            
        finally:
            cursor.close()
            conn.close()
        
    except Exception as e:
        return error_response(f'Error getting dashboard: {str(e)}', 500)