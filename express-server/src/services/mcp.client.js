const { Client } = require('@modelcontextprotocol/sdk/client');
// const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse');
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js")

let client = null;
let tools = [];

/*const connectMCP = async () => {
  try {
    client = new Client(
      { name: 'todo-chat-client', version: '1.0.0' },
      { capabilities: {} }
    );

    console.log('🔌 Connecting to MCP server...');
    console.log(`📡 MCP Server URL: `, process.env.MCP_SERVER_URL + '/sse');
    const transport = new SSEClientTransport(
      new URL(process.env.MCP_SERVER_URL + '/sse')
    );

    await client.connect(transport);
    console.log('✅ MCP Client connected');

    // tools list নিয়ে রাখো
    const result = await client.listTools();
    tools = result.tools;
    console.log(`✅ ${tools.length} tools loaded`);

    return client;
  } catch (err) {
    console.error('❌ MCP connection failed:', err.message);
    throw err;
  }
}; */

const connectMCP = async () => {
  try {
    client = new Client(
      { name: 'todo-chat-client', version: '1.0.0' },
      { capabilities: {} }
    );

    const transport = new SSEClientTransport(
      new URL(process.env.MCP_SERVER_URL + '/sse')
    );

    // disconnect হলে reconnect করো
    transport.onclose = async () => {
      console.log('⚠️ MCP disconnected, reconnecting in 3s...');
      setTimeout(connectMCP, 3000);
    };

    await client.connect(transport);
    console.log('✅ MCP Client connected');

    const result = await client.listTools();
    tools = result.tools;
    console.log(`✅ ${tools.length} tools loaded`);

    return client;
  } catch (err) {
    console.error('❌ MCP connection failed:', err.message);
    console.log('🔄 Retrying in 3s...');
    setTimeout(connectMCP, 3000);
  }
};

const callTool = async (name, args) => {
  if (!client) throw new Error('MCP not connected');
  const result = await client.callTool({ name, arguments: args });
  return result.content[0].text;
};

const getTools = () => tools;

module.exports = { connectMCP, callTool, getTools };