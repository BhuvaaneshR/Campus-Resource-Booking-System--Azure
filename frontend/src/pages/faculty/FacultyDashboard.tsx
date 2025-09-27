import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Typography,
  Box,
  Stack,
  Card,
  CardContent,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import {
  CalendarToday,
  LocationOn,
  AccessTime,
  Person,
  FilterList,
  Refresh,
  ViewWeek,
  ViewDay,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface Booking {
  id: string;
  eventName: string;
  resourceName: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: 'Confirmed' | 'Pending Approval' | 'Rejected';
  requesterName: string;
  requesterEmail: string;
}

interface Resource {
  id: string;
  name: string;
  location: string;
  capacity: number;
  type: string;
}

const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'week' | 'day'>('week');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    fetchDashboardData();
  }, [searchQuery]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all confirmed bookings for calendar view
      const bookingsResponse = await api.get('/api/bookings');
      
      // Fetch available resources
      const resourcesResponse = await api.get('/api/resources');
      
      setBookings(bookingsResponse.data.bookings || []);
      setResources(resourcesResponse.data.resources || []);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter bookings based on search query and selected resource
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !searchQuery || 
      booking.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.resourceName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesResource = selectedResource === 'all' || booking.resourceName === selectedResource;
    
    return matchesSearch && matchesResource && booking.status === 'Confirmed';
  });

  // Get today's bookings
  const today = new Date().toISOString().split('T')[0];
  const todaysBookings = filteredBookings.filter(booking => 
    booking.startDate === today
  );

  // Get this week's bookings
  const currentWeekStart = new Date();
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

  const thisWeeksBookings = filteredBookings.filter(booking => {
    const bookingDate = new Date(booking.startDate);
    return bookingDate >= currentWeekStart && bookingDate <= currentWeekEnd;
  });

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'success';
      case 'Pending Approval': return 'warning';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Faculty Dashboard
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>View</InputLabel>
            <Select
              value={viewType}
              onChange={(e) => setViewType(e.target.value as 'week' | 'day')}
              label="View"
            >
              <MenuItem value="day">
                <ViewDay sx={{ mr: 1 }} />
                Today
              </MenuItem>
              <MenuItem value="week">
                <ViewWeek sx={{ mr: 1 }} />
                This Week
              </MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Resource</InputLabel>
            <Select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              label="Filter by Resource"
            >
              <MenuItem value="all">All Resources</MenuItem>
              {resources.map((resource) => (
                <MenuItem key={resource.id} value={resource.name}>
                  {resource.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <IconButton onClick={fetchDashboardData} title="Refresh">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {searchQuery && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Showing results for: "{searchQuery}"
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button onClick={fetchDashboardData} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Quick Stats */}
      <Stack direction="row" spacing={3} mb={4}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" color="primary">
              {viewType === 'day' ? 'Today' : 'This Week'}
            </Typography>
            <Typography variant="h3">
              {viewType === 'day' ? todaysBookings.length : thisWeeksBookings.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Confirmed Bookings
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" color="primary">
              Available Resources
            </Typography>
            <Typography variant="h3">
              {resources.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Campus Resources
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Calendar View */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">
            Campus Resource Calendar - {viewType === 'day' ? 'Today' : 'This Week'}
          </Typography>
          <Chip 
            icon={<CalendarToday />} 
            label={`${viewType === 'day' ? todaysBookings.length : thisWeeksBookings.length} events`} 
            color="primary" 
          />
        </Box>

        {(viewType === 'day' ? todaysBookings : thisWeeksBookings).length === 0 ? (
          <Box textAlign="center" py={4}>
            <CalendarToday sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No confirmed bookings {viewType === 'day' ? 'today' : 'this week'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'Try adjusting your search criteria.' : 'All resources are available for booking.'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {(viewType === 'day' ? todaysBookings : thisWeeksBookings).map((booking) => (
              <Card variant="outlined" key={booking.id}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="div" noWrap>
                      {booking.eventName}
                    </Typography>
                    <Chip 
                      label={booking.status} 
                      color={getStatusColor(booking.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationOn sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {booking.resourceName} - {booking.location}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" mb={1}>
                    <AccessTime sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center">
                    <Person sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {booking.requesterName}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default FacultyDashboard;
