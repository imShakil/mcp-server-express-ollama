const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

// সব employees
router.get('/', authenticate, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM employees ORDER BY join_date DESC'
  );
  res.json(result.rows);
});

// নতুন employee
router.post('/', authenticate, async (req, res) => {
  const { name, email, department, join_date, salary } = req.body;

  // join date থেকে next increment = 1 বছর পর
  const next_increment_date = new Date(join_date);
  next_increment_date.setFullYear(next_increment_date.getFullYear() + 1);

  const result = await pool.query(
    `INSERT INTO employees 
     (name, email, department, join_date, next_increment_date, salary)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, email, department, join_date, next_increment_date, salary]
  );
  res.status(201).json(result.rows[0]);
});

// Increment update
router.patch('/:id/increment', authenticate, async (req, res) => {
  const next = new Date();
  next.setFullYear(next.getFullYear() + 1);

  const result = await pool.query(
    `UPDATE employees SET 
     last_increment_date = NOW(),
     next_increment_date = $1
     WHERE id = $2 RETURNING *`,
    [next, req.params.id]
  );
  res.json(result.rows[0]);
});

// এই year-এ increment due
router.get('/increment-due', authenticate, async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const result = await pool.query(
    `SELECT * FROM employees 
     WHERE EXTRACT(YEAR FROM next_increment_date) = $1
     ORDER BY next_increment_date ASC`,
    [year]
  );
  res.json(result.rows);
});

module.exports = router;