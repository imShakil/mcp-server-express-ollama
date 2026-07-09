import { Server } from '@modelcontextprotocol/sdk/server';
//const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse');
// const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js")
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";

import { Pool } from 'pg';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// ── DB ──────────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ── MCP Server ──────────────────────────────────────
const server = new Server(
  { name: 'todo-mcp-server', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_todos',
      description: 'Get all todos from database',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'create_todo',
      description: 'Create a new todo',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Todo title' }
        },
        required: ['title']
      }
    },
    {
      name: 'toggle_todo',
      description: 'Toggle todo completed status',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Todo ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'delete_todo',
      description: 'Delete a todo',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Todo ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'search_todos',
      description: 'Search todos by keyword in title',
      inputSchema: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Search keyword' }
        },
        required: ['keyword']
      }
    },
    {
      name: 'filter_todos',
      description: 'Filter todos by completed status',
      inputSchema: {
        type: 'object',
        properties: {
          completed: { type: 'boolean', description: 'true = completed, false = pending' }
        },
        required: ['completed']
      }
    },
    {
      name: 'get_todo_stats',
      description: 'Get total, completed, pending count of todos',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'update_todo_title',
      description: 'Update the title of a todo',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Todo ID' },
          title: { type: 'string', description: 'New title' }
        },
        required: ['id', 'title']
      }
    },
    {
      name: 'add_employee',
      description: 'Add a new employee',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          department: { type: 'string' },
          join_date: { type: 'string', description: 'YYYY-MM-DD' },
          salary: { type: 'number' }
        },
        required: ['name', 'email', 'join_date']
      }
    },
    {
      name: 'get_employees',
      description: 'Get all employees',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'get_increment_due',
      description: 'Get employees with increment due in a year',
      inputSchema: {
        type: 'object',
        properties: {
          year: { type: 'number', description: 'Year e.g. 2026' }
        }
      }
    },
    {
      name: 'log_attendance',
      description: 'Log attendance for one or multiple employees',
      inputSchema: {
        type: 'object',
        properties: {
          employee_ids: {
            type: 'array',
            items: { type: 'number' },
            description: 'List of employee IDs'
          },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          status: { type: 'string', description: 'present, absent, or leave' },
          reason: { type: 'string' }
        },
        required: ['employee_ids', 'date', 'status']
      }
    },
    {
      name: 'get_attendance_summary',
      description: 'Get monthly attendance summary for an employee. IMPORTANT: month and year must be plain integers only, no markdown, no bold, no asterisks. Example: month=12, year=2024',
      inputSchema: {
        type: 'object',
        properties: {
          employee_id: { type: 'number', description: 'Plain integer only. Example: 1' },
          employee_name: { type: 'string', description: 'Employee name to search' },
          month: { type: 'number', description: 'Plain integer 1-12. Example: 12. Do NOT use markdown bold or asterisks.' },
          year: { type: 'number', description: 'Plain 4-digit integer. Example: 2024. Do NOT use markdown bold or asterisks.' }
        },
        required: ['month', 'year']
      }
    },
    {
      name: 'update_increment',
      description: 'Update increment date for an employee',
      inputSchema: {
        type: 'object',
        properties: {
          employee_id: { type: 'number' }
        },
        required: ['employee_id']
      }
    }    
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_todos') {
    const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    return { content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }] };
  }
  if (name === 'create_todo') {
    const result = await pool.query(
      'INSERT INTO todos (title) VALUES ($1) RETURNING *', [args.title]
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows[0], null, 2) }] };
  }
  if (name === 'toggle_todo') {
    const result = await pool.query(
      'UPDATE todos SET completed = NOT completed WHERE id = $1 RETURNING *', [args.id]
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows[0], null, 2) }] };
  }
  if (name === 'delete_todo') {
    await pool.query('DELETE FROM todos WHERE id = $1', [args.id]);
    return { content: [{ type: 'text', text: `Todo ${args.id} deleted` }] };
  }
  if (name === 'search_todos') {
    const result = await pool.query(
      'SELECT * FROM todos WHERE title ILIKE $1 ORDER BY created_at DESC',
      [`%${args.keyword}%`]
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }] };
  }

  if (name === 'filter_todos') {
    const result = await pool.query(
      'SELECT * FROM todos WHERE completed = $1 ORDER BY created_at DESC',
      [args.completed]
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }] };
  }

  if (name === 'get_todo_stats') {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed,
        COUNT(*) FILTER (WHERE completed = false) as pending
      FROM todos
    `);
    return { content: [{ type: 'text', text: JSON.stringify(result.rows[0], null, 2) }] };
  }

  if (name === 'update_todo_title') {
    const result = await pool.query(
      'UPDATE todos SET title = $1 WHERE id = $2 RETURNING *',
      [args.title, args.id]
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows[0], null, 2) }] };
  }

  if (name === 'add_employee') {
    const { name: empName, email, department, join_date, salary } = args;
    const next = new Date(join_date);
    next.setFullYear(next.getFullYear() + 1);
    const result = await pool.query(
      `INSERT INTO employees (name, email, department, join_date, next_increment_date, salary)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [empName, email, department, join_date, next, salary]
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows[0], null, 2) }] };
  }

  if (name === 'get_employees') {
    const result = await pool.query('SELECT * FROM employees ORDER BY join_date DESC');
    return { content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }] };
  }

  if (name === 'get_increment_due') {
    const year = args.year || new Date().getFullYear();
    const result = await pool.query(
      `SELECT id, name, department, next_increment_date, salary
      FROM employees 
      WHERE EXTRACT(YEAR FROM next_increment_date) = $1
      ORDER BY next_increment_date ASC`,
      [year]
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }] };
  }

  if (name === 'log_attendance') {
  let { employee_ids, employee_id, date, status, reason } = args;

    // employee_id বা employee_ids যেকোনো format handle করো
    if (!employee_ids) {
      employee_ids = employee_id;
    }

    // string হলে parse করো
    if (typeof employee_ids === 'string') {
      employee_ids = JSON.parse(employee_ids);
    }

    // single number হলে array বানাও
    if (!Array.isArray(employee_ids)) {
      employee_ids = [employee_ids];
    }
    const results = [];

    for (const id of employee_ids) {
      const result = await pool.query(
        `INSERT INTO attendance (employee_id, date, status, reason)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (employee_id, date)
        DO UPDATE SET status=$3, reason=$4
        RETURNING *`,
        [id, date, status, reason]
      );
      results.push(result.rows[0]);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ logged: results.length, records: results }, null, 2)
      }]
    };
  }

  if (name === 'get_attendance_summary') {
    const { employee_id, employee_name, month, year } = args;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    let query, params;

    if (employee_name) {
      query = `
        SELECT e.name, a.status, COUNT(*) as count,
          array_agg(json_build_object('date', a.date, 'reason', a.reason)) as details
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        WHERE LOWER(e.name) LIKE LOWER($1)
          AND EXTRACT(MONTH FROM a.date) = $2
          AND EXTRACT(YEAR FROM a.date) = $3
        GROUP BY e.name, a.status`;
      params = [`%${employee_name}%`, m, y];
    } else {
      query = `
        SELECT e.name, a.status, COUNT(*) as count,
          array_agg(json_build_object('date', a.date, 'reason', a.reason)) as details
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        WHERE a.employee_id = $1
          AND EXTRACT(MONTH FROM a.date) = $2
          AND EXTRACT(YEAR FROM a.date) = $3
        GROUP BY e.name, a.status`;
      params = [employee_id, m, y];
    }

    const result = await pool.query(query, params);
    return { content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }] };
  }

  if (name === 'update_increment') {
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const result = await pool.query(
      `UPDATE employees SET 
      last_increment_date = NOW(),
      next_increment_date = $1
      WHERE id = $2 RETURNING name, last_increment_date, next_increment_date`,
      [next, args.employee_id]
    );
    return { content: [{ type: 'text', text: JSON.stringify(result.rows[0], null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// ── Express + SSE ───────────────────────────────────
const app = express();
app.use(cors());
// NOTE: Do NOT use `express.json()` globally here because it
// consumes the request stream which `SSEServerTransport` needs
// for `/messages`. Parse JSON only in handlers that require it.

// active transports store করবো
const transports = {};

// Client connect হলে SSE connection তৈরি হবে
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;

  res.on('close', () => {
    delete transports[transport.sessionId];
    console.log(`Client disconnected: ${transport.sessionId}`);
  });

  await server.connect(transport);
  console.log(`Client connected: ${transport.sessionId}`);
});

// Client message পাঠাবে এখানে
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];

  if (!transport) {
    return res.status(404).json({ error: 'Session not found' });
  }

  await transport.handlePostMessage(req, res);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', sessions: Object.keys(transports).length });
});

const PORT = process.env.MCP_PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ MCP HTTP Server running on http://localhost:${PORT}`);
  console.log(`   SSE endpoint: http://localhost:${PORT}/sse`);
});