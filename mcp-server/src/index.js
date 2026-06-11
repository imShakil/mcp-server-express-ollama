const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const server = new Server(
  { name: 'todo-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ১. সব tools list করো
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
    }
  ]
}));

// ২. Tool call handle করো
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_todos') {
    const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }]
    };
  }

  if (name === 'create_todo') {
    const result = await pool.query(
      'INSERT INTO todos (title) VALUES ($1) RETURNING *', [args.title]
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows[0], null, 2) }]
    };
  }

  if (name === 'toggle_todo') {
    const result = await pool.query(
      'UPDATE todos SET completed = NOT completed WHERE id = $1 RETURNING *', [args.id]
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows[0], null, 2) }]
    };
  }

  if (name === 'delete_todo') {
    await pool.query('DELETE FROM todos WHERE id = $1', [args.id]);
    return {
      content: [{ type: 'text', text: `Todo ${args.id} deleted` }]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// ৩. Server start করো
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('✅ MCP Server running');
});