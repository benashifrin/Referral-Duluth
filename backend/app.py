from flask import Flask, request, jsonify, session
from flask_cors import CORS
import re
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
try:
    from email_validator import validate_email, EmailNotValidError
except ImportError:
    # Fallback if email_validator is not available
    def validate_email(email):
        class MockValidation:
            email = email
        return MockValidation()
    
    class EmailNotValidError(Exception):
        pass
import csv
from io import StringIO

# Import our models and services
from models import db, User, Referral, OTPToken, ReferralClick
from email_service_resend import email_service

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dental-referral-secret-key')
# Use DATABASE_URL from environment or fallback to SQLite
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Session configuration optimized for mobile browsers
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS only
app.config['SESSION_COOKIE_HTTPONLY'] = True  # No JavaScript access
app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # Allow cross-site cookies
app.config['SESSION_COOKIE_DOMAIN'] = None  # Don't specify domain for mobile compatibility
app.config['SESSION_COOKIE_MAX_AGE'] = 86400  # 24 hours
app.config['SESSION_COOKIE_PATH'] = '/'  # Available on all paths

# Initialize extensions
db.init_app(app)
# Custom CORS origin checker for Vercel deployments
def is_allowed_origin(origin):
    allowed_patterns = [
        r'^http://localhost:3000$',  # Local development
        r'^https://referral-duluth-frontend2.*\.vercel\.app$',  # Any Vercel deployment
        r'^https://.*-benashifrins-projects\.vercel\.app$',  # User-specific Vercel URLs
        r'^https://bestdentistduluth\.com$',  # Production domain
        r'^https://www\.bestdentistduluth\.com$'  # Production domain with www
    ]
    for pattern in allowed_patterns:
        if re.match(pattern, origin):
            return True
    return False

CORS(app, 
     supports_credentials=True, 
     origin_callback=lambda origin, *args: is_allowed_origin(origin),
     allow_headers=['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     expose_headers=['Set-Cookie'])

# Create database tables
with app.app_context():
    db.create_all()
    
    # Create admin user if it doesn't exist
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@dentaloffice.com')
    admin_user = User.query.filter_by(email=admin_email).first()
    if not admin_user:
        admin_user = User(email=admin_email, is_admin=True)
        db.session.add(admin_user)
        db.session.commit()
        print(f"Created admin user: {admin_email}")

# Health check endpoint
@app.route('/health')
@app.route('/')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Dental Referral API is running',
        'endpoints': [
            '/auth/send-otp',
            '/auth/verify-otp', 
            '/auth/logout',
            '/api/user/dashboard',
            '/api/user/referrals',
            '/admin/referrals'
        ]
    })

@app.route('/debug/email-config')
def debug_email_config():
    """Debug endpoint to check email configuration"""
    from email_service_resend import email_service
    import resend
    return jsonify({
        'email_service': 'Resend',
        'from_email': email_service.from_email,
        'api_key_set': bool(resend.api_key),
        'api_key_length': len(resend.api_key) if resend.api_key else 0,
        'env_vars': {
            'EMAIL_USER': os.getenv('EMAIL_USER'),
            'RESEND_API_KEY_SET': bool(os.getenv('RESEND_API_KEY')),
        }
    })

@app.route('/debug/network-test')
def test_railway_network():
    """Test Railway network connectivity"""
    import socket
    import smtplib
    results = {}
    
    # Test DNS resolution
    try:
        ip = socket.gethostbyname('smtp.zoho.com')
        results['dns_resolution'] = {'success': True, 'ip': ip}
    except Exception as e:
        results['dns_resolution'] = {'success': False, 'error': str(e)}
    
    # Test port connectivity
    ports_to_test = [25, 587, 465, 2525]
    results['port_tests'] = {}
    
    for port in ports_to_test:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex(('smtp.zoho.com', port))
            sock.close()
            
            results['port_tests'][str(port)] = {
                'success': result == 0,
                'result_code': result,
                'message': 'Connected' if result == 0 else f'Connection failed: {result}'
            }
        except Exception as e:
            results['port_tests'][str(port)] = {'success': False, 'error': str(e)}
    
    # Test SMTP handshake
    try:
        server = smtplib.SMTP('smtp.zoho.com', 587, timeout=5)
        response = server.ehlo()
        server.quit()
        results['smtp_handshake'] = {'success': True, 'response': str(response)}
    except Exception as e:
        results['smtp_handshake'] = {'success': False, 'error': str(e), 'error_type': type(e).__name__}
    
    return jsonify(results)

