"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.getPool = exports.connectToDatabase = void 0;
const mssql_1 = __importDefault(require("mssql"));
const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'campus_booking_db',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'password',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
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