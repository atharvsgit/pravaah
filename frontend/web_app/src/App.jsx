import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Report from './pages/Report';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import OfficialDashboard from './components/official/OfficialDashboard';
import AnalystDashboard from './components/analyst/AnalystDashboard';
import RoleBasedRoute from './components/shared/RoleBasedRoute';
import { getUserRole, getDashboardRoute, isTokenExpired } from './utils/auth';
import OfflineSync from './components/OfflineSync';
import './App.css';

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const checkAuthState = () => {
    console.log('🔐 App: Checking auth state...');
    const token = localStorage.getItem('authToken');
    const isValidToken = token && !isTokenExpired();
    console.log('🔐 App: Token exists =', !!token, 'Token valid =', isValidToken);
    
    setIsLoggedIn(isValidToken);
    
    // Clear invalid token
    if (token && !isValidToken) {
      console.log('🔐 App: Removing invalid token');
      localStorage.removeItem('authToken');
    }
    
    if (!authChecked) {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    console.log('🔐 App: Initial auth check');
    checkAuthState();
    
    // Listen for storage events from other tabs
    const onStorage = (e) => {
      if (e.key === 'authToken') {
        console.log('🔐 App: Storage event detected');
        checkAuthState();
      }
    };
    
    // Listen for custom auth events from same tab
    const onAuthTokenChanged = () => {
      console.log('🔐 App: Custom authTokenChanged event received');
      setTimeout(checkAuthState, 100); // Small delay to ensure token is stored
    };
    
    window.addEventListener('storage', onStorage);
    window.addEventListener('authTokenChanged', onAuthTokenChanged);
    
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('authTokenChanged', onAuthTokenChanged);
    };
  }, [authChecked]);

  if (!authChecked) return null;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Redirect root to appropriate dashboard based on role */}
          <Route 
            index 
            element={
              isLoggedIn ? 
                <Navigate to={getDashboardRoute()} replace /> : 
                <Navigate to="/auth" replace />
            } 
          />
          
          {/* Role-based dashboards */}
          <Route
            path="dashboard/citizen"
            element={
              <RoleBasedRoute allowedRoles={['citizen']}>
                <Home />
              </RoleBasedRoute>
            }
          />
          <Route 
            path="dashboard/official" 
            element={
              <RoleBasedRoute allowedRoles={['official']}>
                <OfficialDashboard />
              </RoleBasedRoute>
            } 
          />
          <Route 
            path="dashboard/analyst" 
            element={
              <RoleBasedRoute allowedRoles={['analyst']}>
                <AnalystDashboard />
              </RoleBasedRoute>
            } 
          />
          
          {/* Legacy home route - redirect to appropriate dashboard */}
          <Route 
            path="home" 
            element={
              isLoggedIn ? 
                <Navigate to={getDashboardRoute()} replace /> : 
                <Navigate to="/auth" replace />
            } 
          />
          
          {/* Citizen-only routes */}
          <Route 
            path="report" 
            element={
              <RoleBasedRoute allowedRoles={['citizen']}>
                <Report />
              </RoleBasedRoute>
            } 
          />
          <Route 
            path="community" 
            element={
              <RoleBasedRoute allowedRoles={['citizen']}>
                <Community />
              </RoleBasedRoute>
            } 
          />
          <Route 
            path="profile" 
            element={
              <RoleBasedRoute allowedRoles={['citizen']}>
                <Profile />
              </RoleBasedRoute>
            } 
          />
          
          {/* Auth route */}
          <Route 
            path="auth" 
            element={
              isLoggedIn ? 
                <Navigate to={getDashboardRoute()} replace /> : 
                <Auth />
            } 
          />
        </Route>
      </Routes>
      {/* Show offline sync status for logged-in users */}
      {isLoggedIn && <OfflineSync />}
    </Router>
  );
}

export default App;
