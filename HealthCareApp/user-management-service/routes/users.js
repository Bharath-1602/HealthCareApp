const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, username, email, full_name, role, phone, address, created_at FROM users');
    res.json(rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, full_name, role, phone, address, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this user' });
    }
    const { full_name, phone, address, email } = req.body;
    await pool.execute(
      'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), address = COALESCE(?, address), email = COALESCE(?, email) WHERE id = ?',
      [full_name, phone, address, email, userId]
    );
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user count (for admin service)
router.get('/count/total', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users');
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error('Count error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
