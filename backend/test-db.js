const { query } = require('./utils/dbPromise');

async function testDB() {
  try {
    console.log('Testing database connection...');
    
    // Test basic query
    const users = await query('SELECT COUNT(*) as count FROM Users');
    console.log('Users count:', users[0].count);
    
    const offices = await query('SELECT COUNT(*) as count FROM Offices');
    console.log('Offices count:', offices[0].count);
    
    const positions = await query('SELECT COUNT(*) as count FROM Positions');
    console.log('Positions count:', positions[0].count);
    
    console.log('✅ Database connection test successful!');
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
  }
}

testDB();
