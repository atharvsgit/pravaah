import React, { useState } from 'react';
import { Shield, AlertTriangle, MapPin } from 'lucide-react';

const SafetyStatusModal = ({ isOpen, onClose, notification, onStatusUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  // Function to get current location (same as Report component)
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
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  };

  // Get current location when modal opens
  React.useEffect(() => {
    if (isOpen && !location) {
      getCurrentLocation()
        .then((loc) => {
          setLocation(loc);
        })
        .catch((error) => {
          console.error('Error getting location:', error);
          alert('Location is required for safety responses. Please enable location access and try again.');
        });
    }
  }, [isOpen]);

  const handleStatusSubmit = async (isSafe) => {
    // Handle "I'm not safe" responses
    if (!isSafe) {
      // Notify parent component to remove notification
      if (onStatusUpdate) {
        onStatusUpdate({
          notificationId: notification.id,
          action: 'not_safe',
          removeFromList: true
        });
      }
      
      alert('Thank you for your response.');
      onClose();
      return;
    }

    if (!location) {
      alert('Unable to get your location. Please enable location services.');
      return;
    }

    setLoading(true);
    try {
      // Only for "I'm safe" - dispatch map event to show green circle
      if (isSafe) {
        const mapEvent = new CustomEvent('addSafetyCircle', {
          detail: {
            latitude: location.latitude,
            longitude: location.longitude,
            isSafe: true,
            color: '#10B981', // green for safe
            timestamp: Date.now(),
            reportId: notification.report_id || notification.id
          }
        });
        window.dispatchEvent(mapEvent);
        
        // Show success message
        alert('Thank you! You\'ve been marked as Safe. A green safety zone has been created around your location.');
      }
      
      // Notify parent component to remove notification
      if (onStatusUpdate) {
        onStatusUpdate({
          notificationId: notification.id,
          action: isSafe ? 'safe' : 'not_safe',
          removeFromList: true
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error handling safety status:', error);
      alert('There was an error processing your response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Safety Status Check
          </h2>
          <p className="text-gray-600">
            A <strong>{notification?.hazardName}</strong> has been reported in your area. 
            Are you safe?
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleStatusSubmit(true)}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-100 hover:bg-green-200 text-green-800 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Shield className="w-5 h-5 mr-2" />
            I'm Safe
            <span className="ml-2 text-xs">(Creates Green Zone)</span>
          </button>
          
          <button
            onClick={() => handleStatusSubmit(false)}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <AlertTriangle className="w-5 h-5 mr-2" />
            I'm Not Safe
            <span className="ml-2 text-xs">(Creates Danger Zone)</span>
          </button>
        </div>

        {location && (
          <div className="flex items-center justify-center text-xs text-gray-500 mb-4">
            <MapPin className="w-3 h-3 mr-1" />
            Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Maybe Later
          </button>
        </div>

        {loading && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Updating your safety status...
          </div>
        )}
      </div>
    </div>
  );
};

export default SafetyStatusModal;