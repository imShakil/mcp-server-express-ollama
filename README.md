# Todo MCP App

A real-world AI-powered Todo application built with **MCP (Model Context Protocol)**, **Express.js**, **PostgreSQL**, **Ollama (Llama 3.1)**, and **React**. Users can log in and interact with their todos through a natural language chat interface powered by a local LLM.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend                        │
│              (Vite + React Router DOM)                  │
│                                                         │
│   /login → /register → /chat                           │
│   JWT stored in localStorage                           │
│   SSE streaming for chat responses                     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / SSE Streaming
                         │ port 3000
┌────────────────────────▼────────────────────────────────┐
│              Express.js Backend                         │
│                                                         │
│  ┌─────────────────┐   ┌──────────────────────────┐    │
│  │   Auth Service  │   │      Chat Service         │    │
│  │                 │   │                           │    │
│  │  POST /register │   │  POST /chat (SSE stream)  │    │
│  │  POST /login    │   │  GET  /chat/history       │    │
│  │  POST /refresh  │   │  DELETE /chat/history     │    │
│  │  GET  /me       │   │                           │    │
│  └─────────────────┘   └──────────────┬────────────┘   │
│                                        │                │
│  ┌─────────────────┐   ┌──────────────▼────────────┐   │
│  │   Todo REST API │   │      MCP Client            │   │
│  │                 │   │  (SSEClientTransport)      │   │
│  │  GET    /todos  │   │                           │   │
│  │  POST   /todos  │   │  Connects to MCP Server   │   │
│  │  PATCH  /todos  │   │  at port 4000             │   │
│  │  DELETE /todos  │   └──────────────┬────────────┘   │
│  └─────────────────┘                  │                │
└───────────────────────────────────────┼────────────────┘
                                        │
              ┌─────────────────────────┼──────────────────────┐
              │                         │                      │
┌─────────────▼──────┐    ┌─────────────▼───────────────────┐ │
│   Ollama Server    │    │         MCP Server               │ │
│                    │    │    (HTTP + SSE Transport)        │ │
│   llama3.1         │◄───┤         port 4000                │ │
│   Tool Calling     │    │                                  │ │
│   Streaming        │    │  Tools:                          │ │
│                    │    │  ├── get_todos                   │ │
│   port 11434       │    │  ├── create_todo                 │ │
└────────────────────┘    │  ├── toggle_todo                 │ │
                          │  ├── delete_todo                 │ │
                          │  ├── search_todos                │ │
                          │  ├── filter_todos                │ │
                          │  ├── get_todo_stats              │ │
                          │  └── update_todo_title           │ │
                          └──────────────┬───────────────────┘ │
                                         │                      │
                          ┌──────────────▼───────────────────┐  │
                          │          PostgreSQL               │  │
                          │          port 5432               │  │
                          │                                  │  │
                          │  Tables:                         │  │
                          │  ├── users                       │  │
                          │  ├── todos                       │  │
                          │  └── chat_messages               │  │
                          └──────────────────────────────────┘  │
                                                                 │
              └─────────────────────────────────────────────────┘
```

---

## How a Chat Message Works

```
1. User types: "create a todo Buy groceries"
        ↓
2. React sends POST /chat with JWT token
        ↓
3. Express loads chat history from DB
        ↓
4. Ollama (llama3.1) decides: "I need to call create_todo tool"
        ↓
5. MCP Client calls create_todo("Buy groceries") on MCP Server
        ↓
6. MCP Server inserts into PostgreSQL → returns result
        ↓
7. Ollama generates natural language response with the result
        ↓
8. Response streams back to React via SSE chunks
        ↓
