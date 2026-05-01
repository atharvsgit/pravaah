import api from '../utils/api';

/**
 * Get current user profile
 * @returns {Promise<Object>} User profile data
 */
export const getCurrentUserProfile = async () => {
  try {
    const { data } = await api.get('/user/profile');
    return data;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated profile data
 */
export const updateUserProfile = async (profileData) => {
  try {
    const { data } = await api.put('/user/profile', profileData);
    return data;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
};

/**
 * Get user statistics
 * @returns {Promise<Object>} User statistics
 */
export const getUserStats = async () => {
  try {
    const { data } = await api.get('/user/stats');
    return data;
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    throw error;
  }
};

/**
 * Get user activity
 * @param {number} limit - Number of activities to fetch
 * @returns {Promise<Array>} User activity data
 */
export const getUserActivity = async (limit = 10) => {
  try {
    const { data } = await api.get(`/user/activity?limit=${limit}`);
    return data;
  } catch (error) {
    console.error('Failed to fetch user activity:', error);
    throw error;
  }
};

/**
 * Get user reports
 * @param {number} limit - Number of reports to fetch
 * @returns {Promise<Array>} User reports
 */
export const getUserReports = async (limit = 10) => {
  try {
    const { data } = await api.get(`/reports?user=true&limit=${limit}`);
    return data;
  } catch (error) {
    console.error('Failed to fetch user reports:', error);
    throw error;
  }
};

/**
 * Get user badges
 * @returns {Promise<Array>} User badges
 */
export const getUserBadges = async () => {
  try {
    const { data } = await api.get('/user/badges');
    return data;
  } catch (error) {
    console.error('Failed to fetch user badges:', error);
    throw error;
  }
};

/**
 * Upload profile picture
 * @param {File} file - Image file to upload
 * @returns {Promise<Object>} Upload result with image URL
 */
export const uploadProfilePicture = async (file) => {
  try {
    const formData = new FormData();
    formData.append('profile_picture', file);
    
    const { data } = await api.post('/user/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (error) {
    console.error('Failed to upload profile picture:', error);
    throw error;
  }
};

/**
 * Get user rewards
 * @returns {Promise<Array>} User rewards
 */
export const getUserRewards = async () => {
  try {
    const { data } = await api.get('/user/rewards');
    return data;
  } catch (error) {
    console.error('Failed to fetch user rewards:', error);
    throw error;
  }
};
