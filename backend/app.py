from flask import Flask, request, jsonify, session, make_response, redirect, Response, stream_with_context
from flask_cors import CORS
import re
import json
from queue import Queue
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import logging
import sys
import uuid
import base64
from io import BytesIO
from werkzeug.security import generate_password_hash, check_password_hash
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
from sqlalchemy import inspect, text
from flask_socketio import SocketIO, emit, join_room
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Import our models and services
from models import db, User, Referral, OTPToken, ReferralClick, QREvent, OnboardingToken
from email_service_resend import email_service

# Load environment variables
load_dotenv()

# Configure comprehensive logging for Railway
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
PRODUCTION = os.getenv('FLASK_ENV') == 'production'
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dental-referral-secret-key')
# Use DATABASE_URL from environment or fallback to SQLite
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Mobile-compatible session configuration
# Configure cookie security with dev overrides to allow local HTTP sessions
def _bool_env(name, default=False):
    v = os.getenv(name)
    if v is None:
        return default
    return str(v).strip().lower() in ('1', 'true', 'yes', 'on')

# Default: secure in production, but allow opt-out via DEV_INSECURE_COOKIES=1
default_secure = (os.getenv('FLASK_ENV') == 'production') and not _bool_env('DEV_INSECURE_COOKIES', False)
app.config['SESSION_COOKIE_SECURE'] = _bool_env('SESSION_COOKIE_SECURE', default_secure)
default_samesite = 'None' if app.config['SESSION_COOKIE_SECURE'] else 'Lax'
# Allow override via env; otherwise use computed default
app.config['SESSION_COOKIE_SAMESITE'] = os.getenv('SESSION_COOKIE_SAMESITE', default_samesite)
app.config['SESSION_COOKIE_HTTPONLY'] = True  # No JavaScript access
app.config['SESSION_COOKIE_MAX_AGE'] = 86400  # 24 hours
# Optional: allow overriding cookie domain when served on a subdomain like api.bestdentistduluth.com
cookie_domain = os.getenv('SESSION_COOKIE_DOMAIN')
if cookie_domain:
    app.config['SESSION_COOKIE_DOMAIN'] = cookie_domain
# Remove SESSION_TYPE, SESSION_USE_SIGNER, and other complex settings
# Let Flask use its default session interface

# Initialize extensions
db.init_app(app)
limiter = Limiter(get_remote_address, app=app, default_limits=None)


# Log session interface being used
logger.info(f"Flask session interface: {type(app.session_interface).__name__}")
logger.info(f"Flask session interface module: {app.session_interface.__class__.__module__}")
logger.info(f"Session cookie secure: {app.config.get('SESSION_COOKIE_SECURE')}")
logger.info(f"Session cookie httponly: {app.config.get('SESSION_COOKIE_HTTPONLY')}")
logger.info(f"Session cookie max age: {app.config.get('SESSION_COOKIE_MAX_AGE')}")
logger.info(f"Session cookie samesite: {app.config.get('SESSION_COOKIE_SAMESITE')}")
logger.info(f"Session cookie domain: {app.config.get('SESSION_COOKIE_DOMAIN')}")

# Staff list for signup attribution
STAFF_MEMBERS = [
    "Amanda",
    "Taquila",
    "Monti",
    "Sanita",
    "Ben",
]

def canonicalize_staff(value: str) -> str:
    """Normalize various staff inputs to a canonical name from STAFF_MEMBERS.
    Accepts case-insensitive matches and trims whitespace.
    """
    if not value:
        return ''
    v = str(value).strip().lower()
    by_lower = {s.lower(): s for s in STAFF_MEMBERS}
    return by_lower.get(v, '')
# CORS configuration
# Define allowed origins (can be overridden via ALLOWED_ORIGINS env, comma-separated)
default_allowed_origins = [
    # Local development (CRA default + common fallbacks)
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:5000', 'http://127.0.0.1:5000',
    'http://localhost:5001', 'http://127.0.0.1:5001',
    'http://localhost:5002', 'http://127.0.0.1:5002',
    'http://localhost:5003', 'http://127.0.0.1:5003',
    'http://localhost:5004', 'http://127.0.0.1:5004',
    'http://localhost:5005', 'http://127.0.0.1:5005',
    # Production domains
    'https://bestdentistduluth.com',
    'https://www.bestdentistduluth.com',
]
extra_allowed = [o.strip() for o in os.getenv('ALLOWED_ORIGINS', '').split(',') if o.strip()]
ALLOWED_ORIGINS = default_allowed_origins + extra_allowed
logger.info(f"ALLOWED_ORIGINS: {ALLOWED_ORIGINS}")

def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    # Direct match first
    if origin in ALLOWED_ORIGINS:
        return True
    # Allow some common Vercel preview patterns
    vercel_patterns = [
        r'^https://referral-duluth-frontend2.*\.vercel\.app$',
        r'^https://.*-benashifrins-projects\.vercel\.app$',
    ]
    for pattern in vercel_patterns:
        if re.match(pattern, origin):
            return True
    return False

def _compute_allowed_origins():
    if PRODUCTION:
        env_origins = [o.strip() for o in os.getenv('ALLOWED_ORIGINS', '').split(',') if o.strip()]
        if env_origins:
            return env_origins
        cd = os.getenv('CUSTOM_DOMAIN')
        if cd:
            cd = cd.rstrip('/')
            return [cd]
    return ALLOWED_ORIGINS

EFFECTIVE_ALLOWED_ORIGINS = _compute_allowed_origins()

# Configure Flask-CORS (explicit origins; credentials enabled)
CORS(
    app,
    supports_credentials=True,
    origins=EFFECTIVE_ALLOWED_ORIGINS,
    allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
    methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
)

# Initialize Socket.IO (threading fallback works under sync Gunicorn; for websockets use eventlet/gevent)
socketio = SocketIO(cors_allowed_origins=EFFECTIVE_ALLOWED_ORIGINS or '*', async_mode='threading')
socketio.init_app(app, cors_allowed_origins=EFFECTIVE_ALLOWED_ORIGINS or '*')

# Request tracking and mobile detection middleware
def _cors_preflight_response(origin: str):
    """Craft a permissive CORS preflight response when origin is allowed."""
    resp = make_response('', 204)
    if origin and is_allowed_origin(origin):
        resp.headers['Access-Control-Allow-Origin'] = origin
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        req_method = request.headers.get('Access-Control-Request-Method', 'GET, POST, PUT, DELETE, OPTIONS')
        resp.headers['Access-Control-Allow-Methods'] = req_method
        resp.headers.add('Vary', 'Origin')
        logger.info(f"[CORS] Preflight OK for origin={origin} path={request.path} methods={req_method}")
    else:
        logger.warning(f"[CORS] Preflight blocked for origin={origin} path={request.path}")
    return resp

def _origin_allowed_for_csrf():
    origin = request.headers.get('Origin')
    if not origin:
        ref = request.headers.get('Referer', '')
        return (not PRODUCTION) or (request.host in ref)
    return is_allowed_origin(origin)

def _is_state_changing():
    return request.method in ('POST', 'PUT', 'DELETE', 'PATCH')

@app.before_request
def before_request():
    """Add request tracking and mobile detection to all requests"""
    # Generate unique request ID for tracing
    request.id = str(uuid.uuid4())[:8]
    
    # Detect mobile devices
    user_agent = request.headers.get('User-Agent', '')
    request.is_mobile = any(mobile in user_agent.lower() for mobile in 
                          ['mobile', 'android', 'iphone', 'ipad', 'blackberry', 'windows phone'])
    
    # Log all requests with mobile detection and origin
    origin = request.headers.get('Origin')
    ac_req_method = request.headers.get('Access-Control-Request-Method')
    logger.info(f"[{request.id}] {request.method} {request.path} - Mobile: {request.is_mobile} - IP: {request.remote_addr} - Origin: {origin} - ACRM: {ac_req_method}")

    # Handle CORS preflight explicitly (in addition to Flask-CORS), to ensure header presence
    if request.method == 'OPTIONS':
        return _cors_preflight_response(origin)
    # CSRF-like Origin check
    if _is_state_changing() and os.getenv('CSRF_STRICT', '1').lower() in ('1', 'true', 'yes', 'on'):
        if not _origin_allowed_for_csrf():
            logger.warning(f"[{request.id}] CSRF ORIGIN BLOCKED - origin={origin} referer={request.headers.get('Referer')}")
            return jsonify({'error': 'Origin not allowed'}), 403
    
    # Log detailed info for authentication requests
    if '/auth/' in request.path:
        logger.info(f"[{request.id}] AUTH REQUEST - User-Agent: {user_agent}")
        logger.info(f"[{request.id}] AUTH REQUEST - Session keys: {list(session.keys())}")
        logger.info(f"[{request.id}] AUTH REQUEST - Cookies: {list(request.cookies.keys())}")

@app.after_request 
def after_request(response):
    """Log response details with detailed cookie information"""
    request_id = getattr(request, 'id', 'unknown')
    is_mobile = getattr(request, 'is_mobile', False)
    # Robust CORS headers for credentialed requests
    origin = request.headers.get('Origin')
    if origin and is_allowed_origin(origin):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        # Ensure caches/CDNs vary by Origin
        response.headers.add('Vary', 'Origin')
        logger.info(f"[{request_id}] CORS OK - {origin} {request.method} {request.path}")
    elif origin:
        logger.warning(f"[{request_id}] CORS BLOCKED - {origin} {request.method} {request.path}")

    logger.info(f"[{request_id}] RESPONSE - Status: {response.status_code}")
    
    # Log session changes for auth requests with detailed cookie info
    if '/auth/' in request.path:
        logger.info(f"[{request_id}] AUTH RESPONSE - Session after: {list(session.keys())}")
        
        # Log detailed cookie headers for mobile debugging
        if 'Set-Cookie' in response.headers:
            set_cookie_header = response.headers.get('Set-Cookie', '')
            # Redact sensitive cookie value
            masked = set_cookie_header
            if 'session=' in masked:
                try:
                    parts = masked.split('; ')
                    parts[0] = 'session=<redacted>'
                    masked = '; '.join(parts)
                except Exception:
                    masked = 'session=<redacted>'
            logger.info(f"[{request_id}] AUTH RESPONSE - Setting cookies for mobile: {is_mobile}")
            logger.info(f"[{request_id}] AUTH RESPONSE - Cookie attributes: {masked}")
        else:
            logger.warning(f"[{request_id}] AUTH RESPONSE - No Set-Cookie header found!")
    
    return response

