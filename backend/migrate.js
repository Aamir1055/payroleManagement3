const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
});

const runMigration = async () => {
  try {
    console.log('🚀 Starting database migration...');

    // Create Users table with HR role
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS Users (
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
    console.log('✅ Users table created/updated');

    // Create default users with hashed passwords
    const saltRounds = 10;
    
    // Hash passwords for all users
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const hrPassword = await bcrypt.hash('hr123', saltRounds);
    const floorManagerPassword = await bcrypt.hash('manager123', saltRounds);

    // Insert default users (ignore if they already exist)
    const insertUsers = `
      INSERT IGNORE INTO Users (username, password, role, employee_id) VALUES
      ('admin', ?, 'admin', NULL),
      ('hr', ?, 'hr', 'EMP001'),
      ('floormanager', ?, 'floor_manager', 'EMP002')
    `;

    await queryPromise(insertUsers, [adminPassword, hrPassword, floorManagerPassword]);
    console.log('✅ Default users created');

    // Rest of the existing migration...
    
    // Create offices table
    const createOfficesTable = `
      CREATE TABLE IF NOT EXISTS offices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await queryPromise(createOfficesTable);
    console.log('✅ offices table created');

    // Create positions table
    const createPositionsTable = `
      CREATE TABLE IF NOT EXISTS positions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await queryPromise(createPositionsTable);
    console.log('✅ positions table created');

    // Create office_positions relationship table
    const createOfficePositionsTable = `
      CREATE TABLE IF NOT EXISTS office_positions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        office_id INT NOT NULL,
        position_id INT NOT NULL,
        reporting_time TIME,
        duty_hours DECIMAL(4,2),
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
      CREATE TABLE IF NOT EXISTS employees (
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
        FOREIGN KEY (office_id) REFERENCES offices(id),
        FOREIGN KEY (position_id) REFERENCES positions(id)
      )
    `;

    await queryPromise(createEmployeesTable);
    console.log('✅ employees table created');

    // Create Holidays table
    const createHolidaysTable = `
      CREATE TABLE IF NOT EXISTS Holidays (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        date DATE NOT NULL UNIQUE,
        type ENUM('public', 'company', 'religious') DEFAULT 'company',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await queryPromise(createHolidaysTable);
    console.log('✅ Holidays table created');

    // Create Payroll table
    const createPayrollTable = `
      CREATE TABLE IF NOT EXISTS Payroll (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id VARCHAR(10) NOT NULL,
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
        UNIQUE KEY unique_employee_month_year (employee_id, month, year),
        FOREIGN KEY (employee_id) REFERENCES employees(employeeId) ON DELETE CASCADE
      )
    `;

    await queryPromise(createPayrollTable);
    console.log('✅ Payroll table created');

    // Insert sample data
    await insertSampleData();

    console.log('\n🎉 Migration completed successfully!');
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

const insertSampleData = async () => {
  try {
    // Insert sample offices
    const insertOffices = `
      INSERT IGNORE INTO offices (name, location) VALUES
      ('Head Office', 'Dubai, UAE'),
      ('Branch Office', 'Abu Dhabi, UAE'),
      ('Regional Office', 'Sharjah, UAE')
    `;
    await queryPromise(insertOffices);

    // Insert sample positions
    const insertPositions = `
      INSERT IGNORE INTO positions (title, description) VALUES
      ('Software Developer', 'Develops and maintains software applications'),
      ('HR Manager', 'Manages human resources and employee relations'),
      ('Floor Manager', 'Supervises floor operations and staff'),
      ('Accountant', 'Handles financial records and transactions'),
      ('Sales Representative', 'Manages client relationships and sales')
    `;
    await queryPromise(insertPositions);

    console.log('✅ Sample data inserted');
  } catch (error) {
    console.error('⚠️ Sample data insertion failed:', error);
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
runMigration();