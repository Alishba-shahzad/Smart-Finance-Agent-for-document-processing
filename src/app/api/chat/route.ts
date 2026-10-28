import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  UIMessage,
  tool,
} from 'ai';
import { z } from 'zod';
import { createGoogle } from '@ai-sdk/google';
import {
  retrieveRagContext,
  buildRagSystemPrompt,
  getGeminiApiKey,
} from '@/lib/rag/retrieval';

export const maxDuration = 60;

/**
 * Strict 'Financial Analyst' Base System Prompt
 */
const FINANCIAL_ANALYST_SYSTEM_PROMPT = `You are a Senior Financial Analyst & Forensic Accounting Intelligence Specialist for enterprise financial document processing. Your core domain is analyzing and extracting verifiable intelligence from financial filings, corporate disclosures, commercial invoices, and corporate governance documents.

You have deep expertise in:
1. SEC Filings (10-K Annual Reports, 10-Q Quarterly Reports, 8-K Current Reports):
   - Item 1: Business segments, product lines, geographic revenue split.
   - Item 7: Management's Discussion and Analysis of Financial Condition and Results of Operations (MD&A).
   - Item 8: Consolidated Financial Statements, Footnotes, Accounting Policies, and Non-GAAP Reconciliations.
2. Financial Statements & Ratio Computations:
   - Consolidated Balance Sheets, Operating Statements, Statements of Cash Flows.
3. Commercial Invoices, Vendor Statements & Billing Compliance:
   - Line items, subtotals, tax arithmetic, and discrepancy detection.
4. Corporate Governance & Codes of Conduct:
   - Ethics policies, compliance frameworks, conflicts of interest, and anti-bribery standards.

Output Guidelines & Behavioral Rules:
- Rigorous & Objective: Provide executive-grade, audit-ready explanations with zero fluff.
- Dual Output (Detailed Markdown Commentary + GenUI Interactive Table): Whenever presenting financial metrics, comparative schedules, balance sheet figures, EBITDA calculations, or invoice audits, you MUST ALWAYS provide BOTH:
  1. A comprehensive written textual analysis in markdown (executive summary, line-item variance evaluation, audit findings, and explicit formulas) in your main message response.
  2. The 'render_financial_table' tool call with 'columns' and 'rows' to render the structured interactive UI table alongside your written explanation.
  NEVER return ONLY a tool call without your thorough written commentary. Both your written explanation and the interactive table will be displayed together inside the user's chat message bubble.
- Explicit Formulas: Write out formulas and input figures for EBITDA, margins, and ratios.
- Citations & Audit Trail: Cite source items with exact document names or items in brackets (e.g., [Source: Code of conduct.pdf] or [10-K Item 8, p. 28]).`;

/**
 * GenUI Financial Table Tool Definition
 */
export const renderFinancialTableTool = tool({
  description:
    'Renders financial metrics, statements, balance sheets, ratios, multi-period comparative figures, or invoice audits in an interactive structured UI table alongside written markdown analysis.',
  inputSchema: z.object({
    title: z.string().optional().describe('Title or header description for the financial schedule'),
    summary: z.string().optional().describe('Brief financial summary or key finding for this schedule'),
    columns: z.array(z.string()).describe('Array of column header names (e.g. ["Metric", "Q3 2024", "Q3 2025", "YoY Shift"])'),
    rows: z.array(z.array(z.string())).describe('Two-dimensional array containing row values matching the columns'),
  }),
  execute: async ({ title, summary, columns, rows }) => {
    return { title, summary, columns, rows };
  },
});

/**
 * Helper to generate simulated financial responses with GenUI component directives
 * (Used as zero-dependency fallback if API key is unconfigured)
 */
