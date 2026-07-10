import type { AxiosInstance } from 'axios';

export interface AuthStrategy {
  apply(client: AxiosInstance): void;
  getAuthHeaders(): Record<string, string>;
}

export class ApiKeyStrategy implements AuthStrategy {
  constructor(private apiKey: string, private headerName = 'X-API-Key') {}

  apply(client: AxiosInstance): void {
    client.interceptors.request.use((config) => {
      config.headers.set(this.headerName, this.apiKey);
      return config;
    });
  }

  getAuthHeaders(): Record<string, string> {
    return { [this.headerName]: this.apiKey };
  }
}

export class BearerTokenStrategy implements AuthStrategy {
  constructor(private token: string) {}

  apply(client: AxiosInstance): void {
    client.interceptors.request.use((config) => {
      config.headers.set('Authorization', `Bearer ${this.token}`);
      return config;
    });
  }

  getAuthHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` };
  }
}

export class BasicAuthStrategy implements AuthStrategy {
  constructor(private username: string, private password: string) {}

  apply(client: AxiosInstance): void {
    const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    client.interceptors.request.use((config) => {
      config.headers.set('Authorization', `Basic ${encoded}`);
      return config;
    });
  }

  getAuthHeaders(): Record<string, string> {
    const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }
}

export class CookieSessionStrategy implements AuthStrategy {
  constructor(private sessionCookie: string) {}

  apply(client: AxiosInstance): void {
    client.interceptors.request.use((config) => {
      config.headers.set('Cookie', this.sessionCookie);
      return config;
    });
  }

  getAuthHeaders(): Record<string, string> {
    return { Cookie: this.sessionCookie };
  }
}

export type AuthConfig = {
  type: 'api_key' | 'bearer' | 'oauth2' | 'cookie_session' | 'basic';
  credentials: Record<string, string>;
};

export function createAuthStrategy(config: AuthConfig): AuthStrategy {
  switch (config.type) {
    case 'api_key':
      return new ApiKeyStrategy(config.credentials.apiKey ?? '', config.credentials.headerName);
    case 'bearer':
      return new BearerTokenStrategy(config.credentials.token ?? '');
    case 'basic':
      return new BasicAuthStrategy(config.credentials.username ?? '', config.credentials.password ?? '');
    case 'cookie_session':
      return new CookieSessionStrategy(config.credentials.cookie ?? '');
    case 'oauth2':
      throw new Error('OAuth2 strategy not yet implemented');
    default:
      throw new Error(`Unknown auth type: ${config.type}`);
  }
}
