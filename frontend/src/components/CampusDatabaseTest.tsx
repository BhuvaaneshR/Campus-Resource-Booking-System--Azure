import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { 
  CheckCircle, 
  Error, 
  Refresh,
  Add,
  Storage,
  Event,
  AdminPanelSettings 
} from '@mui/icons-material';
import CampusDatabaseService from '../services/campus-database';

interface Resource {
  id: number;
  name: string;
  type: string;
  location: string;
  capacity: number;
  isActive: boolean;
}

interface Booking {
  id: number;
  eventName: string;
  startDateTime: string;
  endDateTime: string;
  inchargeName: string;
  inchargeEmail: string;
  status: string;
  activityType: string;
  resourceName: string;
  resourceType: string;
  location: string;
  capacity: number;
}

interface Admin {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

const CampusDatabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error' | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New resource form
  const [newResource, setNewResource] = useState({
    name: '',
    type: 'Classroom',
    location: '',
    capacity: 30
  });

  const testConnection = async () => {
    setConnectionStatus('testing');
    setConnectionMessage('Testing connection to your SSMS database...');
    
    try {
      const result = await CampusDatabaseService.testConnection();
      setConnectionStatus('success');
      setConnectionMessage(`✅ Connected successfully! ${result.message}`);
    } catch (error: any) {
      setConnectionStatus('error');
      setConnectionMessage(`❌ Connection failed: ${error.response?.data?.error || error.message}`);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch resources
      const resourcesResult = await CampusDatabaseService.getAllResources();
      setResources(resourcesResult.data || []);
      
      // Fetch bookings
      const bookingsResult = await CampusDatabaseService.getAllBookings();
      setBookings(bookingsResult.data || []);
      
      // Fetch admins
      const adminsResult = await CampusDatabaseService.getAllAdmins();
      setAdmins(adminsResult.data || []);
      
    } catch (error: any) {
      setError(`Failed to fetch data: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createSampleResource = async () => {
    if (!newResource.name || !newResource.location) {
      setError('Please fill in resource name and location');
      return;
    }
    
    try {
      await CampusDatabaseService.createResource(newResource);
      setNewResource({ name: '', type: 'Classroom', location: '', capacity: 30 });
      fetchAllData(); // Refresh data
    } catch (error: any) {
      setError(`Failed to create resource: ${error.response?.data?.error || error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'success';
      case 'Pending': return 'warning';
      case 'Cancelled': return 'error';
      case 'Completed': return 'info';
      default: return 'default';
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Campus Database Test - Your SSMS Schema
      </Typography>
      
      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Database Connection Status</Typography>
            <Button 
              variant="outlined" 
              startIcon={<Refresh />}
              onClick={testConnection}
              disabled={connectionStatus === 'testing'}
            >
              Test Connection
            </Button>
          </Box>
          
          {connectionStatus === 'testing' && (
            <Box display="flex" alignItems="center" mt={2}>
              <CircularProgress size={20} sx={{ mr: 2 }} />
              <Typography>{connectionMessage}</Typography>
            </Box>
          )}
          
          {connectionStatus === 'success' && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {connectionMessage}
            </Alert>
          )}
          
          {connectionStatus === 'error' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {connectionMessage}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Data Operations */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Database Operations</Typography>
            <Button 
              variant="contained" 
              startIcon={<Storage />}
              onClick={fetchAllData}
              disabled={loading || connectionStatus !== 'success'}
            >
              Fetch All Data
            </Button>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {loading && (
            <Box display="flex" alignItems="center">
              <CircularProgress size={20} sx={{ mr: 2 }} />
              <Typography>Loading data from your database...</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create New Resource */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Create New Resource
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
            <TextField
              label="Resource Name"
              value={newResource.name}
              onChange={(e) => setNewResource({...newResource, name: e.target.value})}
              placeholder="e.g., Lab 101"
              sx={{ minWidth: 200, flex: 1 }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={newResource.type}
                onChange={(e) => setNewResource({...newResource, type: e.target.value})}
                label="Type"
              >
                <MenuItem value="Classroom">Classroom</MenuItem>
                <MenuItem value="Laboratory">Laboratory</MenuItem>
                <MenuItem value="Auditorium">Auditorium</MenuItem>
                <MenuItem value="Conference Room">Conference Room</MenuItem>
                <MenuItem value="Sports Facility">Sports Facility</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Location"
              value={newResource.location}
              onChange={(e) => setNewResource({...newResource, location: e.target.value})}
              placeholder="e.g., Block A, Floor 2"
              sx={{ minWidth: 200, flex: 1 }}
            />
            <TextField
              type="number"
              label="Capacity"
              value={newResource.capacity}
              onChange={(e) => setNewResource({...newResource, capacity: parseInt(e.target.value) || 0})}
              sx={{ minWidth: 100 }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={createSampleResource}
              disabled={connectionStatus !== 'success'}
              sx={{ height: '56px' }}
            >
              Create
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Resources Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <Storage sx={{ mr: 1 }} />
            Resources ({resources.length})
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell>{resource.id}</TableCell>
                    <TableCell>{resource.name}</TableCell>
                    <TableCell>{resource.type}</TableCell>
                    <TableCell>{resource.location}</TableCell>
                    <TableCell>{resource.capacity}</TableCell>
                    <TableCell>
                      <Chip 
                        label={resource.isActive ? 'Active' : 'Inactive'} 
                        color={resource.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {resources.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No resources found. Click "Fetch All Data" to load from database.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <Event sx={{ mr: 1 }} />
            Bookings ({bookings.length})
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Incharge</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.slice(0, 10).map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.id}</TableCell>
                    <TableCell>{booking.eventName}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{booking.resourceName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {booking.location}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(booking.startDateTime).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(booking.startDateTime).toLocaleTimeString()} - 
                        {new Date(booking.endDateTime).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{booking.inchargeName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {booking.inchargeEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={booking.status} 
                        color={getStatusColor(booking.status)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No bookings found. Click "Fetch All Data" to load from database.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {bookings.length > 10 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Showing first 10 bookings of {bookings.length} total
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Admins Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <AdminPanelSettings sx={{ mr: 1 }} />
            Admins ({admins.length})
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>{admin.id}</TableCell>
                    <TableCell>{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={admin.isActive ? 'Active' : 'Inactive'} 
                        color={admin.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No admins found. Click "Fetch All Data" to load from database.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CampusDatabaseTest;
