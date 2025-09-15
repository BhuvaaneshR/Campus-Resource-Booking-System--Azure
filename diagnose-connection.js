const http = require('http');
const sql = require('mssql');
require('dotenv').config({ path: './backend/.env' });

console.log('🔍 Campus Booking System - Connection Diagnostics\n');

// Test 1: Check if backend server is running
async function testBackendServer() {
  console.log('1️⃣ Testing Backend Server...');
  
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5001/api/campus/test', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Backend server is running on port 5001');
        console.log('Response:', data);
        resolve(true);
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Backend server is NOT running on port 5001');
      console.log('Error:', err.message);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Backend server timeout - not responding');
      req.destroy();
      resolve(false);
    });
  });
}

// Test 2: Direct database connection
async function testDatabaseConnection() {
  console.log('\n2️⃣ Testing Direct Database Connection...');
  
  const config = {
    server: process.env.DB_SERVER || 'campusbookingserver.database.windows.net',
    database: process.env.DB_DATABASE || 'campusbookingdb',
    user: process.env.DB_USERNAME || 'campusbookingserver',
    password: process.env.DB_PASSWORD || 'Campusresourcebooking@220701045',
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };

  try {
    console.log('Database config:', {
      server: config.server,
      database: config.database,
      user: config.user,
      encrypt: config.options.encrypt
    });

    const pool = await sql.connect(config);
    console.log('✅ Database connection successful!');

    // Test Resources table
    const resourcesResult = await pool.request().query('SELECT COUNT(*) as count FROM dbo.Resources WHERE IsActive = 1');
    console.log(`✅ Found ${resourcesResult.recordset[0].count} active resources`);

    // Get sample resources
    const sampleResources = await pool.request().query('SELECT TOP 3 ResourceID, ResourceName, ResourceType, Location FROM dbo.Resources WHERE IsActive = 1');
    console.log('📋 Sample resources:');
    sampleResources.recordset.forEach(r => {
      console.log(`   - ${r.ResourceName} (${r.ResourceType}) at ${r.Location}`);
    });

    await pool.close();
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

// Test 3: Check environment variables
function testEnvironmentVariables() {
  console.log('\n3️⃣ Checking Environment Variables...');
  
  const requiredVars = ['DB_SERVER', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD'];
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${varName === 'DB_PASSWORD' ? '***hidden***' : value}`);
    } else {
      console.log(`❌ ${varName}: NOT SET`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

// Test 4: Check if required packages are installed
function testPackages() {
  console.log('\n4️⃣ Checking Required Packages...');
  
  try {
    require('mssql');
    console.log('✅ mssql package is installed');
  } catch (e) {
    console.log('❌ mssql package is missing - run: npm install mssql');
    return false;
  }
  
  try {
    require('express');
    console.log('✅ express package is installed');
  } catch (e) {
    console.log('❌ express package is missing - run: npm install express');
    return false;
  }
  
  return true;
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('Starting diagnostics...\n');
  
  const packagesOk = testPackages();
  const envVarsOk = testEnvironmentVariables();
  const backendRunning = await testBackendServer();
  const dbConnected = await testDatabaseConnection();
  
  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  console.log('='.repeat(50));
  console.log(`Packages installed: ${packagesOk ? '✅' : '❌'}`);
  console.log(`Environment variables: ${envVarsOk ? '✅' : '❌'}`);
  console.log(`Backend server running: ${backendRunning ? '✅' : '❌'}`);
  console.log(`Database connection: ${dbConnected ? '✅' : '❌'}`);
  
  console.log('\n🔧 NEXT STEPS:');
  if (!packagesOk) {
    console.log('1. Install missing packages: cd backend && npm install');
  }
  if (!envVarsOk) {
    console.log('2. Check backend/.env file has all database credentials');
  }
  if (!backendRunning) {
    console.log('3. Start backend server: cd backend && npm run build && npm start');
  }
  if (!dbConnected && envVarsOk) {
    console.log('4. Check Azure SQL firewall allows your IP address');
  }
  
  if (backendRunning && dbConnected) {
    console.log('🎉 Everything looks good! Try refreshing your React app.');
  }
}

runDiagnostics().catch(console.error);
