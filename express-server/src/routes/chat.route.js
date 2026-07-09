const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { chat } = require('../services/chat.service');
const { pool } = require('../db');

// Chat history save করার জন্য table লাগবে
const initChatTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
};
initChatTable();

// Chat history লোড করো
router.get('/history', authenticate, async (req, res) => {
  const result = await pool.query(
    'SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT 50',
    [req.user.id]
  );
  res.json(result.rows);
});

// Chat clear করো
router.delete('/history', authenticate, async (req, res) => {
  await pool.query('DELETE FROM chat_messages WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'cleared' });
});

// Main chat endpoint (SSE streaming)
router.post('/', authenticate, async (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // User message DB-তে save করো
    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [userId, 'user', message]
    );

    // পুরো history লোড করো context-এর জন্য
    // const historyResult = await pool.query(
    //   'SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC',
    //   [userId]
    // );

    const historyResult = await pool.query(
      `SELECT role, content FROM chat_messages 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 6`,
      [userId]
    );

    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant for managing todos and employees.
          You have access to tools — always use them when user asks about todos or employees.

          RESPONSE FORMATTING RULES:
          - Always respond in Markdown format
          - Use bullet points or numbered lists for multiple items
          - Use **bold** for names, dates, and important values
          - Use ## headings when showing grouped data
          - Keep responses concise and well-structured

          Current user: ${req.user.name}`
      },
      { role: 'user', content: message }
      //...historyResult.rows.map(r => ({ role: r.role, content: r.content }))
    ];

    console.log(JSON.stringify(messages))
    let fullResponse = '';

    console.log('User message:', message);
    // Streaming chunks পাঠাও
    await chat(messages, (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    // Assistant response save করো
    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [userId, 'assistant', fullResponse]
    );

    // Done signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;