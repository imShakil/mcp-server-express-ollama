import { createProvider } from './providers/registry.js';
import { callMCPTool, getMCPTools } from './mcpClient.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const promptPath = resolve(__dirname, '../system_prompt.md');
const systemPrompt = existsSync(promptPath)
  ? readFileSync(promptPath, 'utf-8')
  : 'You are SyftCommerce AI Assistant.';

export function createChatService(config) {
  const provider = createProvider(config);
  let history = [];

  async function chat(userMessage, onChunk) {
    const mcpTools = getMCPTools();
    const aiTools = provider.buildTools(mcpTools);
    const messages = provider.buildMessages(systemPrompt, history, userMessage);

    let turns = 0;
    const maxTurns = 5;

    while (turns < maxTurns) {
      turns++;

      const response = await provider.chatWithTools(messages, aiTools);
      const text = provider.extractText(response);
      const toolCalls = provider.extractToolCalls(response);

      if (toolCalls.length === 0) {
        messages.push({ role: 'assistant', content: text || '' });
        const stream = await provider.chatStream(messages);
        const full = await provider.streamResponse(stream, onChunk);
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

        messages.push({
          role: 'assistant',
          content: text || null,
          tool_calls: [{ id: tc.id, function: { name: tc.name, arguments: JSON.stringify(tc.args) }, type: 'function' }],
        });
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
