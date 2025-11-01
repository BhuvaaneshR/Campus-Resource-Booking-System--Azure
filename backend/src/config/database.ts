// src/config/database.ts
import sql, { ConnectionPool, config as SQLConfig } from 'mssql';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const config: SQLConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'campus_booking_db',
  user: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '1433', 10),

  // Top-level timeouts supported by `mssql`
  connectionTimeout: 60_000,
  requestTimeout: 60_000,

  // Only supported/typed tedious options
  options: {
    encrypt: true,                 // Azure SQL requires encryption
    trustServerCertificate: false, // prefer false in production
    enableArithAbort: true,
  },

  // Supported pool options
  pool: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30_000,
  },
};

let pool: ConnectionPool | null = null;

export const connectToDatabase = async (): Promise<ConnectionPool> => {
  let retries = 3;

  while (retries > 0) {
    try {
      if (!pool) {
        console.log(`🔄 Attempting to connect to database (${4 - retries}/3)...`);
        console.log(`📡 Server: ${config.server}`);
        console.log(`🗄️  Database: ${config.database}`);
        console.log(`👤 Username: ${config.user}`);

        pool = new sql.ConnectionPool(config);

        // Connection events
        pool.on('connect', () => {
          console.log('✅ Database pool connected');
        });

        pool.on('error', (err) => {
          console.error('❌ Database pool error:', err);
          pool = null;
        });

        await pool.connect();
        console.log('✅ Connected to SQL Server database successfully');

        // Sanity test
        await pool.request().query('SELECT 1 as test');
        console.log('✅ Database connection test successful');
      }
      return pool;
    } catch (error: any) {
      console.error(`❌ Database connection attempt ${4 - retries}/3 failed:`);
      console.error(`   Error code: ${error.code}`);
      console.error(`   Error message: ${error.message}`);

      if (error.code === 'ESOCKET') {
        console.error('   🔥 ESOCKET Error - This usually means:');
        console.error('      • Azure SQL Server firewall is blocking the connection');
        console.error('      • Server name is incorrect');
        console.error('      • Network connectivity issues');
        console.error('      • Azure App Service needs to be added to SQL firewall rules');
      }

      if (pool) {
        try {
          await pool.close();
        } catch (closeError) {
          console.error('Error closing failed connection:', closeError);
        }
        pool = null;
      }

      retries--;
      if (retries === 0) {
        console.error('❌ All database connection attempts failed');
        throw error;
      }

      console.log('⏳ Waiting 5 seconds before retry...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  throw new Error('Failed to connect to database after all retries');
};

export const getPool = (): ConnectionPool | null => pool;

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Database connection closed');
  }
};

// Lightweight health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    if (!pool) return false;
    const result = await pool.request().query('SELECT 1 as health_check');
    return result.recordset.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};
