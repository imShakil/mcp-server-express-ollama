# SyftCommerce MCP — Project Plan

> An AI-first, platform-agnostic Commerce MCP Server

SyftCommerce enables AI assistants (ChatGPT, Claude, Cursor, VS Code, Gemini, Local LLM, etc.) to securely interact with eCommerce platforms through the Model Context Protocol (MCP). It provides a unified commerce interface regardless of the underlying platform (Custom APis, Shopify, WooCommerce, Magento, Medusa, BigCommerce, etc.). Primary target is to use on custom made ecommerce platform. See [TODO.md](./TODO.md) for the phase-by-phase task breakdown that implements this plan.

---

## 1. Vision

Build the most extensible Commerce MCP ecosystem, letting any AI assistant perform commerce
operations through one standardized interface, regardless of the underlying platform
(custom API, Shopify, WooCommerce, Magento, Medusa, BigCommerce, or any OpenAPI/GraphQL/REST
service).

**Primary target**: custom-built ecommerce platforms (via OpenAPI/REST), with native adapters
as a secondary, higher-effort tier.

## 1.1 Initial Demo Scope

For the first build, target is narrowed on purpose: **one custom ecommerce backend, one
tenant, one adapter (hand-mapped REST, not the generic OpenAPI engine).** The goal is a
complete, narratable customer journey — browse → cart → checkout → order → track — not
broad platform coverage. Everything that doesn't serve that journey is deferred, not cut:

**In scope for the demo:**

- Custom API Provider (Phase 4), hand-mapped to your backend's actual endpoints
- ~11 core tools covering the full journey (Phase 5, demo-critical list)
- Tool annotations + a server-side confirmation gate on `create_order` — cheap to include,
  and it's the clearest demonstration of the "human approval for destructive actions"
  principle, so worth keeping even in a stripped-down build
- Canonical models, but only the fields your backend actually returns

**Deferred until after the demo proves the core loop:**

- Generic OpenAPI/REST discovery engine and AI-assisted mapping (Phase 6) — the demo's
  endpoint mapping is hand-written once; auto-discovery is a separate, later feature for
  *other people's* backends, not needed to demo against your own
- Any native adapter (Shopify, WooCommerce, etc.) — irrelevant until you need a second
  provider
- Multi-tenancy, webhooks, recommendations, observability, marketplace (Phases 8–13)
- Secondary tools: coupons, customer accounts/loyalty, refunds/returns, shipping-rate
  shopping, invoices — add these back once the core loop is validated and if the demo
  narrative calls for them

This keeps the demo "simple" in scope while staying a genuinely complete slice of the
product, rather than a mocked or partial one — every tool that exists in the demo does the
real thing against a real backend.

## 2. Core Principles

- One interface for all commerce platforms — AI never sees vendor-specific logic
- Adapter-based architecture — canonical models are the contract, adapters are replaceable
- Configuration over customization — new tenants/providers should not require new code
- Human approval required for destructive actions — enforced via tool annotations, not just policy
- Security first — credentials and payment data never pass through model context
- AI should understand *commerce*, not vendor APIs

---

## 3. Architecture

```flow
                    AI Client (Claude, ChatGPT, Cursor, Gemini, local LLM)
                                    │
                                    ▼
                          SyftCommerce MCP Server
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
              Native Adapter   OpenAPI/REST      GraphQL Adapter
                    │           Adapter               │
                    ▼               ▼                ▼
         Shopify / WooCommerce   Custom API        ERP / Custom
         / Magento / Medusa /
         BigCommerce
```

All adapters implement the same **Provider Interface** and map into the same
**Canonical Commerce Models** (Section 4). This is the single most important architectural
decision in the project — every tool, every tenant config, and every capability check is built
against the canonical model, never against a vendor's native schema.

**Request flow** (e.g. `add_item`):

