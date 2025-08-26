from http.server import BaseHTTPRequestHandler
import json
import random
import os
import sys

# Add the parent directory to path so we can import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from utils.database import store_otp_token
except ImportError:
    # Fallback for testing
    def store_otp_token(email, token):
        pass

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            email = data.get('email', '').strip().lower()
            
            if not email:
                self.send_error_response('Email is required', 400)
                return
            
            # Generate 6-digit OTP
            otp_token = str(random.randint(100000, 999999))
            
            # For development, use demo OTP
            if os.environ.get('FLASK_ENV') != 'production':
                otp_token = '123456'
            
            # Store OTP in database
            try:
                store_otp_token(email, otp_token)
            except Exception as db_error:
                self.send_error_response(f'Database error: {str(db_error)}', 500)
                return
            
            # Send success response
            response_data = {
                'message': 'OTP sent successfully',
                'demo_otp': otp_token if os.environ.get('FLASK_ENV') != 'production' else None
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode())
            
        except Exception as e:
            self.send_error_response(f'Error sending OTP: {str(e)}', 500)

    def send_error_response(self, message, status_code):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        error_data = {'error': message}
        self.wfile.write(json.dumps(error_data).encode())