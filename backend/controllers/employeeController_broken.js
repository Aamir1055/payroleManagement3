const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { query } = require('../utils/dbPromise');

const generateNextEmployeeId = async () => {
  const results = await query(`
    SELECT employee_id 
    FROM Employees 
    WHERE employee_id REGEXP "^EMP[0-9]+$" 
    ORDER BY CAST(SUBSTRING(employee_id, 4) AS UNSIGNED) DESC 
    LIMIT 1
  `);

  let nextNumber = 1;
  if (results.length > 0) {
    const lastNumber = parseInt(results[0].employee_id.substring(3));
    nextNumber = lastNumber + 1;
  }
  return `EMP${nextNumber.toString().padStart(3, '0')}`;
};

exports.getNextEmployeeId = async (req, res) => {
  try {
    const nextId = await generateNextEmployeeId();
    res.json({ nextEmployeeId: nextId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        e.id,
        e.employee_id as employeeId,
        e.name as fullName,
        e.email,
        o.name as office,
        p.title as position,
        e.salary as monthlySalary,
        COALESCE(op.duty_hours, 8) as dutyHours,
        COALESCE(op.reporting_time, '09:00') as reportingTime,
        3 as allowedLateDays,
        e.hire_date as joiningDate,
        CASE WHEN e.status = 1 THEN 'active' ELSE 'inactive' END as status
      FROM Employees e
      LEFT JOIN Offices o ON e.office_id = o.id
      LEFT JOIN Positions p ON e.position_id = p.id
      LEFT JOIN OfficePositions op ON e.office_id = op.office_id AND e.position_id = op.position_id
      ORDER BY e.employee_id
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const results = await query(`
      SELECT 
        e.*, o.name AS office_name, p.title AS position_name,
        op.reporting_time, op.duty_hours
      FROM Employees e
      LEFT JOIN Offices o ON e.office_id = o.id
      LEFT JOIN Positions p ON e.position_id = p.id
      LEFT JOIN OfficePositions op ON e.office_id = op.office_id AND e.position_id = op.position_id
      WHERE e.employee_id = ?
    `, [employeeId]);

    if (results.length === 0) return res.status(404).json({ message: 'Employee not found' });
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const { 
      employeeId, 
      fullName, 
      email, 
      office, 
      position, 
      monthlySalary, 
      joiningDate, 
      status 
    } = req.body;

    if (!fullName || !email || !office || !position || !monthlySalary || !joiningDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get office_id and position_id from names
    const [officeResult] = await query('SELECT id FROM Offices WHERE name = ?', [office]);
    const [positionResult] = await query('SELECT id FROM Positions WHERE title = ?', [position]);

    if (!officeResult || !positionResult) {
      return res.status(400).json({ error: 'Invalid office or position' });
    }

    const finalEmployeeId = employeeId || await generateNextEmployeeId();

    const result = await query(`
      INSERT INTO Employees 
      (employee_id, name, email, office_id, position_id, salary, hire_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      finalEmployeeId, 
      fullName, 
      email, 
      officeResult.id, 
      positionResult.id, 
      monthlySalary, 
      joiningDate, 
      status === 'active' ? 1 : 0
    ]);

    res.status(201).json({
      message: 'Employee created successfully',
      employee_id: finalEmployeeId,
      id: result.insertId
    });
  } catch (err) {
    console.error('Error creating employee:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const updates = req.body;

    delete updates.employee_id;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const result = await query('UPDATE Employees SET ? WHERE employee_id = ?', [updates, employeeId]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });

    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const result = await query('DELETE FROM Employees WHERE employee_id = ?', [employeeId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.importEmployees = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = path.resolve(req.file.path);

  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!Array.isArray(data) || data.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Invalid or empty Excel file.' });
    }

    const processedData = [];
    for (const row of data) {
      const employee_id = await generateNextEmployeeId();
      processedData.push([
        employee_id,
        row['Name'] || row['Full Name'] || '',
        row['Email'] || '',
        row['Phone'] || '',
        parseInt(row['Office ID']) || null,
        parseInt(row['Position ID']) || null,
        Number(row['Salary']) || 0,
        row['Hire Date'] || row['Joining Date'] || '',
        row['Status']?.toLowerCase() === 'inactive' ? 0 : 1
      ]);
    }

    const sql = `
      INSERT INTO Employees
      (employee_id, name, email, phone, office_id, position_id, salary, hire_date, status)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        phone = VALUES(phone),
        office_id = VALUES(office_id),
        position_id = VALUES(position_id),
        salary = VALUES(salary),
        hire_date = VALUES(hire_date),
        status = VALUES(status)
    `;

    const result = await query(sql, [processedData]);
    fs.unlinkSync(filePath);
    res.json({ message: 'Employees imported successfully', inserted: result.affectedRows });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process the file. ' + err.message });
  }
};

exports.exportEmployeesTemplate = async (req, res) => {
  try {
    const offices = await query('SELECT id, name FROM Offices ORDER BY name');
    const positions = await query('SELECT id, title FROM Positions ORDER BY title');

    const templateData = [{
      'Name': 'John Doe',
      'Email': 'john.doe@example.com',
      'Phone': '+971501234567',
      'Office ID': offices[0]?.id || 1,
      'Position ID': positions[0]?.id || 1,
      'Salary': 5000,
      'Hire Date': '2025-01-01',
      'Status': 'active'
    }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(templateData), 'Employees');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offices.map(o => ({ 'Office ID': o.id, 'Office Name': o.name }))), 'Office Reference');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(positions.map(p => ({ 'Position ID': p.id, 'Position Title': p.title }))), 'Position Reference');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=employee_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployeeCount = async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) AS total FROM Employees WHERE status = 1');
    res.json({ total: result[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTotalMonthlySalary = async (req, res) => {
  try {
    const result = await query('SELECT SUM(salary) AS totalSalary FROM Employees WHERE status = 1');
    res.json({ totalSalary: result[0].totalSalary || 0 });
  } catch (err) {
    console.error('Error fetching total salary:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployeeCount = async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) AS total FROM Employees WHERE status = 1');
    res.json({ total: result[0].total });
  } catch (err) {
    console.error('Error fetching employee count:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getSummaryByOffice = async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        o.id AS office_id, o.name AS office,
        COALESCE(emp_summary.totalEmployees, 0) AS totalEmployees,
        COALESCE(emp_summary.totalSalary, 0) AS totalSalary
      FROM Offices o
      LEFT JOIN (
        SELECT office_id, COUNT(*) AS totalEmployees, SUM(salary) AS totalSalary 
        FROM Employees WHERE status = 1
        GROUP BY office_id
      ) emp_summary ON o.id = emp_summary.office_id
      ORDER BY o.name
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
