import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../config/database';
import sql from 'mssql';

const router = Router();

// Test database connection
router.get('/test', async (req: Request, res: Response) => {
  try {
    const pool = await connectToDatabase();

    // Ensure Admins table exists (safety for first-time setups)
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Admins' AND xtype='U')
      BEGIN
        CREATE TABLE dbo.Admins (
          AdminID INT IDENTITY(1,1) PRIMARY KEY,
          AdminName NVARCHAR(200) NOT NULL,
          AdminEmail NVARCHAR(200) NOT NULL UNIQUE,
          IsActive BIT NOT NULL DEFAULT 1
        );
        CREATE INDEX IX_Admins_Email ON dbo.Admins(AdminEmail);
      END
    `);
    const result = await pool.request().query('SELECT 1 as test');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      data: result.recordset
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all resources
router.get('/resources', async (req: Request, res: Response) => {
  try {
    const pool = await connectToDatabase();
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
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resources'
    });
  }
});

// Get all admins
router.get('/admins', async (req: Request, res: Response) => {
  try {
    const pool = await connectToDatabase();
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
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admins'
    });
  }
});

// Get all bookings with resource and admin details
router.get('/bookings', async (req: Request, res: Response) => {
  try {
    const { requestedByEmail } = req.query as { requestedByEmail?: string };
    const pool = await connectToDatabase();
    const request = pool.request();

    let where = '';
    if (requestedByEmail) {
      request.input('requestedByEmail', sql.NVarChar, String(requestedByEmail).trim().toLowerCase());
      where = 'WHERE LOWER(b.RequestedByEmail) = @requestedByEmail';
    }

    const result = await request.query(`
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
        b.DenialReason as denialReason,
        r.ResourceName as resourceName,
        r.ResourceType as resourceType,
        r.Location as location,
        r.Capacity as capacity,
        a.AdminName as adminName,
        a.AdminEmail as adminEmail
      FROM dbo.Bookings b
      INNER JOIN dbo.Resources r ON b.ResourceID = r.ResourceID
      LEFT JOIN dbo.Admins a ON b.AdminID = a.AdminID
      ${where}
      ORDER BY b.StartTime DESC
    `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
});

// Create new resource
router.post('/resources', async (req: Request, res: Response) => {
  try {
    const { name, type, location, capacity } = req.body;
    
    if (!name || !type || !location || !capacity) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, location, and capacity are required'
      });
    }

    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('resourceName', sql.NVarChar, name)
      .input('resourceType', sql.NVarChar, type)
      .input('location', sql.NVarChar, location)
      .input('capacity', sql.Int, capacity)
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
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create resource'
    });
  }
});

// Create new booking
router.post('/bookings', async (req: Request, res: Response) => {
  try {
    const {
      resourceId,
      adminId,
      requestedByName,
      requestedByEmail,
      eventTitle,
      startTime,
      endTime,
      bookingCategory,
      isPriority
    } = req.body;

    if (!resourceId || !requestedByName || !requestedByEmail || !eventTitle || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided'
      });
    }

    const pool = await connectToDatabase();

    // Resolve admin ID: if not provided, try to pick a default active admin
    let resolvedAdminId: number | null = adminId ?? null;
    if (!resolvedAdminId) {
      const adminResult = await pool.request().query(`
        SELECT TOP 1 AdminID
        FROM dbo.Admins
        WHERE IsActive = 1
        ORDER BY AdminID ASC
      `);
      if (adminResult.recordset.length > 0) {
        resolvedAdminId = adminResult.recordset[0].AdminID;
      } else {
        // Try to upsert a default admin based on the permanent admin email
        const defaultAdminEmail = 'admin@rajalakshmi.edu.in';
        // Ensure a row exists in Admins
        const upsert = await pool.request()
          .input('AdminName', sql.NVarChar, 'Portal Admin')
          .input('AdminEmail', sql.NVarChar, defaultAdminEmail)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.Admins WHERE AdminEmail = @AdminEmail)
            BEGIN
              UPDATE dbo.Admins SET AdminName = @AdminName, IsActive = 1 WHERE AdminEmail = @AdminEmail;
            END
            ELSE
            BEGIN
              INSERT INTO dbo.Admins (AdminName, AdminEmail, IsActive) VALUES (@AdminName, @AdminEmail, 1);
            END
          `);
        // Read back the AdminID
        const fetchAdmin = await pool.request()
          .input('AdminEmail', sql.NVarChar, defaultAdminEmail)
          .query(`SELECT TOP 1 AdminID FROM dbo.Admins WHERE AdminEmail = @AdminEmail AND IsActive = 1`);
        if (fetchAdmin.recordset.length > 0) {
          resolvedAdminId = fetchAdmin.recordset[0].AdminID;
        }
      }
    }

    // Check for conflicts
    const conflictCheck = await pool.request()
      .input('resourceId', sql.Int, resourceId)
      .input('startTime', sql.DateTime2, new Date(startTime))
      .input('endTime', sql.DateTime2, new Date(endTime))
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

    // Create booking (avoid OUTPUT due to table triggers)
    const insertResult = await pool.request()
      .input('resourceId', sql.Int, resourceId)
      .input('adminId', sql.Int, resolvedAdminId)
      .input('requestedByName', sql.NVarChar, requestedByName)
      .input('requestedByEmail', sql.NVarChar, requestedByEmail)
      .input('eventTitle', sql.NVarChar, eventTitle)
      .input('startTime', sql.DateTime2, new Date(startTime))
      .input('endTime', sql.DateTime2, new Date(endTime))
      .input('bookingCategory', sql.NVarChar, bookingCategory || 'General')
      .input('isPriority', sql.Bit, isPriority || false)
      .query(`
        INSERT INTO dbo.Bookings (
          ResourceID, AdminID, RequestedByName, RequestedByEmail,
          EventTitle, StartTime, EndTime, BookingStatus,
          BookingCategory, IsPriority, CreatedAt, LastModifiedAt
        ) VALUES (
          @resourceId, @adminId, @requestedByName, @requestedByEmail,
          @eventTitle, @startTime, @endTime, 'Pending',
          @bookingCategory, @isPriority, GETDATE(), GETDATE()
        );
      `);
    // Read back the last inserted row for response
    const created = await pool.request().query(`
      SELECT TOP 1 * FROM dbo.Bookings ORDER BY BookingID DESC
    `);
    res.status(201).json({ success: true, message: 'Booking created successfully', data: created.recordset[0] });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update booking status
