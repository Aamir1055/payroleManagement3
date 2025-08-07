// Migration to create approved_leaves table
const db = require('../db');

async function createApprovedLeavesTable() {
  const connection = await db.getConnection();
  
  try {
    console.log('Starting migration: Creating approved_leaves table...');
    
    // Create approved_leaves table to store approved leave information
    await connection.query(`
      CREATE TABLE approved_leaves (
        id INT(11) NOT NULL AUTO_INCREMENT,
        employee_id VARCHAR(10) NOT NULL,
        date DATE NOT NULL,
        approved_by VARCHAR(100) DEFAULT NULL,
        reason TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
        PRIMARY KEY (id),
        UNIQUE KEY unique_employee_date (employee_id, date),
        FOREIGN KEY (employee_id) REFERENCES employees(employeeId) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('✅ Created approved_leaves table');
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  createApprovedLeavesTable()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createApprovedLeavesTable };
