const ollama = require('ollama').default;
const { callTool, getTools } = require('./mcp.client');

// MCP tools কে Ollama-র format-এ convert করো
const getMCPToolsForOllama = () => {
  return getTools().map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }
  }));
};

const chat = async (messages, onChunk) => {
  const tools = getMCPToolsForOllama();

  // ধাপ ১: Ollama কে message + tools দাও
  const response = await ollama.chat({
    model: process.env.OLLAMA_MODEL || 'llama3:latest',
    messages,
    tools,
    stream: false
  });

  const message = response.message;

  // ধাপ ২: Tool call দরকার কিনা দেখো
  if (message.tool_calls?.length > 0) {
    const updatedMessages = [...messages, message];

    // সব tool calls execute করো
    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = toolCall.function.arguments;

      console.log(`🔧 Calling tool: ${toolName}`, toolArgs);

      try {
        const toolResult = await callTool(toolName, toolArgs);
        updatedMessages.push({
          role: 'tool',
          content: toolResult
        });
      } catch (err) {
        updatedMessages.push({
          role: 'tool',
          content: `Error: ${err.message}`
        });
      }
    }

    // ধাপ ৩: Tool result দিয়ে final response নাও (streaming)
    const finalResponse = await ollama.chat({
      model: process.env.OLLAMA_MODEL || 'llama3:latest',
      messages: updatedMessages,
      stream: true
    });

    let fullText = '';
    for await (const chunk of finalResponse) {
      const text = chunk.message?.content || '';
      fullText += text;
      if (onChunk) onChunk(text);
    }

    return fullText;
  }

  // Tool call না লাগলে সরাসরি streaming response
  const streamResponse = await ollama.chat({
    model: process.env.OLLAMA_MODEL || 'llama3:latest',
    messages,
    stream: true
  });

  let fullText = '';
  for await (const chunk of streamResponse) {
    const text = chunk.message?.content || '';
    fullText += text;
    if (onChunk) onChunk(text);
  }

  return fullText;
};

module.exports = { chat };