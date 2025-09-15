import React, { useState } from 'react';
import { authAPI, handleAPIError } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [step, setStep] = useState(1); // 1: request, 2: confirm
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.requestPasswordReset(email.trim().toLowerCase());
      toast.success('If this email exists, a code has been sent');
      setStep(2);
    } catch (err) {
      toast.error(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authAPI.confirmPasswordReset({ email: email.trim().toLowerCase(), token: token.trim(), password, confirm });
      toast.success('Password reset');
      window.location.href = '/';
    } catch (err) {
      toast.error(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Reset Password</h1>
        {step === 1 ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input-field w-full" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (<><LoadingSpinner size="sm" className="mr-2"/> Sending…</>) : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reset Code</label>
              <input type="text" className="input-field w-full" value={token} onChange={e=>setToken(e.target.value)} required placeholder="6-digit code" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" className="input-field w-full" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="At least 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" className="input-field w-full" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (<><LoadingSpinner size="sm" className="mr-2"/> Resetting…</>) : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