@app.route('/debug/test-resend')
def test_resend():
    """Test Resend email service"""
    from email_service_resend import email_service
    import resend
    
    steps = {}
    
    try:
        # Step 1: Check API key
        steps['step1_api_key'] = {
            'status': 'success' if resend.api_key else 'error',
            'message': 'API key configured' if resend.api_key else 'No API key set'
        }
        
        # Step 2: Test sending email
        if resend.api_key:
            steps['step2_send_test'] = {'status': 'attempting', 'action': 'Sending test email'}
            success = email_service.send_otp_email('test@example.com', '123456')
            steps['step2_send_test'] = {
                'status': 'success' if success else 'error',
                'message': 'Test email sent successfully' if success else 'Failed to send test email'
            }
        
    except Exception as e:
        steps['error'] = {
            'status': 'error',
            'error': str(e),
            'error_type': type(e).__name__
        }
    
    return jsonify(steps)

@app.route('/debug/session-status')
def debug_session_status():
    """Debug endpoint to check session status (especially for mobile)"""
    user_agent = request.headers.get('User-Agent', 'Unknown')
    is_mobile = any(mobile_indicator in user_agent.lower() for mobile_indicator in 
                   ['mobile', 'android', 'iphone', 'ipad', 'blackberry', 'windows phone'])
    
    current_user = get_current_user()
    
    session_info = {
        'is_mobile': is_mobile,
        'user_agent': user_agent,
        'cookies_received': list(request.cookies.keys()),
        'session_data': {
            'user_id': session.get('user_id'),
            'user_email': session.get('user_email'),
            'session_keys': list(session.keys())
        },
        'authenticated': current_user is not None,
        'user_email': current_user.email if current_user else None,
        'headers': {
            'Origin': request.headers.get('Origin'),
            'Referer': request.headers.get('Referer'),
            'Host': request.headers.get('Host'),
        },
        'request_info': {
            'method': request.method,
            'url': request.url,
            'scheme': request.scheme
        }
    }
    
    print(f"Session debug for {'mobile' if is_mobile else 'desktop'} user:")
    print(f"Authenticated: {current_user is not None}")
    print(f"Cookies: {list(request.cookies.keys())}")
    print(f"Session data: {dict(session)}")
    
    return jsonify(session_info)

# Helper function to validate session
def get_current_user():
    """Get current user from session"""
    user_id = session.get('user_id')
    if user_id:
        return User.query.get(user_id)
    return None

