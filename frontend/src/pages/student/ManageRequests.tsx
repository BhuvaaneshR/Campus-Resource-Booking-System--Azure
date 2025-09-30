import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { FilterList } from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface MyRequest {
  id: string;
  eventName: string;
  resourceName: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: 'Pending' | 'Confirmed' | 'Denied' | 'Cancelled' | 'Completed';
  requesterName: string;
  requesterEmail: string;
  createdAt: string;
  approvedBy?: string;
  rejectionReason?: string;
}

const ManageRequests: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | MyRequest['status']>('all');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user?.email) throw new Error('Missing user email');
      const res = await api.get('/campus/bookings', { params: { requestedByEmail: user.email } });
      const rows = (res.data?.data || []) as Array<any>;
      const pad = (n: number) => n.toString().padStart(2, '0');
      const mapRow = (r: any): MyRequest => {
        const start = new Date(r.startDateTime);
        const end = new Date(r.endDateTime);
        return {
          id: String(r.id),
          eventName: r.eventName,
          resourceName: r.resourceName,
          location: r.location,
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}:00`,
          endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}:00`,
          status: (r.status as MyRequest['status']) || 'Pending',
          requesterName: r.inchargeName,
          requesterEmail: r.inchargeEmail,
          createdAt: r.createdAt || new Date().toISOString(),
          approvedBy: r.adminName || undefined,
          rejectionReason: r.denialReason || undefined,
        };
      };
      setRequests(rows.map(mapRow));
    } catch (e) {
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'success';
      case 'Pending': return 'warning';
      case 'Denied': return 'error';
      case 'Cancelled': return 'default';
      case 'Completed': return 'secondary';
      default: return 'default';
    }
  };

  const filtered = requests.filter(r => statusFilter === 'all' ? true : r.status === statusFilter);

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
        <Typography variant="h4">Manage Requests</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FilterList />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              label="Filter by Status"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Confirmed">Confirmed</MenuItem>
              <MenuItem value="Denied">Denied</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={load}>Refresh</Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Admin/Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.eventName}</TableCell>
                <TableCell>{r.resourceName}</TableCell>
                <TableCell>{r.startDate === r.endDate ? r.startDate : `${r.startDate} → ${r.endDate}`}</TableCell>
                <TableCell>{`${r.startTime} - ${r.endTime}`}</TableCell>
                <TableCell>
                  <Chip size="small" label={r.status} color={getStatusColor(r.status) as any} />
                </TableCell>
                <TableCell>
                  {r.status === 'Denied' ? (
                    <Typography variant="body2" color="error.main">{r.rejectionReason || 'No reason provided'}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">{r.approvedBy || '-'}</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">No requests found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ManageRequests;
