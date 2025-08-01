-- Create platforms table for PayRoll Management System
-- This table stores platform information with auto-increment ID and unique platform names

CREATE TABLE platforms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add index for faster searches on platform_name
CREATE INDEX idx_platform_name ON platforms(platform_name);

-- Insert some sample platform data (optional - remove if not needed)
INSERT INTO platforms (platform_name) VALUES 
('Web Development'),
('Mobile Development'),
('Data Analytics'),
('Cloud Services'),
('DevOps'),
('Quality Assurance');
