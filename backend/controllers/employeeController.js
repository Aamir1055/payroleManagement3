const XLSX = require('xlsx');
const fs = require('fs');

// Helper to get office_id and position_id from names
const getOfficeIdByName = async (office_name, db) => {
  if (!db) throw new Error('Database connection is missing in getOfficeIdByName');
  const [office] = await db.query('SELECT id FROM offices WHERE name = ?', [office_name]);
  if (!office || !office[0]) throw new Error('Invalid office_name: ' + office_name);
  return office[0].id;
};

const getPositionIdByName = async (position_name, db) => {
  if (!db) throw new Error('Database connection is missing in getPositionIdByName');
  const [position] = await db.query('SELECT id FROM positions WHERE title = ?', [position_name]);
  if (!position || !position[0]) throw new Error('Invalid position_name: ' + position_name);
  return position[0].id;
};

module.exports = {
  getEmployees: async (req, res) => {
    try {
      const [employees] = await req.db.query(`
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        ORDER BY e.employeeId
      `);
      res.json(employees);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  },

  getNextEmployeeId: async (req, res) => {
    res.status(400).json({ error: 'Auto-generation of employeeId is disabled. Please provide employeeId manually.' });
  },

  getOfficePositionData: async (req, res) => {
    try {
      const { officeId, positionId } = req.params;
      const [result] = await req.db.query(`
        SELECT reporting_time, duty_hours 
        FROM office_positions 
        WHERE office_id = ? AND position_id = ?
      `, [officeId, positionId]);
      if (result.length > 0) {
        let reportingTime = result[0].reporting_time;
        if (typeof reportingTime === 'string' && reportingTime.includes(':')) {
          const [hours, minutes] = reportingTime.split(':');
          reportingTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
        res.json({
          reporting_time: reportingTime || 'Not set',
          duty_hours: result[0].duty_hours ? `${result[0].duty_hours} hours` : 'Not set'
        });
      } else {
        res.json({
          reporting_time: 'Not set',
          duty_hours: 'Not set'
        });
      }
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getEmployeeCount: async (req, res) => {
    try {
      const [result] = await req.db.query('SELECT COUNT(*) AS total FROM employees WHERE status = 1');
      res.json({ total: result[0].total });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getTotalMonthlySalary: async (req, res) => {
    try {
      const [result] = await req.db.query('SELECT SUM(monthlySalary) AS totalSalary FROM employees WHERE status = 1');
      res.json({ totalSalary: result[0].totalSalary || 0 });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getSummaryByOffice: async (req, res) => {
    try {
      const [results] = await req.db.query(`
        SELECT o.id AS office_id, o.name AS office,
          COUNT(e.id) AS totalEmployees,
          SUM(e.monthlySalary) AS totalSalary
        FROM offices o
        LEFT JOIN employees e ON o.id = e.office_id AND e.status = 1
        GROUP BY o.id
      `);
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getOfficeOptions: async (req, res) => {
    try {
      const [results] = await req.db.query('SELECT id, name FROM offices ORDER BY name');
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getPositionOptions: async (req, res) => {
    try {
      const [results] = await req.db.query('SELECT id, title FROM positions ORDER BY title');
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getPositionsByOffice: async (req, res) => {
    try {
      const { officeId } = req.params;
      const [results] = await req.db.query(`
        SELECT DISTINCT p.id, p.title 
        FROM positions p
        INNER JOIN office_positions op ON p.id = op.position_id
        WHERE op.office_id = ?
        ORDER BY p.title
      `, [officeId]);
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  createEmployee: async (req, res) => {
    try {
      const { employeeId, name, email, office_name, position_name, monthlySalary, joiningDate, status } = req.body;
      if (!employeeId || !office_name || !position_name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const db = req.db;
      const office_id = await getOfficeIdByName(office_name, db);
      const position_id = await getPositionIdByName(position_name, db);

      await db.query(`
        INSERT INTO employees 
        (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status ? 1 : 0]);

      const [newEmployee] = await db.query(`
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [employeeId]);

      res.status(201).json(newEmployee[0]);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getEmployeeById: async (req, res) => {
    try {
      const [employee] = await req.db.query(`
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [req.params.employeeId]);

      employee[0]
        ? res.json(employee[0])
        : res.status(404).json({ error: 'Employee not found' });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  updateEmployee: async (req, res) => {
    try {
      const { name, email, office_name, position_name, monthlySalary, joiningDate, status } = req.body;

      const db = req.db;
      const office_id = await getOfficeIdByName(office_name, db);
      const position_id = await getPositionIdByName(position_name, db);

      const [result] = await db.query(`
        UPDATE employees SET
          name = ?, email = ?, office_id = ?, position_id = ?,
          monthlySalary = ?, joiningDate = ?, status = ?
        WHERE employeeId = ?
      `, [name, email, office_id, position_id, monthlySalary, joiningDate, status ? 1 : 0, req.params.employeeId]);

      if (!result.affectedRows) return res.status(404).json({ error: 'Employee not found' });

      const [updatedEmployee] = await db.query(`
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [req.params.employeeId]);

      res.json(updatedEmployee[0]);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  deleteEmployee: async (req, res) => {
    try {
      const [result] = await req.db.query('DELETE FROM employees WHERE employeeId = ?', [req.params.employeeId]);
      result.affectedRows
        ? res.json({ message: 'Employee deleted successfully' })
        : res.status(404).json({ error: 'Employee not found' });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  exportEmployeesTemplate: async (req, res) => {
    try {
      const [[offices], [positions]] = await Promise.all([
        req.db.query('SELECT id, name FROM offices'),
        req.db.query('SELECT id, title FROM positions')
      ]);

      const template = [{
        'Employee ID': 'EMP001',
        'Name': 'Sample Name',
        'Email': 'sample@email.com',
        'Office Name': offices[0]?.name,
        'Position Name': positions[0]?.title,
        'Salary': 5000,
        'Joining Date': '2023-01-01',
        'Status': 'active'
      }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(template), 'Template');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offices), 'Offices');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(positions), 'Positions');

      res.setHeader('Content-Disposition', 'attachment; filename=employee_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.end(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  importEmployees: async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const db = req.db;
      if (!db) throw new Error('Database connection not available on request');

      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const requiredColumns = [
        'Employee ID', 'Name', 'Email', 'Office Name', 'Position Name', 'Salary', 'Joining Date', 'Status'
      ];

      if (data[0]) {
        for (const col of requiredColumns) {
          if (!(col in data[0])) {
            throw new Error(`Required column "${col}" not found in Excel file`);
          }
        }
      }

      const processed = [];
      for (const row of data) {
        if (!row['Employee ID'] || !row['Office Name'] || !row['Position Name']) {
          throw new Error('Employee ID, Office Name, and Position Name are required for each row');
        }
        const office_id = await getOfficeIdByName(row['Office Name'], db);
        const position_id = await getPositionIdByName(row['Position Name'], db);
        processed.push([
          row['Employee ID'],
          row['Name'],
          row['Email'],
          office_id,
          position_id,
          row['Salary'],
          row['Joining Date'],
          row['Status'] === 'active' ? 1 : 0
        ]);
      }

      if (processed.length > 0) {
        const placeholders = processed.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = processed.flat();
        const sql = `
          INSERT INTO employees 
          (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status)
          VALUES ${placeholders}
        `;
        await db.query(sql, flatValues);
      }

      fs.unlinkSync(req.file.path);
      res.json({ message: `${processed.length} employees imported` });
    } catch (err) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      console.error('Import error:', err);
      res.status(500).json({ error: 'Import failed: ' + err.message });
    }
  }
};
