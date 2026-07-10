import { loadAppConfig, loadDefaultTenant } from './config/loader.js';
import { SyftCommerceServer } from './server/index.js';
import { createProviderFromConfig, registerProvider } from './provider/registry.js';

async function main() {
  console.log('SyftCommerce MCP Server');
  console.log('======================\n');

  const config = loadAppConfig();
  console.log(`Config: MCP_PORT=${config.MCP_PORT}, LOG_LEVEL=${config.LOG_LEVEL}`);

  const tenant = loadDefaultTenant();
  const provider = createProviderFromConfig(tenant);
  registerProvider(tenant.tenantId, provider);

  const healthy = await provider.healthCheck();
  if (!healthy) {
    console.warn('Warning: Provider health check failed. The Syftet API may not be reachable.');
  }

  const server = new SyftCommerceServer(provider, config.MCP_PORT);
  await server.start();
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
