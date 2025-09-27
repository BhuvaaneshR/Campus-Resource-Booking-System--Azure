import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../config/database';
import sql from 'mssql';
import jwt from 'jsonwebtoken';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'Profile auth routes are working', timestamp: new Date().toISOString() });
});

// Ensure ProfileRequests table exists
async function ensureProfileRequestsTable() {
  const pool = await connectToDatabase();
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
        role NVARCHAR(50) NOT NULL,
        mobile NVARCHAR(50) NULL,
        facultyId NVARCHAR(100) NULL,
        rollNumber NVARCHAR(100) NULL,
        password NVARCHAR(500) NULL,
        status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        approvedAt DATETIME2 NULL,
        approvedBy NVARCHAR(200) NULL,
        rejectedAt DATETIME2 NULL,
        rejectedBy NVARCHAR(200) NULL,
        rejectionReason NVARCHAR(500) NULL
      );
      CREATE INDEX IX_ProfileRequests_Email ON ProfileRequests(email);
    END
  `);
}

// Profile request based authentication endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('Profile auth login attempt received:', { email: req.body.email, hasPassword: !!req.body.password });
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // PERMANENT ADMIN BACKDOOR (as requested):
    // admin@rajalakshmi.edu.in / admin1234
    const adminEmail = 'admin@rajalakshmi.edu.in';
    const adminPass = 'admin@1234';
    if (email.trim().toLowerCase() === adminEmail && password === adminPass) {
      try {
        const pool = await connectToDatabase();
        // Ensure Users table exists
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

        // Upsert admin user
        await pool.request()
          .input('email', sql.NVarChar, adminEmail)
          .input('name', sql.NVarChar, 'Portal Admin')
          .input('role', sql.NVarChar, 'Portal Admin')
          .query(`
            MERGE Users AS target
            USING (VALUES (@email, @name, @role, 1)) AS source (email, name, role, isActive)
            ON target.email = source.email
            WHEN MATCHED THEN UPDATE SET name = source.name, role = source.role, isActive = source.isActive, updatedAt = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN INSERT (email, name, role, isActive, createdAt) VALUES (source.email, source.name, source.role, source.isActive, SYSUTCDATETIME());
          `);

        // Build JWT
        const secret = process.env.JWT_SECRET || 'default-secret';
        const token = jwt.sign({ id: 'admin-1', email: adminEmail, name: 'Portal Admin', role: 'Portal Admin' }, secret, { expiresIn: '24h' });
        return res.json({
          success: true,
          token,
          user: { id: 'admin-1', email: adminEmail, name: 'Portal Admin', role: 'Portal Admin' }
        });
      } catch (e) {
        console.error('Admin backdoor login failed:', e);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    console.log('Ensuring ProfileRequests table exists...');
    await ensureProfileRequestsTable();
    console.log('Connecting to database...');
    const pool = await connectToDatabase();

    // Check if email exists in ProfileRequests table
    console.log('Searching for email in ProfileRequests:', email.trim().toLowerCase());
    const profileResult = await pool.request()
      .input('email', sql.NVarChar, email.trim().toLowerCase())
      .query(`
        SELECT TOP 1 id, name, email, role, password, status, rejectionReason, department, club, subject
        FROM ProfileRequests 
        WHERE LOWER(email) = @email 
        ORDER BY createdAt DESC
      `);

    console.log('Database query result:', {
      found: profileResult.recordset.length > 0,
      count: profileResult.recordset.length,
      record: profileResult.recordset[0] ? {
        id: profileResult.recordset[0].id,
        email: profileResult.recordset[0].email,
        status: profileResult.recordset[0].status,
        role: profileResult.recordset[0].role
      } : null
    });

    if (profileResult.recordset.length === 0) {
      console.log('No profile request found for email:', email);
      return res.status(401).json({ 
        error: 'Invalid email address. Email not found in our system.' 
      });
    }

    const profileRequest = profileResult.recordset[0];

    // Check status and handle accordingly
    switch (profileRequest.status) {
      case 'Pending':
        return res.status(403).json({
          error: 'Your profile request is still pending approval. Please wait for admin approval before you can login.',
          status: 'pending'
        });

      case 'Rejected':
        const rejectionMessage = profileRequest.rejectionReason 
          ? `Your profile request has been declined. Reason: ${profileRequest.rejectionReason}`
          : 'Your profile request has been declined. Please contact the administrator for more information.';
        
        return res.status(403).json({
          error: rejectionMessage,
          status: 'rejected'
        });

      case 'Approved':
        // Verify password (in production, use bcrypt for hashed passwords)
        if (password !== profileRequest.password) {
          return res.status(401).json({ 
            error: 'Invalid password. Please check your password and try again.' 
          });
        }

        // Ensure Users table exists
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

        // Create or update user in Users table
        await pool.request()
          .input('email', sql.NVarChar, profileRequest.email)
          .input('name', sql.NVarChar, profileRequest.name)
          .input('role', sql.NVarChar, profileRequest.role)
          .input('department', sql.NVarChar, profileRequest.department || null)
          .input('club', sql.NVarChar, profileRequest.club || null)
          .input('subject', sql.NVarChar, profileRequest.subject || null)
          .query(`
            MERGE Users AS target
            USING (VALUES (@email, @name, @role, @department, @club, @subject, 1)) AS source (email, name, role, department, club, subject, isActive)
            ON target.email = source.email
            WHEN MATCHED THEN
              UPDATE SET name = source.name, role = source.role, department = source.department, club = source.club, subject = source.subject, isActive = source.isActive, updatedAt = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN
              INSERT (email, name, role, department, club, subject, isActive, createdAt) 
              VALUES (source.email, source.name, source.role, source.department, source.club, source.subject, source.isActive, SYSUTCDATETIME());
          `);

        // Get user record for response
        const userResult = await pool.request()
          .input('email', sql.NVarChar, profileRequest.email)
          .query(`SELECT UserID as id, email, name, role, department, club, subject FROM Users WHERE email = @email AND isActive = 1`);

        if (userResult.recordset.length === 0) {
          return res.status(500).json({ error: 'Failed to create user record.' });
        }

        const user = userResult.recordset[0];

        // Generate JWT token
        const jwtPayload = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          club: user.club,
          subject: user.subject
        };
        const secret = process.env.JWT_SECRET || 'default-secret';
        const jwtToken = jwt.sign(jwtPayload, secret, { expiresIn: '24h' });

        return res.json({
          success: true,
          token: jwtToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department,
            club: user.club,
            subject: user.subject
          }
        });

      default:
        return res.status(500).json({ 
          error: 'Unknown profile request status. Please contact the administrator.' 
        });
    }
  } catch (error) {
    console.error('Profile login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to check profile requests in database
router.get('/debug/requests', async (req: Request, res: Response) => {
  try {
    await ensureProfileRequestsTable();
    const pool = await connectToDatabase();
    
    const result = await pool.request().query(`
      SELECT id, name, email, role, status, createdAt, rejectionReason
      FROM ProfileRequests 
      ORDER BY createdAt DESC
    `);
    
    return res.json({
      success: true,
      count: result.recordset.length,
      requests: result.recordset
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as profileAuthRoutes };
