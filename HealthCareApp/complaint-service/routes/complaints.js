const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get all complaints
router.get('/', async (req, res) => {
  try {
    const { user_id, status, priority } = req.query;
    let query = 'SELECT * FROM complaints';
    const conditions = [];
    const params = [];
    if (user_id) { conditions.push('user_id = ?'); params.push(user_id); }
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (priority) { conditions.push('priority = ?'); params.push(priority); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get complaint by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create complaint
router.post('/', async (req, res) => {
  try {
    const { user_id, user_name, subject, description, category, priority } = req.body;
    if (!user_id || !user_name || !subject || !description) {
      return res.status(400).json({ error: 'user_id, user_name, subject, and description are required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO complaints (user_id, user_name, subject, description, category, priority) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, user_name, subject, description, category || 'other', priority || 'medium']
    );
    res.status(201).json({ message: 'Complaint submitted', complaintId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update complaint
router.put('/:id', async (req, res) => {
  try {
    const { status, resolution, priority } = req.body;
    await pool.execute(
      'UPDATE complaints SET status=COALESCE(?,status), resolution=COALESCE(?,resolution), priority=COALESCE(?,priority) WHERE id=?',
      [status, resolution, priority, req.params.id]
    );
    res.json({ message: 'Complaint updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete complaint
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM complaints WHERE id = ?', [req.params.id]);
    res.json({ message: 'Complaint deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Count (for admin)
router.get('/count/total', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM complaints');
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
