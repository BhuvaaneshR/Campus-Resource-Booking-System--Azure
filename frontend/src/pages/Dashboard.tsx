import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  CalendarToday,
  Event,
  LocationOn,
  Edit,
  Delete,
} from '@mui/icons-material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';

const localizer = momentLocalizer(moment);

interface Booking {
  id: number;
  eventName: string;
  startDateTime: string;
  endDateTime: string;
  resourceName: string;
  resourceType: string;
  location: string;
  activityType: string;
  participantCount: number;
  inchargeName: string;
  inchargeEmail: string;
  status: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings');
      setBookings(response.data.data);
    } catch (error) {
      setError('Failed to fetch bookings');
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await api.delete(`/bookings/${id}`);
        setBookings(bookings.filter(booking => booking.id !== id));
      } catch (error) {
        setError('Failed to delete booking');
        console.error('Error deleting booking:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'success';
      case 'Pending': return 'warning';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  const calendarEvents = bookings.map(booking => ({
    id: booking.id,
    title: booking.eventName,
    start: new Date(booking.startDateTime),
    end: new Date(booking.endDateTime),
    resource: booking.resourceName,
  }));

  const upcomingBookings = bookings
    .filter(booking => new Date(booking.startDateTime) > new Date())
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Header with Book Resource Button */}
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" gutterBottom>
                    Admin Dashboard
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Manage campus resource bookings and view calendar
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Add />}
                  onClick={() => navigate('/booking')}
                  sx={{ minWidth: 200 }}
                >
                  Book a Resource
                </Button>
              </Box>
            </CardContent>
          </Card>

        {/* Calendar and Upcoming Bookings */}
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
                Booking Calendar
              </Typography>
              <Paper sx={{ height: 500, mt: 2 }}>
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  views={['month', 'week', 'day']}
                  defaultView="month"
                  popup
                  onSelectEvent={(event) => {
                    navigate(`/booking/${event.id}`);
                  }}
                />
              </Paper>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Event sx={{ mr: 1, verticalAlign: 'middle' }} />
                Upcoming Bookings
              </Typography>
              {upcomingBookings.length === 0 ? (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  No upcoming bookings
                </Typography>
              ) : (
                <List>
                  {upcomingBookings.map((booking) => (
                    <ListItem key={booking.id} divider>
                      <ListItemText
                        primary={booking.eventName}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                              {booking.resourceName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {moment(booking.startDateTime).format('MMM DD, YYYY h:mm A')}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Chip
                                label={booking.status}
                                size="small"
                                color={getStatusColor(booking.status) as any}
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => navigate(`/booking/${booking.id}`)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteBooking(booking.id)}
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Quick Stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Bookings
                  </Typography>
                  <Typography variant="h4">
                    {bookings.length}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Confirmed
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {bookings.filter(b => b.status === 'Confirmed').length}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Pending
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {bookings.filter(b => b.status === 'Pending').length}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    This Month
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {bookings.filter(b => 
                      moment(b.startDateTime).isSame(moment(), 'month')
                    ).length}
                  </Typography>
                </CardContent>
              </Card>
          </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
