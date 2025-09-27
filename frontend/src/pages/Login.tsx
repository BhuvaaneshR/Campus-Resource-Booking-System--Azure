import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Container,
  Paper,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { School, Login as LoginIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface LoginState {
  email: string;
  password: string;
  showPassword: boolean;
}

const Login: React.FC = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<LoginState>({
    email: 'admin@rajalakshmi.edu.in', // Pre-fill with admin email for convenience
    password: '',
    showPassword: false,
  });

  const handleChange = (prop: keyof LoginState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [prop]: event.target.value });
  };

  const handleClickShowPassword = () => {
    setValues({
      ...values,
      showPassword: !values.showPassword,
    });
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await login({
        email: values.email.trim(),
        password: values.password,
      });
      
      // Redirect to the intended page or default to admin dashboard
      const from = location.state?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
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
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  margin="normal"
                  id="email"
                  label="Email Address"
                  type="email"
                  variant="outlined"
                  value={values.email}
                  onChange={handleChange('email')}
                  required
                  placeholder="admin@rajalakshmi.edu.in"
                  disabled={loading}
                  sx={{ mb: 2 }}
                />
                
                <FormControl fullWidth variant="outlined" margin="normal">
                  <InputLabel htmlFor="password">Password</InputLabel>
                  <OutlinedInput
                    id="password"
                    type={values.showPassword ? 'text' : 'password'}
                    value={values.password}
                    onChange={handleChange('password')}
                    required
                    disabled={loading}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {values.showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    }
                    label="Password"
                  />
                </FormControl>

                {error && (
                  <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                  sx={{
                    mt: 3,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #1976d2 30%, #0d5ba3 90%)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #0d5ba3 30%, #0a4a8a 90%)',
                    },
                  }}
                >
                  Sign In
                </Button>
              </form>
              
              <Box mt={2} textAlign="center">
                <Typography variant="body2">
                  Don't have an account?{' '} 
                  <Link to="/signup">Submit a profile request</Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/**
           * <Box textAlign="center">
           *   <Typography variant="body2" color="text.secondary">
           *     Secure access powered by Microsoft Entra ID
           *   </Typography>
           * </Box>
           */}
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
