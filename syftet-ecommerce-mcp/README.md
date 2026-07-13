# SyftCommerce — AI Shopping Assistant for Any Ecommerce Platform

AI-powered shopping assistant that lets customers browse products, manage carts, checkout, and track orders through natural language chat — embeddable into any ecommerce storefront.

**The product is not an MCP server. It's a commerce AI assistant that works out of the box.** MCP is the internal protocol that makes it extensible — invisible to the customer.

---

## What This Is

An AI chat assistant for ecommerce customers. Shoppers type things like:

- *"Find me a red dress under $50"*
- *"Add this to my cart"*
- *"What's my order status?"*
- *"Show me similar products"*

And the assistant responds naturally — searching products, managing carts, checking out, and tracking orders against the store's existing backend. Zero learning curve for customers.

---

## How It Works (for the Ecommerce Platform)

```flow
Customer's Browser
       │
       ├── Syftet Chat Widget (React, embed once)
       │       │  SSE streaming
       │       ▼
       ├── Orchestrator Backend (we host or they host)
       │       │
       │       ├── LLM (Ollama / OpenAI / Claude)
       │       └── Syftet MCP Server (tool layer)
       │               │  HTTPS API calls
       │               ▼
       └── Their Existing Ecom API (untouched)
```

### Integration effort for the developer

| Step | What they do |
| --- | --- |
| **1. Backend** | Set 2-3 env vars (`API_URL`, `API_KEY`) → `npm start` |
| **2. Frontend** | Drop `<SyftetChat />` widget into their storefront |
| **3. Done** | Customers see a chat button on the store |

**Their existing frontend, backend, and database never change. They keep full control.** The MCP server just talks to their existing API.

---

## Business Model — Two Ways

### Option 1: Sell the MCP Server (they self-host)

We sell/license the MCP server package to individual ecommerce platforms. They run it on their own infrastructure.

```flow
Their Infrastructure
   ├── Chat Widget (from our package)
   ├── Orchestrator + LLM (Ollama or OpenAI)
   ├── Syftet MCP Server (licensed)
   │       │
   │       ▼
   └── Their Ecom API (untouched)
```

| Aspect | Detail |
| --- | --- |
| **What they buy** | The MCP server package + chat widget + updates |
| **What they manage** | Hosting, LLM, infrastructure |
| **Our role** | License, support, updates |
| **Best for** | Enterprises with compliance needs, or platforms that want full control |

### Option 2: We Host the MCP (they just integrate their config)

We run the MCP server on our end as a multi-tenant SaaS. The ecommerce platform gives us their API config (endpoint URL, auth key), embeds the chat widget on their website, and it works.

```flow
Their Storefront
   │  embed chat widget (CDN script)
   ▼
Our Cloud (multi-tenant SaaS)
   ├── Chat Widget CDN
   ├── Orchestrator + LLM
   ├── Syftet MCP Server
   │       │
   │       ▼
   └── Their Ecom API (we call it)
```

| Aspect | Detail |
| --- | --- |
| **What they do** | Provide API config + paste one `<script>` tag |
| **What we do** | Host everything — MCP server, LLM, scaling, updates |
| **Their benefit** | Zero infrastructure, zero DevOps, works in minutes |
| **Best for** | Most ecommerce stores — they just want it to work |

**Which one wins?** Option 2. Most ecommerce stores don't want to manage servers or LLMs. They'll pay a monthly subscription to make it "just work." Option 1 is a premium tier for enterprises that insist on self-hosting.

**The product is the AI shopping assistant that improves customer experience and conversion. How it's deployed is just logistics.**

---

## Architecture

