import React, { useState, useEffect } from 'react';
import DatabaseService from '../services/database';

interface Resource {
  id: number;
  name: string;
  type: string;
  location: string;
  capacity: number;
  description: string;
}

interface Booking {
  id: number;
  eventName: string;
  startDateTime: string;
  endDateTime: string;
  resourceName: string;
  inchargeName: string;
  status: string;
}

const DatabaseTest: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  // Test database connection
  const testConnection = async () => {
    setLoading(true);
    try {
      const result = await DatabaseService.testConnection();
      setConnectionStatus(result.success ? '✅ Connected to SSMS Database' : '❌ Connection Failed');
      console.log('Connection test result:', result);
    } catch (error) {
      setConnectionStatus('❌ Connection Failed');
      console.error('Connection error:', error);
    }
    setLoading(false);
  };

  // Fetch all resources from SSMS
  const fetchResources = async () => {
    setLoading(true);
    try {
      const result = await DatabaseService.getAllResources();
      setResources(result.data || []);
      console.log('Resources from SSMS:', result);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
    setLoading(false);
  };

  // Fetch all bookings from SSMS
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const result = await DatabaseService.getAllBookings();
      setBookings(result.data || []);
      console.log('Bookings from SSMS:', result);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
    setLoading(false);
  };

  // Create new resource
  const createSampleResource = async () => {
    try {
      const newResource = {
        name: 'Test Room ' + Date.now(),
        type: 'Meeting Room',
        location: 'Building X, Floor 1',
        capacity: 25,
        description: 'Test room created from React'
      };
      
      const result = await DatabaseService.createResource(newResource);
      console.log('Resource created:', result);
      fetchResources(); // Refresh the list
    } catch (error) {
      console.error('Error creating resource:', error);
    }
  };

  // Create new booking
  const createSampleBooking = async () => {
    if (resources.length === 0) {
      alert('Please fetch resources first');
      return;
    }

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const endTime = new Date(tomorrow);
      endTime.setHours(12, 0, 0, 0);

      const newBooking = {
        eventName: 'Test Event ' + Date.now(),
        resourceId: resources[0].id,
        startDateTime: tomorrow.toISOString(),
        endDateTime: endTime.toISOString(),
        activityType: 'Meeting',
        participantCount: 10,
        inchargeName: 'Test User',
        inchargeEmail: 'test@rajalakshmi.edu.in'
      };

      const result = await DatabaseService.createBooking(newBooking);
      console.log('Booking created:', result);
      fetchBookings(); // Refresh the list
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>SSMS Database Connection Test</h1>
      
      {/* Connection Status */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Connection Status</h3>
        <p>{connectionStatus}</p>
        <button onClick={testConnection} disabled={loading}>
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {/* Resources Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Resources from SSMS Database</h3>
        <button onClick={fetchResources} disabled={loading} style={{ marginRight: '10px' }}>
          Fetch Resources
        </button>
        <button onClick={createSampleResource} disabled={loading}>
          Create Sample Resource
        </button>
        
        {resources.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <p><strong>Found {resources.length} resources:</strong></p>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
              {resources.map((resource) => (
                <div key={resource.id} style={{ marginBottom: '10px', padding: '5px', backgroundColor: '#f9f9f9' }}>
                  <strong>{resource.name}</strong> - {resource.type}<br />
                  <small>Location: {resource.location} | Capacity: {resource.capacity}</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bookings Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Bookings from SSMS Database</h3>
        <button onClick={fetchBookings} disabled={loading} style={{ marginRight: '10px' }}>
          Fetch Bookings
        </button>
        <button onClick={createSampleBooking} disabled={loading}>
          Create Sample Booking
        </button>
        
        {bookings.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <p><strong>Found {bookings.length} bookings:</strong></p>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
              {bookings.map((booking) => (
                <div key={booking.id} style={{ marginBottom: '10px', padding: '5px', backgroundColor: '#f9f9f9' }}>
                  <strong>{booking.eventName}</strong> - {booking.resourceName}<br />
                  <small>
                    {new Date(booking.startDateTime).toLocaleString()} - {new Date(booking.endDateTime).toLocaleString()}<br />
                    Status: {booking.status} | In-charge: {booking.inchargeName}
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
                     backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '20px', borderRadius: '5px' }}>
          Loading...
        </div>
      )}
    </div>
  );
};

export default DatabaseTest;
