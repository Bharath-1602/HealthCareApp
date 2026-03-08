const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'registration-db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'healthcare_root_2024',
  database: process.env.DB_NAME || 'registration_db',
  waitForConnections: true,
  connectionLimit: 10
});
module.exports = pool;
