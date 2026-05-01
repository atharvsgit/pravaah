import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle, XCircle, Shield, AlertTriangle, MapPin, Loader } from 'lucide-react';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [handledNotifications, setHandledNotifications] = useState(new Set());

  // Load handled notifications from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('handledNotifications');
    if (saved) {
      try {
        const parsedHandled = JSON.parse(saved);
        setHandledNotifications(new Set(parsedHandled));
      } catch (error) {
        console.error('Failed to parse handled notifications:', error);
      }
    }
  }, []);

  // Save handled notifications to localStorage whenever it changes
  const saveHandledNotifications = useCallback((newHandledSet) => {
    const handledArray = Array.from(newHandledSet);
    localStorage.setItem('handledNotifications', JSON.stringify(handledArray));
    setHandledNotifications(newHandledSet);
  }, []);

  useEffect(() => {
    // Connect to WebSocket for real-time notifications
    const connectWebSocket = () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      const ws = new WebSocket(`${wsUrl}/ws/notifications?token=${token}`);
      
      ws.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        
        // Don't add notification if it's already been handled
        if (!handledNotifications.has(notification.report_id)) {
          setNotifications(prev => {
            // Prevent duplicates
            const exists = prev.some(n => n.report_id === notification.report_id);
            if (exists) return prev;
            
            return [notification, ...prev];
          });
          setUnreadCount(prev => prev + 1);
        }
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      return ws;
    };

    const ws = connectWebSocket();
    return () => ws?.close();
  }, [handledNotifications]);

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
        (error) => {
          let errorMessage = 'Unable to get your location.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  const handleVerification = async (notificationId, reportId, action, requiresLocation = false) => {
    try {
      let location = null;
      
      // Get location if required (for safety responses)
      if (requiresLocation) {
        try {
          location = await getCurrentLocation();
          console.log('Location captured:', location);
        } catch (locationError) {
          console.error('Location error:', locationError);
          alert('Location is required for safety responses. Please enable location access and try again.');
          return;
        }
      }

      const payload = {
        report_id: reportId,
        action: action
      };

      // Add location data if captured
      if (location) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
        payload.accuracy = location.accuracy;
      }

      const response = await fetch('/api/peer-verifications/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Verification submitted successfully:', result);
        
        // Mark notification as handled
        const newHandledSet = new Set(handledNotifications);
        newHandledSet.add(reportId);
        saveHandledNotifications(newHandledSet);
        
        // Update notification in the list
        setNotifications(prev => 
          prev.map(notif => 
            notif.report_id === reportId 
              ? { ...notif, handled: true, action, location }
              : notif
          )
        );

        // Decrease unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Show success message based on action
        let successMessage = '';
        switch (action) {
          case 'verify':
            successMessage = 'Report verified successfully!';
            break;
          case 'reject':
            successMessage = 'Report rejected successfully!';
            break;
          case 'safe':
            successMessage = 'Safety status recorded! A safe zone has been created around your location.';
            break;
          case 'not_safe':
            successMessage = 'Safety status recorded! An alert zone has been created around your location.';
            break;
        }
        
        if (successMessage) {
          // You can replace this with a proper toast notification
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
          toast.textContent = successMessage;
          document.body.appendChild(toast);
          setTimeout(() => document.body.removeChild(toast), 3000);
        }
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit verification');
      }
    } catch (error) {
      console.error('Failed to submit verification:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Filter out handled notifications from display
  const displayNotifications = notifications.filter(notif => 
    !handledNotifications.has(notif.report_id)
  );

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-500">
              {displayNotifications.length} active alerts
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {displayNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No active notifications
              </div>
            ) : (
              displayNotifications.map(notification => (
                <NotificationItem
                  key={`${notification.report_id}-${notification.id}`}
                  notification={notification}
                  onVerify={handleVerification}
                  isHandled={handledNotifications.has(notification.report_id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const NotificationItem = ({ notification, onVerify, isHandled }) => {
  const [showSafetyOptions, setShowSafetyOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerify = async () => {
    setIsSubmitting(true);
    try {
      await onVerify(notification.id, notification.report_id, 'verify', false);
      setShowSafetyOptions(true);
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onVerify(notification.id, notification.report_id, 'reject', false);
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSafetyResponse = async (isSafe) => {
    setIsSubmitting(true);
    try {
      // This requires location capture
      await onVerify(
        notification.id, 
        notification.report_id, 
        isSafe ? 'safe' : 'not_safe', 
        true // requiresLocation = true
      );
    } catch (error) {
      console.error('Safety response failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Don't render if already handled
  if (isHandled) return null;

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">
              {notification.title}
            </h4>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getUrgencyColor(notification.urgency)}`}>
              {notification.urgency || 'Medium'} Priority
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">
            {notification.message}
          </p>
          
          <div className="text-xs text-gray-500 mb-3 flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            {notification.location} • {notification.distance}
          </div>

          {/* Action Buttons */}
          {!showSafetyOptions && (
            <div className="flex space-x-2">
              <button
                onClick={handleVerify}
                disabled={isSubmitting}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="w-3 h-3 mr-1" />
                )}
                Verify
              </button>
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <XCircle className="w-3 h-3 mr-1" />
                )}
                Reject
              </button>
            </div>
          )}

          {/* Safety Response Options */}
          {showSafetyOptions && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-blue-600" />
                Are you currently safe from this hazard?
                <span className="text-xs text-blue-600 ml-2">(Location will be captured)</span>
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSafetyResponse(true)}
                  disabled={isSubmitting}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Shield className="w-3 h-3 mr-1" />
                  )}
                  I'm Safe
                </button>
                <button
                  onClick={() => handleSafetyResponse(false)}
                  disabled={isSubmitting}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  )}
                  I'm Not Safe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;