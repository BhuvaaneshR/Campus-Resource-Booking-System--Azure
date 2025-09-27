import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Refresh,
  Add,
  Edit,
  Delete,
  Visibility,
  FilterList,
  CalendarToday,
  LocationOn,
  AccessTime,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface MyBooking {
  id: string;
  eventName: string;
  resourceName: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: 'Pending Approval' | 'Confirmed' | 'Rejected' | 'Cancelled' | 'Cancelled - Overridden';
  requesterName: string;
  requesterEmail: string;
  contactPhone: string;
  attendeeCount: number;
  description?: string;
  isUrgent?: boolean;
  createdAt: string;
  approvedBy?: string;
  rejectionReason?: string;
}

const MyBookings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<MyBooking | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/bookings/my-requests');
      setBookings(response.data.bookings || []);
      
    } catch (err: any) {
      console.error('Error fetching my bookings:', err);
      setError('Failed to load your bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      setCancelling(true);
      const response = await api.delete(`/api/bookings/${selectedBooking.id}`);
      
      if (response.data.success) {
        await fetchMyBookings();
        setCancelDialog(false);
        setSelectedBooking(null);
      }
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      setError('Failed to cancel booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'success';
      case 'Pending Approval': return 'warning';
      case 'Rejected': return 'error';
      case 'Cancelled': return 'default';
      case 'Cancelled - Overridden': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confirmed': return '✓';
      case 'Pending Approval': return '⏳';
      case 'Rejected': return '✗';
      case 'Cancelled': return '🚫';
      case 'Cancelled - Overridden': return '⚠️';
      default: return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const canCancelBooking = (booking: MyBooking) => {
    return ['Pending Approval', 'Confirmed'].includes(booking.status) &&
           new Date(booking.startDate) > new Date();
  };

  const canEditBooking = (booking: MyBooking) => {
    return booking.status === 'Pending Approval' &&
           new Date(booking.startDate) > new Date();
  };

  // Filter bookings based on status filter
  const filteredBookings = bookings.filter(booking => {
    if (statusFilter === 'all') return true;
    return booking.status === statusFilter;
  });

  // Group bookings by status for summary
  const bookingSummary = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'Pending Approval').length,
    confirmed: bookings.filter(b => b.status === 'Confirmed').length,
    rejected: bookings.filter(b => b.status === 'Rejected').length,
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
          My Bookings
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/faculty/booking-request')}
          >
            New Request
          </Button>
          <IconButton onClick={fetchMyBookings} title="Refresh">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Stack direction="row" spacing={3} mb={4}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Requests
            </Typography>
            <Typography variant="h4">
              {bookingSummary.total}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="orange" gutterBottom>
              Pending
            </Typography>
            <Typography variant="h4" color="orange">
              {bookingSummary.pending}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="green" gutterBottom>
              Confirmed
            </Typography>
            <Typography variant="h4" color="green">
              {bookingSummary.confirmed}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="error" gutterBottom>
              Rejected
            </Typography>
            <Typography variant="h4" color="error">
              {bookingSummary.rejected}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Filter Controls */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <FilterList />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filter by Status"
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="Pending Approval">Pending Approval</MenuItem>
            <MenuItem value="Confirmed">Confirmed</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
            <MenuItem value="Cancelled - Overridden">Overridden</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredBookings.length} of {bookings.length} requests
        </Typography>
      </Box>

      {/* Bookings Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Event Name</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box py={4}>
                    <CalendarToday sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      {statusFilter === 'all' ? 'No booking requests found' : `No ${statusFilter.toLowerCase()} requests found`}
                    </Typography>
                    <Button 
                      variant="contained" 
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/faculty/booking-request')}
                    >
                      Create Your First Request
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredBookings.map((booking) => (
                <TableRow key={booking.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" fontWeight={booking.isUrgent ? 'bold' : 'normal'}>
                        {booking.eventName}
                        {booking.isUrgent && (
                          <Chip 
                            label="URGENT" 
                            size="small" 
                            color="secondary" 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      {booking.description && (
                        <Typography variant="body2" color="text.secondary">
                          {booking.description.substring(0, 50)}...
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{booking.resourceName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {booking.location}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(booking.startDate)}
                      {booking.startDate !== booking.endDate && (
                        <> - {formatDate(booking.endDate)}</>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<span>{getStatusIcon(booking.status)}</span>}
                      label={booking.status}
                      color={getStatusColor(booking.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(booking.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setDetailsDialog(true);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      
                      {canEditBooking(booking) && (
                        <Tooltip title="Edit Request">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/faculty/booking-request?edit=${booking.id}`)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {canCancelBooking(booking) && (
                        <Tooltip title="Cancel Request">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setCancelDialog(true);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Booking Details Dialog */}
      <Dialog
        open={detailsDialog}
        onClose={() => setDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Booking Details</DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6">{selectedBooking.eventName}</Typography>
                <Chip
                  label={selectedBooking.status}
                  color={getStatusColor(selectedBooking.status) as any}
                  sx={{ mt: 1 }}
                />
              </Box>
              <Stack direction="row" spacing={4}>
                <Box flex={1}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationOn sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">
                      {selectedBooking.resourceName} - {selectedBooking.location}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" mb={1}>
                    <CalendarToday sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">
                      {formatDate(selectedBooking.startDate)} - {formatDate(selectedBooking.endDate)}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <AccessTime sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">
                      {formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}
                    </Typography>
                  </Box>
                </Box>
                <Box flex={1}>
                  <Typography variant="body2"><strong>Attendees:</strong> {selectedBooking.attendeeCount}</Typography>
                  <Typography variant="body2"><strong>Contact:</strong> {selectedBooking.contactPhone}</Typography>
                  <Typography variant="body2"><strong>Requested:</strong> {formatDate(selectedBooking.createdAt)}</Typography>
                </Box>
              </Stack>
              {selectedBooking.description && (
                <Box>
                  <Typography variant="body2"><strong>Description:</strong></Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedBooking.description}
                  </Typography>
                </Box>
              )}
              {selectedBooking.rejectionReason && (
                <Alert severity="error">
                  <Typography variant="body2"><strong>Rejection Reason:</strong></Typography>
                  <Typography variant="body2">{selectedBooking.rejectionReason}</Typography>
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
        <DialogTitle>Cancel Booking Request</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this booking request?
          </Typography>
          {selectedBooking && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2"><strong>Event:</strong> {selectedBooking.eventName}</Typography>
              <Typography variant="body2"><strong>Date:</strong> {formatDate(selectedBooking.startDate)}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>Keep Request</Button>
          <Button
            onClick={handleCancelBooking}
            color="error"
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyBookings;
