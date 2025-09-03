import React from 'react';
import { LogOut, User, Settings } from 'lucide-react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const Header = ({ user, onLogout }) => {
  const handleLogout = async () => {
    try {
      await authAPI.logout();
      onLogout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gradient">
                🦷 Dental Referral Program
              </h1>
            </div>
          </div>
          
          {/* User menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user && (
              <>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <div className="flex flex-col sm:block">
                    <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[120px] sm:max-w-none">
                      {user.email}
                    </span>
                    {user.is_admin && (
                      <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mt-1 sm:mt-0 sm:ml-2">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 min-h-[44px] touch-manipulation"
                >
                  <LogOut className="h-4 w-4 sm:mr-1" />
                  <span className="ml-1 sm:ml-0">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;