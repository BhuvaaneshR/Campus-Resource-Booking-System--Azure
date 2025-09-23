import sql from 'mssql';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const config: sql.config = {
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

let pool: sql.ConnectionPool | null = null;

export const connectToDatabase = async (): Promise<sql.ConnectionPool> => {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log('✅ Connected to SQL Server database');
    }
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const getPool = (): sql.ConnectionPool | null => pool;

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Database connection closed');
  }
};
