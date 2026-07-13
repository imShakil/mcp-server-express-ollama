import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

let client = null;
let tools = [];

export async function connectMCP(serverUrl) {
  client = new Client(
    { name: 'syftcommerce-chat-client', version: '1.0.0' },
    { capabilities: {} },
  );

  const transport = new SSEClientTransport(new URL(`${serverUrl}/sse`));

  transport.onclose = () => {
    console.log('MCP disconnected, reconnecting in 3s...');
    setTimeout(() => connectMCP(serverUrl), 3000);
  };

  await client.connect(transport);
  console.log('Connected to MCP server');

  const result = await client.listTools();
  tools = result.tools;
  console.log(`${tools.length} tools loaded from MCP`);

  return client;
}

export async function callMCPTool(name, args) {
  if (!client) throw new Error('MCP not connected');
  const result = await client.callTool({ name, arguments: args });
  return result.content.map(c => c.text).join('\n');
}

export function getMCPTools() {
  return tools;
}
