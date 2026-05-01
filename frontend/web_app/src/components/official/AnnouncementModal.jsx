import React, { useState } from 'react';
import { MessageSquare, MapPin, Calendar, X } from 'lucide-react';

const AnnouncementModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    priority: 'Medium',
    description: '',
    locationName: '',
    pincode: '',
    scheduledDate: '',
    expiryDate: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Creating announcement:', formData);
    // Here you would make an API call to create the announcement
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-gray-100 p-2 rounded-lg mr-3">
              <MessageSquare className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Create Announcement</h2>
              <p className="text-sm text-gray-500">Broadcast important information to citizens</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <h3 className="font-medium text-gray-700 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Basic Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notice Title *</label>
              <input
                type="text"
                placeholder="e.g. Water Supply Disruption"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              placeholder="Provide detailed information about the announcement..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              required
            />
          </div>

          {/* Location Information */}
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <h3 className="font-medium text-gray-700 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Location Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location Name *</label>
              <input
                type="text"
                placeholder="e.g. Sector 21, Bangalore"
                value={formData.locationName}
                onChange={(e) => setFormData({...formData, locationName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
              <input
                type="text"
                placeholder="560021"
                value={formData.pincode}
                onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">6-digit Indian pincode</p>
            </div>
          </div>

          {/* Schedule Information */}
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <h3 className="font-medium text-gray-700 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Information (Optional)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date & Time</label>
              <input
                type="datetime-local"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">When this announcement applies</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date & Time</label>
              <input
                type="datetime-local"
                value={formData.expiryDate}
                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">When this announcement expires</p>
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Create Announcement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementModal;
