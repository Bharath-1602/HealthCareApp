CREATE DATABASE IF NOT EXISTS user_management_db;
USE user_management_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role ENUM('patient', 'doctor', 'admin') DEFAULT 'patient',
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- seed admin user (password: admin123)
INSERT IGNORE INTO users (username, email, password, full_name, role)
VALUES ('admin', 'admin@healthcare.com', '$2a$10$8K1p/a0dL1LXMw0gH9bPHOeQF9kZm.Rr0muIBHKxnWCk3piNzq7Km', 'System Admin', 'admin');
