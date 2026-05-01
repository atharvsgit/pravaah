import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserRole, hasAnyRole } from '../../utils/auth';

const RoleBasedRoute = ({ children, allowedRoles, fallbackRoute = '/auth' }) => {
  const userRole = getUserRole();
  
  // If no user role (not logged in), redirect to auth
  if (!userRole) {
    return <Navigate to={fallbackRoute} replace />;
  }
  
  // If user doesn't have required role, redirect to their appropriate dashboard
  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    const dashboardRoutes = {
      citizen: '/dashboard/citizen',
      official: '/dashboard/official',
      analyst: '/dashboard/analyst'
    };
    
    const userDashboard = dashboardRoutes[userRole] || '/dashboard/citizen';
    return <Navigate to={userDashboard} replace />;
  }
  
  return children;
};

export default RoleBasedRoute;
