"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingRoutes = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
const mssql_1 = __importDefault(require("mssql"));
const zod_1 = require("zod");
const router = (0, express_1.Router)();
exports.bookingRoutes = router;
/** ----------------- Helpers & Schemas ----------------- **/
const intId = zod_1.z.coerce.number().int().positive();
const email = zod_1.z.string().email();
const isoDate = zod_1.z.string(); // can harden with regex if needed
const timeStr = zod_1.z.string(); // "HH:mm" — can harden with regex
const createBookingBodySchema = zod_1.z.object({
    eventName: zod_1.z.string().min(3),
    resourceId: intId,
    startDateTime: zod_1.z.string().datetime().transform((s) => new Date(s)),
    endDateTime: zod_1.z.string().datetime().transform((s) => new Date(s)),
    activityType: zod_1.z.string().default('General'),
    participantCount: zod_1.z.coerce.number().int().nonnegative().optional(),
    inchargeName: zod_1.z.string().min(2),
    inchargeEmail: email,
});
const updateBookingBodySchema = zod_1.z.object({
    eventName: zod_1.z.string().min(3).optional(),
    resourceId: intId.optional(),
    startDateTime: zod_1.z.string().datetime().transform((s) => new Date(s)).optional(),
    endDateTime: zod_1.z.string().datetime().transform((s) => new Date(s)).optional(),
    activityType: zod_1.z.string().optional(),
    participantCount: zod_1.z.coerce.number().int().nonnegative().optional(),
    inchargeName: zod_1.z.string().min(2).optional(),
    inchargeEmail: email.optional(),
    status: zod_1.z
        .enum(['Confirmed', 'Pending Approval', 'Cancelled', 'Cancelled - Overridden'])
        .optional(),
});
const requestBookingBodySchema = zod_1.z.object({
    eventName: zod_1.z.string().min(3),
    resourceId: intId,
    startDate: isoDate,
    endDate: isoDate,
    startTime: timeStr,
    endTime: timeStr,
    description: zod_1.z.string().optional(),
    attendeeCount: zod_1.z.coerce.number().int().nonnegative().optional(),
    contactPhone: zod_1.z.string().min(7),
});
const priorityBookingBodySchema = requestBookingBodySchema;
/** Combine date (YYYY-MM-DD) + time (HH:mm) into a JS Date */
function combineDateTime(dateStr, time) {
    const d = new Date(`${dateStr}T${time}`);
    if (Number.isNaN(d.getTime()))
        throw new Error('Invalid date/time');
    return d;
}
/** Overlap: (start < @end AND end > @start) */
/** ----------------- Routes ----------------- **/
// Get all bookings
router.get('/', async (_req, res) => {
    try {
        const pool = await (0, database_1.connectToDatabase)();
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
        b.isUrgent,
        b.rejectionReason,
        r.name   AS resourceName,
        r.type   AS resourceType,
        r.location
      FROM Bookings b
      INNER JOIN Resources r ON b.resourceId = r.id
      ORDER BY b.startDateTime DESC
    `);
        res.json({ success: true, data: result.recordset });
    }
    catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
// Create new booking (Admin confirm directly)
router.post('/', async (req, res) => {
    try {
        const parsed = createBookingBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail, } = parsed.data;
        if (startDateTime >= endDateTime) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }
        const pool = await (0, database_1.connectToDatabase)();
        // Conflict check against confirmed bookings
        const conflictCheck = await pool
            .request()
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime, startDateTime)
            .input('endDateTime', mssql_1.default.DateTime, endDateTime)
            .query(`
        SELECT id FROM Bookings 
        WHERE resourceId = @resourceId 
          AND status = 'Confirmed'
          AND (startDateTime < @endDateTime AND endDateTime > @startDateTime)
      `);
        if (conflictCheck.recordset.length > 0) {
            return res.status(409).json({ error: 'Resource is already booked for this time slot' });
        }
        const result = await pool
            .request()
            .input('eventName', mssql_1.default.NVarChar, eventName)
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime, startDateTime)
            .input('endDateTime', mssql_1.default.DateTime, endDateTime)
            .input('activityType', mssql_1.default.NVarChar, activityType || 'General')
            .input('participantCount', mssql_1.default.Int, participantCount ?? null)
            .input('inchargeName', mssql_1.default.NVarChar, inchargeName)
            .input('inchargeEmail', mssql_1.default.NVarChar, inchargeEmail)
            .input('status', mssql_1.default.NVarChar, 'Confirmed')
            .input('isUrgent', mssql_1.default.Bit, false)
            .query(`
        INSERT INTO Bookings 
        (eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail, status, isUrgent, createdAt, updatedAt)
        OUTPUT INSERTED.id
        VALUES (@eventName, @resourceId, @startDateTime, @endDateTime, @activityType, @participantCount, @inchargeName, @inchargeEmail, @status, @isUrgent, GETDATE(), GETDATE())
      `);
        res.status(201).json({
            success: true,
            data: { id: result.recordset[0].id, message: 'Booking created successfully' },
        });
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});
// Update booking
router.put('/:id', async (req, res) => {
    try {
        const id = intId.parse(req.params.id);
        const parsed = updateBookingBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail, status, } = parsed.data;
        if (startDateTime && endDateTime && startDateTime >= endDateTime) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }
        const pool = await (0, database_1.connectToDatabase)();
        // Existence
        const existing = await pool.request().input('id', mssql_1.default.Int, id).query(`
      SELECT * FROM Bookings WHERE id = @id
    `);
        if (existing.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        // Optional conflict check if time & resource all provided
        if (resourceId && startDateTime && endDateTime) {
            const conflict = await pool
                .request()
                .input('resourceId', mssql_1.default.Int, resourceId)
                .input('startDateTime', mssql_1.default.DateTime, startDateTime)
                .input('endDateTime', mssql_1.default.DateTime, endDateTime)
                .input('excludeId', mssql_1.default.Int, id)
                .query(`
          SELECT id FROM Bookings 
          WHERE resourceId = @resourceId 
            AND id <> @excludeId
            AND status = 'Confirmed'
            AND (startDateTime < @endDateTime AND endDateTime > @startDateTime)
        `);
            if (conflict.recordset.length > 0) {
                return res.status(409).json({ error: 'Resource is already booked for this time slot' });
            }
        }
        await pool
            .request()
            .input('id', mssql_1.default.Int, id)
            .input('eventName', mssql_1.default.NVarChar, eventName ?? null)
            .input('resourceId', mssql_1.default.Int, resourceId ?? null)
            .input('startDateTime', mssql_1.default.DateTime, startDateTime ?? null)
            .input('endDateTime', mssql_1.default.DateTime, endDateTime ?? null)
            .input('activityType', mssql_1.default.NVarChar, activityType ?? null)
            .input('participantCount', mssql_1.default.Int, participantCount ?? null)
            .input('inchargeName', mssql_1.default.NVarChar, inchargeName ?? null)
            .input('inchargeEmail', mssql_1.default.NVarChar, inchargeEmail ?? null)
            .input('status', mssql_1.default.NVarChar, status ?? null)
            .query(`
        UPDATE Bookings 
        SET 
          eventName       = COALESCE(@eventName, eventName),
          resourceId      = COALESCE(@resourceId, resourceId),
          startDateTime   = COALESCE(@startDateTime, startDateTime),
          endDateTime     = COALESCE(@endDateTime, endDateTime),
          activityType    = COALESCE(@activityType, activityType),
          participantCount= COALESCE(@participantCount, participantCount),
          inchargeName    = COALESCE(@inchargeName, inchargeName),
          inchargeEmail   = COALESCE(@inchargeEmail, inchargeEmail),
          status          = COALESCE(@status, status),
          updatedAt       = GETDATE()
        WHERE id = @id
      `);
        res.json({ success: true, message: 'Booking updated successfully' });
    }
    catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});
// Delete booking
router.delete('/:id', async (req, res) => {
    try {
        const id = intId.parse(req.params.id);
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request().input('id', mssql_1.default.Int, id).query(`
      DELETE FROM Bookings WHERE id = @id
    `);
        if ((result.rowsAffected?.[0] ?? 0) === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json({ success: true, message: 'Booking deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});
// Get booking requests for current user (Faculty)
router.get('/my-requests', async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentication required' });
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool
            .request()
            .input('userEmail', mssql_1.default.NVarChar, user.email)
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
        const bookings = result.recordset.map((b) => ({
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
    }
    catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ error: 'Failed to fetch your bookings' });
    }
});
// Create booking request (Faculty → Pending Approval)
router.post('/requests', async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentication required' });
        const parsed = requestBookingBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { eventName, resourceId, startDate, endDate, startTime, endTime, description, attendeeCount, contactPhone, } = parsed.data;
        const startDateTime = combineDateTime(startDate, startTime);
        const endDateTime = combineDateTime(endDate, endTime);
        if (startDateTime >= endDateTime) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }
        const pool = await (0, database_1.connectToDatabase)();
        // Conflict against confirmed
        const conflictCheck = await pool
            .request()
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime, startDateTime)
            .input('endDateTime', mssql_1.default.DateTime, endDateTime)
            .query(`
        SELECT id FROM Bookings 
        WHERE resourceId = @resourceId 
          AND status = 'Confirmed'
          AND (startDateTime < @endDateTime AND endDateTime > @startDateTime)
      `);
        if (conflictCheck.recordset.length > 0) {
            return res.status(409).json({ error: 'Resource is already booked for this time slot' });
        }
        const result = await pool
            .request()
            .input('eventName', mssql_1.default.NVarChar, eventName)
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime, startDateTime)
            .input('endDateTime', mssql_1.default.DateTime, endDateTime)
            .input('activityType', mssql_1.default.NVarChar, 'General')
            .input('participantCount', mssql_1.default.Int, attendeeCount ?? null)
            .input('inchargeName', mssql_1.default.NVarChar, user.name)
            .input('inchargeEmail', mssql_1.default.NVarChar, user.email)
            .input('contactPhone', mssql_1.default.NVarChar, contactPhone)
            .input('description', mssql_1.default.NVarChar, description ?? null)
            .input('status', mssql_1.default.NVarChar, 'Pending Approval')
            .input('isUrgent', mssql_1.default.Bit, false)
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
    }
    catch (error) {
        console.error('Error creating booking request:', error);
        res.status(500).json({ error: 'Failed to submit booking request' });
    }
});
// Priority booking (Placement Exec, overrides conflicts)
router.post('/priority-booking', async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Authentication required' });
        if (user.role !== 'Placement Executive') {
            return res.status(403).json({ error: 'Only Placement Executives can create priority bookings' });
        }
        const parsed = priorityBookingBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { eventName, resourceId, startDate, endDate, startTime, endTime, description, attendeeCount, contactPhone, } = parsed.data;
        const startDateTime = combineDateTime(startDate, startTime);
        const endDateTime = combineDateTime(endDate, endTime);
        if (startDateTime >= endDateTime) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }
        const pool = await (0, database_1.connectToDatabase)();
        // 1) Cancel overlapping confirmed/pending bookings
        await pool
            .request()
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime, startDateTime)
            .input('endDateTime', mssql_1.default.DateTime, endDateTime)
            .query(`
        UPDATE Bookings
        SET status = 'Cancelled - Overridden', updatedAt = GETDATE()
        WHERE resourceId = @resourceId
          AND status IN ('Confirmed','Pending Approval')
          AND (startDateTime < @endDateTime AND endDateTime > @startDateTime)
      `);
        // 2) Insert urgent, confirmed booking
        const result = await pool
            .request()
            .input('eventName', mssql_1.default.NVarChar, eventName)
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime, startDateTime)
            .input('endDateTime', mssql_1.default.DateTime, endDateTime)
            .input('activityType', mssql_1.default.NVarChar, 'General')
            .input('participantCount', mssql_1.default.Int, attendeeCount ?? null)
            .input('inchargeName', mssql_1.default.NVarChar, user.name)
            .input('inchargeEmail', mssql_1.default.NVarChar, user.email)
            .input('contactPhone', mssql_1.default.NVarChar, contactPhone)
            .input('description', mssql_1.default.NVarChar, description ?? null)
            .input('status', mssql_1.default.NVarChar, 'Confirmed')
            .input('isUrgent', mssql_1.default.Bit, true)
            .query(`
        INSERT INTO Bookings 
        (eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail, contactPhone, description, status, isUrgent, createdAt, updatedAt)
        OUTPUT INSERTED.id
        VALUES (@eventName, @resourceId, @startDateTime, @endDateTime, @activityType, @participantCount, @inchargeName, @inchargeEmail, @contactPhone, @description, @status, @isUrgent, GETDATE(), GETDATE())
      `);
        res.status(201).json({
            success: true,
            data: { id: result.recordset[0].id, message: 'Priority booking created and conflicts overridden' },
        });
    }
    catch (error) {
        console.error('Error creating priority booking:', error);
        res.status(500).json({ error: 'Failed to create priority booking' });
    }
});
/* -----------------------------------
   Get booking by id (KEEP LAST)
----------------------------------- */
router.get('/:id', async (req, res) => {
    try {
        const id = intId.parse(req.params.id);
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.Int, id)
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
    }
    catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});
//# sourceMappingURL=bookings.js.map