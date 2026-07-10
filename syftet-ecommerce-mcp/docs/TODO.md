# TODOs

See [PLAN.md](./PLAN.md) for the reasoning behind this ordering — phases are now sequenced by dependency
(canonical models before adapters, one proven native provider before multiplying providers,
core tools before the OpenAPI mapping engine that targets them).

---

## Phase 1 — Foundation

**Goal**: reusable framework, working empty MCP server.

- [ ] Repository setup (monorepo vs. multi-repo decision, license, CONTRIBUTING.md)
- [ ] Project structure (src/, adapters/, tools/, models/, config/, tests/)
- [ ] MCP server bootstrap (TypeScript SDK, stdio transport for local dev)
- [ ] Configuration loader (env vars + tenant config file schema, validated with Zod)
- [ ] Logging (structured JSON logs, log levels, request-id correlation)
- [ ] Error handling (typed error classes, actionable error messages returned to the AI client)
- [ ] Environment management (dev/staging/prod config separation)
- [ ] Plugin loader (dynamic adapter registration mechanism)
- [ ] Provider interface (abstract class/interface every adapter must implement — see Phase 3)
- [ ] Validation (shared Zod schema utilities for tool inputs)
- [ ] Unit test harness (Vitest/Jest setup, CI wiring)

**Deliverable**: working empty MCP server, no tools registered yet, passes CI.

---

## Phase 2 — Canonical Commerce Models

**Goal**: define the schema every adapter and tool maps into. Moved up from the original
Phase 5 — nothing downstream can be built correctly without this first.

- [ ] Shared primitives: `Money {amount: integer minor units, currency: ISO 4217}`, `Address`, `DateTime`, `Pagination cursor`
- [ ] `Product` model (id, title, description, price: Money, inventory, variants[], images[], categories[], brand, rating)
- [ ] `Customer` model (id, email, name, addresses: Address[], loyalty, metadata)
- [ ] `Cart` model (id, items[], subtotal: Money, tax: Money, shipping: Money, discount: Money, total: Money)
- [ ] `Order` model (id, customer, items[], payment, shipping, status: enum, tracking, invoice)
- [ ] Status enums per model (normalize provider-specific status strings into canonical enums)
- [ ] Schema versioning strategy (how a model gains a field without breaking cached client schemas)
- [ ] Model validation tests (fixtures for each model, edge cases: multi-currency cart, guest customer, partial refund)

**Deliverable**: canonical schema package, published/importable by every adapter and tool module.

---

## Phase 3 — Provider Framework

**Goal**: Provider SDK — the interface adapters implement against the Phase 2 models.

- [ ] Provider Registry (register/lookup adapters by tenant + provider type)
- [ ] Adapter Manager (lifecycle: init, health check, teardown)
- [ ] Provider Interface definition (methods every adapter must implement: `getProduct`, `createOrder`, etc., typed against canonical models)
- [ ] Authentication module (API Key, Bearer, OAuth2, OAuth PKCE, JWT, Basic, Cookie Session, HMAC — pluggable strategy pattern)
- [ ] HTTP client (shared, with interceptors for auth injection and logging)
- [ ] Retry logic (exponential backoff, idempotency-key support for write retries)
- [ ] Pagination helper (cursor-based, shared contract used by every adapter)
- [ ] Rate limiter (per-tenant, per-provider-credential — see PLAN.md Section 6)
- [ ] Cache layer (per-tenant, TTL-based, invalidated on write)
- [ ] Webhook receiver scaffold (signature verification, event queue — full implementation in Phase 9)
- [ ] Capability declaration mechanism (adapter declares which capabilities it supports: Checkout, Inventory, Refund, Coupons, Wishlist, Shipment)

**Deliverable**: Provider SDK — any new adapter can be built by implementing one interface.

---

## Phase 4 — Native Provider: Shopify (MVP)

**Goal**: prove the Provider Interface against one real, full-featured API before committing to
five parallel adapter builds. This replaces the original single "Native Providers" phase that
bundled Shopify/WooCommerce/Magento/Medusa/BigCommerce with no sequencing.

