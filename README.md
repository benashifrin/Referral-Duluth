# Dental Office Referral Program

A full-stack web application for managing a dental office referral program with OTP authentication, referral tracking, and earnings management.

## Features

- **Authentication**: Email-based OTP login system
- **Referral System**: Unique referral links with tracking
- **Earnings**: $50 per completed referral, $500 annual limit
- **Dashboard**: Progress tracking and referral management
- **Admin Panel**: Mark referrals as completed
- **Mobile-First**: Responsive design with Tailwind CSS

## Tech Stack

- **Backend**: Python Flask with SQLite
- **Frontend**: React with Tailwind CSS
- **Authentication**: Email OTP system
- **Database**: SQLite (easily upgradeable to Postgres)

## Quick Setup

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure your email settings in .env file
# See SETUP.md for detailed instructions

python app.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

**⚠️ Important**: Before running, you must configure email settings in `backend/.env`. See [SETUP.md](SETUP.md) for detailed setup instructions.

## Project Structure

```
dental-referral-app/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── models.py           # Database models
│   ├── auth.py             # Authentication routes
│   ├── referrals.py        # Referral routes
│   ├── admin.py            # Admin routes
│   ├── email_service.py    # Email/OTP service
│   ├── requirements.txt    # Python dependencies
│   └── database.db         # SQLite database
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   ├── public/
│   └── package.json        # Node dependencies
└── README.md
```

## API Endpoints

### Authentication
- `POST /auth/send-otp` - Send OTP to email
- `POST /auth/verify-otp` - Verify OTP and login
- `POST /auth/logout` - Logout user

### Referrals
- `GET /api/user/dashboard` - Get user dashboard data
- `GET /api/user/referrals` - Get user's referrals
- `POST /api/referral/track` - Track referral click
- `POST /api/referral/signup` - Track referral signup

### Admin
- `GET /admin/referrals` - Get all referrals
- `PUT /admin/referral/:id/complete` - Mark referral as completed
- `GET /admin/export` - Export referrals to CSV

## Environment Variables

Create `.env` files in both backend and frontend directories:

### Backend `.env`
```
SECRET_KEY=your-secret-key-here
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
ADMIN_EMAIL=admin@dentaloffice.com
```

### Frontend `.env`
```
REACT_APP_API_URL=http://localhost:5000
```

## Database Schema

### Users Table
- id (Primary Key)
- email (Unique)
- referral_code (Unique)
- total_earnings (Default: 0)
- created_at
- is_admin (Default: False)

### Referrals Table
- id (Primary Key)
- referrer_id (Foreign Key to Users)
- referred_email
- status (pending/signed_up/completed)
- earnings (Default: 0)
- created_at
- completed_at

### OTP Tokens Table
- id (Primary Key)
- email
- token
- expires_at
- used (Default: False)

## Development

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Frontend build
cd frontend
npm run build

# Backend production server
cd backend
gunicorn app:app
```# Force redeploy Thu Aug 28 16:32:38 MDT 2025
