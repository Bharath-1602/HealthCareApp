CREATE DATABASE IF NOT EXISTS doctor_db;
USE doctor_db;

CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    specialization VARCHAR(100) NOT NULL,
    qualification VARCHAR(200),
    experience_years INT DEFAULT 0,
    consultation_fee DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_patients INT DEFAULT 10,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

INSERT IGNORE INTO doctors (id, full_name, email, specialization, qualification, experience_years, consultation_fee)
VALUES
(1, 'Dr. Sarah Johnson', 'sarah@healthcare.com', 'Cardiology', 'MD, DM Cardiology', 12, 500.00),
(2, 'Dr. Michael Chen', 'michael@healthcare.com', 'Neurology', 'MD, DM Neurology', 8, 600.00),
(3, 'Dr. Emily Williams', 'emily@healthcare.com', 'Pediatrics', 'MD Pediatrics', 10, 400.00),
(4, 'Dr. James Brown', 'james@healthcare.com', 'Orthopedics', 'MS Orthopedics', 15, 550.00),
(5, 'Dr. Lisa Davis', 'lisa@healthcare.com', 'Dermatology', 'MD Dermatology', 6, 450.00);

INSERT IGNORE INTO schedules (id, doctor_id, day_of_week, start_time, end_time, max_patients)
VALUES
(1, 1, 'Monday', '09:00', '17:00', 15),
(2, 1, 'Wednesday', '09:00', '17:00', 15),
(3, 2, 'Tuesday', '10:00', '18:00', 12),
(4, 2, 'Thursday', '10:00', '18:00', 12),
(5, 3, 'Monday', '08:00', '14:00', 20),
(6, 3, 'Friday', '08:00', '14:00', 20),
(7, 4, 'Wednesday', '09:00', '16:00', 10),
(8, 5, 'Tuesday', '11:00', '19:00', 10),
(9, 5, 'Saturday', '09:00', '13:00', 8);
