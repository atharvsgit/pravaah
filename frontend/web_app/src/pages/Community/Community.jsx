import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, TrendingUp, AlertTriangle, MapPin, Clock, Eye, Users } from 'lucide-react';

const Community = () => {
  const [activeTab, setActiveTab] = useState('Recent');
  const [searchQuery, setSearchQuery] = useState('');

  const forumPosts = [
    {
      id: 1,
      author: 'Sarah Bhatt',
      badge: 'Local Surfer',
      location: 'Sunset Beach',
      time: '2 hours ago',
      title: 'Strong Rip Currents at Sunset Beach - Safety Tips Needed',
      content: 'Has anyone noticed the increased rip current activity at Sunset Beach this week? I was out surfing yesterday and the currents were much stronger than usual. Looking for local insights and safety recommendations.',
      tags: ['#rip-currents', '#surfing', '#safety'],
      upvotes: 12,
      comments: 8,
      shares: 0,
      views: 156,
      category: 'Safety Alerts',
      isAlert: true,
      avatar: 'SC'
    },
    {
      id: 2,
      author: 'Mohit Singh',
      badge: 'Dive Master',
      location: 'Odisha Coast',
      time: '4 hours ago',
      title: 'Best Diving Spots This Weekend?',
      content: 'Planning a diving trip this weekend. Weather looks good but want to check with the community about current conditions and visibility.',
      tags: ['#diving', '#weekend', '#conditions'],
      upvotes: 7,
      comments: 15,
      shares: 0,
      views: 203,
      category: 'Diving',
      avatar: 'MR'
    },
    {
      id: 3,
      author: 'Ocean Watch Team',
      badge: 'Marine Safety',
      location: 'North Bay',
      time: '6 hours ago',
      title: 'Jellyfish Bloom Alert - North Bay Area',
      content: 'Large jellyfish bloom spotted in North Bay. Multiple stings reported. Swimmers and surfers should exercise extreme caution.',
      tags: ['#jellyfish', '#hazard', '#swimming'],
      upvotes: 24,
      comments: 12,
      shares: 0,
      views: 487,
      category: 'Hazard Alerts',
      isAlert: true,
      isOfficial: true,
      avatar: 'OWT'
    }
  ];

  const categories = [
    { name: 'Diving', count: 21, color: 'text-blue-600' },
    { name: 'Swimming', count: 18, color: 'text-green-600' },
    { name: 'Community', count: 45, color: 'text-purple-600' }
  ];

  const trendingTopics = [
    { name: 'Rip Current Safety', change: '+25%', color: 'text-green-500' },
    { name: 'Weather Patterns', change: '+18%', color: 'text-green-500' },
    { name: 'Marine Life Alerts', change: '+45%', color: 'text-green-500' },
    { name: 'Beach Conditions', change: '+12%', color: 'text-green-500' }
  ];

  const communityStats = {
    activeMembers: 2847,
    totalPosts: 1234,
    safetyReports: 89,
    thisWeekPosts: 127
  };

  const filteredPosts = forumPosts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-sky-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-1 text-left">Community Forum</h1>
            <p className="text-gray-600 text-left">Connect, share experiences, and stay safe together</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">
            + New Post
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Community Stats */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center mb-4">
                <Users className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Community Stats</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-left">
                  <span className="text-gray-600 text-sm">Active Members</span>
                  <span className="font-semibold text-blue-600">{communityStats.activeMembers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-left">
                  <span className="text-gray-600 text-sm">Total Posts</span>
                  <span className="font-semibold">{communityStats.totalPosts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-left">
                  <span className="text-gray-600 text-sm">Safety Reports</span>
                  <span className="font-semibold text-red-600">{communityStats.safetyReports}</span>
                </div>
                <div className="flex justify-between items-center text-left">
                  <span className="text-gray-600 text-sm">This Week</span>
                  <span className="font-semibold text-green-600">+{communityStats.thisWeekPosts} posts</span>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                <button className="w-full flex justify-between items-center p-2 rounded-md bg-blue-50 text-blue-700 font-medium text-left">
                  <span>All Categories</span>
                </button>
                {categories.map((category, index) => (
                  <button key={index} className="w-full flex justify-between items-center p-2 rounded-md hover:bg-gray-50 text-gray-700 text-left">
                    <span>{category.name}</span>
                    <span className={`text-sm font-medium ${category.color}`}>{category.count}</span>
                  </button>
                ))}
                <button className="w-full flex justify-between items-center p-2 rounded-md hover:bg-gray-50 text-gray-700 text-left">
                  <span>Safety Alerts</span>
                  <span className="text-sm font-medium text-red-600">12</span>
                </button>
                <button className="w-full flex justify-between items-center p-2 rounded-md hover:bg-gray-50 text-gray-700 text-left">
                  <span>Hazard Alerts</span>
                  <span className="text-sm font-medium text-orange-600">8</span>
                </button>
                <button className="w-full flex justify-between items-center p-2 rounded-md hover:bg-gray-50 text-gray-700 text-left">
                  <span>Surfing</span>
                  <span className="text-sm font-medium text-teal-600">34</span>
                </button>
              </div>
            </div>

            {/* Trending Topics */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Trending Topics</h3>
              </div>
              <div className="space-y-3">
                {trendingTopics.map((topic, index) => (
                  <div key={index} className="text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 font-medium">{topic.name}</span>
                      <span className={`text-xs font-medium ${topic.color}`}>{topic.change}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {index === 0 && '15 posts'}
                      {index === 1 && '23 posts'}
                      {index === 2 && '12 posts'}
                      {index === 3 && '31 posts'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Tabs */}
            <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className="text-gray-400 mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search discussions, hazards, locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 py-2 focus:outline-none text-gray-700"
                  />
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {['Recent', 'Popular', 'Hazards'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 font-medium text-sm rounded-md transition-all ${
                        activeTab === tab
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>


            {/* Forum Posts */}
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                let cardBgClass = 'bg-white';
                let borderClass = '';
                
                if (post.author === 'Sarah Bhatt' && post.isAlert) {
                  cardBgClass = 'bg-red-50 bg-opacity-85';
                  borderClass = 'border-l-4 border-red-500';
                } else if (post.author === 'Ocean Watch Team' && post.isAlert) {
                  cardBgClass = 'bg-orange-50 bg-opacity-85';
                  borderClass = 'border-l-4 border-orange-500';
                } else if (post.isAlert) {
                  borderClass = 'border-l-4 border-red-500';
                }
                
                return (
                <div key={post.id} className={`${cardBgClass} rounded-lg shadow-sm p-6 ${borderClass}`}>
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-3">
                        {post.avatar}
                      </div>
                      <div>
                        <div className="flex items-center text-left">
                          <h3 className="font-semibold text-gray-900">{post.author}</h3>
                          {post.isOfficial && (
                            <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Official</span>
                          )}
                          <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{post.badge}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mt-1 text-left">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{post.time}</span>
                          <MapPin className="w-4 h-4 ml-3 mr-1" />
                          <span>{post.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {post.author === 'Ocean Watch Team' && post.isAlert ? (
                        <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium mr-2">
                          Hazard Alerts
                        </div>
                      ) : post.isAlert ? (
                        <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium mr-2">
                          {post.category}
                        </div>
                      ) : (
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-2">
                          {post.category}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <h2 className="text-lg font-semibold text-gray-900 mb-2 text-left">{post.title}</h2>
                  <p className="text-gray-700 mb-4 text-left">{post.content}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4 text-left">
                    {post.tags.map((tag, index) => (
                      <span key={index} className="text-blue-600 text-sm hover:underline cursor-pointer bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Post Actions */}
                  <div className="flex items-center justify-between text-gray-500">
                    <div className="flex items-center space-x-6">
                      <button className="flex items-center space-x-2 hover:text-blue-600">
                        <Heart className="w-5 h-5" />
                        <span>{post.upvotes}</span>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-blue-600">
                        <MessageCircle className="w-5 h-5" />
                        <span>{post.comments}</span>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-blue-600">
                        <Share2 className="w-5 h-5" />
                        <span>Share</span>
                      </button>
                    </div>
                    <div className="flex items-center text-sm">
                      <Eye className="w-4 h-4 mr-1" />
                      <span>{post.views} views</span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
