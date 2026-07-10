import { ApiKeyStrategy, type AuthStrategy } from '../../provider/auth.js';

export interface SyftetAuthConfig {
  apiKey: string;
  apiSecret: string;
}

export function createSyftetAuth(config: SyftetAuthConfig): AuthStrategy {
  return new ApiKeyStrategy(config.apiKey, 'X-Api-Key');
}
