const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get all posts
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM posts';
    let params = [];
    if (category) { query += ' WHERE category = ?'; params.push(category); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get post by ID with comments
router.get('/:id', async (req, res) => {
  try {
    const [posts] = await pool.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (posts.length === 0) return res.status(404).json({ error: 'Post not found' });
    const [comments] = await pool.execute('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json({ ...posts[0], comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create post
router.post('/', async (req, res) => {
  try {
    const { user_id, author_name, title, content, category } = req.body;
    if (!user_id || !author_name || !title || !content) {
      return res.status(400).json({ error: 'user_id, author_name, title, and content are required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO posts (user_id, author_name, title, content, category) VALUES (?, ?, ?, ?, ?)',
      [user_id, author_name, title, content, category || 'general']
    );
    res.status(201).json({ message: 'Post created', postId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update post
router.put('/:id', async (req, res) => {
  try {
    const { title, content, category } = req.body;
    await pool.execute(
      'UPDATE posts SET title=COALESCE(?,title), content=COALESCE(?,content), category=COALESCE(?,category) WHERE id=?',
      [title, content, category, req.params.id]
    );
    res.json({ message: 'Post updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete post
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like a post
router.post('/:id/like', async (req, res) => {
  try {
    await pool.execute('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post liked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to post
router.post('/:id/comments', async (req, res) => {
  try {
    const { user_id, author_name, content } = req.body;
    if (!user_id || !author_name || !content) {
      return res.status(400).json({ error: 'user_id, author_name, and content are required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO comments (post_id, user_id, author_name, content) VALUES (?, ?, ?, ?)',
      [req.params.id, user_id, author_name, content]
    );
    res.status(201).json({ message: 'Comment added', commentId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comments for post
router.get('/:id/comments', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Count (for admin)
router.get('/count/total', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM posts');
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
