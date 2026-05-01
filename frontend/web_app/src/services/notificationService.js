import api from '../utils/api';

// Map hazard types to readable names
const HAZARD_TYPE_MAPPING = {
  'tsunami': 'Tsunami',
  'coastal_erosion': 'Coastal Erosion',
  'sea_level_rise': 'Sea Level Rise',
  'storm_surge': 'Storm Surge',
  'marine_pollution': 'Marine Pollution',
  'coral_bleaching': 'Coral Bleaching',
  'algal_bloom': 'Algal Bloom',
  'mangrove_destruction': 'Mangrove Destruction',
  'cyclone': 'Cyclone',
  'flood': 'Flood',
  'other': 'Other Hazard'
};

// Real-time notification handling
class NotificationManager {
  constructor() {
    this.listeners = [];
    this.isPolling = false;
    this.pollInterval = null;
    this.lastNotificationCount = 0;
  }

  // Add listener for new notifications
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners of new notifications
  notifyListeners(notifications) {
    this.listeners.forEach(callback => callback(notifications));
  }

  // Start automatic polling for new notifications
  startPolling(intervalMs = 5000) {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('[NotificationService] Starting automatic notification polling...');
    
    this.pollInterval = setInterval(async () => {
      try {
        const countData = await getNotificationCount();
        if (countData.unread_count > this.lastNotificationCount) {
          console.log('[NotificationService] New notifications detected!');
          const notifications = await getNotifications();
          this.notifyListeners(notifications);
          this.lastNotificationCount = countData.unread_count;
        }
      } catch (error) {
        console.error('[NotificationService] Polling error:', error);
      }
    }, intervalMs);
  }

  // Stop automatic polling
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
    console.log('[NotificationService] Stopped notification polling');
  }

  // Initialize notification count
  async initialize() {
    try {
      const countData = await getNotificationCount();
      this.lastNotificationCount = countData.unread_count;
    } catch (error) {
      console.error('[NotificationService] Initialize error:', error);
    }
  }
}

// Global notification manager instance
const notificationManager = new NotificationManager();

/**
 * Get recent notifications and extract required data format
 * @param {number} limit - Number of notifications to fetch
 * @returns {Promise<Array>} - Array of notifications with hazard name, time, description, image
 */
export const getNotifications = async (limit = 10) => {
  try {
    const { data } = await api.get(`/notifications/recent?limit=${limit}`);
    
    // Handle the response structure from backend
    // Backend returns array directly, not wrapped in notifications property
    const notificationsList = Array.isArray(data) ? data : [];
    
    // Extract and format notifications
    const formattedNotifications = notificationsList.map(notification => {
      return {
        id: notification.id,
        hazardName: notification.hazardName || HAZARD_TYPE_MAPPING[notification.type] || 'Ocean Alert', 
        time: notification.time || notification.created_at,
        description: notification.description || 'A new hazard has been reported in your area',
        image: notification.image || null
      };
    });
    
    return formattedNotifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Return empty array instead of throwing error to prevent UI crashes
    return [];
  }
};

/**
 * Get notification count
 * @returns {Promise<Object>} - Object containing notification counts
 */
export const getNotificationCount = async () => {
  try {
    const { data } = await api.get('/notifications/count');
    return data;
  } catch (error) {
    console.error('Error fetching notification count:', error);
    // Return default values instead of throwing error
    return {
      unread_count: 0,
      total_count: 0,
      last_updated: new Date().toISOString()
    };
  }
};

/**
 * Test peer notification endpoint
 * @returns {Promise<Object>} - Response from test endpoint
 */
export const testPeerNotification = async () => {
  try {
    const { data } = await api.get('/notifications/test-peer');
    return data;
  } catch (error) {
    console.error('Error testing peer notification:', error);
    throw error;
  }
};

/**
 * Verify a report notification
 * @param {string} reportId - The ID of the report to verify
 * @returns {Promise<Object>} - Response from verify endpoint
 */
export const verifyReport = async (reportId) => {
  try {
    const { data } = await api.post(`/notifications/verify/${reportId}`);
    return data;
  } catch (error) {
    console.error('Error verifying report:', error);
    throw error;
  }
};

/**
 * Deny a report notification
 * @param {string} reportId - The ID of the report to deny
 * @returns {Promise<Object>} - Response from deny endpoint
 */
export const denyReport = async (reportId) => {
  try {
    const { data } = await api.post(`/notifications/deny/${reportId}`);
    return data;
  } catch (error) {
    console.error('Error denying report:', error);
    throw error;
  }
};

export default {
  getNotifications,
  getNotificationCount,
  testPeerNotification,
  verifyReport,
  denyReport,
  // Real-time notification functions
  onNewNotification: (callback) => notificationManager.addListener(callback),
  offNewNotification: (callback) => notificationManager.removeListener(callback),
  startRealTimeNotifications: () => {
    notificationManager.initialize();
    notificationManager.startPolling();
  },
  stopRealTimeNotifications: () => notificationManager.stopPolling()
};