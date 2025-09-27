// Test script to check backend connection and routes
const fetch = require('node-fetch');

async function testBackendConnection() {
  const baseUrl = 'http://localhost:5001';
  
  console.log('Testing backend connection...');
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed:', healthData);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ Cannot connect to backend server:', error.message);
    console.log('Please ensure the backend server is running on port 5001');
    return;
  }
  
  try {
    // Test profile-auth route
    console.log('\n2. Testing profile-auth route...');
    const authResponse = await fetch(`${baseUrl}/api/profile-auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpass'
      })
    });
    
    const authData = await authResponse.json();
    console.log('Profile auth endpoint response:', authData);
    
    if (authResponse.status === 401 && authData.error?.includes('Invalid email address')) {
      console.log('✅ Profile auth endpoint is working (expected 401 for non-existent email)');
    } else {
      console.log('Route exists but returned unexpected response');
    }
  } catch (error) {
    console.log('❌ Error testing profile-auth route:', error.message);
  }
  
  console.log('\nIf you see network errors above, please:');
  console.log('1. Make sure the backend server is running: npm start (in backend folder)');
  console.log('2. Check that it\'s running on port 5001');
  console.log('3. Verify no firewall is blocking the connection');
}

testBackendConnection();
