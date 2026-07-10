import type { PaginationResult } from '../models/shared.js';

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export function buildPaginationParams(pagination?: PaginationParams): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (pagination?.cursor) params.cursor = pagination.cursor;
  if (pagination?.limit) params.limit = pagination.limit;
  else params.limit = 20;
  return params;
}

export function extractPaginationResult<T>(
  data: T[],
  responseHeaders?: Record<string, string>,
): PaginationResult<T> {
  const result: PaginationResult<T> = { items: data };

  if (responseHeaders) {
    if (responseHeaders['x-next-cursor']) result.nextCursor = responseHeaders['x-next-cursor'];
    if (responseHeaders['x-prev-cursor']) result.previousCursor = responseHeaders['x-prev-cursor'];
    if (responseHeaders['x-total-count']) result.total = parseInt(responseHeaders['x-total-count'], 10);
  }

  return result;
}