def require_auth():
    """Decorator to require authentication"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                # Mobile debugging: log failed auth attempts
                user_agent = request.headers.get('User-Agent', 'Unknown')
                is_mobile = any(mobile_indicator in user_agent.lower() for mobile_indicator in 
                               ['mobile', 'android', 'iphone', 'ipad', 'blackberry', 'windows phone'])
                
                print(f"❌ Auth failed - Endpoint: {request.endpoint}, Mobile: {is_mobile}")
                print(f"Session ID present: {'session' in request.cookies}")
                print(f"User ID in session: {session.get('user_id', 'None')}")
                print(f"Cookies received: {list(request.cookies.keys())}")
                
                return jsonify({'error': 'Authentication required'}), 401
            return f(user, *args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

def require_admin():
    """Decorator to require admin privileges"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user or not user.is_admin:
                return jsonify({'error': 'Admin privileges required'}), 403
            return f(user, *args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

# Authentication Routes
@app.route('/auth/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to user's email"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Validate email format
        try:
            validate_email(email)
        except EmailNotValidError:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Clean up expired OTP tokens
        expired_tokens = OTPToken.query.filter(OTPToken.expires_at < datetime.utcnow()).all()
        for token in expired_tokens:
            db.session.delete(token)
        
        # Create new OTP token
        otp_token = OTPToken(email=email)
        db.session.add(otp_token)
        db.session.commit()
        
        # Send email (in production, you'd want to do this asynchronously)
        try:
            print(f"Attempting to send OTP to {email} using {email_service.from_email}")
            success = email_service.send_otp_email(email, otp_token.token)
            print(f"Email send result: {success}")
            
            if success:
                return jsonify({
                    'message': 'OTP sent to your email',
                    'email': email,
                    'expires_in': 600  # 10 minutes in seconds
                })
            else:
                return jsonify({'error': 'Failed to send OTP. Please try again.'}), 500
        except Exception as e:
            print(f"Error in send_otp endpoint: {str(e)}")
            return jsonify({'error': f'Email service error: {str(e)}'}), 500
            
    except Exception as e:
        db.session.rollback()
        print(f"Error sending OTP: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/auth/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP and log in user"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        token = data.get('token', '').strip()
        
        if not email or not token:
            return jsonify({'error': 'Email and token are required'}), 400
        
        # Demo mode: Accept specific demo credentials
        demo_users = {
            'demo@example.com': '123456',
            'admin@dentaloffice.com': '123456',
            'user@demo.com': '123456'
        }
        
        is_demo_login = email in demo_users and token == demo_users[email]
        
        if not is_demo_login:
            # Regular OTP verification
            otp_token = OTPToken.query.filter_by(
                email=email,
                token=token,
                used=False
            ).first()
            
            if not otp_token or not otp_token.is_valid():
                return jsonify({'error': 'Invalid or expired OTP'}), 400
            
            # Mark token as used
            otp_token.use_token()
        
        # Find or create user
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email)
            db.session.add(user)
            db.session.commit()
        
        # Set session
        session['user_id'] = user.id
        session['user_email'] = user.email
        session.permanent = True
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'stats': user.get_referral_stats()
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error verifying OTP: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/auth/logout', methods=['POST'])
@require_auth()
def logout(user):
    """Log out current user"""
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/auth/me', methods=['GET'])
@require_auth()
def get_current_user_info(user):
    """Get current user information"""
    return jsonify({
        'user': user.to_dict(),
        'stats': user.get_referral_stats()
    })

# Referral Routes
@app.route('/api/user/dashboard', methods=['GET'])
@require_auth()
def get_dashboard(user):
    """Get user dashboard data"""
    try:
        # Mobile debugging: log request details
        user_agent = request.headers.get('User-Agent', 'Unknown')
        is_mobile = any(mobile_indicator in user_agent.lower() for mobile_indicator in 
                       ['mobile', 'android', 'iphone', 'ipad', 'blackberry', 'windows phone'])
        
        print(f"Dashboard request - User: {user.email}, Mobile: {is_mobile}")
        print(f"User-Agent: {user_agent}")
        print(f"Origin: {request.headers.get('Origin', 'None')}")
        print(f"Referer: {request.headers.get('Referer', 'None')}")
        print(f"Cookies: {len(request.cookies)} cookies present")
        
        stats = user.get_referral_stats()
        recent_referrals = user.referrals_made.order_by(Referral.created_at.desc()).limit(5).all()
        
        # Use custom domain for referral links
        domain = os.getenv('CUSTOM_DOMAIN', 'https://bestdentistduluth.com')
        if not domain.startswith('http'):
            domain = f"https://{domain}"
        if not domain.endswith('/'):
            domain += '/'
            
        dashboard_data = {
            'user': user.to_dict(),
            'stats': stats,
            'referral_link': f"{domain}ref/{user.referral_code}",
            'recent_referrals': [ref.to_dict() for ref in recent_referrals]
        }
        
        print(f"Dashboard success for {user.email} - returning {len(str(dashboard_data))} chars")
        return jsonify(dashboard_data)
        
    except Exception as e:
        print(f"Error getting dashboard: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/user/referrals', methods=['GET'])
@require_auth()
def get_user_referrals(user):
    """Get user's referrals with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        referrals = user.referrals_made.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'referrals': [ref.to_dict() for ref in referrals.items],
            'total': referrals.total,
            'pages': referrals.pages,
            'current_page': page,
            'has_next': referrals.has_next,
            'has_prev': referrals.has_prev
        })
        
    except Exception as e:
        print(f"Error getting referrals: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/ref/<referral_code>')
def track_referral_click(referral_code):
    """Track referral click and redirect to sign-up page"""
    try:
        # Find user by referral code
        referrer = User.query.filter_by(referral_code=referral_code).first()
        if not referrer:
            return "Invalid referral link", 404
        
        # Track the click
        click = ReferralClick(
            referrer_id=referrer.id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(click)
        db.session.commit()
        
        # Store referrer info in session for potential signup
        session['referrer_id'] = referrer.id
        session['referrer_code'] = referral_code
        
        # In a real app, you'd redirect to your signup page
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Welcome to Duluth Dental Center!</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 20px auto; padding: 20px; background: #f8fafc; }}
                .container {{ background: linear-gradient(135deg, #0891b2 0%, #0f766e 100%); padding: 30px; border-radius: 15px; color: white; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }}
                .form-container {{ background: white; padding: 30px; border-radius: 15px; margin-top: 20px; color: #333; box-shadow: 0 5px 20px rgba(0,0,0,0.08); }}
                .form-group {{ margin: 15px 0; text-align: left; }}
                .form-group label {{ display: block; margin-bottom: 5px; font-weight: 600; color: #374151; }}
                input {{ width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; box-sizing: border-box; }}
                input:focus {{ outline: none; border-color: #0891b2; }}
                button {{ background: #0891b2; color: white; padding: 15px 24px; border: none; border-radius: 8px; cursor: pointer; width: 100%; font-size: 16px; font-weight: 600; margin-top: 10px; }}
                button:hover {{ background: #0e7490; }}
                .process-step {{ background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0891b2; }}
                .process-number {{ display: inline-block; background: #0891b2; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; margin-right: 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🦷 Welcome to Duluth Dental Center!</h1>
                <p style="font-size: 18px; margin: 20px 0;">You've been referred by one of our valued patients!</p>
                <p style="font-size: 16px; opacity: 0.9;">Experience quality dental care in Duluth</p>
            </div>
            
            <div class="form-container">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #374151; margin-bottom: 15px;">Get Started in 2 Simple Steps</h2>
                </div>
                
                <div class="process-step">
                    <span class="process-number">1</span>
                    <strong>Share your contact information below</strong> - We'll use this to prepare for your visit
                </div>
                
                <div class="process-step">
                    <span class="process-number">2</span>
                    <strong>Call us to schedule your appointment</strong> - Our friendly staff will find the perfect time for you
                </div>
                
                <h3 style="text-align: center; color: #374151; margin: 30px 0 20px 0;">Step 1: Your Information</h3>
                
                <form onsubmit="signupReferral(event)">
                    <div class="form-group">
                        <label for="name">Full Name *</label>
                        <input type="text" id="name" placeholder="Enter your full name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="phone">Phone Number *</label>
                        <input type="tel" id="phone" placeholder="(555) 123-4567" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email Address *</label>
                        <input type="email" id="email" placeholder="your.email@example.com" required>
                    </div>
                    
                    <button type="submit">Complete Step 1 - Submit Information</button>
                </form>
                
                <p style="font-size: 13px; color: #9ca3af; margin-top: 20px; text-align: center;">
                    By submitting, you acknowledge that you were referred by another patient and agree to be contacted by Duluth Dental Center.
                </p>
            </div>
            
            <script>
                async function signupReferral(event) {{
                    event.preventDefault();
                    const name = document.getElementById('name').value;
                    const phone = document.getElementById('phone').value;
                    const email = document.getElementById('email').value;
                    
                    const submitButton = event.target.querySelector('button[type="submit"]');
                    const originalText = submitButton.textContent;
                    submitButton.textContent = 'Submitting...';
                    submitButton.disabled = true;
                    
                    try {{
                        const response = await fetch('/api/referral/signup', {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json' }},
                            body: JSON.stringify({{ 
                                name: name,
                                phone: phone,
                                email: email 
                            }})
                        }});
                        
                        const result = await response.json();
                        if (response.ok) {{
                            document.querySelector('.form-container').innerHTML = `
                                <div style="text-align: center; padding: 40px 20px;">
                                    <div style="background: #dcfce7; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 2px solid #16a34a;">
                                        <h2 style="color: #16a34a; margin-bottom: 15px;">✅ Step 1 Complete!</h2>
                                        <p style="font-size: 16px; color: #166534; margin: 0;">Thank you, ${{name}}! We've received your information.</p>
                                    </div>
                                    
                                    <div style="background: #0891b2; color: white; padding: 30px; border-radius: 15px; margin: 20px 0;">
                                        <h2 style="margin: 0 0 15px 0; font-size: 28px;">📞 Step 2: Call Us Now!</h2>
                                        <div style="font-size: 32px; font-weight: bold; margin: 15px 0; letter-spacing: 2px;">(218) 722-1000</div>
                                        <p style="font-size: 16px; margin: 15px 0; opacity: 0.9;">Speak with our scheduling team to book your appointment</p>
                                        <a href="tel:+12187221000" style="background: #0f766e; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; display: inline-block; margin: 10px 0;">📞 Call Duluth Dental Center</a>
                                    </div>
                                    
                                    <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0; color: #374151;">
                                        <p style="margin: 0; font-size: 14px;"><strong>Office Hours:</strong></p>
                                        <p style="margin: 5px 0; font-size: 14px;">Monday - Friday: 8:00 AM - 5:00 PM</p>
                                        <p style="margin: 5px 0; font-size: 14px;">We're ready to schedule your appointment!</p>
                                    </div>
                                </div>
                            `;
                        }} else {{
                            alert(result.error || 'An error occurred. Please try again or call us at (218) 722-1000');
                            submitButton.textContent = originalText;
                            submitButton.disabled = false;
                        }}
                    }} catch (error) {{
                        alert('Network error. Please try again or call us at (218) 722-1000');
                        submitButton.textContent = originalText;
                        submitButton.disabled = false;
                    }}
                }}
            </script>
        </body>
        </html>
        """
        
    except Exception as e:
        print(f"Error tracking referral click: {str(e)}")
        return "Error processing referral link", 500

@app.route('/api/referral/signup', methods=['POST'])
def signup_referral():
    """Process referral signup"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip().lower()
        
        # Validate required fields
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        if not phone:
            return jsonify({'error': 'Phone number is required'}), 400
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Validate email format
        try:
            validate_email(email)
        except EmailNotValidError:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Check if there's a referrer in session
        referrer_id = session.get('referrer_id')
        if not referrer_id:
            return jsonify({'error': 'No referral information found'}), 400
        
        referrer = User.query.get(referrer_id)
        if not referrer:
            return jsonify({'error': 'Invalid referrer'}), 400
        
        # Check if this email already has a referral from this referrer
        existing_referral = Referral.query.filter_by(
            referrer_id=referrer_id,
            referred_email=email
        ).first()
        
        if existing_referral:
            return jsonify({'error': 'This person has already been referred by this user'}), 400
        
        # Create referral record
        referral = Referral(referrer_id=referrer_id, referred_email=email)
        referral.referred_name = name
        referral.referred_phone = phone
        referral.status = 'signed_up'
        db.session.add(referral)
        db.session.commit()
        
        # Send notification to referrer with detailed info
        referral_info = f"{name} ({email})"
        if phone:
            referral_info += f" - Phone: {phone}"
        
        email_service.send_referral_notification(
            referrer.email, 
            referral_info, 
            'signed_up'
        )
        
        return jsonify({
            'message': 'Referral recorded successfully',
            'referral': referral.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error processing referral signup: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Admin Routes
@app.route('/admin/referrals', methods=['GET'])
@require_admin()
def get_all_referrals(user):
    """Get all referrals for admin"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status_filter = request.args.get('status', '')
        
        query = Referral.query
        if status_filter:
            query = query.filter_by(status=status_filter)
        
        referrals = query.order_by(Referral.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Include referrer information
        results = []
        for referral in referrals.items:
            referral_dict = referral.to_dict()
            referral_dict['referrer'] = referral.referrer.to_dict()
            results.append(referral_dict)
        
        return jsonify({
            'referrals': results,
            'total': referrals.total,
            'pages': referrals.pages,
            'current_page': page,
            'has_next': referrals.has_next,
            'has_prev': referrals.has_prev
        })
        
    except Exception as e:
        print(f"Error getting admin referrals: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/admin/referral/<int:referral_id>/complete', methods=['PUT'])
@require_admin()
def complete_referral(user, referral_id):
    """Mark referral as completed"""
    try:
        referral = Referral.query.get_or_404(referral_id)
        
        if referral.mark_completed():
            db.session.commit()
            
            # Send notification to referrer
            email_service.send_referral_notification(
                referral.referrer.email,
                referral.referred_email,
                'completed'
            )
            
            return jsonify({
                'message': 'Referral marked as completed',
                'referral': referral.to_dict()
            })
        else:
            return jsonify({'error': 'Referral cannot be completed (may already be completed or user has reached annual limit)'}), 400
            
    except Exception as e:
        db.session.rollback()
        print(f"Error completing referral: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/admin/export', methods=['GET'])
@require_admin()
def export_referrals(user):
    """Export referrals to CSV"""
    try:
        referrals = Referral.query.all()
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Referrer Email', 'Referrer Code', 'Referred Email', 
            'Status', 'Earnings', 'Created At', 'Completed At'
        ])
        
        # Write data
        for referral in referrals:
            writer.writerow([
                referral.id,
                referral.referrer.email,
                referral.referrer.referral_code,
                referral.referred_email,
                referral.status,
                referral.earnings,
                referral.created_at.isoformat(),
                referral.completed_at.isoformat() if referral.completed_at else ''
            ])
        
        output.seek(0)
        
        from flask import Response
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=referrals_export.csv'}
        )
        
    except Exception as e:
        print(f"Error exporting referrals: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/admin/stats', methods=['GET'])
@require_admin()
def get_admin_stats(user):
    """Get admin dashboard statistics"""
    try:
        total_users = User.query.count()
        total_referrals = Referral.query.count()
        completed_referrals = Referral.query.filter_by(status='completed').count()
        pending_referrals = Referral.query.filter_by(status='pending').count()
        signed_up_referrals = Referral.query.filter_by(status='signed_up').count()
        
        total_earnings_paid = db.session.query(db.func.sum(Referral.earnings)).filter_by(status='completed').scalar() or 0
        
        return jsonify({
            'total_users': total_users,
            'total_referrals': total_referrals,
            'completed_referrals': completed_referrals,
            'pending_referrals': pending_referrals,
            'signed_up_referrals': signed_up_referrals,
            'total_earnings_paid': total_earnings_paid
        })
        
    except Exception as e:
        print(f"Error getting admin stats: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)