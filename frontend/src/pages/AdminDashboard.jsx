import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  Clock,
  Download,
  Upload,
  CheckCircle,
  Filter,
  RefreshCw,
  Trash
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
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [exporting, setExporting] = useState(false);
  // QR display state
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [qrEmail, setQrEmail] = useState('');
  const [generatingQR, setGeneratingQR] = useState(false);
  const [clearingQR, setClearingQR] = useState(false);
  // CSV upload state
  const [csvFile, setCsvFile] = useState(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState(null);

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
    await Promise.all([loadStats(), loadReferrals(currentPage, statusFilter), loadUsers(usersPage)]);
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

  const handleDeleteReferral = async (referral) => {
    const label = `${referral.referrer?.email || 'referrer'} → ${referral.referred_email}`;
    if (!window.confirm(`Delete this referral?\n${label}\nIf completed, earnings will be reversed.`)) return;
    try {
      await adminAPI.deleteReferral(referral.id);
      await Promise.all([loadStats(), loadReferrals(currentPage, statusFilter)]);
      toast.success('Referral deleted');
    } catch (error) {
      toast.error(handleAPIError(error));
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
      await Promise.all([loadStats(), loadReferrals(), loadUsers()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Search patients (by email/name)
  const handleSearch = async (query) => {
    setSearchQ(query);
    setSelectedPatient(null);
    setQrEmail('');
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const res = await adminAPI.searchPatients(query.trim());
      setSearchResults(res.results || []);
    } catch (err) {
      toast.error(handleAPIError(err));
    } finally {
      setSearching(false);
    }
  };

  const selectPatient = (p) => {
    setSelectedPatient(p);
    setQrEmail(p.email || '');
    setSearchResults([]);
  };

  const handleGenerateQR = async () => {
    // Allow generating by either selected patient or typed email
    if (!selectedPatient && !qrEmail) {
      toast.error('Select a patient or enter an email');
      return;
    }
    setGeneratingQR(true);
    try {
      const res = await adminAPI.generateReferralQR(selectedPatient?.id, qrEmail);
      if (res?.landing_url) {
        // Log landing URL for debugging/visibility in Chrome console
        // Example: http://localhost:5001/r/welcome?t=...
        console.log('[QR] Landing URL:', res.landing_url);
      }
      toast.success('QR sent to iPad display');
    } catch (err) {
      toast.error(handleAPIError(err));
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleClearQR = async () => {
    setClearingQR(true);
    try {
      await adminAPI.clearQR();
      toast.success('Cleared QR on iPad');
    } catch (err) {
      toast.error(handleAPIError(err));
    } finally {
      setClearingQR(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error('Select a CSV file first');
      return;
    }
    setUploadingCsv(true);
    try {
      const res = await adminAPI.uploadPatients(csvFile);
      setLastImportSummary(res);
      toast.success(`Import complete: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped`);
      // Refresh users list to reflect new/updated patients
      await loadUsers(usersPage);
    } catch (err) {
      toast.error(handleAPIError(err));
    } finally {
      setUploadingCsv(false);
    }
  };

  const loadUsers = async (page = 1) => {
    try {
      setUsersLoading(true);
      const data = await adminAPI.getUsers(page, 20);
      setUsers(data.users);
      setUsersPage(data.current_page);
      setUsersPages(data.pages);
    } catch (error) {
      toast.error(handleAPIError(error));
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserCompletedAdjust = async (u, nextCompleted) => {
    if (nextCompleted < 0) return;
    try {
      const res = await adminAPI.updateUserReferrals(u.id, { completed: nextCompleted });
      // Update local state with latest stats
      setUsers(prev => prev.map(item => item.id === u.id ? { ...item, stats: res.stats, total_earnings: res.user.total_earnings } : item));
      toast.success('Updated completed referrals');
    } catch (error) {
      toast.error(handleAPIError(error));
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete user ${u.email}? This will remove their referrals and reverse any earnings.`)) return;
    setDeletingUserId(u.id);
    try {
      await adminAPI.deleteUser(u.id);
      await Promise.all([loadStats(), loadUsers(usersPage)]);
      toast.success('User deleted');
    } catch (error) {
      toast.error(handleAPIError(error));
    } finally {
      setDeletingUserId(null);
    }
  };

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

        {/* QR Code Display (iPad) */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">QR Code Display</h2>
            <div className="flex items-center gap-2">
              <button onClick={handleClearQR} disabled={clearingQR} className="btn-secondary">
                {clearingQR ? 'Clearing…' : 'Clear QR'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Find patient (name or email)</label>
              <input
                type="text"
                value={searchQ}
                onChange={(e) => handleSearch(e.target.value)}
                className="input-field w-full"
                placeholder="Start typing to search…"
              />
              {searching && <div className="text-sm text-gray-500 mt-1">Searching…</div>}
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-md divide-y bg-white max-h-56 overflow-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPatient(p)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    >
                      <div className="text-sm font-medium text-gray-900">{p.name || '—'}</div>
                      <div className="text-xs text-gray-600">{p.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email for magic link</label>
              <input
                type="email"
                className="input-field w-full"
                placeholder="patient@email.com"
                value={qrEmail}
                onChange={(e) => setQrEmail(e.target.value)}
              />
              <button
                onClick={handleGenerateQR}
                disabled={generatingQR || (!selectedPatient && !qrEmail)}
                className="btn-primary mt-3"
              >
                {generatingQR ? 'Generating…' : 'Generate Referral QR'}
              </button>
              {selectedPatient && (
                <div className="text-xs text-gray-500 mt-2">Selected: {selectedPatient.email} (code {selectedPatient.referral_code})</div>
              )}
              <div className="text-xs text-gray-500 mt-2">QR auto-hides after scan, admin clear, or 2 minutes.</div>
            </div>
          </div>
        </div>

        {/* Upload Patients (CSV) */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Upload Patients (CSV)</h2>
          </div>
          <p className="text-sm text-gray-600 mb-3">Import first name, last name, email, and phone to pre-create patients for faster search. No emails are sent.</p>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="block"
            />
            <button onClick={handleCsvUpload} disabled={uploadingCsv || !csvFile} className="btn-primary inline-flex items-center">
              {uploadingCsv ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Upload CSV
                </>
              )}
            </button>
          </div>
          {lastImportSummary && (
            <div className="text-sm text-gray-700 mt-3">
              <div>Created: <strong>{lastImportSummary.created}</strong>, Updated: <strong>{lastImportSummary.updated}</strong>, Skipped: <strong>{lastImportSummary.skipped}</strong>, Rows: <strong>{lastImportSummary.total_rows}</strong></div>
              {Array.isArray(lastImportSummary.errors) && lastImportSummary.errors.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">First {Math.min(50, lastImportSummary.errors.length)} errors shown (by row). Example: {lastImportSummary.errors[0].row && `Row ${lastImportSummary.errors[0].row}: ${lastImportSummary.errors[0].error}`}</div>
              )}
            </div>
          )}
        </div>

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referred Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referred Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referred Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
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
                        {referral.origin === 'manual' || (referral.referred_email || '').startsWith('manual+') ? 'Manual' : referral.referred_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{referral.referred_name || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{referral.referred_phone || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{referral.referrer?.signed_up_by_staff || referral.signed_up_by_staff || '—'}</div>
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
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
                        <span className="text-yellow-600 text-xs font-medium inline-flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Waiting
                        </span>
                      )}

                      {/* Delete action */}
                      <button
                        onClick={() => handleDeleteReferral(referral)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Delete referral"
                      >
                        <Trash className="h-3 w-3 mr-1" />
                        Delete
                      </button>
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

        {/* Users Referral Controls */}
        <div className="card mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Users – Adjust Referral Counts</h2>
            <button onClick={() => loadUsers(usersPage)} className="btn-secondary">
              {usersLoading ? 'Loading...' : 'Reload Users'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed Up</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{u.name ? u.name : '—'}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{u.referral_code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{u.signed_up_by_staff || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center space-x-2">
                        <button onClick={() => adminAPI.updateUserReferrals(u.id, { signed_up: Math.max(0, u.stats.signed_up_referrals - 1) }).then(() => loadUsers(usersPage)).catch(err => toast.error(handleAPIError(err)))} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">-</button>
                        <input
                          type="number"
                          className="w-20 input-field"
                          value={u.stats.signed_up_referrals}
                          onChange={(e) => {
                            const val = parseInt(e.target.value || '0', 10);
                            setUsers(prev => prev.map(item => item.id === u.id ? { ...item, stats: { ...item.stats, signed_up_referrals: isNaN(val) ? 0 : val } } : item));
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value || '0', 10);
                            adminAPI.updateUserReferrals(u.id, { signed_up: isNaN(val) ? 0 : val })
                              .then(() => loadUsers(usersPage))
                              .catch(err => toast.error(handleAPIError(err)));
                          }}
                          min={0}
                        />
                        <button onClick={() => adminAPI.updateUserReferrals(u.id, { signed_up: u.stats.signed_up_referrals + 1 }).then(() => loadUsers(usersPage)).catch(err => toast.error(handleAPIError(err)))} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">+</button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center space-x-2">
                        <button onClick={() => handleUserCompletedAdjust(u, u.stats.completed_referrals - 1)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">-</button>
                        <input
                          type="number"
                          className="w-20 input-field"
                          value={u.stats.completed_referrals}
                          onChange={(e) => {
                            const val = parseInt(e.target.value || '0', 10);
                            setUsers(prev => prev.map(item => item.id === u.id ? { ...item, stats: { ...item.stats, completed_referrals: isNaN(val) ? 0 : val } } : item));
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value || '0', 10);
                            handleUserCompletedAdjust(u, isNaN(val) ? 0 : val);
                          }}
                          min={0}
                        />
                        <button onClick={() => handleUserCompletedAdjust(u, u.stats.completed_referrals + 1)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">+</button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{u.stats.total_referrals}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(u.total_earnings)}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        disabled={deletingUserId === u.id}
                        title="Delete user"
                      >
                        <Trash className="h-3 w-3 mr-1" />
                        {deletingUserId === u.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usersPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <button
                onClick={() => loadUsers(Math.max(1, usersPage - 1))}
                className="btn-secondary"
                disabled={usersPage <= 1}
              >
                Previous
              </button>
              <div className="text-sm text-gray-700">Page {usersPage} of {usersPages}</div>
              <button
                onClick={() => loadUsers(Math.min(usersPages, usersPage + 1))}
                className="btn-secondary"
                disabled={usersPage >= usersPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
