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