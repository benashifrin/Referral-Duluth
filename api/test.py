from http.server import BaseHTTPRequestHandler
import json
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Simple test endpoint
        response_data = {
            'message': 'API is working!',
            'timestamp': '2024-01-01',
            'environment_variables': {
                'DATABASE_URL': '✅ Set' if os.environ.get('DATABASE_URL') else '❌ Missing',
                'SECRET_KEY': '✅ Set' if os.environ.get('SECRET_KEY') else '❌ Missing',
                'FLASK_ENV': os.environ.get('FLASK_ENV', 'Not set')
            }
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response_data, indent=2).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()