- [ ] Shopify Admin API client (REST + GraphQL as needed)
- [ ] Auth (OAuth2 app install flow)
- [ ] Product/variant mapping → canonical `Product`
- [ ] Customer mapping → canonical `Customer`
- [ ] Cart/Checkout mapping → canonical `Cart`
- [ ] Order mapping → canonical `Order`, including status enum mapping
- [ ] Capability declaration (Shopify supports: Checkout, Inventory, Refund, Coupons — declare what it doesn't: e.g. native Wishlist)
- [ ] Webhook subscription (order updates, inventory updates)
- [ ] Integration tests against a Shopify dev store

**Deliverable**: one fully working native adapter, validating the interface end-to-end.

---

## Phase 5 — Core Commerce Tools

**Goal**: complete MCP toolset, validated against the Shopify adapter. Tool names use
consistent `verb_noun` convention throughout (see PLAN.md 5.1) — no bare nouns like the
original `inventory`/`categories`/`collections`.

- [ ] `search_products`, `get_product`, `list_products`, `get_related_products`, `list_categories`, `list_collections`, `get_inventory`
- [ ] `lookup_customer`, `create_customer`, `update_customer`, `list_customer_addresses`, `get_loyalty_points`
- [ ] `create_cart`, `get_cart`, `add_item`, `remove_item`, `update_quantity`, `apply_coupon`, `remove_coupon`, `estimate_shipping`
- [ ] `checkout` (orchestrates tax/shipping/payment internally), `list_payment_methods`, `list_shipping_methods`, `calculate_tax`, `create_order`
- [ ] `get_order`, `list_orders`, `cancel_order`, `refund_order`, `return_order`, `track_order`, `get_invoice`
- [ ] `get_shipping_rates`, `track_package`, `get_inventory`, `list_warehouses`, `get_stock_status`
- [ ] Annotate every tool: `readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint`
- [ ] `structuredContent` + human-readable text on every response
- [ ] Confirmation gate enforced server-side for all `destructiveHint: true` tools
- [ ] Capability-based tool disabling (hide/error tools the active adapter doesn't support)

**Deliverable**: complete MCP toolset, working end-to-end against Shopify.

---

## Phase 6 — OpenAPI / REST Engine

**Goal**: OpenAPI Provider — your primary target (custom ecommerce platforms). Moved after
Phase 5 so the mapping engine targets a proven, stable toolset instead of one still in flux.

- [ ] OpenAPI 3.x parser
- [ ] Swagger (2.0) parser
- [ ] Spec validation
- [ ] Endpoint discovery (list operations, params, schemas)
- [ ] Schema parser (map OpenAPI schemas → canonical models)
- [ ] Operation generator (`GET /products` → `search_products`, `POST /orders` → `create_order`, etc.)
- [ ] AI-assisted mapping suggestions (surface confidence + rationale, not just a guess)
- [ ] Manual mapping review UI model (admin approves/edits AI suggestions before publish)
- [ ] Generic REST provider (manual endpoint mapping, no OpenAPI spec required)
- [ ] GraphQL provider (schema introspection, operation mapping)
- [ ] Publish workflow: Upload Spec → Validate → Extract Operations → AI Suggests Mapping → Admin Reviews → Publish

**Deliverable**: OpenAPI/REST/GraphQL Provider, usable without writing adapter code.

---

## Phase 7 — Remaining Native Providers

**Goal**: native adapters, now cheaper since the interface and canonical models are proven.

- [ ] WooCommerce adapter
- [ ] Magento adapter
- [ ] Medusa adapter
- [ ] BigCommerce adapter
- [ ] (Stretch) Saleor, CommerceTools, Shopify Hydrogen

**Deliverable**: native adapters for major platforms.

---

## Phase 8 — Multi-Tenant

**Goal**: hosted platform.

- [ ] Tenant isolation (token/session scoping — a tenant-A credential must never satisfy a tenant-B request; write explicit isolation tests, not just code)
- [ ] Credential storage (secrets manager/KMS, never in config files)
- [ ] Tenant config schema (company info, provider, auth, endpoint, feature flags, currency, locale, timezone)
- [ ] Provider configs per tenant
- [ ] RBAC scopes per tenant per tool-category

**Deliverable**: hosted, multi-tenant platform.

---

## Phase 9 — Webhooks

**Goal**: real-time synchronization.

- [ ] Incoming event receiver (signature verification per provider)
- [ ] Order update events
- [ ] Inventory update events
- [ ] Shipment update events
- [ ] Event → cache invalidation wiring (Phase 3 cache layer)

**Deliverable**: real-time sync across all connected providers.

---

## Phase 10 — Recommendation Engine

**Goal**: AI commerce features. Sequenced after core tools since it depends on stable,
populated product data.

- [ ] `recommend_products` (semantic search over product catalog)
- [ ] `recommend_bundle`
- [ ] `recommend_similar` / cross-sell
- [ ] `recommend_alternatives` / upsell
- [ ] `trending_products`

**Deliverable**: AI-driven recommendation tools.

---

## Phase 11 — Observability

**Goal**: enterprise monitoring.

- [ ] Metrics (per-tool latency, error rate, per-tenant usage)
- [ ] Tracing (request flow across adapter → provider API)
- [ ] Structured logs (already scaffolded Phase 1, extend per-tenant filtering)
- [ ] Audit trail (already scaffolded Phase 3/8, add queryable UI/API)
- [ ] Performance dashboards

**Deliverable**: enterprise-grade monitoring.

---

## Phase 12 — Developer Experience

**Goal**: developer ecosystem.

- [ ] CLI (scaffold new adapters, tenants, tools)
- [ ] Project templates
- [ ] Provider generator (codegen from OpenAPI spec → adapter skeleton)
- [ ] Documentation site
- [ ] Example integrations
- [ ] Public SDK package

**Deliverable**: developer ecosystem.

---

## Phase 13 — Marketplace

**Goal**: extension ecosystem.

- [ ] Provider marketplace (list/install community adapters)
- [ ] Plugin registry
- [ ] Version manager
- [ ] Community provider submission/review process

**Deliverable**: extension ecosystem.

---

## Future (Unscheduled)

- ERP Integration
- CRM Integration
- POS Integration
- Warehouse Integration
- Payment Gateway Plugins
- Analytics
- AI Agent Workflows
- Workflow Automation
- Scheduled Tasks
- Knowledge Base
- Voice Commerce
- Multi-language AI Shopping
- Personalized Recommendations
- Subscription Commerce
- B2B Commerce
- Marketplace Aggregation

---

## Success Criteria

A user connects **any commerce platform** using Native Adapter, OpenAPI, GraphQL, or REST, and
immediately enables AI assistants to:

- Search products
- Manage customers
- Build carts
- Apply coupons
- Check out
- Place orders
- Track shipments
- Manage returns
- Handle refunds

...without changing the AI prompt or business workflow, and with every destructive action
gated behind explicit human confirmation.
