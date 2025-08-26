import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { authAPI, handleAPIError } from './services/api';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 DEBUG: Starting authentication check...');
      try {
        console.log('🔍 DEBUG: Calling authAPI.getCurrentUser()...');
        const response = await authAPI.getCurrentUser();
        console.log('🔍 DEBUG: Auth API response:', response);
        setUser(response.user);
        setAuthenticated(true);
        console.log('🔍 DEBUG: User authenticated successfully:', response.user);
      } catch (error) {
        // User not authenticated, which is fine
        console.log('🔍 DEBUG: Authentication failed (expected for new users):', error);
        console.log('🔍 DEBUG: Error status:', error.response?.status);
        console.log('🔍 DEBUG: Error data:', error.response?.data);
        setAuthenticated(false);
        setUser(null);
      } finally {
        console.log('🔍 DEBUG: Setting loading to false...');
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setAuthenticated(false);
  };

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('🔍 DEBUG: Showing loading spinner...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-dental rounded-full flex items-center justify-center mb-4 shadow-dental">
            <span className="text-2xl">🦷</span>
          </div>
          <LoadingSpinner size="lg" className="text-primary-600 mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  console.log('🔍 DEBUG: App render - authenticated:', authenticated, 'user:', user);

  return (
    <Router>
      <div className="App min-h-screen bg-gray-50">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        
        {authenticated && user && (
          <Header user={user} onLogout={handleLogout} />
        )}
        
        <main className={authenticated && user ? '' : ''}>
          <Routes>
            <Route 
              path="/login" 
              element={
                authenticated ? (
                  console.log('🔍 DEBUG: Redirecting to / (user authenticated)') || <Navigate to="/" replace />
                ) : (
                  console.log('🔍 DEBUG: Rendering LoginPage') || <LoginPage onLogin={handleLogin} />
                )
              } 
            />
            
            <Route 
              path="/" 
              element={
                authenticated && user ? (
                  user.is_admin ? (
                    console.log('🔍 DEBUG: Rendering AdminDashboard') || <AdminDashboard user={user} />
                  ) : (
                    console.log('🔍 DEBUG: Rendering Dashboard') || <Dashboard user={user} />
                  )
                ) : (
                  console.log('🔍 DEBUG: Redirecting to /login (not authenticated)') || <Navigate to="/login" replace />
                )
              } 
            />
            
            <Route 
              path="/admin" 
              element={
                authenticated && user && user.is_admin ? (
                  <AdminDashboard user={user} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            
            {/* Catch all route */}
            <Route 
              path="*" 
              element={<Navigate to="/" replace />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;