# Create database tables
with app.app_context():
    db.create_all()
    # Ensure new columns exist in production DBs without manual migrations
    try:
        insp = inspect(db.engine)
        # Add User.signed_up_by_staff if missing
        if 'user' in insp.get_table_names():
            user_cols = {c['name'] for c in insp.get_columns('user')}
            # Add user.name column if missing
            if 'name' not in user_cols:
                try:
                    db.session.execute(text('ALTER TABLE "user" ADD COLUMN name VARCHAR(100)'))
                    db.session.commit()
                    logger.info('Added column user.name')
                except Exception as e:
                    logger.warning(f'Could not add user.name: {e}')
            if 'signed_up_by_staff' not in user_cols:
                try:
                    db.session.execute(text('ALTER TABLE "user" ADD COLUMN signed_up_by_staff VARCHAR(50)'))
                    db.session.commit()
                    logger.info('Added column user.signed_up_by_staff')
                except Exception as e:
                    logger.warning(f'Could not add user.signed_up_by_staff: {e}')

            # Add user.phone column if missing
            if 'phone' not in user_cols:
                try:
                    db.session.execute(text('ALTER TABLE "user" ADD COLUMN phone VARCHAR(30)'))
                    db.session.commit()
                    logger.info('Added column user.phone')
                except Exception as e:
                    logger.warning(f'Could not add user.phone: {e}')

            # Add user.password_hash column if missing
            if 'password_hash' not in user_cols:
                try:
                    db.session.execute(text('ALTER TABLE "user" ADD COLUMN password_hash VARCHAR(255)'))
                    db.session.commit()
                    logger.info('Added column user.password_hash')
                except Exception as e:
                    logger.warning(f'Could not add user.password_hash: {e}')

            # Add user.password_set_at column if missing
            if 'password_set_at' not in user_cols:
                try:
                    db.session.execute(text('ALTER TABLE "user" ADD COLUMN password_set_at TIMESTAMP'))
                    db.session.commit()
                    logger.info('Added column user.password_set_at')
                except Exception as e:
                    logger.warning(f'Could not add user.password_set_at: {e}')

        # Add Referral.signed_up_by_staff and Referral.origin if missing
        if 'referral' in insp.get_table_names():
            ref_cols = {c['name'] for c in insp.get_columns('referral')}
            if 'signed_up_by_staff' not in ref_cols:
                try:
                    db.session.execute(text('ALTER TABLE referral ADD COLUMN signed_up_by_staff VARCHAR(50)'))
                    db.session.commit()
                    logger.info('Added column referral.signed_up_by_staff')
                except Exception as e:
                    logger.warning(f'Could not add referral.signed_up_by_staff: {e}')
            if 'origin' not in ref_cols:
                try:
                    # DEFAULT 'link' for Postgres; SQLite ignores DEFAULT if unsupported
                    db.session.execute(text("ALTER TABLE referral ADD COLUMN origin VARCHAR(20) DEFAULT 'link'"))
                    db.session.commit()
                    logger.info('Added column referral.origin')
                except Exception as e:
                    logger.warning(f'Could not add referral.origin: {e}')
    except Exception as e:
        logger.warning(f'DB auto-migration check failed: {e}')

# SSE subscribers for immediate QR notifications
sse_clients = []  # list[Queue]

def sse_broadcast(message: dict):
    try:
        for q in list(sse_clients):
            try:
                q.put_nowait(message)
            except Exception:
                pass
    except Exception:
        pass

# QR scan tracking + redirect endpoints
@app.route('/qr/login')
def qr_login_redirect():
    try:
        ev = QREvent(kind='login')
        db.session.add(ev)
        db.session.commit()
        sse_broadcast({'kind': 'login', 'created_at': ev.created_at.isoformat()})
    except Exception as e:
        logger.warning(f"QR event save failed (login): {e}")
        db.session.rollback()
    # Redirect to the login page
    return redirect('https://www.bestdentistduluth.com/login', code=302)

@app.route('/qr/review')
def qr_review_redirect():
    try:
        ev = QREvent(kind='review')
        db.session.add(ev)
        db.session.commit()
        sse_broadcast({'kind': 'review', 'created_at': ev.created_at.isoformat()})
    except Exception as e:
        logger.warning(f"QR event save failed (review): {e}")
        db.session.rollback()
    # Redirect to Google review URL
    return redirect('https://g.page/r/CdZAjJJlW1Y2EBE/review', code=302)

@app.route('/qr/events')
def qr_events():
    """Return QR events created after the given timestamp."""
    try:
        since = request.args.get('since', '').strip()
        now = datetime.utcnow()
        query = QREvent.query
        if since:
            try:
                # Allow plain ISO without timezone
                dt = datetime.fromisoformat(since.replace('Z', ''))
                query = query.filter(QREvent.created_at > dt)
            except Exception:
                pass
        events = query.order_by(QREvent.created_at.desc()).limit(25).all()
        return jsonify({
            'now': now.isoformat(),
            'count': len(events),
            'events': [e.to_dict() for e in events]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/qr/stream')
def qr_stream():
    """Server-Sent Events stream for immediate QR notifications."""
    q = Queue()
    sse_clients.append(q)

    @stream_with_context
    def event_stream():
        try:
            # Initial comment to open stream
            yield ': ok\n\n'
            while True:
                msg = q.get()
                payload = json.dumps(msg)
                yield f'data: {payload}\n\n'
        except GeneratorExit:
            pass
        finally:
            try:
                sse_clients.remove(q)
            except ValueError:
                pass

    resp = Response(event_stream(), mimetype='text/event-stream')
    # Allow CORS for EventSource
    origin = request.headers.get('Origin')
    if origin and is_allowed_origin(origin):
        resp.headers['Access-Control-Allow-Origin'] = origin
        resp.headers.add('Vary', 'Origin')
    resp.headers['Cache-Control'] = 'no-cache'
    resp.headers['X-Accel-Buffering'] = 'no'  # nginx proxies
    return resp

# ---------- Socket.IO: QR display channel ----------
@socketio.on('connect')
def on_connect():
    try:
        sid = None
        try:
            from flask import request as _req
            sid = getattr(_req, 'sid', None)
        except Exception:
            pass
        logger.info(f"[SocketIO] connect sid={sid}")
        emit('connected', {'ok': True})
    except Exception as e:
        logger.warning(f"[SocketIO] connect handler error: {e}")

@socketio.on('join_qr_display')
def on_join_qr_display():
    try:
        join_room('qr_display')
        logger.info(f"[SocketIO] join room=qr_display")
        emit('joined', {'room': 'qr_display'})
    except Exception as e:
        logger.warning(f"[SocketIO] join_qr_display error: {e}")
    
    # Debug session interface after app context is created
    logger.info("=" * 50)
    logger.info("FLASK SESSION INTERFACE DEBUGGING")
    logger.info(f"Session interface type: {type(app.session_interface).__name__}")
    logger.info(f"Session interface module: {app.session_interface.__class__.__module__}")
    logger.info(f"Session interface: {app.session_interface}")
    logger.info(f"SECRET_KEY configured: {'SECRET_KEY' in app.config}")
    logger.info(f"SECRET_KEY length: {len(app.config.get('SECRET_KEY', ''))}")
    logger.info(f"Session config: {dict((k, v) for k, v in app.config.items() if 'SESSION' in k)}")
    logger.info("=" * 50)
    
    # Ensure configured admin users exist and are marked as admin
    configured_admins = []
    admins_env = os.getenv('ADMIN_EMAILS')
    if admins_env:
        configured_admins = [e.strip().lower() for e in admins_env.split(',') if e.strip()]
    else:
        configured_admins = [os.getenv('ADMIN_EMAIL', 'drtshifrin@gmail.com').strip().lower()]

    logger.info(f"Configured admin emails: {configured_admins}")

    for admin_email in configured_admins:
        if not admin_email:
            continue
        admin_user = User.query.filter_by(email=admin_email).first()
        if not admin_user:
            admin_user = User(email=admin_email, is_admin=True)
            db.session.add(admin_user)
            db.session.commit()
            print(f"Created admin user: {admin_email}")
        elif not admin_user.is_admin:
            admin_user.is_admin = True
            db.session.commit()
            print(f"Updated existing user to admin: {admin_email}")

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
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
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
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
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
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
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
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
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

@app.route('/debug/config')
def debug_config():
    """Expose key runtime configuration for debugging (no secrets)."""
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
    return jsonify({
        'allowed_origins': ALLOWED_ORIGINS,
        'session': {
            'secure': app.config.get('SESSION_COOKIE_SECURE'),
            'httponly': app.config.get('SESSION_COOKIE_HTTPONLY'),
            'samesite': app.config.get('SESSION_COOKIE_SAMESITE'),
            'domain': app.config.get('SESSION_COOKIE_DOMAIN'),
            'permanent_lifetime': app.config.get('PERMANENT_SESSION_LIFETIME', 'default'),
        },
        'env': {
            'FLASK_ENV': os.getenv('FLASK_ENV'),
            'DEV_INSECURE_COOKIES': os.getenv('DEV_INSECURE_COOKIES'),
            'CUSTOM_DOMAIN': os.getenv('CUSTOM_DOMAIN'),
        }
    })

@app.route('/debug/mobile-session-test', methods=['POST'])
def debug_mobile_session_test():
    """Special endpoint to test mobile session immediately after login"""
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
    user_agent = request.headers.get('User-Agent', '')
    is_mobile = any(mobile in user_agent.lower() for mobile in ['iphone', 'android', 'mobile'])
    
    # Check if user is authenticated
    if 'user_id' not in session:
        return jsonify({
            'error': 'Not authenticated',
            'is_mobile': is_mobile,
            'session_keys': list(session.keys()),
            'cookies': list(request.cookies.keys())
        }), 401
    
    # Get user data
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'message': 'Mobile session working correctly',
        'user': user.to_dict(),
        'session_id': session.get('user_id'),
        'is_mobile': is_mobile,
        'session_keys': list(session.keys())
    })

