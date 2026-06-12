const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
  res.json(result.rows);
});

router.post('/', authenticate, async (req, res) => {
  const { title } = req.body;
  const result = await pool.query(
    'INSERT INTO todos (title) VALUES ($1) RETURNING *', [title]
  );
  res.json(result.rows[0]);
});

router.patch('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'UPDATE todos SET completed = NOT completed WHERE id = $1 RETURNING *', [id]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', authenticate, async (req, res) => {
  await pool.query('DELETE FROM todos WHERE id = $1', [req.params.id]);
  res.json({ message: 'deleted' });
});

module.exports = router;