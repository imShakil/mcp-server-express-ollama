import dotenv from 'dotenv';
import { AppConfig, AppConfigSchema, TenantConfig, TenantConfigSchema } from './schema.js';

dotenv.config();

let _appConfig: AppConfig | null = null;

export function loadAppConfig(): AppConfig {
  if (_appConfig) return _appConfig;
  const parsed = AppConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid app configuration:', parsed.error.flatten());
    throw new Error('Configuration validation failed');
  }
  _appConfig = parsed.data;
  return _appConfig;
}

const _tenantConfigs = new Map<string, TenantConfig>();

export function registerTenantConfig(config: TenantConfig): void {
  const parsed = TenantConfigSchema.parse(config);
  _tenantConfigs.set(parsed.tenantId, parsed);
}

export function getTenantConfig(tenantId: string): TenantConfig {
  const config = _tenantConfigs.get(tenantId);
  if (!config) throw new Error(`Tenant not found: ${tenantId}`);
  return config;
}

export function getAllTenants(): TenantConfig[] {
  return Array.from(_tenantConfigs.values());
}

export function loadDefaultTenant(): TenantConfig {
  const app = loadAppConfig();
  const tenant: TenantConfig = {
    tenantId: 'default',
    provider: 'syftet',
    baseUrl: app.SYFTET_API_BASE_URL,
    auth: {
      type: 'api_key',
      credentials: {
        apiKey: app.SYFTET_API_KEY ?? '',
        apiSecret: app.SYFTET_API_SECRET ?? '',
      },
    },
    settings: {
      currency: 'USD',
      locale: 'en-US',
      timezone: 'UTC',
    },
  };
  registerTenantConfig(tenant);
  return tenant;
}
