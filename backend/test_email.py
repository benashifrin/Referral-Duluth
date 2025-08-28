#!/usr/bin/env python3
"""
Test script to verify Zoho email functionality
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from email_service import email_service
from dotenv import load_dotenv

load_dotenv()

def test_otp_email():
    """Test sending OTP email"""
    print("Testing OTP email functionality...")
    print(f"SMTP Server: {email_service.smtp_server}")
    print(f"SMTP Port: {email_service.smtp_port}")
    print(f"Email User: {email_service.email_user}")
    print(f"Using Password: {'*' * len(email_service.email_password) if email_service.email_password else 'NOT SET'}")
    print()
    
    # Test email address - using demo email for automated testing
    test_email = "demo@example.com"
    print(f"Testing with email: {test_email}")
    
    # Send test OTP
    test_otp = "123456"
    success = email_service.send_otp_email(test_email, test_otp)
    
    if success:
        print(f"✅ OTP email sent successfully to {test_email}")
        return True
    else:
        print(f"❌ Failed to send OTP email to {test_email}")
        return False

def test_referral_notification():
    """Test sending referral notification email"""
    print("\nTesting referral notification email...")
    
    test_email = "demo@example.com"
    print(f"Testing referral notification with email: {test_email}")
    
    # Send test referral notification
    success = email_service.send_referral_notification(
        test_email,
        "testuser@example.com", 
        "signed_up"
    )
    
    if success:
        print(f"✅ Referral notification sent successfully to {test_email}")
        return True
    else:
        print(f"❌ Failed to send referral notification to {test_email}")
        return False

if __name__ == "__main__":
    print("🦷 Duluth Dental Center - Email Test Script")
    print("=" * 50)
    
    if not email_service.email_user or not email_service.email_password:
        print("❌ Email credentials not configured properly!")
        print("Please check your .env file has:")
        print("EMAIL_USER=noreply@bestdentistduluth.com")
        print("EMAIL_PASSWORD=bDNr2ct9L4Nj")
        sys.exit(1)
    
    # Test OTP email
    otp_success = test_otp_email()
    
    # Test referral notification
    notification_success = test_referral_notification()
    
    print("\n" + "=" * 50)
    print("📧 EMAIL TEST SUMMARY:")
    print(f"OTP Email: {'✅ PASS' if otp_success else '❌ FAIL'}")
    print(f"Referral Notification: {'✅ PASS' if notification_success else '❌ FAIL'}")
    
    if otp_success and notification_success:
        print("\n🎉 All email tests passed! Your Zoho email configuration is working correctly.")
    else:
        print("\n⚠️  Some email tests failed. Please check your Zoho SMTP configuration.")
        print("Make sure:")
        print("1. Your Zoho account allows SMTP access")
        print("2. The App Password is correct")
        print("3. Your internet connection is stable")