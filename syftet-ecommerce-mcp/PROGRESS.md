# SyftCommerce MCP — Progress Tracker

See [docs/PLAN.md](./docs/PLAN.md) for the full architecture and [docs/TODO.md](./docs/TODO.md) for the phase-by-phase task list.

---

## Summary

| Phase | Status | Deliverable |
| --- | --- | --- |
| Phase 1 — Foundation | ✅ Complete | Working MCP server with SSE transport, config, validation, logging, error handling |
| Phase 2 — Canonical Models | ✅ Complete | Product, Cart, Order, Customer, Money, Address, PaginationCursor |
| Phase 3 — Provider Framework | ✅ Complete | Provider interface, registry, auth strategies, HTTP client, pagination |
| Phase 4 — Custom API: **Syftet** | ✅ Complete | Hand-mapped REST adapter against Syftet ecommerce API |
| Phase 5 — Core Commerce Tools | ✅ Complete | 22 tools covering browse → cart → checkout → order → track |
| Phase 6 — OpenAPI/REST Engine | ⏳ Future | Generic provider for any REST/OpenAPI backend |
| Phase 7 — Native Providers | ⏳ Future | Shopify, WooCommerce, Magento, Medusa, BigCommerce |
| Phase 8 — Multi-Tenant | ⏳ Future | Tenant isolation, credential storage, RBAC |
| Phase 9 — Webhooks | ⏳ Future | Real-time event sync |
| Phase 10 — Recommendation Engine | ⏳ Future | Semantic search, bundles, cross-sell |
| Phase 11 — Observability | ⏳ Future | Metrics, tracing, audit |
| Phase 12 — Developer Experience | ⏳ Future | CLI, templates, SDK |
| Phase 13 — Marketplace | ⏳ Future | Plugin registry, community providers |

---

## Phase 1 — Foundation ✅

| Task | Status |
| --- | --- |
| Repository setup (monorepo vs. multi-repo decision) | ✅ Single repo with clear src/ layout |
| Project structure (src/, adapters/, tools/, models/, config/, tests/) | ✅ 22 source files in 7 directories |
| MCP server bootstrap (TypeScript SDK, HTTP + SSE transport) | ✅ Express SSE at /sse, /messages, /health |
| Configuration loader (env vars, Zod validated) | ✅ `config/schema.ts` + `config/loader.ts` |
| Logging (structured JSON logs, log levels) | ✅ LOG_LEVEL env var, console-based with debug support |
| Error handling (typed error classes, actionable messages) | ✅ `ApiError` class with statusCode, code, details |
| Environment management (dev/staging/prod config) | ✅ `.env.example` with all vars documented |
| Plugin loader (dynamic adapter registration) | ✅ `provider/registry.ts` with `registerProvider()` |
| Provider interface (contract every adapter implements) | ✅ `provider/interface.ts` with 16 methods |
| Validation (shared Zod schemas) | ✅ All models use Zod schemas for runtime validation |
| Unit test harness | ⚠️ Vitest installed, scaffolding ready, no tests yet |

---

## Phase 2 — Canonical Commerce Models ✅

| Task | Status |
| --- | --- |
| Shared primitives: Money, Address, DateTime, PaginationCursor | ✅ `models/shared.ts` |
| Product model | ✅ `models/product.ts` — Product, ProductVariant, ProductCategory |
| Customer model | ✅ `models/customer.ts` — Customer with Address[] |
| Cart model | ✅ `models/cart.ts` — Cart with CartItem[] |
| Order model | ✅ `models/order.ts` — Order with OrderStatus enum |
| Status enums per model | ✅ `OrderStatus` enum with 7 values |
| Schema versioning strategy | ⏳ Future concern |

---

## Phase 3 — Provider Framework ✅

| Task | Status |
| --- | --- |
| Provider Registry (register/lookup by tenant + provider type) | ✅ `provider/registry.ts` |
| Adapter Manager (lifecycle: init, health check, teardown) | ✅ `healthCheck()` on interface + `createProviderFromConfig()` |
| Provider Interface (16 methods, typed against canonical models) | ✅ `provider/interface.ts` |
| Authentication module (API Key, Bearer, OAuth2, Basic, Cookie) | ✅ `provider/auth.ts` — 4 strategies (OAuth2 stubbed) |
| HTTP client (shared, with auth + logging interceptors) | ✅ `provider/http-client.ts` with `ApiError` handling |
| Retry logic | ⏳ Future (trivial to add via axios-retry) |
| Pagination helper (cursor-based) | ✅ `provider/pagination.ts` |
| Rate limiter | ⏳ Future |
| Cache layer | ⏳ Future |
| Webhook receiver scaffold | ⏳ Phase 9 |

---

## Phase 4 — Custom API: Syftet ✅

| Task | Status |
| --- | --- |
| Syftet REST API client | ✅ `adapters/syftet/adapter.ts` |
| Auth (API Key via `X-Api-Key` header) | ✅ `adapters/syftet/auth.ts` |
| Product mapping → canonical Product | ✅ `mapping.ts` — `mapProduct()` |
| Customer mapping → canonical Customer | ✅ `mapping.ts` — `mapCustomer()` |
| Cart mapping → canonical Cart | ✅ `mapping.ts` — `mapCart()` |
| Order mapping → canonical Order + status enum | ✅ `mapping.ts` — `mapOrder()` |
| Capability declaration | ✅ `[checkout, inventory, coupons, shipment]` |

---

## Phase 5 — Core Commerce Tools ✅

| Task | Status |
| --- | --- |
| `search_products`, `get_product`, `list_products`, `list_categories` | ✅ `tools/products.ts` |
| `create_cart`, `get_cart`, `add_item`, `remove_item`, `update_quantity` | ✅ `tools/cart.ts` |
| `apply_coupon`, `remove_coupon` | ✅ `tools/cart.ts` |
| `checkout`, `list_shipping_methods`, `list_payment_methods` | ✅ `tools/checkout.ts` |
| `create_order`, `get_order`, `list_orders`, `cancel_order`, `track_order` | ✅ `tools/orders.ts` |
| `get_inventory` | ✅ `tools/orders.ts` |
| Annotations: readOnlyHint / destructiveHint / idempotentHint | ✅ All 22 tools annotated |
| structuredContent + human-readable text on every response | ✅ Dual content returned (summary + JSON) |
| Confirmation gate for destructiveHint tools | ⚠️ Annotations in place, server-side gate TBD |

---

## Future Phases (not started)

- **Phase 6** — OpenAPI/REST Engine: generic provider for any backend with OpenAPI spec
- **Phase 7** — Native Providers: Shopify, WooCommerce, Magento, Medusa, BigCommerce
- **Phase 8** — Multi-Tenant: tenant isolation, credential storage, RBAC scopes
- **Phase 9** — Webhooks: real-time event receiver, cache invalidation
- **Phase 10** — Recommendation Engine: semantic search, bundles, cross-sell
- **Phase 11** — Observability: metrics, tracing, audit trail
- **Phase 12** — Developer Experience: CLI, templates, provider generator, docs site
- **Phase 13** — Marketplace: plugin registry, community providers

---

## What's Next (highest priority)

1. **Unit tests** — Vitest is installed; need tests for models, mapping functions, and tools
2. **Integration with a live Syftet API** — point `SYFTET_API_BASE_URL` at a real backend and validate the full browse→track flow
3. **Server-side confirmation gate** — enforce the `destructiveHint` annotation so no tool marked destructive executes without explicit `confirmed: true`
4. **OAuth2 auth strategy** — needed for Shopify/WooCommerce adapters
