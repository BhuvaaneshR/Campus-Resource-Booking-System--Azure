import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import FacultyLayout from './components/FacultyLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminProfileRequests from './pages/AdminProfileRequests';
import AdminBookingRequests from './pages/AdminBookingRequests';
import Dashboard from './pages/Dashboard';
import BookingForm from './pages/BookingForm';
import Management from './pages/Management';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import MyBookings from './pages/faculty/MyBookings';
import StudentManageRequests from './pages/student/ManageRequests';
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

// Component to redirect users based on their role
const AppRedirect: React.FC = () => {
  const { user } = useAuth();
  
  console.log('AppRedirect: Current user:', user ? { id: user.id, email: user.email, role: user.role } : null);
  
  if (!user) {
    console.log('AppRedirect: No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Route based on user role
  switch (user.role) {
    case 'Portal Admin':
      console.log('AppRedirect: Redirecting Portal Admin to /admin/dashboard');
      return <Navigate to="/admin/dashboard" replace />;
    case 'Faculty':
      console.log('AppRedirect: Redirecting Faculty to /faculty/dashboard');
      return <Navigate to="/faculty/dashboard" replace />;
    case 'Student Coordinator':
      console.log('AppRedirect: Redirecting Student Coordinator to /student/dashboard');
      return <Navigate to="/student/dashboard" replace />;
    default:
      console.log('AppRedirect: Unknown role, redirecting to login:', user.role);
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Routes>
              <Route path="/" element={<AppRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['Portal Admin']}>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/booking" element={<BookingForm />} />
                        <Route path="/booking/:id" element={<BookingForm />} />
                        <Route path="/management" element={<Management />} />
                        <Route path="/requests" element={<AdminProfileRequests />} />
                        <Route path="/booking-requests" element={<AdminBookingRequests />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Faculty Routes */}
              <Route
                path="/faculty/*"
                element={
                  <ProtectedRoute allowedRoles={['Faculty']}>
                    <FacultyLayout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/faculty/dashboard" replace />} />
                        <Route path="/dashboard" element={<FacultyDashboard />} />
                        <Route path="/booking" element={<BookingForm />} />
                        <Route path="/booking-request" element={<BookingForm />} />
                        <Route path="/my-bookings" element={<MyBookings />} />
                        <Route path="/booking/:id" element={<BookingForm />} />
                      </Routes>
                    </FacultyLayout>
                  </ProtectedRoute>
                }
              />

              {/* Student Coordinator Routes */}
              <Route
                path="/student/*"
                element={
                  <ProtectedRoute allowedRoles={['Student Coordinator']}>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
                        <Route path="/dashboard" element={<FacultyDashboard />} />
                        <Route path="/booking" element={<BookingForm />} />
                        <Route path="/manage-requests" element={<StudentManageRequests />} />
                        <Route path="/booking/:id" element={<BookingForm />} />
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
