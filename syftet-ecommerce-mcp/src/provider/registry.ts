import type { ProviderInterface } from './interface.js';
import type { TenantConfig } from '../config/schema.js';
import { SyftetProvider } from '../adapters/syftet/adapter.js';

const _providers = new Map<string, ProviderInterface>();

export function registerProvider(tenantId: string, provider: ProviderInterface): void {
  _providers.set(tenantId, provider);
}

export function getProvider(tenantId: string): ProviderInterface {
  const provider = _providers.get(tenantId);
  if (!provider) throw new Error(`No provider registered for tenant: ${tenantId}`);
  return provider;
}

export function removeProvider(tenantId: string): boolean {
  return _providers.delete(tenantId);
}

export function createProviderFromConfig(config: TenantConfig): ProviderInterface {
  switch (config.provider) {
    case 'syftet':
      return new SyftetProvider(config);
    default:
      throw new Error(`Unsupported provider type: ${config.provider}`);
  }
}
