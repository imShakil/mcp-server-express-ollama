import type { ToolDefinition } from '../server/index.js';
import type { ProviderInterface } from '../provider/interface.js';
import type { Address } from '../models/shared.js';

const TOOL_DESCRIPTIONS = {
  create_cart: {
    name: 'create_cart',
    description: 'Create a new empty shopping cart',
    inputSchema: {
      type: 'object',
      properties: {
        currency: { type: 'string', description: 'ISO 4217 currency code (default USD)' },
      },
    },
    annotations: { idempotentHint: true },
  },
  get_cart: {
    name: 'get_cart',
    description: 'Get the current state of a shopping cart',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'Cart ID' },
      },
      required: ['cartId'],
    },
    annotations: { readOnlyHint: true },
  },
  add_item: {
    name: 'add_item',
    description: 'Add a product to the shopping cart',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'Cart ID' },
        productId: { type: 'string', description: 'Product ID to add' },
        quantity: { type: 'number', description: 'Quantity (default 1)' },
        variantId: { type: 'string', description: 'Variant ID (optional)' },
      },
      required: ['cartId', 'productId'],
    },
  },
  remove_item: {
    name: 'remove_item',
    description: 'Remove an item from the shopping cart',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'Cart ID' },
        itemId: { type: 'string', description: 'Item ID to remove' },
      },
      required: ['cartId', 'itemId'],
    },
    annotations: { destructiveHint: true },
  },
  update_quantity: {
    name: 'update_quantity',
    description: 'Update the quantity of an item in the cart',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'Cart ID' },
        itemId: { type: 'string', description: 'Item ID' },
        quantity: { type: 'number', description: 'New quantity' },
      },
      required: ['cartId', 'itemId', 'quantity'],
    },
  },
  apply_coupon: {
    name: 'apply_coupon',
    description: 'Apply a coupon code to the cart for discounts',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'Cart ID' },
        code: { type: 'string', description: 'Coupon code' },
      },
      required: ['cartId', 'code'],
    },
  },
  remove_coupon: {
    name: 'remove_coupon',
    description: 'Remove the applied coupon from the cart',
    inputSchema: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'Cart ID' },
      },
      required: ['cartId'],
    },
    annotations: { destructiveHint: true },
  },
} satisfies Record<string, ToolDefinition>;

export const cartToolDefinitions = Object.values(TOOL_DESCRIPTIONS);

export function createCartHandlers(provider: ProviderInterface) {
  return async (toolName: string, args: Record<string, unknown>) => {
    switch (toolName) {
      case 'create_cart': {
        const cart = await provider.createCart(args.currency as string | undefined);
        return {
          content: [
            { type: 'text', text: `Cart created: ${cart.id} — ${cart.itemCount} item(s), total ${cart.total.amount / 100} ${cart.total.currency}` },
            { type: 'text', text: JSON.stringify(cart, null, 2) },
          ],
        };
      }
      case 'get_cart': {
        const cart = await provider.getCart(args.cartId as string);
        return {
          content: [
            { type: 'text', text: `Cart ${cart.id}: ${cart.itemCount} item(s), total ${cart.total.amount / 100} ${cart.total.currency}` },
            { type: 'text', text: JSON.stringify(cart, null, 2) },
          ],
        };
      }
      case 'add_item': {
        const cart = await provider.addItem(
          args.cartId as string,
          args.productId as string,
          (args.quantity as number) ?? 1,
          args.variantId as string | undefined,
        );
        return {
          content: [
            { type: 'text', text: `Added to cart. Now ${cart.itemCount} item(s), total ${cart.total.amount / 100} ${cart.total.currency}` },
            { type: 'text', text: JSON.stringify(cart, null, 2) },
          ],
        };
      }
      case 'remove_item': {
        const cart = await provider.removeItem(args.cartId as string, args.itemId as string);
        return {
          content: [
            { type: 'text', text: `Item removed. Cart now has ${cart.itemCount} item(s), total ${cart.total.amount / 100} ${cart.total.currency}` },
            { type: 'text', text: JSON.stringify(cart, null, 2) },
          ],
        };
      }
      case 'update_quantity': {
        const cart = await provider.updateQuantity(
          args.cartId as string,
          args.itemId as string,
          args.quantity as number,
        );
        return {
          content: [
            { type: 'text', text: `Quantity updated. Cart total: ${cart.total.amount / 100} ${cart.total.currency}` },
            { type: 'text', text: JSON.stringify(cart, null, 2) },
          ],
        };
      }
      case 'apply_coupon': {
        const cart = await provider.applyCoupon(args.cartId as string, args.code as string);
        return {
          content: [
            { type: 'text', text: `Coupon "${args.code}" applied. New total: ${cart.total.amount / 100} ${cart.total.currency}` },
            { type: 'text', text: JSON.stringify(cart, null, 2) },
          ],
        };
      }
      case 'remove_coupon': {
        const cart = await provider.removeCoupon(args.cartId as string);
        return {
          content: [
            { type: 'text', text: 'Coupon removed.' },
            { type: 'text', text: JSON.stringify(cart, null, 2) },
          ],
        };
      }
      default:
        return null;
    }
  };
}
