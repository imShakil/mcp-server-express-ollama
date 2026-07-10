import type { Product, ProductCategory, ProductVariant } from '../../models/product.js';
import type { Cart, CartItem } from '../../models/cart.js';
import { OrderStatus, type Order, type OrderItem } from '../../models/order.js';
import type { Customer } from '../../models/customer.js';
import type { Money, Address, Image } from '../../models/shared.js';

export interface SyftetProductResponse {
  id: number | string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  compare_at_price?: number | null;
  stock: number;
  variants?: SyftetVariantResponse[];
  images?: SyftetImageResponse[];
  categories?: SyftetCategoryResponse[];
  brand?: string;
  rating?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

interface SyftetVariantResponse {
  id: number | string;
  sku?: string;
  title: string;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  attributes?: Record<string, string>;
}

interface SyftetImageResponse {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface SyftetCategoryResponse {
  id: number | string;
  name: string;
  slug: string;
  parent_id?: number | string | null;
}

export interface SyftetCartResponse {
  id: number | string;
  items: SyftetCartItemResponse[];
  subtotal: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total: number;
  currency?: string;
  coupon_code?: string;
  created_at: string;
  updated_at?: string;
}

interface SyftetCartItemResponse {
  id: number | string;
  product_id: number | string;
  variant_id?: number | string;
  title: string;
  price: number;
  quantity: number;
  image?: SyftetImageResponse;
  total: number;
}

export interface SyftetOrderResponse {
  id: number | string;
  order_number?: string;
  customer_id?: number | string;
  customer_email?: string;
  customer_name?: string;
  items: SyftetOrderItemResponse[];
  subtotal: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total: number;
  currency?: string;
  status: string;
  shipping_address?: SyftetAddressResponse;
  payment_method?: string;
  tracking_number?: string;
  tracking_url?: string;
  invoice_url?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface SyftetOrderItemResponse {
  id: number | string;
  product_id: number | string;
  title: string;
  price: number;
  quantity: number;
  total: number;
}

interface SyftetAddressResponse {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface SyftetCustomerResponse {
  id: number | string;
  email: string;
  name: string;
  phone?: string;
  addresses?: SyftetAddressResponse[];
  default_address_id?: number | string;
  loyalty_points?: number;
  loyalty_tier?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

function toMoney(amount: number, currency = 'USD'): Money {
  return { amount: Math.round(amount * 100), currency };
}

function toImage(img: SyftetImageResponse): Image {
  return { url: img.url, alt: img.alt, width: img.width, height: img.height };
}

export function mapProduct(raw: SyftetProductResponse): Product {
  return {
    id: String(raw.id),
    title: raw.title,
    description: raw.description,
    price: toMoney(raw.price, raw.currency),
    compareAtPrice: raw.compare_at_price ? toMoney(raw.compare_at_price, raw.currency) : undefined,
    inventory: raw.stock,
    variants: raw.variants?.map(mapVariant),
    images: raw.images?.map(toImage),
    categories: raw.categories?.map(mapCategory),
    brand: raw.brand,
    rating: raw.rating,
    tags: raw.tags,
    metadata: raw.metadata,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapVariant(v: SyftetVariantResponse): ProductVariant {
  return {
    id: String(v.id),
    sku: v.sku,
    title: v.title,
    price: toMoney(v.price),
    compareAtPrice: v.compare_at_price ? toMoney(v.compare_at_price) : undefined,
    inventory: v.stock,
    attributes: v.attributes,
  };
}

function mapCategory(c: SyftetCategoryResponse): ProductCategory {
  return {
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id ? String(c.parent_id) : undefined,
  };
}

export function mapCart(raw: SyftetCartResponse): Cart {
  return {
    id: String(raw.id),
    items: raw.items.map(mapCartItem),
    subtotal: toMoney(raw.subtotal, raw.currency),
    tax: raw.tax ? toMoney(raw.tax, raw.currency) : undefined,
    shipping: raw.shipping ? toMoney(raw.shipping, raw.currency) : undefined,
    discount: raw.discount ? toMoney(raw.discount, raw.currency) : undefined,
    total: toMoney(raw.total, raw.currency),
    couponCode: raw.coupon_code,
    itemCount: raw.items.reduce((sum, i) => sum + i.quantity, 0),
    currency: raw.currency ?? 'USD',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapCartItem(i: SyftetCartItemResponse): CartItem {
  return {
    id: String(i.id),
    productId: String(i.product_id),
    variantId: i.variant_id ? String(i.variant_id) : undefined,
    title: i.title,
    price: toMoney(i.price),
    quantity: i.quantity,
    image: i.image ? toImage(i.image) : undefined,
    total: toMoney(i.total),
  };
}

const STATUS_MAP: Record<string, OrderStatus> = {
  pending: OrderStatus.Pending,
  confirmed: OrderStatus.Confirmed,
  processing: OrderStatus.Processing,
  shipped: OrderStatus.Shipped,
  delivered: OrderStatus.Delivered,
  cancelled: OrderStatus.Cancelled,
  refunded: OrderStatus.Refunded,
};

export function mapOrder(raw: SyftetOrderResponse): Order {
  return {
    id: String(raw.id),
    orderNumber: raw.order_number,
    customerId: raw.customer_id ? String(raw.customer_id) : undefined,
    customerEmail: raw.customer_email,
    customerName: raw.customer_name,
    items: raw.items.map(mapOrderItem),
    subtotal: toMoney(raw.subtotal, raw.currency),
    tax: raw.tax ? toMoney(raw.tax, raw.currency) : undefined,
    shipping: raw.shipping ? toMoney(raw.shipping, raw.currency) : undefined,
    discount: raw.discount ? toMoney(raw.discount, raw.currency) : undefined,
    total: toMoney(raw.total, raw.currency),
    currency: raw.currency ?? 'USD',
    status: STATUS_MAP[raw.status] ?? OrderStatus.Pending,
    shippingAddress: raw.shipping_address ? mapAddress(raw.shipping_address) : undefined,
    paymentMethod: raw.payment_method,
    trackingNumber: raw.tracking_number,
    trackingUrl: raw.tracking_url,
    invoiceUrl: raw.invoice_url,
    notes: raw.notes,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapOrderItem(i: SyftetOrderItemResponse): OrderItem {
  return {
    id: String(i.id),
    productId: String(i.product_id),
    title: i.title,
    price: toMoney(i.price),
    quantity: i.quantity,
    total: toMoney(i.total),
  };
}

function mapAddress(a: SyftetAddressResponse): Address {
  return {
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    postalCode: a.postal_code,
    country: a.country,
  };
}

export function mapCustomer(raw: SyftetCustomerResponse): Customer {
  return {
    id: String(raw.id),
    email: raw.email,
    name: raw.name,
    phone: raw.phone,
    addresses: raw.addresses?.map(mapAddress),
    defaultAddressId: raw.default_address_id ? String(raw.default_address_id) : undefined,
    loyaltyPoints: raw.loyalty_points,
    loyaltyTier: raw.loyalty_tier,
    metadata: raw.metadata,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}
