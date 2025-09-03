import React, { useState } from 'react';
import { Mail, Send, Key, ArrowRight } from 'lucide-react';
import { authAPI, handleAPIError } from '../services/api';
import { isValidEmail } from '../utils/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const LoginPage = ({ onLogin }) => {
  const [step, setStep] = useState(1); // 1: email, 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

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
    const demoEmails = ['demo@example.com', 'admin@dentaloffice.com', 'user@demo.com'];
    const isDemoEmail = demoEmails.includes(email.toLowerCase().trim());
    
    try {
      await authAPI.sendOTP(email);
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
    
    setLoading(true);
    
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    try {
      console.log(`[Mobile Debug] Starting OTP verification for ${email}`);
      console.log(`[Mobile Debug] Is mobile: ${isMobile}`);
      console.log(`[Mobile Debug] User agent: ${navigator.userAgent}`);
      
      const result = await authAPI.verifyOTP(email, otp);
      console.log(`[Mobile Debug] OTP verification successful:`, result);
      
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
          toast.error(`Mobile session failed: ${sessionError.response?.data?.error || sessionError.message}. Please try again.`);
          return;
        }
      }
      
      console.log(`[Mobile Debug] Setting user in app state`);
      onLogin(result.user);
      toast.success('Login successful!');
      console.log(`[Mobile Debug] Login process completed successfully`);
    } catch (error) {
      console.error(`[Mobile Debug] OTP verification failed:`, error);
      console.error(`[Mobile Debug] Error details:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
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
          {step === 1 ? (
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

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
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
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center px-4">
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            By continuing, you agree to our terms of service and privacy policy.<br className="sm:hidden" />
            <span className="sm:inline block mt-1"> Your email will only be used for authentication and referral notifications.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;