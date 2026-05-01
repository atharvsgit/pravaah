import React from 'react';
import { Clock, X, FileText, Target, UserCheck } from 'lucide-react';

const TimelineModal = ({ report, onClose }) => {
  const timelineEvents = [
    {
      id: 1,
      title: 'Reported',
      description: 'Issue reported by citizen',
      timestamp: '9/25/2025 2:13:46 AM',
      updatedBy: 'System',
      icon: FileText,
      color: 'blue'
    },
    {
      id: 2,
      title: 'Auto-Routed',
      description: 'Auto-routed based on issue type: Waste Management',
      timestamp: '9/26/2025 10:08:57 AM',
      updatedBy: 'Auto-Routing System',
      icon: Target,
      color: 'purple'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Clock className="w-6 h-6 text-purple-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Status Timeline</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{report.title}</h3>
          <div className="flex items-center space-x-4">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              report.priority === 'Low' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {report.priority}
            </span>
            <span className="text-sm text-gray-600">Reported</span>
            <span className="text-sm text-blue-600">Auto-routed to Sanitation</span>
          </div>
        </div>

        <div className="space-y-4">
          {timelineEvents.map((event) => {
            const Icon = event.icon;
            return (
              <div key={event.id} className="flex items-start">
                <div className={`p-2 rounded-lg mr-4 ${
                  event.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    event.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    <span className="text-sm text-gray-500">{event.timestamp}</span>
                  </div>
                  <p className="text-gray-600 mt-1">{event.description}</p>
                  <p className="text-sm text-gray-500 mt-1">Updated by: {event.updatedBy}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-center">
            <Target className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-800 font-medium">Auto-Routing Details</span>
          </div>
          <p className="text-blue-700 mt-1">Auto-routed based on issue type: Waste Management</p>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center">
            <UserCheck className="w-4 h-4 mr-2" />
            Assign POC
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineModal;
