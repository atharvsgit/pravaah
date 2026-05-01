import React, { useState, useEffect } from 'react';
import { MapPin, Camera, Mic, FileText, Send, WifiOff, Clock } from 'lucide-react';

const OfflineReportForm = ({ onSubmit, isOnline }) => {
  const [formData, setFormData] = useState({
    hazardType: '',
    description: '',
    location: null,
    mediaFiles: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Show offline warning when user tries to submit without connection
  useEffect(() => {
    if (!isOnline && isSubmitting) {
      setShowOfflineWarning(true);
      const timer = setTimeout(() => setShowOfflineWarning(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSubmitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.hazardType || !formData.location) {
      alert('Please select a hazard type and enable location access');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if we're truly offline (browser offline mode)
      if (!navigator.onLine) {
        // Store report locally for offline mode
        await saveReportOffline();
        return;
      }

      // Try to submit to server
      const submitData = new FormData();
      
      // Add form fields
      submitData.append('user_hazard_type', formData.hazardType);
      submitData.append('user_description', formData.description);
      
      // Add location as headers (as per your API design)
      const headers = {
        'latitude': formData.location.latitude,
        'longitude': formData.location.longitude,
      };

      // Add media files
      formData.mediaFiles.forEach((file, index) => {
        submitData.append('media_files', file);
      });

      // Add auth token if available
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: headers,
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        if (result.is_offline) {
          // Show offline success message
          alert(`Report saved offline! It will be synced when connection is restored. Offline ID: ${result.offline_id}`);
        } else {
          // Show normal success message
          alert(`Report submitted successfully! Report ID: ${result.report_id}`);
        }
        
        // Reset form
        setFormData({
          hazardType: '',
          description: '',
          location: formData.location, // Keep location
          mediaFiles: []
        });
        
        if (onSubmit) onSubmit(result);
      } else {
        throw new Error(result.detail || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      
      // If network error, save offline
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        await saveReportOffline();
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveReportOffline = async () => {
    try {
      // Generate a unique offline ID
      const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Convert files to base64 for storage
      const mediaData = await Promise.all(
        formData.mediaFiles.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64
          };
        })
      );

      const offlineReport = {
        id: offlineId,
        hazardType: formData.hazardType,
        description: formData.description,
        location: formData.location,
        mediaFiles: mediaData,
        timestamp: new Date().toISOString(),
        synced: false
      };

      // Get existing offline reports
      const existingReports = JSON.parse(localStorage.getItem('offline_reports') || '[]');
      
      // Add new report
      existingReports.push(offlineReport);
      
      // Save back to localStorage
      localStorage.setItem('offline_reports', JSON.stringify(existingReports));

      alert(`Report saved offline! It will be uploaded when you're back online. Offline ID: ${offlineId}`);
      
      // Reset form
      setFormData({
        hazardType: '',
        description: '',
        location: formData.location, // Keep location
        mediaFiles: []
      });

      if (onSubmit) onSubmit({ is_offline: true, offline_id: offlineId });
      
    } catch (error) {
      console.error('Failed to save report offline:', error);
      alert('Failed to save report offline. Please try again.');
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...files]
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, i) => i !== index)
    }));
  };

  const hazardTypes = [
    'FLOOD', 'EARTHQUAKE', 'FIRE', 'STORM', 'ACCIDENT', 
    'MEDICAL_EMERGENCY', 'CRIME', 'INFRASTRUCTURE', 'OTHER'
  ];

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Offline Status Warning */}
      {!isOnline && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
          <WifiOff className="w-5 h-5 text-yellow-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-yellow-800">You're offline</p>
            <p className="text-xs text-yellow-600">Reports will be saved locally and synced when connection is restored</p>
          </div>
        </div>
      )}

      {/* Offline Warning Animation */}
      {showOfflineWarning && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center animate-pulse">
          <Clock className="w-5 h-5 text-blue-600 mr-2" />
          <p className="text-sm text-blue-800">Saving report offline...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Report Hazard</h2>

        {/* Location Status */}
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-1" />
          {formData.location ? (
            <span className="text-green-600">Location detected</span>
          ) : (
            <span className="text-red-600">Getting location...</span>
          )}
        </div>

        {/* Hazard Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hazard Type *
          </label>
          <select
            value={formData.hazardType}
            onChange={(e) => setFormData(prev => ({ ...prev, hazardType: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select hazard type</option>
            {hazardTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what you observed..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Media Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Media (Photos/Videos)
          </label>
          <div className="flex items-center space-x-2">
            <label className="flex-1 flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400">
              <Camera className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">Add photos/videos</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Selected Files */}
          {formData.mediaFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {formData.mediaFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600 truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !formData.location}
          className={`w-full flex items-center justify-center p-3 rounded-lg font-medium ${
            isSubmitting || !formData.location
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : isOnline
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isOnline ? 'Submitting...' : 'Saving offline...'}
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {isOnline ? 'Submit Report' : 'Save Offline'}
            </>
          )}
        </button>

        {/* Offline Mode Info */}
        {!isOnline && (
          <p className="text-xs text-center text-gray-600 mt-2">
            Your report will be automatically synced when you're back online
          </p>
        )}
      </form>
    </div>
  );
};

export default OfflineReportForm;