const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

// Attendance log করো
router.post('/', authenticate, async (req, res) => {
  const { employee_id, date, status, reason } = req.body;
  const result = await pool.query(
    `INSERT INTO attendance (employee_id, date, status, reason)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (employee_id, date) 
     DO UPDATE SET status=$3, reason=$4
     RETURNING *`,
    [employee_id, date, status, reason]
  );
  res.json(result.rows[0]);
});

// Employee-এর monthly summary
router.get('/summary/:employee_id', authenticate, async (req, res) => {
  const { employee_id } = req.params;
  const { month, year } = req.query;

  const result = await pool.query(
    `SELECT 
       status,
       COUNT(*) as count,
       array_agg(json_build_object('date', date, 'reason', reason)) as details
     FROM attendance
     WHERE employee_id = $1
       AND EXTRACT(MONTH FROM date) = $2
       AND EXTRACT(YEAR FROM date) = $3
     GROUP BY status`,
    [employee_id, month || new Date().getMonth() + 1, year || new Date().getFullYear()]
  );
  res.json(result.rows);
});

module.exports = router;