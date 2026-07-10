import { z } from 'zod';
import { MoneySchema, ImageSchema } from './shared.js';

export const CartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  title: z.string(),
  price: MoneySchema,
  quantity: z.number().int().positive(),
  image: ImageSchema.optional(),
  total: MoneySchema,
});

export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: z.string(),
  items: z.array(CartItemSchema),
  subtotal: MoneySchema,
  tax: MoneySchema.optional(),
  shipping: MoneySchema.optional(),
  discount: MoneySchema.optional(),
  total: MoneySchema,
  couponCode: z.string().optional(),
  itemCount: z.number().int().nonnegative(),
  currency: z.string().length(3),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Cart = z.infer<typeof CartSchema>;
