import { z } from 'zod';
import { MoneySchema, ImageSchema } from './shared.js';

export const ProductVariantSchema = z.object({
  id: z.string(),
  sku: z.string().optional(),
  title: z.string(),
  price: MoneySchema,
  compareAtPrice: MoneySchema.optional(),
  inventory: z.number().int().nonnegative(),
  attributes: z.record(z.string(), z.string()).optional(),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const ProductCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  parentId: z.string().optional(),
});

export type ProductCategory = z.infer<typeof ProductCategorySchema>;

export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  price: MoneySchema,
  compareAtPrice: MoneySchema.optional(),
  inventory: z.number().int().nonnegative(),
  variants: z.array(ProductVariantSchema).optional(),
  images: z.array(ImageSchema).optional(),
  categories: z.array(ProductCategorySchema).optional(),
  brand: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Product = z.infer<typeof ProductSchema>;
