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

const populateData = async () => {
  try {
    console.log('🔄 Populating sample data...');
    
    // Disable FKs
    await queryPromise('SET FOREIGN_KEY_CHECKS=0');

    // Clear existing data to start fresh
    await queryPromise('DELETE FROM OfficePositions');
    await queryPromise('DELETE FROM Offices');
    await queryPromise('DELETE FROM Positions');
    console.log('✅ Cleared existing data');

    // Enable FKs
    await queryPromise('SET FOREIGN_KEY_CHECKS=1');
    
    // Insert offices
    const offices = [
      ['Head Office', 'Dubai, UAE'],
      ['Branch Office', 'Abu Dhabi, UAE'],
      ['Regional Office', 'Sharjah, UAE'],
      ['Sales Office', 'Ajman, UAE'],
      ['IT Hub', 'Ras Al Khaimah, UAE']
    ];
    
    for (const [name, location] of offices) {
      await queryPromise('INSERT INTO Offices (name, location) VALUES (?, ?)', [name, location]);
    }
    console.log('✅ Inserted offices');
    
    // Insert positions
    const positions = [
      ['Software Developer', 'Develops and maintains software applications'],
      ['HR Manager', 'Manages human resources and employee relations'],
      ['Floor Manager', 'Supervises floor operations and staff'],
      ['Accountant', 'Handles financial records and transactions'],
      ['Sales Representative', 'Manages client relationships and sales'],
      ['Marketing Executive', 'Handles marketing campaigns and brand management'],
      ['Customer Service Rep', 'Handles customer inquiries and support'],
      ['IT Support', 'Provides technical support and maintenance']
    ];
    
    for (const [title, description] of positions) {
      await queryPromise('INSERT INTO Positions (title, description) VALUES (?, ?)', [title, description]);
    }
    console.log('✅ Inserted positions');
    
    // Get inserted office and position IDs
    const officeResults = await queryPromise('SELECT id, name FROM Offices ORDER BY id');
    const positionResults = await queryPromise('SELECT id, title FROM Positions ORDER BY id');
    
    console.log('📍 Offices:', officeResults.map(o => `${o.name} (ID: ${o.id})`).join(', '));
    console.log('👔 Positions:', positionResults.map(p => `${p.title} (ID: ${p.id})`).join(', '));
    
    // Create office-position relationships
    const relationships = [
      // Head Office - All positions
      [officeResults[0].id, positionResults[0].id, '09:00:00', 8.0], // Software Developer
      [officeResults[0].id, positionResults[1].id, '09:00:00', 8.0], // HR Manager
      [officeResults[0].id, positionResults[2].id, '08:30:00', 8.5], // Floor Manager
      [officeResults[0].id, positionResults[3].id, '09:00:00', 8.0], // Accountant
      [officeResults[0].id, positionResults[7].id, '08:00:00', 8.0], // IT Support
      
      // Branch Office - Business focused
      [officeResults[1].id, positionResults[1].id, '09:00:00', 8.0], // HR Manager
      [officeResults[1].id, positionResults[2].id, '08:30:00', 8.5], // Floor Manager
      [officeResults[1].id, positionResults[3].id, '09:00:00', 8.0], // Accountant
      [officeResults[1].id, positionResults[4].id, '09:00:00', 8.0], // Sales Representative
      [officeResults[1].id, positionResults[6].id, '09:00:00', 8.0], // Customer Service Rep
      
      // Regional Office - Sales focused
      [officeResults[2].id, positionResults[2].id, '08:30:00', 8.5], // Floor Manager
      [officeResults[2].id, positionResults[4].id, '09:00:00', 8.0], // Sales Representative
      [officeResults[2].id, positionResults[5].id, '09:00:00', 8.0], // Marketing Executive
      [officeResults[2].id, positionResults[6].id, '09:00:00', 8.0], // Customer Service Rep
      
      // Sales Office - Sales only
      [officeResults[3].id, positionResults[4].id, '09:00:00', 8.0], // Sales Representative
      [officeResults[3].id, positionResults[5].id, '09:00:00', 8.0], // Marketing Executive
      [officeResults[3].id, positionResults[6].id, '09:00:00', 8.0], // Customer Service Rep
      
      // IT Hub - Tech focused
      [officeResults[4].id, positionResults[0].id, '09:00:00', 8.0], // Software Developer
      [officeResults[4].id, positionResults[7].id, '08:00:00', 8.0], // IT Support
      [officeResults[4].id, positionResults[2].id, '08:30:00', 8.5], // Floor Manager
    ];
    
    for (const [officeId, positionId, reportingTime, dutyHours] of relationships) {
      await queryPromise(
        'INSERT INTO OfficePositions (office_id, position_id, reporting_time, duty_hours) VALUES (?, ?, ?, ?)',
        [officeId, positionId, reportingTime, dutyHours]
      );
    }
    console.log('✅ Inserted office-position relationships');
    
    // Verify the data
    const verifyQuery = `
      SELECT 
        o.name as office_name,
        p.title as position_name,
        op.reporting_time,
        op.duty_hours
      FROM OfficePositions op
      JOIN Offices o ON op.office_id = o.id
      JOIN Positions p ON op.position_id = p.id
      ORDER BY o.name, p.title
    `;
    
    const verification = await queryPromise(verifyQuery);
    console.log('\n📋 Created Office-Position relationships:');
    verification.forEach(rel => {
      console.log(`  ${rel.office_name} → ${rel.position_name} (${rel.reporting_time}, ${rel.duty_hours}h)`);
    });
    
    console.log('\n🎉 Sample data population completed successfully!');
    console.log(`✅ Created ${officeResults.length} offices`);
    console.log(`✅ Created ${positionResults.length} positions`);
    console.log(`✅ Created ${relationships.length} office-position relationships`);
    console.log('\n🚀 The Office and Position dropdowns should now work perfectly!');
    
  } catch (error) {
    console.error('❌ Data population failed:', error);
  } finally {
    db.end();
  }
};

populateData();
