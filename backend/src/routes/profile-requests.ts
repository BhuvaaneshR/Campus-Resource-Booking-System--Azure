import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../config/database';
import sql from 'mssql';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Ensure table exists
async function ensureTable() {
  const pool = await connectToDatabase();
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProfileRequests' AND xtype='U')
    BEGIN
      CREATE TABLE ProfileRequests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        email NVARCHAR(200) NOT NULL,
        department NVARCHAR(200) NULL,
        role NVARCHAR(50) NOT NULL, -- 'Faculty' | 'Student Coordinator'
        mobile NVARCHAR(50) NULL,
        facultyId NVARCHAR(100) NULL,
        rollNumber NVARCHAR(100) NULL,
        password NVARCHAR(500) NULL, -- TEMPORARY: Do NOT store plain text in production
        status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        approvedAt DATETIME2 NULL,
        approvedBy NVARCHAR(200) NULL,
        rejectedAt DATETIME2 NULL,
        rejectedBy NVARCHAR(200) NULL,
        rejectionReason NVARCHAR(500) NULL
      );
      CREATE INDEX IX_ProfileRequests_Status ON ProfileRequests(status);
    END
    ELSE
    BEGIN
      IF COL_LENGTH('ProfileRequests','rejectedAt') IS NULL
        ALTER TABLE ProfileRequests ADD rejectedAt DATETIME2 NULL;
      IF COL_LENGTH('ProfileRequests','rejectedBy') IS NULL
        ALTER TABLE ProfileRequests ADD rejectedBy NVARCHAR(200) NULL;
      IF COL_LENGTH('ProfileRequests','rejectionReason') IS NULL
        ALTER TABLE ProfileRequests ADD rejectionReason NVARCHAR(500) NULL;
    END
  `);
}

// Public: submit a profile creation request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, department, role, mobile, facultyId, rollNumber, password } = req.body || {};

    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['Faculty', 'Student Coordinator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await ensureTable();
    const pool = await connectToDatabase();

    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('department', sql.NVarChar, department || null)
      .input('role', sql.NVarChar, role)
      .input('mobile', sql.NVarChar, mobile || null)
      .input('facultyId', sql.NVarChar, facultyId || null)
      .input('rollNumber', sql.NVarChar, rollNumber || null)
      .input('password', sql.NVarChar, password) // TEMP
      .query(`
        INSERT INTO ProfileRequests (name, email, department, role, mobile, facultyId, rollNumber, password)
        VALUES (@name, @email, @department, @role, @mobile, @facultyId, @rollNumber, @password);
        SELECT SCOPE_IDENTITY() as id;
      `);

    const id = result.recordset[0].id;
    return res.status(201).json({ success: true, id });
  } catch (error) {
    console.error('Submit profile request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: list pending requests
router.get('/', authenticateToken, requireRole(['Portal Admin']), async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const pool = await connectToDatabase();
    const showAll = (req.query.all || 'false').toString().toLowerCase() === 'true';
    const statusFilter = req.query.status as string | undefined;

    let query = `SELECT id, name, email, department, role, mobile, facultyId, rollNumber, status, createdAt, approvedAt, approvedBy, rejectedAt, rejectedBy, rejectionReason FROM ProfileRequests`;
    if (!showAll && !statusFilter) {
      query += ` WHERE status = 'Pending'`;
    } else if (statusFilter) {
      query += ` WHERE status = @status`;
    }
    query += ` ORDER BY createdAt DESC`;

    const request = pool.request();
    if (statusFilter) request.input('status', sql.NVarChar, statusFilter);
    const result = await request.query(query);
    return res.json({ items: result.recordset });
  } catch (error) {
    console.error('List profile requests failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: approve a request -> create user and mark approved
router.post('/:id/approve', authenticateToken, requireRole(['Portal Admin']), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const pool = await connectToDatabase();
  const transaction = new sql.Transaction(pool);

  try {
    await ensureTable();
    await transaction.begin();

    const request = new sql.Request(transaction);
    const reqResult = await request
      .input('id', sql.Int, id)
      .query(`SELECT TOP 1 * FROM ProfileRequests WHERE id = @id AND status = 'Pending'`);

    if (reqResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    const pr = reqResult.recordset[0];

    // Create or update user in Users table (isActive = 1)
    await new sql.Request(transaction)
      .input('email', sql.NVarChar, pr.email)
      .input('name', sql.NVarChar, pr.name)
      .input('role', sql.NVarChar, pr.role)
      .query(`
        MERGE Users AS target
        USING (VALUES (@email, @name, @role, 1)) AS source (email, name, role, isActive)
        ON target.email = source.email
        WHEN MATCHED THEN
          UPDATE SET name = source.name, role = source.role, isActive = source.isActive
        WHEN NOT MATCHED THEN
          INSERT (email, name, role, isActive) VALUES (source.email, source.name, source.role, source.isActive);
      `);

    // Mark profile request approved
    await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .input('approver', sql.NVarChar, (req as any).user?.email || 'admin')
      .query(`
        UPDATE ProfileRequests
        SET status = 'Approved', approvedAt = SYSUTCDATETIME(), approvedBy = @approver
        WHERE id = @id;
      `);

    await transaction.commit();
    return res.json({ success: true });
  } catch (error) {
    console.error('Approve profile request failed:', error);
    try { await transaction.rollback(); } catch {}
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: reject a request -> mark rejected (keep in history)
router.post('/:id/reject', authenticateToken, requireRole(['Portal Admin']), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { reason } = req.body || {};
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    await ensureTable();
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('rejectedBy', sql.NVarChar, (req as any).user?.email || 'admin')
      .input('reason', sql.NVarChar, reason || null)
      .query(`
        UPDATE ProfileRequests
        SET status = 'Rejected', rejectedAt = SYSUTCDATETIME(), rejectedBy = @rejectedBy, rejectionReason = @reason
        WHERE id = @id AND status <> 'Rejected';
        SELECT @@ROWCOUNT as affected;
      `);

    const affected = result.recordset[0]?.affected || 0;
    if (affected === 0) {
      return res.status(404).json({ error: 'Request not found or already rejected' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Reject profile request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as profileRequestRoutes };
