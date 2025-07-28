// controllers/flushController.js
const db = require('../db'); // Import your DB connection

exports.getTables = async (req, res) => {
  try {
    const [tables] = await db.query("SHOW TABLES");
    const tableNames = tables.map(row => Object.values(row)[0]);
    res.json(tableNames);
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ message: 'Error fetching tables' });
  }
};

exports.flushTable = async (req, res) => {
  const table = req.params.table;
  try {
    await db.query(`DELETE FROM \`${table}\``);
    res.json({ message: `All data deleted from ${table}` });
  } catch (err) {
    console.error(`Error deleting data from ${table}:`, err);
    res.status(500).json({ message: `Error deleting data from ${table}` });
  }
};

// NEW FUNCTION: Clear all data from all tables
exports.flushAllTables = async (req, res) => {
  try {
    // First, get all table names
    const [tables] = await db.query("SHOW TABLES");
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    if (tableNames.length === 0) {
      return res.json({ message: 'No tables found in database' });
    }

    // Disable foreign key checks to avoid constraint issues
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    
    // Delete data from all tables
    const deletePromises = tableNames.map(table => 
      db.query(`DELETE FROM \`${table}\``)
    );
    
    await Promise.all(deletePromises);
    
    // Re-enable foreign key checks
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    
    res.json({ 
      message: `All data deleted from ${tableNames.length} tables`,
      clearedTables: tableNames 
    });
  } catch (err) {
    console.error('Error clearing all tables:', err);
    // Re-enable foreign key checks in case of error
    try {
      await db.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (fkError) {
      console.error('Error re-enabling foreign key checks:', fkError);
    }
    res.status(500).json({ message: 'Error clearing all data from database' });
  }
};
