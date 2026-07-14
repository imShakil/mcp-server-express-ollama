import { Ollama } from 'ollama';

export class OllamaProvider {
  constructor(config) {
    this.model = config.AI_MODEL || 'gemma4:e4b';
    this.client = new Ollama({ host: config.OLLAMA_HOST || 'http://localhost:11434' });
  }

  buildMessages(systemPrompt, history, userMessage) {
    const sysMsg = { role: 'system', content: systemPrompt };
    const msgs = history.map(m => ({ role: m.role, content: m.content }));
    return [sysMsg, ...msgs, { role: 'user', content: userMessage }];
  }

  buildTools(mcpTools) {
    return mcpTools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }

  async chatWithTools(messages, tools) {
    const response = await this.client.chat({
      model: this.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: false,
    });
    return response.message;
  }

  async chatStream(messages) {
    return await this.client.chat({
      model: this.model,
      messages,
      stream: true,
    });
  }

  extractText(message) {
    return message.content || '';
  }

  extractToolCalls(message) {
    return (message.tool_calls || []).map(tc => ({
      id: `${tc.function.name}-${Date.now()}`,
      name: tc.function.name,
      args: tc.function.arguments,
    }));
  }

  buildToolResultMessage(toolCall, result) {
    return {
      role: 'tool',
      content: typeof result === 'string' ? result : JSON.stringify(result),
    };
  }

  async streamResponse(stream, onChunk) {
    let full = '';
    for await (const chunk of stream) {
      const text = chunk.message?.content || '';
      if (text) {
        full += text;
        onChunk(text);
      }
    }
    return full;
  }
}
