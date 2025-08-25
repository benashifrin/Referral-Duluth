# Deploy to Render (No Docker Required)

This guide will help you deploy the Dental Referral Program to Render using their native build process.

## 🚀 Quick Deploy

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Deploy on Render**
   - Go to [Render.com](https://render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repo
   - Render will automatically detect the `render.yaml` file and deploy both services

## 📋 Manual Setup (Alternative)

If you prefer to set up services manually:

### Backend Setup
1. **Create Web Service**
   - Runtime: Python 3
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && gunicorn app:app`

2. **Environment Variables**
   ```
   FLASK_ENV=production
   SECRET_KEY=(auto-generate)
   DATABASE_URL=(from PostgreSQL service)
   ADMIN_EMAIL=admin@dentaloffice.com
   
   # Optional email settings (app works without these)
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

### Frontend Setup
1. **Create Static Site**
   - Runtime: Node
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/build`

2. **Environment Variables**
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   ```

### Database Setup
1. **Create PostgreSQL Database**
   - Plan: Free
   - Database Name: `dental_referral`
   - User: `dental_user`

## 🔐 Demo Login Credentials

After deployment, you can use these demo credentials:

**Regular User:**
- Email: `demo@example.com`
- OTP: `123456`

**Admin User:**
- Email: `admin@dentaloffice.com`  
- OTP: `123456`

## ⚙️ Important Notes

1. **Database Migration**: The app will automatically create tables on first run
2. **Admin User**: An admin user is automatically created with the email from `ADMIN_EMAIL`
3. **Email Optional**: The app works without email configuration using demo mode
4. **Free Tier**: All services can run on Render's free tier
5. **Cold Starts**: Free tier services may have cold start delays

## 🛠️ Post-Deployment

1. **Test the Backend**: Visit `https://your-backend.onrender.com/health`
2. **Test the Frontend**: Visit your frontend URL
3. **Login**: Use demo credentials to test functionality
4. **Admin Access**: Login with admin email to access admin dashboard

## 📞 Production Setup

For production use:

1. **Custom Domain**: Add your domain in Render dashboard
2. **Email Setup**: Configure SMTP settings for real OTP emails  
3. **Database Backup**: Consider upgrading to paid PostgreSQL for backups
4. **Environment**: Remove demo credentials and use real email validation

## 🐛 Troubleshooting

**Build Failures:**
- Check build logs in Render dashboard
- Ensure all dependencies are in requirements.txt/package.json

**Database Connection:**
- Verify DATABASE_URL environment variable
- Check PostgreSQL service is running

**Email Issues:**
- App works without email config (demo mode)
- For real emails, use Gmail app passwords

## 📁 File Structure

```
project/
├── render.yaml          # Render deployment config
├── backend/
│   ├── app.py           # Flask app
│   ├── requirements.txt # Python dependencies
│   └── ...
├── frontend/
│   ├── package.json     # Node dependencies  
│   ├── src/             # React source
│   └── ...
└── DEPLOY_RENDER.md     # This guide
```

Your app should be live at:
- Frontend: `https://dental-referral-frontend.onrender.com`
- Backend: `https://dental-referral-backend.onrender.com`