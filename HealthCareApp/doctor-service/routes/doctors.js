const express = require('express');
const pool = require('../db');

const router = express.Router();

// Get all doctors
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM doctors WHERE status = "active" ORDER BY full_name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Doctor not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create doctor
router.post('/', async (req, res) => {
  try {
    const { user_id, full_name, email, phone, specialization, qualification, experience_years, consultation_fee } = req.body;
    if (!full_name || !specialization) {
      return res.status(400).json({ error: 'full_name and specialization are required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO doctors (user_id, full_name, email, phone, specialization, qualification, experience_years, consultation_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id || null, full_name, email || null, phone || null, specialization, qualification || null, experience_years || 0, consultation_fee || 0]
    );
    res.status(201).json({ message: 'Doctor created', doctorId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update doctor
router.put('/:id', async (req, res) => {
  try {
    const { full_name, email, phone, specialization, qualification, experience_years, consultation_fee, status } = req.body;
    await pool.execute(
      `UPDATE doctors SET full_name=COALESCE(?,full_name), email=COALESCE(?,email), phone=COALESCE(?,phone),
       specialization=COALESCE(?,specialization), qualification=COALESCE(?,qualification),
       experience_years=COALESCE(?,experience_years), consultation_fee=COALESCE(?,consultation_fee),
       status=COALESCE(?,status) WHERE id=?`,
      [full_name, email, phone, specialization, qualification, experience_years, consultation_fee, status, req.params.id]
    );
    res.json({ message: 'Doctor updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete doctor
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM doctors WHERE id = ?', [req.params.id]);
    res.json({ message: 'Doctor deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor's schedule
router.get('/:id/schedule', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM schedules WHERE doctor_id = ? ORDER BY FIELD(day_of_week, "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday")',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add schedule
router.post('/:id/schedule', async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, max_patients } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, max_patients) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, day_of_week, start_time, end_time, max_patients || 10]
    );
    res.status(201).json({ message: 'Schedule added', scheduleId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specializations
router.get('/specializations/list', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT DISTINCT specialization FROM doctors WHERE status = "active" ORDER BY specialization');
    res.json(rows.map(r => r.specialization));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Doctor count (for admin)
router.get('/count/total', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM doctors');
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
