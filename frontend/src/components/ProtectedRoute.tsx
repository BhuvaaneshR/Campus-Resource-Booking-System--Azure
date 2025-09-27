import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Store the current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }

  // If user is not an admin, show access denied
  if (user?.role !== 'Portal Admin') {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        p={3}
      >
        <Typography variant="h4" color="error" gutterBottom align="center">
          Access Denied
        </Typography>
        <Typography variant="h6" align="center" gutterBottom>
          You don't have permission to access this portal.
        </Typography>
        <Typography variant="body1" color="textSecondary" align="center">
          Please contact the system administrator if you believe this is an error.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
