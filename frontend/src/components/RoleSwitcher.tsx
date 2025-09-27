import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import { SwapHoriz } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const RoleSwitcher: React.FC = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(user?.role || '');

  // Only show role switcher in development or when auth is disabled
  const showRoleSwitcher = process.env.REACT_APP_AUTH_MODE === 'disabled' || 
                          process.env.NODE_ENV === 'development';

  if (!showRoleSwitcher || !user) {
    return null;
  }

  const availableRoles = [
    'Portal Admin',
    'Faculty',
    'Placement Executive',
    'Student Coordinator'
  ];

  const handleRoleChange = () => {
    // In a real app, this would update the user's role in the backend
    // For demo purposes, we'll simulate by refreshing the page with a role parameter
    if (selectedRole && selectedRole !== user.role) {
      // Store the selected role in localStorage for demo
      localStorage.setItem('demo-role', selectedRole);
      window.location.reload();
    }
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed',
        top: 16,
        right: 16,
        p: 2,
        zIndex: 9999,
        bgcolor: 'warning.light',
        border: '2px solid',
        borderColor: 'warning.main',
        minWidth: 250
      }}
    >
      <Box display="flex" alignItems="center" mb={1}>
        <SwapHoriz sx={{ mr: 1 }} />
        <Typography variant="subtitle2" fontWeight="bold">
          Development Mode
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" mb={2}>
        Current Role: <Chip label={user.role} size="small" color="primary" />
      </Typography>
      
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Switch Role</InputLabel>
        <Select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          label="Switch Role"
        >
          {availableRoles.map((role) => (
            <MenuItem key={role} value={role}>
              {role}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <Button
        fullWidth
        variant="contained"
        size="small"
        onClick={handleRoleChange}
        disabled={!selectedRole || selectedRole === user.role}
      >
        Switch Role
      </Button>
      
      <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
        For testing different user personas
      </Typography>
    </Paper>
  );
};

export default RoleSwitcher;
