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
const auth_1 = require("./routes/auth");
const bookings_1 = require("./routes/bookings");
const resources_1 = require("./routes/resources");
const database_1 = require("./routes/database");
const campus_db_1 = require("./routes/campus-db");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_2 = require("./middleware/auth");
const database_2 = require("./config/database");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '8080', 10);
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.AZURE_APP_SERVICE_URL
        : 'http://localhost:3000',
    credentials: true
}));
// Logging middleware
app.use((0, morgan_1.default)('combined'));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', async (req, res) => {
    const pool = (0, database_2.getPool)();
    const dbStatus = pool && pool.connected ? 'Connected' : 'Disconnected';
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: dbStatus
    });
});
// API Routes
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/bookings', auth_2.authenticateToken, bookings_1.bookingRoutes);
app.use('/api/resources', auth_2.authenticateToken, resources_1.resourceRoutes);
app.use('/api/db', database_1.databaseRoutes); // Direct database access routes
app.use('/api/campus', campus_db_1.campusDbRoutes); // Campus database routes for existing schema
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});
// Initialize database connection and start server
async function startServer() {
    try {
        // Connect to database
        // Start server first - don't block on database
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log('✅ Application started successfully!');
        });
        // Connect to database in background (non-blocking)
        (0, database_2.connectToDatabase)()
            .then(() => {
            console.log('🔗 Database connected successfully');
        })
            .catch((error) => {
            console.error('❌ Database connection failed (app still running):', error);
        });
        return; // Exit function after starting server
        console.log('🔗 Database connected successfully');
        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log('✅ Application started successfully!');
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start the application
startServer();
exports.default = app;
//# sourceMappingURL=server-old.js.map