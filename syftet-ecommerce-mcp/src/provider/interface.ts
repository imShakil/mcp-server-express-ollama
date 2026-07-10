import type { Product, ProductCategory } from '../models/product.js';
import type { Cart, CartItem } from '../models/cart.js';
import type { Order } from '../models/order.js';
import type { Customer } from '../models/customer.js';
import type { PaginationCursor, PaginationResult, Address } from '../models/shared.js';

export interface ShippingMethod {
  id: string;
  name: string;
  price: { amount: number; currency: string };
  estimatedDays?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'card' | 'bank' | 'wallet' | 'cod' | 'other';
}

export type Capability =
  | 'checkout'
  | 'inventory'
  | 'refund'
  | 'coupons'
  | 'wishlist'
  | 'shipment'
  | 'customer_accounts'
  | 'loyalty';

export interface ProviderInterface {
  readonly name: string;
  readonly capabilities: Set<Capability>;

  healthCheck(): Promise<boolean>;

  searchProducts(query: string, pagination?: PaginationCursor): Promise<PaginationResult<Product>>;
  getProduct(id: string): Promise<Product>;
  listProducts(pagination?: PaginationCursor): Promise<PaginationResult<Product>>;
  listCategories(): Promise<ProductCategory[]>;
  getRelatedProducts(productId: string, limit?: number): Promise<Product[]>;

  lookupCustomer(emailOrId: string): Promise<Customer>;

  createCart(currency?: string): Promise<Cart>;
  getCart(id: string): Promise<Cart>;
  addItem(cartId: string, productId: string, quantity: number, variantId?: string): Promise<Cart>;
  removeItem(cartId: string, itemId: string): Promise<Cart>;
  updateQuantity(cartId: string, itemId: string, quantity: number): Promise<Cart>;
  applyCoupon(cartId: string, code: string): Promise<Cart>;
  removeCoupon(cartId: string): Promise<Cart>;
  estimateShipping(cartId: string, address: Address): Promise<Cart>;

  listShippingMethods(cartId: string): Promise<ShippingMethod[]>;
  listPaymentMethods(): Promise<PaymentMethod[]>;

  checkout(cartId: string, shippingMethodId: string, paymentMethodId: string, address: Address): Promise<Order>;
  createOrder(cartId: string): Promise<Order>;
  getOrder(id: string): Promise<Order>;
  listOrders(pagination?: PaginationCursor): Promise<PaginationResult<Order>>;
  cancelOrder(id: string): Promise<Order>;
  trackOrder(id: string): Promise<{ trackingNumber: string; status: string; url?: string }>;

  getInventory(productId: string): Promise<{ productId: string; total: number; variants: { id: string; inventory: number }[] }>;
}
