import React, { useEffect, useState } from 'react';
import { User, Shield, BarChart3, Eye, EyeOff, Mail, Lock, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import pravaahLogo from '../../assets/pravaah-logo.svg';
import { login, register } from '../../services/authService';
import ConnectionTest from '../../components/shared/ConnectionTest';

const Auth = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('signin');
  const [selectedUserType, setSelectedUserType] = useState('citizen');
  const [selectedSignInUserType, setSelectedSignInUserType] = useState('citizen');
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    phone: '',
    accessCode: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState('');
  const [showConnectionTest, setShowConnectionTest] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    }
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setTimeout(() => setValidationErrors({}), 3000);
      return;
    }

    setValidationErrors({});
    setLoginError('');
    try {
      console.log('🔐 Auth: Attempting login...');
      const res = await login({ email: formData.email, password: formData.password });
      console.log('🔐 Auth: Login response =', res);
      
      if (res?.access_token) {
        console.log('🔐 Auth: Storing token and dispatching events');
        localStorage.setItem('authToken', res.access_token);
        
        // Dispatch custom event for same-tab communication
        window.dispatchEvent(new CustomEvent('authTokenChanged'));
        
        // Also broadcast storage event for other tabs
        window.dispatchEvent(new StorageEvent('storage', { key: 'authToken', newValue: res.access_token }));
        
        console.log('🔐 Auth: Navigating to home...');
        navigate('/', { replace: true });
      } else {
        setLoginError('Incorrect email or password');
      }
    } catch (err) {
      if (err?.userMessage) {
        setLoginError(err.userMessage);
      } else if (err?.response?.status === 401) {
        setLoginError('Incorrect email or password');
      } else {
        setLoginError(err?.response?.data?.detail || 'Login failed');
      }
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    }
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setTimeout(() => setValidationErrors({}), 3000);
      return;
    }

    setValidationErrors({});
    setRegistrationError('');
    setRegistrationSuccess('');
    
    try {
      console.log('🔐 Auth: Attempting registration with data:', {
        email: formData.email,
        full_name: formData.username,
        phone: formData.phone,
        userType: selectedUserType,
      });
      
      // Call the register function and wait for it to complete.
      await register({
        email: formData.email,
        full_name: formData.username,
        phone: formData.phone,
        password: formData.password,
        userType: selectedUserType,
      });
      
      console.log('🔐 Auth: Registration successful, now logging in...');
      
      // Automatically log in the user after successful registration
      try {
        const loginRes = await login({ 
          email: formData.email, 
          password: formData.password 
        });
        
        console.log('🔐 Auth: Auto-login response =', loginRes);
        
        if (loginRes?.access_token) {
          console.log('🔐 Auth: Storing token and navigating to dashboard');
          localStorage.setItem('authToken', loginRes.access_token);
          
          // Dispatch custom event for same-tab communication
          window.dispatchEvent(new CustomEvent('authTokenChanged'));
          
          // Also broadcast storage event for other tabs
          window.dispatchEvent(new StorageEvent('storage', { 
            key: 'authToken', 
            newValue: loginRes.access_token 
          }));
          
          console.log('🔐 Auth: Navigating to home...');
          navigate('/', { replace: true });
        } else {
          // If auto-login fails, show success message and switch to sign-in
          setRegistrationSuccess('Registration successful! Please sign in.');
          setActiveTab('signin');
        }
      } catch (loginErr) {
        console.error('Auto-login error:', loginErr);
        // If auto-login fails, show success message and switch to sign-in
        setRegistrationSuccess('Registration successful! Please sign in.');
        setActiveTab('signin');
      }
      
      // Clear form data for security
      setFormData({ email: '', username: '', password: '', phone: '', accessCode: '' });

    } catch (err) {
      console.error('Registration error:', err);
      let errorMessage = 'Registration failed';
      
      // Use improved error message from API interceptor
      if (err?.userMessage) {
        errorMessage = err.userMessage;
      } else if (err?.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map(e => e.msg || e.message || e).join(', ');
        } else {
          errorMessage = 'Registration failed - please check your information';
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setRegistrationError(errorMessage);
    }
  };

  const userTypes = [
    { id: 'citizen', name: 'Citizen', icon: User, description: 'Report hazards and stay informed', color: 'blue' },
    { id: 'official', name: 'Official', icon: Shield, description: 'Manage safety reports and alerts', color: 'red' },
    { id: 'analyst', name: 'Analyst', icon: BarChart3, description: 'Analyze data and trends', color: 'purple' }
  ];

  const getColorClasses = (color, isSelected = false) => {
    const colorMap = {
      blue: { bg: isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200', icon: 'bg-blue-500', text: 'text-blue-600' },
      red: { bg: isSelected ? 'bg-red-50 border-red-500' : 'bg-white border-gray-200', icon: 'bg-red-500', text: 'text-red-600' },
      purple: { bg: isSelected ? 'bg-purple-50 border-purple-500' : 'bg-white border-gray-200', icon: 'bg-purple-500', text: 'text-purple-600' },
    };
    return colorMap[color];
  };

  return (
    <div className="h-[calc(100vh-4rem)] max-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-sky-50 to-blue-100 flex">
      {/* Left Side - Pravaah Info */}
      <div className="hidden lg:flex lg:w-1/2 p-8 flex-col justify-center">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 mr-3">
              <img src={pravaahLogo} alt="Pravaah Logo" className="w-full h-full" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 text-left">Pravaah</h1>
              <p className="text-blue-600 font-semibold text-left text-base">Pacific Coast Protection</p>
            </div>
          </div>

          {/* Main Heading */}
          <h2 className="text-3xl font-semibold text-gray-900 mb-6 text-left leading-tight">
            Protecting Our Oceans Together
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-lg mb-10 leading-relaxed text-left">
            Join our community-driven platform to report hazards, share safety 
            information, and help keep our coastal waters safe for everyone.
          </p>

          {/* User Type Cards - Horizontal Layout */}
          <div className="grid grid-cols-3 gap-3">
            {userTypes.map((type) => {
              const Icon = type.icon;
              const colors = getColorClasses(type.color);
              return (
                <div key={type.id} className="text-center bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl px-4 py-5 shadow-lg min-h-[170px] flex flex-col justify-center">
                  <div className={`w-12 h-12 ${colors.icon} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-base">{type.name}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed px-0.5">{type.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl p-4 max-h-[85vh]">
            {/* Welcome Header */}
            <div className="text-center mb-4">
              {activeTab === 'signin' ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome Back</h2>
                  <p className="text-gray-600">Sign in to your account</p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome</h2>
                  <p className="text-gray-600">Create a new account</p>
                </>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
              <button
                onClick={() => {
                  setActiveTab('signin');
                  setFormData({ email: '', username: '', password: '', phone: '', accessCode: '' });
                  setValidationErrors({});
                  setLoginError('');
                  setRegistrationError('');
                  setRegistrationSuccess('');
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'signin'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setActiveTab('signup');
                  setFormData({ email: '', username: '', password: '', phone: '', accessCode: '' });
                  setValidationErrors({});
                  setLoginError('');
                  setRegistrationError('');
                  setRegistrationSuccess('');
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'signup'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign Up
              </button>
            </div>
            {/* Sign In Form */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                {loginError && (
                  <div className="text-red-600 text-sm font-medium text-center">{loginError}</div>
                )}
              {registrationSuccess && (
                  <div className="text-green-600 text-sm font-medium text-center bg-green-50 p-3 rounded-lg border border-green-200">{registrationSuccess}</div>
                )}
                
                {/* User Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    I am a:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {userTypes.map((type) => {
                      const Icon = type.icon;
                      const colors = getColorClasses(type.color, selectedSignInUserType === type.id);
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedSignInUserType(type.id)}
                          className={`p-2 border-2 rounded-lg transition-all hover:shadow-md ${colors.bg}`}
                        >
                          <div className={`w-6 h-6 ${colors.icon} rounded-lg flex items-center justify-center mx-auto mb-1`}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <p className="text-xs font-medium text-gray-900">{type.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                        validationErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.email && (
                      <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                        {validationErrors.email}
                      </div>
                    )}
                  </div>
                </div>
                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                        validationErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {validationErrors.password && (
                      <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                        {validationErrors.password}
                      </div>
                    )}
                  </div>
                </div>

                {/* Access Code Field - Only for Officials and Analysts */}
                {(selectedSignInUserType === 'official' || selectedSignInUserType === 'analyst') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                      Access Code
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type={showAccessCode ? 'text' : 'password'}
                        name="accessCode"
                        value={formData.accessCode}
                        onChange={handleInputChange}
                        placeholder={selectedSignInUserType === 'official' ? '••••••••' : '••••••••'}
                        className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                          validationErrors.accessCode ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccessCode(!showAccessCode)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showAccessCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {validationErrors.accessCode && (
                        <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                          {validationErrors.accessCode}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sign In Button */}
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Sign In to Pravaah
                </button>
              </form>
            )}

            {/* Sign Up Form */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3">
                {registrationError && (
                  <div className="text-red-600 text-sm font-medium text-center bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="flex items-center justify-center space-x-2">
                      <span>{registrationError}</span>
                      {registrationError.includes('connect') && (
                        <button
                          onClick={() => setShowConnectionTest(true)}
                          className="ml-2 text-blue-600 hover:text-blue-800 underline flex items-center"
                        >
                          <Wifi className="w-4 h-4 mr-1" />
                          Test Connection
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    I am a:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {userTypes.map((type) => {
                      const Icon = type.icon;
                      const colors = getColorClasses(type.color, selectedUserType === type.id);
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedUserType(type.id)}
                          className={`p-2 border-2 rounded-lg transition-all hover:shadow-md ${colors.bg}`}
                        >
                          <div className={`w-6 h-6 ${colors.icon} rounded-lg flex items-center justify-center mx-auto mb-1`}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <p className="text-xs font-medium text-gray-900">{type.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                        validationErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.email && (
                      <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                        {validationErrors.email}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="oceankeeper123"
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                        validationErrors.username ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.username && (
                      <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                        {validationErrors.username}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 98765 43210"
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                        validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.phone && (
                      <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                        {validationErrors.phone}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
                        validationErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {validationErrors.password && (
                      <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                        {validationErrors.password}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create Pravaah Account
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      
      {/* Connection Test Modal */}
      {showConnectionTest && (
        <ConnectionTest onClose={() => setShowConnectionTest(false)} />
      )}
    </div>
  );
};

export default Auth;

