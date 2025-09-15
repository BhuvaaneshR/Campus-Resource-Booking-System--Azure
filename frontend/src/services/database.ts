import api from './api';

// Database service for connecting React to SSMS via Node.js API
export class DatabaseService {
  
  // Test database connection
  static async testConnection() {
    try {
      const response = await api.get('/db/test');
      return response.data;
    } catch (error) {
      console.error('Database connection test failed:', error);
      throw error;
    }
  }

  // Resources
  static async getAllResources() {
    try {
      const response = await api.get('/db/resources');
      return response.data;
    } catch (error) {
      console.error('Error fetching resources:', error);
      throw error;
    }
  }

  static async createResource(resourceData: {
    name: string;
    type: string;
    location: string;
    capacity: number;
    description?: string;
  }) {
    try {
      const response = await api.post('/db/resources', resourceData);
      return response.data;
    } catch (error) {
      console.error('Error creating resource:', error);
      throw error;
    }
  }

  static async deleteResource(id: number) {
    try {
      const response = await api.delete(`/db/resources/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }

  // Users
  static async getAllUsers() {
    try {
      const response = await api.get('/db/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Bookings
  static async getAllBookings() {
    try {
      const response = await api.get('/db/bookings');
      return response.data;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  static async createBooking(bookingData: {
    eventName: string;
    resourceId: number;
    startDateTime: string;
    endDateTime: string;
    activityType?: string;
    participantCount?: number;
    inchargeName: string;
    inchargeEmail: string;
  }) {
    try {
      const response = await api.post('/db/bookings', bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  static async updateBookingStatus(id: number, status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed') {
    try {
      const response = await api.put(`/db/bookings/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }
}

export default DatabaseService;
