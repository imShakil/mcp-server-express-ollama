import type { ToolDefinition } from '../server/index.js';
import type { ProviderInterface } from '../provider/interface.js';
import type { PaginationCursor } from '../models/shared.js';

const TOOL_DESCRIPTIONS = {
  search_products: {
    name: 'search_products',
    description: 'Search for products by keyword in title, description, or brand',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword' },
        limit: { type: 'number', description: 'Max results (default 20)' },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  get_product: {
    name: 'get_product',
    description: 'Get detailed product information by product ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Product ID' },
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: true },
  },
  list_products: {
    name: 'list_products',
    description: 'List all products with optional pagination',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 20)' },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  list_categories: {
    name: 'list_categories',
    description: 'List all product categories',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  get_related_products: {
    name: 'get_related_products',
    description: 'Get products related to a given product',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID' },
        limit: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['productId'],
    },
    annotations: { readOnlyHint: true },
  },
} satisfies Record<string, ToolDefinition>;

export const productToolDefinitions = Object.values(TOOL_DESCRIPTIONS);

export function createProductHandlers(provider: ProviderInterface) {
  return async (toolName: string, args: Record<string, unknown>) => {
    switch (toolName) {
      case 'search_products': {
        const pagination: PaginationCursor = {};
        if (args.limit) pagination.limit = args.limit as number;
        if (args.cursor) pagination.cursor = args.cursor as string;
        const result = await provider.searchProducts(args.query as string, pagination);
        return {
          content: [
            { type: 'text', text: `Found ${result.items.length} product(s)` },
            { type: 'text', text: JSON.stringify(result, null, 2) },
          ],
        };
      }
      case 'get_product': {
        const product = await provider.getProduct(args.id as string);
        return {
          content: [
            { type: 'text', text: `${product.title} — ${product.price.amount / 100} ${product.price.currency}` },
            { type: 'text', text: JSON.stringify(product, null, 2) },
          ],
        };
      }
      case 'list_products': {
        const pagination: PaginationCursor = {};
        if (args.limit) pagination.limit = args.limit as number;
        if (args.cursor) pagination.cursor = args.cursor as string;
        const result = await provider.listProducts(pagination);
        return {
          content: [
            { type: 'text', text: `Showing ${result.items.length} product(s)` },
            { type: 'text', text: JSON.stringify(result, null, 2) },
          ],
        };
      }
      case 'list_categories': {
        const categories = await provider.listCategories();
        return {
          content: [
            { type: 'text', text: `${categories.length} categories` },
            { type: 'text', text: JSON.stringify(categories, null, 2) },
          ],
        };
      }
      case 'get_related_products': {
        const limit = args.limit ? (args.limit as number) : undefined;
        const products = await provider.getRelatedProducts(
          args.productId as string,
          limit,
        );
        return {
          content: [
            { type: 'text', text: `${products.length} related product(s)` },
            { type: 'text', text: JSON.stringify(products, null, 2) },
          ],
        };
      }
      default:
        return null;
    }
  };
}
