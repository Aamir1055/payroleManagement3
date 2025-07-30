const { query } = require('./utils/dbPromise');

async function debugUsers() {
  try {
    console.log('=== Debugging User Office Assignments ===');
    
    // Check all users (try both cases)
    console.log('Trying lowercase users table...');
    let users;
    try {
      users = await query('SELECT id, username, role FROM users');
      console.log('All users (lowercase):', users);
    } catch (err1) {
      console.log('Lowercase failed, trying uppercase Users...');
      try {
        users = await query('SELECT id, username, role FROM Users');
        console.log('All users (uppercase):', users);
      } catch (err2) {
        console.error('Both cases failed:', err1.message, err2.message);
        return;
      }
    }
    
    // Check all user_offices
    const userOffices = await query(`
      SELECT uo.user_id, uo.office_id, u.username, o.name as office_name 
      FROM user_offices uo 
      LEFT JOIN users u ON uo.user_id = u.id 
      LEFT JOIN offices o ON uo.office_id = o.id
    `);
    console.log('User office assignments:', userOffices);
    
    // Check all offices
    const offices = await query('SELECT id, name FROM offices');
    console.log('All offices:', offices);
    
    // Check specific user (floor manager)
    const floorManagerUser = await query('SELECT id, username, role FROM users WHERE role = ?', ['floor_manager']);
    console.log('Floor manager users:', floorManagerUser);
    
    if (floorManagerUser.length > 0) {
      const userId = floorManagerUser[0].id;
      const userOfficeAssignments = await query('SELECT office_id FROM user_offices WHERE user_id = ?', [userId]);
      console.log(`Office assignments for user ${userId}:`, userOfficeAssignments);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  process.exit(0);
}

debugUsers();
