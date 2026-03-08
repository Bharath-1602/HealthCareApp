const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get all vitals (filterable)
router.get('/', async (req, res) => {
  try {
    const { patient_id } = req.query;
    let query = 'SELECT * FROM vital_signs';
    let params = [];
    if (patient_id) { query += ' WHERE patient_id = ?'; params.push(patient_id); }
    query += ' ORDER BY recorded_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vital by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM vital_signs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create vital record
router.post('/', async (req, res) => {
  try {
    const { patient_id, patient_name, user_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, respiratory_rate, oxygen_saturation, weight, height, blood_sugar, notes } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
    const [result] = await pool.execute(
      `INSERT INTO vital_signs (patient_id, patient_name, user_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, respiratory_rate, oxygen_saturation, weight, height, blood_sugar, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, patient_name||'', user_id||null, blood_pressure_systolic||null, blood_pressure_diastolic||null, heart_rate||null, temperature||null, respiratory_rate||null, oxygen_saturation||null, weight||null, height||null, blood_sugar||null, notes||'']
    );
    res.status(201).json({ message: 'Vital signs recorded', vitalId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vital
router.put('/:id', async (req, res) => {
  try {
    const fields = req.body;
    const setClauses = [];
    const values = [];
    for (const [key, val] of Object.entries(fields)) {
      if (['patient_id','blood_pressure_systolic','blood_pressure_diastolic','heart_rate','temperature','respiratory_rate','oxygen_saturation','weight','height','blood_sugar','notes'].includes(key)) {
        setClauses.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (setClauses.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    values.push(req.params.id);
    await pool.execute(`UPDATE vital_signs SET ${setClauses.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Vital signs updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete vital
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM vital_signs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vital signs deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Count (for admin)
router.get('/count/total', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM vital_signs');
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
