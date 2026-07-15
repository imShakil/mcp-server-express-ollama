import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { ProviderInterface } from '../provider/interface.js';
import { productToolDefinitions, createProductHandlers } from '../tools/products.js';
import { cartToolDefinitions, createCartHandlers } from '../tools/cart.js';
import { checkoutToolDefinitions, createCheckoutHandlers } from '../tools/checkout.js';
import { orderToolDefinitions, createOrderHandlers } from '../tools/orders.js';
import { createTransportApp } from './transport.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

type ToolHandler = (toolName: string, args: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
} | null>;

export class SyftCommerceServer {
  private handlers: ToolHandler[] = [];
  private toolDefinitions: ToolDefinition[] = [];
  private transportApp!: ReturnType<typeof createTransportApp>;

  constructor(
    private provider: ProviderInterface,
    private port: number = 4001,
  ) {
    this.registerAllTools();
  }

  private registerAllTools(): void {
    this.toolDefinitions = [
      ...productToolDefinitions,
      ...cartToolDefinitions,
      ...checkoutToolDefinitions,
      ...orderToolDefinitions,
    ];

    this.handlers = [
      createProductHandlers(this.provider),
      createCartHandlers(this.provider),
      createCheckoutHandlers(this.provider),
      createOrderHandlers(this.provider),
    ];
  }

  private createServer(): Server {
    const server = new Server(
      { name: 'syftcommerce-mcp', version: '0.1.0' },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.toolDefinitions.map((def) => ({
          name: def.name,
          description: def.description,
          inputSchema: def.inputSchema,
          ...(def.annotations ? { annotations: def.annotations } : {}),
        })) as Tool[],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const parsedArgs = (args ?? {}) as Record<string, unknown>;

      for (const handler of this.handlers) {
        const result = await handler(name, parsedArgs);
        if (result) return result;
      }

      throw new Error(`Unknown tool: ${name}`);
    });

    return server;
  }

  async start(): Promise<void> {
    this.transportApp = createTransportApp(this.port);
    this.transportApp.start(() => this.createServer());

    console.log(`Provider: ${this.provider.name}`);
    console.log(`Capabilities: ${[...this.provider.capabilities].join(', ')}`);
    console.log(`${this.toolDefinitions.length} tools registered`);
  }

  async stop(): Promise<void> {
    this.transportApp.stop();
  }
}
