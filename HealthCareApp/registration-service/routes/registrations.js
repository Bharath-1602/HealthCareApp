const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get all registrations
router.get('/', async (req, res) => {
  try {
    const { patient_id, doctor_id } = req.query;
    let query = 'SELECT * FROM registrations';
    let params = [];
    if (patient_id) { query += ' WHERE patient_id = ?'; params.push(patient_id); }
    else if (doctor_id) { query += ' WHERE doctor_id = ?'; params.push(doctor_id); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get registration by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM registrations WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Registration not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create registration
router.post('/', async (req, res) => {
  try {
    const { patient_id, patient_name, doctor_id, doctor_name, registration_date, reason, notes } = req.body;
    if (!patient_id || !patient_name || !doctor_id) {
      return res.status(400).json({ error: 'patient_id, patient_name, and doctor_id are required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO registrations (patient_id, patient_name, doctor_id, doctor_name, registration_date, reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [patient_id, patient_name, doctor_id, doctor_name || '', registration_date || new Date().toISOString().split('T')[0], reason || '', notes || '']
    );
    res.status(201).json({ message: 'Registration created', registrationId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update registration status
router.put('/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    await pool.execute(
      'UPDATE registrations SET status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE id = ?',
      [status, notes, req.params.id]
    );
    res.json({ message: 'Registration updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete registration
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM registrations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Registration deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Count (for admin)
router.get('/count/total', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM registrations');
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
