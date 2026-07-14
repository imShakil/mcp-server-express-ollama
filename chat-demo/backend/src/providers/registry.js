import { OpenAIProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';
import { GroqProvider } from './groq.js';

export function createProvider(config) {
  switch (config.AI_PROVIDER) {
    case 'groq':
      return new GroqProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    case 'openai':
    default:
      return new OpenAIProvider(config);
  }
}