1. AI client calls `add_item` tool with `{cart_id, product_id, quantity}`
2. MCP server resolves tenant → provider config → adapter instance
3. Adapter translates canonical request into the provider's native call (REST/GraphQL/SDK)
4. Adapter normalizes the provider's response back into the canonical `Cart` model
5. Server logs the write to the audit trail, returns structured + human-readable content

### 3.1 Why Canonical Models Must Come Before Adapters

The original plan sequenced "Native Providers" (building Shopify/Woo/Magento adapters) and the
"OpenAPI Engine" (including an "operation generator") *before* "Canonical Commerce Models."
This is backwards: an adapter's entire job is translating a vendor schema into the canonical
model, and an operation generator can't map `GET /products` → `search_products` without a
target schema to map into. The canonical model is now Phase 2, immediately after Foundation,
and every subsequent phase builds against it. See `TODO.md`.

---

## 4. Canonical Commerce Models

Kept from the original doc, with explicit typing intent (not just field lists):

| Model | Key Fields | Notes |
| --- | --- | --- |
| Product | id, title, description, price, currency, inventory, variants, images, categories, brand, rating | Variants are first-class, not a Product subtype hack |
| Customer | id, email, name, addresses[], loyalty, metadata | metadata is adapter-passthrough for fields with no canonical home |
| Cart | id, items[], subtotal, tax, shipping, discount, total | Money fields always `{amount, currency}`, never bare numbers |
| Order | id, customer, items[], payment, shipping, status, tracking, invoice | status is an enum mapped from each provider's native status strings |

**Decision needed early**: define a shared `Money` type (`{amount: integer minor units, currency: ISO 4217}`)
and a shared `Address` type once, reused across Customer/Cart/Order/Shipping — this avoids four
slightly-different address shapes emerging across modules.

---

## 5. Tool Specification Contract

Every tool must be documented with all of the following before implementation — not just a
name in a category list:

| Field | Purpose |
| --- | --- |
| `name` | verb_noun, consistent across the whole toolset (see 5.1) |
| `description` | what it does, in commerce terms, not vendor-API terms |
| `inputSchema` | Zod/Pydantic, with constraints and examples in field descriptions |
| `outputSchema` | structured content shape returned to the client |
| `annotations` | `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` |
| `requiredCapabilities` | which adapter capabilities must be present (e.g. `refund_order` requires `Refund` capability) |

### 5.1 Naming Convention Fix

The original tool list mixed noun-only names (`inventory`, `categories`, `collections`) with
verb_noun names (`search_products`, `get_product`). Inconsistent naming measurably hurts model
tool-selection accuracy. **All tools use `verb_noun`**: `get_inventory`, `list_categories`,
`list_collections`, etc. Full corrected list lives in `TODO.md` Phase 6.

### 5.2 Read vs. Write, and the Approval Mechanism

"Human approval for destructive actions" only works if destructiveness is a machine-readable
property, not prose. Every write tool (`create_order`, `cancel_order`, `refund_order`,
`remove_item`, `apply_coupon`) is annotated `destructiveHint: true` (or `idempotentHint: false`
where relevant), and the MCP server enforces a confirmation step for any tool so annotated,
regardless of which client is calling it. This should not be optional per-client behavior.

### 5.3 Response Shape

Every tool returns both:

- `structuredContent` — canonical JSON, for programmatic use
- a short human-readable text summary — for direct display

List-returning tools (`list_products`, `list_orders`) share one pagination contract
(cursor-based, not offset — safer under concurrent writes) defined once in the Provider SDK,
not reinvented per adapter.

---

## 6. Security Model

Concrete mechanisms, replacing the original checklist:

- **Credential storage**: tenant credentials live in a secrets manager/KMS, never in tenant
  config files or environment variables checked into any repo.
- **Payment data**: the MCP server never receives or stores raw card data. Checkout tools proxy
  to the provider's own payment flow (Shopify Payments, Stripe, etc.) and only canonical
  status/reference IDs cross into model context.
