import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

export function createTransportApp(port: number): {
  app: express.Express;
  start: (mcpServer: Server) => void;
  stop: () => void;
} {
  const app = express();
  app.use(cors());

  const transports: Record<string, SSEServerTransport> = {};
  let mcpServer: Server | null = null;

  app.get('/sse', async (req, res) => {
    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;

    res.on('close', () => {
      delete transports[transport.sessionId];
      console.log(`Client disconnected: ${transport.sessionId}`);
    });

    await mcpServer?.connect(transport);
    console.log(`Client connected: ${transport.sessionId}`);
  });

  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];

    if (!transport) {
      return void res.status(404).json({ error: 'Session not found' });
    }

    await transport.handlePostMessage(req, res);
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', sessions: Object.keys(transports).length });
  });

  let httpServer: ReturnType<typeof app.listen> | null = null;

  const start = (server: Server) => {
    mcpServer = server;
    httpServer = app.listen(port, () => {
      console.log(`SyftCommerce MCP running on http://localhost:${port}`);
      console.log(`  SSE: http://localhost:${port}/sse`);
      console.log(`  Health: http://localhost:${port}/health`);
    });
  };

  const stop = () => {
    httpServer?.close();
  };

  return { app, start, stop };
}
