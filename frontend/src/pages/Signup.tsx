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

const Signup: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    department: '',
    role: 'Faculty' as 'Faculty' | 'Student Coordinator',
    mobile: '',
    facultyId: '',
    rollNumber: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
        password: form.password,
      });
      setSuccess('Your request has been submitted successfully. The portal admin will review and approve it.');
      setForm({ name: '', email: '', department: '', role: 'Faculty', mobile: '', facultyId: '', rollNumber: '', password: '' });
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

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}
               sx={{
                 display: 'grid',
                 gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                 gap: 2,
               }}
          >
            <TextField label="Full Name" name="name" value={form.name} onChange={handleChange} fullWidth required />
            <TextField label="College Email" name="email" type="email" value={form.email} onChange={handleChange} fullWidth required placeholder="example@rajalakshmi.edu.in" />

            <TextField label="Department" name="department" value={form.department} onChange={handleChange} fullWidth />
            <TextField select label="Role" name="role" value={form.role} onChange={handleChange} fullWidth required>
              {roles.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>

            <TextField label="Mobile Number" name="mobile" value={form.mobile} onChange={handleChange} fullWidth />

            {form.role === 'Faculty' && (
              <TextField label="Faculty ID" name="facultyId" value={form.facultyId} onChange={handleChange} fullWidth />
            )}

            {form.role === 'Student Coordinator' && (
              <TextField label="Roll Number" name="rollNumber" value={form.rollNumber} onChange={handleChange} fullWidth />
            )}

            <TextField label="Password" name="password" type="password" value={form.password} onChange={handleChange} fullWidth required />

            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
                {loading ? <CircularProgress size={22} /> : 'Submit Request'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Signup;
