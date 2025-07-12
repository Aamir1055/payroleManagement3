const { query } = require('../utils/dbPromise');

// ------------------ OFFICE CONTROLLERS ------------------

// ✅ Get all offices with employee counts and total salaries
exports.getAllOffices = async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        o.id as office_id,
        o.name as office_name,
        o.location,
        COALESCE(emp_summary.employeeCount, 0) as employeeCount,
        COALESCE(emp_summary.totalSalary, 0) as totalSalary,
        o.created_at
      FROM Offices o
      LEFT JOIN (
        SELECT 
          office_id, 
          COUNT(*) AS employeeCount, 
          SUM(salary) AS totalSalary 
        FROM Employees 
        WHERE status = 1
        GROUP BY office_id
      ) emp_summary ON o.id = emp_summary.office_id
      ORDER BY o.name
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching offices:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Create a new office
exports.createOffice = async (req, res) => {
  try {
    const { name, location } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Office name is required' });
    }
    
    const result = await query(
      'INSERT INTO Offices (name, location) VALUES (?, ?)', 
      [name, location || '']
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      name, 
      location: location || '',
      message: 'Office created successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Office name already exists' });
    }
    console.error('Error creating office:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Create office with positions and their schedules
exports.createOfficeWithPositions = (req, res) => {
  const { officeName, location, positions } = req.body;
  
  if (!officeName || !positions || positions.length === 0) {
    return res.status(400).json({ error: 'Office name and positions are required' });
  }

  // Start transaction
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    // First, create the office
    db.query(
      'INSERT INTO Offices (name, location) VALUES (?, ?)', 
      [officeName, location || ''], 
      (err, officeResult) => {
        if (err) {
          return db.rollback(() => {
            if (err.code === 'ER_DUP_ENTRY') {
              res.status(400).json({ error: 'Office name already exists' });
            } else {
              res.status(500).json({ error: err.message });
            }
          });
        }

        const officeId = officeResult.insertId;
        let positionsProcessed = 0;
        let errors = [];

        // For each position, create it if it doesn't exist and create office-position relationship
        positions.forEach((position, index) => {
          const { positionName, reportingTime, dutyHours } = position;
          
          if (!positionName || !reportingTime || !dutyHours) {
            errors.push(`Position at index ${index} is missing required fields`);
            positionsProcessed++;
            checkCompletion();
            return;
          }

          // Check if position exists, if not create it
          db.query('SELECT id FROM Positions WHERE title = ?', [positionName], (err, posResult) => {
            if (err) {
              errors.push(`Error checking position ${positionName}: ${err.message}`);
              positionsProcessed++;
              checkCompletion();
              return;
            }

            let positionId;
            
            if (posResult.length > 0) {
              // Position exists
              positionId = posResult[0].id;
              createOfficePositionRelation();
            } else {
              // Create new position
              db.query('INSERT INTO Positions (title) VALUES (?)', [positionName], (err, newPosResult) => {
                if (err) {
                  errors.push(`Error creating position ${positionName}: ${err.message}`);
                  positionsProcessed++;
                  checkCompletion();
                  return;
                }
                positionId = newPosResult.insertId;
                createOfficePositionRelation();
              });
            }

            function createOfficePositionRelation() {
              // Create office-position relationship with schedule
              const insertQuery = `
                INSERT INTO OfficePositions (office_id, position_id, reporting_time, duty_hours)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                reporting_time = VALUES(reporting_time),
                duty_hours = VALUES(duty_hours)
              `;
              
              db.query(insertQuery, [officeId, positionId, reportingTime, dutyHours], (err) => {
                if (err) {
                  errors.push(`Error creating office-position relation for ${positionName}: ${err.message}`);
                }
                positionsProcessed++;
                checkCompletion();
              });
            }
          });
        });

        function checkCompletion() {
          if (positionsProcessed === positions.length) {
            if (errors.length > 0) {
              return db.rollback(() => {
                res.status(500).json({ error: 'Some positions failed to create', details: errors });
              });
            }
            
            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ error: err.message });
                });
              }
              res.status(201).json({ 
                message: 'Office and positions created successfully',
                officeId,
                officeName,
                positionsCount: positions.length
              });
            });
          }
        }
      }
    );
  });
};

