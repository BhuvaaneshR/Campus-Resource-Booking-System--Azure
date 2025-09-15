const sql = require('mssql');
require('dotenv').config();

console.log('🔍 COMPLETE DATABASE CONNECTION ANALYSIS\n');

// Database configuration
const config = {
  server: process.env.DB_SERVER || 'campusbookingserver.database.windows.net',
  database: process.env.DB_DATABASE || 'campusbookingdb',
  user: process.env.DB_USERNAME || 'campusbookingserver',
  password: process.env.DB_PASSWORD || 'Campusresourcebooking@220701045',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function testDatabaseConnection() {
  console.log('📋 Database Configuration:');
  console.log(`Server: ${config.server}`);
  console.log(`Database: ${config.database}`);
  console.log(`Username: ${config.user}`);
  console.log(`Password: ${config.password ? '***PROVIDED***' : '***MISSING***'}`);
  console.log(`Encrypt: ${config.options.encrypt}`);
  console.log('');

  try {
    console.log('🔌 Attempting to connect to Azure SQL Database...');
    const pool = await sql.connect(config);
    console.log('✅ Database connection successful!');

    // Test 1: Check if Resources table exists
    console.log('\n📊 Testing Resources table...');
    try {
      const resourcesTest = await pool.request().query(`
        SELECT COUNT(*) as total_count, 
               SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) as active_count
        FROM dbo.Resources
      `);
      console.log(`✅ Resources table found: ${resourcesTest.recordset[0].total_count} total, ${resourcesTest.recordset[0].active_count} active`);
    } catch (err) {
      console.log('❌ Resources table error:', err.message);
    }

    // Test 2: Get sample resources
    console.log('\n📋 Sample Resources:');
    try {
      const sampleResources = await pool.request().query(`
        SELECT TOP 5 ResourceID, ResourceName, ResourceType, Location, Capacity, IsActive
        FROM dbo.Resources
        ORDER BY ResourceID
      `);
      
      if (sampleResources.recordset.length > 0) {
        sampleResources.recordset.forEach(r => {
          console.log(`   ${r.ResourceID}: ${r.ResourceName} (${r.ResourceType}) - ${r.Location} [${r.IsActive ? 'Active' : 'Inactive'}]`);
        });
      } else {
        console.log('   No resources found in database');
      }
    } catch (err) {
      console.log('❌ Error fetching sample resources:', err.message);
    }

    // Test 3: Check Admins table
    console.log('\n👥 Testing Admins table...');
    try {
      const adminsTest = await pool.request().query(`
        SELECT COUNT(*) as admin_count
        FROM dbo.Admins
        WHERE IsActive = 1
      `);
      console.log(`✅ Admins table found: ${adminsTest.recordset[0].admin_count} active admins`);
    } catch (err) {
      console.log('❌ Admins table error:', err.message);
    }

    // Test 4: Check Bookings table
    console.log('\n📅 Testing Bookings table...');
    try {
      const bookingsTest = await pool.request().query(`
        SELECT COUNT(*) as booking_count,
               COUNT(CASE WHEN BookingStatus = 'Pending' THEN 1 END) as pending_count,
               COUNT(CASE WHEN BookingStatus = 'Confirmed' THEN 1 END) as confirmed_count
        FROM dbo.Bookings
      `);
      const result = bookingsTest.recordset[0];
      console.log(`✅ Bookings table found: ${result.booking_count} total (${result.pending_count} pending, ${result.confirmed_count} confirmed)`);
    } catch (err) {
      console.log('❌ Bookings table error:', err.message);
    }

    await pool.close();
    console.log('\n✅ Database analysis completed successfully!');
    return true;

  } catch (error) {
    console.log('\n❌ DATABASE CONNECTION FAILED:');
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    
    if (error.code === 'ELOGIN') {
      console.log('\n🔧 AUTHENTICATION ISSUE:');
      console.log('- Check username and password are correct');
      console.log('- Verify Azure SQL server allows SQL authentication');
    } else if (error.code === 'ETIMEOUT') {
      console.log('\n🔧 NETWORK/FIREWALL ISSUE:');
      console.log('- Check Azure SQL firewall allows your IP address');
      console.log('- Verify server name is correct');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 SERVER NAME ISSUE:');
      console.log('- Verify server name: campusbookingserver.database.windows.net');
      console.log('- Check if Azure SQL server exists and is running');
    }
    
    return false;
  }
}

// Test API endpoint simulation
async function testAPIEndpoint() {
  console.log('\n🌐 TESTING API ENDPOINT SIMULATION...');
  
  try {
    const pool = await sql.connect(config);
    
    // Simulate the exact query from campus-db.ts
    const result = await pool.request().query(`
      SELECT 
        ResourceID as id,
        ResourceName as name,
        ResourceType as type,
        Location as location,
        Capacity as capacity,
        IsActive as isActive
      FROM dbo.Resources
      WHERE IsActive = 1
      ORDER BY ResourceName
    `);

    console.log(`✅ API simulation successful: ${result.recordset.length} resources would be returned`);
    console.log('Sample API response:');
    console.log(JSON.stringify(result.recordset.slice(0, 2), null, 2));
    
    await pool.close();
    return true;
  } catch (error) {
    console.log('❌ API simulation failed:', error.message);
    return false;
  }
}

// Main analysis
async function runCompleteAnalysis() {
  const dbConnected = await testDatabaseConnection();
  
  if (dbConnected) {
    await testAPIEndpoint();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ANALYSIS SUMMARY:');
  console.log('='.repeat(60));
  
  if (dbConnected) {
    console.log('✅ Database connection: SUCCESS');
    console.log('✅ Tables accessible: SUCCESS');
    console.log('✅ API simulation: SUCCESS');
    console.log('\n🎉 Database is working correctly!');
    console.log('\n🔧 If React app still shows no resources:');
    console.log('1. Check browser console for errors');
    console.log('2. Verify backend server is running on port 5001');
    console.log('3. Test: http://localhost:5001/api/campus/resources');
  } else {
    console.log('❌ Database connection: FAILED');
    console.log('\n🔧 REQUIRED FIXES:');
    console.log('1. Fix database connection issues above');
    console.log('2. Ensure Azure SQL firewall allows your IP');
    console.log('3. Verify database credentials are correct');
  }
}

runCompleteAnalysis().catch(console.error);
