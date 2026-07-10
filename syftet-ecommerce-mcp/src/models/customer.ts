import { z } from 'zod';
import { AddressSchema } from './shared.js';

export const CustomerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().optional(),
  addresses: z.array(AddressSchema).optional(),
  defaultAddressId: z.string().optional(),
  loyaltyPoints: z.number().int().nonnegative().optional(),
  loyaltyTier: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;
