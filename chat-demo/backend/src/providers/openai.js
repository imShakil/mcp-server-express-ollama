import OpenAI from 'openai';

export class OpenAIProvider {
  constructor(config) {
    this.client = new OpenAI({
      baseURL: config.AI_BASE_URL,
      apiKey: config.AI_API_KEY,
    });
    this.model = config.AI_MODEL;
  }

  buildMessages(systemPrompt, history, userMessage) {
    return [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];
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
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: 'auto',
    });
    return response.choices[0].message;
  }

  async chatStream(messages) {
    return await this.client.chat.completions.create({
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
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments),
    }));
  }

  buildAssistantToolCallMessage(tc, text) {
    return {
      role: 'assistant',
      content: text || null,
      tool_calls: [{
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.args) },
      }],
    };
  }

  buildToolResultMessage(toolCall, result) {
    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: typeof result === 'string' ? result : JSON.stringify(result),
    };
  }

  async streamResponse(stream, onChunk) {
    let full = '';
    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content || '';
      if (text) {
        full += text;
        onChunk(text);
      }
    }
    return full;
  }
}