router.put('/bookings/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminId, denialReason } = req.body;

    if (!['Pending', 'Confirmed', 'Cancelled', 'Completed', 'Denied'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: Pending, Confirmed, Cancelled, Completed, or Denied'
      });
    }

    const pool = await connectToDatabase();

    // Resolve AdminID robustly, ignoring client-sent adminId to avoid type issues
    let resolvedAdminId: number | null = null;
    try {
      // Try any existing admin row
      const adminResult = await pool.request().query(`
        SELECT TOP 1 AdminID FROM dbo.Admins ORDER BY AdminID ASC
      `);
      if (adminResult.recordset.length > 0) {
        const val = adminResult.recordset[0].AdminID;
        const n = typeof val === 'number' ? val : parseInt(String(val), 10);
        resolvedAdminId = Number.isFinite(n) ? n : null;
      } else {
        // Create a default admin if table empty
        const defaultAdminEmail = 'admin@rajalakshmi.edu.in';
        await pool.request()
          .input('AdminName', sql.NVarChar, 'Portal Admin')
          .input('AdminEmail', sql.NVarChar, defaultAdminEmail)
          .query(`
            INSERT INTO dbo.Admins (AdminName, AdminEmail, IsActive)
            SELECT TOP 1 'Portal Admin', @AdminEmail, 1
            WHERE NOT EXISTS (SELECT 1 FROM dbo.Admins WHERE AdminEmail = @AdminEmail);
          `);
        const fetchAdmin = await pool.request()
          .input('AdminEmail', sql.NVarChar, defaultAdminEmail)
          .query(`SELECT TOP 1 AdminID FROM dbo.Admins WHERE AdminEmail = @AdminEmail`);
        if (fetchAdmin.recordset.length > 0) {
          const n = parseInt(String(fetchAdmin.recordset[0].AdminID), 10);
          resolvedAdminId = Number.isFinite(n) ? n : null;
        }
      }
    } catch (_) {
      resolvedAdminId = null; // Fall back to null; DB column AdminID is nullable
    }

    let result;
    if (status === 'Denied') {
      const updateRes = await pool.request()
        .input('id', sql.Int, id)
        .input('status', sql.NVarChar, status)
        .input('adminId', sql.Int, resolvedAdminId === null ? null : resolvedAdminId)
        .input('denialReason', sql.NVarChar, denialReason || 'No reason specified')
        .query(`
          UPDATE dbo.Bookings 
          SET BookingStatus = @status, 
              AdminID = @adminId,
              DenialReason = @denialReason,
              LastModifiedAt = GETDATE()
          WHERE BookingID = @id
        `);
      result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM dbo.Bookings WHERE BookingID = @id');
    } else {
      const updateRes = await pool.request()
        .input('id', sql.Int, id)
        .input('status', sql.NVarChar, status)
        .input('adminId', sql.Int, resolvedAdminId)
        .query(`
          UPDATE dbo.Bookings 
          SET BookingStatus = @status, 
              AdminID = @adminId,
              LastModifiedAt = GETDATE()
          WHERE BookingID = @id
        `);
      result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM dbo.Bookings WHERE BookingID = @id');
    }

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Log the action in audit logs
    if (adminId) {
      await pool.request()
        .input('bookingId', sql.Int, id)
        .input('adminId', sql.Int, adminId)
        .input('action', sql.NVarChar, `Status changed to ${status}`)
        .input('details', sql.NVarChar, status === 'Denied' ? `Reason: ${denialReason || 'No reason specified'}` : `Booking status updated from system`)
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
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update booking status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get audit logs
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const pool = await connectToDatabase();
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
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

// Delete resource (soft delete)
router.delete('/resources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await connectToDatabase();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
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
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete resource'
    });
  }
});

export { router as campusDbRoutes };
