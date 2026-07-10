import type { ToolDefinition } from '../server/index.js';
import type { ProviderInterface } from '../provider/interface.js';
import type { Address } from '../models/shared.js';

const TOOL_DESCRIPTIONS = {
  checkout: {
    name: 'checkout',
    description: 'Complete checkout: select shipping method, payment method, and shipping address to place the order',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'Cart ID' },
        shippingMethodId: { type: 'string', description: 'Selected shipping method ID' },
        paymentMethodId: { type: 'string', description: 'Selected payment method ID' },
        address: {
          type: 'object',
          properties: {
            line1: { type: 'string' },
            line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string', description: 'ISO 3166-1 alpha-2' },
          },
          required: ['line1', 'city', 'state', 'postalCode', 'country'],
        },
      },
      required: ['cartId', 'shippingMethodId', 'paymentMethodId', 'address'],
    },
    annotations: { destructiveHint: true },
  },
  list_shipping_methods: {
    name: 'list_shipping_methods',
    description: 'List available shipping methods for a cart',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'Cart ID' },
      },
      required: ['cartId'],
    },
    annotations: { readOnlyHint: true },
  },
  list_payment_methods: {
    name: 'list_payment_methods',
    description: 'List available payment methods',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  estimate_shipping: {
    name: 'estimate_shipping',
    description: 'Estimate shipping costs for a cart with a given address',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'Cart ID' },
        address: {
          type: 'object',
          properties: {
            line1: { type: 'string' },
            line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
          },
          required: ['line1', 'city', 'state', 'postalCode', 'country'],
        },
      },
      required: ['cartId', 'address'],
    },
  },
} satisfies Record<string, ToolDefinition>;

export const checkoutToolDefinitions = Object.values(TOOL_DESCRIPTIONS);

export function createCheckoutHandlers(provider: ProviderInterface) {
  return async (toolName: string, args: Record<string, unknown>) => {
    switch (toolName) {
      case 'checkout': {
        const order = await provider.checkout(
          args.cartId as string,
          args.shippingMethodId as string,
          args.paymentMethodId as string,
          args.address as unknown as Address,
        );
        return {
          content: [
            { type: 'text', text: `Order placed: #${order.orderNumber ?? order.id} — ${order.total.amount / 100} ${order.total.currency} — Status: ${order.status}` },
            { type: 'text', text: JSON.stringify(order, null, 2) },
          ],
        };
      }
      case 'list_shipping_methods': {
        const methods = await provider.listShippingMethods(args.cartId as string);
        return {
          content: [
            { type: 'text', text: `${methods.length} shipping method(s) available` },
            { type: 'text', text: JSON.stringify(methods, null, 2) },
          ],
        };
      }
      case 'list_payment_methods': {
        const methods = await provider.listPaymentMethods();
        return {
          content: [
            { type: 'text', text: `${methods.length} payment method(s) available` },
            { type: 'text', text: JSON.stringify(methods, null, 2) },
          ],
        };
      }
      case 'estimate_shipping': {
        const cart = await provider.estimateShipping(
          args.cartId as string,
          args.address as unknown as Address,
        );
        return {
          content: [
            { type: 'text', text: `Estimated shipping: ${cart.shipping ? `${cart.shipping.amount / 100} ${cart.shipping.currency}` : 'N/A'}` },
            { type: 'text', text: JSON.stringify(cart, null, 2) },
          ],
        };
      }
      default:
        return null;
    }
  };
}
