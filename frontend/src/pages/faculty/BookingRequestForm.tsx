import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Send,
  LocationOn,
  AccessTime,
  Event,
  PriorityHigh,
  InfoOutlined,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Resource {
  id: string;
  name: string;
  location: string;
  capacity: number;
  type: string;
  description?: string;
}

interface BookingFormData {
  eventName: string;
  resourceId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  description: string;
  attendeeCount: number;
  contactPhone: string;
  isUrgent: boolean;
}

const BookingRequestForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const [formData, setFormData] = useState<BookingFormData>({
    eventName: '',
    resourceId: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    description: '',
    attendeeCount: 1,
    contactPhone: '',
    isUrgent: false,
  });

  // Check if user is Placement Executive
  const isPlacementExecutive = user?.role === 'Placement Executive';

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const response = await api.get('/api/resources');
      setResources(response.data.resources || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Failed to load resources. Please refresh the page.');
    }
  };

  const handleInputChange = (field: keyof BookingFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: field === 'attendeeCount' ? Number(value) : value
    }));

    // Update selected resource when resource changes
    if (field === 'resourceId') {
      const resource = resources.find(r => r.id === value);
      setSelectedResource(resource || null);
    }
  };

  const handleCheckboxChange = (field: keyof BookingFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.eventName.trim()) return 'Event name is required';
    if (!formData.resourceId) return 'Please select a resource';
    if (!formData.startDate) return 'Start date is required';
    if (!formData.endDate) return 'End date is required';
    if (!formData.startTime) return 'Start time is required';
    if (!formData.endTime) return 'End time is required';
    if (!formData.contactPhone.trim()) return 'Contact phone is required';
    
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      return 'End date cannot be before start date';
    }
    
    if (formData.startDate === formData.endDate && formData.startTime >= formData.endTime) {
      return 'End time must be after start time';
    }
    
    if (formData.attendeeCount < 1) return 'At least 1 attendee is required';
    
    if (selectedResource && formData.attendeeCount > selectedResource.capacity) {
      return `Attendee count exceeds resource capacity (${selectedResource.capacity})`;
    }

    return null;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      setLoading(true);
      setConfirmDialog(false);

      const endpoint = formData.isUrgent ? '/api/priority-booking' : '/api/requests';
      
      const requestData = {
        ...formData,
        requesterEmail: user?.email,
        requesterName: user?.name,
      };

      const response = await api.post(endpoint, requestData);

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/faculty/my-bookings');
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Failed to submit booking request');
      }
    } catch (err: any) {
      console.error('Error submitting booking request:', err);
      setError(err.response?.data?.message || 'Failed to submit booking request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (success) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Alert severity="success" sx={{ maxWidth: 600 }}>
          <Typography variant="h6">Booking Request Submitted Successfully!</Typography>
          <Typography>
            Your request has been submitted for approval. You will be redirected to your bookings page.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" mb={3}>
        New Booking Request
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Event Details Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Event sx={{ mr: 1 }} />
                Event Details
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Event Name"
              value={formData.eventName}
              onChange={handleInputChange('eventName')}
              required
              helperText="Provide a clear, descriptive name for your event"
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Event Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              helperText="Additional details about your event (optional)"
            />

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Expected Attendees"
                value={formData.attendeeCount}
                onChange={handleInputChange('attendeeCount')}
                required
                inputProps={{ min: 1 }}
                helperText={selectedResource ? `Resource capacity: ${selectedResource.capacity}` : ''}
              />

              <TextField
                fullWidth
                label="Contact Phone"
                value={formData.contactPhone}
                onChange={handleInputChange('contactPhone')}
                required
                helperText="Phone number for event coordination"
              />
            </Stack>

            {/* Resource Selection Section */}
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <LocationOn sx={{ mr: 1 }} />
                Resource Selection
              </Typography>
            </Box>

            <FormControl fullWidth required>
              <InputLabel>Select Resource</InputLabel>
              <Select
                value={formData.resourceId}
                onChange={handleInputChange('resourceId')}
                label="Select Resource"
              >
                {resources.map((resource) => (
                  <MenuItem key={resource.id} value={resource.id}>
                    {resource.name} - {resource.location} (Capacity: {resource.capacity})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedResource && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">{selectedResource.name}</Typography>
                  <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                    <Chip icon={<LocationOn />} label={selectedResource.location} />
                    <Chip label={`Capacity: ${selectedResource.capacity}`} />
                    <Chip label={selectedResource.type} color="primary" />
                  </Stack>
                  {selectedResource.description && (
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {selectedResource.description}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Schedule Section */}
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <AccessTime sx={{ mr: 1 }} />
                Schedule
              </Typography>
            </Box>

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={formData.startDate}
                onChange={handleInputChange('startDate')}
                required
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: getTomorrowDate() }}
              />

              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={formData.endDate}
                onChange={handleInputChange('endDate')}
                required
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: formData.startDate || getTomorrowDate() }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="time"
                label="Start Time"
                value={formData.startTime}
                onChange={handleInputChange('startTime')}
                required
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                type="time"
                label="End Time"
                value={formData.endTime}
                onChange={handleInputChange('endTime')}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            {/* Urgent Booking (Only for Placement Executives) */}
            {isPlacementExecutive && (
              <>
                <Divider sx={{ my: 2 }} />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isUrgent}
                      onChange={handleCheckboxChange('isUrgent')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      <PriorityHigh sx={{ mr: 1, color: 'error.main' }} />
                      <Typography>Mark as Urgent Booking</Typography>
                    </Box>
                  }
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Urgent bookings may override lower-priority events and receive immediate processing.
                </Typography>
              </>
            )}

            {/* Submit Button */}
            <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
              <Button
                variant="outlined"
                onClick={() => navigate('/faculty/dashboard')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Send />}
                disabled={loading}
                color={formData.isUrgent ? 'secondary' : 'primary'}
              >
                {formData.isUrgent ? 'Submit Urgent Request' : 'Submit Request'}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>
          {formData.isUrgent ? 'Confirm Urgent Booking Request' : 'Confirm Booking Request'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Please review your booking request:
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography><strong>Event:</strong> {formData.eventName}</Typography>
            <Typography><strong>Resource:</strong> {selectedResource?.name}</Typography>
            <Typography><strong>Date:</strong> {formData.startDate} to {formData.endDate}</Typography>
            <Typography><strong>Time:</strong> {formData.startTime} - {formData.endTime}</Typography>
            <Typography><strong>Attendees:</strong> {formData.attendeeCount}</Typography>
            {formData.isUrgent && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography color="warning.dark" sx={{ display: 'flex', alignItems: 'center' }}>
                  <PriorityHigh sx={{ mr: 1 }} />
                  This is marked as an urgent booking request.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmSubmit}
            variant="contained"
            color={formData.isUrgent ? 'secondary' : 'primary'}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Confirm & Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingRequestForm;
