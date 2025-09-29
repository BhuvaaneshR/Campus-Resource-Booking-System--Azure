import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Save, Cancel } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Resource {
  id: number;
  name: string;
  type: string;
  location: string;
  capacity: number;
}

interface Booking {
  id: number;
  eventName: string;
  resourceId: number;
  startDateTime: string;
  endDateTime: string;
  activityType: string;
  participantCount: number;
  inchargeName: string;
  inchargeEmail: string;
  status: string;
}

const BookingForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    eventName: '',
    resourceId: null as number | null,
    startDateTime: dayjs() as Dayjs | null,
    endDateTime: dayjs().add(1, 'hour') as Dayjs | null,
    activityType: '',
    participantCount: 1,
    inchargeName: '',
    inchargeEmail: '',
  });

  const fetchResources = async () => {
    try {
      const response = await api.get('/campus/resources');
      setResources(response.data.data);
    } catch (error) {
      setError('Failed to fetch resources');
      console.error('Error fetching resources:', error);
    }
  };

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/bookings/${id}`);
      const booking: Booking = response.data.data;
      
      setFormData({
        eventName: booking.eventName,
        resourceId: booking.resourceId,
        startDateTime: dayjs(booking.startDateTime),
        endDateTime: dayjs(booking.endDateTime),
        activityType: booking.activityType,
        participantCount: booking.participantCount,
        inchargeName: booking.inchargeName,
        inchargeEmail: booking.inchargeEmail,
      });
    } catch (error) {
      setError('Failed to fetch booking details');
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResources();
    if (isEdit) {
      fetchBooking();
    }
  }, [isEdit, fetchBooking]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.eventName.trim()) {
      setError('Event name is required');
      return false;
    }
    if (!formData.resourceId) {
      setError('Please select a resource');
      return false;
    }
    if (!formData.startDateTime) {
      setError('Start date and time is required');
      return false;
    }
    if (!formData.endDateTime) {
      setError('End date and time is required');
      return false;
    }
    if (formData.endDateTime.isBefore(formData.startDateTime)) {
      setError('End time must be after start time');
      return false;
    }
    if (!formData.inchargeName.trim()) {
      setError('Incharge name is required');
      return false;
    }
    if (!formData.inchargeEmail.trim()) {
      setError('Incharge email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.inchargeEmail)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const bookingData = {
        eventName: formData.eventName,
        resourceId: formData.resourceId,
        startDateTime: formData.startDateTime?.toISOString(),
        endDateTime: formData.endDateTime?.toISOString(),
        activityType: formData.activityType,
        participantCount: formData.participantCount,
        inchargeName: formData.inchargeName,
        inchargeEmail: formData.inchargeEmail,
      };

      if (isEdit) {
        await api.put(`/bookings/${id}`, bookingData);
        setSuccess('Booking updated successfully!');
      } else {
        // Map form data to your database schema
        const campusBookingData = {
          resourceId: formData.resourceId,
          requestedByName: formData.inchargeName,
          requestedByEmail: formData.inchargeEmail,
          eventTitle: formData.eventName,
          startTime: formData.startDateTime?.toISOString(),
          endTime: formData.endDateTime?.toISOString(),
          bookingCategory: formData.activityType || 'General',
          isPriority: false
        };
        await api.post('/campus/bookings', campusBookingData);
        setSuccess(user?.role === 'Faculty' ? 'Request submitted successfully! Awaiting admin approval.' : 'Booking created successfully!');
      }

      setTimeout(() => {
        if (user?.role === 'Portal Admin') {
          navigate('/admin/dashboard');
        } else if (user?.role === 'Faculty') {
          navigate('/faculty/dashboard');
        } else if (user?.role === 'Student Coordinator') {
          navigate('/student/dashboard');
        } else {
          navigate('/login');
        }
      }, 1500);

    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save booking');
      console.error('Error saving booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  if (loading && isEdit) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box maxWidth="800px" mx="auto">
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              {isEdit ? 'Edit Booking' : 'Book a Resource'}
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    fullWidth
                    label="Event Name"
                    value={formData.eventName}
                    onChange={(e) => handleInputChange('eventName', e.target.value)}
                    required
                  />
                  <Autocomplete
                    options={resources}
                    getOptionLabel={(option) => `${option.name} - ${option.location} (${option.capacity} people)`}
                    value={resources.find(r => r.id === formData.resourceId) || null}
                    onChange={(_, newValue) => handleInputChange('resourceId', newValue?.id || null)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Resource"
                        required
                        placeholder="Search and select a resource"
                      />
                    )}
                  />


                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <DateTimePicker
                    label="Start Date & Time"
                    value={formData.startDateTime}
                    onChange={(newValue) => handleInputChange('startDateTime', newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                      },
                    }}
                  />
                  <DateTimePicker
                    label="End Date & Time"
                    value={formData.endDateTime}
                    onChange={(newValue) => handleInputChange('endDateTime', newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <FormControl fullWidth>
                    <InputLabel>Activity Type</InputLabel>
                    <Select
                      value={formData.activityType}
                      onChange={(e) => handleInputChange('activityType', e.target.value)}
                      label="Activity Type"
                    >
                      <MenuItem value="Academic">Academic</MenuItem>
                      <MenuItem value="Placement">Placement</MenuItem>
                      <MenuItem value="Club Event">Club Event</MenuItem>
                      <MenuItem value="Meeting">Meeting</MenuItem>
                      <MenuItem value="Conference">Conference</MenuItem>
                      <MenuItem value="Workshop">Workshop</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Number of Participants"
                    type="number"
                    value={formData.participantCount}
                    onChange={(e) => handleInputChange('participantCount', parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    fullWidth
                    label="Incharge Name"
                    value={formData.inchargeName}
                    onChange={(e) => handleInputChange('inchargeName', e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Incharge Email"
                    type="email"
                    value={formData.inchargeEmail}
                    onChange={(e) => handleInputChange('inchargeEmail', e.target.value)}
                    required
                  />
                </Box>
                  <Box display="flex" gap={2} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      startIcon={<Cancel />}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                    >
                      {loading
                        ? 'Saving...'
                        : (isEdit
                            ? 'Update Booking'
                            : (user?.role === 'Faculty' ? 'Request Resource' : 'Create Booking'))}
                    </Button>
                  </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default BookingForm;
