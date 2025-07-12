const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';

// Test function to login and get token
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return null;
  }
}

// Test function to fetch offices
async function testOffices(token) {
  try {
    const response = await axios.get(`${API_BASE}/masters/offices`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('📍 Offices API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Offices API failed:', error.response?.data || error.message);
    return null;
  }
}

// Test function to fetch positions
async function testPositions(token) {
  try {
    const response = await axios.get(`${API_BASE}/masters/positions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('👔 Positions API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Positions API failed:', error.response?.data || error.message);
    return null;
  }
}

// Test function to fetch office-positions
async function testOfficePositions(token) {
  try {
    const response = await axios.get(`${API_BASE}/masters/office-positions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('🔗 Office-Positions API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Office-Positions API failed:', error.response?.data || error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Testing API endpoints...\n');
  
  // Test login
  console.log('🔐 Testing login...');
  const token = await login();
  if (!token) {
    console.error('❌ Login failed, cannot proceed with tests');
    return;
  }
  console.log('✅ Login successful\n');
  
  // Test offices endpoint
  console.log('🏢 Testing offices endpoint...');
  const offices = await testOffices(token);
  if (!offices) {
    console.error('❌ Offices endpoint failed');
  } else {
    console.log(`✅ Offices endpoint returned ${offices.length} offices\n`);
  }
  
  // Test positions endpoint
  console.log('💼 Testing positions endpoint...');
  const positions = await testPositions(token);
  if (!positions) {
    console.error('❌ Positions endpoint failed');
  } else {
    console.log(`✅ Positions endpoint returned ${positions.length} positions\n`);
  }
  
  // Test office-positions endpoint
  console.log('🔗 Testing office-positions endpoint...');
  const officePositions = await testOfficePositions(token);
  if (!officePositions) {
    console.error('❌ Office-Positions endpoint failed');
  } else {
    console.log(`✅ Office-Positions endpoint returned ${officePositions.length} office groups\n`);
  }
  
  console.log('🎉 API tests completed!');
}

// Run the tests
runTests().catch(console.error);
