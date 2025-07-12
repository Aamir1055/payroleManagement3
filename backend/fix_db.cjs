const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll_system2'
});

const queryPromise = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

const fixDatabase = async () => {
  try {
    console.log('🔧 Fixing database office-position relationships...');
    
    // First, let's check if we have offices and positions
    const offices = await queryPromise('SELECT * FROM Offices');
    const positions = await queryPromise('SELECT * FROM Positions');
    
    console.log(`📍 Found ${offices.length} offices:`);
    offices.forEach(office => {
      console.log(`  - ${office.name} (ID: ${office.id})`);
    });
    
    console.log(`👔 Found ${positions.length} positions:`);
    positions.forEach(position => {
      console.log(`  - ${position.title} (ID: ${position.id})`);
    });
    
    // Check existing office-position relationships
    const existingRelationships = await queryPromise('SELECT * FROM OfficePositions');
    console.log(`🔗 Found ${existingRelationships.length} existing office-position relationships`);
    
    // Insert office-position relationships
    const insertOfficePositions = `
      INSERT IGNORE INTO OfficePositions (office_id, position_id, reporting_time, duty_hours) VALUES
      -- Head Office relationships
      ((SELECT id FROM Offices WHERE name = 'Head Office'), (SELECT id FROM Positions WHERE title = 'Software Developer'), '09:00:00', 8.0),
      ((SELECT id FROM Offices WHERE name = 'Head Office'), (SELECT id FROM Positions WHERE title = 'HR Manager'), '09:00:00', 8.0),
      ((SELECT id FROM Offices WHERE name = 'Head Office'), (SELECT id FROM Positions WHERE title = 'Floor Manager'), '08:30:00', 8.5),
      ((SELECT id FROM Offices WHERE name = 'Head Office'), (SELECT id FROM Positions WHERE title = 'Accountant'), '09:00:00', 8.0),
      
      -- Branch Office relationships
      ((SELECT id FROM Offices WHERE name = 'Branch Office'), (SELECT id FROM Positions WHERE title = 'Software Developer'), '09:00:00', 8.0),
      ((SELECT id FROM Offices WHERE name = 'Branch Office'), (SELECT id FROM Positions WHERE title = 'Sales Representative'), '09:00:00', 8.0),
      ((SELECT id FROM Offices WHERE name = 'Branch Office'), (SELECT id FROM Positions WHERE title = 'Floor Manager'), '08:30:00', 8.5),
      
      -- Regional Office relationships
      ((SELECT id FROM Offices WHERE name = 'Regional Office'), (SELECT id FROM Positions WHERE title = 'Sales Representative'), '09:00:00', 8.0),
      ((SELECT id FROM Offices WHERE name = 'Regional Office'), (SELECT id FROM Positions WHERE title = 'Floor Manager'), '08:30:00', 8.5),
      ((SELECT id FROM Offices WHERE name = 'Regional Office'), (SELECT id FROM Positions WHERE title = 'Accountant'), '09:00:00', 8.0)
    `;
    
    await queryPromise(insertOfficePositions);
    
    // Check how many relationships were created
    const newRelationships = await queryPromise('SELECT * FROM OfficePositions');
    console.log(`✅ Now have ${newRelationships.length} total office-position relationships`);
    
    // Display the relationships for verification
    const relationshipDetails = await queryPromise(`
      SELECT 
        o.name as office_name,
        p.title as position_name,
        op.reporting_time,
        op.duty_hours
      FROM OfficePositions op
      JOIN Offices o ON op.office_id = o.id
      JOIN Positions p ON op.position_id = p.id
      ORDER BY o.name, p.title
    `);
    
    console.log('\n📋 Office-Position relationships:');
    relationshipDetails.forEach(rel => {
      console.log(`  ${rel.office_name} → ${rel.position_name} (${rel.reporting_time}, ${rel.duty_hours}h)`);
    });
    
    console.log('\n🎉 Database fix completed successfully!');
    console.log('🚀 The Office and Position dropdowns should now work properly.');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
  } finally {
    db.end();
  }
};

fixDatabase();
