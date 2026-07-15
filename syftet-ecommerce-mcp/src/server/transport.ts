import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

export type ServerFactory = () => Server;

export function createTransportApp(port: number): {
  start: (factory: ServerFactory) => void;
  stop: () => void;
} {
  const app = express();
  app.use(cors());

  const transports: Record<string, SSEServerTransport> = {};
  const servers: Server[] = [];
  let httpServer: ReturnType<typeof app.listen> | null = null;

  app.get('/sse', async (req, res) => {
    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;

    const server = createServer();
    servers.push(server);

    res.on('close', () => {
      delete transports[transport.sessionId];
      server.close();
      const idx = servers.indexOf(server);
      if (idx !== -1) servers.splice(idx, 1);
      console.log(`Client disconnected: ${transport.sessionId}`);
    });

    await server.connect(transport);
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

  let createServer: ServerFactory = () => { throw new Error('Server not started') };

  const start = (factory: ServerFactory) => {
    createServer = factory;
    httpServer = app.listen(port, () => {
      console.log(`SyftCommerce MCP running on http://localhost:${port}`);
      console.log(`  SSE: http://localhost:${port}/sse`);
      console.log(`  Health: http://localhost:${port}/health`);
    });
  };

  const stop = () => {
    for (const server of servers) {
      server.close();
    }
    servers.length = 0;
    httpServer?.close();
  };

  return { start, stop };
}
