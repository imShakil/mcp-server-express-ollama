import type { ProviderInterface, ShippingMethod, PaymentMethod, Capability } from '../../provider/interface.js';
import type { PaginationCursor, PaginationResult, Address } from '../../models/shared.js';
import type { Product, ProductCategory } from '../../models/product.js';
import type { Cart } from '../../models/cart.js';
import type { Order } from '../../models/order.js';
import type { Customer } from '../../models/customer.js';
import type { TenantConfig } from '../../config/schema.js';
import { createHttpClient, apiGet, apiPost, apiPatch, apiDelete } from '../../provider/http-client.js';
import { buildPaginationParams, extractPaginationResult } from '../../provider/pagination.js';
import type { AxiosInstance } from 'axios';
import {
  mapProduct, mapCart, mapOrder, mapCustomer,
} from './mapping.js';
import type { SyftetProductResponse, SyftetCartResponse, SyftetOrderResponse, SyftetCustomerResponse } from './mapping.js';

interface ListResponse<T> {
  data: T[];
  meta?: { next_cursor?: string; prev_cursor?: string; total?: number };
}

interface SingleResponse<T> {
  data: T;
}

export class SyftetProvider implements ProviderInterface {
  readonly name = 'syftet';
  readonly capabilities: Set<Capability>;
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: TenantConfig) {
    const { client, baseUrl } = createHttpClient(config);
    this.client = client;
    this.baseUrl = baseUrl;
    this.capabilities = new Set<Capability>([
      'checkout', 'inventory', 'coupons', 'shipment',
    ]);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await apiGet<{ status: string }>(this.client, '/health');
      return true;
    } catch {
      return false;
    }
  }

  async searchProducts(query: string, pagination?: PaginationCursor): Promise<PaginationResult<Product>> {
    const params = { q: query, ...buildPaginationParams(pagination) };
    const res = await apiGet<ListResponse<Record<string, unknown>>>(this.client, '/products', params);
    return {
      items: res.data.map(mapProduct as (x: unknown) => Product),
      ...(res.meta?.next_cursor ? { nextCursor: res.meta.next_cursor } : {}),
      ...(res.meta?.total ? { total: res.meta.total } : {}),
    };
  }

  async getProduct(id: string): Promise<Product> {
    const res = await apiGet<SingleResponse<Record<string, unknown>>>(this.client, `/products/${id}`);
    return mapProduct(res.data as unknown as SyftetProductResponse);
  }

  async listProducts(pagination?: PaginationCursor): Promise<PaginationResult<Product>> {
    const params = buildPaginationParams(pagination);
    const res = await apiGet<ListResponse<Record<string, unknown>>>(this.client, '/products', params);
    return {
      items: res.data.map(mapProduct as (x: unknown) => Product),
      ...(res.meta?.next_cursor ? { nextCursor: res.meta.next_cursor } : {}),
      ...(res.meta?.total ? { total: res.meta.total } : {}),
    };
  }

  async listCategories(): Promise<ProductCategory[]> {
    const res = await apiGet<ListResponse<Record<string, unknown>>>(this.client, '/categories');
    return res.data.map((c) => {
      const cat = c as { id: string | number; name: string; slug: string; parent_id?: string | number | null };
      return {
        id: String(cat.id),
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parent_id ? String(cat.parent_id) : undefined,
      };
    });
  }

  async getRelatedProducts(productId: string, limit = 5): Promise<Product[]> {
    const res = await apiGet<ListResponse<Record<string, unknown>>>(this.client, `/products/${productId}/related`, { limit });
    return res.data.map(mapProduct as (x: unknown) => Product);
  }

  async lookupCustomer(emailOrId: string): Promise<Customer> {
    const res = await apiGet<SingleResponse<Record<string, unknown>>>(this.client, `/customers/${emailOrId}`);
    return mapCustomer(res.data as unknown as SyftetCustomerResponse);
  }

  async createCart(currency = 'USD'): Promise<Cart> {
    const res = await apiPost<SingleResponse<Record<string, unknown>>>(this.client, '/carts', { currency });
    return mapCart(res.data as unknown as SyftetCartResponse);
  }

  async getCart(id: string): Promise<Cart> {
    const res = await apiGet<SingleResponse<Record<string, unknown>>>(this.client, `/carts/${id}`);
    return mapCart(res.data as unknown as SyftetCartResponse);
  }

  async addItem(cartId: string, productId: string, quantity: number, variantId?: string): Promise<Cart> {
    const res = await apiPost<SingleResponse<Record<string, unknown>>>(this.client, `/carts/${cartId}/items`, {
      product_id: productId,
      variant_id: variantId,
      quantity,
    });
    return mapCart(res.data as unknown as SyftetCartResponse);
  }

  async removeItem(cartId: string, itemId: string): Promise<Cart> {
    const res = await apiDelete<SingleResponse<Record<string, unknown>>>(this.client, `/carts/${cartId}/items/${itemId}`);
    return mapCart(res.data as unknown as SyftetCartResponse);
  }

  async updateQuantity(cartId: string, itemId: string, quantity: number): Promise<Cart> {
    const res = await apiPatch<SingleResponse<Record<string, unknown>>>(this.client, `/carts/${cartId}/items/${itemId}`, { quantity });
    return mapCart(res.data as unknown as SyftetCartResponse);
  }

  async applyCoupon(cartId: string, code: string): Promise<Cart> {
    const res = await apiPost<SingleResponse<Record<string, unknown>>>(this.client, `/carts/${cartId}/coupon`, { code });
    return mapCart(res.data as unknown as SyftetCartResponse);
  }

  async removeCoupon(cartId: string): Promise<Cart> {
    const res = await apiDelete<SingleResponse<Record<string, unknown>>>(this.client, `/carts/${cartId}/coupon`);
    return mapCart(res.data as unknown as SyftetCartResponse);
  }

  async estimateShipping(cartId: string, address: Address): Promise<Cart> {
    const res = await apiPost<SingleResponse<Record<string, unknown>>>(this.client, `/carts/${cartId}/shipping/estimate`, {
      address: {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postal_code: address.postalCode,
        country: address.country,
      },
    });
    return mapCart(res.data as unknown as SyftetCartResponse);
  }

  async listShippingMethods(cartId: string): Promise<ShippingMethod[]> {
    const res = await apiGet<ListResponse<Record<string, unknown>>>(this.client, `/carts/${cartId}/shipping-methods`);
    return res.data.map((m) => {
      const method = m as { id: string | number; name: string; price: number; currency?: string; estimated_days?: string };
      return {
        id: String(method.id),
        name: method.name,
        price: { amount: Math.round(method.price * 100), currency: method.currency ?? 'USD' },
        estimatedDays: method.estimated_days,
      };
    });
  }

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    const res = await apiGet<ListResponse<Record<string, unknown>>>(this.client, '/payment-methods');
    return res.data.map((m) => {
      const method = m as { id: string | number; name: string; type: string };
      return {
        id: String(method.id),
        name: method.name,
        type: method.type as PaymentMethod['type'],
      };
    });
  }

  async checkout(cartId: string, shippingMethodId: string, paymentMethodId: string, address: Address): Promise<Order> {
    const res = await apiPost<SingleResponse<Record<string, unknown>>>(this.client, '/checkout', {
      cart_id: cartId,
      shipping_method_id: shippingMethodId,
      payment_method_id: paymentMethodId,
      shipping_address: {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postal_code: address.postalCode,
        country: address.country,
      },
    });
    return mapOrder(res.data as unknown as SyftetOrderResponse);
  }

  async createOrder(cartId: string): Promise<Order> {
    const res = await apiPost<SingleResponse<Record<string, unknown>>>(this.client, '/orders', { cart_id: cartId });
    return mapOrder(res.data as unknown as SyftetOrderResponse);
  }

  async getOrder(id: string): Promise<Order> {
    const res = await apiGet<SingleResponse<Record<string, unknown>>>(this.client, `/orders/${id}`);
    return mapOrder(res.data as unknown as SyftetOrderResponse);
  }

  async listOrders(pagination?: PaginationCursor): Promise<PaginationResult<Order>> {
    const params = buildPaginationParams(pagination);
    const res = await apiGet<ListResponse<Record<string, unknown>>>(this.client, '/orders', params);
    return {
      items: res.data.map(mapOrder as (x: unknown) => Order),
      ...(res.meta?.next_cursor ? { nextCursor: res.meta.next_cursor } : {}),
      ...(res.meta?.total ? { total: res.meta.total } : {}),
    };
  }

  async cancelOrder(id: string): Promise<Order> {
    const res = await apiPost<SingleResponse<Record<string, unknown>>>(this.client, `/orders/${id}/cancel`);
    return mapOrder(res.data as unknown as SyftetOrderResponse);
  }

  async trackOrder(id: string): Promise<{ trackingNumber: string; status: string; url?: string }> {
    const res = await apiGet<{ data: { tracking_number: string; status: string; tracking_url?: string } }>(this.client, `/orders/${id}/track`);
    return {
      trackingNumber: res.data.tracking_number,
      status: res.data.status,
      url: res.data.tracking_url,
    };
  }

  async getInventory(productId: string): Promise<{ productId: string; total: number; variants: { id: string; inventory: number }[] }> {
    const res = await apiGet<{ data: { product_id: string; total: number; variants: { id: string | number; stock: number }[] } }>(this.client, `/products/${productId}/inventory`);
    return {
      productId: String(res.data.product_id),
      total: res.data.total,
      variants: res.data.variants.map((v: { id: string | number; stock: number }) => ({ id: String(v.id), inventory: v.stock })),
    };
  }
}
