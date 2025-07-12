const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
});

const runFreshMigration = async () => {
  try {
    console.log('🚀 Starting FRESH database migration...');
    
    // Drop all existing tables first
    console.log('🗑️ Dropping existing tables...');
    
    // Disable foreign key checks
    await queryPromise('SET FOREIGN_KEY_CHECKS = 0');
    
    const dropTables = [
      'DROP TABLE IF EXISTS payroll',
      'DROP TABLE IF EXISTS holidays', 
      'DROP TABLE IF EXISTS employees',
      'DROP TABLE IF EXISTS office_positions',
      'DROP TABLE IF EXISTS positions',
      'DROP TABLE IF EXISTS offices',
      'DROP TABLE IF EXISTS Users'
    ];
    
    for (const dropSql of dropTables) {
      await queryPromise(dropSql);
    }
    
    // Re-enable foreign key checks
    await queryPromise('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ All existing tables dropped');

    // Create Users table
    const createUsersTable = `
      CREATE TABLE Users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'hr', 'floor_manager', 'employee') NOT NULL,
        employee_id VARCHAR(10),
        two_factor_secret VARCHAR(32),
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await queryPromise(createUsersTable);
    console.log('✅ Users table created');

    // Create offices table
    const createOfficesTable = `
      CREATE TABLE offices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await queryPromise(createOfficesTable);
    console.log('✅ offices table created');

    // Create positions table
    const createPositionsTable = `
      CREATE TABLE positions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await queryPromise(createPositionsTable);
    console.log('✅ positions table created');

    // Create office_positions relationship table
    const createOfficePositionsTable = `
      CREATE TABLE office_positions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        office_id INT NOT NULL,
        position_id INT NOT NULL,
        reporting_time TIME DEFAULT '09:00:00',
        duty_hours DECIMAL(4,2) DEFAULT 8.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
        FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
        UNIQUE KEY unique_office_position (office_id, position_id)
      )
    `;
    await queryPromise(createOfficePositionsTable);
    console.log('✅ office_positions table created');

    // Create employees table
    const createEmployeesTable = `
      CREATE TABLE employees (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employeeId VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        office_id INT,
        position_id INT,
        monthlySalary DECIMAL(10,2) NOT NULL,
        joiningDate DATE NOT NULL,
        status TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL,
        FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
      )
    `;
    await queryPromise(createEmployeesTable);
    console.log('✅ employees table created');

    // Create holidays table
    const createHolidaysTable = `
      CREATE TABLE holidays (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        date DATE NOT NULL UNIQUE,
        type ENUM('public', 'company', 'religious') DEFAULT 'company',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await queryPromise(createHolidaysTable);
    console.log('✅ holidays table created');

    // Create payroll table
    const createPayrollTable = `
      CREATE TABLE payroll (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employeeId VARCHAR(10) NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        present_days INT DEFAULT 0,
        half_days INT DEFAULT 0,
        late_days INT DEFAULT 0,
        leaves INT DEFAULT 0,
        overtime_hours DECIMAL(4,2) DEFAULT 0,
        deductions DECIMAL(10,2) DEFAULT 0,
        allowances DECIMAL(10,2) DEFAULT 0,
        gross_salary DECIMAL(10,2) DEFAULT 0,
        net_salary DECIMAL(10,2) DEFAULT 0,
        status ENUM('calculated', 'paid', 'pending') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_employee_month_year (employeeId, month, year),
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON DELETE CASCADE
      )
    `;
    await queryPromise(createPayrollTable);
    console.log('✅ payroll table created');

    // Insert default users
    await insertDefaultUsers();
    
    // Insert sample data
    await insertSampleData();

    console.log('\n🎉 FRESH Migration completed successfully!');
    console.log('\n👥 User Accounts Created:');
    console.log('┌─────────────┬─────────────┬──────────────┬─────────────┐');
    console.log('│ Username    │ Password    │ Role         │ Employee ID │');
    console.log('├─────────────┼─────────────┼──────────────┼─────────────┤');
    console.log('│ admin       │ admin123    │ Admin        │ -           │');
    console.log('│ hr          │ hr123       │ HR           │ EMP001      │');
    console.log('│ floormanager│ manager123  │ Floor Mgr    │ EMP002      │');
    console.log('└─────────────┴─────────────┴──────────────┴─────────────┘');
    console.log('\n🔐 All accounts have 2FA disabled by default');
    console.log('🚀 Ready to start the application!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    db.end();
  }
};

const insertDefaultUsers = async () => {
  try {
    const saltRounds = 10;
    
    // Hash passwords for all users
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const hrPassword = await bcrypt.hash('hr123', saltRounds);
    const floorManagerPassword = await bcrypt.hash('manager123', saltRounds);

    // Insert default users
    const insertUsers = `
      INSERT INTO Users (username, password, role, employee_id) VALUES
      ('admin', ?, 'admin', NULL),
      ('hr', ?, 'hr', 'EMP001'),
      ('floormanager', ?, 'floor_manager', 'EMP002')
    `;

    await queryPromise(insertUsers, [adminPassword, hrPassword, floorManagerPassword]);
    console.log('✅ Default users created');
  } catch (error) {
    console.error('❌ Failed to create default users:', error);
    throw error;
  }
};

const insertSampleData = async () => {
  try {
    // Insert sample offices
    const insertOffices = `
      INSERT INTO offices (name, location) VALUES
      ('Head Office', 'Dubai, UAE'),
      ('Branch Office', 'Abu Dhabi, UAE'),
      ('Regional Office', 'Sharjah, UAE'),
      ('Sales Office', 'Ajman, UAE'),
      ('IT Hub', 'Ras Al Khaimah, UAE')
    `;
    await queryPromise(insertOffices);
    console.log('✅ Sample offices inserted');

    // Insert sample positions
    const insertPositions = `
      INSERT INTO positions (title, description) VALUES
      ('Software Developer', 'Develops and maintains software applications'),
      ('HR Manager', 'Manages human resources and employee relations'),
      ('Floor Manager', 'Supervises floor operations and staff'),
      ('Accountant', 'Handles financial records and transactions'),
      ('Sales Representative', 'Manages client relationships and sales'),
      ('Marketing Executive', 'Handles marketing campaigns and brand management'),
      ('Customer Service Rep', 'Handles customer inquiries and support'),
      ('IT Support', 'Provides technical support and maintenance')
    `;
    await queryPromise(insertPositions);
    console.log('✅ Sample positions inserted');

    // Insert office-position relationships
    const officePositionData = [
      // Head Office
      [1, 1, '09:00:00', 8.00], // Software Developer
      [1, 2, '09:00:00', 8.00], // HR Manager
      [1, 3, '08:30:00', 8.50], // Floor Manager
      [1, 4, '09:00:00', 8.00], // Accountant
      [1, 8, '08:00:00', 8.00], // IT Support
      
      // Branch Office
      [2, 2, '09:00:00', 8.00], // HR Manager
      [2, 3, '08:30:00', 8.50], // Floor Manager
      [2, 4, '09:00:00', 8.00], // Accountant
      [2, 5, '09:00:00', 8.00], // Sales Representative
      [2, 7, '09:00:00', 8.00], // Customer Service Rep
      
      // Regional Office
      [3, 3, '08:30:00', 8.50], // Floor Manager
      [3, 5, '09:00:00', 8.00], // Sales Representative
      [3, 6, '09:00:00', 8.00], // Marketing Executive
      [3, 7, '09:00:00', 8.00], // Customer Service Rep
      
      // Sales Office
      [4, 5, '09:00:00', 8.00], // Sales Representative
      [4, 6, '09:00:00', 8.00], // Marketing Executive
      [4, 7, '09:00:00', 8.00], // Customer Service Rep
      
      // IT Hub
      [5, 1, '09:00:00', 8.00], // Software Developer
      [5, 3, '08:30:00', 8.50], // Floor Manager
      [5, 8, '08:00:00', 8.00], // IT Support
    ];

    for (const [office_id, position_id, reporting_time, duty_hours] of officePositionData) {
      await queryPromise(
        'INSERT INTO office_positions (office_id, position_id, reporting_time, duty_hours) VALUES (?, ?, ?, ?)',
        [office_id, position_id, reporting_time, duty_hours]
      );
    }
    console.log('✅ Office-position relationships inserted');

    // Insert sample employees
    const sampleEmployees = [
      ['EMP001', 'Sarah Johnson', 'sarah.johnson@company.com', 1, 2, 7500.00, '2023-01-15'], // HR Manager
      ['EMP002', 'Mike Chen', 'mike.chen@company.com', 1, 3, 8000.00, '2023-02-01'], // Floor Manager
      ['EMP003', 'Emily Davis', 'emily.davis@company.com', 1, 1, 6500.00, '2023-03-10'], // Software Developer
      ['EMP004', 'John Smith', 'john.smith@company.com', 2, 5, 5500.00, '2023-04-05'], // Sales Rep
      ['EMP005', 'Lisa Wang', 'lisa.wang@company.com', 3, 6, 6000.00, '2023-05-20'], // Marketing Executive
    ];

    for (const [employeeId, name, email, office_id, position_id, salary, joiningDate] of sampleEmployees) {
      await queryPromise(
        'INSERT INTO employees (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [employeeId, name, email, office_id, position_id, salary, joiningDate]
      );
    }
    console.log('✅ Sample employees inserted');

    // Insert sample holidays
    const insertHolidays = `
      INSERT INTO holidays (name, date, type) VALUES
      ('New Year Day', '2025-01-01', 'public'),
      ('UAE National Day', '2025-12-02', 'public'),
      ('Eid Al-Fitr', '2025-04-10', 'religious'),
      ('Eid Al-Adha', '2025-06-16', 'religious'),
      ('Company Foundation Day', '2025-03-15', 'company')
    `;
    await queryPromise(insertHolidays);
    console.log('✅ Sample holidays inserted');

  } catch (error) {
    console.error('❌ Sample data insertion failed:', error);
    throw error;
  }
};

// Helper function to promisify database queries
const queryPromise = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// Run migration
runFreshMigration();
