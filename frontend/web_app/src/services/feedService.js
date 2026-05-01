const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Fetch combined feed data from all AI sources (YouTube and Twitter)
 * @param {number} limit - Maximum number of items to fetch
 * @returns {Promise<Array>} Array of feed items
 */
export const fetchCombinedFeed = async (limit = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/feed/combined-feed?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching combined feed:', error);
    return [];
  }
};

/**
 * Fetch alerts from YouTube scraper
 * @param {number} limit - Maximum number of alerts to fetch
 * @returns {Promise<Array>} Array of YouTube alerts
 */
export const fetchYouTubeAlerts = async (limit = 20) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/feed/alerts?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching YouTube alerts:', error);
    return [];
  }
};

/**
 * Fetch scraped data from Twitter scraper
 * @param {number} limit - Maximum number of items to fetch
 * @returns {Promise<Array>} Array of Twitter scraped data
 */
export const fetchTwitterData = async (limit = 20) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/feed/scraped-data?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching Twitter data:', error);
    return [];
  }
};

/**
 * Format urgency level for display
 * @param {string} urgency - Urgency level
 * @returns {Object} Styling object for urgency
 */
export const getUrgencyStyle = (urgency) => {
  const urgencyLower = (urgency || '').toLowerCase();
  
  switch (urgencyLower) {
    case 'critical':
    case 'high':
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
        icon: '🔴'
      };
    case 'medium':
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
        icon: '🟡'
      };
    case 'low':
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        icon: '🟢'
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200',
        icon: '⚪'
      };
  }
};

/**
 * Format sentiment for display
 * @param {string} sentiment - Sentiment value
 * @returns {Object} Styling object for sentiment
 */
export const getSentimentStyle = (sentiment) => {
  const sentimentLower = (sentiment || '').toLowerCase();
  
  switch (sentimentLower) {
    case 'panic':
    case 'panicked':
    case 'worried':
      return {
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        icon: '😰'
      };
    case 'calm':
    case 'neutral':
      return {
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        icon: '😌'
      };
    case 'informative':
      return {
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        icon: '📢'
      };
    default:
      return {
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        icon: '😐'
      };
  }
};

/**
 * Get source icon and label
 * @param {string} source - Source type
 * @returns {Object} Source display info
 */
export const getSourceInfo = (source) => {
  switch (source?.toLowerCase()) {
    case 'youtube':
      return {
        icon: '📺',
        label: 'YouTube',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700'
      };
    case 'twitter':
      return {
        icon: '🐦',
        label: 'Twitter',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700'
      };
    default:
      return {
        icon: '📡',
        label: 'AI Source',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700'
      };
  }
};
