const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

const testEmployees = async () => {
  try {
    console.log('🧪 Testing employees API...\n');

    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Test employees endpoint
    const employeesResponse = await axios.get(`${BASE_URL}/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('👥 Employees API Response:');
    console.log(JSON.stringify(employeesResponse.data, null, 2));
    console.log(`✅ Employees endpoint returned ${employeesResponse.data.length} employees\n`);

    // Test employee count
    const countResponse = await axios.get(`${BASE_URL}/employees/count`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📊 Employee count:', countResponse.data);

    // Test next employee ID
    const nextIdResponse = await axios.get(`${BASE_URL}/employees/next-id`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('🆔 Next employee ID:', nextIdResponse.data);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
};

testEmployees();