@app.route('/debug/mobile-session-live', methods=['GET'])
def debug_mobile_session_live():
    """Real-time mobile session debugging endpoint"""
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
    request_id = getattr(request, 'id', 'unknown')
    user_agent = request.headers.get('User-Agent', '')
    is_mobile = getattr(request, 'is_mobile', False)
    
    logger.info(f"[{request_id}] MOBILE DEBUG LIVE - Request from mobile: {is_mobile}")
    
    # Get current user if authenticated
    current_user = get_current_user()
    
    debug_info = {
        'timestamp': datetime.now().isoformat(),
        'request_id': request_id,
        'is_mobile_detected': is_mobile,
        'user_agent': user_agent,
        'session_keys': list(session.keys()),
        'session_data': {
            'user_id': session.get('user_id'),
            'user_email': session.get('user_email'),
            'permanent': session.permanent
        },
        'cookies_received': list(request.cookies.keys()),
        'authenticated': current_user is not None,
        'current_user': current_user.to_dict() if current_user else None,
        'headers': {
            'Origin': request.headers.get('Origin'),
            'Referer': request.headers.get('Referer'),
            'Host': request.headers.get('Host'),
            'X-Forwarded-For': request.headers.get('X-Forwarded-For')
        }
    }
    
    logger.info(f"[{request_id}] MOBILE DEBUG RESPONSE - Authenticated: {current_user is not None}")
    return jsonify(debug_info)

@app.route('/debug/mobile-error', methods=['POST'])
def debug_mobile_error():
    """Endpoint for frontend to report mobile-specific errors"""
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
    request_id = getattr(request, 'id', 'unknown')
    is_mobile = getattr(request, 'is_mobile', False)
    
    try:
        data = request.get_json() or {}
        error_message = data.get('message', 'Unknown mobile error')
        error_data = data.get('data')
        timestamp = data.get('timestamp', datetime.now().isoformat())
        client_user_agent = data.get('userAgent', '')
        
        logger.error(f"[{request_id}] MOBILE ERROR REPORT - {error_message}")
        logger.error(f"[{request_id}] MOBILE ERROR DATA - {error_data}")
        logger.error(f"[{request_id}] MOBILE ERROR UA - {client_user_agent}")
        logger.error(f"[{request_id}] MOBILE ERROR TIME - {timestamp}")
        
        return jsonify({
            'success': True,
            'message': 'Mobile error logged successfully',
            'request_id': request_id
        })
        
    except Exception as e:
        logger.error(f"[{request_id}] MOBILE ERROR ENDPOINT FAILED - {str(e)}")
        return jsonify({'error': 'Failed to log mobile error'}), 500

@app.route('/debug/mobile-cookie-test', methods=['GET', 'POST'])
def debug_mobile_cookie_test():
    """Test cookie setting and retrieval for mobile browsers"""
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
    request_id = getattr(request, 'id', 'unknown')
    is_mobile = getattr(request, 'is_mobile', False)
    
    if request.method == 'POST':
        # Set a test cookie
        session['mobile_test'] = 'cookie_test_value'
        session['mobile_test_timestamp'] = datetime.now().isoformat()
        session.permanent = True
        
        logger.info(f"[{request_id}] MOBILE COOKIE TEST - Setting test cookie for mobile: {is_mobile}")
        logger.info(f"[{request_id}] MOBILE COOKIE TEST - Session keys after set: {list(session.keys())}")
        
        return jsonify({
            'success': True,
            'message': 'Test cookie set',
            'session_keys': list(session.keys()),
            'is_mobile': is_mobile,
            'request_id': request_id
        })
    
    else:
        # Check if test cookie exists
        mobile_test = session.get('mobile_test')
        mobile_test_timestamp = session.get('mobile_test_timestamp')
        
        logger.info(f"[{request_id}] MOBILE COOKIE TEST - Checking test cookie for mobile: {is_mobile}")
        logger.info(f"[{request_id}] MOBILE COOKIE TEST - Session keys on check: {list(session.keys())}")
        logger.info(f"[{request_id}] MOBILE COOKIE TEST - Cookies received: {list(request.cookies.keys())}")
        logger.info(f"[{request_id}] MOBILE COOKIE TEST - Test cookie value: {mobile_test}")
        
        return jsonify({
            'cookie_exists': mobile_test is not None,
            'cookie_value': mobile_test,
            'cookie_timestamp': mobile_test_timestamp,
            'session_keys': list(session.keys()),
            'cookies_received': list(request.cookies.keys()),
            'is_mobile': is_mobile,
            'request_id': request_id
        })

@app.route('/debug/manual-cookie-test', methods=['GET', 'POST'])
def debug_manual_cookie_test():
    """Test manual cookie setting bypassing Flask sessions entirely"""
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
    request_id = getattr(request, 'id', 'unknown')
    is_mobile = getattr(request, 'is_mobile', False)
    
    if request.method == 'POST':
        # Manually set cookies using make_response
        logger.info(f"[{request_id}] MANUAL COOKIE TEST - Setting manual cookie for mobile: {is_mobile}")
        
        response_data = {
            'success': True,
            'message': 'Manual cookie set',
            'is_mobile': is_mobile,
            'request_id': request_id,
            'timestamp': datetime.now().isoformat()
        }
        
        response = make_response(jsonify(response_data))
        
        # Set multiple test cookies with different configurations
        response.set_cookie('manual_test', 'test_value_123', 
                          max_age=3600, secure=True, httponly=True)
        response.set_cookie('mobile_test', f'mobile_{is_mobile}', 
                          max_age=3600, secure=True, httponly=False)
        response.set_cookie('simple_test', 'simple_value')
        
        logger.info(f"[{request_id}] MANUAL COOKIE TEST - Response created with manual cookies")
        logger.info(f"[{request_id}] MANUAL COOKIE TEST - Response headers: {dict(response.headers)}")
        
        return response
    
    else:
        # Check manual cookies
        manual_test = request.cookies.get('manual_test')
        mobile_test = request.cookies.get('mobile_test') 
        simple_test = request.cookies.get('simple_test')
        
        logger.info(f"[{request_id}] MANUAL COOKIE TEST - Checking manual cookies for mobile: {is_mobile}")
        logger.info(f"[{request_id}] MANUAL COOKIE TEST - Cookies received: {dict(request.cookies)}")
        
        return jsonify({
            'manual_test': manual_test,
            'mobile_test': mobile_test,
            'simple_test': simple_test,
            'all_cookies': dict(request.cookies),
            'is_mobile': is_mobile,
            'request_id': request_id
        })

