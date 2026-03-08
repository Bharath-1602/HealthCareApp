CREATE DATABASE IF NOT EXISTS vital_sign_db;
USE vital_sign_db;

CREATE TABLE IF NOT EXISTS vital_signs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    patient_name VARCHAR(200),
    user_id INT,
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    heart_rate INT,
    temperature DECIMAL(4,1),
    respiratory_rate INT,
    oxygen_saturation DECIMAL(4,1),
    weight DECIMAL(5,1),
    height DECIMAL(5,1),
    blood_sugar DECIMAL(6,1),
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
