import { createProvider } from './providers/registry.js';
import { callMCPTool, getMCPTools } from './mcpClient.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const promptPath = resolve(__dirname, './system_prompt.md');
const systemPrompt = existsSync(promptPath)
  ? readFileSync(promptPath, 'utf-8')
  : 'You are SyftCommerce AI Assistant.';

function createChunkProcessor(onChunk, onThinking) {
  let buffer = '';
  let inThinking = false;
  let openTag = '';
  const tags = ['<think>', '<thinking>'];
  const closeTags = ['</think>', '</thinking>'];
  const maxTagLen = Math.max(...tags.map(t => t.length));
  const maxCloseLen = Math.max(...closeTags.map(t => t.length));

  function findOpening(buf) {
    for (const tag of tags) {
      const i = buf.indexOf(tag);
      if (i !== -1) return { tag, start: i, len: tag.length };
    }
    return null;
  }

  function flushText() {
    if (!buffer) return;
    const lastOpen = buffer.lastIndexOf('<');
    if (lastOpen !== -1) {
      const tail = buffer.slice(lastOpen);
      if (tail.length < maxTagLen) {
        for (const tag of tags) {
          if (tag.startsWith(tail)) {
            const flush = buffer.slice(0, lastOpen);
            if (flush) onChunk(flush);
            buffer = tail;
            return;
          }
        }
      }
    }
    onChunk(buffer);
    buffer = '';
  }

  function flushThinking() {
    if (!buffer) return;
    const lastClose = buffer.lastIndexOf('<');
    if (lastClose !== -1) {
      const tail = buffer.slice(lastClose);
      if (tail.length < maxCloseLen) {
        for (const ct of closeTags) {
          if (ct.startsWith(tail)) {
            const flush = buffer.slice(0, lastClose);
            if (flush) onThinking(flush);
            buffer = tail;
            return;
          }
        }
      }
    }
    onThinking(buffer);
    buffer = '';
  }

  return (chunk) => {
    buffer += chunk;

    while (true) {
      if (inThinking) {
        const closeTag = openTag === '<thinking>' ? '</thinking>' : '</think>';
        const closeIdx = buffer.indexOf(closeTag);
        if (closeIdx === -1) {
          flushThinking();
          break;
        }
        const thinkContent = buffer.slice(0, closeIdx);
        if (thinkContent) onThinking(thinkContent);
        buffer = buffer.slice(closeIdx + closeTag.length);
        inThinking = false;
        continue;
      }

      const match = findOpening(buffer);
      if (!match) {
        flushText();
        break;
      }

      const before = buffer.slice(0, match.start);
      if (before) onChunk(before);
      buffer = buffer.slice(match.start + match.len);
      openTag = match.tag;
      inThinking = true;
    }
  };
}

export function createChatService(config) {
  const provider = createProvider(config);
  let history = [];

  async function chat(userMessage, onChunk, onThinking) {
    const mcpTools = getMCPTools();
    const aiTools = provider.buildTools(mcpTools);
    const messages = provider.buildMessages(systemPrompt, history, userMessage);

    let turns = 0;
    const maxTurns = 5;

    console.log(`Chat request: ${aiTools.length} tools available, ${messages.length} messages in context`);

    while (turns < maxTurns) {
      turns++;

      const response = await provider.chatWithTools(messages, aiTools);
      const text = provider.extractText(response);
      const toolCalls = provider.extractToolCalls(response);

      if (toolCalls.length === 0) {
        messages.push({ role: 'assistant', content: text || '' });
        const stream = await provider.chatStream(messages);
        const processor = createChunkProcessor(onChunk, onThinking);
        const full = await provider.streamResponse(stream, (chunk) => processor(chunk));
        history.push({ role: 'user', content: userMessage });
        history.push({ role: 'assistant', content: full });
        if (history.length > 20) history = history.slice(-20);
        return full;
      }

      for (const tc of toolCalls) {
        console.log(`Calling tool: ${tc.name}`, tc.args);
        let result;
        try {
          result = await callMCPTool(tc.name, tc.args);
          console.log(`Tool ${tc.name} succeeded`);
        } catch (err) {
          result = `Error: ${err.message}`;
          console.log(`Tool ${tc.name} failed:`, err.message);
        }

        messages.push(provider.buildAssistantToolCallMessage(tc, text));
        messages.push(provider.buildToolResultMessage(tc, result));
      }
    }

    const fallback = 'I apologize, but I encountered too many steps. Please try again.';
    onChunk(fallback);
    return fallback;
  }

  function getHistory() { return history; }
  function clearHistory() { history = []; }

  return { chat, getHistory, clearHistory };
}
