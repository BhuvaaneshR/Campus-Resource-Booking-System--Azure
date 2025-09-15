"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.campusDbRoutes = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
const mssql_1 = __importDefault(require("mssql"));
const router = (0, express_1.Router)();
exports.campusDbRoutes = router;
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
        ResourceID as id,
        ResourceName as name,
        ResourceType as type,
        Location as location,
        Capacity as capacity,
        IsActive as isActive
      FROM dbo.Resources
      WHERE IsActive = 1
      ORDER BY ResourceName
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
// Get all admins
router.get('/admins', async (req, res) => {
    try {
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request().query(`
      SELECT 
        AdminID as id,
        AdminName as name,
        AdminEmail as email,
        IsActive as isActive
      FROM dbo.Admins
      WHERE IsActive = 1
      ORDER BY AdminName
    `);
        res.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length
        });
    }
    catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch admins'
        });
    }
});
// Get all bookings with resource and admin details
router.get('/bookings', async (req, res) => {
    try {
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request().query(`
      SELECT 
        b.BookingID as id,
        b.EventTitle as eventName,
        b.StartTime as startDateTime,
        b.EndTime as endDateTime,
        b.RequestedByName as inchargeName,
        b.RequestedByEmail as inchargeEmail,
        b.BookingStatus as status,
        b.BookingCategory as activityType,
        b.IsPriority as isPriority,
        b.CreatedAt as createdAt,
        b.LastModifiedAt as updatedAt,
        r.ResourceName as resourceName,
        r.ResourceType as resourceType,
        r.Location as location,
        r.Capacity as capacity,
        a.AdminName as adminName,
        a.AdminEmail as adminEmail
      FROM dbo.Bookings b
      INNER JOIN dbo.Resources r ON b.ResourceID = r.ResourceID
      LEFT JOIN dbo.Admins a ON b.AdminID = a.AdminID
      ORDER BY b.StartTime DESC
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
        const { name, type, location, capacity } = req.body;
        if (!name || !type || !location || !capacity) {
            return res.status(400).json({
                success: false,
                error: 'Name, type, location, and capacity are required'
            });
        }
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('resourceName', mssql_1.default.NVarChar, name)
            .input('resourceType', mssql_1.default.NVarChar, type)
            .input('location', mssql_1.default.NVarChar, location)
            .input('capacity', mssql_1.default.Int, capacity)
            .query(`
        INSERT INTO dbo.Resources (ResourceName, ResourceType, Location, Capacity, IsActive)
        OUTPUT INSERTED.ResourceID, INSERTED.ResourceName, INSERTED.ResourceType, 
               INSERTED.Location, INSERTED.Capacity, INSERTED.IsActive
        VALUES (@resourceName, @resourceType, @location, @capacity, 1)
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
        const { resourceId, adminId, requestedByName, requestedByEmail, eventTitle, startTime, endTime, bookingCategory, isPriority } = req.body;
        if (!resourceId || !requestedByName || !requestedByEmail || !eventTitle || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                error: 'All required fields must be provided'
            });
        }
        const pool = await (0, database_1.connectToDatabase)();
        // Check for conflicts
        const conflictCheck = await pool.request()
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('startTime', mssql_1.default.DateTime2, new Date(startTime))
            .input('endTime', mssql_1.default.DateTime2, new Date(endTime))
            .query(`
        SELECT COUNT(*) as conflicts
        FROM dbo.Bookings
        WHERE ResourceID = @resourceId
        AND BookingStatus IN ('Confirmed', 'Pending')
        AND (
          (StartTime < @endTime AND EndTime > @startTime)
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
            .input('resourceId', mssql_1.default.Int, resourceId)
            .input('adminId', mssql_1.default.Int, adminId || null)
            .input('requestedByName', mssql_1.default.NVarChar, requestedByName)
            .input('requestedByEmail', mssql_1.default.NVarChar, requestedByEmail)
            .input('eventTitle', mssql_1.default.NVarChar, eventTitle)
            .input('startTime', mssql_1.default.DateTime2, new Date(startTime))
            .input('endTime', mssql_1.default.DateTime2, new Date(endTime))
            .input('bookingCategory', mssql_1.default.NVarChar, bookingCategory || 'General')
            .input('isPriority', mssql_1.default.Bit, isPriority || false)
            .query(`
        INSERT INTO dbo.Bookings (
          ResourceID, AdminID, RequestedByName, RequestedByEmail, 
          EventTitle, StartTime, EndTime, BookingStatus, 
          BookingCategory, IsPriority, CreatedAt, LastModifiedAt
        )
        OUTPUT INSERTED.*
        VALUES (
          @resourceId, @adminId, @requestedByName, @requestedByEmail,
          @eventTitle, @startTime, @endTime, 'Pending',
          @bookingCategory, @isPriority, GETDATE(), GETDATE()
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
        const { status, adminId } = req.body;
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
            .input('adminId', mssql_1.default.Int, adminId || null)
            .query(`
        UPDATE dbo.Bookings 
        SET BookingStatus = @status, 
            AdminID = @adminId,
            LastModifiedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE BookingID = @id
      `);
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }
        // Log the action in audit logs
        if (adminId) {
            await pool.request()
                .input('bookingId', mssql_1.default.Int, id)
                .input('adminId', mssql_1.default.Int, adminId)
                .input('action', mssql_1.default.NVarChar, `Status changed to ${status}`)
                .input('details', mssql_1.default.NVarChar, `Booking status updated from system`)
                .query(`
          INSERT INTO dbo.AuditLogs (BookingID, AdminID, Action, Details, Timestamp)
          VALUES (@bookingId, @adminId, @action, @details, GETDATE())
        `);
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
// Get audit logs
router.get('/audit-logs', async (req, res) => {
    try {
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request().query(`
      SELECT 
        al.LogID as id,
        al.Action as action,
        al.Details as details,
        al.Timestamp as timestamp,
        b.EventTitle as eventTitle,
        a.AdminName as adminName
      FROM dbo.AuditLogs al
      LEFT JOIN dbo.Bookings b ON al.BookingID = b.BookingID
      LEFT JOIN dbo.Admins a ON al.AdminID = a.AdminID
      ORDER BY al.Timestamp DESC
    `);
        res.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length
        });
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs'
        });
    }
});
// Delete resource (soft delete)
router.delete('/resources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('id', mssql_1.default.Int, id)
            .query(`
        UPDATE dbo.Resources 
        SET IsActive = 0
        WHERE ResourceID = @id
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
//# sourceMappingURL=campus-db.js.map