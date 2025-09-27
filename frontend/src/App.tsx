import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminProfileRequests from './pages/AdminProfileRequests';
import Dashboard from './pages/Dashboard';
import BookingForm from './pages/BookingForm';
import Management from './pages/Management';
import './App.css';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Component to redirect users to the dashboard
const AppRedirect: React.FC = () => {
  const { user } = useAuth();
  return <Navigate to="/admin/dashboard" replace />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/booking" element={<BookingForm />} />
                        <Route path="/booking/:id" element={<BookingForm />} />
                        <Route path="/management" element={<Management />} />
                        <Route path="/requests" element={<AdminProfileRequests />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Default Route - Redirect to admin dashboard */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppRedirect />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
