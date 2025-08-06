// Migration to add approved_leaves column to payroll table
const db = require('../db');

async function addApprovedLeavesToPayroll() {
  const connection = await db.getConnection();
  
  try {
    console.log('Starting migration: Adding approved_leaves column to payroll table...');
    
    // Add approved_leaves column to payroll table to track approved leaves count
    await connection.query(`
      ALTER TABLE payroll 
      ADD COLUMN approved_leaves INT(11) DEFAULT 0 AFTER excess_leaves
    `);
    console.log('✅ Added approved_leaves column to payroll table');
    
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
  addApprovedLeavesToPayroll()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addApprovedLeavesToPayroll };
