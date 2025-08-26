import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { authAPI, handleAPIError } from './services/api';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import QuotePage from './pages/QuotePage';
import DemoPage from './pages/DemoPage';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check if already authenticated or on public pages
      const publicRoutes = ['/login', '/quote', '/demo'];
      if (authenticated || publicRoutes.includes(window.location.pathname)) {
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.user);
        setAuthenticated(true);
      } catch (error) {
        // User not authenticated, which is fine
        setAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []); // Run only once on mount

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
                  <Navigate to="/" replace />
                ) : (
                  <LoginPage onLogin={handleLogin} />
                )
              } 
            />
            
            <Route 
              path="/" 
              element={
                authenticated && user ? (
                  user.is_admin ? (
                    <AdminDashboard user={user} />
                  ) : (
                    <Dashboard user={user} />
                  )
                ) : (
                  <Navigate to="/login" replace />
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

            {/* Public quote page */}
            <Route 
              path="/quote" 
              element={<QuotePage />} 
            />

            {/* Public demo page */}
            <Route 
              path="/demo" 
              element={<DemoPage />} 
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