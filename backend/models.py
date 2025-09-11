from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import string
import random
import uuid

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    referral_code = db.Column(db.String(10), unique=True, nullable=False)
    total_earnings = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False)
    signed_up_by_staff = db.Column(db.String(50), nullable=True)
    name = db.Column(db.String(100), nullable=True)
    
    # Relationship to referrals made by this user
    referrals_made = db.relationship('Referral', foreign_keys='Referral.referrer_id', backref='referrer', lazy='dynamic')
    
    def __init__(self, email, is_admin=False):
        self.email = email
        self.referral_code = self.generate_referral_code()
        self.is_admin = is_admin
    
    def generate_referral_code(self):
        """Generate a unique 8-character referral code"""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not User.query.filter_by(referral_code=code).first():
                return code
    
    def get_annual_earnings(self):
        """Get earnings from current year only"""
        current_year = datetime.utcnow().year
        start_of_year = datetime(current_year, 1, 1)
        end_of_year = datetime(current_year + 1, 1, 1)
        
        annual_earnings = db.session.query(db.func.sum(Referral.earnings)).filter(
            Referral.referrer_id == self.id,
            Referral.status == 'completed',
            Referral.completed_at >= start_of_year,
            Referral.completed_at < end_of_year
        ).scalar()
        
        return annual_earnings or 0.0
    
    def can_earn_more(self):
        """Check if user can earn more referrals this year"""
        return self.get_annual_earnings() < 500.0
    
    def get_referral_stats(self):
        """Get comprehensive referral statistics"""
        total_referrals = self.referrals_made.count()
        completed_referrals = self.referrals_made.filter_by(status='completed').count()
        pending_referrals = self.referrals_made.filter_by(status='pending').count()
        signed_up_referrals = self.referrals_made.filter_by(status='signed_up').count()
        
        annual_earnings = self.get_annual_earnings()
        remaining_earnings = max(0, 500.0 - annual_earnings)
        
        return {
            'total_referrals': total_referrals,
            'completed_referrals': completed_referrals,
            'pending_referrals': pending_referrals,
            'signed_up_referrals': signed_up_referrals,
            'annual_earnings': annual_earnings,
            'remaining_earnings': remaining_earnings,
            'can_earn_more': self.can_earn_more()
        }
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'referral_code': self.referral_code,
            'total_earnings': self.total_earnings,
            'created_at': self.created_at.isoformat(),
            'is_admin': self.is_admin,
            'signed_up_by_staff': self.signed_up_by_staff,
            'name': self.name,
        }

class Referral(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    referred_email = db.Column(db.String(120), nullable=False)
    referred_name = db.Column(db.String(100), nullable=True)
    referred_phone = db.Column(db.String(20), nullable=True)
    signed_up_by_staff = db.Column(db.String(50), nullable=True)  # Employee who signed up the patient
    status = db.Column(db.String(20), default='pending')  # pending, signed_up, completed
    origin = db.Column(db.String(20), default='link')  # 'link' (via referral link) or 'manual'
    earnings = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    tracking_id = db.Column(db.String(36), unique=True, nullable=False)
    
    def __init__(self, referrer_id, referred_email):
        self.referrer_id = referrer_id
        self.referred_email = referred_email
        self.tracking_id = str(uuid.uuid4())
    
    def mark_completed(self):
        """Mark referral as completed and award earnings"""
        if self.status != 'completed':
            referrer = User.query.get(self.referrer_id)
            if referrer and referrer.can_earn_more():
                self.status = 'completed'
                self.earnings = 50.0
                self.completed_at = datetime.utcnow()
                
                # Update user's total earnings
                referrer.total_earnings += 50.0
                
                return True
        return False
    
    def to_dict(self):
        return {
            'id': self.id,
            'referrer_id': self.referrer_id,
            'referred_email': self.referred_email,
            'referred_name': self.referred_name,
            'referred_phone': self.referred_phone,
            'signed_up_by_staff': self.signed_up_by_staff,
            'origin': self.origin,
            'status': self.status,
            'earnings': self.earnings,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'tracking_id': self.tracking_id
        }

class OTPToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    token = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, email):
        self.email = email
        self.token = self.generate_token()
        self.expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    def generate_token(self):
        """Generate a 6-digit OTP token"""
        return ''.join(random.choices(string.digits, k=6))
    
    def is_valid(self):
        """Check if token is still valid and not used"""
        return not self.used and datetime.utcnow() < self.expires_at
    
    def use_token(self):
        """Mark token as used"""
        self.used = True
        db.session.commit()
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'expires_at': self.expires_at.isoformat(),
            'used': self.used,
            'created_at': self.created_at.isoformat()
        }

class ReferralClick(db.Model):
    """Track referral link clicks for analytics"""
    id = db.Column(db.Integer, primary_key=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    clicked_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, referrer_id, ip_address=None, user_agent=None):
        self.referrer_id = referrer_id
        self.ip_address = ip_address
        self.user_agent = user_agent
    
    def to_dict(self):
        return {
            'id': self.id,
            'referrer_id': self.referrer_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'clicked_at': self.clicked_at.isoformat()
        }

class QREvent(db.Model):
    """Record of QR code scans (by hitting our redirect endpoints)."""
    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(20), nullable=False)  # e.g., 'login', 'review'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'kind': self.kind,
            'created_at': self.created_at.isoformat(),
        }

class OnboardingToken(db.Model):
    """Short-lived token that links a user (patient) to a magic onboarding URL.
    The token string itself must not include PHI; we store mapping in DB.
    """
    jti = db.Column(db.String(64), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    email_used = db.Column(db.String(120), nullable=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('onboarding_tokens', lazy='dynamic'))

    def __init__(self, user_id, email_used=None, ttl_seconds=120):
        self.jti = uuid.uuid4().hex
        self.user_id = user_id
        self.email_used = email_used
        self.expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)

    def is_valid(self):
        return (self.used_at is None) and (datetime.utcnow() < self.expires_at)

    def mark_used(self):
        self.used_at = datetime.utcnow()
