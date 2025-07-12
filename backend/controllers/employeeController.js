const { query } = require('../utils/dbPromise');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Helper to generate EMPXXX IDs
const generateNextEmployeeId = async () => {
  const result = await query(`
    SELECT employeeId FROM employees 
    WHERE employeeId LIKE 'EMP%' 
    ORDER BY LENGTH(employeeId) DESC, employeeId DESC 
    LIMIT 1
  `);
  
  if (result.length === 0) return 'EMP001';
  
  const lastId = result[0].employeeId;
  const lastNumber = parseInt(lastId.slice(3));
  const nextNumber = lastNumber + 1;
  return `EMP${nextNumber.toString().padStart(3, '0')}`;
};

// All controller methods
module.exports = {
  getEmployees: async (req, res) => {
    try {
      const employees = await query(`
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

// In employeeController.js
getNextEmployeeId: async (req, res) => {
  try {
    const result = await query(`
      SELECT employeeId FROM employees 
      WHERE employeeId LIKE 'EMP%' 
      ORDER BY LENGTH(employeeId) DESC, employeeId DESC 
      LIMIT 1
    `);
    
    const lastId = result[0]?.employeeId || 'EMP000';
    const lastNumber = parseInt(lastId.slice(3));
    const nextNumber = lastNumber + 1;
    res.json({ nextEmployeeId: `EMP${nextNumber.toString().padStart(3, '0')}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
},

  getOfficePositionData: async (req, res) => {
    try {
      const { officeId, positionId } = req.params;
      const result = await query(`
        SELECT reporting_time, duty_hours 
        FROM office_positions 
        WHERE office_id = ? AND position_id = ?
      `, [officeId, positionId]);
      
      if (result.length > 0) {
        // Format time to HH:MM if it comes as a time string
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
      const result = await query('SELECT COUNT(*) AS total FROM employees WHERE status = 1');
      res.json({ total: result[0].total });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getTotalMonthlySalary: async (req, res) => {
    try {
      const result = await query('SELECT SUM(monthlySalary) AS totalSalary FROM employees WHERE status = 1');
      res.json({ totalSalary: result[0].totalSalary || 0 });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getSummaryByOffice: async (req, res) => {
    try {
      const results = await query(`
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
      const results = await query('SELECT id, name FROM offices ORDER BY name');
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getPositionOptions: async (req, res) => {
    try {
      const results = await query('SELECT id, title FROM positions ORDER BY title');
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getPositionsByOffice: async (req, res) => {
    try {
      const { officeId } = req.params;
      const results = await query(`
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
      const { name, email, office_id, position_id, monthlySalary, joiningDate, status } = req.body;
      const employeeId = await generateNextEmployeeId();
      
      await query(`
        INSERT INTO employees 
        (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status ? 1 : 0]);

      const [newEmployee] = await query(`
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [employeeId]);

      res.status(201).json(newEmployee);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getEmployeeById: async (req, res) => {
    try {
      const [employee] = await query(`
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [req.params.employeeId]);

      employee 
        ? res.json(employee)
        : res.status(404).json({ error: 'Employee not found' });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  updateEmployee: async (req, res) => {
    try {
      const { name, email, office_id, position_id, monthlySalary, joiningDate, status } = req.body;
      
      const result = await query(`
        UPDATE employees SET
          name = ?, email = ?, office_id = ?, position_id = ?,
          monthlySalary = ?, joiningDate = ?, status = ?
        WHERE employeeId = ?
      `, [name, email, office_id, position_id, monthlySalary, joiningDate, status ? 1 : 0, req.params.employeeId]);

      if (!result.affectedRows) return res.status(404).json({ error: 'Employee not found' });

      const [updatedEmployee] = await query(`
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [req.params.employeeId]);

      res.json(updatedEmployee);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  deleteEmployee: async (req, res) => {
    try {
      const result = await query('DELETE FROM employees WHERE employeeId = ?', [req.params.employeeId]);
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
      const [offices, positions] = await Promise.all([
        query('SELECT id, name FROM offices'),
        query('SELECT id, title FROM positions')
      ]);

      const template = [{
        'Employee ID': 'EMP001',
        'Name': 'Sample Name',
        'Email': 'sample@email.com',
        'Office ID': offices[0]?.id,
        'Position ID': positions[0]?.id,
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
      const workbook = XLSX.readFile(req.file.path);
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      
      const processed = await Promise.all(data.map(async row => [
        row['Employee ID'] || await generateNextEmployeeId(),
        row['Name'],
        row['Email'],
        row['Office ID'],
        row['Position ID'],
        row['Salary'],
        row['Joining Date'],
        row['Status'] === 'active' ? 1 : 0
      ]));

      await query(`
        INSERT INTO employees 
        (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status)
        VALUES ?
      `, [processed]);

      fs.unlinkSync(req.file.path);
      res.json({ message: `${processed.length} employees imported` });
    } catch (err) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      console.error('Error:', err);
      res.status(500).json({ error: 'Import failed: ' + err.message });
    }
  }
};