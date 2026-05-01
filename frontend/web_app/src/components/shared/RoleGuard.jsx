import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserRole, getDashboardRoute } from '../../utils/auth';

const RoleGuard = ({ children, allowedRoles, redirectTo = null }) => {
  const userRole = getUserRole();
  const isLoggedIn = Boolean(localStorage.getItem('authToken'));

  // If not logged in, redirect to auth
  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }

  // If no role restrictions, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // Check if user's role is in allowed roles
  if (allowedRoles.includes(userRole)) {
    return children;
  }

  // User doesn't have permission, redirect to their dashboard or specified route
  const redirectRoute = redirectTo || getDashboardRoute();
  return <Navigate to={redirectRoute} replace />;
};

export default RoleGuard;