@app.route('/debug/simple-cookie-test')
def debug_simple_cookie_test():
    """Minimal cookie test - just set and check a simple cookie"""
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Not found'}), 404
    request_id = getattr(request, 'id', 'unknown')
    is_mobile = getattr(request, 'is_mobile', False)
    
    # Check if we're setting or checking
    action = request.args.get('action', 'check')
    
    if action == 'set':
        logger.info(f"[{request_id}] SIMPLE COOKIE - Setting test cookie for mobile: {is_mobile}")
        
        response = make_response(jsonify({
            'action': 'set',
            'message': 'Simple cookie set',
            'is_mobile': is_mobile,
            'timestamp': datetime.now().isoformat()
        }))
        
        # Set the simplest possible cookie
        response.set_cookie('test_cookie', 'test_value_simple')
        
        logger.info(f"[{request_id}] SIMPLE COOKIE - Set-Cookie header: {response.headers.get('Set-Cookie')}")
        return response
    
    else:
        test_cookie = request.cookies.get('test_cookie')
        logger.info(f"[{request_id}] SIMPLE COOKIE - Checking cookie for mobile: {is_mobile}")
        logger.info(f"[{request_id}] SIMPLE COOKIE - Cookie value: {test_cookie}")
        
        return jsonify({
            'action': 'check',
            'test_cookie': test_cookie,
            'cookie_exists': test_cookie is not None,
            'all_cookies': dict(request.cookies),
            'is_mobile': is_mobile
        })

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
            # Gate access if user must set a password (OTP verified session)
            try:
                must_set = session.get('must_set_password') is True
                path = request.path or ''
                allowed_paths = {'/auth/me', '/auth/set-password', '/auth/logout'}
                if must_set and path not in allowed_paths:
                    return jsonify({'error': 'Must set password', 'must_set_password': True}), 403
            except Exception:
                pass
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
            # Block admin access until password is set
            if session.get('must_set_password') is True:
                return jsonify({'error': 'Must set password', 'must_set_password': True}), 403
            return f(user, *args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

# Authentication Routes
@app.route('/auth/send-otp', methods=['POST'])
@limiter.limit("5 per minute")
def send_otp():
    """Send OTP to user's email"""
    request_id = getattr(request, 'id', 'unknown')
    is_mobile = getattr(request, 'is_mobile', False)
    
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        logger.info(f"[{request_id}] OTP REQUEST - Email: {email} - Mobile: {is_mobile}")
        
        if not email:
            logger.warning(f"[{request_id}] OTP FAILED - No email provided")
            return jsonify({'error': 'Email is required'}), 400
        
        # Validate email format
        try:
            validate_email(email)
            logger.info(f"[{request_id}] OTP EMAIL VALID - {email}")
        except EmailNotValidError:
            logger.warning(f"[{request_id}] OTP FAILED - Invalid email format: {email}")
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
            logger.info(f"[{request_id}] OTP EMAIL SENDING - To: {email}, Service: {email_service.from_email}")
            success = email_service.send_otp_email(email, otp_token.token)
            logger.info(f"[{request_id}] OTP EMAIL RESULT - Success: {success}")

            # Return success if email was sent
            if success:
                existing_user = User.query.filter_by(email=email).first()
                has_staff = bool(existing_user and getattr(existing_user, 'signed_up_by_staff', None))
                return jsonify({
                    'message': 'OTP sent to your email',
                    'email': email,
                    'expires_in': 600,
                    'has_staff': has_staff
                })

            # Fallback for local/dev or demo accounts: allow proceeding even if email failed
            demo_users = {
                'demo@duluthdentalcenter.com': '123456',
                'drtshifrin@gmail.com': '123456',
                'user@demo.com': '123456'
            }
            allow_fake = (os.getenv('FLASK_ENV') != 'production') and (os.getenv('DEV_ALLOW_FAKE_OTP') in ('1', 'true', 'True', 'yes', 'on'))
            if email.lower() in demo_users or allow_fake:
                logger.warning(f"[{request_id}] OTP EMAIL FALLBACK - Proceeding without email (demo/dev). allow_fake={allow_fake}")
                existing_user = User.query.filter_by(email=email).first()
                has_staff = bool(existing_user and getattr(existing_user, 'signed_up_by_staff', None))
                return jsonify({
                    'message': 'OTP issued (dev mode) — use your code',
                    'email': email,
                    'expires_in': 600,
                    'has_staff': has_staff
                })

            return jsonify({'error': 'Failed to send OTP. Please try again.'}), 500
        except Exception as e:
            logger.error(f"[{request_id}] OTP EMAIL EXCEPTION - {str(e)}")
            # Same fallback for dev/demo
            demo_users = {
                'demo@duluthdentalcenter.com': '123456',
                'drtshifrin@gmail.com': '123456',
                'user@demo.com': '123456'
            }
            allow_fake = (os.getenv('FLASK_ENV') != 'production') and (os.getenv('DEV_ALLOW_FAKE_OTP') in ('1', 'true', 'True', 'yes', 'on'))
            if email.lower() in demo_users or allow_fake:
                existing_user = User.query.filter_by(email=email).first()
                has_staff = bool(existing_user and getattr(existing_user, 'signed_up_by_staff', None))
                return jsonify({
                    'message': 'OTP issued (dev mode) — use your code',
                    'email': email,
                    'expires_in': 600,
                    'has_staff': has_staff
                })
            return jsonify({'error': f'Email service error: {str(e)}'}), 500
            
    except Exception as e:
        db.session.rollback()
        print(f"Error sending OTP: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/auth/verify-otp', methods=['POST'])
@limiter.limit("10 per minute")
def verify_otp():
    """Verify OTP and log in user"""
    request_id = getattr(request, 'id', 'unknown')
    is_mobile = getattr(request, 'is_mobile', False)
    
    try:
        # Log raw headers and body for debugging
        try:
            # Use cache=True so subsequent get_json() can still parse the body
            raw_body = request.get_data(cache=True, as_text=True)[:1000]
        except Exception:
            raw_body = '<unavailable>'
        logger.info(f"[{request_id}] OTP VERIFY HEADERS: {dict(request.headers)}")
        # Avoid logging raw bodies with secrets in production
        # logger.info(f"[{request_id}] OTP VERIFY RAW BODY (truncated): {raw_body}")

        data = request.get_json(silent=True)
        if not isinstance(data, dict) or not data:
            try:
                data = json.loads(raw_body) if raw_body else {}
            except Exception:
                data = {}
        logger.info(f"[{request_id}] OTP VERIFY - Parsed JSON keys: {list(data.keys())}")
        email = data.get('email', '').strip().lower()
        token = data.get('token', '').strip()
        # Normalize potential name fields
        raw_name_values = {
            'name': data.get('name'),
            'full_name': data.get('full_name'),
            'display_name': data.get('display_name'),
        }
        name = (data.get('name') or data.get('full_name') or data.get('display_name') or '').strip()
        # Accept multiple possible keys and normalize
        staff_raw_values = {
            'staff': data.get('staff'),
            'teamMember': data.get('teamMember'),
            'team_member': data.get('team_member'),
            'team_member_name': data.get('team_member_name'),
        }
        staff = (
            data.get('staff')
            or data.get('teamMember')
            or data.get('team_member')
            or data.get('team_member_name')
            or ''
        )
        staff = canonicalize_staff(staff)
        logger.info(f"[{request_id}] OTP VERIFY - Staff raw values: {staff_raw_values}")
        logger.info(f"[{request_id}] OTP VERIFY - Staff normalized: '{staff}' (allowed: {STAFF_MEMBERS})")
        
        logger.info(f"[{request_id}] OTP VERIFY START - Email: {email}, Mobile: {is_mobile}")
        logger.info(f"[{request_id}] OTP VERIFY START - Current session keys: {list(session.keys())}")
        logger.info(f"[{request_id}] OTP VERIFY START - Request method: {request.method}")
        logger.info(f"[{request_id}] OTP VERIFY START - Content type: {request.content_type}")
        
        if is_mobile:
            logger.info(f"[{request_id}] MOBILE OTP VERIFY - Processing mobile OTP request")
            logger.info(f"[{request_id}] MOBILE OTP VERIFY - Request data: {data}")
            logger.info(f"[{request_id}] MOBILE OTP VERIFY - Request headers: {dict(request.headers)}")
        
        if not email or not token:
            logger.warning(f"[{request_id}] OTP VERIFY FAILED - Missing email or token")
            return jsonify({'error': 'Email and token are required'}), 400
        # Require staff selection on login
        if not staff:
            # Temporarily allow login without staff to avoid blocking users while frontend caches update
            logger.warning(f"[{request_id}] OTP VERIFY WARNING - Staff missing or invalid. Proceeding without staff. Raw: {staff_raw_values}")
        
        # Demo mode: Accept specific demo credentials
        demo_users = {
            'demo@duluthdentalcenter.com': '123456',
            'drtshifrin@gmail.com': '123456',
            'user@demo.com': '123456'
        }
        
        is_demo_login = email in demo_users and token == demo_users[email]
        logger.info(f"[{request_id}] OTP VERIFY - Demo login check: {is_demo_login}")
        
        if not is_demo_login:
            # Regular OTP verification
            otp_token = OTPToken.query.filter_by(
                email=email,
                token=token,
                used=False
            ).first()
            
            if not otp_token or not otp_token.is_valid():
                logger.warning(f"[{request_id}] OTP VERIFY FAILED - Invalid or expired OTP for {email}")
                return jsonify({'error': 'Invalid or expired OTP'}), 400
            
            logger.info(f"[{request_id}] OTP VERIFY SUCCESS - Valid OTP token found for {email}")
            # Mark token as used
            otp_token.use_token()
        
        # Find or create user
        user = User.query.filter_by(email=email).first()
        if not user:
            logger.info(f"[{request_id}] USER CREATE - Creating new user for {email}")
            user = User(email=email)
            db.session.add(user)
            db.session.commit()
        else:
            logger.info(f"[{request_id}] USER FOUND - Existing user {email} (ID: {user.id})")

        # Ensure configured admins are marked as admin (so frontend gets correct role)
        try:
            configured_admins = []
            admins_env = os.getenv('ADMIN_EMAILS')
            if admins_env:
                configured_admins = [e.strip().lower() for e in admins_env.split(',') if e.strip()]
            else:
                configured_admins = [os.getenv('ADMIN_EMAIL', 'drtshifrin@gmail.com').strip().lower()]

            if email.lower() in configured_admins and not user.is_admin:
                user.is_admin = True
                db.session.commit()
                logger.info(f"[{request_id}] USER ROLE - Promoted to admin: {email}")
        except Exception as _e:
            logger.warning(f"[{request_id}] USER ROLE - Admin promotion check failed: {_e}")
        # If a name was provided and user has no name yet, save it
        try:
            if name and not getattr(user, 'name', None):
                # Basic sanitation: collapse spaces and limit length
                safe_name = re.sub(r'\s+', ' ', name)[:100]
                user.name = safe_name
                db.session.commit()
                logger.info(f"[{request_id}] USER UPDATE - Saved name for {email}: {safe_name}")
        except Exception as _e:
            logger.warning(f"[{request_id}] USER UPDATE - Failed to save name: {_e}")
        
        # CRITICAL MOBILE DEBUG - Track if mobile reaches session setup
        if is_mobile:
            logger.info(f"[{request_id}] MOBILE CRITICAL - About to set session for mobile browser")
            logger.info(f"[{request_id}] MOBILE CRITICAL - Session before setup: {list(session.keys())}")
            logger.info(f"[{request_id}] MOBILE CRITICAL - User object ready: {user.id} - {user.email}")
        
        # Resolve staff member: use provided, or fallback to user's saved value if present
        resolved_staff = staff
        if not resolved_staff and getattr(user, 'signed_up_by_staff', None):
            resolved_staff = user.signed_up_by_staff
        if resolved_staff:
            session['signup_staff'] = resolved_staff
            # Persist on user record if not already set
            try:
                if not getattr(user, 'signed_up_by_staff', None):
                    user.signed_up_by_staff = resolved_staff
                    db.session.commit()
            except Exception as _e:
                logger.warning(f"[{request_id}] OTP VERIFY - Failed to persist user staff: {str(_e)}")
            logger.info(f"[{request_id}] OTP VERIFY - Staff in session: {resolved_staff}")

        # If user already has a password, do not allow OTP to grant full access; require password login
        if getattr(user, 'password_hash', None):
            logger.info(f"[{request_id}] OTP VERIFY - User has password; rejecting OTP login for {email}")
            return jsonify({'error': 'Password required. Please sign in with your email and password.'}), 400

        # Set session with mobile browser compatibility (gated: must set password)
        logger.info(f"[{request_id}] SESSION SET - Before: {list(session.keys())}")
        logger.info(f"[{request_id}] SESSION SET - Session interface type: {type(app.session_interface).__name__}")
        
        session['user_id'] = user.id
        session['user_email'] = user.email
        session['otp_verified'] = True
        session['must_set_password'] = True
        session.permanent = True
        
        # Force session to be marked as modified
        session.modified = True
        
        logger.info(f"[{request_id}] SESSION SET - After: {list(session.keys())}, Mobile: {is_mobile}")
        logger.info(f"[{request_id}] SESSION SET - Session modified: {getattr(session, 'modified', 'unknown')}")
        logger.info(f"[{request_id}] SESSION SET - Session permanent: {session.permanent}")
        
        # Force session save for mobile browsers
        db.session.commit()  # Ensure user is saved before session
        
        # Log mobile debugging info and apply mobile-specific session handling
        user_agent = request.headers.get('User-Agent', '')
        is_mobile_browser = any(mobile in user_agent.lower() for mobile in ['iphone', 'android', 'mobile'])
        if is_mobile_browser:
            logger.info(f"[{request_id}] MOBILE LOGIN SUCCESS - {email}, session ID: {session.get('user_id')}")
            logger.info(f"[{request_id}] MOBILE LOGIN SUCCESS - Session data: {dict(session)}")
            logger.info(f"[{request_id}] MOBILE LOGIN SUCCESS - User agent: {user_agent}")
            
            # Additional mobile session handling
            try:
                # Force session modification flag for mobile browsers
                session.modified = True
                logger.info(f"[{request_id}] MOBILE LOGIN SUCCESS - Forced session modified flag")
            except Exception as save_error:
                logger.error(f"[{request_id}] MOBILE LOGIN ERROR - Session handling failed: {str(save_error)}")
        
        # Create manual response to ensure session cookie is set
        response_data = {
            'message': 'OTP verified; must set password',
            'user': user.to_dict(),
            'stats': user.get_referral_stats(),
            'must_set_password': True
        }
        
        response = make_response(jsonify(response_data))
        
        # Manually force session save and cookie setting
        if is_mobile:
            logger.info(f"[{request_id}] MOBILE CRITICAL - About to manually save session")
            
        try:
            app.session_interface.save_session(app, session, response)
            logger.info(f"[{request_id}] MANUAL SESSION SAVE - Forced session save to response")
            if is_mobile:
                logger.info(f"[{request_id}] MOBILE CRITICAL - Session save completed successfully")
        except Exception as save_error:
            logger.error(f"[{request_id}] MANUAL SESSION SAVE - Failed: {str(save_error)}")
            if is_mobile:
                logger.error(f"[{request_id}] MOBILE CRITICAL - Session save failed: {str(save_error)}")
            # Fallback: manually set session cookie (respect current config)
            try:
                from itsdangerous import URLSafeTimedSerializer
                serializer = URLSafeTimedSerializer(app.secret_key)
                cookie_val = serializer.dumps(dict(session))
                response.set_cookie(
                    'session',
                    cookie_val,
                    max_age=app.config.get('SESSION_COOKIE_MAX_AGE', 86400),
                    secure=app.config.get('SESSION_COOKIE_SECURE', False),
                    httponly=app.config.get('SESSION_COOKIE_HTTPONLY', True),
                    samesite=app.config.get('SESSION_COOKIE_SAMESITE', 'Lax'),
                    domain=app.config.get('SESSION_COOKIE_DOMAIN')
                )
                logger.info(f"[{request_id}] FALLBACK SESSION COOKIE - Manually set session cookie with samesite={app.config.get('SESSION_COOKIE_SAMESITE')}, secure={app.config.get('SESSION_COOKIE_SECURE')}")
            except Exception as fallback_error:
                logger.error(f"[{request_id}] FALLBACK SESSION COOKIE - Failed: {str(fallback_error)}")

        return response
        
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

@app.route('/auth/password-reset/request', methods=['POST'])
@limiter.limit("5 per minute")
def password_reset_request():
    """Initiate password reset by sending an OTP to the user's email.
    Always return 200 to avoid leaking which emails exist.
    """
    request_id = getattr(request, 'id', 'unknown')
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        if not email:
            return jsonify({'message': 'If this email exists, a code has been sent.'})
        try:
            validate_email(email)
        except EmailNotValidError:
            return jsonify({'message': 'If this email exists, a code has been sent.'})

        user = User.query.filter_by(email=email).first()
        if not user:
            # Do not leak existence
            return jsonify({'message': 'If this email exists, a code has been sent.'})

        # Issue OTP token for reset
        otp_token = OTPToken(email=email)
        db.session.add(otp_token)
        db.session.commit()

        try:
            email_service.send_otp_email(email, otp_token.token)
            logger.info(f"[{request_id}] PASSWORD RESET OTP sent to {email}")
        except Exception as e:
            logger.warning(f"[{request_id}] PASSWORD RESET email failed: {e}")
        # Always generic response
        return jsonify({'message': 'If this email exists, a code has been sent.'})
    except Exception as e:
        logger.error(f"[{request_id}] /auth/password-reset/request error: {e}")
        return jsonify({'message': 'If this email exists, a code has been sent.'})

@app.route('/auth/password-reset/confirm', methods=['POST'])
@limiter.limit("10 per minute")
def password_reset_confirm():
    """Confirm password reset with email + OTP + new password."""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        token = (data.get('token') or '').strip()
        password = (data.get('password') or '').strip()
        confirm = (data.get('confirm') or '').strip()

        if not email or not token or not password or not confirm:
            return jsonify({'error': 'Email, token, password and confirmation are required'}), 400
        if password != confirm:
            return jsonify({'error': 'Passwords do not match'}), 400
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            # Generic to avoid enumeration
            return jsonify({'error': 'Invalid or expired code'}), 400

        otp_token = OTPToken.query.filter_by(email=email, token=token, used=False).first()
        if not otp_token or not otp_token.is_valid():
            return jsonify({'error': 'Invalid or expired code'}), 400

        # Consume token and set new password
        otp_token.use_token()
        user.password_hash = generate_password_hash(password)
        user.password_set_at = datetime.utcnow()
        db.session.commit()

        # Log the user in after reset
        session.clear()
        session['user_id'] = user.id
        session['user_email'] = user.email
        session['must_set_password'] = False
        session.pop('otp_verified', None)
        session.permanent = True

        return jsonify({'message': 'Password reset successful', 'user': user.to_dict()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"/auth/password-reset/confirm error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/auth/login', methods=['POST'])
@limiter.limit("10 per minute")
def password_login():
    """Email + password login for users who have set a password."""
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        user = User.query.filter_by(email=email).first()
        if not user or not getattr(user, 'password_hash', None):
            return jsonify({'error': 'Password not set for this account. Use OTP to set a password.'}), 400
        if not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid credentials'}), 401

        # Establish session
        session.clear()
        session['user_id'] = user.id
        session['user_email'] = user.email
        session['must_set_password'] = False
        session.pop('otp_verified', None)
        session.permanent = True

        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'stats': user.get_referral_stats()
        })
    except Exception as e:
        logger.error(f"/auth/login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/auth/set-password', methods=['POST'])
@limiter.limit("5 per minute")
@require_auth()
def set_password(user):
    """Set a persistent password after OTP verification. Requires must_set_password session flag."""
    try:
        if not session.get('otp_verified') or not session.get('must_set_password'):
            return jsonify({'error': 'Not authorized to set password'}), 403
        data = request.get_json(silent=True) or {}
        password = (data.get('password') or '').strip()
        confirm = (data.get('confirm') or '').strip()
        if not password or not confirm:
            return jsonify({'error': 'Password and confirmation are required'}), 400
        if password != confirm:
            return jsonify({'error': 'Passwords do not match'}), 400
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400

        user.password_hash = generate_password_hash(password)
        user.password_set_at = datetime.utcnow()
        db.session.commit()

        # Clear gating flags; keep user logged in
        session['must_set_password'] = False
        session.pop('otp_verified', None)

        return jsonify({
            'message': 'Password set successfully',
            'user': user.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"/auth/set-password error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/auth/me', methods=['GET'])
@require_auth()
def get_current_user_info(user):
    """Get current user information"""
    return jsonify({
        'user': user.to_dict(),
        'stats': user.get_referral_stats(),
        'must_set_password': bool(session.get('must_set_password'))
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
        # Select domain for QR URL: prefer CUSTOM_DOMAIN, else derive from the current request host
        domain = os.getenv('CUSTOM_DOMAIN')
        if not domain:
            try:
                domain = request.host_url  # e.g., http://localhost:5001/
            except Exception:
                domain = 'http://localhost:5001/'
        # Ensure scheme and trailing slash
        if not (domain.startswith('http://') or domain.startswith('https://')):
            # Default to http for local dev if no scheme provided
            domain = f"http://{domain}"
        if not domain.endswith('/'):
            domain += '/'
        logger.info(f"[QR] Using domain for QR: {domain}")
            
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
        
        # Build share/preview metadata
        domain = os.getenv('CUSTOM_DOMAIN', 'https://bestdentistduluth.com')
        if not domain.startswith('http'):
            domain = f"https://{domain}"
        if not domain.endswith('/'):
            domain += '/'
        share_url = f"{domain}ref/{referral_code}"
        # Prefer a branded OG image if provided, else fall back to a QR image for the link
        # Prefer a branded OG image if provided; default to site-hosted preview image
        og_image = os.getenv('OG_IMAGE_URL', 'https://www.bestdentistduluth.com/og/referralrichtxt.png')

        # Serve a rich preview landing page with Open Graph metadata
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Welcome to Duluth Dental Center!</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <!-- Open Graph metadata for rich previews -->
            <meta property="og:type" content="website" />
            <meta property="og:title" content="You have got some smart friends — Duluth Dental Center" />
            <meta property="og:description" content="You were referred to Duluth Dental Center. Share your info and call to schedule your first appointment. Earn rewards for referrals!" />
            <meta property="og:url" content="{share_url}" />
            <meta property="og:image" content="{og_image}" />
            <meta property="og:image:alt" content="Duluth Dental Center referral" />

            <!-- Twitter Card -->
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="You have got some smart friends — Duluth Dental Center" />
            <meta name="twitter:description" content="You were referred to Duluth Dental Center. Share your info and call to schedule your first appointment." />
            <meta name="twitter:image" content="{og_image}" />
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
                <p style="font-size: 20px; font-weight: 700; margin: 10px 0; color: #fef08a;">You have got some smart friends!</p>
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
                            const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}}[c]));
                            const safeName = escapeHtml(name);
                            document.querySelector('.form-container').innerHTML = `
                                <div style="text-align: center; padding: 40px 20px;">
                                    <div style="background: #dcfce7; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 2px solid #16a34a;">
                                        <h2 style="color: #16a34a; margin-bottom: 15px;">✅ Step 1 Complete!</h2>
                                        <p style="font-size: 16px; color: #166534; margin: 0;">Thank you, ${{safeName}}! We've received your information.</p>
                                    </div>
                                    
                                    <div style="background: #0891b2; color: white; padding: 30px; border-radius: 15px; margin: 20px 0;">
                                        <h2 style="margin: 0 0 15px 0; font-size: 28px;">📞 Step 2: Call Us Now!</h2>
                                        <div style="font-size: 32px; font-weight: bold; margin: 15px 0; letter-spacing: 2px;">(770)-232-5255</div>
                                        <p style="font-size: 16px; margin: 15px 0; opacity: 0.9;">Speak with our scheduling team to book your appointment</p>
                                        <a href="tel:+14048892305" style="background: #0f766e; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; display: inline-block; margin: 10px 0;">📞 Call Duluth Dental Center</a>
                                    </div>
                                    
                                    <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0; color: #374151;">
                                        <p style="margin: 0; font-size: 14px;"><strong>Office Hours:</strong></p>
                                        <p style="margin: 5px 0; font-size: 14px;">Monday - Thursday: 8:00 AM - 4:00 PM</p>
                                        <p style="margin: 5px 0; font-size: 14px;">We're ready to schedule your appointment!</p>
                                    </div>
                                </div>
                            `;
                        }} else {{
                            alert(result.error || 'An error occurred. Please try again or call us at (770)-232-5255');
                            submitButton.textContent = originalText;
                            submitButton.disabled = false;
                        }}
                    }} catch (error) {{
                        alert('Network error. Please try again or call us at (770)-232-5255');
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
@limiter.limit("5 per minute")
def signup_referral():
    """Process referral signup"""
    try:
        request_id = getattr(request, 'id', 'unknown')
        # Debug raw body and headers to diagnose staff attribution issues
        try:
            # Use cache=True so subsequent get_json() can still parse the body
            raw_body = request.get_data(cache=True, as_text=True)[:1000]
        except Exception:
            raw_body = '<unavailable>'
        logger.info(f"[{request_id}] SIGNUP HEADERS: {dict(request.headers)}")
        logger.info(f"[{request_id}] SIGNUP RAW BODY (truncated): {raw_body}")

        data = request.get_json(silent=True)
        if not isinstance(data, dict) or not data:
            try:
                data = json.loads(raw_body) if raw_body else {}
            except Exception:
                data = {}
        logger.info(f"[{request_id}] SIGNUP - Parsed JSON keys: {list(data.keys())}")
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip().lower()
        staff_raw = (data.get('staff') or '').strip()
        logger.info(f"[{request_id}] SIGNUP - Staff raw from body: '{staff_raw}', session staff: '{session.get('signup_staff')}'")
        staff = staff_raw
        
        # Validate required fields
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        if not phone:
            return jsonify({'error': 'Phone number is required'}), 400
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        # Staff optional on public form; if missing, try session value captured at login
        if not staff:
            staff = canonicalize_staff(session.get('signup_staff') or '')

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
        
        # New rule: referred email cannot already belong to a user in the system
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'This email already has an account and cannot be referred'}), 400
        
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
        if staff:
            referral.signed_up_by_staff = staff
        referral.origin = 'link'
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

