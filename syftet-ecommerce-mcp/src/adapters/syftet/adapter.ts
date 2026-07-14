import type { ProviderInterface, ShippingMethod, PaymentMethod, Capability } from '../../provider/interface.js';
import type { PaginationCursor, PaginationResult, Address } from '../../models/shared.js';
import type { Product, ProductCategory } from '../../models/product.js';
import type { Cart } from '../../models/cart.js';
import type { Order } from '../../models/order.js';
import type { Customer } from '../../models/customer.js';
import type { TenantConfig } from '../../config/schema.js';
import { createHttpClient, apiGet, apiPost, apiPatch, apiDelete } from '../../provider/http-client.js';
import { buildPaginationParams } from '../../provider/pagination.js';
import type { AxiosInstance } from 'axios';
import {
  mapProduct, mapCart, mapOrder, mapCustomer,
} from './mapping.js';
import type { SyftetProductResponse, SyftetCartResponse, SyftetOrderResponse, SyftetCustomerResponse } from './mapping.js';

interface ProductsListResponse {
  products: Record<string, unknown>[];
  total_item: number;
  total_pages: number;
  current_page: number;
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
    const res = await apiGet<ProductsListResponse>(this.client, '/products', params);
    return {
      items: res.products.map(mapProduct as (x: unknown) => Product),
      total: res.total_item,
    };
  }

  async getProduct(id: string): Promise<Product> {
    const res = await apiGet<Record<string, unknown>>(this.client, `/products/${id}`);
    const data = (res.product ?? res.data ?? res) as SyftetProductResponse;
    return mapProduct(data);
  }

  async listProducts(pagination?: PaginationCursor): Promise<PaginationResult<Product>> {
    const params = buildPaginationParams(pagination);
    const res = await apiGet<ProductsListResponse>(this.client, '/products', params);
    return {
      items: res.products.map(mapProduct as (x: unknown) => Product),
      total: res.total_item,
    };
  }

  async listCategories(): Promise<ProductCategory[]> {
    try {
      const res = await apiGet<{ categories: Record<string, unknown>[] }>(this.client, '/categories');
      return res.categories.map((c) => {
        const cat = c as { id: string | number; name: string; slug: string };
        return { id: String(cat.id), name: cat.name, slug: cat.slug ?? String(cat.id) };
      });
    } catch {
      return [];
    }
  }

  async getRelatedProducts(productId: string, limit = 5): Promise<Product[]> {
    const res = await apiGet<ProductsListResponse>(this.client, '/products', { limit });
    return res.products.slice(0, limit).map(mapProduct as (x: unknown) => Product);
  }

  async lookupCustomer(emailOrId: string): Promise<Customer> {
    const res = await apiGet<{ customer: Record<string, unknown> } | Record<string, unknown>>(this.client, `/customers/${emailOrId}`);
    const data = ('customer' in res ? res.customer : res) as SyftetCustomerResponse;
    return mapCustomer(data);
  }

  async createCart(currency = 'USD'): Promise<Cart> {
    const res = await apiPost<{ cart: Record<string, unknown> } | Record<string, unknown>>(this.client, '/carts', { currency });
    const data = ('cart' in res ? res.cart : res) as SyftetCartResponse;
    return mapCart(data);
  }

  async getCart(id: string): Promise<Cart> {
    const res = await apiGet<{ cart: Record<string, unknown> } | Record<string, unknown>>(this.client, `/carts/${id}`);
    const data = ('cart' in res ? res.cart : res) as SyftetCartResponse;
    return mapCart(data);
  }

  async addItem(cartId: string, productId: string, quantity: number, variantId?: string): Promise<Cart> {
    const res = await apiPost<{ cart: Record<string, unknown> } | Record<string, unknown>>(this.client, `/carts/${cartId}/items`, {
      product_id: productId,
      variant_id: variantId,
      quantity,
    });
    const data = ('cart' in res ? res.cart : res) as SyftetCartResponse;
    return mapCart(data);
  }

  async removeItem(cartId: string, itemId: string): Promise<Cart> {
    const res = await apiDelete<{ cart: Record<string, unknown> } | Record<string, unknown>>(this.client, `/carts/${cartId}/items/${itemId}`);
    const data = ('cart' in res ? res.cart : res) as SyftetCartResponse;
    return mapCart(data);
  }

  async updateQuantity(cartId: string, itemId: string, quantity: number): Promise<Cart> {
    const res = await apiPatch<{ cart: Record<string, unknown> } | Record<string, unknown>>(this.client, `/carts/${cartId}/items/${itemId}`, { quantity });
    const data = ('cart' in res ? res.cart : res) as SyftetCartResponse;
    return mapCart(data);
  }

  async applyCoupon(cartId: string, code: string): Promise<Cart> {
    const res = await apiPost<{ cart: Record<string, unknown> } | Record<string, unknown>>(this.client, `/carts/${cartId}/coupon`, { code });
    const data = ('cart' in res ? res.cart : res) as SyftetCartResponse;
    return mapCart(data);
  }

  async removeCoupon(cartId: string): Promise<Cart> {
    const res = await apiDelete<{ cart: Record<string, unknown> } | Record<string, unknown>>(this.client, `/carts/${cartId}/coupon`);
    const data = ('cart' in res ? res.cart : res) as SyftetCartResponse;
    return mapCart(data);
  }

  async estimateShipping(cartId: string, address: Address): Promise<Cart> {
    const res = await apiPost<{ cart: Record<string, unknown> } | Record<string, unknown>>(this.client, `/carts/${cartId}/shipping/estimate`, {
      address: {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postal_code: address.postalCode,
        country: address.country,
      },
    });
    const data = ('cart' in res ? res.cart : res) as SyftetCartResponse;
    return mapCart(data);
  }

  async listShippingMethods(cartId: string): Promise<ShippingMethod[]> {
    const res = await apiGet<{ shipping_methods: Record<string, unknown>[] } | Record<string, unknown>[]>(this.client, `/carts/${cartId}/shipping-methods`);
    const items = Array.isArray(res) ? res : ('shipping_methods' in res ? res.shipping_methods : []);
    return items.map((m) => {
      const method = m as { id: string | number; name: string; price: number; currency?: string; estimated_days?: string };
      return {
        id: String(method.id),
        name: method.name,
        price: { amount: Math.round(method.price * 100), currency: method.currency ?? 'BDT' },
        estimatedDays: method.estimated_days,
      };
    });
  }

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    const res = await apiGet<{ payment_methods: Record<string, unknown>[] } | Record<string, unknown>[]>(this.client, '/payment-methods');
    const items = Array.isArray(res) ? res : ('payment_methods' in res ? res.payment_methods : []);
    return items.map((m) => {
      const method = m as { id: string | number; name: string; type: string };
      return {
        id: String(method.id),
        name: method.name,
        type: method.type as PaymentMethod['type'],
      };
    });
  }

  async checkout(cartId: string, shippingMethodId: string, paymentMethodId: string, address: Address): Promise<Order> {
    const res = await apiPost<{ order: Record<string, unknown> } | Record<string, unknown>>(this.client, '/checkout', {
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
    const data = ('order' in res ? res.order : res) as SyftetOrderResponse;
    return mapOrder(data);
  }

  async createOrder(cartId: string): Promise<Order> {
    const res = await apiPost<{ order: Record<string, unknown> } | Record<string, unknown>>(this.client, '/orders', { cart_id: cartId });
    const data = ('order' in res ? res.order : res) as SyftetOrderResponse;
    return mapOrder(data);
  }

  async getOrder(id: string): Promise<Order> {
    const res = await apiGet<{ order: Record<string, unknown> } | Record<string, unknown>>(this.client, `/orders/${id}`);
    const data = ('order' in res ? res.order : res) as SyftetOrderResponse;
    return mapOrder(data);
  }

  async listOrders(pagination?: PaginationCursor): Promise<PaginationResult<Order>> {
    const params = buildPaginationParams(pagination);
    const res = await apiGet<{ orders: Record<string, unknown>[]; total_item?: number } | Record<string, unknown>[]>(this.client, '/orders', params);
    const items = Array.isArray(res) ? res : ('orders' in res ? res.orders : []);
    const total = !Array.isArray(res) ? res.total_item : undefined;
    return {
      items: items.map(mapOrder as (x: unknown) => Order),
      ...(total ? { total } : {}),
    };
  }

  async cancelOrder(id: string): Promise<Order> {
    const res = await apiPost<{ order: Record<string, unknown> } | Record<string, unknown>>(this.client, `/orders/${id}/cancel`);
    const data = ('order' in res ? res.order : res) as SyftetOrderResponse;
    return mapOrder(data);
  }

  async trackOrder(id: string): Promise<{ trackingNumber: string; status: string; url?: string }> {
    const res = await apiGet<{ tracking: { tracking_number: string; status: string; tracking_url?: string } }>(this.client, `/orders/${id}/track`);
    return {
      trackingNumber: res.tracking.tracking_number,
      status: res.tracking.status,
      url: res.tracking.tracking_url,
    };
  }

  async getInventory(productId: string): Promise<{ productId: string; total: number; variants: { id: string; inventory: number }[] }> {
    const res = await apiGet<{ inventory: { product_id: string; total: number; variants: { id: string | number; stock: number }[] } }>(this.client, `/products/${productId}/inventory`);
    return {
      productId: String(res.inventory.product_id),
      total: res.inventory.total,
      variants: res.inventory.variants.map((v: { id: string | number; stock: number }) => ({ id: String(v.id), inventory: v.stock })),
    };
  }
}
