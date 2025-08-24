import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', 587))
        self.email_user = os.getenv('EMAIL_USER')
        self.email_password = os.getenv('EMAIL_PASSWORD')
        
    def send_otp_email(self, recipient_email, otp_code):
        """Send OTP code via email"""
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = "Your Dental Office Referral Program Login Code"
            message["From"] = self.email_user
            message["To"] = recipient_email
            
            # Create the HTML content
            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">🦷 Dental Referral Program</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your login verification code</p>
                </div>
                
                <div style="padding: 40px 20px; text-align: center;">
                  <h2 style="color: #333; margin-bottom: 20px;">Your verification code is:</h2>
                  
                  <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 30px; margin: 30px 0;">
                    <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px;">{otp_code}</span>
                  </div>
                  
                  <p style="color: #666; font-size: 14px; line-height: 1.5;">
                    This code will expire in <strong>10 minutes</strong>.<br>
                    If you didn't request this code, please ignore this email.
                  </p>
                  
                  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #888; font-size: 12px; margin: 0;">
                      This is an automated message from your Dental Office Referral Program.
                    </p>
                  </div>
                </div>
              </body>
            </html>
            """
            
            # Create the plain-text alternative
            text = f"""
            Dental Office Referral Program
            
            Your verification code is: {otp_code}
            
            This code will expire in 10 minutes.
            If you didn't request this code, please ignore this email.
            
            This is an automated message from your Dental Office Referral Program.
            """
            
            # Turn these into plain/html MIMEText objects
            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html, "html")
            
            # Add HTML/plain-text parts to MIMEMultipart message
            message.attach(part1)
            message.attach(part2)
            
            # Create secure connection and send email
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.email_user, self.email_password)
                text = message.as_string()
                server.sendmail(self.email_user, recipient_email, text)
            
            return True
            
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return False
    
    def send_referral_notification(self, referrer_email, referred_email, referral_status):
        """Send notification when referral status changes"""
        try:
            message = MIMEMultipart("alternative")
            message["From"] = self.email_user
            message["To"] = referrer_email
            
            if referral_status == 'signed_up':
                message["Subject"] = "Great News! Your Referral Signed Up"
                html_content = f"""
                <html>
                  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
                      <h1 style="margin: 0; font-size: 28px;">🎉 Referral Update</h1>
                    </div>
                    
                    <div style="padding: 40px 20px; text-align: center;">
                      <h2 style="color: #333;">Someone used your referral link!</h2>
                      <p style="color: #666; font-size: 16px;">
                        <strong>{referred_email}</strong> has signed up using your referral link.
                        Once they complete their first appointment, you'll earn <strong>$50</strong>!
                      </p>
                      <div style="margin: 30px 0; padding: 20px; background: #f0f8ff; border-radius: 10px;">
                        <p style="margin: 0; color: #333; font-size: 14px;">
                          We'll notify you when they complete their appointment and your earnings are confirmed.
                        </p>
                      </div>
                    </div>
                  </body>
                </html>
                """
            elif referral_status == 'completed':
                message["Subject"] = "🎉 You Earned $50! Referral Completed"
                html_content = f"""
                <html>
                  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
                      <h1 style="margin: 0; font-size: 28px;">💰 Congratulations!</h1>
                    </div>
                    
                    <div style="padding: 40px 20px; text-align: center;">
                      <h2 style="color: #333;">You earned $50!</h2>
                      <p style="color: #666; font-size: 16px;">
                        <strong>{referred_email}</strong> has completed their first appointment.
                        Your referral earnings have been updated!
                      </p>
                      <div style="margin: 30px 0; padding: 20px; background: #f0f8ff; border-radius: 10px;">
                        <p style="margin: 0; color: #333; font-size: 14px;">
                          Keep sharing your referral link to earn more. You can earn up to $500 per year!
                        </p>
                      </div>
                    </div>
                  </body>
                </html>
                """
            
            # Create the plain-text alternative
            text = f"Your referral {referred_email} status has been updated to: {referral_status}"
            
            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html_content, "html")
            
            message.attach(part1)
            message.attach(part2)
            
            # Send email
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.email_user, self.email_password)
                text = message.as_string()
                server.sendmail(self.email_user, referrer_email, text)
            
            return True
            
        except Exception as e:
            print(f"Error sending referral notification: {str(e)}")
            return False

# Create a global instance
email_service = EmailService()