// ✅ Get office positions with schedules for dropdown population
exports.getOfficePositions = (req, res) => {
  const query = `
    SELECT 
      o.id as office_id,
      o.name as office_name,
      o.location,
      p.id as position_id,
      p.title as position_name,
      op.reporting_time,
      op.duty_hours
    FROM Offices o
    LEFT JOIN OfficePositions op ON o.id = op.office_id
    LEFT JOIN Positions p ON op.position_id = p.id
    ORDER BY o.name, p.title
  `;
  
  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Group by office
    const groupedData = {};
    result.forEach(row => {
      if (!groupedData[row.office_name]) {
        groupedData[row.office_name] = {
          office_id: row.office_id,
          office_name: row.office_name,
          location: row.location,
          positions: []
        };
      }
      
      if (row.position_name) {
        groupedData[row.office_name].positions.push({
          position_id: row.position_id,
          position_name: row.position_name,
          reporting_time: row.reporting_time,
          duty_hours: row.duty_hours
        });
      }
    });
    
    res.json(Object.values(groupedData));
  });
};

// ✅ Get position details for specific office (for employee form auto-population)
exports.getOfficePositionDetails = (req, res) => {
  const { officeId, positionId } = req.params;
  
  const query = `
    SELECT 
      op.reporting_time,
      op.duty_hours,
      o.name as office_name,
      p.title as position_name
    FROM OfficePositions op
    JOIN Offices o ON op.office_id = o.id
    JOIN Positions p ON op.position_id = p.id
    WHERE op.office_id = ? AND op.position_id = ?
  `;
  
  db.query(query, [officeId, positionId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Office-Position combination not found' });
    }
    
    res.json(result[0]);
  });
};

// ------------------ POSITION CONTROLLERS ------------------

// ✅ Get all positions
exports.getAllPositions = async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        id as position_id,
        title as position_name,
        description
      FROM Positions 
      ORDER BY title
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching positions:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Create a new position
exports.createPosition = (req, res) => {
  const { title, description } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Position title is required' });
  }
  
  db.query(
    'INSERT INTO Positions (title, description) VALUES (?, ?)', 
    [title, description || ''], 
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Position title already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ 
        id: result.insertId, 
        title, 
        description: description || '',
        message: 'Position created successfully'
      });
    }
  );
};

// ✅ Create office-specific position with schedule (handles names instead of IDs)
exports.createOfficeSpecificPosition = (req, res) => {
  const { officeName, positionName, reportingTime, dutyHours } = req.body;
  
  if (!officeName || !positionName || !reportingTime || !dutyHours) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // First, get office ID
  db.query('SELECT id FROM Offices WHERE name = ?', [officeName], (err, officeResult) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (officeResult.length === 0) {
      return res.status(404).json({ error: 'Office not found' });
    }
    
    const officeId = officeResult[0].id;
    
    // Check if position exists, if not create it
    db.query('SELECT id FROM Positions WHERE title = ?', [positionName], (err, posResult) => {
      if (err) return res.status(500).json({ error: err.message });
      
      let positionId;
      
      if (posResult.length > 0) {
        // Position exists, use existing ID
        positionId = posResult[0].id;
        createOfficePositionRelation();
      } else {
        // Create new position
        db.query('INSERT INTO Positions (title) VALUES (?)', [positionName], (err, newPosResult) => {
          if (err) return res.status(500).json({ error: err.message });
          positionId = newPosResult.insertId;
          createOfficePositionRelation();
        });
      }
      
      function createOfficePositionRelation() {
        const insertQuery = `
          INSERT INTO OfficePositions (office_id, position_id, reporting_time, duty_hours)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          reporting_time = VALUES(reporting_time),
          duty_hours = VALUES(duty_hours)
        `;
        
        db.query(insertQuery, [officeId, positionId, reportingTime, dutyHours], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          
          res.status(201).json({ 
            message: 'Office-Position relationship created/updated successfully',
            officeName,
            positionName,
            reportingTime,
            dutyHours
          });
        });
      }
    });
  });
};

// ✅ Dashboard summary with office-wise breakdown
exports.getDashboardSummary = (req, res) => {
  const query = `
    SELECT 
      COUNT(DISTINCT o.id) as totalOffices,
      COUNT(DISTINCT p.id) as totalPositions,
      COALESCE(emp_summary.totalEmployees, 0) as totalEmployees,
      COALESCE(emp_summary.totalSalary, 0) as totalSalary
    FROM Offices o
    CROSS JOIN Positions p
    LEFT JOIN (
      SELECT 
        COUNT(*) AS totalEmployees, 
        SUM(salary) AS totalSalary 
      FROM Employees 
      WHERE status = 1
    ) emp_summary ON 1=1
  `;
  
  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result[0]);
  });
};