import resend
import os
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        # Set Resend API key
        resend.api_key = os.getenv('RESEND_API_KEY')
        self.from_email = os.getenv('EMAIL_USER', 'noreply@bestdentistduluth.com')
        
    def send_otp_email(self, recipient_email, otp_code, user=None):
        """Send OTP code via email using Resend"""
        try:
            
            # Create the HTML content
            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">🦷 Duluth Dental Center</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your login code</p>
                </div>
                
                <div style="padding: 40px 20px; text-align: center;">
                  <h2 style="color: #333; margin-bottom: 30px;">Your login code is:</h2>
                  
                  <div style="background: #f0f8ff; border: 3px solid #667eea; border-radius: 15px; padding: 30px; margin: 30px 0;">
                    <div style="font-size: 48px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 20px 0;">
                      {otp_code}
                    </div>
                  </div>
                  
                  <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 30px 0; text-align: left;">
                    <h3 style="color: #333; margin-top: 0;">HOW TO USE YOUR CODE:</h3>
                    <ol style="color: #666; font-size: 16px; line-height: 1.8;">
                      <li>Go back to the login page</li>
                      <li>Enter this 6-digit code: <strong>{otp_code}</strong></li>
                      <li>Complete your login</li>
                    </ol>
                  </div>
                  
                  
                  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #888; font-size: 12px; margin: 0;">
                      This is an automated message from Duluth Dental Center.
                    </p>
                  </div>
                </div>
              </body>
            </html>
            """
            
            # Create the plain-text alternative
            text = f"""
            Duluth Dental Center - Your login code

            Your login code is: {otp_code}

            HOW TO USE YOUR CODE:
            1. Go back to the login page
            2. Enter this 6-digit code: {otp_code}
            3. Complete your login

            This is an automated message from Duluth Dental Center.
            """
            
            # Send email via Resend API
            response = resend.Emails.send({
                "from": self.from_email,
                "to": [recipient_email],
                "subject": "Your login code for Duluth Dental Center",
                "html": html,
                "text": text
            })
            
            return True
            
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return False
    
    def send_referral_notification(self, referrer_email, referred_email, referral_status):
        """Send notification when referral status changes (no PII, no monetary claims)."""
        try:
            if referral_status == 'signed_up':
                subject = "Referral Update"
                html_content = (
                    "<html>"
                    "  <body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">"
                    "    <div style=\"background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;\">"
                    "      <h1 style=\"margin: 0; font-size: 28px;\">Referral Update</h1>"
                    "    </div>"
                    "    <div style=\"padding: 40px 20px; text-align: center;\">"
                    "      <h2 style=\"color: #333;\">Thank you for sharing your referral link.</h2>"
                    "      <p style=\"color: #666; font-size: 16px;\">A referral associated with your link has signed up. We'll notify you after their first appointment.</p>"
                    "    </div>"
                    "  </body>"
                    "</html>"
                )
            elif referral_status == 'completed':
                subject = "Referral Completed"
                html_content = (
                    "<html>"
                    "  <body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">"
                    "    <div style=\"background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;\">"
                    "      <h1 style=\"margin: 0; font-size: 28px;\">Referral Update</h1>"
                    "    </div>"
                    "    <div style=\"padding: 40px 20px; text-align: center;\">"
                    "      <h2 style=\"color: #333;\">Thanks for supporting our dental community.</h2>"
                    "      <p style=\"color: #666; font-size: 16px;\">A referral associated with your link has completed their first visit. Your dashboard has been updated.</p>"
                    "    </div>"
                    "  </body>"
                    "</html>"
                )
            
            # Create the plain-text alternative
            text = (
                "Referral Update\n\n"
                "Thank you for sharing your referral link. "
                f"Status change: {referral_status}. "
                "Visit your dashboard for details."
            )
            
            # Send email via Resend API
            response = resend.Emails.send({
                "from": self.from_email,
                "to": [referrer_email],
                "subject": subject,
                "html": html_content,
                "text": text
            })
            
            return True
            
        except Exception as e:
            print(f"Error sending referral notification: {str(e)}")
            return False

    def send_magic_link(self, recipient_email: str, url: str, user=None) -> bool:
        """Send signup link and instructions via email (replaces old magic link)"""
        try:
            # Get the login URL
            base_domain = os.getenv('CUSTOM_DOMAIN', 'https://www.bestdentistduluth.com')
            if not base_domain.startswith('http'):
                base_domain = f"https://{base_domain}"
            if base_domain.endswith('/'):
                base_domain = base_domain.rstrip('/')
            login_url = f"{base_domain}/login"
            
            # Get user's referral link if user exists
            referral_link = None
            if user and hasattr(user, 'referral_code') and user.referral_code:
                referral_link = f"{base_domain}/ref/{user.referral_code}"
            
            # Create the HTML content
            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">🦷 Welcome to Duluth Dental Center</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Join our referral program and start earning rewards</p>
                </div>
                
                <div style="padding: 40px 20px; text-align: center;">
                  <h2 style="color: #333; margin-bottom: 20px;">Hi there!</h2>
                  
                  {f'''
                  <div style="background: #fef3c7; border-radius: 10px; padding: 25px; margin: 0 0 30px 0; text-align: left;">
                    <h3 style="color: #92400e; margin-top: 0;">🔗 YOUR PERSONAL REFERRAL LINK:</h3>
                    <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center;">
                      <a href="{referral_link}" style="color: #92400e; text-decoration: none; font-weight: 600; word-break: break-all;">{referral_link}</a>
                    </div>
                    <p style="color: #92400e; font-size: 14px; margin: 10px 0 0 0;">
                      Share this link with friends and family to start earning rewards!
                    </p>
                  </div>
                  ''' if referral_link else ''}
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Thank you for your interest in joining our referral program. Getting started is easy!
                  </p>
                  
                  <div style="background: #f8f9fa; border-radius: 10px; padding: 30px; margin: 30px 0; text-align: left;">
                    <h3 style="color: #333; margin-top: 0;">HOW TO VIEW YOUR REWARDS:</h3>
                    <ol style="color: #666; font-size: 16px; line-height: 1.8;">
                      <li>Click the link below to access the signup page</li>
                      <li>Enter your email address</li>
                      <li>Enter your verification code when prompted</li>
                      <li>Access your complete dashboard to view all your referrals and track rewards</li>
                    </ol>
                  </div>
                  
                  <div style="margin: 40px 0;">
                    <a href="{login_url}" style="background: #667eea; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; display: inline-block;">
                      Click here to view your dashboard
                    </a>
                  </div>
                  
                  <div style="background: #e8f5e8; border-radius: 10px; padding: 25px; margin: 30px 0; text-align: left;">
                    <h3 style="color: #2d5016; margin-top: 0;">WHAT YOU'LL GET:</h3>
                    <ul style="color: #2d5016; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Earn rewards for each successful referral</li>
                      <li>Complete dashboard to view all your referrals</li>
                      <li>Track referral status and reward history</li>
                      <li>See when friends complete their first visit</li>
                    </ul>
                  </div>
                  
                  <div style="background: #f0f8ff; border-radius: 10px; padding: 25px; margin: 30px 0; text-align: left;">
                    <h3 style="color: #1e40af; margin-top: 0;">NEED HELP?</h3>
                    <p style="color: #1e40af; font-size: 16px; margin: 0;">
                      Call us at <strong>(770) 232-5255</strong> during office hours:<br>
                      Monday - Thursday: 8:00 AM - 4:00 PM
                    </p>
                  </div>
                  
                  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #888; font-size: 12px; margin: 0;">
                      This is an automated message from Duluth Dental Center.
                    </p>
                  </div>
                </div>
              </body>
            </html>
            """
            
            # Create the plain-text alternative
            text = f"""
            Welcome to Duluth Dental Center Referral Program

            Hi there!

            {f'''YOUR PERSONAL REFERRAL LINK:
            {referral_link}
            
            Share this link with friends and family to start earning rewards!
            
            ''' if referral_link else ''}Thank you for your interest in joining our referral program. Getting started is easy!

            HOW TO VIEW YOUR REWARDS:
            1. Click the link below to access the signup page
            2. Enter your email address
            3. Enter your verification code when prompted
            4. Access your complete dashboard to view all your referrals and track rewards

            SIGN UP HERE: {login_url}

            WHAT YOU'LL GET:
            • Earn rewards for each successful referral
            • Complete dashboard to view all your referrals
            • Track referral status and reward history  
            • See when friends complete their first visit

            NEED HELP?
            Call us at (770) 232-5255 during office hours:
            Monday - Thursday: 8:00 AM - 4:00 PM

            This is an automated message from Duluth Dental Center.
            """

            resend.Emails.send({
                "from": self.from_email,
                "to": [recipient_email],
                "subject": "Welcome to Duluth Dental Center Referral Program",
                "html": html,
                "text": text,
            })
            return True
        except Exception as e:
            print(f"Error sending magic link: {str(e)}")
            return False

# Create a global instance
email_service = EmailService()