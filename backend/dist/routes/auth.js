"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const msal_node_1 = require("@azure/msal-node");
const database_1 = require("../config/database");
const mssql_1 = __importDefault(require("mssql"));
const router = (0, express_1.Router)();
exports.authRoutes = router;
// Microsoft Entra ID configuration
const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID || 'dummy-client-id',
        clientSecret: process.env.AZURE_CLIENT_SECRET || 'dummy-secret',
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'dummy-tenant'}`
    }
};
// Only create MSAL instance if credentials are provided
let cca = null;
if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID) {
    cca = new msal_node_1.ConfidentialClientApplication(msalConfig);
}
// Login endpoint for Microsoft Entra ID SSO
router.post('/login', async (req, res) => {
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
        const userInfo = await response.json();
        // Check if user has admin role in database
        const pool = await (0, database_1.connectToDatabase)();
        const result = await pool.request()
            .input('email', mssql_1.default.NVarChar, userInfo.mail || userInfo.userPrincipalName)
            .query(`
        SELECT u.id, u.email, u.name, u.role, u.isActive
        FROM Users u
        WHERE u.email = @email AND u.role = 'Portal Admin' AND u.isActive = 1
      `);
        if (result.recordset.length === 0) {
            return res.status(403).json({
                error: 'Access denied. User is not authorized as Portal Admin.'
            });
        }
        const user = result.recordset[0];
        // Generate JWT token
        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        const secret = process.env.JWT_SECRET;
        const jwtToken = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '24h' });
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
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token required' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        res.json({
            valid: true,
            user: {
                id: decoded.id,
                email: decoded.email,
                name: decoded.name,
                role: decoded.role
            }
        });
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
// Logout endpoint
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});
//# sourceMappingURL=auth.js.map