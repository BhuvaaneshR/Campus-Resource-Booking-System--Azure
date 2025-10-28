"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const applicationinsights_1 = __importDefault(require("applicationinsights"));
const auth_1 = require("./routes/auth");
const profile_auth_1 = require("./routes/profile-auth");
const bookings_1 = require("./routes/bookings");
const resources_1 = require("./routes/resources");
const database_1 = require("./routes/database");
const campus_db_1 = require("./routes/campus-db");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_2 = require("./middleware/auth");
const profile_requests_1 = require("./routes/profile-requests");
const database_2 = require("./config/database");
// Load environment variables early
dotenv_1.default.config();
/**
 * Application Insights (telemetry) — initialize BEFORE anything else that might throw.
 * Make sure the App Service sets: APPLICATIONINSIGHTS_CONNECTION_STRING
 */
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    applicationinsights_1.default
        .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
        .setAutoCollectRequests(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectExceptions(true)
        .setSendLiveMetrics(true)
        .start();
}
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '8080', 10);
// Harden headers & conceal fingerprint
app.use((0, helmet_1.default)());
app.disable('x-powered-by');
// --- CORS CONFIGURATION ---
// Prefer env-driven origins so you can update without code changes
// CSV list like: https://campus-booking-frontend-web.azurewebsites.net,http://localhost:3000
const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const defaultOrigins = [
    'http://localhost:3000',
    'https://campus-booking-frontend-web.azurewebsites.net',
];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));
// Add additional origin from env if present (legacy var support)
if (process.env.AZURE_APP_SERVICE_URL) {
    allowedOrigins.push(process.env.AZURE_APP_SERVICE_URL);
}
app.use((0, cors_1.default)({
    origin(origin, cb) {
        // allow non-browser tools (no origin) and listed origins
        if (!origin || allowedOrigins.includes(origin))
            return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
}));
// Logging middleware
app.use((0, morgan_1.default)('combined'));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', async (_req, res) => {
    const pool = (0, database_2.getPool)();
    const dbStatus = pool && pool.connected ? 'Connected' : 'Disconnected';
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus,
    });
});
// API Routes
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/profile-auth', profile_auth_1.profileAuthRoutes);
// Protected routes
app.use('/api/bookings', auth_2.authenticateToken, bookings_1.bookingRoutes);
app.use('/api/resources', auth_2.authenticateToken, resources_1.resourceRoutes);
// Semi-protected / internal utilities
app.use('/api/db', database_1.databaseRoutes);
app.use('/api/campus', campus_db_1.campusDbRoutes);
app.use('/api/profile-requests', profile_requests_1.profileRequestRoutes);
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
    });
});
// --- SERVER STARTUP LOGIC ---
async function startServer() {
    try {
        // Connect to the database first
        await (0, database_2.connectToDatabase)();
        console.log('🔗 Database connected successfully');
        // Start the server after successful database connection
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
            console.log('✅ Application started successfully!');
        });
    }
    catch (error) {
        console.error('❌ Failed to start server due to database connection error:', error);
        process.exit(1);
    }
}
// Start the application
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map