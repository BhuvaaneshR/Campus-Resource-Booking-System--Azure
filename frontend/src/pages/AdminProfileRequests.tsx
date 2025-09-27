import React, { useEffect, useState } from 'react';
import { Box, Container, Paper, Typography, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip, Alert, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, Divider, TextField } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { approveProfileRequest, listProfileRequests, ProfileRequestItem } from '../services/profileRequests';

const AdminProfileRequests: React.FC = () => {
  const [items, setItems] = useState<ProfileRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProfileRequestItem | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setError(null);
    setSuccess(null);
    try {
      setLoading(true);
      const res = await listProfileRequests({ all: true });
      setItems(res.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const openReject = (item: ProfileRequestItem) => {
    setSelected(item);
    setRejectReason('');
    setRejectOpen(true);
  };

  const doReject = async () => {
    if (!selected) return;
    setError(null);
    setSuccess(null);
    try {
      setLoading(true);
      const { rejectProfileRequest } = await import('../services/profileRequests');
      await rejectProfileRequest(selected.id, rejectReason.trim() || undefined);
      setSuccess('Request rejected');
      setRejectOpen(false);
      setSelected(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id: number) => {
    setError(null);
    setSuccess(null);
    try {
      setLoading(true);
      await approveProfileRequest(id);
      setSuccess('Request approved successfully');
      setSelected(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Container maxWidth="lg">
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h4" fontWeight="bold">Profile Creation Requests</Typography>
          <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Refresh</Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Paper>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography variant="body1" color="text.secondary" sx={{ py: 3 }}>
                        No pending requests.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => (
                    <TableRow key={r.id} hover onClick={() => setSelected(r)} sx={{ cursor: 'pointer' }}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.role}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View details">
                          <IconButton onClick={(e) => { e.stopPropagation(); setSelected(r); }}>
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        {r.status === 'Pending' && (
                          <>
                            <Tooltip title="Approve">
                              <span>
                                <IconButton color="success" onClick={(e) => { e.stopPropagation(); approve(r.id); }} disabled={loading}>
                                  <CheckCircleIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <span>
                                <IconButton color="error" onClick={(e) => { e.stopPropagation(); openReject(r); }} disabled={loading}>
                                  {/* Using VisibilityIcon as placeholder for a reject icon alternative could be CloseIcon */}
                                  ✖
                                </IconButton>
                              </span>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Details dialog */}
        <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
          <DialogTitle>Profile Request Details</DialogTitle>
          <DialogContent dividers>
            {selected && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                <Typography variant="body1" gutterBottom>{selected.name}</Typography>

                <Divider sx={{ my: 1 }} />

                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body1" gutterBottom>{selected.email}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Department</Typography>
                <Typography variant="body1" gutterBottom>{selected.department || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Role</Typography>
                <Typography variant="body1" gutterBottom>{selected.role}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Mobile</Typography>
                <Typography variant="body1" gutterBottom>{selected.mobile || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Faculty ID</Typography>
                <Typography variant="body1" gutterBottom>{selected.facultyId || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Roll Number</Typography>
                <Typography variant="body1" gutterBottom>{selected.rollNumber || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                <Typography variant="body1" gutterBottom>{new Date(selected.createdAt).toLocaleString()}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Typography variant="body1" gutterBottom>
                  {selected.status}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelected(null)}>Close</Button>
            {selected && selected.status === 'Pending' && (
              <>
                <Button variant="outlined" color="error" onClick={() => setRejectOpen(true)} disabled={loading}>
                  Reject
                </Button>
                <Button variant="contained" color="success" onClick={() => approve(selected.id)} disabled={loading} startIcon={<CheckCircleIcon />}>
                  Approve
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* Reject dialog */}
        <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Reject Request</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Optionally provide a reason for rejection. This will be stored with the request.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              label="Reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={doReject} disabled={loading}>Reject</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminProfileRequests;
