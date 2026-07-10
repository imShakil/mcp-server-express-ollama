import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { AuthStrategy } from './auth.js';
import type { TenantConfig } from '../config/schema.js';
import { createAuthStrategy } from './auth.js';
import { loadAppConfig } from '../config/loader.js';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createHttpClient(config: TenantConfig): { client: AxiosInstance; baseUrl: string } {
  const authStrategy = createAuthStrategy(config.auth);
  const app = loadAppConfig();

  const client: AxiosInstance = axios.create({
    baseURL: config.baseUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  authStrategy.apply(client);

  client.interceptors.request.use(
    (reqConfig) => {
      if (app.LOG_LEVEL === 'debug') {
        console.debug(`[HTTP] ${reqConfig.method?.toUpperCase()} ${reqConfig.baseURL}${reqConfig.url}`);
      }
      return reqConfig;
    },
    (error) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status ?? 0;
      const data = error.response?.data as Record<string, unknown> | undefined;
      const message = (data?.message as string) ?? error.message ?? 'Unknown API error';

      if (status >= 500) {
        console.error(`[HTTP] Server error ${status}: ${message}`);
        throw new ApiError('The commerce API server encountered an error', status, 'SERVER_ERROR', data);
      }
      if (status === 401) {
        throw new ApiError('Authentication failed — check your API credentials', status, 'UNAUTHORIZED', data);
      }
      if (status === 403) {
        throw new ApiError('Access denied — insufficient permissions', status, 'FORBIDDEN', data);
      }
      if (status === 404) {
        throw new ApiError('The requested resource was not found', status, 'NOT_FOUND', data);
      }
      if (status === 429) {
        throw new ApiError('Rate limit exceeded — try again later', status, 'RATE_LIMITED', data);
      }
      if (status >= 400) {
        throw new ApiError(message, status, 'BAD_REQUEST', data);
      }

      throw new ApiError(message, status, 'NETWORK_ERROR', data);
    },
  );

  return { client, baseUrl: config.baseUrl };
}

export async function apiGet<T>(client: AxiosInstance, path: string, params?: Record<string, unknown>): Promise<T> {
  const config: AxiosRequestConfig = {};
  if (params) config.params = params;
  const response = await client.get<T>(path, config);
  return response.data;
}

export async function apiPost<T>(client: AxiosInstance, path: string, data?: unknown): Promise<T> {
  const response = await client.post<T>(path, data);
  return response.data;
}

export async function apiPatch<T>(client: AxiosInstance, path: string, data?: unknown): Promise<T> {
  const response = await client.patch<T>(path, data);
  return response.data;
}

export async function apiDelete<T>(client: AxiosInstance, path: string): Promise<T> {
  const response = await client.delete<T>(path);
  return response.data;
}
