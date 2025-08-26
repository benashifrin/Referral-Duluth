from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import jwt

# Add the parent directory to path so we can import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from utils.database import get_user_by_email
except ImportError:
    # Fallback for testing
    def get_user_by_email(email):
        return None

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        try:
            # Get user from token
            user = self.get_user_from_token()
            if not user:
                self.send_error_response('Unauthorized', 401)
                return
            
            # Send success response
            response_data = {
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'is_admin': user['is_admin'],
                    'referral_code': user['referral_code'],
                    'total_earnings': float(user['total_earnings'])
                }
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode())
            
        except Exception as e:
            self.send_error_response(f'Error getting user: {str(e)}', 500)

    def get_user_from_token(self):
        """Extract user from JWT token"""
        try:
            auth_header = self.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return None
            
            token = auth_header.split(' ')[1]
            secret_key = os.environ.get('SECRET_KEY', 'dental-referral-secret-key')
            
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            return get_user_by_email(payload['email'])
        except:
            return None

    def send_error_response(self, message, status_code):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        error_data = {'error': message}
        self.wfile.write(json.dumps(error_data).encode())