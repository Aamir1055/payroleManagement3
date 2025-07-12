const db = require('../db');

// ✅ Create Attendance table using promise-based query
async function createAttendanceTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS Attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        date DATE NOT NULL,
        punch_in TIME,
        punch_out TIME,
        status ENUM('present', 'absent', 'late') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Attendance table created');
  } catch (error) {
    console.error('❌ Error creating Attendance table:', error);
  }
}

// ✅ Example function to use the attendance table (optional usage)
async function insertDummyAttendanceRecord() {
  try {
    const [result] = await db.query(`
      INSERT INTO Attendance (employee_id, date, status)
      VALUES (?, ?, ?)
    `, [1, new Date(), 'present']);

    console.log('✅ Dummy record inserted:', result.insertId);
  } catch (error) {
    console.error('❌ Failed to insert dummy attendance:', error);
  }
}

// Run the table creation when this file is imported (optional)
createAttendanceTable();
// insertDummyAttendanceRecord(); // Uncomment if you want to insert test data

module.exports = {
  createAttendanceTable,
  insertDummyAttendanceRecord
};
