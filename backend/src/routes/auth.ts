import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { connectToDatabase } from '../config/database';
import sql from 'mssql';

const router = Router();

// Microsoft Entra ID configuration
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`
  }
};

// Create MSAL instance
let cca: ConfidentialClientApplication | null = null;
if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID) {
  cca = new ConfidentialClientApplication(msalConfig);
}

// Allowed email domains
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || 'rajalakshmi.edu.in').split(',');

// Role mappings from Entra ID to application roles
const ROLE_MAPPINGS = {
  'PortalAdmin': 'Portal Admin',
  'Faculty': 'Faculty',
  'StudentCoordinator': 'Student Coordinator'
};

// Login endpoint for Microsoft Entra ID SSO with RBAC
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    // Verify the token with Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    const userInfo = await response.json() as any;
    
    // Get user's app roles from Microsoft Graph API
    const appRolesResponse = await fetch('https://graph.microsoft.com/v1.0/me/appRoleAssignments', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    let userRoles: string[] = [];
    if (appRolesResponse.ok) {
      const rolesData = await appRolesResponse.json() as { value: any[] };
      userRoles = rolesData.value.map((assignment: any) => {
        // Map role IDs to role names (you'll need to configure these in Entra ID)
        const roleId = assignment.appRoleId;
        return Object.keys(ROLE_MAPPINGS).find(key => 
          // This is a placeholder - you'll need to map actual role IDs from your Entra ID app
          roleId === key
        ) || 'Student Coordinator'; // Default role
      });
    }
    
    // Validate email domain
    const userEmail = userInfo.mail || userInfo.userPrincipalName;
    const emailDomain = userEmail?.split('@')[1]?.toLowerCase();
    
    if (!userEmail || !ALLOWED_DOMAINS.includes(emailDomain)) {
      return res.status(403).json({ 
        error: `Access denied. Only ${ALLOWED_DOMAINS.join(', ')} email addresses are allowed.` 
      });
    }
    
    // Determine user role (prioritize Entra ID roles, fallback to database)
    let userRole = 'Student Coordinator'; // Default role
    
    if (userRoles.length > 0) {
      // Use highest priority role from Entra ID
      if (userRoles.includes('PortalAdmin')) {
        userRole = 'Portal Admin';
      } else if (userRoles.includes('Faculty')) {
        userRole = 'Faculty';
      } else {
        userRole = 'Student Coordinator';
      }
    } else {
      // Fallback: Check database for existing user role
      const pool = await connectToDatabase();
      const result = await pool.request()
        .input('email', sql.NVarChar, userEmail)
        .query(`
          SELECT u.id, u.email, u.name, u.role, u.isActive
          FROM Users u
          WHERE u.email = @email AND u.isActive = 1
        `);
        
      if (result.recordset.length > 0) {
        userRole = result.recordset[0].role;
      }
    }
    
    // Create or update user in database
    const pool = await connectToDatabase();
    await pool.request()
      .input('email', sql.NVarChar, userEmail)
      .input('name', sql.NVarChar, userInfo.displayName || userInfo.name)
      .input('role', sql.NVarChar, userRole)
      .query(`
        MERGE Users AS target
        USING (VALUES (@email, @name, @role, 1)) AS source (email, name, role, isActive)
        ON target.email = source.email
        WHEN MATCHED THEN
          UPDATE SET name = source.name, role = source.role, isActive = source.isActive
        WHEN NOT MATCHED THEN
          INSERT (email, name, role, isActive) VALUES (source.email, source.name, source.role, source.isActive);
      `);
    
    // Get the updated user record
    const userResult = await pool.request()
      .input('email', sql.NVarChar, userEmail)
      .query(`
        SELECT u.id, u.email, u.name, u.role, u.isActive
        FROM Users u
        WHERE u.email = @email AND u.isActive = 1
      `);
      
    if (userResult.recordset.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. Unable to create or access user record.' 
      });
    }
    
    const user = userResult.recordset[0];

    // Generate JWT token
    const jwtPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      oid: userInfo.id // Entra ID object identifier
    };
    const secret = process.env.JWT_SECRET!;
    const jwtToken = jwt.sign(jwtPayload, secret, { expiresIn: '24h' });

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    res.json({
      valid: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      }
    });

  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export { router as authRoutes };
