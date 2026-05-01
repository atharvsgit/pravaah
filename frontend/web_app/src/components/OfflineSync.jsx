import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

// Map UI activity labels to backend HazardType values
const mapActivityToHazardType = (activityType) => {
  const mapping = {
    'Oil Spill': 'Marine Debris / Pollution',
    'Marine Pollution': 'Marine Debris / Pollution',
    'Suspicious Vessel': 'Other',
    'Fishing Violation': 'Other',
    'Coral Damage': 'Other',
    'Marine Life Disturbance': 'Other',
    'Weather Hazard': 'High Waves / Swell',
    'Navigation Hazard': 'Other',
    'Other': 'Other',
    // Support values used by Report page
    'tsunami': 'Tsunami',
    'high_waves': 'High Waves / Swell',
    'swell_surges': 'High Waves / Swell',
    'flooding': 'Coastal Flooding',
    'coastal_damage': 'Coastal Erosion',
    'rip_current': 'Rip Current',
    'marine_life': 'Other',
    'weather_alert': 'High Waves / Swell',
    'usual_tides': 'Other',
  };
  // If already a valid backend enum value, pass through
  const validBackendEnums = new Set([
    'Tsunami',
    'High Waves / Swell',
    'Coastal Flooding',
    'Storm Surge',
    'Rip Current',
    'Coastal Erosion',
    'Water Discoloration / Algal Bloom',
    'Marine Debris / Pollution',
    'Other',
  ]);
  if (validBackendEnums.has(activityType)) return activityType;
  return mapping[activityType] || 'Other';
};

const OfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(null);
  const [pendingReports, setPendingReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check connectivity and sync status
  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status');
      const data = await response.json();
      setSyncStatus(data);
      
      // Get pending reports with authentication
      const token = localStorage.getItem('authToken') || 
                   localStorage.getItem('token') || 
                   sessionStorage.getItem('authToken') ||
                   sessionStorage.getItem('token');
      
      if (token) {
        const pendingResponse = await fetch('/api/sync/pending-reports', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json();
          setPendingReports(pendingData);
        } else {
          console.warn('Failed to fetch pending reports:', pendingResponse.status);
          setPendingReports([]);
        }
      } else {
        console.warn('No auth token found, skipping pending reports fetch');
        setPendingReports([]);
      }
      
      // If we're online, try to sync local offline reports
      if (navigator.onLine) {
        await syncLocalOfflineReports();
      }
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  };

  // Sync locally stored offline reports
  const syncLocalOfflineReports = async () => {
    try {
      const offlineReports = JSON.parse(localStorage.getItem('offline_reports') || '[]');
      const unsyncedReports = offlineReports.filter(report => !report.synced);

      if (unsyncedReports.length === 0) return;

      console.log(`Found ${unsyncedReports.length} offline reports to sync`);
      console.log('Sample report structure:', unsyncedReports[0]);

      for (const report of unsyncedReports) {
        try {
          // Skip reports without location data
          const latitude = report.latitude || report.location?.latitude;
          const longitude = report.longitude || report.location?.longitude;
          
          if (!latitude || !longitude) {
            console.warn(`Skipping report ${report.id} - missing location data`);
            continue;
          }

          // Convert base64 media back to files
          const mediaFiles = await Promise.all(
            (report.mediaFiles || []).map(async (media) => {
              const response = await fetch(media.data);
              const blob = await response.blob();
              return new File([blob], media.name, { type: media.type });
            })
          );

          // Create FormData for submission
          const submitData = new FormData();
          
          // Map activity type to hazard type - handle both possible field names
          const activityType = report.hazardType || report.activityType;
          const mappedHazardType = mapActivityToHazardType(activityType);
          console.log(`Mapping "${activityType}" -> "${mappedHazardType}"`);
          
          submitData.append('user_hazard_type', mappedHazardType);
          submitData.append('user_description', report.description || '');
          
          mediaFiles.forEach((file) => {
            submitData.append('media_files', file);
          });

          // Get auth token - try different possible storage keys
          const token = localStorage.getItem('authToken') || 
                       localStorage.getItem('token') || 
                       sessionStorage.getItem('authToken') ||
                       sessionStorage.getItem('token');
          
          const headers = {
            'latitude': latitude.toString(),
            'longitude': longitude.toString(),
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log(`Syncing report ${report.id} with auth token`);
          } else {
            console.warn(`Syncing report ${report.id} without auth token - may fail`);
          }

          // Submit to server
          const response = await fetch('/api/reports/submit', {
            method: 'POST',
            headers: headers,
            body: submitData,
          });

          if (response.ok) {
            // Mark as synced
            report.synced = true;
            report.syncedAt = new Date().toISOString();
            console.log(`Successfully synced offline report: ${report.id}`);
          } else {
            const errorText = await response.text();
            if (response.status === 401) {
              console.error(`Auth failed for report ${report.id} - user may need to log in again`);
            } else {
              console.error(`Failed to sync report ${report.id} (${response.status}):`, errorText);
            }
          }
        } catch (error) {
          console.error(`Failed to sync report ${report.id}:`, error);
        }
      }

      // Remove successfully synced reports from localStorage
      const remainingUnsyncedReports = offlineReports.filter(report => !report.synced);
      const syncedCount = offlineReports.length - remainingUnsyncedReports.length;
      
      if (syncedCount > 0) {
        console.log(`Removing ${syncedCount} successfully synced reports from localStorage`);
        localStorage.setItem('offline_reports', JSON.stringify(remainingUnsyncedReports));
      }

    } catch (error) {
      console.error('Failed to sync local offline reports:', error);
    }
  };

  // Trigger manual sync
  const triggerSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sync/trigger', { method: 'POST' });
      if (response.ok) {
        // Wait a moment then refresh status
        setTimeout(checkSyncStatus, 2000);
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkSyncStatus();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkSyncStatus();

    // Set up periodic sync status check
    const interval = setInterval(checkSyncStatus, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const getSyncStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (syncStatus?.sync?.is_syncing) return 'text-blue-500';
    if (syncStatus?.sync?.pending_reports > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getSyncStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus?.sync?.is_syncing) return 'Syncing...';
    if (syncStatus?.sync?.pending_reports > 0) {
      return `${syncStatus.sync.pending_reports} pending`;
    }
    return 'Synced';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Status Indicator */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg ${
        isOnline ? 'bg-white border' : 'bg-red-50 border border-red-200'
      }`}>
        {isOnline ? (
          <Wifi className={`w-4 h-4 ${getSyncStatusColor()}`} />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${getSyncStatusColor()}`}>
          {getSyncStatusText()}
        </span>
        
        {/* Sync Button */}
        {isOnline && syncStatus?.sync?.pending_reports > 0 && (
          <button
            onClick={triggerSync}
            disabled={isLoading || syncStatus?.sync?.is_syncing}
            className="ml-2 p-1 rounded hover:bg-gray-100 disabled:opacity-50"
            title="Sync now"
          >
            <RefreshCw className={`w-4 h-4 ${
              isLoading || syncStatus?.sync?.is_syncing ? 'animate-spin' : ''
            }`} />
          </button>
        )}
      </div>

      {/* Pending Reports Details */}
      {pendingReports.length > 0 && (
        <div className="mt-2 bg-white border rounded-lg shadow-lg p-4 max-w-sm">
          <h4 className="font-semibold text-sm mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            Pending Reports ({pendingReports.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {pendingReports.slice(0, 3).map((report) => (
              <div key={report.id} className="flex items-center justify-between text-xs">
                <span className="truncate">
                  {report.hazard_type} - {report.city || 'Unknown location'}
                </span>
                <div className="flex items-center ml-2">
                  {report.sync_status === 'failed' ? (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  ) : report.sync_status === 'syncing' ? (
                    <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                  ) : (
                    <Clock className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
              </div>
            ))}
            {pendingReports.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{pendingReports.length - 3} more reports
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineSync;