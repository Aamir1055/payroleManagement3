const XLSX = require('xlsx');
const db = require('./db');

async function generateAttendanceSamples() {
  try {
    // Get all employees with office data
    const [allEmployees] = await db.query(`
      SELECT e.employeeId, e.name, o.name as office_name, o.id as office_id
      FROM employees e 
      LEFT JOIN offices o ON e.office_id = o.id 
      ORDER BY o.name, e.name
    `);

    // Filter employees from Amari Capital (20) and MOIT (22)
    const amariMoitEmployees = allEmployees.filter(emp => 
      emp.office_id === 20 || emp.office_id === 22
    );

    console.log(`Total employees: ${allEmployees.length}`);
    console.log(`Amari Capital + MOIT employees: ${amariMoitEmployees.length}`);

    // Generate sample dates for July 2025
    const sampleDates = [
      '2025-07-01', '2025-07-02', '2025-07-03', '2025-07-04', '2025-07-07',
      '2025-07-08', '2025-07-09', '2025-07-10', '2025-07-11', '2025-07-14',
      '2025-07-15', '2025-07-16', '2025-07-17', '2025-07-18', '2025-07-21',
      '2025-07-22', '2025-07-23', '2025-07-24', '2025-07-25', '2025-07-28',
      '2025-07-29', '2025-07-30', '2025-07-31'
    ];

    // Generate sample punch times
    const generatePunchTimes = () => {
      const punchInHour = 9 + Math.floor(Math.random() * 2); // 9-10 AM
      const punchInMinute = Math.floor(Math.random() * 60);
      const punchOutHour = 17 + Math.floor(Math.random() * 2); // 5-6 PM
      const punchOutMinute = Math.floor(Math.random() * 60);
      
      return {
        punchIn: `${punchInHour.toString().padStart(2, '0')}:${punchInMinute.toString().padStart(2, '0')}`,
        punchOut: `${punchOutHour.toString().padStart(2, '0')}:${punchOutMinute.toString().padStart(2, '0')}`
      };
    };

    // Create attendance data for all offices
    const allOfficesData = [];
    allEmployees.forEach(emp => {
      sampleDates.forEach(date => {
        // Skip some dates randomly to simulate real attendance patterns
        if (Math.random() > 0.85) return; // 15% absence rate
        
        const { punchIn, punchOut } = generatePunchTimes();
        allOfficesData.push({
          'EmployeeID': emp.employeeId,
          'Employee Name': emp.name,
          'Office': emp.office_name,
          'Date': date,
          'Punch In': punchIn,
          'Punch Out': punchOut
        });
      });
    });

    // Create attendance data for Amari Capital + MOIT only
    const amariMoitData = [];
    amariMoitEmployees.forEach(emp => {
      sampleDates.forEach(date => {
        // Skip some dates randomly to simulate real attendance patterns
        if (Math.random() > 0.85) return; // 15% absence rate
        
        const { punchIn, punchOut } = generatePunchTimes();
        amariMoitData.push({
          'EmployeeID': emp.employeeId,
          'Employee Name': emp.name,
          'Office': emp.office_name,
          'Date': date,
          'Punch In': punchIn,
          'Punch Out': punchOut
        });
      });
    });

    // Create workbooks
    const allOfficesWorkbook = XLSX.utils.book_new();
    const amariMoitWorkbook = XLSX.utils.book_new();

    // Create worksheets
    const allOfficesSheet = XLSX.utils.json_to_sheet(allOfficesData);
    const amariMoitSheet = XLSX.utils.json_to_sheet(amariMoitData);

    // Add worksheets to workbooks
    XLSX.utils.book_append_sheet(allOfficesWorkbook, allOfficesSheet, 'Attendance');
    XLSX.utils.book_append_sheet(amariMoitWorkbook, amariMoitSheet, 'Attendance');

    // Write files
    XLSX.writeFile(allOfficesWorkbook, 'attendance_all_offices.xlsx');
    XLSX.writeFile(amariMoitWorkbook, 'attendance_amari_moit.xlsx');

    console.log('\n✅ Excel files generated successfully!');
    console.log(`📁 attendance_all_offices.xlsx - ${allOfficesData.length} records from all ${allEmployees.length} employees`);
    console.log(`📁 attendance_amari_moit.xlsx - ${amariMoitData.length} records from ${amariMoitEmployees.length} employees (Amari Capital + MOIT only)`);
    
    console.log('\n📋 Sample data structure:');
    console.log('Columns: EmployeeID, Employee Name, Office, Date, Punch In, Punch Out');
    console.log('\n🎯 Use these files to test:');
    console.log('- attendance_all_offices.xlsx: Should be rejected for non-admin users');
    console.log('- attendance_amari_moit.xlsx: Should be accepted for Amari Capital + MOIT managers');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

generateAttendanceSamples();
