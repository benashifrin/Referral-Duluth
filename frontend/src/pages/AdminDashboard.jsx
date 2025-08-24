import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  Clock,
  Download,
  CheckCircle,
  Filter,
  RefreshCw
} from 'lucide-react';
import { adminAPI, handleAPIError } from '../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../utils/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import StatsCard from '../components/StatsCard';
import ReferralTable from '../components/ReferralTable';
import toast from 'react-hot-toast';

const AdminDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [completingReferralId, setCompletingReferralId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const loadStats = async () => {
    try {
      const data = await adminAPI.getStats();
      setStats(data);
    } catch (error) {
      toast.error(handleAPIError(error));
    }
  };

  const loadReferrals = async (page = 1, status = '') => {
    try {
      const data = await adminAPI.getAllReferrals(page, 20, status);
      setReferrals(data.referrals);
      setTotalPages(data.pages);
      setCurrentPage(page);
    } catch (error) {
      toast.error(handleAPIError(error));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadReferrals(currentPage, statusFilter)]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleCompleteReferral = async (referralId) => {
    if (!window.confirm('Mark this referral as completed? This will award $50 to the referrer.')) {
      return;
    }

    setCompletingReferralId(referralId);
    try {
      await adminAPI.completeReferral(referralId);
      await Promise.all([loadStats(), loadReferrals(currentPage, statusFilter)]);
      toast.success('Referral marked as completed!');
    } catch (error) {
      toast.error(handleAPIError(error));
    } finally {
      setCompletingReferralId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await adminAPI.exportReferrals();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `referrals_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Referrals exported successfully!');
    } catch (error) {
      toast.error(handleAPIError(error));
    } finally {
      setExporting(false);
    }
  };

  const handleStatusFilterChange = async (newStatus) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    await loadReferrals(1, newStatus);
  };

  const handlePageChange = async (newPage) => {
    await loadReferrals(newPage, statusFilter);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadReferrals()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" className="text-primary-600 mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage referrals and track program performance</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-secondary"
            >
              {exporting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Users"
              value={stats.total_users}
              icon={Users}
              color="primary"
            />
            <StatsCard
              title="Total Referrals"
              value={stats.total_referrals}
              icon={UserCheck}
              color="blue"
            />
            <StatsCard
              title="Completed Referrals"
              value={stats.completed_referrals}
              icon={CheckCircle}
              color="green"
            />
            <StatsCard
              title="Total Paid Out"
              value={stats.total_earnings_paid}
              icon={DollarSign}
              color="purple"
            />
          </div>
        )}

        {/* Referrals Management */}
        <div className="card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            <h2 className="text-xl font-semibold text-gray-900">All Referrals</h2>
            
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="input-field min-w-0 w-auto"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="signed_up">Signed Up</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Referrals Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referrer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referred Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Earnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {referral.referrer.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          Code: {referral.referrer.referral_code}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {referral.referred_email}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                        {getStatusText(referral.status)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(referral.earnings)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDateTime(referral.created_at)}
                      </div>
                      {referral.completed_at && (
                        <div className="text-xs text-green-600">
                          Completed: {formatDateTime(referral.completed_at)}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {referral.status === 'signed_up' && (
                        <button
                          onClick={() => handleCompleteReferral(referral.id)}
                          disabled={completingReferralId === referral.id}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {completingReferralId === referral.id ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-1" />
                              Completing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Complete
                            </>
                          )}
                        </button>
                      )}
                      {referral.status === 'completed' && (
                        <span className="text-green-600 text-xs font-medium">
                          ✓ Completed
                        </span>
                      )}
                      {referral.status === 'pending' && (
                        <span className="text-yellow-600 text-xs font-medium flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Waiting
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {referrals.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No referrals found
              </h3>
              <p className="text-gray-600">
                {statusFilter ? `No referrals with status "${statusFilter}"` : 'No referrals in the system yet'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;