@app.route('/admin/users', methods=['GET'])
@require_admin()
def admin_list_users(user):
    """List users with referral stats (paginated)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        q = request.args.get('q', '', type=str).strip().lower()

        query = User.query
        if q:
            q_like = f"%{q}%"
            query = query.filter((User.email.ilike(q_like)) | (User.name.ilike(q_like)))

        pagination = query.order_by(User.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        users = []
        for u in pagination.items:
            users.append({
                'id': u.id,
                'email': u.email,
                'referral_code': u.referral_code,
                'is_admin': u.is_admin,
                'stats': u.get_referral_stats(),
                'total_earnings': u.total_earnings,
                'created_at': u.created_at.isoformat(),
                'signed_up_by_staff': getattr(u, 'signed_up_by_staff', None),
                'name': getattr(u, 'name', None),
                'phone': getattr(u, 'phone', None),
            })

        return jsonify({
            'users': users,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        })
    except Exception as e:
        print(f"Error listing users: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/admin/search', methods=['GET'])
@require_admin()
def admin_search_users(user):
    """Lightweight search for patients by name or email.
    Returns a compact list for the QR section.
    """
    try:
        q = (request.args.get('q') or '').strip()
        if not q:
            return jsonify({'results': []})

        # Search by email, name, or phone (if present)
        query = User.query
        q_like = f"%{q}%"
        query = query.filter(
            (User.email.ilike(q_like)) |
            (User.name.ilike(q_like)) |
            (User.phone.ilike(q_like))
        )
        results = query.order_by(User.created_at.desc()).limit(20).all()
        return jsonify({'results': [
            {
                'id': u.id,
                'email': u.email,
                'name': getattr(u, 'name', None),
                'referral_code': u.referral_code,
                'phone': getattr(u, 'phone', None),
            }
        for u in results]})
    except Exception as e:
        logger.warning(f"/admin/search failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/admin/generate_qr', methods=['POST'])
@require_admin()
def admin_generate_qr(user):
    """Create a short-lived onboarding token, emit QR to iPad, and email magic link."""
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id') or data.get('patient_id')
        email_override = (data.get('email') or '').strip().lower() or None
        raw_name = (data.get('name') or '').strip()
        raw_staff = (data.get('staff') or '').strip()
        staff = canonicalize_staff(raw_staff)
        logger.info(
            "[QR][DEBUG] incoming payload user_id=%s email=%s name_raw='%s' staff_raw='%s' staff='%s'",
            user_id, email_override, raw_name, raw_staff, staff
        )
        # Resolve target user either by explicit user_id or by email
        target = None
        if user_id:
            target = User.query.get_or_404(int(user_id))
            logger.info("[QR][DEBUG] resolved target by id=%s (email=%s, existing_name='%s')", target.id, target.email, getattr(target, 'name', None))
        
        chosen_email = email_override
        # If no explicit email override, fall back to target's email (if present)
        if not chosen_email and target:
            chosen_email = target.email
        
        # Validate that we have at least an email or a user target
        if not target and not chosen_email:
            return jsonify({'error': 'user_id or email is required'}), 400
        
        # If target not provided, resolve or create by email
        if not target and chosen_email:
            # Validate email format before searching/creating
            try:
                validate_email(chosen_email)
            except EmailNotValidError:
                return jsonify({'error': 'Invalid email address'}), 400
            target = User.query.filter_by(email=chosen_email.lower()).first()
            if not target:
                target = User(email=chosen_email.lower())
                db.session.add(target)
                db.session.commit()
                logger.info(f"[QR] Created user {target.id} for email {chosen_email}")
            else:
                logger.info("[QR][DEBUG] resolved target by email (id=%s, existing_name='%s')", target.id, getattr(target, 'name', None))

        # Validate email format
        try:
            validate_email(chosen_email)
        except EmailNotValidError:
            return jsonify({'error': 'Invalid email address'}), 400

        # If staff provided, persist on target user (overwrite or set if missing)
        try:
            if staff:
                prev_staff = getattr(target, 'signed_up_by_staff', None)
                target.signed_up_by_staff = staff
                db.session.commit()
                logger.info("[QR][DEBUG] staff persisted user_id=%s prev='%s' new='%s'", target.id, prev_staff, staff)
        except Exception as _e:
            logger.warning(f"[QR] Failed to persist staff on user: {_e}")

        # If admin typed a name for a new/manual user, persist it so it appears in All Users
        try:
            if raw_name:
                # Clean and collapse whitespace; limit length
                safe_name = re.sub(r'\s+', ' ', raw_name).strip()[:100]
                current_name = (getattr(target, 'name', None) or '').strip()
                logger.info("[QR][DEBUG] name persistence attempt user_id=%s raw='%s' safe='%s' prev='%s'", target.id, raw_name, safe_name, current_name)
                if safe_name and safe_name != current_name:
                    target.name = safe_name
                    db.session.commit()
                    logger.info("[QR][DEBUG] name persisted user_id=%s new='%s'", target.id, safe_name)
                else:
                    logger.info("[QR][DEBUG] name not changed user_id=%s (safe='%s', prev='%s')", target.id, safe_name, current_name)
            else:
                logger.info("[QR][DEBUG] no raw_name provided; skipping name persistence user_id=%s", target.id)
        except Exception as _e:
            logger.warning(f"[QR] Failed to persist name on user: {_e}")

        # Final snapshot after persistence
        try:
            db.session.refresh(target)
        except Exception:
            pass
        logger.info(
            "[QR][DEBUG] final snapshot user_id=%s email=%s name='%s' staff='%s'",
            getattr(target, 'id', None), getattr(target, 'email', None), getattr(target, 'name', None), getattr(target, 'signed_up_by_staff', None)
        )

        # Helper: extract first name via regex (letters + common separators)
        def extract_first_name(s: str):
            try:
                if not s:
                    return None
                m = re.search(r"[A-Za-z][A-Za-z\-']*", s)
                if not m:
                    return None
                return m.group(0).strip().title()
            except Exception:
                return None

        # Prefer stored user.name, else fall back to typed raw_name for personalization
        def clean_full_name(s: str) -> str:
            try:
                if not s:
                    return ''
                # collapse whitespace and trim
                import re as _re
                s2 = _re.sub(r'\s+', ' ', str(s)).strip()
                return s2[:100]
            except Exception:
                return ''

        welcome_name = ''
        if getattr(target, 'name', None):
            welcome_name = clean_full_name(target.name)
        elif raw_name:
            welcome_name = clean_full_name(raw_name)

        # Derive first name from whichever welcome_name we ended up with
        first_name = extract_first_name(welcome_name)

        # Create token (<= 2 minutes)
        token = OnboardingToken(user_id=target.id, email_used=chosen_email, ttl_seconds=120)
        db.session.add(token)
        db.session.commit()
        logger.info(f"[QR] token created jti={token.jti} user_id={target.id} expires_at={token.expires_at.isoformat()}")

        # Build public URL for token
        domain = os.getenv('CUSTOM_DOMAIN', 'https://bestdentistduluth.com')
        if not domain.startswith('http'):
            domain = f"https://{domain}"
        if not domain.endswith('/'):
            domain += '/'
        url = f"{domain}r/welcome?t={token.jti}"
        logger.info(f"[QR] URL for token jti={token.jti}: {url}")

        # Generate QR code (PNG) and convert to data URL
        try:
            import qrcode
            img = qrcode.make(url)
            bio = BytesIO()
            img.save(bio, format='PNG')
            png_bytes = bio.getvalue()
            data_uri = 'data:image/png;base64,' + base64.b64encode(png_bytes).decode('ascii')
            logger.info(f"[QR] data URL generated bytes={len(png_bytes)}")
        except Exception as e:
            logger.error(f"[QR] Failed to generate QR: {e}")
            return jsonify({'error': 'QR generation failed'}), 500

        expires_at = token.expires_at.isoformat()

        # Emit to iPad room
        try:
            socketio.emit('new_qr', {
                'qr_url': data_uri,
                'expires_at': expires_at,
                'landing_url': url,
                'first_name': first_name,
                'welcome_name': welcome_name,
            }, room='qr_display')
            logger.info(f"[QR] Emitted new_qr to room=qr_display expires_at={expires_at} url={url}")
        except Exception as e:
            logger.warning(f"[QR] SocketIO emit new_qr failed: {e}")

        # Send magic link email
        try:
            ok = email_service.send_magic_link(chosen_email, url)
            logger.info(f"[QR] Magic link email send result={ok} to={chosen_email}")
        except Exception as e:
            logger.warning(f"[QR] Failed to send magic link email: {e}")

        return jsonify({'message': 'QR generated', 'qr_url': data_uri, 'expires_at': expires_at, 'landing_url': url, 'user': target.to_dict()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"/admin/generate_qr error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/admin/clear_qr', methods=['POST'])
@require_admin()
def admin_clear_qr(user):
    try:
        socketio.emit('qr_clear', {'reason': 'manual'}, room='qr_display')
        logger.info(f"[QR] Emitted qr_clear (manual) to room=qr_display")
        return jsonify({'message': 'QR cleared'})
    except Exception as e:
        logger.warning(f"[QR] SocketIO emit qr_clear failed: {e}")
        return jsonify({'error': 'Failed to clear QR'}), 500

@app.route('/r/welcome', methods=['GET'])
def referral_welcome():
    """Validate token and show mobile-optimized landing page; mark token used; clear iPad QR."""
    try:
        t = (request.args.get('t') or '').strip()
        if not t:
            return Response('<h1>Invalid link</h1>', status=400)
        tok = OnboardingToken.query.get(t)
        if not tok:
            return Response('<h1>Link expired or invalid</h1>', status=400)
        # Allow previously used tokens to remain valid forever once opened.
        # Only block if never used AND past initial expiry window.
        if tok.used_at is None and datetime.utcnow() >= tok.expires_at:
            return Response('<h1>Link expired</h1>', status=400)

        # Mark used on first open and commit; keep usable afterwards
        if tok.used_at is None:
            tok.mark_used()
            db.session.commit()
            logger.info(f"[QR] Token used jti={tok.jti} user_id={tok.user_id} ip={request.remote_addr}")
        else:
            logger.info(f"[QR] Token reused jti={tok.jti} user_id={tok.user_id} ip={request.remote_addr}")

        # Clear QR on iPad
        try:
            socketio.emit('qr_clear', {'reason': 'scanned'}, room='qr_display')
            logger.info(f"[QR] Emitted qr_clear (scanned) to room=qr_display")
        except Exception as e:
            logger.warning(f"[QR] qr_clear emit on scan failed: {e}")

        # Prepare content for landing page
        ref_user = User.query.get(tok.user_id)
        referral_code = ref_user.referral_code if ref_user else '—'
        public_ref_link_base = os.getenv('CUSTOM_DOMAIN', 'https://bestdentistduluth.com')
        if not public_ref_link_base.startswith('http'):
            public_ref_link_base = f"https://{public_ref_link_base}"
        if not public_ref_link_base.endswith('/'):
            public_ref_link_base += '/'
        referral_link = f"{public_ref_link_base}ref/{referral_code}"

        # Render a simple, mobile-first landing page (no PII)
        html = f"""
