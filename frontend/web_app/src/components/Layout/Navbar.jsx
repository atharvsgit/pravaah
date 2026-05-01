import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Users, 
  User, 
  Bell, 
  Settings, 
  Languages, 
  Shield, 
  BarChart3, 
  AlertTriangle, 
  Clock, 
  Check, 
  X 
} from 'lucide-react';

import { getUserRole, getDashboardRoute } from '../../utils/auth';
import notificationService from '../../services/notificationService';
import api from '../../utils/api';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isLoggedIn = Boolean(localStorage.getItem('authToken'));
  const userRole = getUserRole();

  // State for notifications
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifiedNotifications, setVerifiedNotifications] = useState(new Set());
  
  // Ref for notification dropdown
  const notificationRef = useRef(null);

  // Load initial notifications and start real-time updates
  useEffect(() => {
    if (isLoggedIn) {
      loadNotifications();
      
      // Set up real-time notification listener
      const handleNewNotifications = (newNotifications) => {
        console.log('[Navbar] Received new notifications:', newNotifications);
        setNotifications(newNotifications);
        setNotificationCount(newNotifications.length);
      };

      // Start real-time notifications
      notificationService.onNewNotification(handleNewNotifications);
      notificationService.startRealTimeNotifications();

      // Cleanup on unmount
      return () => {
        notificationService.offNewNotification(handleNewNotifications);
        notificationService.stopRealTimeNotifications();
      };
    }
  }, [isLoggedIn]);

  // Load notifications from backend
  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log('[Navbar] Loading notifications...');
      
      const [notificationsData, countData] = await Promise.all([
        notificationService.getNotifications(10),
        notificationService.getNotificationCount()
      ]);
      
      console.log('[Navbar] Loaded notifications data:', notificationsData);
      console.log('[Navbar] Loaded count data:', countData);
      
      setNotifications(notificationsData);
      setNotificationCount(countData.unread_count);
    } catch (error) {
      console.error('[Navbar] Error loading notifications:', error);
      // Fallback to empty state
      setNotifications([]);
      setNotificationCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format time for display
  const formatTime = (timeString) => {
    try {
      let date = new Date(timeString);
      if (isNaN(date.getTime())) return 'Invalid time';
      
      // Add IST offset
      date.setHours(date.getHours() + 5);
      date.setMinutes(date.getMinutes() + 30);
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error, 'for timestamp:', timeString);
      return 'Invalid time';
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  };

  const handleVerify = (notificationId) => {
    console.log('Verifying notification:', notificationId);
    setVerifiedNotifications(prev => new Set([...prev, notificationId]));
  };

  const handleReject = (notificationId) => {
    console.log('Rejecting notification:', notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setNotificationCount(prev => Math.max(0, prev - 1));
  };

  const handleSafe = async (notificationId) => {
    try {
      console.log('User marked as safe:', notificationId);
      const location = await getCurrentLocation();
      const authToken = localStorage.getItem('authToken');

      const safetyCircleData = {
        notification_id: notificationId,
        latitude: location.latitude,
        longitude: location.longitude,
        is_safe: true,
        color: '#10B981'
      };

      try {
        // Use shared axios client so baseURL and auth headers are applied
        const { data: savedCircle } = await api.post('/safety-circles/', safetyCircleData);
        console.log('✅ Safety circle saved to database:', savedCircle);
      } catch (dbError) {
        // Axios wraps errors; surface server payload if any
        const status = dbError.response?.status;
        const payload = dbError.response?.data;
        console.error('❌ Error saving to DB:', status, payload || dbError.message);
        alert(`Database error: ${status ?? ''} ${payload?.detail ?? dbError.message}`.trim());
      }
      
      window.dispatchEvent(new CustomEvent('addSafetyCircle', {
        detail: {
          latitude: location.latitude,
          longitude: location.longitude,
          isSafe: true,
          color: '#10B981',
          timestamp: Date.now(),
          reportId: notificationId
        }
      }));

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setVerifiedNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
      setNotificationCount(prev => Math.max(0, prev - 1));
      alert('You\'ve been marked as Safe. A green safety zone has been created.');
    } catch (error) {
      console.error('Error in handleSafe:', error);
      alert('Unable to get your location. Please enable location services.');
    }
  };

  const handleNotSafe = async (notificationId) => {
    try {
      console.log('User marked as not safe:', notificationId);
      const location = await getCurrentLocation();
      const authToken = localStorage.getItem('authToken');

      const safetyCircleData = {
        notification_id: notificationId,
        latitude: location.latitude,
        longitude: location.longitude,
        is_safe: false,
        color: '#8B5CF6'
      };

      try {
        const { data: savedCircle } = await api.post('/safety-circles/', safetyCircleData);
        console.log('✅ Safety circle saved to database:', savedCircle);
      } catch (dbError) {
        const status = dbError.response?.status;
        const payload = dbError.response?.data;
        console.error('❌ Error saving to DB:', status, payload || dbError.message);
        alert(`Database error: ${status ?? ''} ${payload?.detail ?? dbError.message}`.trim());
      }

      window.dispatchEvent(new CustomEvent('addSafetyCircle', {
        detail: {
          latitude: location.latitude,
          longitude: location.longitude,
          isSafe: false,
          color: '#8B5CF6',
          timestamp: Date.now(),
          reportId: notificationId
        }
      }));

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setVerifiedNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
      setNotificationCount(prev => Math.max(0, prev - 1));
      alert('Thank you for your response. Stay safe!');
    } catch (error) {
      console.error('Error in handleNotSafe:', error);
      alert('Unable to get your location. Please enable location services.');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('authToken');
    window.dispatchEvent(new StorageEvent('storage', { key: 'authToken', newValue: null }));
    navigate('/auth', { replace: true });
  };

  // Role-based navigation items
  const getRoleBasedNavItems = () => {
    const dashboardRoute = getDashboardRoute();
    const dashboardLabel = userRole === 'official' ? 'Dashboard' : 
                          userRole === 'analyst' ? 'Analytics' : 'Dashboard';
    const dashboardIcon = userRole === 'official' ? Shield : 
                         userRole === 'analyst' ? BarChart3 : Home;

    if (userRole === 'official') {
      return [];
    }
    if (userRole === 'analyst') {
      return [];
    }
    return [
      { path: dashboardRoute, label: dashboardLabel, icon: dashboardIcon },
      { path: '/report', label: 'Report', icon: FileText },
      { path: '/community', label: 'Community', icon: Users },
      { path: '/profile', label: 'Profile', icon: User },
    ];
  };

  const navItems = isLoggedIn ? getRoleBasedNavItems() : [
    { path: '/', label: 'Home', icon: Home },
    { path: '/report', label: 'Report', icon: FileText },
    { path: '/community', label: 'Community', icon: Users },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Pravaah
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <button
                onClick={handleSignOut}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In/ Sign Up
              </button>
            )}
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              <Languages className="w-5 h-5" />
            </button>
            
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md relative"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                      <button 
                        onClick={loadNotifications}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Refresh
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      {loading ? 'Loading...' : `${notificationCount} new alerts`}
                    </p>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div key={notification.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                          <div className="flex items-start space-x-3">
                            {/* Image */}
                            <div className="flex-shrink-0">
                              {notification.image ? (
                                <img 
                                  src={notification.image} 
                                  alt={notification.hazardName}
                                  className="w-12 h-12 rounded-lg object-cover bg-red-100"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                                  <AlertTriangle className="w-6 h-6 text-red-500" />
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                                  <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                                  {notification.hazardName}
                                </h4>
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatTime(notification.time)}
                                </span>
                              </div>

                              <div className="flex items-center space-x-2">
                                {!verifiedNotifications.has(notification.id) ? (
                                  <>
                                    <button
                                      onClick={() => handleVerify(notification.id)}
                                      className="flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md hover:bg-green-200 transition-colors"
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Verify
                                    </button>
                                    <button
                                      onClick={() => handleReject(notification.id)}
                                      className="flex items-center px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-md hover:bg-red-200 transition-colors"
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleSafe(notification.id)}
                                      className="flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md hover:bg-green-200 transition-colors"
                                    >
                                      <Shield className="w-3 h-3 mr-1" />
                                      I'm Safe
                                    </button>
                                    <button
                                      onClick={() => handleNotSafe(notification.id)}
                                      className="flex items-center px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 transition-colors"
                                    >
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      I'm Not Safe
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-gray-200">
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <div className="flex items-center justify-around py-2 border-t">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
