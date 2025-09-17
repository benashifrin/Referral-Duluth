import resend
import os
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        # Set Resend API key
        resend.api_key = os.getenv('RESEND_API_KEY')
        self.from_email = os.getenv('EMAIL_USER', 'noreply@bestdentistduluth.com')
        
    def send_otp_email(self, recipient_email, otp_code):
        """Send signup link and instructions via email using Resend"""
        try:
            # Get the login URL
            base_domain = os.getenv('CUSTOM_DOMAIN', 'https://www.bestdentistduluth.com')
            if not base_domain.startswith('http'):
                base_domain = f"https://{base_domain}"
            if base_domain.endswith('/'):
                base_domain = base_domain.rstrip('/')
            login_url = f"{base_domain}/login"
            
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
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Thank you for your interest in joining our referral program. Getting started is easy!
                  </p>
                  
                  <div style="background: #f8f9fa; border-radius: 10px; padding: 30px; margin: 30px 0; text-align: left;">
                    <h3 style="color: #333; margin-top: 0;">HOW TO SIGN UP:</h3>
                    <ol style="color: #666; font-size: 16px; line-height: 1.8;">
                      <li>Click the link below to access the signup page</li>
                      <li>Enter your email address</li>
                      <li>Enter your verification code when prompted</li>
                      <li>Access your complete dashboard to view all your referrals and track rewards</li>
                    </ol>
                  </div>
                  
                  <div style="margin: 40px 0;">
                    <a href="{login_url}" style="background: #667eea; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; display: inline-block;">
                      🚀 CLICK HERE TO SIGN UP
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

            Thank you for your interest in joining our referral program. Getting started is easy!

            HOW TO SIGN UP:
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
            
            # Send email via Resend API
            response = resend.Emails.send({
                "from": self.from_email,
                "to": [recipient_email],
                "subject": "Welcome to Duluth Dental Center Referral Program",
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
                    "      <p style=\"color: #666; font-size: 16px;\">A referral associated with your link has signed up. We’ll notify you after their first appointment.</p>"
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

    def send_magic_link(self, recipient_email: str, url: str) -> bool:
        """Send a short-lived magic link to the referral page and include dashboard login instructions."""
        try:
            # Build dashboard login URL from CUSTOM_DOMAIN (defaults to production host)
            base = os.getenv('CUSTOM_DOMAIN', 'https://bestdentistduluth.com')
            if not base.startswith('http'):
                base = f"https://{base}"
            if base.endswith('/'):
                login_url = base + 'login'
            else:
                login_url = base + '/login'
            html = f"""
            <html>
              <body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">
                <div style=\"background: linear-gradient(135deg, #3EB489 0%, #1E90FF 100%); padding: 24px; border-radius: 10px; color: white; text-align: center;\">
                  <h2 style=\"margin: 0;\">Duluth Dental Center</h2>
                  <p style=\"margin: 8px 0 0; opacity: .9;\">Referral Program Access</p>
                </div>
                <div style=\"padding: 24px;\">
                  <p style=\"color: #333;\">Tap the button to view your referral details. This link expires in about 2 minutes.</p>
                  <p style=\"margin: 24px 0;\">
                    <a href=\"{url}\" style=\"display: inline-block; background: #3EB489; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;\">Open Referral Page</a>
                  </p>
                  <p style=\"color: #666; font-size: 12px;\">If the button does not work, copy and paste this link into your browser:<br/>
                  <span style=\"word-break: break-all;\">{url}</span></p>
                </div>

                <div style=\"padding: 24px; border-top: 1px solid #eee;\">
                  <h3 style=\"margin: 0 0 10px; color: #333;\">Access Your Referral Dashboard</h3>
                  <ol style=\"color: #444; font-size: 14px; line-height: 1.6; padding-left: 18px;\">
                    <li>Open your dashboard: <a href=\"{login_url}\">{login_url}</a></li>
                    <li>Sign in with your email and password.</li>
                    <li>If it’s your first time or you don’t have a password yet, choose “First time or no password? Use a code” and follow the steps to set a password.</li>
                  </ol>
                  <p style=\"margin: 16px 0;\">
                    <a href=\"{login_url}\" style=\"display: inline-block; background: #1E90FF; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: bold;\">Open Dashboard</a>
                  </p>
                </div>
              </body>
            </html>
            """
            text = (
                f"Open your referral page (expires soon):\n{url}\n\n"
                f"Access your referral dashboard:\n{login_url}\n"
                "- Sign in with your email and password.\n"
                "- First time? Choose ‘Use a code’ to set a password.\n"
            )

            resend.Emails.send({
                "from": self.from_email,
                "to": [recipient_email],
                "subject": "Your Duluth Dental Center referral link + dashboard access",
                "html": html,
                "text": text,
            })
            return True
        except Exception as e:
            print(f"Error sending magic link: {str(e)}")
            return False

# Create a global instance
email_service = EmailService()
