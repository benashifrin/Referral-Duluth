#!/usr/bin/env python3
"""
Test SMTP with manually entered credentials to verify they work
"""
import smtplib
import ssl

def test_manual_credentials():
    """Test with manually entered credentials"""
    print("🔑 Manual Credential Test")
    print("=" * 50)
    print("This will test your exact credentials manually...")
    print()
    
    # Use the exact credentials you provided
    smtp_server = "smtp.zoho.com"
    smtp_port = 587
    email_user = "noreply@bestdentistduluth.com"
    email_password = "bDNr2ct9L4Nj"
    
    print(f"Testing with:")
    print(f"Server: {smtp_server}:{smtp_port}")
    print(f"Username: {email_user}")
    print(f"Password: {email_password}")
    print()
    
    try:
        print("📡 Connecting...")
        server = smtplib.SMTP(smtp_server, smtp_port)
        
        print("🔒 Starting TLS...")
        context = ssl.create_default_context()
        server.starttls(context=context)
        
        print("🔑 Attempting login...")
        server.login(email_user, email_password)
        
        print("✅ SUCCESS! Manual credentials work perfectly.")
        server.quit()
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Authentication still failed: {e}")
        print()
        print("🚨 This means one of:")
        print("1. The App Password 'bDNr2ct9L4Nj' is wrong/expired")
        print("2. The email 'noreply@bestdentistduluth.com' doesn't exist")
        print("3. SMTP is disabled for this Zoho account")
        print("4. The account requires different authentication")
        return False
        
    except Exception as e:
        print(f"❌ Other error: {e}")
        return False

def test_env_vs_manual():
    """Compare environment variables with manual values"""
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    print("\n" + "=" * 50)
    print("🔍 Environment vs Manual Comparison")
    print("=" * 50)
    
    env_user = os.getenv('EMAIL_USER')
    env_password = os.getenv('EMAIL_PASSWORD')
    
    manual_user = "noreply@bestdentistduluth.com"
    manual_password = "bDNr2ct9L4Nj"
    
    print(f"ENV EMAIL_USER: '{env_user}'")
    print(f"MANUAL USER:    '{manual_user}'")
    print(f"Match: {env_user == manual_user}")
    print()
    
    print(f"ENV PASSWORD: '{env_password}'")
    print(f"MANUAL PASS:  '{manual_password}'")
    print(f"Match: {env_password == manual_password}")
    
    if env_user != manual_user or env_password != manual_password:
        print("\n❌ Environment variables don't match expected values!")
        print("Check your .env file")

if __name__ == "__main__":
    test_manual_credentials()
    test_env_vs_manual()