#!/usr/bin/env python3
"""
Test Railway network connectivity for SMTP
"""
import socket
import ssl
import smtplib
import time
import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/debug/network-test')
def test_railway_network():
    """Test network connectivity from Railway"""
    results = {}
    
    # Test 1: Basic DNS resolution
    try:
        import socket
        ip = socket.gethostbyname('smtp.zoho.com')
        results['dns_resolution'] = {'success': True, 'ip': ip}
    except Exception as e:
        results['dns_resolution'] = {'success': False, 'error': str(e)}
    
    # Test 2: Port connectivity
    ports_to_test = [25, 587, 465, 2525]
    results['port_tests'] = {}
    
    for port in ports_to_test:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            result = sock.connect_ex(('smtp.zoho.com', port))
            sock.close()
            
            results['port_tests'][str(port)] = {
                'success': result == 0,
                'result_code': result,
                'message': 'Connected' if result == 0 else f'Connection failed: {result}'
            }
        except Exception as e:
            results['port_tests'][str(port)] = {
                'success': False, 
                'error': str(e)
            }
    
    # Test 3: SMTP handshake
    try:
        server = smtplib.SMTP('smtp.zoho.com', 587, timeout=10)
        response = server.ehlo()
        server.quit()
        results['smtp_handshake'] = {
            'success': True,
            'response': str(response)
        }
    except Exception as e:
        results['smtp_handshake'] = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }
    
    # Test 4: Environment info
    results['environment'] = {
        'platform': os.name,
        'python_version': os.sys.version,
        'railway_env_vars': {
            'RAILWAY_ENVIRONMENT': os.getenv('RAILWAY_ENVIRONMENT'),
            'RAILWAY_PROJECT_ID': os.getenv('RAILWAY_PROJECT_ID'),
            'RAILWAY_SERVICE_NAME': os.getenv('RAILWAY_SERVICE_NAME')
        }
    }
    
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, port=5002)