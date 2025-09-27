import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../config/database';
import sql from 'mssql';

const router = Router();

// Get all bookings
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query(`
      SELECT 
        b.id,
        b.eventName,
        b.startDateTime,
        b.endDateTime,
        b.activityType,
        b.participantCount,
        b.inchargeName,
        b.inchargeEmail,
        b.status,
        b.createdAt,
        b.updatedAt,
        r.name as resourceName,
        r.type as resourceType,
        r.location
      FROM Bookings b
      INNER JOIN Resources r ON b.resourceId = r.id
      ORDER BY b.startDateTime DESC
    `);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await connectToDatabase();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          b.*,
          r.name as resourceName,
          r.type as resourceType,
          r.location
        FROM Bookings b
        INNER JOIN Resources r ON b.resourceId = r.id
        WHERE b.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create new booking
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      eventName,
      resourceId,
      startDateTime,
      endDateTime,
      activityType,
      participantCount,
      inchargeName,
      inchargeEmail
    } = req.body;

    // Validate required fields
    if (!eventName || !resourceId || !startDateTime || !endDateTime || !inchargeName || !inchargeEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for conflicts
    const pool = await connectToDatabase();
    const conflictCheck = await pool.request()
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, new Date(startDateTime))
      .input('endDateTime', sql.DateTime, new Date(endDateTime))
      .query(`
        SELECT id FROM Bookings 
        WHERE resourceId = @resourceId 
        AND status = 'Confirmed'
        AND (
          (startDateTime < @endDateTime AND endDateTime > @startDateTime)
        )
      `);

    if (conflictCheck.recordset.length > 0) {
      return res.status(409).json({ error: 'Resource is already booked for this time slot' });
    }

    // Create booking
    const result = await pool.request()
      .input('eventName', sql.NVarChar, eventName)
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, new Date(startDateTime))
      .input('endDateTime', sql.DateTime, new Date(endDateTime))
      .input('activityType', sql.NVarChar, activityType)
      .input('participantCount', sql.Int, participantCount)
      .input('inchargeName', sql.NVarChar, inchargeName)
      .input('inchargeEmail', sql.NVarChar, inchargeEmail)
      .input('status', sql.NVarChar, 'Confirmed')
      .query(`
        INSERT INTO Bookings 
        (eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail, status, createdAt, updatedAt)
        OUTPUT INSERTED.id
        VALUES (@eventName, @resourceId, @startDateTime, @endDateTime, @activityType, @participantCount, @inchargeName, @inchargeEmail, @status, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      success: true,
      data: {
        id: result.recordset[0].id,
        message: 'Booking created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      eventName,
      resourceId,
      startDateTime,
      endDateTime,
      activityType,
      participantCount,
      inchargeName,
      inchargeEmail,
      status
    } = req.body;

    const pool = await connectToDatabase();
    
    // Check if booking exists
    const existingBooking = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Bookings WHERE id = @id');

    if (existingBooking.recordset.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check for conflicts (excluding current booking)
    if (resourceId && startDateTime && endDateTime) {
      const conflictCheck = await pool.request()
        .input('resourceId', sql.Int, resourceId)
        .input('startDateTime', sql.DateTime, new Date(startDateTime))
        .input('endDateTime', sql.DateTime, new Date(endDateTime))
        .input('excludeId', sql.Int, id)
        .query(`
          SELECT id FROM Bookings 
          WHERE resourceId = @resourceId 
          AND id != @excludeId
          AND status = 'Confirmed'
          AND (
            (startDateTime < @endDateTime AND endDateTime > @startDateTime)
          )
        `);

      if (conflictCheck.recordset.length > 0) {
        return res.status(409).json({ error: 'Resource is already booked for this time slot' });
      }
    }

    // Update booking
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('eventName', sql.NVarChar, eventName)
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, startDateTime ? new Date(startDateTime) : null)
      .input('endDateTime', sql.DateTime, endDateTime ? new Date(endDateTime) : null)
      .input('activityType', sql.NVarChar, activityType)
      .input('participantCount', sql.Int, participantCount)
      .input('inchargeName', sql.NVarChar, inchargeName)
      .input('inchargeEmail', sql.NVarChar, inchargeEmail)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE Bookings 
        SET 
          eventName = COALESCE(@eventName, eventName),
          resourceId = COALESCE(@resourceId, resourceId),
          startDateTime = COALESCE(@startDateTime, startDateTime),
          endDateTime = COALESCE(@endDateTime, endDateTime),
          activityType = COALESCE(@activityType, activityType),
          participantCount = COALESCE(@participantCount, participantCount),
          inchargeName = COALESCE(@inchargeName, inchargeName),
          inchargeEmail = COALESCE(@inchargeEmail, inchargeEmail),
          status = COALESCE(@status, status),
          updatedAt = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Booking updated successfully'
    });

  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Delete booking
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await connectToDatabase();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Bookings WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Get booking requests for current user (Faculty specific endpoint)
router.get('/my-requests', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // From auth middleware
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('userEmail', sql.NVarChar, user.email)
      .query(`
        SELECT 
          b.id,
          b.eventName,
          b.description,
          b.startDateTime,
          b.endDateTime,
          b.activityType,
          b.participantCount,
          b.inchargeName,
          b.inchargeEmail,
          b.contactPhone,
          b.status,
          b.createdAt,
          b.updatedAt,
          b.isUrgent,
          b.rejectionReason,
          r.name as resourceName,
          r.type as resourceType,
          r.location
        FROM Bookings b
        INNER JOIN Resources r ON b.resourceId = r.id
        WHERE b.inchargeEmail = @userEmail
        ORDER BY b.createdAt DESC
      `);

    // Transform the data to match frontend expectations
    const bookings = result.recordset.map(booking => ({
      id: booking.id,
      eventName: booking.eventName,
      resourceName: booking.resourceName,
      location: booking.location,
      startDate: booking.startDateTime.toISOString().split('T')[0],
      endDate: booking.endDateTime.toISOString().split('T')[0],
      startTime: booking.startDateTime.toTimeString().slice(0, 5),
      endTime: booking.endDateTime.toTimeString().slice(0, 5),
      status: booking.status,
      requesterName: booking.inchargeName,
      requesterEmail: booking.inchargeEmail,
      contactPhone: booking.contactPhone,
      attendeeCount: booking.participantCount,
      description: booking.description,
      isUrgent: booking.isUrgent,
      createdAt: booking.createdAt.toISOString(),
      rejectionReason: booking.rejectionReason
    }));

    res.json({
      success: true,
      bookings: bookings
    });

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Failed to fetch your bookings' });
  }
});

// Create booking request (Faculty submission - goes to "Pending Approval")
router.post('/requests', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // From auth middleware
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      eventName,
      resourceId,
      startDate,
      endDate,
      startTime,
      endTime,
      description,
      attendeeCount,
      contactPhone
    } = req.body;

    // Validate required fields
    if (!eventName || !resourceId || !startDate || !endDate || !startTime || !endTime || !contactPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    // Check for conflicts with confirmed bookings
    const pool = await connectToDatabase();
    const conflictCheck = await pool.request()
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, startDateTime)
      .input('endDateTime', sql.DateTime, endDateTime)
      .query(`
        SELECT id FROM Bookings 
        WHERE resourceId = @resourceId 
        AND status = 'Confirmed'
        AND (
          (startDateTime < @endDateTime AND endDateTime > @startDateTime)
        )
      `);

    if (conflictCheck.recordset.length > 0) {
      return res.status(409).json({ error: 'Resource is already booked for this time slot' });
    }

    // Create booking request with "Pending Approval" status
    const result = await pool.request()
      .input('eventName', sql.NVarChar, eventName)
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, startDateTime)
      .input('endDateTime', sql.DateTime, endDateTime)
      .input('activityType', sql.NVarChar, 'General') // Default activity type
      .input('participantCount', sql.Int, attendeeCount)
      .input('inchargeName', sql.NVarChar, user.name)
      .input('inchargeEmail', sql.NVarChar, user.email)
      .input('contactPhone', sql.NVarChar, contactPhone)
      .input('description', sql.NVarChar, description)
      .input('status', sql.NVarChar, 'Pending Approval')
      .input('isUrgent', sql.Bit, false)
      .query(`
        INSERT INTO Bookings 
        (eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail, contactPhone, description, status, isUrgent, createdAt, updatedAt)
        OUTPUT INSERTED.id
        VALUES (@eventName, @resourceId, @startDateTime, @endDateTime, @activityType, @participantCount, @inchargeName, @inchargeEmail, @contactPhone, @description, @status, @isUrgent, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      success: true,
      data: {
        id: result.recordset[0].id,
        message: 'Booking request submitted successfully and is pending approval'
      }
    });

  } catch (error) {
    console.error('Error creating booking request:', error);
    res.status(500).json({ error: 'Failed to submit booking request' });
  }
});

