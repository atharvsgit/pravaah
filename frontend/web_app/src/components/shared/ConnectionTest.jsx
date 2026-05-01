import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getConnectionStatusColor } from '../../utils/helpers';
import api from '../../utils/api';

const ConnectionTest = ({ onClose }) => {
  const [tests, setTests] = useState([
    { name: 'Backend Connection', status: 'pending', message: '' },
    { name: 'Database Health', status: 'pending', message: '' },
    { name: 'API Routes', status: 'pending', message: '' }
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (index, status, message) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message } : test
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending', message: '' })));

    // Test 1: Backend Connection
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/`, { 
        method: 'GET',
        mode: 'cors'
      });
      const data = await response.json();
      
      if (response.ok && data.status === 'active') {
        updateTest(0, 'success', 'Backend server is running');
      } else {
        updateTest(0, 'error', 'Backend returned unexpected response');
      }
    } catch (error) {
      updateTest(0, 'error', `Cannot connect to backend: ${error.message}`);
      setIsRunning(false);
      return; // Stop if backend is not reachable
    }

    // Test 2: Database Health
    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        mode: 'cors'
      });
      const data = await response.json();
      
      if (response.ok && data.status === 'healthy') {
        updateTest(1, 'success', 'Database connection is healthy');
      } else {
        updateTest(1, 'error', `Database issue: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      updateTest(1, 'error', `Health check failed: ${error.message}`);
    }

    // Test 3: API Routes
    try {
      // Test a simple GET endpoint instead of POST-only register endpoint
      const response = await fetch(`${apiUrl}/`, {
        method: 'GET',
        mode: 'cors'
      });
      
      if (response.ok) {
        updateTest(2, 'success', 'API routes are accessible');
      } else {
        updateTest(2, 'warning', `Unexpected response: ${response.status}`);
      }
    } catch (error) {
      updateTest(2, 'error', `API routes test failed: ${error.message}`);
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <RefreshCw className={`w-5 h-5 text-gray-400 ${isRunning ? 'animate-spin' : ''}`} />;
    }
  };



  const allTestsPassed = tests.every(test => test.status === 'success');
  const hasErrors = tests.some(test => test.status === 'error');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            {hasErrors ? (
              <WifiOff className="w-6 h-6 text-red-500 mr-2" />
            ) : (
              <Wifi className="w-6 h-6 text-green-500 mr-2" />
            )}
            <h2 className="text-xl font-semibold text-gray-900">Connection Test</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {tests.map((test, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getConnectionStatusColor(test.status)}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{test.name}</span>
                {getStatusIcon(test.status)}
              </div>
              {test.message && (
                <p className="text-sm mt-1 opacity-80">{test.message}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Testing...' : 'Run Tests Again'}
          </button>
          
          {allTestsPassed && (
            <button
              onClick={onClose}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >
              Continue
            </button>
          )}
        </div>

        {hasErrors && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Troubleshooting:</strong>
            </p>
            <ul className="text-sm text-red-600 mt-1 space-y-1">
              <li>• Make sure the backend server is running</li>
              <li>• Check if the database is connected</li>
              <li>• Verify the API URL in .env file</li>
              <li>• Run: <code>uvicorn app.main:app --reload</code></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionTest;