9. Chat message saved to DB for context history
```

---

## Project Structure

```
todo-mcp-app/
├── express-server/                 # Backend (Auth + Chat + REST API)
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.js             # Register, Login, Refresh, Me
│   │   │   ├── todos.js            # CRUD REST API for todos
│   │   │   └── chat.js             # Chat endpoint with SSE streaming
│   │   ├── services/
│   │   │   ├── mcpClient.js        # MCP Client (SSE transport)
│   │   │   └── chatService.js      # Ollama + MCP tool orchestration
│   │   ├── db.js                   # PostgreSQL pool + table init
│   │   └── index.js                # Express app entry point
│   ├── .env
│   └── package.json
│
├── mcp-server/                     # MCP Server (HTTP + SSE Transport)
│   ├── src/
│   │   └── index.js                # MCP Server with 8 tools
│   ├── .env
│   └── package.json
│
└── react-frontend/                 # React UI (Vite)
    ├── src/
    │   ├── api/
    │   │   └── axios.js            # Axios instance with JWT interceptor
    │   ├── context/
    │   │   └── AuthContext.jsx     # Auth state management
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   └── Chat.jsx            # Chat UI with SSE streaming
    │   ├── App.jsx                 # Routes + PrivateRoute guard
    │   └── index.css
    └── package.json
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | v24.x |
| npm | v10+ |
| PostgreSQL | v15+ |
| Ollama | latest |

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd todo-mcp-app
```

### 2. PostgreSQL Setup

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE tododb;
CREATE USER todouser WITH PASSWORD 'todopass';
GRANT ALL PRIVILEGES ON DATABASE tododb TO todouser;
\c tododb
GRANT ALL ON SCHEMA public TO todouser;
\q
```

### 3. Ollama Setup

```bash
# Install Ollama from https://ollama.com
ollama pull llama3.1
```

### 4. MCP Server Setup

```bash
cd mcp-server
npm install
```

Create `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tododb
DB_USER=todouser
DB_PASSWORD=todopass
MCP_PORT=4000
```

### 5. Express Server Setup

```bash
cd ../express-server
npm install
```

Create `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tododb
DB_USER=todouser
DB_PASSWORD=todopass
PORT=3000
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MCP_SERVER_URL=http://localhost:4000
OLLAMA_MODEL=llama3.1
OLLAMA_HOST=http://localhost:11434
```

### 6. React Frontend Setup

```bash
cd ../react-frontend
npm install
```

---

## Running the Application

Open **3 terminals** and run each service:

**Terminal 1 — MCP Server:**
```bash
cd mcp-server
node src/index.js
```
Expected output:
```
✅ MCP HTTP Server running on http://localhost:4000
   SSE endpoint: http://localhost:4000/sse
```

**Terminal 2 — Express Server:**
```bash
cd express-server
node src/index.js
```
Expected output:
```
✅ DB ready
✅ Users table ready
✅ MCP Client connected
✅ 8 tools loaded
🚀 Server running on port 3000
```

**Terminal 3 — React Frontend:**
```bash
cd react-frontend
npm run dev
```
Expected output:
```
VITE v5.x ready on http://localhost:5173
```

Open your browser at **http://localhost:5173**

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user |

### Todos (requires JWT)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/todos` | Get all todos |
| POST | `/todos` | Create todo |
| PATCH | `/todos/:id` | Toggle completed |
| DELETE | `/todos/:id` | Delete todo |

### Chat (requires JWT)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat` | Send message (SSE stream) |
| GET | `/chat/history` | Get chat history |
| DELETE | `/chat/history` | Clear chat history |

### MCP Server
| Method | Endpoint | Description |
|---|---|---|
| GET | `/sse` | SSE connection endpoint |
| POST | `/messages` | MCP message handler |
| GET | `/health` | Health check |

---

## MCP Tools

| Tool | Description |
|---|---|
| `get_todos` | Get all todos |
| `create_todo` | Create a new todo |
| `toggle_todo` | Toggle completed status |
| `delete_todo` | Delete a todo |
| `search_todos` | Search todos by keyword |
| `filter_todos` | Filter by completed status |
| `get_todo_stats` | Get total/completed/pending count |
| `update_todo_title` | Update todo title |

---

## Example Chat Prompts

```
"Show me all my todos"
"Create a todo Buy groceries"
"Mark todo 1 as done"
"Search todos with keyword meeting"
"Show only completed todos"
"Give me todo stats"
"Delete todo 3"
"Update todo 2 title to Learn Kafka"
```

---

## Connecting to Cursor IDE

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "todo-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/todo-mcp-app/mcp-server/src/index.js"],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "tododb",
        "DB_USER": "todouser",
        "DB_PASSWORD": "todopass"
      }
    }
  }
}
```

Reload Cursor window (`Ctrl+Shift+P` → Reload Window).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router DOM |
| Backend | Node.js v24, Express.js |
| Auth | JWT (access + refresh token) |
| LLM | Ollama — llama3.1 |
| MCP | @modelcontextprotocol/sdk v1.29.0 |
| Database | PostgreSQL 15 |
| MCP Transport | HTTP + SSE (production-ready) |