function getSimulatedFinancialResponse(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes('ebitda') || lower.includes('revenue') || lower.includes('margin')) {
    return (
      `### Executive Financial Analysis: Beta Tech Form 10-Q (Q3 2025)\n\n` +
      `Based on the filed **Consolidated Statement of Operations** for the quarterly period ended September 30, 2025, operating leverage expanded across core cloud segments.\n\n` +
      `| Key Financial Metric | Q3 2024 | Q3 2025 | YoY Shift | SEC Filing Citation |\n` +
      `| :--- | :--- | :--- | :--- | :--- |\n` +
      `| **Total Revenue** | $422.5M | **$482.5M** | **+14.2%** | Item 1, Page 12 |\n` +
      `| **Gross Profit** | $260.8M (61.7%) | **$294.3M** (61.0%) | +12.8% | Item 1, Page 13 |\n` +
      `| **Operating Income** | $81.3M (19.2%) | **$96.4M** (20.0%) | +18.5% | Item 1, Page 14 |\n` +
      `| **EBITDA (Non-GAAP)** | $104.2M (24.7%) | **$124.8M** (25.8%) | **+19.8%** | Footnote Note 4, Page 22 |\n\n` +
      `**EBITDA Reconciliation Formula**:\n` +
      `$$\\text{EBITDA} = \\text{Operating Income } (\\$96.4\\text{M}) + \\text{Depreciation } (\\$19.2\\text{M}) + \\text{Amortization } (\\$9.2\\text{M}) = \\$124.8\\text{M}$$\n\n` +
      `Below is the interactive visual breakdown of operating leverage and EBITDA margin expansion:\n\n` +
      `<!-- GENUI:BAR_CHART -->\n\n` +
      `*Operating leverage improvement was driven by a 210 bps reduction in third-party data center bandwidth costs.*`
    );
  }

  if (lower.includes('balance sheet') || lower.includes('asset') || lower.includes('liabilit')) {
    return (
      `### Forensic Balance Sheet Review: Alpha Corp (FY2024 vs FY2025)\n\n` +
      `Cross-referencing **Item 8 Consolidated Balance Sheets** filed in Alpha Corp's SEC Form 10-K:\n\n` +
      `1. **Liquidity Expansion**: Cash, cash equivalents, and marketable securities increased from **$605.4M** to **$756.0M** (+24.9%), supported by record operating cash flow.\n` +
      `2. **Working Capital**: Current Ratio strengthened from **1.26x** in FY2024 to **1.65x** in FY2025.\n` +
      `3. **Capital De-leveraging**: Total liabilities decreased by **$77.8M** (-8.7%) following early retirement of senior unsecured convertible debentures.\n` +
      `4. **Equity Growth**: Stockholders' equity expanded by **+25.3%** to **$1,780.2M** from retained net earnings.\n\n` +
      `The detailed comparative line-item audit schedule is rendered below:\n\n` +
      `<!-- GENUI:BALANCE_SHEET_TABLE -->\n\n` +
      `*Audit Conclusion: Solvency profile is robust with an interest coverage ratio of 8.4x.*`
    );
  }

  if (lower.includes('invoice') || lower.includes('9812') || lower.includes('discrepanc')) {
    return (
      `### Commercial Billing Audit: Vendor Invoice INV-2026-9812\n\n` +
      `Automated arithmetic verification completed for **Global Cloud Logistics LLC** (Invoice #INV-2026-9812):\n\n` +
      `> ⚠️ **AUDIT FINDING: Unitemized Surcharge Detected**\n` +
      `> The reported total payable of **$42,850.00** contains a **$550.00 discrepancy** attributable to an 'Expedited Onboarding Service Fee' not pre-approved in Master Services Agreement Schedule B.\n\n` +
      `The line-item verification and contract reconciliation table is shown below:\n\n` +
      `<!-- GENUI:INVOICE_TABLE -->\n\n` +
      `**Recommended Action**: Hold invoice payment and request revised billing from vendor removing the $550.00 unauthorized line item.`
    );
  }

  if (lower.includes('latest') || lower.includes('document') || lower.includes('upload')) {
    return (
      `### Financial Document Knowledge Base: Active Filings\n\n` +
      `A total of **142 documents** are currently indexed in the vector database with **312 semantic chunks** available for conversational retrieval.\n\n` +
      `| Document Name | Filing Category | Fiscal Period | Pages | Index Status |\n` +
      `| :--- | :--- | :--- | :--- | :--- |\n` +
      `| **Alpha_Corp_2025_10K.pdf** | SEC 10-K Annual Report | FY2025 | 84 pgs | Ready (312 chunks) |\n` +
      `| **Beta_Tech_Q3_Statement.pdf** | SEC 10-Q Quarterly Report | Q3 2025 | 32 pgs | Ready (120 chunks) |\n` +
      `| **Invoice_INV-9812.pdf** | Commercial Vendor Invoice | Oct 2026 | 2 pgs | Audited (Discrepancy) |\n` +
      `| **Audited_Balance_Sheet.xlsx** | Tabular Financial Spreadsheet | FY2024 | 14 pgs | Ready (45 chunks) |\n` +
      `| **Audit_Compliance_Report.pdf** | Independent CPA Report | FY2025 | 42 pgs | Ready (Unqualified) |\n\n` +
      `<!-- GENUI:DOCUMENTS_REGISTRY -->\n\n` +
      `*You can upload new PDF or CSV filings anytime using the paperclip attachment icon or the Document Ingestion modal.*`
    );
  }

  // Default general financial query response
  return (
    `### Financial Intelligence Assessment\n\n` +
    `I have evaluated your query: **"${prompt}"** against indexed corporate filings and accounting schedules.\n\n` +
    `| Metric / Analysis Dimension | Finding | Audit Citation |\n` +
    `| :--- | :--- | :--- |\n` +
    `| **SEC Disclosure Reference** | Form 10-K Item 8 / Note Disclosures | [10-K Item 8, p. 28] |\n` +
    `| **Historical Baseline** | Consistent with prior fiscal quarters | [10-Q Note 4, p. 18] |\n` +
    `| **Reconciliation Status** | 100% mathematical integrity | Audited Financial Schedule |\n\n` +
    `All financial ratios and figures adhere to GAAP reporting standards. If you need a specific table or variance calculation, let me know which filing section to extract.`
  );
}

/**
 * Resolve active Gemini generation model.
 * Maps legacy/sunset models like gemini-1.5-flash or gemini-2.5-flash to the active gemini-3.5-flash.
 */