<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>Duluth Dental Center — Referral</title>
    <style>
      :root {{ --mint: #3EB489; --blue: #1E90FF; }}
      body {{ margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #111; }}
      .container {{ max-width: 960px; margin: 0 auto; padding: 16px; }}
      .hero {{ position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }}
      .hero img {{ width: 100%; height: auto; display: block; }}
      .hero-text {{ position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 24px; background: linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.35)); color: #fff; }}
      .headline {{ font-size: clamp(24px, 6vw, 40px); font-weight: 800; margin: 0 0 8px; }}
      .subtext {{ font-size: clamp(14px, 3.5vw, 18px); max-width: 720px; margin: 0 0 16px; }}
      .btn {{ display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 12px 20px; border-radius: 999px; background: var(--mint); color: #fff; font-weight: 700; box-shadow: 0 6px 18px rgba(62,180,137,0.35); border: none; cursor: pointer; }}
      .btn:active {{ transform: translateY(1px); }}
      .card {{ border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); background: #fff; padding: 16px; margin-top: 16px; }}
      /* New mobile-first steps layout */
      .steps {{ display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 16px; }}
      .step-card {{ background: #fff; border-radius: 16px; box-shadow: 0 10px 24px rgba(0,0,0,0.06); padding: 16px 18px; text-align: center; }}
      .step-icon {{ display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }}
      .step-icon svg {{ width: 28px; height: 28px; stroke: var(--mint); stroke-width: 2.25; fill: none; }}
      .step-num {{ display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 9999px; background: #E6FFFA; color: #065F46; font-weight: 700; font-size: 14px; margin: 0 auto 6px; box-shadow: 0 2px 6px rgba(20,184,166,0.25); }}
      .step-title {{ font-weight: 800; font-size: 18px; margin: 4px 0; color: #0F172A; }}
      .step-desc {{ font-size: 14px; color: #4B5563; line-height: 1.45; margin: 0; }}
      @media (min-width: 640px) {{ .step-title {{ font-size: 19px; }} .step-desc {{ font-size: 15px; }} }}
      .muted {{ color: #555; }}
      .row {{ display: grid; grid-template-columns: 1fr; gap: 12px; }}
      @media (min-width: 740px) {{ .row {{ grid-template-columns: 1fr auto auto; }} }}
      /* Hide duplicate lower copy section (card immediately after steps) */
      .steps + .card {{ display: none; }}
      .input {{ width: 100%; min-height: 44px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; font-size: 16px; }}
      .hidden {{ display: none; }}
      .toast {{ position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: #111; color: #fff; padding: 10px 14px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.2); display: none; }}
      .footer {{ font-size: 12px; color: #666; margin: 24px 8px; text-align: center; }}
      a.terms {{ color: var(--blue); text-decoration: none; }}
    </style>
  </head>
  <body>
      <div class=\"container\">

      <div class=\"card\">\n        <div class=\"row\">\n          <input class=\"input\" id=\"refLink\" value=\"{referral_link}\" readonly />\n          <button class=\"btn\" id=\"copyBtn2\" data-copy=\"1\">Copy</button>\n          <button class=\"btn\" data-share=\"1\">Share</button>\n        </div>\n      </div>\n\n      <div class=\"steps\"> 
        <div class=\"step-card\">
          <div class=\"step-icon\">
            <!-- Share (outline) -->
            <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M15 8a3 3 0 1 0-2.83-4H12a3 3 0 0 0 3 3Z\" opacity=\"0\"/><circle cx=\"18\" cy=\"5\" r=\"3\" fill=\"none\"/><circle cx=\"6\" cy=\"12\" r=\"3\" fill=\"none\"/><circle cx=\"18\" cy=\"19\" r=\"3\" fill=\"none\"/><path d=\"M8.59 10.51 15.4 6.49M8.59 13.49 15.4 17.51\"/></svg>
          </div>
          <div class=\"step-num\">1</div>
          <div class=\"step-title\">Share</div>
          <p class=\"step-desc\">Send your referral link or QR code to a friend.</p>
        </div>
        <div class=\"step-card\">
          <div class=\"step-icon\">
            <!-- Calendar (outline) -->
            <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"17\" rx=\"2\" ry=\"2\" fill=\"none\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/></svg>
          </div>
          <div class=\"step-num\">2</div>
          <div class=\"step-title\">Friend Visits</div>
          <p class=\"step-desc\">Your friend books their first appointment at Duluth Dental Center.</p>
        </div>
        <div class=\"step-card\">
          <div class=\"step-icon\">
            <!-- Gift (outline) -->
            <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"3\" y=\"8\" width=\"18\" height=\"13\" rx=\"2\" ry=\"2\" fill=\"none\"/><path d=\"M12 8v13M3 12h18\"/><path d=\"M12 8c-1.657 0-3-1.343-3-3 0-.828.672-1.5 1.5-1.5C11.328 3.5 12 4.172 12 5v3Zm0 0c1.657 0 3-1.343 3-3 0-.828-.672-1.5-1.5-1.5C12.672 3.5 12 4.172 12 5v3Z\"/></svg>
          </div>
          <div class=\"step-num\">3</div>
          <div class=\"step-title\">You Earn</div>
          <p class=\"step-desc\">You receive a $50 reward after their first completed visit.</p>
        </div>
      </div>

      <div class=\"card\">
        <div class=\"row\">
          <input class=\"input\" id=\"refLink\" value=\"{referral_link}\" readonly />
          <button class=\"btn\" id=\"copyBtn2\" data-copy=\"1\">Copy</button>\n          <button class=\"btn\" data-share=\"1\">Share</button>
        </div>
      </div>

      <div class=\"card\">
        <details><summary><strong>How do I refer someone?</strong></summary><div class=\"muted\">Share your unique referral link (copied above) with friends or family. When they book and complete their first visit, you receive your reward.</div></details>
        <details><summary><strong>When will I receive my $50 reward?</strong></summary><div class=\"muted\">Rewards are issued after your referred friend completes their first appointment.</div></details>
        <details><summary><strong>Is there a limit to how many people I can refer?</strong></summary><div class=\"muted\">You can refer multiple people. Please see full terms for any limits or eligibility rules.</div></details>
      </div>

      <div class=\"footer\">
        Ask us about our referral program when you visit Duluth Dental Center. <a class=\"terms\" href=\"#\">View full terms and conditions</a>
      </div>
    </div>
    <div class=\"toast\" id=\"toast\">✅ Copied! Your referral link has been saved to your clipboard.</div>
    <script>
      const link = {json.dumps(referral_link)};
      const toasts = document.getElementById('toast');
      function showToast() {{ toasts.style.display = 'block'; setTimeout(() => toasts.style.display = 'none', 2000); }}
      async function copy() {{ try {{ await navigator.clipboard.writeText(link); showToast(); }} catch(e) {{ console.log(e); }} }}
      async function share() {{
        try {{
          if (navigator.share) {{
            await navigator.share({{ title: 'Your referral link', url: link }});
          }} else {{
            await navigator.clipboard.writeText(link);
            showToast();
          }}
        }} catch(e) {{ console.log(e); }}
      }}
      // Attach to all copy/share buttons
      try {{ document.querySelectorAll('[data-copy]').forEach(el => el.addEventListener('click', copy)); }} catch(e) {{}}
      try {{ document.querySelectorAll('[data-share]').forEach(el => el.addEventListener('click', share)); }} catch(e) {{}}
      const _btn1 = document.getElementById('copyBtn'); if (_btn1) _btn1.addEventListener('click', copy);
      const _btn2 = document.getElementById('copyBtn2'); if (_btn2) _btn2.addEventListener('click', copy);
    </script>
  </body>
 </html>
        """
        return Response(html, mimetype='text/html')
    except Exception as e:
        logger.error(f"/r/welcome error: {e}")
        return Response('<h1>Error</h1>', status=500)

@app.route('/admin/user/<int:user_id>/referrals', methods=['PUT'])
@require_admin()
def admin_adjust_user_referrals(user, user_id):
    """Adjust a user's referral counts by creating or downgrading referral records.
    Payload can include:
      - completed (int): desired total completed referrals (all-time)
      - signed_up (int): desired total signed-up referrals (all-time) [optional]
    """
    try:
        target_user = User.query.get_or_404(user_id)
        data = request.get_json() or {}
        desired_completed = data.get('completed')
        desired_signed_up = data.get('signed_up')

        changes = {'notes': []}

        # Adjust completed referrals if specified
        if isinstance(desired_completed, int) and desired_completed >= 0:
            current_completed = target_user.referrals_made.filter_by(status='completed').count()
            if desired_completed > current_completed:
                to_add = desired_completed - current_completed
                for _ in range(to_add):
                    r = Referral(referrer_id=target_user.id, referred_email=f"manual+{uuid.uuid4().hex[:8]}@example.com")
                    r.status = 'completed'
                    r.completed_at = datetime.utcnow()
                    r.origin = 'manual'
                    if target_user.can_earn_more():
                        r.earnings = 50.0
                        target_user.total_earnings += 50.0
                    else:
                        r.earnings = 0.0
                        changes['notes'].append('Annual cap reached; completed without earnings')
                    db.session.add(r)
                changes['completed'] = {'from': current_completed, 'to': desired_completed}
            elif desired_completed < current_completed:
                to_remove = current_completed - desired_completed
                refs = target_user.referrals_made.filter_by(status='completed').order_by(Referral.completed_at.desc()).limit(to_remove).all()
                removed = 0
                for r in refs:
                    if removed >= to_remove:
                        break
                    if r.earnings and r.earnings > 0:
                        target_user.total_earnings = max(0.0, (target_user.total_earnings or 0.0) - r.earnings)
                    r.status = 'signed_up'
                    r.earnings = 0.0
                    r.completed_at = None
                    removed += 1
                changes['completed'] = {'from': current_completed, 'to': desired_completed}

        # Adjust signed_up referrals if specified
        if isinstance(desired_signed_up, int) and desired_signed_up >= 0:
            current_signed = target_user.referrals_made.filter_by(status='signed_up').count()
            if desired_signed_up > current_signed:
                to_add = desired_signed_up - current_signed
                for _ in range(to_add):
                    r = Referral(referrer_id=target_user.id, referred_email=f"manual+{uuid.uuid4().hex[:8]}@example.com")
                    r.status = 'signed_up'
                    r.origin = 'manual'
                    db.session.add(r)
                changes['signed_up'] = {'from': current_signed, 'to': desired_signed_up}
            elif desired_signed_up < current_signed:
                to_remove = current_signed - desired_signed_up
                refs = target_user.referrals_made.filter_by(status='signed_up').order_by(Referral.created_at.desc()).limit(to_remove).all()
                removed = 0
                for r in refs:
                    if removed >= to_remove:
                        break
                    db.session.delete(r)
                    removed += 1
                changes['signed_up'] = {'from': current_signed, 'to': desired_signed_up}

        db.session.commit()

        return jsonify({
            'message': 'User referrals updated',
            'user': target_user.to_dict(),
            'stats': target_user.get_referral_stats(),
            'changes': changes
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error adjusting user referrals: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
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

@app.route('/admin/referral/<int:referral_id>', methods=['DELETE'])
@require_admin()
def delete_referral(user, referral_id):
    """Delete a referral. If completed with earnings, reverse payout from user's total_earnings."""
    try:
        referral = Referral.query.get_or_404(referral_id)
        referrer = referral.referrer

        # Reverse earnings if needed
        if referral.status == 'completed' and referral.earnings and referral.earnings > 0:
            referrer.total_earnings = max(0.0, (referrer.total_earnings or 0.0) - referral.earnings)

        db.session.delete(referral)
        db.session.commit()

        return jsonify({
            'message': 'Referral deleted',
            'referrer': referrer.to_dict(),
            'referrer_stats': referrer.get_referral_stats()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting referral: {str(e)}")
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
            'Signed Up By Staff', 'Origin', 'Status', 'Earnings', 'Created At', 'Completed At'
        ])
        
        # Write data
        for referral in referrals:
            writer.writerow([
                referral.id,
                referral.referrer.email,
                referral.referrer.referral_code,
                referral.referred_email,
                referral.signed_up_by_staff or '',
                referral.origin or 'link',
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

@app.route('/admin/upload_patients', methods=['POST'])
@require_admin()
def admin_upload_patients(user):
    """Upload a CSV of patients (first name, last name, email, phone).
    - Upserts into the User table.
    - Never sends emails or magic links.
    - Returns a summary of created/updated rows and any errors.
    Expected headers (case-insensitive, flexible):
      first, last, email, phone (accepts variants like first_name, last name, phone number)
    """
    try:
        # Accept either multipart file or raw CSV text in a 'csv' form field
        csv_bytes = None
        if 'file' in request.files:
            f = request.files['file']
            csv_bytes = f.read()
        else:
            raw = (request.form.get('csv') or request.get_data(as_text=True) or '').strip()
            if raw:
                csv_bytes = raw.encode('utf-8', 'ignore')

        if not csv_bytes:
            return jsonify({'error': 'No CSV provided'}), 400

        # Basic size guard (5 MB)
        if len(csv_bytes) > 5 * 1024 * 1024:
            return jsonify({'error': 'CSV too large (max 5MB)'}), 400

        import csv as _csv
        from io import StringIO as _StringIO

        text = csv_bytes.decode('utf-8', 'ignore')
        reader = _csv.DictReader(_StringIO(text))
        if not reader.fieldnames:
            return jsonify({'error': 'CSV missing header row'}), 400

        # Normalize header names: lowercase, strip, remove spaces and tabs
        def _norm(h):
            return ''.join(ch for ch in h.lower().strip() if ch not in {' ', '\\t'})

        # Build a mapping from normalized header to actual header
        header_map = { _norm(h): h for h in reader.fieldnames }

        # Helper to pull a value for a given logical field
        def get_val(row, keys):
            for k in keys:
                h = header_map.get(k)
                if h and h in row:
                    val = str(row[h]).strip()
                    if val:
                        return val
            return ''

        created = 0
        updated = 0
        skipped = 0
        errors = []
        row_num = 1  # header is row 1

        for row in reader:
            row_num += 1
            try:
                first = get_val(row, ['first', 'firstname', 'first_name', 'givenname'])
                last = get_val(row, ['last', 'lastname', 'last_name', 'surname', 'familyname'])
                email = get_val(row, ['email', 'emailaddress', 'email_address'])
                phone = get_val(row, ['phone', 'phonenumber', 'phone_number', 'mobile', 'cell'])

                if not email:
                    skipped += 1
                    errors.append({'row': row_num, 'error': 'Missing email'})
                    continue
                # Validate email format
                try:
                    validate_email(email)
                except EmailNotValidError:
                    skipped += 1
                    errors.append({'row': row_num, 'error': f'Invalid email: {email}'})
                    continue

                # Compose display name
                name = (first + ' ' + last).strip() if (first or last) else ''

                # Normalize phone (store digits only for searchability)
                phone_norm = None
                if phone:
                    digits = ''.join(ch for ch in phone if ch.isdigit())
                    if digits:
                        # Keep up to 15 digits (E.164 max without +)
                        phone_norm = digits[-15:]

                # Upsert by email (case-insensitive)
                u = User.query.filter_by(email=email.lower()).first()
                if not u:
                    u = User(email=email.lower())
                    if name:
                        u.name = name
                    if phone_norm:
                        u.phone = phone_norm
                    db.session.add(u)
                    created += 1
                else:
                    changed = False
                    if name and name != (u.name or ''):
                        u.name = name
                        changed = True
                    if phone_norm and phone_norm != (u.phone or ''):
                        u.phone = phone_norm
                        changed = True
                    if changed:
                        updated += 1
                # No emails or notifications are sent during import
            except Exception as e:
                db.session.rollback()
                errors.append({'row': row_num, 'error': str(e)})

        db.session.commit()
        return jsonify({
            'message': 'Import complete',
            'created': created,
            'updated': updated,
            'skipped': skipped,
            'errors': errors[:50],  # return up to 50 errors for brevity
            'total_rows': (row_num - 1)
        })
    except Exception as e:
        logger.error(f"/admin/upload_patients error: {e}")
        db.session.rollback()
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

@app.route('/admin/user/<int:user_id>', methods=['DELETE'])
@require_admin()
def admin_delete_user(user, user_id):
    """Delete a user and all their referral data. Reverse earnings from completed referrals."""
    try:
        target = User.query.get_or_404(user_id)

        # Do not allow deleting self by accident (optional safeguard)
        # if target.id == user.id:
        #     return jsonify({'error': 'Cannot delete currently logged-in admin user'}), 400

        # Reverse earnings and delete referrals made by this user
        referrals = target.referrals_made.all()
        reversed_earnings = 0.0
        completed_removed = 0
        signed_removed = 0
        for r in referrals:
            if r.status == 'completed' and r.earnings:
                target.total_earnings = max(0.0, (target.total_earnings or 0.0) - r.earnings)
                reversed_earnings += r.earnings
                completed_removed += 1
            elif r.status == 'signed_up':
                signed_removed += 1
            db.session.delete(r)

        # Delete referral clicks for this user
        clicks = ReferralClick.query.filter_by(referrer_id=target.id).all()
        clicks_removed = len(clicks)
        for c in clicks:
            db.session.delete(c)

        # Delete short-lived onboarding tokens tied to this user to satisfy FK constraints
        try:
            tokens = OnboardingToken.query.filter_by(user_id=target.id).all()
            for tok in tokens:
                db.session.delete(tok)
        except Exception as e:
            logger.warning(f"Failed to delete onboarding tokens for user {target.id}: {e}")

        db.session.delete(target)
        db.session.commit()

        return jsonify({
            'message': 'User deleted',
            'user_id': user_id,
            'removed': {
                'referrals_completed': completed_removed,
                'referrals_signed_up': signed_removed,
                'referral_clicks': clicks_removed
            },
            'reversed_earnings': reversed_earnings
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user: {str(e)}")
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
    # Use Socket.IO development server so the /socket.io endpoint works locally
    socketio.run(app, debug=debug, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
