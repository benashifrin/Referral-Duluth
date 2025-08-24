import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { copyToClipboard } from '../utils/auth';
import toast from 'react-hot-toast';

const ReferralLink = ({ referralLink, className = '' }) => {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      setCopied(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      setSharing(true);
      try {
        await navigator.share({
          title: 'Join Our Dental Practice!',
          text: 'I love my dentist and thought you might too! Use my referral link to schedule your first appointment.',
          url: referralLink,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error('Failed to share');
        }
      } finally {
        setSharing(false);
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Referral Link</h3>
        <Share2 className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono text-gray-700 truncate">
              {referralLink}
            </p>
          </div>
          
          <button
            onClick={handleCopy}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleCopy}
            className="flex-1 btn-primary"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </>
            )}
          </button>
          
          {navigator.share && (
            <button
              onClick={handleShare}
              className="flex-1 btn-secondary"
              disabled={sharing}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {sharing ? 'Sharing...' : 'Share'}
            </button>
          )}
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Share this link with friends and family to earn <span className="font-semibold text-primary-600">$50</span> for each completed referral!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferralLink;