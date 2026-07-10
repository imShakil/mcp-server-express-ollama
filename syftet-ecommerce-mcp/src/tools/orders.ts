import type { ToolDefinition } from '../server/index.js';
import type { ProviderInterface } from '../provider/interface.js';
import type { PaginationCursor } from '../models/shared.js';

const TOOL_DESCRIPTIONS = {
  create_order: {
    name: 'create_order',
    description: 'Create an order from a completed cart (after checkout)',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'Cart ID to convert to order' },
      },
      required: ['cartId'],
    },
    annotations: { destructiveHint: true },
  },
  get_order: {
    name: 'get_order',
    description: 'Get detailed information about a specific order',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Order ID' },
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: true },
  },
  list_orders: {
    name: 'list_orders',
    description: 'List all orders with optional pagination',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 20)' },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  track_order: {
    name: 'track_order',
    description: 'Track the shipment status of an order',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Order ID' },
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: true },
  },
  cancel_order: {
    name: 'cancel_order',
    description: 'Cancel an existing order',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Order ID to cancel' },
      },
      required: ['id'],
    },
    annotations: { destructiveHint: true },
  },
  get_inventory: {
    name: 'get_inventory',
    description: 'Get current inventory/stock level for a product',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID' },
      },
      required: ['productId'],
    },
    annotations: { readOnlyHint: true },
  },
} satisfies Record<string, ToolDefinition>;

export const orderToolDefinitions = Object.values(TOOL_DESCRIPTIONS);

export function createOrderHandlers(provider: ProviderInterface) {
  return async (toolName: string, args: Record<string, unknown>) => {
    switch (toolName) {
      case 'create_order': {
        const order = await provider.createOrder(args.cartId as string);
        return {
          content: [
            { type: 'text', text: `Order created: #${order.orderNumber ?? order.id} — ${order.total.amount / 100} ${order.total.currency} — Status: ${order.status}` },
            { type: 'text', text: JSON.stringify(order, null, 2) },
          ],
        };
      }
      case 'get_order': {
        const order = await provider.getOrder(args.id as string);
        return {
          content: [
            { type: 'text', text: `Order #${order.orderNumber ?? order.id} — ${order.status} — ${order.total.amount / 100} ${order.total.currency}` },
            { type: 'text', text: JSON.stringify(order, null, 2) },
          ],
        };
      }
      case 'list_orders': {
        const pagination: PaginationCursor = {};
        if (args.limit) pagination.limit = args.limit as number;
        if (args.cursor) pagination.cursor = args.cursor as string;
        const result = await provider.listOrders(pagination);
        return {
          content: [
            { type: 'text', text: `Showing ${result.items.length} order(s)` },
            { type: 'text', text: JSON.stringify(result, null, 2) },
          ],
        };
      }
      case 'track_order': {
        const tracking = await provider.trackOrder(args.id as string);
        return {
          content: [
            { type: 'text', text: `Order tracking: ${tracking.trackingNumber} — Status: ${tracking.status}${tracking.url ? ` — ${tracking.url}` : ''}` },
            { type: 'text', text: JSON.stringify(tracking, null, 2) },
          ],
        };
      }
      case 'cancel_order': {
        const order = await provider.cancelOrder(args.id as string);
        return {
          content: [
            { type: 'text', text: `Order #${order.orderNumber ?? order.id} cancelled. Status: ${order.status}` },
            { type: 'text', text: JSON.stringify(order, null, 2) },
          ],
        };
      }
      case 'get_inventory': {
        const inventory = await provider.getInventory(args.productId as string);
        return {
          content: [
            { type: 'text', text: `Product ${inventory.productId}: ${inventory.total} in stock` },
            { type: 'text', text: JSON.stringify(inventory, null, 2) },
          ],
        };
      }
      default:
        return null;
    }
  };
}
