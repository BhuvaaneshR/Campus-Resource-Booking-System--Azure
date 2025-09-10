"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingRoutes = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
const mssql_1 = __importDefault(require("mssql"));
const router = (0, express_1.Router)();
exports.bookingRoutes = router;
// Get all bookings
router.get('/', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});
// Get booking by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
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
        res.json({
            success: true,
            data: result.recordset[0]
        });
    }
    catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});
// Create new booking
router.post('/', async (req, res) => {
    try {
        const { eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail } = req.body;
        // Validate required fields
        if (!eventName || !resourceId || !startDateTime || !endDateTime || !inchargeName || !inchargeEmail) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Check for conflicts
        const pool = await (0, database_1.connectToDatabase)();
        const conflictCheck = await pool.request()
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime, new Date(startDateTime))
            .input('endDateTime', mssql_1.default.DateTime, new Date(endDateTime))
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
            .input('eventName', mssql_1.default.NVarChar, eventName)
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime, new Date(startDateTime))
            .input('endDateTime', mssql_1.default.DateTime, new Date(endDateTime))
            .input('activityType', mssql_1.default.NVarChar, activityType)
            .input('participantCount', mssql_1.default.Int, participantCount)
            .input('inchargeName', mssql_1.default.NVarChar, inchargeName)
            .input('inchargeEmail', mssql_1.default.NVarChar, inchargeEmail)
            .input('status', mssql_1.default.NVarChar, 'Confirmed')
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
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});
// Update booking
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail, status } = req.body;
        const pool = await (0, database_1.connectToDatabase)();
        // Check if booking exists
        const existingBooking = await pool.request()
            .input('id', mssql_1.default.Int, id)
            .query('SELECT * FROM Bookings WHERE id = @id');
        if (existingBooking.recordset.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        // Check for conflicts (excluding current booking)
        if (resourceId && startDateTime && endDateTime) {
            const conflictCheck = await pool.request()
                .input('resourceId', mssql_1.default.Int, resourceId)
                .input('startDateTime', mssql_1.default.DateTime, new Date(startDateTime))
                .input('endDateTime', mssql_1.default.DateTime, new Date(endDateTime))
                .input('excludeId', mssql_1.default.Int, id)
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
            .input('id', mssql_1.default.Int, id)
            .input('eventName', mssql_1.default.NVarChar, eventName)
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime, startDateTime ? new Date(startDateTime) : null)
            .input('endDateTime', mssql_1.default.DateTime, endDateTime ? new Date(endDateTime) : null)
            .input('activityType', mssql_1.default.NVarChar, activityType)
            .input('participantCount', mssql_1.default.Int, participantCount)
            .input('inchargeName', mssql_1.default.NVarChar, inchargeName)
            .input('inchargeEmail', mssql_1.default.NVarChar, inchargeEmail)
            .input('status', mssql_1.default.NVarChar, status)
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
    }
    catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});
// Delete booking
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('id', mssql_1.default.Int, id)
            .query('DELETE FROM Bookings WHERE id = @id');
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json({
            success: true,
            message: 'Booking deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});
//# sourceMappingURL=bookings.js.map