const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get all appointments
router.get('/', async (req, res) => {
  try {
    const { patient_id, doctor_id, status } = req.query;
    let query = 'SELECT * FROM appointments';
    const conditions = [];
    const params = [];
    if (patient_id) { conditions.push('patient_id = ?'); params.push(patient_id); }
    if (doctor_id) { conditions.push('doctor_id = ?'); params.push(doctor_id); }
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY appointment_date DESC, appointment_time DESC';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get appointment by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Book appointment
router.post('/', async (req, res) => {
  try {
    const { patient_id, patient_name, doctor_id, doctor_name, appointment_date, appointment_time, reason, notes } = req.body;
    if (!patient_id || !patient_name || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'patient_id, patient_name, doctor_id, appointment_date, and appointment_time are required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO appointments (patient_id, patient_name, doctor_id, doctor_name, appointment_date, appointment_time, reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [patient_id, patient_name, doctor_id, doctor_name || '', appointment_date, appointment_time, reason || '', notes || '']
    );
    res.status(201).json({ message: 'Appointment booked', appointmentId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update appointment
router.put('/:id', async (req, res) => {
  try {
    const { status, appointment_date, appointment_time, notes } = req.body;
    await pool.execute(
      'UPDATE appointments SET status=COALESCE(?,status), appointment_date=COALESCE(?,appointment_date), appointment_time=COALESCE(?,appointment_time), notes=COALESCE(?,notes) WHERE id=?',
      [status, appointment_date, appointment_time, notes, req.params.id]
    );
    res.json({ message: 'Appointment updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel appointment
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Count (for admin)
router.get('/count/total', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM appointments');
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
