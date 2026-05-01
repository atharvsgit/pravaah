import React, { useState, useRef, useEffect } from 'react';
import './ReportForm.css';

const ReportForm = () => {
  const [formData, setFormData] = useState({
    activityType: '',
    description: '',
    photos: [],
    videos: [],
    voiceReport: null
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeNav, setActiveNav] = useState('report');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  const activityTypes = [
    'Oil Spill',
    'Marine Pollution',
    'Suspicious Vessel',
    'Fishing Violation',
    'Coral Damage',
    'Marine Life Disturbance',
    'Weather Hazard',
    'Navigation Hazard',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files]
    }));
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      videos: [...prev.videos, ...files]
    }));
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setFormData(prev => ({ ...prev, voiceReport: audioBlob }));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const handleVoiceReport = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Get user's current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      
      // Create FormData for multipart request
      const submitData = new FormData();
      submitData.append('user_hazard_type', formData.activityType);
      submitData.append('user_description', formData.description);
      
      // Add photos
      formData.photos.forEach((photo, index) => {
        submitData.append('media_files', photo);
      });
      
      // Add videos
      formData.videos.forEach((video, index) => {
        submitData.append('media_files', video);
      });
      
      // Add voice report if exists
      if (formData.voiceReport) {
        submitData.append('media_files', formData.voiceReport);
      }
      
      // Get auth token from localStorage or cookies
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'latitude': latitude.toString(),
          'longitude': longitude.toString()
        },
        body: submitData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (result.is_offline) {
          alert('Report saved offline. Will sync when connection is restored.');
        } else {
          alert('Report submitted successfully!');
        }
        
        // Reset form
        setFormData({
          activityType: '',
          description: '',
          photos: [],
          videos: [],
          voiceReport: null
        });
      } else {
        throw new Error(result.detail || 'Failed to submit report');
      }
      
    } catch (error) {
      console.error('Error submitting report:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        alert('Unable to connect to the server. Please check your internet connection.');
      } else {
        alert(`Error submitting report: ${error.message}`);
      }
    }
  };

  const handleSaveDraft = () => {
    // Handle saving as draft
    console.log('Saving draft:', formData);
  };

  return (
    <div className="report-page">
      {/* Permanent Left Sidebar Navigation */}
      <div className="permanent-sidebar">
        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeNav === 'home' ? 'active' : ''}`}
            onClick={() => setActiveNav('home')}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </div>
          <div 
            className={`nav-item ${activeNav === 'report' ? 'active' : ''}`}
            onClick={() => setActiveNav('report')}
          >
            <span className="nav-icon">📝</span>
            <span className="nav-label">Report</span>
          </div>
          <div 
            className={`nav-item ${activeNav === 'community' ? 'active' : ''}`}
            onClick={() => setActiveNav('community')}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-label">Community</span>
          </div>
          <div 
            className={`nav-item ${activeNav === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveNav('profile')}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="main-layout">
        {/* Header */}
        <div className="header">
          <div className="status-bar">
            <div className="notch"></div>
          </div>
          <div className="nav-bar">
            <div className="nav-left">
            </div>
            <div className="nav-right">
              <button className="nav-icon">🔔</button>
              <button className="nav-icon">🌐</button>
              <button className="nav-icon">⚙️</button>
              <div className="gps-badge">
                <span className="gps-icon">📍</span>
                <span className="gps-text">GPS Active</span>
              </div>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="page-title">
          <h2>Report Ocean Activity</h2>
          <p>Help keep your community safe!</p>
        </div>

        <div className="form-layout">
          <form className="report-form" onSubmit={handleSubmit}>
            {/* Report Details Section */}
            <div className="form-section">
              <div className="section-header">
                <span className="section-icon">⚠️</span>
                <h3>Ocean Activity Report Details</h3>
              </div>
              
              <div className="form-group">
                <label htmlFor="activityType">Incident Type</label>
                <select
                  id="activityType"
                  name="activityType"
                  value={formData.activityType}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Select incident type</option>
                  {activityTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the ocean activity in detail..."
                  className="form-textarea"
                  rows="4"
                />
              </div>
            </div>

            {/* Media Evidence Section */}
            <div className="form-section">
              <div className="section-header">
                <h3>Media Evidence</h3>
              </div>
              
              <div className="media-options">
                <div className="media-option">
                  <input
                    type="file"
                    id="photos"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="media-input"
                  />
                  <label htmlFor="photos" className="media-label">
                    <span className="media-icon">📷</span>
                    <span className="media-text">Add Photos</span>
                  </label>
                </div>

                <div className="media-option">
                  <input
                    type="file"
                    id="videos"
                    accept="video/*"
                    multiple
                    onChange={handleVideoUpload}
                    className="media-input"
                  />
                  <label htmlFor="videos" className="media-label">
                    <span className="media-icon">🎥</span>
                    <span className="media-text">Add Videos</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Voice Report Section */}
            <div className="form-section">
              <div className="section-header">
                <h3>Voice Report</h3>
              </div>
              
              <button
                type="button"
                onClick={handleVoiceReport}
                className={`voice-btn ${isRecording ? 'recording' : ''}`}
              >
                <span className="voice-icon">🎤</span>
                <span className="voice-text">
                  {isRecording ? `Recording... ${formatTime(recordingTime)}` : 'Start Voice Report'}
                </span>
                <span className="voice-subtitle">
                  {isRecording ? 'Click to stop recording' : 'Describe the ocean activity'}
                </span>
                {isRecording && (
                  <div className="recording-indicator">
                    <div className="pulse-dot"></div>
                  </div>
                )}
              </button>
            </div>
          </form>

          {/* Submit Report Section - Right Side */}
          <div className="submit-section">
            <div className="section-header">
              <span className="section-icon">📄</span>
              <h3>Submit Report</h3>
            </div>
            
            <div className="submit-actions">
              <button type="submit" className="submit-btn primary" onClick={handleSubmit}>
                Submit Report
              </button>
              <button type="button" onClick={handleSaveDraft} className="submit-btn secondary">
                Save as Draft
              </button>
            </div>
            
            <p className="disclaimer">
              Reports are reviewed by safety officials and shared with the community
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ReportForm;
