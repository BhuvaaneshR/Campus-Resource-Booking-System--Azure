import api from './api';

// Campus Database Service for connecting React to your existing SSMS schema
export class CampusDatabaseService {
  
  // Test database connection
  static async testConnection() {
    try {
      const response = await api.get('/campus/test');
      return response.data;
    } catch (error) {
      console.error('Database connection test failed:', error);
      throw error;
    }
  }

  // Resources
  static async getAllResources() {
    try {
      const response = await api.get('/campus/resources');
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
  }) {
    try {
      const response = await api.post('/campus/resources', resourceData);
      return response.data;
    } catch (error) {
      console.error('Error creating resource:', error);
      throw error;
    }
  }

  static async deleteResource(id: number) {
    try {
      const response = await api.delete(`/campus/resources/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }

  // Admins
  static async getAllAdmins() {
    try {
      const response = await api.get('/campus/admins');
      return response.data;
    } catch (error) {
      console.error('Error fetching admins:', error);
      throw error;
    }
  }

  // Bookings
  static async getAllBookings() {
    try {
      const response = await api.get('/campus/bookings');
      return response.data;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  static async createBooking(bookingData: {
    resourceId: number;
    adminId?: number;
    requestedByName: string;
    requestedByEmail: string;
    eventTitle: string;
    startTime: string;
    endTime: string;
    bookingCategory?: string;
    isPriority?: boolean;
  }) {
    try {
      const response = await api.post('/campus/bookings', bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  static async updateBookingStatus(id: number, status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed', adminId?: number) {
    try {
      const response = await api.put(`/campus/bookings/${id}/status`, { status, adminId });
      return response.data;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  // Audit Logs
  static async getAuditLogs() {
    try {
      const response = await api.get('/campus/audit-logs');
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }
}

export default CampusDatabaseService;
