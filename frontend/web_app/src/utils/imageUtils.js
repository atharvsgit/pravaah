/**
 * Utility functions for handling image URLs
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Get the full URL for a profile picture
 * @param {string} profilePictureUrl - The profile picture URL from the API
 * @returns {string} Full URL for the profile picture
 */
export const getProfilePictureUrl = (profilePictureUrl) => {
  if (!profilePictureUrl) return null;
  
  // If it's already a full URL (starts with http), return as is
  if (profilePictureUrl.startsWith('http')) {
    return profilePictureUrl;
  }
  
  // If it's a relative path, prepend the API base URL
  if (profilePictureUrl.startsWith('/')) {
    return `${API_BASE_URL}${profilePictureUrl}`;
  }
  
  // If it's just a filename, assume it's in the profile pictures directory
  return `${API_BASE_URL}/uploads/profile_pictures/${profilePictureUrl}`;
};

/**
 * Get the full URL for a media file (report images/videos)
 * @param {string} mediaUrl - The media URL from the API
 * @returns {string} Full URL for the media file
 */
export const getMediaUrl = (mediaUrl) => {
  if (!mediaUrl) return null;
  
  // If it's already a full URL (S3 URL), return as is
  if (mediaUrl.startsWith('http')) {
    return mediaUrl;
  }
  
  // If it's a relative path, prepend the API base URL
  if (mediaUrl.startsWith('/')) {
    return `${API_BASE_URL}${mediaUrl}`;
  }
  
  // If it's just a filename, assume it's in the media directory
  return `${API_BASE_URL}/uploads/media/${mediaUrl}`;
};

/**
 * Get a placeholder image URL for when no image is available
 * @param {string} type - Type of placeholder ('profile' or 'media')
 * @returns {string} Placeholder image URL
 */
export const getPlaceholderImageUrl = (type = 'media') => {
  if (type === 'profile') {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#e5e7eb"/>
        <text x="50" y="50" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="Arial, sans-serif" font-size="14">Profile</text>
      </svg>
    `)}`;
  }
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="150" fill="#f3f4f6"/>
      <text x="100" y="75" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="Arial, sans-serif" font-size="14">No Media</text>
    </svg>
  `)}`;
};
