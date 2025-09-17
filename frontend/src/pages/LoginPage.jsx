import React, { useState } from 'react';
import { Mail, Send, Key, ArrowRight } from 'lucide-react';
import { authAPI, handleAPIError, API_URL } from '../services/api';
import { isValidEmail } from '../utils/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const LoginPage = ({ onLogin }) => {
  const [step, setStep] = useState(1); // 1: email, 2: OTP
  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const STAFF_MEMBERS = ["Amanda", "Taquila", "Monti", "Sanita", "Ben"];
  const [staff, setStaff] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [needsStaff, setNeedsStaff] = useState(true);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    
    // Check if this is a demo email
  const demoEmails = ['demo@duluthdentalcenter.com', 'drtshifrin@gmail.com', 'user@demo.com'];
    const normEmail = email.toLowerCase().trim();
    const isDemoEmail = demoEmails.includes(normEmail);
    
    try {
      const res = await authAPI.sendOTP(email);
      // Admin/demo accounts should not be forced to select staff
      if (isDemoEmail) {
        setNeedsStaff(false);
      } else {
        setNeedsStaff(!(res?.has_staff));
      }
      setOtpSent(true);
      setStep(2);
      toast.success('OTP sent to your email');
    } catch (error) {
      if (isDemoEmail) {
        // For demo emails, proceed to OTP step even if sending fails
        setOtpSent(true);
        setStep(2);
        toast.success('Demo mode: Use code 123456');
      } else {
        toast.error(handleAPIError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp.trim() || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    if (needsStaff && !staff) {
      toast.error('Please select the team member who helped you');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    setLoading(true);
    
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    try {
      console.log(`[Mobile Debug] Starting OTP verification for ${email}`);
      console.log(`[Mobile Debug] Is mobile: ${isMobile}`);
      console.log(`[Mobile Debug] User agent: ${navigator.userAgent}`);
      
      console.log('[Login] Submitting OTP verify payload:', { email, token: otp, staff: needsStaff ? staff : undefined, name });
      const result = await authAPI.verifyOTP(email, otp, needsStaff ? staff : undefined, name.trim());
      console.log(`[Mobile Debug] OTP verification successful:`, result);
      
      // Report success to server for mobile tracking
      if (isMobile) {
        try {
          await fetch(`${API_URL}/debug/mobile-error`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify({
              message: 'MOBILE OTP SUCCESS',
              data: {email, hasResult: !!result},
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            })
          });
        } catch (reportError) {
          console.warn('Failed to report mobile success:', reportError);
        }
      }
      
      // For mobile browsers, verify session persistence immediately
      if (isMobile) {
        console.log(`[Mobile Debug] Starting mobile session verification`);
        try {
          // Small delay to ensure session is fully saved
          await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1 second
          
          // Verify session is working
          const sessionCheck = await authAPI.getCurrentUser();
          console.log(`[Mobile Debug] Session verification successful:`, sessionCheck);
        } catch (sessionError) {
          console.error(`[Mobile Debug] Session verification failed:`, sessionError);
          console.error(`[Mobile Debug] Session error details:`, {
            status: sessionError.response?.status,
            statusText: sessionError.response?.statusText,
            data: sessionError.response?.data,
            message: sessionError.message
          });
          
          // Report session verification failure to server
          try {
            await fetch(`${API_URL}/debug/mobile-error`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              credentials: 'include',
              body: JSON.stringify({
                message: 'MOBILE SESSION VERIFICATION FAILED',
                data: {
                  email,
                  error: sessionError.message,
                  status: sessionError.response?.status,
                  responseData: sessionError.response?.data
                },
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
              })
            });
          } catch (reportError) {
            console.warn('Failed to report session error:', reportError);
          }
          
          toast.error(`Mobile session failed: ${sessionError.response?.data?.error || sessionError.message}. Please try again.`);
          return;
        }
      }
      
      // After OTP verify, require set-password if needed
      try {
        const me = await authAPI.getCurrentUser();
        if (me.must_set_password) {
          window.location.href = '/set-password';
          return;
        }
        onLogin(me.user);
      } catch {
        onLogin(result.user);
      }
      toast.success('OTP verified');
    } catch (error) {
      console.error(`[Mobile Debug] OTP verification failed:`, error);
      console.error(`[Mobile Debug] Error details:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Report OTP verification failure to server
      if (isMobile) {
        try {
          await fetch(`${API_URL}/debug/mobile-error`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify({
              message: 'MOBILE OTP VERIFICATION FAILED',
              data: {
                email,
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data
              },
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            })
          });
        } catch (reportError) {
          console.warn('Failed to report OTP error:', reportError);
        }
      }
      
      const errorMessage = error.response?.data?.error || error.message || 'OTP verification failed';
      toast.error(`Mobile login error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep(1);
    setOtp('');
    setOtpSent(false);
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await authAPI.sendOTP(email);
      toast.success('New OTP sent to your email');
    } catch (error) {
      toast.error(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error('Enter a valid email');
      return;
    }
    if (!otp.trim()) { /* reuse OTP state as password field in password mode */
      toast.error('Enter your password');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.loginWithPassword(email.toLowerCase().trim(), otp);
      toast.success('Logged in');
      if (typeof onLogin === 'function') onLogin(res.user);
      window.location.href = '/';
    } catch (error) {
      toast.error(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 to-blue-50">
      <div className="mx-auto w-full max-w-sm sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20 bg-gradient-dental rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-dental">
            <span className="text-2xl sm:text-3xl">🦷</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Access your dental referral dashboard
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 mx-auto w-full max-w-sm sm:max-w-md">
        <div className="card">
          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-3">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                    className="input-field pl-12 h-12 text-base"
                    placeholder="Enter your email address"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-3">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="input-field h-12 text-base"
                  placeholder="Your password"
                  disabled={loading}
                />
              </div>

              <button type="submit" disabled={loading || !email.trim() || !otp.trim()} className="w-full btn-primary h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (<><LoadingSpinner size="sm" className="mr-2" /> Signing in…</>) : (<><Send className="h-4 w-4 mr-2" /> Sign In</>)}
              </button>

              <div className="flex flex-col space-y-3 text-center">
                <button type="button" className="text-xs sm:text-sm text-primary-600 hover:text-primary-500 leading-tight px-4" onClick={() => { setMode('otp'); setStep(1); }}>
                  First time or no password? Use a code
                </button>
                <a href="/reset-password" className="text-xs sm:text-sm text-primary-600 hover:text-primary-500 leading-tight px-4">
                  Forgot password?
                </a>
              </div>
            </form>
          ) : step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-3">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                    className="input-field pl-12 h-12 text-base"
                    placeholder="Enter your email address"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full btn-primary h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Login Code
                  </>
                )}
              </button>
              <div className="text-center">
                <button type="button" className="text-sm text-primary-600" onClick={() => setMode('password')}>Sign in with password</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="text-center">
                <div className="mx-auto h-14 w-14 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <Key className="h-7 w-7 text-primary-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                  Enter Verification Code
                </h3>
                <p className="text-sm text-gray-600 px-2">
                  Enter the 6-digit code for <span className="font-medium break-all">{email}</span>
                </p>
              </div>

              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-3">
                  Verification Code
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center text-xl sm:text-2xl font-mono tracking-widest h-14"
                  placeholder="123456"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-3">
                  Your Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field h-12 text-base"
                  placeholder="e.g., Jane Doe"
                  disabled={loading}
                />
              </div>

              {needsStaff && (
                <div>
                  <label htmlFor="staff" className="block text-sm font-medium text-gray-700 mb-3">
                    Team Member Who Helped You
                  </label>
                  <select
                    id="staff"
                    name="staff"
                    value={staff}
                    onChange={(e) => setStaff(e.target.value)}
                    className="input-field h-12 text-base"
                    disabled={loading}
                    required
                  >
                    <option value="">Select team member</option>
                    {STAFF_MEMBERS.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6 || !name.trim() || (needsStaff && !staff)}
                className="w-full btn-primary h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Continue
                  </>
                )}
              </button>

              <div className="flex flex-col space-y-3 text-center pt-2">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm sm:text-base text-primary-600 hover:text-primary-500 font-medium disabled:opacity-50 py-2"
                >
                  Didn't receive the code? Resend
                </button>
                
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  disabled={loading}
                  className="text-sm text-gray-500 hover:text-gray-400 disabled:opacity-50 py-2"
                >
                  Use a different email address
                </button>
                <button type="button" className="text-sm text-primary-600" onClick={() => setMode('password')}>Sign in with password</button>
                <a href="/reset-password" className="text-sm text-primary-600">Forgot password?</a>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center px-6 sm:px-8">
          <p className="text-xs text-gray-500 leading-loose max-w-sm mx-auto">
            By continuing, you agree to our terms of service and privacy policy.
            Your email will only be used for authentication and referral notifications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
