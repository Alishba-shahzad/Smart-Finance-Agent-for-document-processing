# Smart Conversational Agent for Financial Document Processing

Final Year Project (FYP) — **Phase 1: Foundational Project Architecture & Configuration**

---

## 📌 Project Overview
This project develops an intelligent, conversational retrieval-augmented generation (RAG) system tailored specifically for financial document ingestion, structured entity extraction, compliance auditing, and natural language question answering.

- **Primary Domain**: Financial Filings (SEC 10-K, 10-Q), Invoices, Balance Sheets, Cash Flow & Income Statements.
- **Frontend Stack**: Next.js (App Router), TypeScript, Material UI (MUI v6/v7), and Tailwind CSS v4.
- **Backend Stack**: Next.js App Router API Routes, ready for LLM (OpenAI / Gemini), Vector Search (Pinecone / Chroma), and OCR/Document Intelligence pipelines.

---

## 🏗️ Architecture & Folder Structure

```
FYP/
├── .env.example                       # Environment configuration template
├── eslint.config.mjs                  # ESLint configuration
├── next.config.ts                     # Next.js configuration
├── package.json                       # Project dependencies and scripts
├── tsconfig.json                      # TypeScript configuration with @/* path alias
├── public/                            # Static assets
└── src/
    ├── app/                           # Next.js App Router root
    │   ├── api/                       # Backend API routes
    │   │   ├── chat/
    │   │   │   └── route.ts           # Chat & RAG conversational query endpoints
    │   │   ├── documents/
    │   │   │   ├── route.ts           # Document listing & upload endpoints
    │   │   │   └── [id]/
    │   │   │       ├── route.ts       # Document details & deletion
    │   │   │       └── process/
    │   │   │           └── route.ts   # OCR & vector indexing trigger
    │   │   ├── dashboard/
    │   │   │   └── analytics/
    │   │   │       └── route.ts       # Administrative KPIs & audit log feed
    │   │   └── health/
    │   │       └── route.ts           # Service health & readiness check
    │   ├── chat/
    │   │   └── page.tsx               # Chat Interface page entry
    │   ├── dashboard/
    │   │   └── page.tsx               # Admin Dashboard page entry
    │   ├── globals.css                # Tailwind CSS v4 & CSS cascade layer order
    │   ├── layout.tsx                 # Root layout with ThemeRegistry integration
    │   └── page.tsx                   # Project landing & navigation portal
    │
    ├── components/                    # Modular frontend components
    │   ├── chat/                      # Reusable components for Chat Interface
    │   │   └── index.ts               # Interface contracts (ChatMessage, ChatInput, Citations)
    │   ├── dashboard/                 # Reusable components for Admin Dashboard
    │   │   └── index.ts               # Interface contracts (MetricCard, DocumentTable, Status)
    │   ├── common/                    # Shared UI primitives
    │   │   └── index.ts               # Interface contracts (PageHeader, LoadingSpinner, EmptyState)
    │   ├── layout/                    # Layout navigation wrappers
    │   │   └── index.ts               # Interface contracts (Navbar, Sidebar, Footer)
    │   └── providers/                 # Client providers
    │       ├── ThemeRegistry.tsx      # MUI AppRouterCacheProvider & ThemeProvider
    │       └── index.ts
    │
    ├── theme/                         # Material UI Theme configuration
    │   ├── theme.ts                   # Financial color palette, typography & overrides
    │   └── index.ts
    │
    ├── types/                         # TypeScript domain models & interfaces
    │   ├── api.ts                     # Standard ApiResponse and PaginatedResponse
    │   ├── chat.ts                    # ChatMessage, Citation, and Conversation
    │   ├── document.ts                # FinancialDocument, Category, and Entity models
    │   ├── dashboard.ts               # DashboardMetricOverview and AuditLogEntry
    │   └── index.ts
    │
    ├── lib/                           # Utilities & constants
    │   ├── constants.ts               # Categories, allowed MIME types, project config
    │   ├── utils.ts                   # Currency, file size, and date formatters
    │   └── index.ts
    │
    ├── services/                      # API service contracts & client implementations
    │   ├── documentService.ts         # Document CRUD & processing pipeline client
    │   ├── agentService.ts            # Conversational agent query client
    │   └── index.ts
    │
    └── hooks/                         # Reusable React hooks
        ├── useChat.ts                 # Chat operation & state management hook
        ├── useDocuments.ts            # Document listing & upload hook
        └── index.ts
```

---

## 🎨 Styling: Material UI & Tailwind CSS Interoperability

To ensure Material UI and Tailwind CSS work in harmony without specificity collisions:
1. **CSS Cascade Layers**: `globals.css` declares `@layer theme, base, mui, components, utilities;`.
2. **MUI AppRouterCacheProvider**: Uses `options={{ enableCssLayer: true, key: 'mui' }}`. This wraps all Emotion-generated Material UI classes inside `@layer mui`, allowing Tailwind utilities to override or complement MUI styles without `!important` hacks.
3. **MUI Theme Palette**: Tailored for financial trust with deep Slate (`#0F172A`), financial Blue (`#2563EB`), Emerald gain indicators (`#059669`), and clean typography.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
copy .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the portal.
- **Chat Interface**: [http://localhost:3000/chat](http://localhost:3000/chat)
- **Admin Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Health Check API**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
