# Setup Instructions - Dental Office Referral Program

This guide will help you set up and run the dental office referral program on your local machine.

## Prerequisites

Make sure you have the following installed:
- Python 3.8+ 
- Node.js 16+
- npm or yarn
- Git

## Quick Start

### 1. Clone and Setup Backend

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Backend Environment

Edit `backend/.env` with your email settings:

```bash
SECRET_KEY=your-secret-key-here
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
ADMIN_EMAIL=drtshifrin@gmail.com
DATABASE_URL=sqlite:///database.db
```

**Important**: For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an "App Password" for EMAIL_PASSWORD
3. Use the app password, not your regular Gmail password

### 3. Setup Frontend

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### 4. Run the Application

**Terminal 1 (Backend):**
```bash
cd backend
source venv/bin/activate  # If not already activated
python app.py
```
The backend will run on `http://localhost:5000`

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```
The frontend will run on `http://localhost:3000`

## Email Configuration

### Gmail Setup
1. Go to Google Account settings
2. Enable 2-Step Verification
3. Generate App Password:
   - Go to Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - Use this password in your .env file

### Other Email Providers
Update the SMTP settings in `.env`:
- **Outlook/Hotmail**: `smtp-mail.outlook.com`, port 587
- **Yahoo**: `smtp.mail.yahoo.com`, port 587

## Testing the Application

### 1. Admin Access
The admin user is automatically created with the email specified in `ADMIN_EMAIL`.

To login as admin:
1. Go to `http://localhost:3000`
2. Enter your admin email
3. Check your email for the OTP code
4. Login to access the admin dashboard

### 2. Regular User Testing
1. Use any other email address to login as a regular user
2. Copy your referral link from the dashboard
3. Open the referral link in an incognito/private browser window
4. Sign up with a different email address
5. Go back to admin dashboard to mark the referral as completed

## Database

The application uses SQLite by default, creating a `database.db` file in the backend directory.

### Database Schema
- **users**: User accounts with referral codes
- **referrals**: Referral tracking records
- **otp_tokens**: One-time password tokens
- **referral_clicks**: Click tracking for analytics

### Switching to PostgreSQL (Production)
1. Install PostgreSQL
2. Create a database
3. Update `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://username:password@localhost/database_name
   ```
4. Install psycopg2: `pip install psycopg2-binary`

## Production Deployment

### Backend (Flask)
```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn app:app --bind 0.0.0.0:5000
```

### Frontend (React)
```bash
# Build for production
npm run build

# Serve static files with a web server (nginx, Apache, etc.)
```

### Environment Variables for Production
Update these in your production environment:
- `SECRET_KEY`: Use a strong, random secret key
- `SMTP_*`: Configure with your production email service
- `DATABASE_URL`: Point to your production database

## Troubleshooting

### Common Issues

**1. Email not sending**
- Check SMTP credentials in `.env`
- Verify app password for Gmail
- Check firewall/network restrictions

**2. Database errors**
- Ensure backend directory is writable
- Check Python virtual environment is activated
- Verify SQLite permissions

**3. Frontend not connecting to backend**
- Confirm backend is running on port 5000
- Check CORS configuration in Flask app
- Verify REACT_APP_API_URL in frontend/.env

**4. Port already in use**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Development Tips

**Backend Development**
- Use `flask run --debug` for auto-reload
- Check logs in terminal for API errors
- Test API endpoints with curl or Postman

**Frontend Development**
- Browser dev tools for debugging
- React Developer Tools extension
- Check Network tab for API call issues

## Security Notes

- Never commit `.env` files to version control
- Use strong secret keys in production
- Enable HTTPS in production
- Regularly update dependencies
- Consider rate limiting for API endpoints

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure all environment variables are set correctly
4. Check console/terminal for error messages
