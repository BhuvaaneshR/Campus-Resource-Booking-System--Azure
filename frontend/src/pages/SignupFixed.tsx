import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { submitProfileRequest } from '../services/profileRequests';

const roles = [
  { value: 'Faculty', label: 'Faculty' },
  { value: 'Student Coordinator', label: 'Student Coordinator' },
];

const departments = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil'];

const clubs = [
  'Literary Club',
  'Cultural Club', 
  'Sports Club',
  'Technical Club',
  'Photography Club',
  'Drama Club',
  'Music Club',
  'Dance Club',
  'Debate Club',
  'Environmental Club',
  'Social Service Club',
  'Entrepreneurship Club'
];

const SignupFixed: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    department: '',
    role: 'Faculty' as 'Faculty' | 'Student Coordinator',
    mobile: '',
    facultyId: '',
    rollNumber: '',
    club: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Password validation rules
  const isLongEnough = form.password.length >= 8;
  const hasUpper = /[A-Z]/.test(form.password);
  const hasLower = /[a-z]/.test(form.password);
  const hasNumber = /\d/.test(form.password);
  const hasSymbol = /[^A-Za-z0-9]/.test(form.password);
  const passwordValid = isLongEnough && hasUpper && hasLower && hasNumber && hasSymbol;
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!passwordValid) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await submitProfileRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        department: form.department.trim() || undefined,
        role: form.role,
        mobile: form.mobile.trim() || undefined,
        facultyId: form.role === 'Faculty' ? form.facultyId.trim() || undefined : undefined,
        rollNumber: form.role === 'Student Coordinator' ? form.rollNumber.trim() || undefined : undefined,
        club: form.role === 'Student Coordinator' ? form.club.trim() || undefined : undefined,
        password: form.password,
      });
      setSuccess('Your request has been submitted successfully. The portal admin will review and approve it.');
      setForm({ name: '', email: '', department: '', role: 'Faculty', mobile: '', facultyId: '', rollNumber: '', club: '', password: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, backgroundColor: '#f5f5f5' }}>
      <Container maxWidth="md">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Profile Signup
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Fill in your details and click "Submit Request". The portal admin will verify and approve your profile.
          </Typography>

          {success && (<Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>)}
          {error && (<Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>)}

          <Box component="form" onSubmit={handleSubmit}
               sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField label="Full Name" name="name" value={form.name} onChange={handleChange} fullWidth required />
            <TextField label="College Email" name="email" type="email" value={form.email} onChange={handleChange} fullWidth required placeholder="example@rajalakshmi.edu.in" />

            <TextField select label="Department" name="department" value={form.department} onChange={handleChange} fullWidth>
              {departments.map((d) => (<MenuItem key={d} value={d}>{d}</MenuItem>))}
            </TextField>
            <TextField select label="Role" name="role" value={form.role} onChange={handleChange} fullWidth required>
              {roles.map((r) => (<MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>))}
            </TextField>

            <TextField label="Mobile Number" name="mobile" value={form.mobile} onChange={handleChange} fullWidth />

            {form.role === 'Faculty' && (
              <TextField label="Faculty ID" name="facultyId" value={form.facultyId} onChange={handleChange} fullWidth />
            )}
            {form.role === 'Student Coordinator' && (
              <>
                <TextField label="Roll Number" name="rollNumber" value={form.rollNumber} onChange={handleChange} fullWidth />
                <TextField select label="Club" name="club" value={form.club} onChange={handleChange} fullWidth>
                  {clubs.map((club) => (
                    <MenuItem key={club} value={club}>{club}</MenuItem>
                  ))}
                </TextField>
              </>
            )}

            <TextField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              required
              error={form.password.length > 0 && !passwordValid}
              helperText={form.password.length === 0 ? '' : (!passwordValid ? 'Min 8 chars, include uppercase, lowercase, number, and symbol.' : '')}
            />

            <TextField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              fullWidth
              required
              error={form.confirmPassword.length > 0 && !passwordsMatch}
              helperText={form.confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match.' : ''}
            />

            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <Button type="submit" variant="contained" size="large" disabled={loading || !passwordValid || !passwordsMatch} sx={{ mt: 1 }}>
                {loading ? <CircularProgress size={22} /> : 'Submit Request'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SignupFixed;
