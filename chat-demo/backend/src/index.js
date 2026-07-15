import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectMCP } from './mcpClient.js';
import { createChatService } from './chatService.js';

dotenv.config();

const config = {
  AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
  AI_BASE_URL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'gpt-4o',
  AI_TEMPERATURE: process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : undefined,
  AI_MAX_TOKENS: process.env.AI_MAX_TOKENS ? parseInt(process.env.AI_MAX_TOKENS, 10) : undefined,
  AI_TOP_P: process.env.AI_TOP_P ? parseFloat(process.env.AI_TOP_P) : undefined,
  AI_REASONING_EFFORT: process.env.AI_REASONING_EFFORT,
  AI_STOP: process.env.AI_STOP,
  OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  MCP_SERVER_URL: process.env.MCP_SERVER_URL || 'http://localhost:4001',
  PORT: parseInt(process.env.PORT || '4000', 10),
};

const app = express();
app.use(cors());
app.use(express.json());

const chatService = createChatService(config);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: config.AI_MODEL, mcpUrl: config.MCP_SERVER_URL });
});

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    await chatService.chat(message,
      (chunk) => { res.write(`data: ${JSON.stringify({ chunk })}\n\n`); },
      (chunk) => { res.write(`data: ${JSON.stringify({ thinking: chunk })}\n\n`); },
    );
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    console.error('Chat error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

app.get('/history', (_req, res) => {
  res.json(chatService.getHistory());
});

app.delete('/history', (_req, res) => {
  chatService.clearHistory();
  res.json({ ok: true });
});

async function start() {
  try {
    await connectMCP(config.MCP_SERVER_URL);
    console.log('Connected to SyftCommerce MCP');
  } catch (err) {
    console.warn('MCP not available yet. Retrying in background...');
  }

  app.listen(config.PORT, () => {
    console.log(`\nSyftCommerce Chat Demo Backend`);
    console.log(`===============================`);
    const apiUrl = config.AI_PROVIDER === 'ollama'
      ? config.OLLAMA_HOST
      : config.AI_PROVIDER === 'groq'
        ? 'https://api.groq.com'
        : config.AI_BASE_URL;
    console.log(`Provider: ${config.AI_PROVIDER}`);
    console.log(`Model: ${config.AI_MODEL}`);
    console.log(`Endpoint: ${apiUrl}`);
    console.log(`MCP: ${config.MCP_SERVER_URL}`);
    console.log(`Server: http://localhost:${config.PORT}`);
    console.log(`Chat: POST http://localhost:${config.PORT}/chat\n`);
  });
}

start();
