import React, { useState, useEffect } from 'react';
import { User, X, Mail, Phone, MapPin, Edit, Activity, Award, Shield, Calendar, Clock, Save, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { getCurrentUserProfile, updateUserProfile } from '../../services/userService';

const ProfileModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [activeReportTab, setActiveReportTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // User data state
  const [userData, setUserData] = useState({
    name: 'Loading...',
    role: 'Loading...',
    email: 'Loading...',
    phone: '',
    bio: '',
    location: '',
    avatar: 'L',
    joinDate: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    profilePicture: null
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    bio: '',
    location: ''
  });

  // Handled issues and stats
  const [allReports, setAllReports] = useState([]);
  const [handledIssues, setHandledIssues] = useState([]);
  const [userRejectedReports, setUserRejectedReports] = useState([]);
  const [userStats, setUserStats] = useState({
    resolved: 0,
    inProgress: 0,
    pending: 0,
    rejected: 0,
    total: 0
  });
  const [issuesLoading, setIssuesLoading] = useState(true);

  // Handle rejecting a report
  const handleRejectReport = (report) => {
    // Add to user rejected reports if not already rejected
    if (!userRejectedReports.find(r => r.id === report.id)) {
      setUserRejectedReports(prev => [...prev, report]);
      
      // Update stats
      setUserStats(prev => ({
        ...prev,
        rejected: prev.rejected + 1
      }));
    }
  };

  // Fetch user profile data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const profileData = await getCurrentUserProfile();
        
        const userData = {
          name: profileData.full_name || 'Official User',
          role: profileData.role || 'official',
          email: profileData.email || '',
          phone: profileData.phone || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
          avatar: (profileData.full_name || 'U').charAt(0).toUpperCase(),
          joinDate: profileData.created_at || new Date().toISOString(),
          lastLogin: profileData.location_updated_at || new Date().toISOString(),
          profilePicture: profileData.profile_picture
        };
        
        setUserData(userData);
        setEditForm({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          bio: profileData.bio || '',
          location: profileData.location || ''
        });
        
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Keep default loading values on error
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Fetch user reports and statistics
  useEffect(() => {
    const fetchUserReports = async () => {
      try {
        setIssuesLoading(true);
        
        // Fetch all reports from the new endpoint
        const allReportsResponse = await api.get('/official/reports/all?limit=100');
        const allReportsData = allReportsResponse.data || [];
        
        // Transform reports for display
        const transformedReports = allReportsData.map((report) => ({
          id: report.id,
          title: report.user_description || `${report.user_hazard_type} Report`,
          status: report.status === 'verified' ? 'Resolved' : 
                 report.status === 'under_verification' ? 'In Progress' : 
                 report.status === 'rejected' ? 'Rejected' :
                 'Pending',
          reportedBy: report.user?.full_name || 'Anonymous',
          description: report.user_description || 'No description available',
          priority: report.final_confidence_score > 0.7 ? 'High' : 
                   report.final_confidence_score > 0.5 ? 'Medium' : 'Low',
          createdAt: report.created_at,
          hazardType: report.user_hazard_type,
          originalStatus: report.status
        }));
        
        setAllReports(transformedReports);
        setHandledIssues(transformedReports);
        
        // Calculate statistics
        const resolved = transformedReports.filter(r => r.originalStatus === 'verified').length;
        const inProgress = transformedReports.filter(r => r.originalStatus === 'under_verification').length;
        const pending = transformedReports.filter(r => r.originalStatus === 'pending').length;
        const rejected = transformedReports.filter(r => r.originalStatus === 'rejected').length;
        
        setUserStats({
          resolved,
          inProgress,
          pending,
          rejected,
          total: transformedReports.length
        });
        
      } catch (error) {
        console.error('Error fetching user reports:', error);
        // Keep empty arrays on error
        setAllReports([]);
        setHandledIssues([]);
        setUserStats({ resolved: 0, inProgress: 0, pending: 0, rejected: 0, total: 0 });
      } finally {
        setIssuesLoading(false);
      }
    };

    fetchUserReports();
  }, []);

  // Handle profile editing
  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form when canceling edit
      setEditForm({
        full_name: userData.name,
        phone: userData.phone,
        bio: userData.bio,
        location: userData.location
      });
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setUpdating(true);
      
      const updatedProfile = await updateUserProfile(editForm);
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        name: updatedProfile.full_name || prev.name,
        phone: updatedProfile.phone || prev.phone,
        bio: updatedProfile.bio || prev.bio,
        location: updatedProfile.location || prev.location,
        avatar: (updatedProfile.full_name || prev.name).charAt(0).toUpperCase()
      }));
      
      setIsEditing(false);
      console.log('Profile updated successfully');
      
    } catch (error) {
      console.error('Error updating profile:', error);
      // You could add error toast notification here
    } finally {
      setUpdating(false);
    }
  };

  // Filter reports based on active tab
  const getFilteredReports = () => {
    switch (activeReportTab) {
      case 'Resolved':
        return allReports.filter(report => report.originalStatus === 'verified');
      case 'In Progress':
        return allReports.filter(report => report.originalStatus === 'under_verification');
      case 'Pending':
        return allReports.filter(report => report.originalStatus === 'pending');
      case 'Rejected':
        return userRejectedReports; // Show reports rejected by the current user
      case 'All':
      default:
        return allReports; // Show all reports in All tab
    }
  };

  const filteredReports = getFilteredReports();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Administrator Profile</h2>
                <p className="text-blue-100">Manage your profile and track your activities</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar */}
          <div className="w-1/3 bg-gray-50 p-6 border-r overflow-y-auto">
            {/* Profile Info */}
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg">
                {userData.avatar}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{userData.name}</h3>
              <p className="text-blue-600 text-sm font-medium">{userData.role}</p>
              {!isEditing ? (
                <button 
                  onClick={handleEditToggle}
                  className="text-blue-600 text-sm hover:text-blue-700 mt-3 flex items-center mx-auto bg-blue-50 px-3 py-1 rounded-full transition-colors"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-2 mt-3">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={updating}
                    className="text-green-600 text-sm hover:text-green-700 flex items-center bg-green-50 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </button>
                  <button 
                    onClick={handleEditToggle}
                    disabled={updating}
                    className="text-gray-600 text-sm hover:text-gray-700 flex items-center bg-gray-50 px-3 py-1 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="bg-white p-2.5 rounded-lg border">
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                <div className="flex items-center text-gray-900">
                  <User className="w-4 h-4 mr-2 text-blue-500" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      className="font-medium text-sm bg-transparent border-none outline-none flex-1 focus:bg-gray-50 rounded px-1"
                      placeholder="Enter full name"
                    />
                  ) : (
                    <span className="font-medium text-sm">{userData.name}</span>
                  )}
                </div>
              </div>
              
              <div className="bg-white p-2.5 rounded-lg border">
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <div className="flex items-center text-gray-900">
                  <Mail className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="font-medium text-sm">{userData.email}</span>
                  {isEditing && <span className="text-xs text-gray-400 ml-2">(Read-only)</span>}
                </div>
              </div>
              
              <div className="bg-white p-2.5 rounded-lg border">
                <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                <div className="flex items-center text-gray-900">
                  <Phone className="w-4 h-4 mr-2 text-blue-500" />
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="font-medium text-sm bg-transparent border-none outline-none flex-1 focus:bg-gray-50 rounded px-1"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <span className="font-medium text-sm">{userData.phone || 'Not provided'}</span>
                  )}
                </div>
              </div>
              
              <div className="bg-white p-2.5 rounded-lg border">
                <label className="block text-xs font-medium text-gray-500 mb-1">Bio</label>
                <div className="flex items-start text-gray-900">
                  <User className="w-4 h-4 mr-2 text-blue-500 mt-0.5" />
                  {isEditing ? (
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      className="font-medium text-sm bg-transparent border-none outline-none flex-1 focus:bg-gray-50 rounded px-1 resize-none"
                      placeholder="Enter bio"
                      rows="2"
                    />
                  ) : (
                    <span className="font-medium text-sm">{userData.bio || 'No bio provided'}</span>
                  )}
                </div>
              </div>
              
              <div className="bg-white p-2.5 rounded-lg border">
                <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                <div className="flex items-center text-gray-900">
                  <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="font-medium text-sm bg-transparent border-none outline-none flex-1 focus:bg-gray-50 rounded px-1"
                      placeholder="Enter location"
                    />
                  ) : (
                    <span className="font-medium text-sm">{userData.location || 'Not provided'}</span>
                  )}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border">
                <label className="block text-xs font-medium text-gray-500 mb-1">Join Date</label>
                <div className="flex items-center text-gray-900">
                  <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="font-medium text-sm">{new Date(userData.joinDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border">
                <label className="block text-xs font-medium text-gray-500 mb-1">Last Login</label>
                <div className="flex items-center text-gray-900">
                  <Clock className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="font-medium text-sm">{new Date(userData.lastLogin).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Activity Snapshot */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-blue-600" />
                Activity Snapshot
              </h4>
              <div className="bg-white rounded-lg border p-4">
                {issuesLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-xs text-gray-500">Loading stats...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Award className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-lg font-bold text-gray-900">{userStats.resolved}</div>
                      <div className="text-xs text-gray-600">Resolved</div>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-lg font-bold text-gray-900">{userStats.inProgress}</div>
                      <div className="text-xs text-gray-600">In Progress</div>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="text-lg font-bold text-gray-900">{userStats.pending}</div>
                      <div className="text-xs text-gray-600">Pending</div>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <X className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="text-lg font-bold text-gray-900">{userStats.rejected}</div>
                      <div className="text-xs text-gray-600">Rejected</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50 min-h-0">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-900 text-left">Handled Issues Log</h3>
                  <p className="text-gray-600 text-left">Search and filter through all issues you've managed</p>
                </div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {issuesLoading ? 'Loading...' : `${filteredReports.length} Issues`}
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search by title or citizen name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex space-x-1 mb-6 bg-white p-1 rounded-lg shadow-sm border">
                {['All', 'Resolved', 'In Progress', 'Pending', 'Rejected'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveReportTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      tab === activeReportTab 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Issues List */}
            <div className="space-y-4">
              {issuesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading handled issues...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No {activeReportTab.toLowerCase()} issues found</p>
                  <p className="text-sm text-gray-500">
                    {activeReportTab === 'All' 
                      ? 'Issues you verify or handle will appear here' 
                      : `No ${activeReportTab.toLowerCase()} reports to display`}
                  </p>
                </div>
              ) : (
                filteredReports.map((issue) => (
                  <div key={issue.id} className="bg-white border rounded-lg p-5 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 text-lg">{issue.title}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        issue.status === 'Resolved' ? 'bg-green-100 text-green-800' : 
                        issue.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        issue.status === 'Pending' ? 'bg-orange-100 text-orange-800' : 
                        issue.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {issue.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-3 flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      Reported by: {issue.reportedBy}
                    </div>
                    
                    <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
                      {issue.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          issue.priority === 'High' ? 'bg-red-100 text-red-800' :
                          issue.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {issue.priority} Priority
                        </span>
                        <span className="text-xs text-gray-500">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
                        {issue.hazardType && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {issue.hazardType}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                          View Details
                        </button>
                        {/* Show reject button only if not already rejected by user and not in rejected tab */}
                        {activeReportTab !== 'Rejected' && !userRejectedReports.find(r => r.id === issue.id) && (
                          <button 
                            onClick={() => handleRejectReport(issue)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium bg-red-50 px-3 py-1 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Load More Button */}
              {!issuesLoading && filteredReports.length > 0 && filteredReports.length >= 10 && (
                <div className="text-center pt-4">
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Load More Issues
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
