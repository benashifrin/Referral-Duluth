import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Gift,
  RefreshCw,
  Eye
} from 'lucide-react';
import { userAPI, handleAPIError } from '../services/api';
import { formatCurrency } from '../utils/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import StatsCard from '../components/StatsCard';
import ProgressBar from '../components/ProgressBar';
import ReferralLink from '../components/ReferralLink';
import ReferralTable from '../components/ReferralTable';
import toast from 'react-hot-toast';

const Dashboard = ({ user }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllReferrals, setShowAllReferrals] = useState(false);

  const loadDashboardData = async () => {
    try {
      const data = await userAPI.getDashboard();
      setDashboardData(data);
    } catch (error) {
      toast.error(handleAPIError(error));
    }
  };

  const loadReferrals = async () => {
    try {
      const data = await userAPI.getReferrals(1, 50); // Load more for full view
      setReferrals(data.referrals);
    } catch (error) {
      toast.error(handleAPIError(error));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadReferrals()]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadDashboardData(), loadReferrals()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" className="text-primary-600 mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load dashboard data</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { stats, referral_link } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Hero Section */}
        <div className="bg-gradient-dental rounded-xl p-4 sm:p-8 text-white mb-6 sm:mb-8 shadow-dental">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
                Earn up to {formatCurrency(500)} per year!
              </h1>
              <p className="text-primary-100 text-sm sm:text-base lg:text-lg">
                Refer friends and family to earn rewards for each completed appointment.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors duration-200 disabled:opacity-50 shrink-0 h-10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
          
          <div className="mt-6 sm:mt-8">
            <ProgressBar 
              current={stats.annual_earnings} 
              maximum={500} 
              className="mb-4"
            />
            <div className="text-center">
              <p className="text-primary-100 text-sm sm:text-base">
                You've earned <span className="font-bold text-white">{formatCurrency(stats.annual_earnings)}</span> this year
                {stats.remaining_earnings > 0 && (
                  <span className="block sm:inline"> • <span className="font-bold text-white">{formatCurrency(stats.remaining_earnings)}</span> left to earn</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatsCard
            title="Total Referrals"
            value={stats.total_referrals}
            icon={Users}
            color="primary"
          />
          <StatsCard
            title="Total Earned"
            value={stats.annual_earnings}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="Left to Earn"
            value={stats.remaining_earnings}
            icon={TrendingUp}
            color="blue"
          />
          <StatsCard
            title="Completed"
            value={stats.completed_referrals}
            icon={Gift}
            color="purple"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Referral Link */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <ReferralLink referralLink={referral_link} />
            
            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm sm:text-base">Pending</span>
                  <span className="font-medium text-sm sm:text-base">{stats.pending_referrals}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm sm:text-base">Signed Up</span>
                  <span className="font-medium text-blue-600 text-sm sm:text-base">{stats.signed_up_referrals}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm sm:text-base">Completed</span>
                  <span className="font-medium text-green-600 text-sm sm:text-base">{stats.completed_referrals}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Referrals Table */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Your Referrals
                </h3>
                <button
                  onClick={() => setShowAllReferrals(!showAllReferrals)}
                  className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-500 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {showAllReferrals ? 'Show Recent' : 'Show All'}
                </button>
              </div>
              
              <ReferralTable 
                referrals={showAllReferrals ? referrals : referrals.slice(0, 5)} 
              />
              
              {referrals.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start Earning Today!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Copy your referral link and share it with friends and family.
                    For each person who completes their first appointment, you'll earn $50!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="card">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-gray-700 font-medium text-sm sm:text-base">Share Your Link</p>
                  <p className="text-gray-600 text-xs sm:text-sm">Copy and share your unique referral link with friends and family.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-gray-700 font-medium text-sm sm:text-base">They Sign Up</p>
                  <p className="text-gray-600 text-xs sm:text-sm">When someone uses your link to schedule their first appointment.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-gray-700 font-medium text-sm sm:text-base">You Earn $50</p>
                  <p className="text-gray-600 text-xs sm:text-sm">Once they complete their appointment, you earn $50 credit!</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
            <div className="space-y-2 text-xs sm:text-sm text-gray-600">
              <p>• Maximum earnings: $500 per calendar year</p>
              <p>• Earnings are credited after referred patient's first completed appointment</p>
              <p>• Self-referrals and duplicate referrals are not eligible</p>
              <p>• Credits can be applied to your dental services</p>
              <p>• Program terms may change with notice</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;