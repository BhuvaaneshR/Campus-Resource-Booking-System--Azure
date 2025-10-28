"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRequestRoutes = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
const mssql_1 = __importDefault(require("mssql"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.profileRequestRoutes = router;
// Ensure tables exist
async function ensureTable() {
    const pool = await (0, database_1.connectToDatabase)();
    await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProfileRequests' AND xtype='U')
    BEGIN
      CREATE TABLE ProfileRequests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        email NVARCHAR(200) NOT NULL,
        department NVARCHAR(200) NULL,
        club NVARCHAR(200) NULL,
        subject NVARCHAR(200) NULL,
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
      IF COL_LENGTH('ProfileRequests','club') IS NULL
        ALTER TABLE ProfileRequests ADD club NVARCHAR(200) NULL;
      IF COL_LENGTH('ProfileRequests','subject') IS NULL
        ALTER TABLE ProfileRequests ADD subject NVARCHAR(200) NULL;
    END
  `);
    // Ensure Users table exists so approvals do not fail
    await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
    BEGIN
      CREATE TABLE Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(200) NOT NULL UNIQUE,
        name NVARCHAR(200) NOT NULL,
        role NVARCHAR(50) NOT NULL,
        department NVARCHAR(200) NULL,
        club NVARCHAR(200) NULL,
        subject NVARCHAR(200) NULL,
        isActive BIT NOT NULL DEFAULT 1,
        createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updatedAt DATETIME2 NULL
      );
      CREATE INDEX IX_Users_Email ON Users(email);
    END
  `);
}
// Public: submit a profile creation request
router.post('/', async (req, res) => {
    try {
        const { name, email, department, club, subject, role, mobile, facultyId, rollNumber, password } = req.body || {};
        if (!name || !email || !role || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!['Faculty', 'Student Coordinator'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        await ensureTable();
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('name', mssql_1.default.NVarChar, name)
            .input('email', mssql_1.default.NVarChar, email)
            .input('department', mssql_1.default.NVarChar, department || null)
            .input('club', mssql_1.default.NVarChar, club || null)
            .input('subject', mssql_1.default.NVarChar, subject || null)
            .input('role', mssql_1.default.NVarChar, role)
            .input('mobile', mssql_1.default.NVarChar, mobile || null)
            .input('facultyId', mssql_1.default.NVarChar, facultyId || null)
            .input('rollNumber', mssql_1.default.NVarChar, rollNumber || null)
            .input('password', mssql_1.default.NVarChar, password) // TEMP
            .query(`
        INSERT INTO ProfileRequests (name, email, department, club, subject, role, mobile, facultyId, rollNumber, password)
        VALUES (@name, @email, @department, @club, @subject, @role, @mobile, @facultyId, @rollNumber, @password);
        SELECT SCOPE_IDENTITY() as id;
      `);
        const id = result.recordset[0].id;
        return res.status(201).json({ success: true, id });
    }
    catch (error) {
        console.error('Submit profile request failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: list pending requests
router.get('/', auth_1.authenticateToken, (0, auth_1.requireRole)(['Portal Admin']), async (req, res) => {
    try {
        await ensureTable();
        const pool = await (0, database_1.connectToDatabase)();
        const showAll = (req.query.all || 'false').toString().toLowerCase() === 'true';
        const statusFilter = req.query.status;
        let query = `SELECT id, name, email, department, club, subject, role, mobile, facultyId, rollNumber, status, createdAt, approvedAt, approvedBy, rejectedAt, rejectedBy, rejectionReason FROM ProfileRequests`;
        if (!showAll && !statusFilter) {
            query += ` WHERE status = 'Pending'`;
        }
        else if (statusFilter) {
            query += ` WHERE status = @status`;
        }
        query += ` ORDER BY createdAt DESC`;
        const request = pool.request();
        if (statusFilter)
            request.input('status', mssql_1.default.NVarChar, statusFilter);
        const result = await request.query(query);
        return res.json({ items: result.recordset });
    }
    catch (error) {
        console.error('List profile requests failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: approve a request -> create user and mark approved
router.post('/:id/approve', auth_1.authenticateToken, (0, auth_1.requireRole)(['Portal Admin']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    const pool = await (0, database_1.connectToDatabase)();
    const transaction = new mssql_1.default.Transaction(pool);
    try {
        await ensureTable();
        await transaction.begin();
        const request = new mssql_1.default.Request(transaction);
        const reqResult = await request
            .input('id', mssql_1.default.Int, id)
            .query(`SELECT TOP 1 * FROM ProfileRequests WHERE id = @id AND status = 'Pending'`);
        if (reqResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Request not found or already processed' });
        }
        const pr = reqResult.recordset[0];
        // Create or update user in Users table (isActive = 1)
        await new mssql_1.default.Request(transaction)
            .input('email', mssql_1.default.NVarChar, pr.email)
            .input('name', mssql_1.default.NVarChar, pr.name)
            .input('role', mssql_1.default.NVarChar, pr.role)
            .input('department', mssql_1.default.NVarChar, pr.department || null)
            .input('club', mssql_1.default.NVarChar, pr.club || null)
            .input('subject', mssql_1.default.NVarChar, pr.subject || null)
            .query(`
        MERGE Users AS target
        USING (VALUES (@email, @name, @role, @department, @club, @subject, 1)) AS source (email, name, role, department, club, subject, isActive)
        ON target.email = source.email
        WHEN MATCHED THEN
          UPDATE SET name = source.name, role = source.role, department = source.department, club = source.club, subject = source.subject, isActive = source.isActive, updatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (email, name, role, department, club, subject, isActive) VALUES (source.email, source.name, source.role, source.department, source.club, source.subject, source.isActive);
      `);
        // Mark profile request approved
        await new mssql_1.default.Request(transaction)
            .input('id', mssql_1.default.Int, id)
            .input('approver', mssql_1.default.NVarChar, req.user?.email || 'admin')
            .query(`
        UPDATE ProfileRequests
        SET status = 'Approved', approvedAt = SYSUTCDATETIME(), approvedBy = @approver
        WHERE id = @id;
      `);
        await transaction.commit();
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Approve profile request failed:', error);
        try {
            await transaction.rollback();
        }
        catch { }
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Admin: reject a request -> mark rejected (keep in history)
router.post('/:id/reject', auth_1.authenticateToken, (0, auth_1.requireRole)(['Portal Admin']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body || {};
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    try {
        await ensureTable();
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('id', mssql_1.default.Int, id)
            .input('rejectedBy', mssql_1.default.NVarChar, req.user?.email || 'admin')
            .input('reason', mssql_1.default.NVarChar, reason || null)
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
    }
    catch (error) {
        console.error('Reject profile request failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
//# sourceMappingURL=profile-requests.js.map