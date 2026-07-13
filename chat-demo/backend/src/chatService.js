import { createProvider } from './providers.js';
import { callMCPTool, getMCPTools } from './mcpClient.js';

export function createChatService(config) {
  const provider = createProvider(config);
  let history = [];

  const systemPrompt = `You are SyftCommerce AI Assistant — a helpful shopping assistant for an ecommerce platform.

You have access to commerce tools. Use them whenever the user asks about:
- Products (search, view details, list, categories)
- Cart (create, add items, remove, update quantity, apply coupon)
- Checkout (shipping methods, payment methods, place order)
- Orders (view, list, track, cancel)

Rules:
- Respond in clean markdown
- Use **bold** for product names, prices, and important values
- Be concise and helpful
- Always confirm before doing destructive actions (checkout, cancel order)
- If you don't have enough info to call a tool, ask the user`;

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
