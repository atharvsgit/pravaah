import React, { useState, useRef, useEffect } from 'react';
import { submitReport } from '../../services/reportService';
import { uploadProfilePicture } from '../../services/userService';
import { 
  MapPin, 
  Camera, 
  Video, 
  Mic, 
  AlertTriangle, 
  Upload,
  Save,
  Send,
  FileImage,
  FileVideo,
  MicIcon,
  Play,
  Pause,
  Square,
  Loader2,
  Cross
} from 'lucide-react';

const Report = () => {
  const [selectedIncidentType, setSelectedIncidentType] = useState('');
  const [description, setDescription] = useState('');
  // For autofill from hazard analysis
  const [hazardAutofill, setHazardAutofill] = useState({ type: '', description: '' });
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  
  // Location state
  const [myLocation, setMyLocation] = useState(null);
  const [locationAllowed, setLocationAllowed] = useState(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  
  // Dynamic incident types state - can be updated when AI detects new types
  const [incidentTypes, setIncidentTypes] = useState([
    { value: 'usual_tides', label: 'Usual Tides' },
    { value: 'flooding', label: 'Flooding' },
    { value: 'coastal_damage', label: 'Coastal Damage' },
    { value: 'tsunami', label: 'Tsunami' },
    { value: 'swell_surges', label: 'Swell Surges' },
    { value: 'high_waves', label: 'High Waves' },
    { value: 'rip_current', label: 'Rip Current' },
    { value: 'marine_life', label: 'Marine Life Alert' },
    { value: 'weather_alert', label: 'Weather Alert' },
    { value: 'other', label: 'Other' }
  ]);
  
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const watchIdRef = useRef(null);

  // Function to add a new hazard type to the dropdown if it doesn't exist
  const addHazardTypeIfNeeded = (hazardType) => {
    const hazardValue = hazardType.toLowerCase().replace(/\s+/g, '_');
    const hazardLabel = hazardType;
    
    // Check if this hazard type already exists in the dropdown
    const exists = incidentTypes.some(type => type.value === hazardValue);
    
    if (!exists) {
      // Add the new hazard type to the dropdown (before "Other")
      const newType = { value: hazardValue, label: hazardLabel };
      setIncidentTypes(prev => {
        const otherIndex = prev.findIndex(type => type.value === 'other');
        if (otherIndex !== -1) {
          // Insert before "Other"
          const newTypes = [...prev];
          newTypes.splice(otherIndex, 0, newType);
          return newTypes;
        } else {
          // Just add to the end
          return [...prev, newType];
        }
      });
      
      console.log('🆕 Added new hazard type to dropdown:', hazardLabel, 'with value:', hazardValue);
      return hazardValue;
    }
    
    return hazardValue;
  };

  // Function to get current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
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

  // Function to start location tracking
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationAllowed(false);
      return;
    }

    // Clear any existing watch
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setMyLocation({ 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        });
        setLocationAllowed(true);
      },
      (error) => {
        console.error('Location tracking error:', error);
        setLocationAllowed(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Function to stop location tracking
  const stopLocationTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationAllowed(false);
    setMyLocation(null);
  };

  // Function to handle GPS button click
  const handleGPSButtonClick = async () => {
    if (locationAllowed === true) {
      // If GPS is active, stop tracking
      stopLocationTracking();
    } else {
      // If GPS is inactive, request permission and start tracking
      setIsRequestingLocation(true);
      try {
        const location = await getCurrentLocation();
        setMyLocation(location);
        setLocationAllowed(true);
        startLocationTracking();
      } catch (error) {
        console.error('Failed to get location:', error);
        setLocationAllowed(false);
      } finally {
        setIsRequestingLocation(false);
      }
    }
  };

  // Initial location request
  useEffect(() => {
    let active = true;
    if (!navigator.geolocation) {
      setLocationAllowed(false);
      return () => {};
    }
    
    getCurrentLocation()
      .then((location) => {
        if (!active) return;
        setMyLocation(location);
        setLocationAllowed(true);
        startLocationTracking();
      })
      .catch(() => {
        if (!active) return;
        setLocationAllowed(false);
      });
    
    return () => { 
      active = false;
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    setSelectedImages(prev => [...prev, ...files]);
  };

  const handleVideoUpload = (event) => {
    const files = Array.from(event.target.files);
    setSelectedVideos(prev => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index) => {
    setSelectedVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleMediaUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await uploadProfilePicture(file);
        setUploadedImages(prev => [...prev, { 
          name: file.name, 
          url: result.profile_picture 
        }]);
        // Also add to selectedImages so these files are included in the report submission
        setSelectedImages(prev => [...prev, file]);
        // Autofill incident type and description if hazard analysis is present
        if (result.hazard_type && result.hazard_description) {
          setHazardAutofill({
            type: result.hazard_type,
            description: result.hazard_description
          });
          
          // Add the detected hazard type to dropdown if it doesn't exist, then select it
          const hazardTypeValue = addHazardTypeIfNeeded(result.hazard_type);
          setSelectedIncidentType(hazardTypeValue);
          setDescription(result.hazard_description);
          
          console.log('🎯 Autofill applied:', {
            originalHazardType: result.hazard_type,
            selectedValue: hazardTypeValue,
            description: result.hazard_description
          });
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (audioBlob && audioRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setIsPlaying(true);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check if location is available
      if (!myLocation || !locationAllowed) {
        alert('Please enable GPS to submit a report with location data.');
        return;
      }

      const latitude = myLocation.lat;
      const longitude = myLocation.lng;

      await submitReport({
        activityType: selectedIncidentType,
        description,
        photos: selectedImages,
        videos: selectedVideos,
        voiceReport: audioBlob,
        latitude,
        longitude,
      });

      alert('Report submitted successfully. It has been queued for processing.');
      // Reset form
      setSelectedIncidentType('');
      setDescription('');
      setSelectedImages([]);
      setSelectedVideos([]);
      setAudioBlob(null);
    } catch (err) {
      console.error('Submit failed', err);
      alert(err?.message || 'Failed to submit report. Please try again.');
    }
  };

  const handleSaveDraft = () => {
    // Handle save as draft
    console.log('Saving as draft...');
  };

  return (
    <div className="min-h-screen bg-sky-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1 text-left">Report Ocean Incident</h1>
              <p className="text-slate-600">Help keep our waters safe by reporting incidents</p>
            </div>
            
            {/* GPS Status */}
            <button
              onClick={handleGPSButtonClick}
              disabled={isRequestingLocation}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center transition-all duration-200 shadow-lg ${
                locationAllowed === true
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:shadow-xl'
                  : locationAllowed === false
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-xl'
                  : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white hover:from-gray-500 hover:to-gray-600 hover:shadow-xl'
              } ${isRequestingLocation ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isRequestingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : locationAllowed === true ? (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  GPS Active
                </>
              ) : locationAllowed === false ? (
                <>
                  <Cross className="w-4 h-4 mr-2" />
                  GPS Inactive
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Enable GPS
                </>
              )}
            </button>
          </div>
        </div>

        {/* Location Status Card */}
        {locationAllowed && myLocation && (
          <div className="mb-6 bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center text-sm text-blue-800">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="font-medium">Report Location:</span>
              <span className="ml-2 font-mono">
                {myLocation.lat.toFixed(6)}, {myLocation.lng.toFixed(6)}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-8">
          {/* Main Content - Left Side */}
          <div className="flex-1">
            <form id="report-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Incident Report Details Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <AlertTriangle className="w-5 h-5 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-800">Incident Report Details</h2>
            </div>

            {/* Incident Type - Full Width */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3 text-left">
                Incident Type *
              </label>
              <div className="relative">
                <select
                  value={selectedIncidentType}
                  onChange={(e) => setSelectedIncidentType(e.target.value)}
                  className="w-full p-4 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 appearance-none bg-white text-slate-800 font-medium"
                  required
                >
                  <option value="">Select incident type</option>
                  {incidentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-left">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 resize-none"
                placeholder="Describe the incident in detail..."
                required
              />
            </div>
          </div>

          {/* Media Evidence Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <Camera className="w-5 h-5 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-800">Media Evidence</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo Upload */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                >
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-blue-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-blue-600 font-semibold mb-1">Add Photos</p>
                    <p className="text-sm text-slate-500">Click to upload images</p>
                  </div>
                </button>

                {/* Selected Images Preview */}
                {selectedImages.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center">
                          <FileImage className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video Upload */}
              <div>
                <input
                  type="file"
                  ref={videoInputRef}
                  onChange={handleVideoUpload}
                  accept="video/*"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                >
                  <div className="text-center">
                    <Video className="w-8 h-8 text-blue-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-blue-600 font-semibold mb-1">Add Videos</p>
                    <p className="text-sm text-slate-500">Click to upload videos</p>
                  </div>
                </button>

                {/* Selected Videos Preview */}
                {selectedVideos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedVideos.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center">
                          <FileVideo className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <div className="mt-6">
              <input
                type="file"
                ref={uploadInputRef}
                onChange={handleMediaUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isUploading}
                className="w-full p-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Upload Selected Media</span>
                  </>
                )}
              </button>

              {/* Uploaded Images Preview */}
              {uploadedImages.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Uploaded Files:</h4>
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <FileImage className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-700 truncate">{image.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(index)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Voice Report Card */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <Mic className="w-5 h-5 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-800">Voice Report</h2>
            </div>

            <div className="max-w-md mx-auto">
              {!audioBlob ? (
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-full p-6 rounded-xl border-2 transition-all duration-200 ${
                    isRecording 
                      ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                      : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <div className="text-center">
                    {isRecording ? (
                      <>
                        <Square className="w-8 h-8 text-red-500 mx-auto mb-3 animate-pulse" />
                        <p className="text-red-600 font-semibold mb-1">Stop Recording</p>
                        <p className="text-sm text-red-500">Recording in progress...</p>
                      </>
                    ) : (
                      <>
                        <Mic className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                        <p className="text-blue-600 font-semibold mb-1">Start Voice Report</p>
                        <p className="text-sm text-slate-500">Describe the incident</p>
                      </>
                    )}
                  </div>
                </button>
              ) : (
                <div className="p-6 border-2 border-green-300 bg-green-50 rounded-xl">
                  <div className="text-center mb-4">
                    <MicIcon className="w-8 h-8 text-green-500 mx-auto mb-3" />
                    <p className="text-green-600 font-semibold">Voice Report Recorded</p>
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={isPlaying ? pauseAudio : playAudio}
                      className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setAudioBlob(null);
                        setIsPlaying(false);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                  
                  <audio ref={audioRef} className="hidden" />
                </div>
              )}
            </div>
          </div>

            </form>
          </div>

          {/* Right Sidebar - Submit Section */}
          <div className="w-80">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center mb-6">
                  <Send className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-800">Submit Report</h2>
                </div>
                
                <div className="space-y-4">
                  <button
                    type="submit"
                    form="report-form"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md flex items-center justify-center"
                  >
                    Submit Report
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="w-full bg-gray-100 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
                  >
                    Save as Draft
                  </button>
                </div>
                
                <p className="text-center text-sm text-gray-500 mt-6">
                  Reports are reviewed by safety officials and shared with the community
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