// Priority booking endpoint (for Placement Executives)
router.post('/priority-booking', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // From auth middleware
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is Placement Executive
    if (user.role !== 'Placement Executive') {
      return res.status(403).json({ error: 'Only Placement Executives can create priority bookings' });
    }

    const {
      eventName,
      resourceId,
      startDate,
      endDate,
      startTime,
      endTime,
      description,
      attendeeCount,
      contactPhone
    } = req.body;

    // Validate required fields
    if (!eventName || !resourceId || !startDate || !endDate || !startTime || !endTime || !contactPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Combine date and time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    const pool = await connectToDatabase();
    
    // Check for conflicting bookings (both confirmed and pending)
    const conflictCheck = await pool.request()
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, startDateTime)
      .input('endDateTime', sql.DateTime, endDateTime)
      .query(`
        SELECT id, eventName, inchargeName, inchargeEmail, status 
        FROM Bookings 
        WHERE resourceId = @resourceId 
        AND status IN ('Confirmed', 'Pending Approval')
        AND (
          (startDateTime < @endDateTime AND endDateTime > @startDateTime)
        )
      `);

    // If there are conflicts, override them
    if (conflictCheck.recordset.length > 0) {
      // Update conflicting bookings to "Cancelled - Overridden"
      await pool.request()
        .input('resourceId', sql.Int, resourceId)
        .input('startDateTime', sql.DateTime, startDateTime)
        .input('endDateTime', sql.DateTime, endDateTime)
        .query(`
          UPDATE Bookings 
          SET status = 'Cancelled - Overridden', 
              updatedAt = GETDATE()
          WHERE resourceId = @resourceId 
          AND status IN ('Confirmed', 'Pending Approval')
          AND (
            (startDateTime < @endDateTime AND endDateTime > @startDateTime)
          )
        `);
    }

    // Create urgent booking with "Confirmed" status
    const result = await pool.request()
      .input('eventName', sql.NVarChar, eventName)
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, startDateTime)
      .input('endDateTime', sql.DateTime, endDateTime)
      .input('activityType', sql.NVarChar, 'Placement Activity')
      .input('participantCount', sql.Int, attendeeCount)
      .input('inchargeName', sql.NVarChar, user.name)
      .input('inchargeEmail', sql.NVarChar, user.email)
      .input('contactPhone', sql.NVarChar, contactPhone)
      .input('description', sql.NVarChar, description)
      .input('status', sql.NVarChar, 'Confirmed')
      .input('isUrgent', sql.Bit, true)
      .query(`
        INSERT INTO Bookings 
        (eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail, contactPhone, description, status, isUrgent, createdAt, updatedAt)
        OUTPUT INSERTED.id
        VALUES (@eventName, @resourceId, @startDateTime, @endDateTime, @activityType, @participantCount, @inchargeName, @inchargeEmail, @contactPhone, @description, @status, @isUrgent, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      success: true,
      data: {
        id: result.recordset[0].id,
        message: 'Priority booking created successfully',
        overriddenBookings: conflictCheck.recordset.length
      }
    });

  } catch (error) {
    console.error('Error creating priority booking:', error);
    res.status(500).json({ error: 'Failed to create priority booking' });
  }
});

// Get user role endpoint
router.get('/user/role', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // From auth middleware
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    res.json({
      success: true,
      role: user.role
    });

  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ error: 'Failed to fetch user role' });
  }
});

export { router as bookingRoutes };
