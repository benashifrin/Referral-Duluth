import React from 'react';
import { formatCurrency, calculateProgress } from '../utils/auth';

const ProgressBar = ({ current, maximum, showLabels = true, className = '', whiteOnDark = false }) => {
  const progress = calculateProgress(current, maximum);
  
  return (
    <div className={`w-full ${className}`}>
      {showLabels && (
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-medium ${whiteOnDark ? 'text-white' : 'text-gray-700'}`}>
            {formatCurrency(current)} earned
          </span>
          <span className="text-sm text-gray-500">
            {formatCurrency(maximum)} goal
          </span>
        </div>
      )}
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {showLabels && (
        <div className="mt-1 text-center">
          <span className={`text-xs ${whiteOnDark ? 'text-white' : 'text-gray-500'}`}>
            {progress.toFixed(0)}% of annual limit
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