```flow
┌──────────────────────────────────────────────────┐
│              SyftCommerce MCP Server              │
│                                                   │
│  ┌──────────────┐   ┌────────────────────────┐   │
│  │ 22 Tools     │──▶│   Provider Framework   │   │
│  │              │   │                        │   │
│  │ search_prod  │   │  ┌──────────────────┐  │   │
│  │ get_product  │   │  │  Syftet Adapter   │  │   │
│  │ create_cart  │   │  │  (REST API calls) │  │   │
│  │ add_item     │   │  └──────────────────┘  │   │
│  │ checkout     │   │  ┌──────────────────┐  │   │
│  │ create_order │   │  │  Shopify Adapter  │  │   │
│  │ track_order  │   │  │  (future)         │  │   │
│  │ ...          │   │  └──────────────────┘  │   │
│  └──────┬───────┘   │  ┌──────────────────┐  │   │
│         │           │  │  OpenAPI Engine   │  │   │
│         │           │  │  (future)         │  │   │
│         │           │  └──────────────────┘  │   │
│         │           └───────────┬────────────┘   │
│         │                       │                │
│  ┌──────▼───────────────────────▼────────────┐   │
│  │       Canonical Commerce Models           │   │
│  │  (Product, Cart, Order, Customer, Money)  │   │
│  └───────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────┘
                        │ HTTP REST API calls
                        ▼
            Ecommerce REST API (theirs, untouched)
```

### Request Flow

1. Customer types a message in the chat widget
2. Orchestrator sends it to the LLM with conversation history
3. LLM decides which tool to call (e.g. `search_products`)
4. MCP server resolves the provider → adapter → calls the store's API
5. Adapter normalizes the response into a canonical model
6. LLM generates a natural language reply
7. Reply streams back to the customer via SSE

**Key:** The MCP server calls the store's existing HTTPS APIs — it does **not** touch their database directly.

---

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | >= 18 |
| npm | >= 9 |
| TypeScript | >= 5.5 |
| Target ecom API | reachable HTTPS endpoint |

---

## Setup

### 1. Install

```bash
cd syftet-ecommerce-mcp
npm install
npm run build
```

### 2. Configure

```bash
cp .env.example .env
```

```env
MCP_PORT=4001
SYFTET_API_BASE_URL=https://your-store.com/api
SYFTET_API_KEY=your_api_key
LOG_LEVEL=info
```

### 3. Run

```bash
npm start
```

```output
SyftCommerce MCP Server
======================
Config: MCP_PORT=4001, LOG_LEVEL=info
22 tools registered
SyftCommerce MCP running on http://localhost:4001
  SSE: http://localhost:4001/sse
```

---

## Tools

### Products (4 tools)

| Tool | Description | Read-only |
| --- | --- | --- |
| `search_products` | Search products by keyword | ✅ |
| `get_product` | Get product details by ID | ✅ |
| `list_products` | List all products (paginated) | ✅ |
| `list_categories` | List all categories | ✅ |

### Cart (7 tools)

| Tool | Description | Destructive |
| --- | --- | --- |
| `create_cart` | Create a new empty cart | |
| `get_cart` | Get cart state | ✅ |
| `add_item` | Add product to cart | |
| `remove_item` | Remove item from cart | ✅ |
| `update_quantity` | Change item quantity | |
| `apply_coupon` | Apply coupon code | |
| `remove_coupon` | Remove coupon | ✅ |

### Checkout (3 tools)

| Tool | Description | Destructive |
| --- | --- | --- |
| `checkout` | Complete checkout → place order | ✅ |
| `list_shipping_methods` | Available shipping options | ✅ |
| `list_payment_methods` | Available payment methods | ✅ |

### Orders (6 tools)

| Tool | Description | Destructive |
| --- | --- | --- |
| `create_order` | Create order from cart | ✅ |
| `get_order` | Get order details | ✅ |
| `list_orders` | List all orders (paginated) | ✅ |
| `track_order` | Track shipment status | ✅ |
| `cancel_order` | Cancel an order | ✅ |
| `get_inventory` | Get product stock level | ✅ |

---

## Adding a New Platform Adapter

1. Create `src/adapters/<platform>/`
2. Implement `ProviderInterface` from `src/provider/interface.ts`
3. Register it in `src/provider/registry.ts`
4. All 22 tools work against it immediately — no tool changes needed

The canonical models (`Product`, `Cart`, `Order`, `Customer`) are the contract. The adapter only translates:

- Canonical requests → platform API calls
- Platform API responses → canonical models

---

## Project Structure

```files
src/
├── config/           # Zod-validated config loader
├── models/           # Canonical commerce models (Product, Cart, Order, Customer)
├── provider/         # Provider framework (interface, registry, auth, http-client)
├── adapters/
│   └── syftet/       # Syftet REST API adapter
├── tools/            # MCP tool handlers (22 tools)
├── server/           # Express + SSE transport
└── index.ts          # Entry point
```

---

## License

MIT
