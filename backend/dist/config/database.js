"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.getPool = exports.connectToDatabase = void 0;
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
// Ensure environment variables are loaded
dotenv_1.default.config();
const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'campus_booking_db',
    user: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || 'password',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true', // Use encryption for Azure SQL
        trustServerCertificate: false, // Azure SQL requires this to be false
        enableArithAbort: true, // Required for Azure SQL
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};
let pool = null;
const connectToDatabase = async () => {
    try {
        if (!pool) {
            pool = await mssql_1.default.connect(config);
            console.log('✅ Connected to SQL Server database');
        }
        return pool;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
};
exports.connectToDatabase = connectToDatabase;
const getPool = () => pool;
exports.getPool = getPool;
const closeDatabase = async () => {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('🔌 Database connection closed');
    }
};
exports.closeDatabase = closeDatabase;
//# sourceMappingURL=database.js.map