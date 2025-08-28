#!/usr/bin/env python3
"""
Step-by-step SMTP testing to isolate authentication issues
"""
import smtplib
import ssl
import os
from dotenv import load_dotenv

load_dotenv()

def test_smtp_connection():
    """Test each step of SMTP connection"""
    
    # Get credentials
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.zoho.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    email_user = os.getenv('EMAIL_USER', 'noreply@bestdentistduluth.com')
    email_password = os.getenv('EMAIL_PASSWORD')
    
    print("🔍 SMTP Connection Test")
    print("=" * 50)
    print(f"Server: {smtp_server}")
    print(f"Port: {smtp_port}")
    print(f"Username: {email_user}")
    print(f"Password: {'*' * len(email_password) if email_password else 'NOT SET'}")
    print()
    
    if not email_password:
        print("❌ EMAIL_PASSWORD is not set!")
        return False
    
    try:
        print("📡 Step 1: Connecting to SMTP server...")
        server = smtplib.SMTP(smtp_server, smtp_port)
        print("✅ Connected successfully")
        
        print("🔒 Step 2: Starting TLS...")
        context = ssl.create_default_context()
        server.starttls(context=context)
        print("✅ TLS started successfully")
        
        print("🔑 Step 3: Attempting login...")
        server.login(email_user, email_password)
        print("✅ Login successful!")
        
        print("📧 Step 4: Testing EHLO...")
        response = server.ehlo()
        print(f"✅ EHLO response: {response}")
        
        server.quit()
        print("\n🎉 All SMTP tests passed! Your credentials are working.")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Authentication Error: {e}")
        print("\n🔧 Possible fixes:")
        print("1. Check if App Password is correct")
        print("2. Verify SMTP is enabled in Zoho")
        print("3. Try creating a new App Password")
        return False
        
    except smtplib.SMTPConnectError as e:
        print(f"❌ Connection Error: {e}")
        print("\n🔧 Possible fixes:")
        print("1. Check server name and port")
        print("2. Check internet connection")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

def test_alternative_settings():
    """Test with alternative Zoho SMTP settings"""
    print("\n" + "=" * 50)
    print("🔄 Testing Alternative Zoho Settings")
    print("=" * 50)
    
    # Alternative settings to try
    alternatives = [
        {"server": "smtp.zoho.com", "port": 465, "ssl": True},
        {"server": "smtp.zoho.com", "port": 587, "ssl": False},
    ]
    
    email_user = os.getenv('EMAIL_USER', 'noreply@bestdentistduluth.com')
    email_password = os.getenv('EMAIL_PASSWORD')
    
    for i, alt in enumerate(alternatives, 1):
        print(f"\n🧪 Alternative {i}: {alt['server']}:{alt['port']} (SSL: {alt['ssl']})")
        
        try:
            if alt['ssl']:
                # Use SSL connection
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(alt['server'], alt['port'], context=context)
            else:
                # Use regular SMTP with STARTTLS
                server = smtplib.SMTP(alt['server'], alt['port'])
                server.starttls()
                
            server.login(email_user, email_password)
            print(f"✅ Alternative {i} works!")
            server.quit()
            return alt
            
        except Exception as e:
            print(f"❌ Alternative {i} failed: {e}")
    
    return None

if __name__ == "__main__":
    success = test_smtp_connection()
    
    if not success:
        print("\n" + "⚠️" * 20)
        print("Primary settings failed. Trying alternatives...")
        test_alternative_settings()