import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface BookingRow {
  id: number;
  eventName: string;
  startDateTime: string;
  endDateTime: string;
  inchargeName: string;
  inchargeEmail: string;
  status: string;
  activityType: string;
  resourceName: string;
  location: string;
}

const AdminBookingRequests: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [denyOpen, setDenyOpen] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [targetId, setTargetId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/campus/bookings');
      const all: BookingRow[] = res.data.data || [];
      setRows(all.filter(r => r.status === 'Pending'));
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load booking requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: number, status: 'Confirmed' | 'Cancelled' | 'Denied', reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      await api.put(`/campus/bookings/${id}/status`, {
        status,
        adminId: user?.id || null,
        denialReason: status === 'Denied' ? (reason || 'No reason specified') : undefined,
      });
      setSuccess(`Request ${status === 'Confirmed' ? 'approved' : status === 'Denied' ? 'denied' : 'cancelled'} successfully.`);
      await load();
    } catch (e: any) {
      const detail = e?.response?.data?.details;
      const err = e?.response?.data?.error || 'Failed to update request';
      setError(detail ? `${err}: ${detail}` : err);
    } finally {
      setLoading(false);
    }
  };

  const openDenyDialog = (id: number) => {
    setTargetId(id);
    setDenyReason('');
    setDenyOpen(true);
  };

  const confirmDeny = async () => {
    if (targetId == null) return;
    await updateStatus(targetId, 'Denied', denyReason.trim());
    setDenyOpen(false);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Resource Booking Requests</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading && rows.length === 0 ? (
        <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">No pending requests.</Alert>
      ) : (
        <Stack spacing={2}>
          {rows.map(r => (
            <Card key={r.id}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <Typography variant="h6">{r.eventName}</Typography>
                    <Typography variant="body2" color="text.secondary">{r.resourceName} • {r.location}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(r.startDateTime).toLocaleString()} — {new Date(r.endDateTime).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Requested by: {r.inchargeName} ({r.inchargeEmail})
                    </Typography>
                    <Chip label={r.activityType || 'General'} size="small" sx={{ mt: 1 }} />
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button variant="outlined" color="error" disabled={loading} onClick={() => openDenyDialog(r.id)}>Reject</Button>
                    <Button variant="contained" color="primary" disabled={loading} onClick={() => updateStatus(r.id, 'Confirmed')}>Approve</Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={denyOpen} onClose={() => setDenyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Request</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for rejection"
            fullWidth
            multiline
            minRows={2}
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDenyOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDeny} disabled={loading}>Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBookingRequests;
