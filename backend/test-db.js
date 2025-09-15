const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER || 'campusbookingserver.database.windows.net',
  database: process.env.DB_DATABASE || 'campusbookingdb',
  user: process.env.DB_USERNAME || 'campusbookingserver',
  password: process.env.DB_PASSWORD || 'Campusresourcebooking@220701045',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || true,
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Config:', {
      server: config.server,
      database: config.database,
      user: config.user,
      encrypt: config.options.encrypt
    });

    const pool = await sql.connect(config);
    console.log('✅ Database connected successfully!');

    // Test query to fetch resources
    const result = await pool.request().query('SELECT * FROM dbo.Resources');
    console.log(`✅ Found ${result.recordset.length} resources in database:`);
    
    result.recordset.forEach((resource, index) => {
      console.log(`${index + 1}. ${resource.ResourceName} (${resource.ResourceType}) - ${resource.Location}`);
    });

    await pool.close();
    console.log('✅ Database connection test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();
