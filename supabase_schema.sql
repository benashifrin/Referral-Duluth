-- Supabase Database Schema for Dental Referral Program

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    referral_code VARCHAR(10) UNIQUE NOT NULL,
    total_earnings DECIMAL(10,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT FALSE
);

-- Referrals table
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) NOT NULL,
    referrer_id INTEGER REFERENCES users(id),
    referral_code_used VARCHAR(10),
    status VARCHAR(20) DEFAULT 'pending',
    reward_amount DECIMAL(10,2) DEFAULT 50.0,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP NULL
);

-- OTP Tokens table
CREATE TABLE otp_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) NOT NULL,
    token VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Referral Clicks table
CREATE TABLE referral_clicks (
    id SERIAL PRIMARY KEY,
    referral_code VARCHAR(10) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    clicked_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_referrals_email ON referrals(email);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_otp_tokens_email ON otp_tokens(email);
CREATE INDEX idx_otp_tokens_expires_at ON otp_tokens(expires_at);

-- Insert admin user (update email as needed)
INSERT INTO users (email, referral_code, is_admin) 
VALUES ('admin@dentaloffice.com', 'ADMIN123', TRUE)
ON CONFLICT (email) DO NOTHING;