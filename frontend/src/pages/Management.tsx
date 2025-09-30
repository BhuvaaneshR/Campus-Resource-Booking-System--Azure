import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
} from '@mui/material';
import {
  Search,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Add,
  LocationOn,
  People,
  Event,
} from '@mui/icons-material';
import moment from 'moment';
import api from '../services/api';

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
  createdAt: string;
  updatedAt: string;
}

const Management: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activityFilter, setActivityFilter] = useState('All');
  
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; booking: Booking | null }>({
    open: false,
    booking: null,
  });
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [statusDialog, setStatusDialog] = useState<{ open: boolean; booking: Booking | null; action: 'Confirm' | 'Denied' | null; reason: string }>({
    open: false,
    booking: null,
    action: null,
    reason: '',
  });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/campus/bookings');
      setBookings(response.data.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = useCallback(() => {
    let filtered = [...bookings];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.eventName.toLowerCase().includes(query) ||
        booking.resourceName.toLowerCase().includes(query) ||
        booking.inchargeName.toLowerCase().includes(query) ||
        booking.inchargeEmail.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Activity filter
    if (activityFilter !== 'All') {
      filtered = filtered.filter(booking => booking.activityType === activityFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchQuery, statusFilter, activityFilter]);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [filterBookings]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    filterBookings();
  };

  const handleDeleteClick = (booking: Booking) => {
    setDeleteDialog({ open: true, booking });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.booking) return;

    try {
      await api.delete(`/bookings/${deleteDialog.booking.id}`);
      setBookings(bookings.filter(b => b.id !== deleteDialog.booking!.id));
      setDeleteDialog({ open: false, booking: null });
    } catch (error) {
      setError('Failed to delete booking');
      console.error('Error deleting booking:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'success';
      case 'Pending':
      case 'Pending Approval': return 'warning';
      case 'Cancelled': return 'error';
      case 'Denied': return 'error';
      case 'Completed': return 'success';
      case 'Cancelled - Overridden': return 'error';
      default: return 'default';
    }
  };

  const getActivityTypes = () => {
    const types = Array.from(new Set(bookings.map(b => b.activityType)));
    return types.filter(type => type && type.trim() !== '');
  };

  const getStatuses = () => {
    return Array.from(new Set(bookings.map(b => b.status)));
  };

  const paginatedBookings = filteredBookings.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const openConfirmDialog = (booking: Booking) => {
    setStatusDialog({ open: true, booking, action: 'Confirm', reason: '' });
  };

  const openRejectDialog = (booking: Booking) => {
    setStatusDialog({ open: true, booking, action: 'Denied', reason: '' });
  };

  const handleStatusSubmit = async () => {
    if (!statusDialog.booking || !statusDialog.action) return;
    try {
      const bookingId = statusDialog.booking.id;
      const newStatus = statusDialog.action === 'Confirm' ? 'Confirmed' : 'Denied';
      const payload: any = { status: newStatus };
      if (newStatus === 'Denied') {
        payload.denialReason = statusDialog.reason || 'No reason specified';
      }
      await api.put(`/campus/bookings/${bookingId}/status`, payload);
      // Update UI list locally
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      setStatusDialog({ open: false, booking: null, action: null, reason: '' });
    } catch (err) {
      setError('Failed to update booking status');
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">
              Manage Bookings
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/booking')}
            >
              New Booking
            </Button>
          </Box>

          <Box component="form" onSubmit={handleSearch} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search bookings by event name, resource, or incharge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="All">All</MenuItem>
                {getStatuses().map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Activity</InputLabel>
              <Select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                label="Activity"
              >
                <MenuItem value="All">All</MenuItem>
                {getActivityTypes().map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Bookings ({filteredBookings.length} total)
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Activity</TableCell>
                  <TableCell>Participants</TableCell>
                  <TableCell>Incharge</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedBookings.map((booking) => (
                  <TableRow key={booking.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {booking.eventName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {booking.resourceName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center">
                          <LocationOn sx={{ fontSize: 12, mr: 0.5 }} />
                          {booking.location}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {moment(booking.startDateTime).format('MMM DD, YYYY')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {moment(booking.startDateTime).format('h:mm A')} - {moment(booking.endDateTime).format('h:mm A')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={booking.activityType}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <People sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        {booking.participantCount}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {booking.inchargeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {booking.inchargeEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={booking.status}
                        size="small"
                        color={getStatusColor(booking.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                    {(['Pending', 'Pending Approval'].includes(booking.status)) && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => openConfirmDialog(booking)}
                          color="success"
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => openRejectDialog(booking)}
                          color="error"
                        >
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/booking/${booking.id}`)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(booking)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredBookings.length > itemsPerPage && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(filteredBookings.length / itemsPerPage)}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}

          {filteredBookings.length === 0 && (
            <Box textAlign="center" py={4}>
              <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No bookings found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search or filters
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, booking: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the booking "{deleteDialog.booking?.eventName}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, booking: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Accept / Reject Dialog */}
      <Dialog
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, booking: null, action: null, reason: '' })}
      >
        <DialogTitle>
          {statusDialog.action === 'Confirm' ? 'Confirm Booking' : 'Reject Booking'}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {statusDialog.action === 'Confirm'
              ? `Are you sure you want to confirm "${statusDialog.booking?.eventName}"?`
              : `Provide a reason (optional) for rejecting "${statusDialog.booking?.eventName}".`}
          </Typography>
          {statusDialog.action === 'Denied' && (
            <TextField
              fullWidth
              multiline
              minRows={3}
              placeholder="Reason for rejection"
              value={statusDialog.reason}
              onChange={(e) => setStatusDialog(prev => ({ ...prev, reason: e.target.value }))}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog({ open: false, booking: null, action: null, reason: '' })}>
            Cancel
          </Button>
          <Button onClick={handleStatusSubmit} variant="contained" color={statusDialog.action === 'Confirm' ? 'success' as any : 'error' as any}>
            {statusDialog.action === 'Confirm' ? 'Confirm' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Management;
