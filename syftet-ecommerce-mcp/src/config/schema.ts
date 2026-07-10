import { z } from 'zod';

export const AppConfigSchema = z.object({
  MCP_PORT: z.coerce.number().positive().default(4001),
  SYFTET_API_BASE_URL: z.string().url().default('http://localhost:8000/api'),
  SYFTET_API_KEY: z.string().optional(),
  SYFTET_API_SECRET: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const TenantConfigSchema = z.object({
  tenantId: z.string().min(1),
  provider: z.enum(['syftet', 'shopify', 'woocommerce', 'magento', 'openapi']),
  baseUrl: z.string().url(),
  auth: z.object({
    type: z.enum(['api_key', 'bearer', 'oauth2', 'cookie_session', 'basic']),
    credentials: z.record(z.string(), z.string()),
  }),
  capabilities: z.array(z.string()).optional(),
  settings: z.object({
    currency: z.string().default('USD'),
    locale: z.string().default('en-US'),
    timezone: z.string().default('UTC'),
  }).optional(),
});

export type TenantConfig = z.infer<typeof TenantConfigSchema>;
