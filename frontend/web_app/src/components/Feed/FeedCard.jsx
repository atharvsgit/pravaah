import React from 'react';
import { ExternalLink, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { getUrgencyStyle, getSentimentStyle, getSourceInfo } from '../../services/feedService.js';
import { getRelativeTime } from '../../utils/helpers';

const FeedCard = ({ item, index }) => {
  const urgencyStyle = getUrgencyStyle(item.urgency);
  const sentimentStyle = getSentimentStyle(item.sentiment);
  const sourceInfo = getSourceInfo(item.source);



  const handleLinkClick = (e) => {
    e.preventDefault();
    if (item.link && item.link !== '#') {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] relative">
      {/* Header with source and time */}
      <div className="flex items-center justify-between mb-4">
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${sourceInfo.bgColor} ${sourceInfo.textColor}`}>
          <span className="mr-1.5">{sourceInfo.icon}</span>
          {sourceInfo.label}
        </div>
        <div className="flex items-center text-gray-500 text-xs">
          <Clock className="w-3.5 h-3.5 mr-1" />
          {getRelativeTime(item.created_at)}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-bold text-gray-900 text-lg leading-tight mb-3 line-clamp-2">
        {item.title || 'Ocean Alert'}
      </h3>

      {/* Location */}
      {item.location && item.location !== 'Unknown' && (
        <div className="flex items-center text-gray-600 text-sm mb-3">
          <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
          <span className="truncate">{item.location}</span>
        </div>
      )}

      {/* Urgency and Sentiment badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Urgency Badge */}
        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${urgencyStyle.bgColor} ${urgencyStyle.textColor} ${urgencyStyle.borderColor}`}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          {item.urgency || 'Medium'} Urgency
        </div>

        {/* Sentiment Badge */}
        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sentimentStyle.bgColor} ${sentimentStyle.textColor}`}>
          <span className="mr-1">{sentimentStyle.icon}</span>
          {item.sentiment || 'Neutral'}
        </div>
      </div>

      {/* Action button */}
      <div className="pt-3 border-t border-gray-100">
        <button
          onClick={handleLinkClick}
          className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
            item.link && item.link !== '#'
              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              : 'bg-gray-50 text-gray-500 cursor-not-allowed border border-gray-200'
          }`}
          disabled={!item.link || item.link === '#'}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {item.link && item.link !== '#' ? 'View Source' : 'No Link Available'}
        </button>
      </div>
    </div>
  );
};

export default FeedCard;
