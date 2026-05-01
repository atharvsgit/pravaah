import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchCombinedFeed } from '../../services/feedService.js';
import FeedCard from './FeedCard.jsx';

const Feed = ({ limit = 12 }) => {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadFeedData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await fetchCombinedFeed(limit);
      setFeedItems(data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading feed:', err);
      setError('Failed to load feed data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedData();
  }, [limit]);

  const handleRefresh = () => {
    loadFeedData();
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const now = new Date();
    const diffInMinutes = Math.floor((now - lastUpdated) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just updated';
    if (diffInMinutes === 1) return 'Updated 1 minute ago';
    return `Updated ${diffInMinutes} minutes ago`;
  };

  return (
    <div className="bg-slate-50 rounded-xl shadow-lg p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-start">
          <Activity className="w-6 h-6 text-blue-800 mr-3 mt-1" />
          <div className="text-left">
            <h2 className="text-xl font-semibold text-blue-800">Feed</h2>
            <p className="text-sm text-gray-600 mt-1">
              Real-time alerts from social media and video sources
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              {formatLastUpdated()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-blue-600 text-lg font-semibold hover:text-blue-700 transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {loading && feedItems.length === 0 ? (
          // Initial loading state
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Loading AI intelligence feed...</p>
            </div>
          </div>
        ) : error ? (
          // Error state
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 mb-3">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : feedItems.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Activity className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No recent alerts from AI sources</p>
              <p className="text-sm text-gray-500 mt-1">
                AI scrapers are monitoring social media for ocean hazards
              </p>
            </div>
          </div>
        ) : (
          // Feed items
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feedItems.map((item, index) => (
              <FeedCard key={`${item.source}-${index}`} item={item} index={index} />
            ))}
          </div>
        )}

        {/* Loading overlay for refresh */}
        {loading && feedItems.length > 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Updating feed...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      {feedItems.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Showing {feedItems.length} recent alerts from AI monitoring systems
          </p>
        </div>
      )}
    </div>
  );
};

export default Feed;
