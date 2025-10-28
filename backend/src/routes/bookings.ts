import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../config/database';
import sql from 'mssql';
import { z } from 'zod';

const router = Router();

/** ----------------- Helpers & Schemas ----------------- **/

const intId = z.coerce.number().int().positive();
const email = z.string().email();
const isoDate = z.string(); // you can harden with regex if needed
const timeStr = z.string(); // "HH:mm" — can harden with regex

const createBookingBodySchema = z.object({
  eventName: z.string().min(3),
  resourceId: intId,
  startDateTime: z.string().datetime().transform(s => new Date(s)),
  endDateTime: z.string().datetime().transform(s => new Date(s)),
  activityType: z.string().default('General'),
  participantCount: z.coerce.number().int().nonnegative().optional(),
  inchargeName: z.string().min(2),
  inchargeEmail: email,
});

const updateBookingBodySchema = z.object({
  eventName: z.string().min(3).optional(),
  resourceId: intId.optional(),
  startDateTime: z.string().datetime().transform(s => new Date(s)).optional(),
  endDateTime: z.string().datetime().transform(s => new Date(s)).optional(),
  activityType: z.string().optional(),
  participantCount: z.coerce.number().int().nonnegative().optional(),
  inchargeName: z.string().min(2).optional(),
  inchargeEmail: email.optional(),
  status: z.enum(['Confirmed', 'Pending Approval', 'Cancelled', 'Cancelled - Overridden']).optional(),
});

const requestBookingBodySchema = z.object({
  eventName: z.string().min(3),
  resourceId: intId,
  startDate: isoDate,
  endDate: isoDate,
  startTime: timeStr,
  endTime: timeStr,
  description: z.string().optional(),
  attendeeCount: z.coerce.number().int().nonnegative().optional(),
  contactPhone: z.string().min(7),
});

const priorityBookingBodySchema = requestBookingBodySchema;

/** Combine a date (YYYY-MM-DD) and time (HH:mm) to a JS Date in local time */
function combineDateTime(dateStr: string, time: string) {
  // Keep it simple: let JS parse "YYYY-MM-DDTHH:mm"
  const d = new Date(`${dateStr}T${time}`);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date/time');
  return d;
}

/** SQL overlap condition is already correct:
 *   (startDateTime < @endDateTime AND endDateTime > @startDateTime)
 */

/** ----------------- Routes ----------------- **/

