# Smart Conversational Agent for Financial Document Processing

Intelligent, conversational retrieval-augmented generation (RAG) system tailored specifically for financial document ingestion, structured entity extraction, compliance auditing, and natural language question answering.

- **Frontend Stack**: React + Vite (JavaScript / JSX), React Router, Material UI, Tailwind CSS v4, Vercel AI SDK.
- **Backend Stack**: Node.js & Express (ESM JavaScript), Google Gemini API (Streaming & Embeddings), Supabase Vector Database (`pgvector`), PDF text extraction pipeline.

---

## 🏗️ Architecture & Project Structure

```
Smart-Finance-Agent-for-document-processing/
├── frontend/                               # React + Vite Client Application (JavaScript)
│   ├── index.html                          # HTML shell & font definitions
│   ├── vite.config.js                      # Vite config with backend API proxy & Tailwind v4
│   ├── package.json                        # Frontend dependencies & scripts
│   ├── public/                             # Static assets & favicon
│   └── src/
│       ├── main.jsx                        # React root entry point
│       ├── App.jsx                         # App routes (/ , /chat, /dashboard, /login)
│       ├── index.css                       # Tailwind v4 cascade layer configuration
│       ├── pages/                          # Application pages
│       │   ├── Home.jsx                    # System landing page
│       │   ├── Chat.jsx                    # Conversational RAG assistant with GenUI
│       │   ├── Dashboard.jsx               # Financial admin operations & audit dashboard
│       │   └── Login.jsx                   # Role-Based Authentication (Admin vs Staff)
│       ├── components/
│       │   ├── chat/                       # Chat UI, Bar Chart & Data Table GenUI widgets
│       │   ├── layout/                     # AppShell navigation wrapper
│       │   └── providers/                  # Material UI Theme provider
│       ├── context/
│       │   └── AuthContext.jsx             # Supabase & offline RBAC auth context
│       ├── hooks/                          # Reusable React hooks (useChat, useDocuments)
│       ├── services/                       # API clients (documentService, agentService)
│       ├── theme/                          # Financial theme styling & typography
│       └── lib/                            # Shared utilities and Supabase client
│
├── backend/                                # Node.js / Express Server (JavaScript ESM)
│   ├── package.json                        # Backend dependencies & scripts
│   ├── .env.example                        # Backend environment variable template
│   └── src/
│       ├── server.js                       # Express app with CORS & error handling
│       ├── routes/
│       │   ├── health.js                   # Health check endpoint (/api/health)
│       │   ├── dashboard.js                # Dashboard analytics endpoint (/api/dashboard/analytics)
│       │   ├── documents.js                # Document CRUD & RAG ingestion (/api/documents)
│       │   └── chat.js                     # Conversational Gemini streaming & tool invocation (/api/chat)
│       └── lib/
│           ├── supabase.js                 # Server-side Supabase client
│           └── rag/                        # RAG ingestion, PDF parser & vector retrieval
│               ├── ingestion.js            # PDF text extraction, chunking & embeddings
│               ├── retrieval.js            # Semantic vector similarity search
│               └── index.js
│
└── package.json                            # Root scripts to run both frontend and backend
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend (`backend/.env` or `backend/.env.local`):**
```env
PORT=5000
FRONTEND_URL=http://localhost:5173

# Google Gemini API Key
GOOGLE_GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash

# Supabase Credentials
SUPABASE_URL=https://nedjnudzmphfxolcnxcm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=sb_publishable_5W1jLi5I0-uz1Cwv5_I1-g_EnYd6zKf
```

**Frontend (`frontend/.env` or `frontend/.env.local`):**
```env
VITE_SUPABASE_URL=https://nedjnudzmphfxolcnxcm.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_5W1jLi5I0-uz1Cwv5_I1-g_EnYd6zKf
```

---

### 3. Run Development Servers

**Run Backend (Express on port 5000 with auto-reload):**
```bash
npm run dev:backend
```

**Run Frontend (React + Vite on port 5173):**
```bash
npm run dev:frontend
```

**Or Run Both Concurrently from Root:**
```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser:
- **Chat Assistant**: [http://localhost:5173/chat](http://localhost:5173/chat)
- **Operations Dashboard**: [http://localhost:5173/dashboard](http://localhost:5173/dashboard)
- **Authentication**: [http://localhost:5173/login](http://localhost:5173/login)
- **Backend API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
