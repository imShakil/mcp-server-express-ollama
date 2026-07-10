# SyftCommerce MCP Server

AI-first, platform-agnostic Commerce MCP Server. Lets AI assistants (Claude, Cursor, ChatGPT, etc.) browse products, manage carts, checkout, and track orders — through one unified interface — against any ecommerce platform.

**Primary target:** custom ecommerce backends via REST API (your Syftet platform).  
**Extensible to:** Shopify, WooCommerce, Magento, Medusa, BigCommerce, and any OpenAPI/GraphQL service.

---

## Architecture

```flow
AI Client (Claude, Cursor, ChatGPT, local LLM)
        │
        ▼
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
            Syftet Ecommerce REST API
            (or Shopify / WooCommerce / etc.)
```

### Request Flow

1. AI client calls a tool (e.g. `add_item` with `{cart_id, product_id, quantity}`)
2. MCP server resolves tenant → provider config → adapter instance
3. Adapter translates canonical request into the provider's native REST call
4. Adapter normalizes the provider's response back into a canonical model
5. Server returns structured JSON + human-readable text to the AI client

**Key difference from typical MCP demos:** this server calls external HTTPS APIs — it does **not** hit a database directly.

---

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | >= 18 |
| npm | >= 9 |
| TypeScript | >= 5.5 |
| Syftet API (or target platform) | reachable endpoint |

---

## Setup

### 1. Clone and install

```bash
cd syftet-ecommerce-mcp
npm install
```

### 2. Configure environment

Copy the example env file and fill in your Syftet API credentials:

```bash
cp .env.example .env
```

```env
MCP_PORT=4001

SYFTET_API_BASE_URL=http://your-syftet-api.com/api
SYFTET_API_KEY=your_api_key_here
SYFTET_API_SECRET=your_api_secret_here

LOG_LEVEL=info
```

### 3. Build

```bash
npm run build
```

### 4. Run

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

Expected output:

```txt
SyftCommerce MCP Server
======================

Config: MCP_PORT=4001, LOG_LEVEL=info
Provider: syftet
Capabilities: checkout, inventory, coupons, shipment
22 tools registered
SyftCommerce MCP running on http://localhost:4001
  SSE: http://localhost:4001/sse
  Health: http://localhost:4001/health
```

---

## Testing

```bash
# Type check (no emit)
npm run typecheck

# Run tests (once set up)
npm test

# Watch mode
npm run test:watch
```

### Manual smoke test with `curl`

```bash
# Health check
curl http://localhost:4001/health

# List available tools (via MCP SSE — connect and list)
# The MCP inspector is the best tool for interactive testing:
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## Connecting to AI Clients

### Cursor / VS Code (via `mcp.json`)

Add to your Cursor or VS Code MCP config:

```json
{
  "mcpServers": {
    "syftcommerce": {
      "command": "node",
      "args": ["/absolute/path/to/syftet-ecommerce-mcp/dist/index.js"],
      "env": {
        "SYFTET_API_BASE_URL": "http://your-syftet-api.com/api",
        "SYFTET_API_KEY": "your_key"
      }
    }
  }
}
```

### Claude Desktop (via `claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "syftcommerce": {
      "command": "node",
      "args": ["/path/to/syftet-ecommerce-mcp/dist/index.js"]
    }
  }
}
```

### Any MCP-compatible client

Connect via SSE transport at `http://localhost:4001/sse`.

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

All destructive tools return `destructiveHint: true` in their annotations for client-side confirmation.

---

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/sse` | SSE connection (MCP transport) |
| POST | `/messages?sessionId=` | MCP message handler |
| GET | `/health` | Health check (`{status, sessions}`) |

---

## Adding a New Platform Adapter

1. Create `src/adapters/<platform>/`
2. Implement `ProviderInterface` from `src/provider/interface.ts`
3. Register it in `src/provider/registry.ts`
4. That's it — all 22 tools work against it immediately

The canonical models (`Product`, `Cart`, `Order`, `Customer`) are the contract. Your adapter's only job is:

- Translate canonical requests → platform API calls
- Translate platform API responses → canonical models

---

## Project Structure

```files
src/
├── config/           # Zod-validated config loader
│   ├── schema.ts
│   └── loader.ts
├── models/           # Canonical commerce models
│   ├── shared.ts     # Money, Address, PaginationCursor
│   ├── product.ts
│   ├── cart.ts
│   ├── order.ts
│   └── customer.ts
├── provider/         # Provider framework
│   ├── interface.ts  # Adapter contract (16 methods)
│   ├── registry.ts
│   ├── auth.ts       # API Key, Bearer, Basic, Cookie
│   ├── http-client.ts
│   └── pagination.ts
├── adapters/
│   └── syftet/       # Syftet REST API adapter
│       ├── adapter.ts
│       ├── auth.ts
│       └── mapping.ts
├── tools/            # MCP tool handlers
│   ├── products.ts   # 4 tools
│   ├── cart.ts       # 7 tools
│   ├── checkout.ts   # 3 tools
│   └── orders.ts     # 6 tools
├── server/
│   ├── transport.ts  # Express + SSE
│   └── index.ts      # MCP Server bootstrap
└── index.ts          # Entry point
```

---

## License

MIT
