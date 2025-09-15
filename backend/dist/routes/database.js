"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseRoutes = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
const mssql_1 = __importDefault(require("mssql"));
const router = (0, express_1.Router)();
exports.databaseRoutes = router;
// Test database connection
router.get('/test', async (req, res) => {
    try {
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request().query('SELECT 1 as test');
        res.json({
            success: true,
            message: 'Database connection successful',
            data: result.recordset
        });
    }
    catch (error) {
        console.error('Database test failed:', error);
        res.status(500).json({
            success: false,
            error: 'Database connection failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get all resources
router.get('/resources', async (req, res) => {
    try {
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request().query(`
      SELECT 
        id,
        name,
        type,
        location,
        capacity,
        description,
        isActive,
        createdAt,
        updatedAt
      FROM Resources
      WHERE isActive = 1
      ORDER BY name
    `);
        res.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length
        });
    }
    catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch resources'
        });
    }
});
// Get all users
router.get('/users', async (req, res) => {
    try {
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request().query(`
      SELECT 
        id,
        email,
        name,
        role,
        isActive,
        createdAt,
        updatedAt
      FROM Users
      WHERE isActive = 1
      ORDER BY name
    `);
        res.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});
// Get all bookings with resource details
router.get('/bookings', async (req, res) => {
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
        r.location,
        r.capacity
      FROM Bookings b
      INNER JOIN Resources r ON b.resourceId = r.id
      ORDER BY b.startDateTime DESC
    `);
        res.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length
        });
    }
    catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch bookings'
        });
    }
});
// Create new resource
router.post('/resources', async (req, res) => {
    try {
        const { name, type, location, capacity, description } = req.body;
        if (!name || !type || !location || !capacity) {
            return res.status(400).json({
                success: false,
                error: 'Name, type, location, and capacity are required'
            });
        }
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('name', mssql_1.default.NVarChar, name)
            .input('type', mssql_1.default.NVarChar, type)
            .input('location', mssql_1.default.NVarChar, location)
            .input('capacity', mssql_1.default.Int, capacity)
            .input('description', mssql_1.default.NVarChar, description || '')
            .query(`
        INSERT INTO Resources (name, type, location, capacity, description)
        OUTPUT INSERTED.*
        VALUES (@name, @type, @location, @capacity, @description)
      `);
        res.status(201).json({
            success: true,
            message: 'Resource created successfully',
            data: result.recordset[0]
        });
    }
    catch (error) {
        console.error('Error creating resource:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create resource'
        });
    }
});
// Create new booking
router.post('/bookings', async (req, res) => {
    try {
        const { eventName, resourceId, startDateTime, endDateTime, activityType, participantCount, inchargeName, inchargeEmail } = req.body;
        if (!eventName || !resourceId || !startDateTime || !endDateTime || !inchargeName || !inchargeEmail) {
            return res.status(400).json({
                success: false,
                error: 'All required fields must be provided'
            });
        }
        const pool = await (0, database_1.connectToDatabase)();
        // Check for conflicts
        const conflictCheck = await pool.request()
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime2, new Date(startDateTime))
            .input('endDateTime', mssql_1.default.DateTime2, new Date(endDateTime))
            .query(`
        SELECT COUNT(*) as conflicts
        FROM Bookings
        WHERE resourceId = @resourceId
        AND status = 'Confirmed'
        AND (
          (startDateTime < @endDateTime AND endDateTime > @startDateTime)
        )
      `);
        if (conflictCheck.recordset[0].conflicts > 0) {
            return res.status(409).json({
                success: false,
                error: 'Resource is already booked for the selected time slot'
            });
        }
        // Create booking
        const result = await pool.request()
            .input('eventName', mssql_1.default.NVarChar, eventName)
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startDateTime', mssql_1.default.DateTime2, new Date(startDateTime))
            .input('endDateTime', mssql_1.default.DateTime2, new Date(endDateTime))
            .input('activityType', mssql_1.default.NVarChar, activityType || '')
            .input('participantCount', mssql_1.default.Int, participantCount || 0)
            .input('inchargeName', mssql_1.default.NVarChar, inchargeName)
            .input('inchargeEmail', mssql_1.default.NVarChar, inchargeEmail)
            .query(`
        INSERT INTO Bookings (
          eventName, resourceId, startDateTime, endDateTime, 
          activityType, participantCount, inchargeName, inchargeEmail, status
        )
        OUTPUT INSERTED.*
        VALUES (
          @eventName, @resourceId, @startDateTime, @endDateTime,
          @activityType, @participantCount, @inchargeName, @inchargeEmail, 'Pending'
        )
      `);
        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: result.recordset[0]
        });
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create booking'
        });
    }
});
// Update booking status
router.put('/bookings/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['Pending', 'Confirmed', 'Cancelled', 'Completed'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: Pending, Confirmed, Cancelled, or Completed'
            });
        }
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('id', mssql_1.default.Int, id)
            .input('status', mssql_1.default.NVarChar, status)
            .query(`
        UPDATE Bookings 
        SET status = @status, updatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }
        res.json({
            success: true,
            message: 'Booking status updated successfully',
            data: result.recordset[0]
        });
    }
    catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update booking status'
        });
    }
});
// Delete resource
router.delete('/resources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('id', mssql_1.default.Int, id)
            .query(`
        UPDATE Resources 
        SET isActive = 0, updatedAt = GETDATE()
        WHERE id = @id
      `);
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                error: 'Resource not found'
            });
        }
        res.json({
            success: true,
            message: 'Resource deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting resource:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete resource'
        });
    }
});
//# sourceMappingURL=database.js.map