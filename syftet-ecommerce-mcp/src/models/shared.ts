import { z } from 'zod';

export const MoneySchema = z.object({
  amount: z.number().int().describe('Amount in minor units (e.g. cents)'),
  currency: z.string().length(3).describe('ISO 4217 currency code'),
});

export type Money = z.infer<typeof MoneySchema>;

export function money(amount: number, currency = 'USD'): Money {
  return { amount: Math.round(amount * 100), currency };
}

export function formatMoney(m: Money): string {
  const units = (m.amount / 100).toFixed(2);
  return `${units} ${m.currency}`;
}

export const AddressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string().length(2).describe('ISO 3166-1 alpha-2'),
});

export type Address = z.infer<typeof AddressSchema>;

export const PaginationCursorSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type PaginationCursor = z.infer<typeof PaginationCursorSchema>;

export interface PaginationResult<T> {
  items: T[];
  nextCursor?: string;
  previousCursor?: string;
  total?: number;
}

export const ImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type Image = z.infer<typeof ImageSchema>;
