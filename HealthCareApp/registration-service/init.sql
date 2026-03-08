CREATE DATABASE IF NOT EXISTS registration_db;
USE registration_db;

CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    patient_name VARCHAR(200) NOT NULL,
    doctor_id INT NOT NULL,
    doctor_name VARCHAR(200),
    registration_date DATE NOT NULL,
    reason TEXT,
    status ENUM('registered', 'in-progress', 'completed', 'cancelled') DEFAULT 'registered',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
