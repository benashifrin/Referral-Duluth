#!/usr/bin/env python3
"""
Debug script to test the OTP endpoint
"""
import requests
import json
import time
from threading import Thread
import subprocess
import sys
import os

def start_server():
    """Start the Flask server in background"""
    os.chdir('/Users/benjaminshifrin/Downloads/2023q1/Javascript_Projects/Refferal_Trackerv2/backend')
    subprocess.run([sys.executable, 'app.py'])

def test_otp_endpoint():
    """Test the OTP endpoint"""
    print("Waiting for server to start...")
    time.sleep(3)
    
    # Test data
    test_data = {"email": "test@example.com"}
    
    try:
        print("Testing OTP endpoint...")
        response = requests.post(
            'http://localhost:5001/auth/send-otp',
            json=test_data,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 500:
            print("❌ 500 Internal Server Error - Check backend logs")
        elif response.status_code == 200:
            print("✅ OTP endpoint working correctly")
        else:
            print(f"⚠️  Unexpected status code: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server")
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")

if __name__ == "__main__":
    print("🔍 Debug Script - Testing OTP Endpoint")
    print("=" * 50)
    
    # Start server in background
    server_thread = Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Test the endpoint
    test_otp_endpoint()