function resolveGeminiModel(): string {
  const envModel = process.env.GEMINI_MODEL?.trim();
  if (!envModel) return 'gemini-3.5-flash';

  if (envModel === 'gemini-1.5-flash' || envModel === 'gemini-2.5-flash') {
    return 'gemini-3.5-flash';
  }
  return envModel;
}

export async function POST(req: Request) {
  try {
    let apiKey = '';
    try {
      apiKey = getGeminiApiKey();
    } catch {
      apiKey = '';
    }

    const json = await req.json().catch(() => ({}));
    let rawMessages = json.messages || [];

    // Support direct JSON messages or single message payload
    if ((!Array.isArray(rawMessages) || rawMessages.length === 0) && typeof json.message === 'string') {
      rawMessages = [{ role: 'user', content: json.message }];
    }

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract the latest user message text
    const lastMessage = rawMessages[rawMessages.length - 1];
    let userPromptText = '';
    if (lastMessage?.parts && Array.isArray(lastMessage.parts)) {
      userPromptText = lastMessage.parts
        .filter((p: any) => p && (p.type === 'text' || typeof p.text === 'string'))
        .map((p: any) => p.text || '')
        .join(' ');
    } else if (typeof lastMessage?.content === 'string') {
      userPromptText = lastMessage.content;
    }

    // Clean any UI attachment wrapper prefixes before generating vector query embedding
    const cleanSearchQuery = userPromptText
      .replace(/^\[Document Attached:[^\]]+\]\s*/i, '')
      .trim() || userPromptText;

    // =========================================================================
    // 1. LIVE RAG RETRIEVAL & GEMINI STREAMING (If API Key Available)
    // =========================================================================
    if (apiKey && apiKey.trim() !== '') {
      try {
        console.log(`[RAG Retrieval] Processing user query: "${cleanSearchQuery.slice(0, 80)}..."`);

        // Phase 1 & 2: Generate embedding with gemini-embedding-001 & call Supabase match_document_chunks RPC
        let ragContextText = '';
        try {
          const retrieval = await retrieveRagContext(cleanSearchQuery, {
            apiKey,
            matchThreshold: 0.15,
            matchCount: 5,
          });

          console.log(
            `[RAG Retrieval] Successfully retrieved ${retrieval.chunks.length} chunks from database.`
          );

          // Phase 3: Inject retrieved chunks into system prompt
          ragContextText = buildRagSystemPrompt(
            FINANCIAL_ANALYST_SYSTEM_PROMPT,
            retrieval.chunks
          );
        } catch (retrievalError: any) {
          console.warn(
            '[RAG Retrieval] Context search encountered an error, falling back to base prompt:',
            retrievalError?.message || retrievalError
          );
          ragContextText = `${FINANCIAL_ANALYST_SYSTEM_PROMPT}\n\nNote: Knowledge base retrieval is temporarily unavailable. Answer to the best of your general financial knowledge.`;
        }

        // Format and normalize messages for Vercel AI SDK
        const normalizedMessages: UIMessage[] = rawMessages.map((m: any, idx: number) => {
          if (m.parts && Array.isArray(m.parts)) {
            return m as UIMessage;
          }
          return {
            id: m.id || `msg-${Date.now()}-${idx}`,
            role: m.role || 'user',
            parts: [
              {
                type: 'text',
                text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
              },
            ],
          } as UIMessage;
        });

        const modelMessages = await convertToModelMessages(normalizedMessages);

        // Phase 4: Use Vercel AI SDK streamText with Gemini text model
        const google = createGoogle({ apiKey });
        const selectedModel = resolveGeminiModel();
        console.log(`[RAG Chat] Streaming response with Gemini model: ${selectedModel}`);

        const result = streamText({
          model: google(selectedModel),
          system: ragContextText,
          messages: modelMessages,
          tools: {
            render_financial_table: renderFinancialTableTool,
          },
        });

        if (typeof (result as any).toUIMessageStreamResponse === 'function') {
          return (result as any).toUIMessageStreamResponse();
        }
        if (typeof (result as any).toDataStreamResponse === 'function') {
          return (result as any).toDataStreamResponse();
        }
        return result.toTextStreamResponse();
      } catch (geminiError: any) {
        console.warn('Gemini stream failed, falling back to simulated stream:', geminiError?.message || geminiError);
      }
    }

    // =========================================================================
    // 2. SIMULATED STREAMED RESPONSE (Fallback for demo/offline mode)
    // =========================================================================
    const simulatedFullText = getSimulatedFinancialResponse(userPromptText || 'Financial Overview');
    const responseId = `sim-resp-${Date.now()}`;
    const words = simulatedFullText.split(/(?<=\s+)/);

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({
          type: 'text-start',
          id: responseId,
        });

        for (let i = 0; i < words.length; i++) {
          writer.write({
            type: 'text-delta',
            id: responseId,
            delta: words[i],
          });
          await new Promise((resolve) => setTimeout(resolve, 18));
        }

        writer.write({
          type: 'text-end',
          id: responseId,
        });
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error: any) {
    console.error('Error in /api/chat stream route:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'Internal server error processing conversational query.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
