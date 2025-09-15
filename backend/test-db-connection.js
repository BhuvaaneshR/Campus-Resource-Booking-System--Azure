const sql = require('mssql');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const config = {
  server: process.env.DB_SERVER || 'campusbookingserver.database.windows.net',
  database: process.env.DB_DATABASE || 'campusbookingdb',
  user: process.env.DB_USERNAME || 'campusbookingserver',
  password: process.env.DB_PASSWORD || 'Campusresourcebooking@220701045',
  options: {
    encrypt: true, // Use this if you're on Windows Azure
    trustServerCertificate: false, // Change to true for local dev / self-signed certs
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log('Server:', config.server);
  console.log('Database:', config.database);
  console.log('User:', config.user);
  console.log('Encrypt:', config.options.encrypt);
  
  try {
    console.log('⏳ Attempting to connect...');
    const pool = await sql.connect(config);
    console.log('✅ Successfully connected to SQL Server!');
    
    // Test a simple query
    const result = await pool.request().query('SELECT @@VERSION AS version');
    console.log('📊 Database version:', result.recordset[0].version);
    
    await pool.close();
    console.log('🔌 Connection closed successfully');
  } catch (err) {
    console.error('❌ Connection failed:');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Full error:', err);
  }
}

testConnection();
