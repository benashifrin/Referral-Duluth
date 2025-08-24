import React from 'react';
import { formatCurrency } from '../utils/auth';

const StatsCard = ({ title, value, icon: Icon, color = 'primary', prefix = '', suffix = '' }) => {
  const colorClasses = {
    primary: 'text-primary-600 bg-primary-50',
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  return (
    <div className="stats-card animate-fade-in">
      <div className="flex items-center justify-center mb-4">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-2xl font-bold text-gray-900">
          {prefix}{typeof value === 'number' && title.toLowerCase().includes('earn') ? formatCurrency(value) : value}{suffix}
        </p>
        <p className="text-sm font-medium text-gray-600">
          {title}
        </p>
      </div>
    </div>
  );
};

export default StatsCard;