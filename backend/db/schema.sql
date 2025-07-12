-- Database schema for Payroll System

-- Create OfficeMaster table if not exists
CREATE TABLE IF NOT EXISTS OfficeMaster (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create PositionMaster table if not exists
CREATE TABLE IF NOT EXISTS PositionMaster (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create OfficePositions relationship table
CREATE TABLE IF NOT EXISTS OfficePositions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  position_id INT NOT NULL,
  reporting_time TIME NOT NULL DEFAULT '09:00:00',
  duty_hours DECIMAL(3,1) NOT NULL DEFAULT 8.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES OfficeMaster(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES PositionMaster(id) ON DELETE CASCADE,
  UNIQUE KEY unique_office_position (office_id, position_id)
);

-- Create Employees table if not exists (enhanced with office and position references)
CREATE TABLE IF NOT EXISTS Employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeId VARCHAR(50) NOT NULL UNIQUE,
  fullName VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  office VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  monthlySalary DECIMAL(10,2) NOT NULL,
  dutyHours INT NOT NULL DEFAULT 8,
  reportingTime TIME NOT NULL DEFAULT '09:00:00',
  allowedLateDays INT NOT NULL DEFAULT 3,
  joiningDate DATE NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some sample data if tables are empty
INSERT IGNORE INTO OfficeMaster (name) VALUES 
('New York'),
('Los Angeles'),
('Chicago'),
('Houston'),
('Dubai');

INSERT IGNORE INTO PositionMaster (name) VALUES 
('Software Engineer'),
('Data Analyst'),
('Product Manager'),
('Designer'),
('HR Specialist');

-- Insert some sample office-position relationships
INSERT IGNORE INTO OfficePositions (office_id, position_id, reporting_time, duty_hours) VALUES 
-- New York Office
((SELECT id FROM OfficeMaster WHERE name = 'New York'), (SELECT id FROM PositionMaster WHERE name = 'Software Engineer'), '09:00:00', 8.0),
((SELECT id FROM OfficeMaster WHERE name = 'New York'), (SELECT id FROM PositionMaster WHERE name = 'Data Analyst'), '09:00:00', 8.0),
((SELECT id FROM OfficeMaster WHERE name = 'New York'), (SELECT id FROM PositionMaster WHERE name = 'Product Manager'), '10:00:00', 7.0),

-- Dubai Office
((SELECT id FROM OfficeMaster WHERE name = 'Dubai'), (SELECT id FROM PositionMaster WHERE name = 'Data Analyst'), '08:30:00', 8.5),
((SELECT id FROM OfficeMaster WHERE name = 'Dubai'), (SELECT id FROM PositionMaster WHERE name = 'Software Engineer'), '09:00:00', 8.0),
((SELECT id FROM OfficeMaster WHERE name = 'Dubai'), (SELECT id FROM PositionMaster WHERE name = 'HR Specialist'), '09:00:00', 8.0);