- **Tenant isolation**: every tool call resolves a tenant-scoped adapter instance; a token or
  session from tenant A can never be used to satisfy tenant B's request. This is the primary
  multi-tenant failure mode to design tests against explicitly (Phase 8).
- **Audit log schema**: every write logs `{actor, tenant_id, tool, params, result, timestamp}`,
  append-only, queryable per tenant.
- **RBAC**: scopes are per-tenant, per-tool-category (e.g., a support-agent role gets
  `orders:read` + `orders:refund` but not `customers:write`).
- **Rate limiting**: per-tenant and per-provider-credential, since a shared provider API key
  across a tenant's users must not let one heavy user exhaust another's quota.

---

## 7. Roadmap (maps to TODO.md phases)

Reordered for dependency correctness — see `TODO.md` for full task lists:

1. **Foundation** — empty, working MCP server
2. **Canonical Commerce Models** — the schema everything else maps into
3. **Provider Framework** — adapter interface, auth, HTTP client, retry/pagination/cache, built against the canonical models
4. **Custom API Provider (DEMO)** — hand-mapped REST adapter against your own backend, proves the interface against a real API without the overhead of a generic discovery engine or a third-party platform's API quirks
5. **Core Commerce Tools (DEMO scope: ~11 tools)** — Products, Cart, Checkout, Orders — the full browse-to-track journey, validated end-to-end against your Custom API adapter
   — *demo milestone: everything above this line is enough for a complete, working demo*
6. **OpenAPI/REST Engine** — generic provider support for *other* backends (your eventual primary target market), now mapping into a proven canonical model and a proven tool set
7. **Native Providers** — Shopify, WooCommerce, Magento, Medusa, BigCommerce — cheaper now that the interface is battle-tested against a real backend
8. **Multi-Tenant** — tenant isolation, credential storage, per-tenant configs
9. **Webhooks** — incoming events, real-time sync
10. **Recommendation Engine** — semantic search, bundles, cross/up-sell (needs stable product data first)
11. **Observability** — metrics, tracing, audit, performance
12. **Developer Experience** — CLI, templates, provider generator, docs, SDK
13. **Marketplace** — provider marketplace, plugin registry, community providers

**Why Custom API first, not Shopify or another native platform**: the stated initial goal is a
demo, and the fastest path to a *complete* demo is against a backend you already control —
no OAuth app-install flow, no third-party rate limits, no waiting on a platform's own product
setup. Shopify and other native adapters move to Phase 7, once the interface is proven and
the OpenAPI/REST engine exists to potentially generalize the mapping work later.

**Why OpenAPI Engine stays after core tools, not before**: the "AI mapping" feature
(`GET /products` → `search_products`) needs a working, tested set of canonical tools to map
*into*. For the demo, that mapping is written by hand once (Phase 4) — the generic
auto-discovery engine (Phase 6) is a separate, later feature for onboarding *other* backends,
not a prerequisite for demoing against your own.

---

## 8. Success Criteria

A user connects any commerce platform via Native Adapter, OpenAPI, GraphQL, or REST, and an AI
assistant can immediately: search products, manage customers, build carts, apply coupons,
check out, place orders, track shipments, manage returns, and handle refunds — without changing
the AI prompt or business workflow, and with destructive actions gated behind explicit
confirmation.

## 9. Open Decisions to Resolve Before Phase 3

- TypeScript vs. Python for the server (TypeScript recommended: SDK maturity, static typing, broad MCP ecosystem support)
- Transport: streamable HTTP for the hosted multi-tenant version, stdio for local/dev use
- Cursor vs. offset pagination (recommend cursor, decided once here rather than per-adapter)
- Whether to expose MCP **Resources** (e.g. `order://{id}`, `product://{id}`) in addition to tools — deferred to a v1.1 decision, noted here so it isn't silently dropped
