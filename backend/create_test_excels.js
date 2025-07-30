
const XLSX = require('xlsx');
const db = require('./db');

async function createTestExcels() {
  try {
    // Get all employees with their office names
    const [employees] = await db.query(`
      SELECT e.employeeId, e.name, o.name AS office_name
      FROM employees e
      JOIN offices o ON e.office_id = o.id
    `);

    // 1. Excel with only "Amari Capital" and "MOIT" employees
    const amariMoitEmployees = employees.filter(emp => 
      emp.office_name === 'Amari Capital' || emp.office_name === 'MOIT'
    );
    const amariMoitData = amariMoitEmployees.map(emp => ({
      'EmployeeID': emp.employeeId,
      'Name': emp.name,
      'Date': '2025-07-30',
      'Punch In': '09:00',
      'Punch Out': '17:00'
    }));

    const amariMoitWoorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(amariMoitWoorkbook, XLSX.utils.json_to_sheet(amariMoitData), 'Attendance');
    XLSX.writeFile(amariMoitWoorkbook, 'attendance_amari_moit.xlsx');
    console.log('Created attendance_amari_moit.xlsx');

    // 2. Excel with all employees
    const allEmployeesData = employees.map(emp => ({
      'EmployeeID': emp.employeeId,
      'Name': emp.name,
      'Date': '2025-07-30',
      'Punch In': '09:00',
      'Punch Out': '17:00'
    }));
    
    const allEmployeesWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(allEmployeesWorkbook, XLSX.utils.json_to_sheet(allEmployeesData), 'Attendance');
    XLSX.writeFile(allEmployeesWorkbook, 'attendance_all_offices.xlsx');
    console.log('Created attendance_all_offices.xlsx');

  } catch (error) {
    console.error('Error creating test Excel files:', error);
    process.exit(1);
  } finally {
    db.end();
  }
}

createTestExcels();

