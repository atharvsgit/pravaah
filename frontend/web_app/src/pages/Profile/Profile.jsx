import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Phone, TrendingUp, Activity, Camera, Edit3, Save, X, Loader2, AlertCircle } from 'lucide-react';
import { 
  getCurrentUserProfile, 
  updateUserProfile, 
  getUserStats, 
  getUserActivity, 
  getUserReports, 
  getUserBadges, 
  getUserRewards,
  uploadProfilePicture 
} from '../../services/userService';
import { getProfilePictureUrl, getPlaceholderImageUrl } from '../../utils/imageUtils';
import { getRelativeTime } from '../../utils/helpers';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  
  // Profile data state
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [reports, setReports] = useState([]);
  const [badges, setBadges] = useState([]);
  const [rewards, setRewards] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    location: '',
    phone: ''
  });
  
  // Error states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch profile data
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profileData, statsData, activityData] = await Promise.all([
        getCurrentUserProfile(),
        getUserStats(),
        getUserActivity(6)
      ]);
      
      setProfile(profileData);
      setStats(statsData);
      setActivity(activityData);
      
      // Initialize edit form with current data
      setEditForm({
        full_name: profileData.full_name || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        phone: profileData.phone || ''
      });
    } catch (err) {
      console.error('Failed to fetch profile data:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tab-specific data
  const fetchTabData = async (tab) => {
    try {
      switch (tab) {
        case 'Reports':
          setLoadingReports(true);
          const reportsData = await getUserReports(10);
          setReports(reportsData);
          break;
        case 'Badges':
          setLoadingBadges(true);
          const badgesData = await getUserBadges();
          setBadges(badgesData);
          break;
        case 'Rewards':
          setLoadingRewards(true);
          const rewardsData = await getUserRewards();
          setRewards(rewardsData);
          break;
      }
    } catch (err) {
      console.error(`Failed to fetch ${tab} data:`, err);
      setError(`Failed to load ${tab} data`);
    } finally {
      setLoadingReports(false);
      setLoadingBadges(false);
      setLoadingRewards(false);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      setLoadingProfile(true);
      setError('');
      setSuccess('');
      
      const updatedProfile = await updateUserProfile(editForm);
      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoadingProfile(true);
      const result = await uploadProfilePicture(file);
      setProfile(prev => ({ ...prev, profile_picture: result.profile_picture }));
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      setError('Failed to upload profile picture');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'Overview' && !(tab === 'Reports' && reports.length > 0) && 
        !(tab === 'Badges' && badges.length > 0) && !(tab === 'Rewards' && rewards.length > 0)) {
      fetchTabData(tab);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchProfileData();
  }, []);

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-sky-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <span className="text-green-800">{success}</span>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start space-x-6">
            <div className="relative">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                {/* Profile picture display removed as per request */}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  disabled={loadingProfile}
                />
              </label>
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <input
                      type="text"
                      value={editForm.bio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ocean Safety Enthusiast"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Mumbai, Maharashtra"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleProfileUpdate}
                      disabled={loadingProfile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 flex items-center"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-1 text-left">
                        {profile?.full_name || 'User'}
                      </h1>
                      <p className="text-lg text-gray-600 mb-3 text-left">
                        {profile?.bio || 'Ocean Safety Enthusiast'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </button>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-500 mb-6">
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {profile?.location || 'Location not set'}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Joined {profile?.created_at ? getRelativeTime(profile.created_at) : 'Recently'}
                    </span>
                  </div>
                </>
              )}
              {/* Statistics */}
              {!isEditing && (
                <div className="grid grid-cols-6 gap-8">
                  <div className="text-left">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {stats?.total_reports || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Reports</div>
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {stats?.verified_reports || 0}
                    </div>
                    <div className="text-sm text-gray-600">Verified</div>
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      {stats?.safety_rating ? stats.safety_rating.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-sm text-gray-600">Safety Rating</div>
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {stats?.community_helps || 0}
                    </div>
                    <div className="text-sm text-gray-600">Community Helps</div>
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-bold text-cyan-600 mb-1">
                      {stats?.forum_views ? (stats.forum_views / 1000).toFixed(1) + 'K' : '0'}
                    </div>
                    <div className="text-sm text-gray-600">Forum Views</div>
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-bold text-indigo-600 mb-1">
                      {stats?.badges_earned || 0}
                    </div>
                    <div className="text-sm text-gray-600">Badges Earned</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            {['Overview', 'Reports', 'Badges', 'Rewards'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-6 py-4 font-medium ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            {/* Three Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Safety Score */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <h3 className="text-lg font-semibold">Safety Score</h3>
                </div>
                <div className="mb-4">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {stats?.safety_rating ? stats.safety_rating.toFixed(1) : '0.0'}/5.0
                  </div>
                  <div className="text-sm text-gray-600 mb-3">Overall Safety Rating</div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full" 
                      style={{width: `${(stats?.safety_rating || 0) * 20}%`}}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Based on report accuracy, community help, and safety practices
                </p>
              </div>

              {/* Emergency Contacts */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <Phone className="w-5 h-5 text-red-600 mr-2" />
                  <h3 className="text-lg font-semibold">Emergency Contacts</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Coast Guard</span>
                    <span className="text-blue-600 font-medium">911</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Beach Patrol</span>
                    <span className="text-blue-600 font-medium">(555) 123-4567</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Personal Emergency</span>
                    <span className="text-blue-600 font-medium">(555) 987-6543</span>
                  </div>
                </div>
              </div>

              {/* This Month */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="text-lg font-semibold">This Month</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Reports Filed</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {stats?.monthly_reports || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Forum Posts</span>
                    <span className="text-2xl font-bold text-green-600">
                      {stats?.monthly_forum_posts || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Helps Given</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {stats?.monthly_helps || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Safety Points</span>
                    <span className="text-2xl font-bold text-orange-600">
                      +{stats?.monthly_points || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-6">
                <Activity className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold">Recent Activity</h3>
              </div>
              {loadingActivity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Loading activity...</span>
                </div>
              ) : activity.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activity.map((item, index) => (
                    <div key={item.id || index} className={`flex items-start space-x-3 p-4 rounded-lg ${
                      item.type === 'verified' ? 'bg-green-50' :
                      item.type === 'helped' ? 'bg-blue-50' :
                      item.type === 'submitted' ? 'bg-orange-50' :
                      item.type === 'earned' ? 'bg-purple-50' :
                      item.type === 'completed' ? 'bg-teal-50' :
                      'bg-gray-50'
                    }`}>
                      <div className={`w-3 h-3 rounded-full mt-2 ${
                        item.type === 'verified' ? 'bg-green-500' :
                        item.type === 'helped' ? 'bg-blue-500' :
                        item.type === 'submitted' ? 'bg-orange-500' :
                        item.type === 'earned' ? 'bg-purple-500' :
                        item.type === 'completed' ? 'bg-teal-500' :
                        'bg-gray-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium">{item.title}</p>
                        <p className="text-sm text-gray-500">{getRelativeTime(item.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recent activity to display</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Reports' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Reports</h3>
            {loadingReports ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-gray-600">Loading reports...</span>
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report, index) => (
                  <div key={report.id || index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{report.activity_type || 'Report'}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        report.status === 'verified' ? 'bg-green-100 text-green-800' :
                        report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {report.status || 'Unknown'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{report.description}</p>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{getRelativeTime(report.created_at)}</span>
                      {report.location && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No reports found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Badges' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Badges</h3>
            {loadingBadges ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-gray-600">Loading badges...</span>
              </div>
            ) : badges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge, index) => (
                  <div key={badge.id || index} className="border border-gray-200 rounded-lg p-4 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">{badge.icon || '🏆'}</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{badge.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{badge.description}</p>
                    <span className="text-xs text-gray-500">{getRelativeTime(badge.earned_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No badges earned yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Rewards' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Rewards</h3>
            {loadingRewards ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-gray-600">Loading rewards...</span>
              </div>
            ) : rewards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map((reward, index) => (
                  <div key={reward.id || index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{reward.name}</h4>
                      <span className="text-sm font-bold text-blue-600">{reward.points} pts</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{getRelativeTime(reward.earned_at)}</span>
                      {reward.redeemed && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Redeemed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No rewards earned yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
