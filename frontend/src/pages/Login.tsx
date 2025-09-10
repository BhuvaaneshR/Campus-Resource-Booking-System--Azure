import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Container,
  Paper,
} from '@mui/material';
import { School, Login as LoginIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setError(null);
      await login();
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            p: 4,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box textAlign="center" mb={4}>
            <School sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              Campus Resource Booking System
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Campus Access Portal
            </Typography>
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sign in with College Email
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Use your college Microsoft account (@rajalakshmi.edu.in) to access the system.
                Your access level will be determined by your assigned role.
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Roles:</strong> Portal Admin, Faculty, Student Coordinator<br/>
                  <strong>Domain:</strong> Only @rajalakshmi.edu.in emails allowed
                </Typography>
              </Alert>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleLogin}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #0078d4 30%, #106ebe 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #106ebe 30%, #005a9e 90%)',
                  },
                }}
              >
                {loading ? 'Signing in...' : 'Sign in with Microsoft'}
              </Button>
            </CardContent>
          </Card>

          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Secure access powered by Microsoft Entra ID
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
