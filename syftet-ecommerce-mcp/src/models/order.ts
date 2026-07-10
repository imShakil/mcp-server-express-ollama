import { z } from 'zod';
import { MoneySchema, AddressSchema, ImageSchema } from './shared.js';

export enum OrderStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Processing = 'processing',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

export const OrderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  title: z.string(),
  price: MoneySchema,
  quantity: z.number().int().positive(),
  total: MoneySchema,
  image: ImageSchema.optional(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string().optional(),
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  items: z.array(OrderItemSchema),
  subtotal: MoneySchema,
  tax: MoneySchema.optional(),
  shipping: MoneySchema.optional(),
  discount: MoneySchema.optional(),
  total: MoneySchema,
  currency: z.string().length(3),
  status: z.nativeEnum(OrderStatus),
  shippingAddress: AddressSchema.optional(),
  paymentMethod: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  invoiceUrl: z.string().url().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Order = z.infer<typeof OrderSchema>;
