import React from 'react';
import { formatDate, formatCurrency, getStatusColor, getStatusText } from '../utils/auth';
import { Mail, Calendar, DollarSign } from 'lucide-react';

const ReferralTable = ({ referrals, showReferrer = false }) => {
  if (!referrals || referrals.length === 0) {
    return (
      <div className="card text-center py-12">
        <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No referrals yet</h3>
        <p className="text-gray-600">
          Start sharing your referral link to see your referrals here!
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Referred Email
              </th>
              {showReferrer && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referrer
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Earnings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {referrals.map((referral) => (
              <tr key={referral.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {referral.referred_email}
                    </span>
                  </div>
                </td>
                
                {showReferrer && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {referral.referrer?.email || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Code: {referral.referrer?.referral_code || 'N/A'}
                    </div>
                  </td>
                )}
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                    {getStatusText(referral.status)}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                    <span className={`text-sm font-medium ${referral.earnings > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {formatCurrency(referral.earnings)}
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-900">
                        {formatDate(referral.created_at)}
                      </div>
                      {referral.completed_at && (
                        <div className="text-xs text-green-600">
                          Completed: {formatDate(referral.completed_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {referrals.map((referral) => (
          <div key={referral.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {referral.referred_email}
                </span>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                {getStatusText(referral.status)}
              </span>
            </div>
            
            {showReferrer && (
              <div className="mb-3 p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">Referrer</div>
                <div className="text-sm text-gray-900">{referral.referrer?.email || 'N/A'}</div>
                <div className="text-xs text-gray-500">Code: {referral.referrer?.referral_code || 'N/A'}</div>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                <span className={`text-sm font-medium ${referral.earnings > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                  {formatCurrency(referral.earnings)}
                </span>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {formatDate(referral.created_at)}
                </div>
                {referral.completed_at && (
                  <div className="text-xs text-green-600">
                    Completed: {formatDate(referral.completed_at)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReferralTable;