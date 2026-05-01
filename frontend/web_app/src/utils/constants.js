// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  REPORTS: {
    CREATE: '/reports',
    LIST: '/reports',
    GET: (id) => `/reports/${id}`,
    UPDATE: (id) => `/reports/${id}`,
    DELETE: (id) => `/reports/${id}`,
    VERIFY: (id) => `/reports/${id}/verify`,
  },
  COMMUNITY: {
    POSTS: '/community/posts',
    GROUPS: '/community/groups',
    COMMENTS: '/community/comments',
  },
  USER: {
    PROFILE: '/user/profile',
    STATS: '/user/stats',
    ACTIVITY: '/user/activity',
  },
};

// Report Types
export const REPORT_TYPES = {
  INCIDENT: 'incident',
  EMERGENCY: 'emergency',
  MAINTENANCE: 'maintenance',
  OTHER: 'other',
};

// Report Status
export const REPORT_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  THEME: 'theme',
  LANGUAGE: 'language',
};

// Routes
export const ROUTES = {
  HOME: '/',
  REPORT: '/report',
  COMMUNITY: '/community',
  PROFILE: '/profile',
  LOGIN: '/login',
  REGISTER: '/register',
};
