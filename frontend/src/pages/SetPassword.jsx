import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
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
      await authAPI.setPassword(password, confirm);
      toast.success('Password set. Redirecting…');
      window.location.href = '/';
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Set Your Password</h1>
        <p className="text-sm text-gray-600 mb-6">Please create a password to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" className="input-field w-full" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" className="input-field w-full" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (<><LoadingSpinner size="sm" className="mr-2"/> Saving…</>) : 'Save Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