// Get all bookings
router.get('/', async (_req: Request, res: Response) => {
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

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = intId.parse(req.params.id);
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

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create new booking (Admin direct confirm)
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createBookingBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const {
      eventName, resourceId, startDateTime, endDateTime,
      activityType, participantCount, inchargeName, inchargeEmail,
    } = parsed.data;

    if (startDateTime >= endDateTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const pool = await connectToDatabase();

    // Conflict check (confirmed)
    const conflictCheck = await pool.request()
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, startDateTime)
      .input('endDateTime', sql.DateTime, endDateTime)
      .query(`
        SELECT id FROM Bookings 
        WHERE resourceId = @resourceId 
          AND status = 'Confirmed'
          AND (startDateTime < @endDateTime AND endDateTime > @startDateTime)
      `);

    if (conflictCheck.recordset.length > 0) {
      return res.status(409).json({ error: 'Resource is already booked for this time slot' });
    }

    // Insert
    const result = await pool.request()
      .input('eventName', sql.NVarChar, eventName)
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, startDateTime)
      .input('endDateTime', sql.DateTime, endDateTime)
      .input('activityType', sql.NVarChar, activityType || 'General')
      .input('participantCount', sql.Int, participantCount ?? null)
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
      data: { id: result.recordset[0].id, message: 'Booking created successfully' },
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = intId.parse(req.params.id);
    const parsed = updateBookingBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const {
      eventName, resourceId, startDateTime, endDateTime,
      activityType, participantCount, inchargeName, inchargeEmail, status,
    } = parsed.data;

    if (startDateTime && endDateTime && startDateTime >= endDateTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const pool = await connectToDatabase();

    // Check if booking exists
    const existingBooking = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Bookings WHERE id = @id');

    if (existingBooking.recordset.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Conflict check (excluding current)
    if (resourceId && startDateTime && endDateTime) {
      const conflictCheck = await pool.request()
        .input('resourceId', sql.Int, resourceId)
        .input('startDateTime', sql.DateTime, startDateTime)
        .input('endDateTime', sql.DateTime, endDateTime)
        .input('excludeId', sql.Int, id)
        .query(`
          SELECT id FROM Bookings 
          WHERE resourceId = @resourceId 
            AND id != @excludeId
            AND status = 'Confirmed'
            AND (startDateTime < @endDateTime AND endDateTime > @startDateTime)
        `);
      if (conflictCheck.recordset.length > 0) {
        return res.status(409).json({ error: 'Resource is already booked for this time slot' });
      }
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('eventName', sql.NVarChar, eventName ?? null)
      .input('resourceId', sql.Int, resourceId ?? null)
      .input('startDateTime', sql.DateTime, startDateTime ?? null)
      .input('endDateTime', sql.DateTime, endDateTime ?? null)
      .input('activityType', sql.NVarChar, activityType ?? null)
      .input('participantCount', sql.Int, participantCount ?? null)
      .input('inchargeName', sql.NVarChar, inchargeName ?? null)
      .input('inchargeEmail', sql.NVarChar, inchargeEmail ?? null)
      .input('status', sql.NVarChar, status ?? null)
      .query(`
        UPDATE Bookings 
        SET 
          eventName     = COALESCE(@eventName, eventName),
          resourceId    = COALESCE(@resourceId, resourceId),
          startDateTime = COALESCE(@startDateTime, startDateTime),
          endDateTime   = COALESCE(@endDateTime, endDateTime),
          activityType  = COALESCE(@activityType, activityType),
          participantCount = COALESCE(@participantCount, participantCount),
          inchargeName  = COALESCE(@inchargeName, inchargeName),
          inchargeEmail = COALESCE(@inchargeEmail, inchargeEmail),
          status        = COALESCE(@status, status),
          updatedAt     = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Booking updated successfully' });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Delete booking
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = intId.parse(req.params.id);
    const pool = await connectToDatabase();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Bookings WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Get booking requests for current user (Faculty)
router.get('/my-requests', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

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

    const bookings = result.recordset.map((b: any) => ({
      id: b.id,
      eventName: b.eventName,
      resourceName: b.resourceName,
      location: b.location,
      startDate: b.startDateTime?.toISOString().split('T')[0],
      endDate: b.endDateTime?.toISOString().split('T')[0],
      startTime: b.startDateTime?.toTimeString().slice(0, 5),
      endTime: b.endDateTime?.toTimeString().slice(0, 5),
      status: b.status,
      requesterName: b.inchargeName,
      requesterEmail: b.inchargeEmail,
      contactPhone: b.contactPhone,
      attendeeCount: b.participantCount,
      description: b.description,
      isUrgent: b.isUrgent,
      createdAt: b.createdAt?.toISOString(),
      rejectionReason: b.rejectionReason,
    }));

    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Failed to fetch your bookings' });
  }
});

// Create booking request (Faculty → Pending Approval)
router.post('/requests', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const parsed = requestBookingBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const {
      eventName, resourceId, startDate, endDate, startTime, endTime,
      description, attendeeCount, contactPhone,
    } = parsed.data;

    const startDateTime = combineDateTime(startDate, startTime);
    const endDateTime = combineDateTime(endDate, endTime);
    if (startDateTime >= endDateTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const pool = await connectToDatabase();

    // Conflict check (confirmed)
    const conflictCheck = await pool.request()
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, startDateTime)
      .input('endDateTime', sql.DateTime, endDateTime)
      .query(`
        SELECT id FROM Bookings 
        WHERE resourceId = @resourceId 
          AND status = 'Confirmed'
          AND (startDateTime < @endDateTime AND endDateTime > @startDateTime)
      `);

    if (conflictCheck.recordset.length > 0) {
      return res.status(409).json({ error: 'Resource is already booked for this time slot' });
    }

    const result = await pool.request()
      .input('eventName', sql.NVarChar, eventName)
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, startDateTime)
      .input('endDateTime', sql.DateTime, endDateTime)
      .input('activityType', sql.NVarChar, 'General')
      .input('participantCount', sql.Int, attendeeCount ?? null)
      .input('inchargeName', sql.NVarChar, user.name)
      .input('inchargeEmail', sql.NVarChar, user.email)
      .input('contactPhone', sql.NVarChar, contactPhone)
      .input('description', sql.NVarChar, description ?? null)
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
        message: 'Booking request submitted successfully and is pending approval',
      },
    });
  } catch (error) {
    console.error('Error creating booking request:', error);
    res.status(500).json({ error: 'Failed to submit booking request' });
  }
});

// Priority booking (Placement Exec, overrides conflicts)
router.post('/priority-booking', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    if (user.role !== 'Placement Executive') {
      return res.status(403).json({ error: 'Only Placement Executives can create priority bookings' });
    }

    const parsed = priorityBookingBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const {
      eventName, resourceId, startDate, endDate, startTime, endTime,
      description, attendeeCount, contactPhone,
    } = parsed.data;

    const startDateTime = combineDateTime(startDate, startTime);
    const endDateTime = combineDateTime(endDate, endTime);
    if (startDateTime >= endDateTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const pool = await connectToDatabase();

    // Conflicts (confirmed + pending) to override
    const conflictCheck = await pool.request()
      .input('resourceId', sql.Int, resourceId)
      .input('startDateTime', sql.DateTime, startDateTime)
