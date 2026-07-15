import Groq from 'groq-sdk';

export class GroqProvider {
  constructor(config) {
    this.client = new Groq({
      apiKey: config.GROQ_API_KEY,
    });
    this.model = config.AI_MODEL;
    this.temperature = config.AI_TEMPERATURE != null ? config.AI_TEMPERATURE : undefined;
    this.maxTokens = config.AI_MAX_TOKENS || config.AI_MAX_COMPLETION_TOKENS;
    this.topP = config.AI_TOP_P;
    this.reasoningEffort = config.AI_REASONING_EFFORT;
    this.stop = config.AI_STOP;
  }

  get extraParams() {
    const params = {};
    if (this.temperature !== undefined) params.temperature = this.temperature;
    if (this.maxTokens) params.max_completion_tokens = this.maxTokens;
    if (this.topP) params.top_p = this.topP;
    if (this.reasoningEffort) params.reasoning_effort = this.reasoningEffort;
    if (this.stop !== undefined) params.stop = this.stop;
    return params;
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
      ...this.extraParams,
    });
    return response.choices[0].message;
  }

  async chatStream(messages) {
    return await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
      ...this.extraParams,
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
