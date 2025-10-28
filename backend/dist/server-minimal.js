"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '8080', 10);
console.log('🔍 Starting minimal server...');
console.log(`🔍 PORT from env: ${process.env.PORT}`);
console.log(`🔍 Calculated PORT: ${PORT}`);
console.log(`🔍 NODE_ENV: ${process.env.NODE_ENV}`);
// Simple health check
app.get('/health', (req, res) => {
    console.log('🔍 Health check endpoint hit');
    res.json({
        status: 'OK',
        port: PORT,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// Root endpoint
app.get('/', (req, res) => {
    console.log('🔍 Root endpoint hit');
    res.json({
        message: 'Minimal server is running!',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});
// Start server
try {
    console.log('🔍 About to start server...');
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 MINIMAL SERVER RUNNING ON PORT ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        console.log('✅ MINIMAL APPLICATION STARTED SUCCESSFULLY!');
    });
}
catch (error) {
    console.error('❌ Failed to start minimal server:', error);
    process.exit(1);
}
exports.default = app;
//# sourceMappingURL=server-minimal.js.map