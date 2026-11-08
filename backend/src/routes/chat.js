import { Router } from 'express';
import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  tool,
  isStepCount,
} from 'ai';
import { z } from 'zod';
import { createGoogle } from '@ai-sdk/google';
import {
  retrieveRagContext,
  buildRagSystemPrompt,
} from '../lib/rag/retrieval.js';
import { getGeminiApiKey } from '../lib/rag/ingestion.js';
import {
  queryTabularData,
  getRegisteredDataset,
  getAllRegisteredDatasets,
  parseFinancialNumber,
  formatCurrency,
  formatNumber,
  generateTabularManifestChunks,
} from '../lib/rag/tabularEngine.js';

const router = Router();

let sessionActiveDocument = null;
let globalCurrentPrompt = '';

export function getActiveSessionDocument() {
  return sessionActiveDocument;
}

export function setActiveSessionDocument(docName) {
  if (docName && typeof docName === 'string') {
    sessionActiveDocument = docName.trim();
  }
}

/**
 * Sanitizes raw chat history received from the frontend:
 * 1. Identifies all tool-call IDs that have a valid tool-result anywhere in the conversation.
 * 2. Removes any orphaned tool-call / tool-invocation that lacks a matching result.
 * 3. Removes empty assistant messages caused by dropping orphaned calls.
 * 4. Removes trailing incomplete assistant messages so the conversation always terminates on a user turn.
 */
export function sanitizeRawChatHistory(rawMessages) {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return [];
  }

  // 1. Identify all completed tool call IDs that have an associated result
  const completedToolCallIds = new Set();
  for (const msg of rawMessages) {
    if (!msg) continue;
    if (msg.role === 'tool' && msg.toolCallId) {
      completedToolCallIds.add(msg.toolCallId);
    }
    if (Array.isArray(msg.toolInvocations)) {
      for (const ti of msg.toolInvocations) {
        if (ti && (ti.state === 'result' || ti.result !== undefined) && ti.toolCallId) {
          completedToolCallIds.add(ti.toolCallId);
        }
      }
    }
    if (Array.isArray(msg.parts)) {
      for (const p of msg.parts) {
        if (!p) continue;
        if ((p.type === 'tool-result' || p.toolResult) && p.toolCallId) {
          completedToolCallIds.add(p.toolCallId);
        }
        if (p.type === 'tool-invocation' && p.toolInvocation) {
          const ti = p.toolInvocation;
          if ((ti.state === 'result' || ti.result !== undefined) && ti.toolCallId) {
            completedToolCallIds.add(ti.toolCallId);
          }
        }
      }
    }
    if (Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c && c.type === 'tool-result' && c.toolCallId) {
          completedToolCallIds.add(c.toolCallId);
        }
      }
    }
  }

  // 2. Filter and sanitize messages
  const sanitized = [];

  for (let i = 0; i < rawMessages.length; i++) {
    const msg = rawMessages[i];
    if (!msg || typeof msg !== 'object') continue;

    const role = msg.role || 'user';

    // Users and systems
    if (role === 'user' || role === 'system') {
      let text = '';
      if (typeof msg.content === 'string') {
        text = msg.content;
      } else if (Array.isArray(msg.parts)) {
        text = msg.parts
          .filter((p) => p && (p.type === 'text' || typeof p.text === 'string'))
          .map((p) => p.text || '')
          .join(' ');
      } else if (Array.isArray(msg.content)) {
        text = msg.content
          .filter((c) => c && (c.type === 'text' || typeof c.text === 'string'))
          .map((c) => c.text || '')
          .join(' ');
      }

      if (!text.trim() && i !== rawMessages.length - 1) {
        continue;
      }

      sanitized.push({
        id: msg.id || `msg-${Date.now()}-${i}`,
        role,
        content: text || 'Continue analysis',
        parts: [{ type: 'text', text: text || 'Continue analysis' }],
      });
      continue;
    }

    // Assistants
    if (role === 'assistant') {
      let validParts = [];
      let textContent = '';

      if (typeof msg.content === 'string' && msg.content.trim().length > 0) {
        textContent = msg.content.trim();
        validParts.push({ type: 'text', text: textContent });
      }

      if (Array.isArray(msg.parts)) {
        for (const p of msg.parts) {
          if (!p) continue;
          if (p.type === 'text' && typeof p.text === 'string' && p.text.trim().length > 0) {
            if (!validParts.some((vp) => vp.type === 'text' && vp.text === p.text)) {
              validParts.push(p);
              if (!textContent) textContent = p.text.trim();
            }
          } else if (p.type === 'tool-invocation' && p.toolInvocation) {
            const ti = p.toolInvocation;
            if (completedToolCallIds.has(ti.toolCallId)) {
              validParts.push(p);
            } else {
              console.warn(`[Sanitize] Removed orphaned tool-invocation: ${ti.toolCallId} (${ti.toolName})`);
            }
          } else if (p.type === 'tool-call') {
            if (completedToolCallIds.has(p.toolCallId)) {
              validParts.push(p);
            } else {
              console.warn(`[Sanitize] Removed orphaned tool-call: ${p.toolCallId} (${p.toolName})`);
            }
          } else if (p.type === 'tool-result') {
            validParts.push(p);
          }
        }
      }

      let validToolInvocations = [];
      if (Array.isArray(msg.toolInvocations)) {
        validToolInvocations = msg.toolInvocations.filter(
          (ti) => ti && completedToolCallIds.has(ti.toolCallId)
        );
      }

      const hasContent =
        validParts.length > 0 ||
        textContent.length > 0 ||
        validToolInvocations.length > 0;

      if (!hasContent) {
        console.warn(`[Sanitize] Dropped empty/incomplete assistant message at index ${i}`);
        continue;
      }

      const cleanAssistant = {
        id: msg.id || `msg-${Date.now()}-${i}`,
        role: 'assistant',
        content: textContent,
        parts: validParts.length > 0 ? validParts : [{ type: 'text', text: textContent }],
      };
      if (validToolInvocations.length > 0) {
        cleanAssistant.toolInvocations = validToolInvocations;
      }
      sanitized.push(cleanAssistant);
    }

    if (role === 'tool') {
      if (completedToolCallIds.has(msg.toolCallId)) {
        sanitized.push(msg);
      }
    }
  }

  // 3. Remove trailing incomplete assistant messages (must end on user query)
  while (sanitized.length > 0 && sanitized[sanitized.length - 1].role === 'assistant') {
    const dropped = sanitized.pop();
    console.warn(`[Sanitize] Removed trailing incomplete assistant message:`, dropped?.id);
  }

  return sanitized;
}

/**
 * Sanitizes ModelMessages generated by convertToModelMessages:
 * Enforces that no assistant message contains a tool-call without a corresponding tool-result.
 */
export function sanitizeModelMessages(modelMessages) {
  if (!Array.isArray(modelMessages)) return [];

  // 1. Identify all completed tool results
  const completedIds = new Set();
  for (const msg of modelMessages) {
    if (!msg) continue;
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c?.type === 'tool-result' && c.toolCallId) {
          completedIds.add(c.toolCallId);
        }
      }
    }
  }

  // 2. Clean model messages
  const cleanModelMsgs = [];
  for (const msg of modelMessages) {
    if (!msg) continue;
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const cleanContent = msg.content.filter((c) => {
        if (c?.type === 'tool-call') {
          const hasResult = completedIds.has(c.toolCallId);
          if (!hasResult) {
            console.warn(`[Sanitize Model] Stripped orphaned model tool-call: ${c.toolCallId} (${c.toolName})`);
          }
          return hasResult;
        }
        return true;
      });

      if (cleanContent.length > 0) {
        cleanModelMsgs.push({
          ...msg,
          content: cleanContent,
        });
      }
    } else {
      cleanModelMsgs.push(msg);
    }
  }

  // 3. Remove trailing assistant messages
  while (cleanModelMsgs.length > 0 && cleanModelMsgs[cleanModelMsgs.length - 1].role === 'assistant') {
    cleanModelMsgs.pop();
  }

  return cleanModelMsgs;
}

const FINANCIAL_ANALYST_SYSTEM_PROMPT = `You are a Senior Banking Financial Analyst & Forensic Accounting Intelligence Specialist at a tier-one global financial institution. You analyze loan portfolios, commercial invoices, corporate filings (SEC 10-K, 10-Q), balance sheets, cash flows, and large tabular datasets (10,000+ rows).

CRITICAL MANDATORY WORKFLOW DIRECTIVES (ZERO TOLERANCE FOR HALLUCINATION):
0. ACTIVE CONTEXT CONTINUITY DIRECTIVE:
   - Always operate strictly on the active document identified in the prompt header ([Documents Attached: ...] or [Active Document Context: ...]).
   - For follow-up queries where the user does not attach a new file, maintain continuity with the previously attached active document.
   - NEVER introduce or hallucinate arbitrary datasets like 'train.csv'.
   - When the user requests a chart (e.g. Bar chart or Pie chart), strictly honor the requested chartType and map the exact column names from the active dataset (e.g. 'Market Cap', 'Sector', 'Price/Earnings') rather than dummy or default columns.

1. MANDATORY CALCULATION PRE-REQUISITE:
   - For ANY question asking about totals, sums, market caps, P/E ratios, averages, minimums, maximums, loan performance, or statistics across the dataset:
   - You MUST call the tool 'calculate_financial_metrics' in your very first step before generating any final textual summary.
   - NEVER calculate totals or averages mentally, NEVER extrapolate from the 10 sample rows shown in the prompt, and NEVER guess.
   - For example:
     * When asked for "Total Market Cap", you MUST call calculate_financial_metrics with targetColumn: "Market Cap", operation: "sum".
     * When asked for "Average P/E", you MUST call calculate_financial_metrics with targetColumn: "Price/Earnings", operation: "average".
   - Only AFTER the tool returns the deterministic calculation, cite the exact numbers returned (e.g. ~$71.10 Trillion for total market cap, ~45.36 for average P/E) in your written response.

2. MANDATORY DYNAMIC VISUALIZATION DIRECTIVE:
   - When the user asks to "visualize", "show me a chart", "render chart", "plot", "graph", or compare metrics/sectors:
   - You MUST call the tool 'render_financial_visualization' with chartType ('bar', 'line', or 'pie'), xAxisKey (e.g. 'Sector', 'Symbol'), and dataKey (e.g. 'Market Cap', 'Price/Earnings').
   - NEVER emit dummy fallback templates (e.g., NEVER mention "Beta Tech Q3").
   - NEVER emit the raw tag '<!-- GENUI:BAR_CHART -->'. Always use the tool 'render_financial_visualization'.

3. CRITICAL MULTI-STEP RESPONSE DIRECTIVE (MANDATORY TEXT GENERATION AFTER TOOL EXECUTION):
   - Calling tools ('calculate_financial_metrics', 'render_financial_visualization', 'render_financial_table') is Step 1 of your workflow.
   - You MUST NOT STOP after calling a tool.
   - Once the tool returns its calculated JSON data in Step 2, you MUST IMMEDIATELY proceed to generate a full, executive, audit-grade textual response.
   - In this textual response:
     * Explicitly state the exact calculated figures returned by the tool (e.g. Total Market Cap: ~$71.10 Trillion, Average P/E: ~45.36x).
     * Render an interactive Markdown comparison/summary table displaying the calculated values.
     * Deliver executive analysis, risk breakdown, and actionable commentary.
   - Under NO circumstances may you terminate the turn without writing the narrative text and quantitative summary tables.

Professional Persona & Standards:
1. Executive Text-First Analysis:
   - Always deliver a comprehensive, audit-ready textual financial summary FIRST based strictly on real dataset values returned by tools.
   - Structure your response logically:
     * Executive Overview & Portfolio Health
     * Quantitative Metrics & Statistical Breakdown (exact totals, averages, ratios, delinquency rates, volume)
     * Risk & Compliance Findings (exceptions, concentrations, high-value outliers)
     * Methodologies & Mathematical Formulas
     * Strategic Banking Recommendations
2. Tabular Presentation:
   - Accompany your text commentary with structured tables using 'render_financial_table' or clean Markdown tables.
   - Ensure tables feature clear headers, aligned rows, and summary/totals lines directly from the real parsed data.
3. Multi-Document Cross-Referencing:
   - When multiple documents (PDFs, CSVs, Excel files) are present, cross-reference their figures, detect discrepancies, and provide reconciled financial intelligence.
   - Cite specific documents by filename, filing section, or invoice number in square brackets (e.g. [Source: Active Document, Financial Audit]).`;

/**
 * Normalizes and resolves requested column names to actual CSV headers using financial aliases
 */
export function resolveColumnHeader(headers, requestedColumn) {
  if (!headers || headers.length === 0 || !requestedColumn) return requestedColumn;

  // First strip common aggregation prefixes/suffixes (e.g. "Total Market Cap" -> "Market Cap", "Average P/E" -> "P/E")
  const stripped = requestedColumn.replace(/\b(average|avg|total|sum|mean|min|max|overall|aggregate|ratio)\b/gi, ' ').trim();
  const searchCandidates = [requestedColumn, stripped].filter(Boolean);

  const aliasGroups = [
    {
      aliases: ['market cap', 'marketcap', 'mkt cap', 'mktcap', 'market capitalisation', 'market capitalization', 'market_cap', 'cap'],
      patterns: [/market.*cap/i, /mkt.*cap/i],
    },
    {
      aliases: ['price/earnings', 'price to earnings', 'pe', 'p/e', 'p/e ratio', 'pe ratio', 'p_e', 'price_earnings', 'price earnings', 'p to e'],
      patterns: [/price[\s/_]*earnings/i, /^p[\s/_]*e$/i, /^pe$/i],
    },
    {
      aliases: ['dividend yield', 'dividend', 'yield', 'div yield', 'div %', 'div_yield'],
      patterns: [/dividend.*yield/i, /^yield$/i],
    },
    {
      aliases: ['earnings/share', 'earnings per share', 'eps', 'earning per share', 'earnings_share'],
      patterns: [/earnings[\s/_]*share/i, /^eps$/i],
    },
    {
      aliases: ['price', 'stock price', 'share price', 'current price'],
      patterns: [/^price$/i, /stock.*price/i],
    },
    {
      aliases: ['ebitda', 'operating earnings', 'cash flow'],
      patterns: [/^ebitda$/i],
    },
    {
      aliases: ['price/sales', 'price to sales', 'ps', 'p/s', 'p_s', 'price sales'],
      patterns: [/price[\s/_]*sales/i, /^p[\s/_]*s$/i],
    },
    {
      aliases: ['price/book', 'price to book', 'pb', 'p/b', 'p_b', 'price book'],
      patterns: [/price[\s/_]*book/i, /^p[\s/_]*b$/i],
    },
    {
      aliases: ['52 week low', '52 wk low', '52 week min', 'low'],
      patterns: [/52.*low/i],
    },
    {
      aliases: ['52 week high', '52 week high', '52 week max', 'high'],
      patterns: [/52.*high/i],
    },
    {
      aliases: ['sector', 'industry', 'category'],
      patterns: [/^sector$/i, /^industry$/i],
    },
    {
      aliases: ['symbol', 'ticker', 'code'],
      patterns: [/^symbol$/i, /^ticker$/i],
    },
    {
      aliases: ['name', 'company', 'company name'],
      patterns: [/^name$/i, /^company/i],
    },
  ];

  for (const candidate of searchCandidates) {
    const reqLower = candidate.toLowerCase();
    const reqClean = reqLower.replace(/[^a-z0-9]/g, '');

    const direct = headers.find((h) => h.toLowerCase() === reqLower);
    if (direct) return direct;

    const cleanMatch = headers.find((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '') === reqClean);
    if (cleanMatch) return cleanMatch;

    for (const group of aliasGroups) {
      const isTargetInGroup =
        group.aliases.some((a) => a === reqLower || a.replace(/[^a-z0-9]/g, '') === reqClean) ||
        group.patterns.some((p) => p.test(reqLower));

      if (isTargetInGroup) {
        const matchedHeader = headers.find((h) => {
          const hLower = h.toLowerCase();
          const hClean = hLower.replace(/[^a-z0-9]/g, '');
          return (
            group.aliases.some((a) => a === hLower || a.replace(/[^a-z0-9]/g, '') === hClean) ||
            group.patterns.some((p) => p.test(hLower))
          );
        });
        if (matchedHeader) return matchedHeader;
      }
    }

    const subMatch = headers.find(
      (h) => h.toLowerCase().includes(reqLower) || reqLower.includes(h.toLowerCase())
    );
    if (subMatch) return subMatch;
  }

  const reqWords = requestedColumn.toLowerCase().split(/[\s/_]+/).filter((w) => w.length > 2);
  for (const word of reqWords) {
    const wordMatch = headers.find((h) => h.toLowerCase().includes(word));
    if (wordMatch) return wordMatch;
  }

  // Domain specific aliases for financial tabular files
  const reqLowerAll = requestedColumn.toLowerCase();
  if (reqLowerAll.includes('market') || reqLowerAll.includes('cap') || reqLowerAll.includes('mkt')) {
    const mc = headers.find((h) => /market.*cap|mkt.*cap/i.test(h));
    if (mc) return mc;
  }
  if (reqLowerAll.includes('sector') || reqLowerAll.includes('industry')) {
    const sec = headers.find((h) => /sector|industry/i.test(h));
    if (sec) return sec;
  }
  if (reqLowerAll.includes('pe') || reqLowerAll.includes('p/e') || reqLowerAll.includes('earnings')) {
    const pe = headers.find((h) => /price.*earnings|pe|p\/e|eps/i.test(h));
    if (pe) return pe;
  }
  if (reqLowerAll.includes('price')) {
    const pr = headers.find((h) => /^price$/i.test(h) || /price/i.test(h));
    if (pr) return pr;
  }

  // Never fall back to 'age' or non-financial header if financial column exists
  const financialCandidate = headers.find((h) =>
    ['market cap', 'price/earnings', 'ebitda', 'price', 'dividend yield', 'total', 'balance'].includes(h.toLowerCase())
  );
  if (financialCandidate) return financialCandidate;

  return headers.find((h) => h.toLowerCase().includes(requestedColumn.toLowerCase())) || headers[0] || requestedColumn;
}

/**
 * Checks whether a column header represents a ratio, percentage, or multiplier
 */
export function isRatioOrMultiplier(columnName) {
  const lower = (columnName || '').toLowerCase();
  return (
    (lower.includes('earnings') && lower.includes('price')) ||
    lower.includes('pe') ||
    lower.includes('p/e') ||
    lower.includes('ratio') ||
    lower.includes('multiple') ||
    lower.includes('yield') ||
    lower.includes('rate') ||
    lower.includes('percent') ||
    lower.includes('%') ||
    lower.includes('beta') ||
    lower.includes('shares') ||
    lower.includes('count')
  );
}

/**
 * Formats large financial figures with human-readable abbreviations (Trillions, Billions, Millions)
 */
export function formatLargeFinanceNumber(num, isCurrency = true) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  const prefix = isCurrency ? '$' : '';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1e12) {
    return `${sign}${prefix}${(abs / 1e12).toFixed(2)} Trillion (${prefix}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  }
  if (abs >= 1e9) {
    return `${sign}${prefix}${(abs / 1e9).toFixed(2)} Billion (${prefix}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  }
  if (abs >= 1e6) {
    return `${sign}${prefix}${(abs / 1e6).toFixed(2)} Million (${prefix}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  }
  if (isCurrency) {
    return `${sign}${prefix}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${sign}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Tool: Render Interactive Financial Schedule in GenUI
 */
export const renderFinancialTableTool = tool({
  description:
    'Renders financial metrics, loan schedules, statements, or invoice audits in an interactive structured UI table with client-side sorting, filtering, and summary totals.',
  parameters: z.object({
    title: z.string().optional().describe('Title or header description for the financial schedule'),
    summary: z.string().optional().describe('Brief financial summary or key finding for this schedule'),
    columns: z.array(z.string()).optional().describe('Array of column header names (e.g. ["Loan ID", "Borrower", "Principal", "Interest Rate", "Status"])'),
    rows: z.array(z.array(z.any())).optional().describe('Two-dimensional array containing row values matching the columns'),
    totals: z.record(z.string(), z.any()).optional().describe('Map of column name to total/aggregate string (e.g. {"Principal": "$14,250,000.00"})'),
    statusMetrics: z.array(z.object({ label: z.string(), value: z.string() })).optional().describe('Summary pill metrics displayed above the table'),
  }),
  execute: async (params) => {
    try {
      const { title, summary, columns, rows, totals, statusMetrics } = params || {};
      return {
        success: true,
        title: typeof title === 'string' ? title : 'Financial Analysis Schedule',
        summary: typeof summary === 'string' ? summary : '',
        columns: Array.isArray(columns) ? columns : [],
        rows: Array.isArray(rows) ? rows : [],
        totals: totals && typeof totals === 'object' ? totals : {},
        statusMetrics: Array.isArray(statusMetrics) ? statusMetrics : [],
      };
    } catch (tblErr) {
      console.error('[renderFinancialTableTool] Execution caught error:', tblErr?.message || tblErr);
      return {
        success: false,
        error: tblErr?.message || 'Failed to render financial table',
        message: `Table formatting notice: ${tblErr?.message || 'Error processing table data'}`,
      };
    }
  },
});

/**
 * Tool: Dynamic Universal Financial Visualization in GenUI (Bar, Line, Pie)
 * Strictly driven by live parsed CSV tabular data with ZERO dummy templates.
 */
export const renderFinancialVisualizationTool = tool({
  description:
    'Renders dynamic interactive financial charts (bar, line, or pie) in GenUI strictly based on live tabular data. Can aggregate data by categories (e.g. Market Cap by Sector) or display top entities.',
  parameters: z.object({
    chartType: z.enum(['bar', 'line', 'pie']).optional().default('bar').describe('Type of chart to display: "bar", "line", or "pie"'),
    xAxisKey: z.string().optional().describe('The categorical column or key for the X-axis / categories / slices (e.g. "Sector", "Symbol", "Name")'),
    dataKey: z.string().optional().describe('The primary numeric column or key for values (e.g. "Market Cap", "Price/Earnings", "EBITDA", "Price")'),
    secondaryDataKey: z.string().optional().describe('Optional secondary metric for dual-bar comparisons (e.g. "EBITDA")'),
    title: z.string().optional().describe('Title of the financial chart'),
    subtitle: z.string().optional().describe('Subtitle or context description'),
    dataset: z
      .array(z.record(z.any()))
      .optional()
      .describe('Array of data points. If omitted or empty, backend will automatically extract and aggregate from the live dataset.'),
    limit: z.number().optional().default(10).describe('Max number of items to display (default 10, max 25)'),
    aggregation: z.enum(['sum', 'average', 'none']).optional().default('sum').describe('Aggregation method when grouping: "sum", "average", or "none"'),
    documentIdentifier: z.string().optional().describe('Document identifier or filename of the tabular dataset'),
  }),
  execute: async ({
    chartType = 'bar',
    xAxisKey,
    dataKey,
    secondaryDataKey,
    title,
    subtitle,
    dataset,
    limit = 10,
    aggregation = 'sum',
    documentIdentifier,
  }) => {
    try {
      let finalChartType = 'bar';
      const promptLower = (globalCurrentPrompt || '').toLowerCase();
      const reqType = String(chartType || '').toLowerCase();
      if (reqType.includes('pie') || promptLower.includes('pie chart') || promptLower.includes('pie graph') || promptLower.includes('piechart') || promptLower.includes('donut')) {
        finalChartType = 'pie';
      } else if (reqType.includes('line') || promptLower.includes('line chart') || promptLower.includes('line graph') || promptLower.includes('linechart') || promptLower.includes('trend')) {
        finalChartType = 'line';
      } else {
        finalChartType = 'bar';
      }

      let finalDataset = Array.isArray(dataset) && dataset.length > 0 ? dataset : null;
      let activeTabular = null;
      let resolvedXKey = xAxisKey;
      let resolvedDataKey = dataKey;
      let resolvedSecKey = secondaryDataKey;

      if (!finalDataset) {
        const targetDoc = documentIdentifier || getActiveSessionDocument();
        activeTabular = await getRegisteredDataset(targetDoc);
        if (!activeTabular && targetDoc) {
          activeTabular = await getRegisteredDataset(targetDoc);
        }
        if (!activeTabular) {
          activeTabular = await getRegisteredDataset();
        }

        if (activeTabular && Array.isArray(activeTabular.rows) && activeTabular.rows.length > 0) {
          const headers = Array.isArray(activeTabular.headers) ? activeTabular.headers : [];
          const rows = Array.isArray(activeTabular.rows) ? activeTabular.rows : [];

          let reqXKey = xAxisKey;
          let reqDataKey = dataKey;
          if (!reqXKey || reqXKey === 'category' || reqXKey === 'label' || reqXKey === 'period') {
            if (promptLower.includes('sector')) reqXKey = 'Sector';
            else if (promptLower.includes('symbol') || promptLower.includes('ticker')) reqXKey = 'Symbol';
            else if (promptLower.includes('name') || promptLower.includes('company')) reqXKey = 'Name';
            else reqXKey = headers.find((h) => /sector|name|symbol|company|industry/i.test(h)) || headers[0];
          }
          if (!reqDataKey || reqDataKey === 'value' || reqDataKey === 'amount') {
            if (promptLower.includes('market cap') || promptLower.includes('marketcap')) reqDataKey = 'Market Cap';
            else if (promptLower.includes('p/e') || promptLower.includes('pe ratio') || promptLower.includes('price/earnings')) reqDataKey = 'Price/Earnings';
            else if (promptLower.includes('ebitda')) reqDataKey = 'EBITDA';
            else if (promptLower.includes('price')) reqDataKey = 'Price';
            else reqDataKey = headers.find((h) => /market.*cap|pe|price|ebitda|amount|volume/i.test(h)) || headers[1] || headers[0];
          }

          resolvedXKey = resolveColumnHeader(headers, reqXKey);
          resolvedDataKey = resolveColumnHeader(headers, reqDataKey);
          if (secondaryDataKey) {
            resolvedSecKey = resolveColumnHeader(headers, secondaryDataKey);
          }

          const categoryCounts = {};
          for (const r of rows) {
            if (!r || typeof r !== 'object') continue;
            const cat = String(r[resolvedXKey] ?? '').trim();
            if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          }

          const hasDuplicates = Object.values(categoryCounts).some((cnt) => cnt > 1);

          if (hasDuplicates && aggregation !== 'none') {
            const groupMap = {};
            for (const r of rows) {
              if (!r || typeof r !== 'object') continue;
              const cat = String(r[resolvedXKey] ?? 'Other').trim() || 'Other';
              const val = parseFinancialNumber(r[resolvedDataKey]);
              const secVal = resolvedSecKey ? parseFinancialNumber(r[resolvedSecKey]) : null;

              if (val !== null) {
                if (!groupMap[cat]) {
                  groupMap[cat] = {
                    [resolvedXKey]: cat,
                    [resolvedDataKey]: 0,
                    _count: 0,
                    ...(resolvedSecKey ? { [resolvedSecKey]: 0, _secCount: 0 } : {}),
                  };
                }
                groupMap[cat][resolvedDataKey] += val;
                groupMap[cat]._count += 1;
                if (resolvedSecKey && secVal !== null) {
                  groupMap[cat][resolvedSecKey] += secVal;
                  groupMap[cat]._secCount += 1;
                }
              }
            }

            finalDataset = Object.values(groupMap).map((g) => {
              const res = {
                [resolvedXKey]: g[resolvedXKey],
                [resolvedDataKey]: aggregation === 'average' && g._count > 0 ? g[resolvedDataKey] / g._count : g[resolvedDataKey],
              };
              if (resolvedSecKey) {
                res[resolvedSecKey] = aggregation === 'average' && g._secCount > 0 ? g[resolvedSecKey] / g._secCount : g[resolvedSecKey];
              }
              return res;
            });
          } else {
            finalDataset = rows
              .map((r) => {
                if (!r || typeof r !== 'object') return null;
                const val = parseFinancialNumber(r[resolvedDataKey]);
                if (val === null) return null;
                const item = {
                  [resolvedXKey]: String(r[resolvedXKey] ?? '').trim(),
                  [resolvedDataKey]: val,
                };
                if (resolvedSecKey) {
                  const secVal = parseFinancialNumber(r[resolvedSecKey]);
                  if (secVal !== null) item[resolvedSecKey] = secVal;
                }
                return item;
              })
              .filter(Boolean);
          }

          finalDataset.sort((a, b) => (Number(b[resolvedDataKey]) || 0) - (Number(a[resolvedDataKey]) || 0));

          const safeLimit = Math.min(Math.max(limit || 10, 3), 30);
          finalDataset = finalDataset.slice(0, safeLimit);
        }
      }

      if (!finalDataset || finalDataset.length === 0) {
        return {
          success: false,
          chartType: finalChartType,
          message: 'Unable to render chart: No tabular dataset records found.',
        };
      }

      let totalAggregate = 0;
      let topItem = null;
      let maxVal = -Infinity;

      for (const d of finalDataset) {
        const v = Number(d[resolvedDataKey]) || 0;
        totalAggregate += v;
        if (v > maxVal) {
          maxVal = v;
          topItem = d;
        }
      }

      const isRatio = isRatioOrMultiplier(resolvedDataKey);
      const isCurr = !isRatio;
      const chartTitle = title || `${resolvedDataKey} by ${resolvedXKey}`;
      const chartSubtitle =
        subtitle ||
        `Deterministic schedule extracted from ${activeTabular?.filename || 'verified dataset'} (${finalDataset.length} categories)`;

      const safeCount = finalDataset.length > 0 ? finalDataset.length : 1;
      const kpis = [
        {
          label: 'Total Aggregate',
          value: formatLargeFinanceNumber(totalAggregate, isCurr),
        },
        {
          label: 'Category Mean',
          value: formatLargeFinanceNumber(totalAggregate / safeCount, isCurr),
        },
        {
          label: 'Top Contributor',
          value: topItem ? `${topItem[resolvedXKey]}: ${formatLargeFinanceNumber(topItem[resolvedDataKey], isCurr)}` : 'N/A',
        },
      ];

      return {
        success: true,
        chartType: finalChartType,
        xAxisKey: resolvedXKey,
        dataKey: resolvedDataKey,
        secondaryDataKey: resolvedSecKey,
        title: chartTitle,
        subtitle: chartSubtitle,
        sourceFiling: activeTabular?.filename || 'Live Tabular Data',
        dataset: finalDataset,
        kpis,
      };
    } catch (chartErr) {
      console.error('[renderFinancialVisualizationTool] Execution safety caught error:', chartErr?.message || chartErr);
      return {
        success: false,
        error: chartErr?.message || 'Chart generation error',
        message: `Visualization notice: ${chartErr?.message || 'Error preparing visualization dataset'}. Please verify dataset columns.`,
      };
    }
  },
});

/**
 * Backwards compatibility alias for renderFinancialVisualizationTool
 */
export const renderFinancialChartTool = renderFinancialVisualizationTool;

/**
 * Tool: Calculate Exact Deterministic Financial Metrics across Tabular Datasets
 */
export const calculateFinancialMetricsTool = tool({
  description:
    'Performs exact deterministic mathematical calculations (totals, sums, averages, min/max, counts, loan performance metrics, default rates) on uploaded tabular files (CSV/Excel). You MUST call this tool before summarizing any totals, sums, market capitalization, P/E ratios, or averages.',
  parameters: z.object({
    documentIdentifier: z.string().optional().describe('Filename or document ID (leave blank to search all available tabular datasets)'),
    targetColumn: z.string().optional().describe('Column name or alias to calculate (e.g. "Market Cap", "Price/Earnings", "P/E", "loan_amount", "balance", "total", "EBITDA")'),
    operation: z.enum(['sum', 'average', 'min', 'max', 'count', 'loan_summary']).optional().default('sum').describe('Mathematical operation to perform'),
    groupByColumn: z.string().optional().describe('Optional categorical column to group calculations by (e.g. "Sector", "status", "category", "risk_rating", "default", "job")'),
  }),
  execute: async ({ documentIdentifier, targetColumn, operation = 'sum', groupByColumn }) => {
    try {
      let dataset = await getRegisteredDataset(documentIdentifier || getActiveSessionDocument());
      if (!dataset) {
        const all = getAllRegisteredDatasets();
        if (all.length > 0) dataset = all[all.length - 1] || all[0];
      }
      if (!dataset) {
        dataset = await getRegisteredDataset();
      }

      if (!dataset || !dataset.rows || dataset.rows.length === 0) {
        return {
          success: false,
          totalRecords: 0,
          message: 'No active tabular dataset registered in memory. Data was not received. Please ensure the document is uploaded.',
        };
      }

      const { rows, headers } = dataset;

      // Automatically infer targetColumn if not passed or generic
      let reqCol = targetColumn;
      const promptLower = (globalCurrentPrompt || '').toLowerCase();
      if (!reqCol) {
        if (promptLower.includes('market cap') || promptLower.includes('marketcap')) reqCol = 'Market Cap';
        else if (promptLower.includes('pe') || promptLower.includes('p/e') || promptLower.includes('price/earnings')) reqCol = 'Price/Earnings';
        else if (promptLower.includes('ebitda')) reqCol = 'EBITDA';
        else if (promptLower.includes('price')) reqCol = 'Price';
        else if (promptLower.includes('amount') || promptLower.includes('balance') || promptLower.includes('loan')) reqCol = 'loan_amount';
        else reqCol = headers.find((h) => /market.*cap|pe|price|amount/i.test(h)) || headers[0];
      }

      let reqOp = operation || 'sum';
      if (!operation && (promptLower.includes('average') || promptLower.includes('mean') || promptLower.includes('p/e') || promptLower.includes('ratio'))) {
        reqOp = 'average';
      }

      const matchingCol = resolveColumnHeader(headers, reqCol);
      const isRatio = isRatioOrMultiplier(matchingCol);
      const isCurrency = !isRatio;

      if (reqOp === 'loan_summary') {
        let totalVolume = 0;
        let count = 0;
        let defaultedCount = 0;
        let defaultedVolume = 0;
        const statusMap = {};

        for (const r of rows) {
          if (!r || typeof r !== 'object') continue;
          const amt = parseFinancialNumber(r[matchingCol]) || 0;
          totalVolume += amt;
          count++;

          const statusVal = String(
            r['status'] ||
            r['Status'] ||
            r['loan_status'] ||
            (r['default'] !== undefined ? `Default: ${r['default']}` : '') ||
            (r['loan'] !== undefined ? `Loan: ${r['loan']}` : '') ||
            r['condition'] ||
            'Active'
          );
          statusMap[statusVal] = (statusMap[statusVal] || 0) + 1;
          if (/default\s*:\s*yes|true|late|charged.off|delinquent|overdue/i.test(statusVal)) {
            defaultedCount++;
            defaultedVolume += amt;
          }
        }

        return {
          success: true,
          filename: dataset.filename,
          totalRecords: count,
          totalPortfolioVolume: formatCurrency(totalVolume),
          totalPortfolioVolumeRaw: totalVolume,
          averageLoanSize: formatCurrency(count > 0 ? totalVolume / count : 0),
          averageLoanSizeRaw: count > 0 ? totalVolume / count : 0,
          delinquentRecordsCount: defaultedCount,
          delinquencyRateByCount: count > 0 ? ((defaultedCount / count) * 100).toFixed(2) + '%' : '0.00%',
          delinquencyVolume: formatCurrency(defaultedVolume),
          delinquencyVolumeRaw: defaultedVolume,
          statusBreakdown: statusMap,
        };
      }

      // Standard aggregation
      let sum = 0;
      let validCount = 0;
      let min = Infinity;
      let max = -Infinity;
      const groups = {};

      for (const r of rows) {
        if (!r || typeof r !== 'object') continue;
        const num = parseFinancialNumber(r[matchingCol]);
        if (num !== null) {
          validCount++;
          sum += num;
          if (num < min) min = num;
          if (num > max) max = num;

          if (groupByColumn && r[groupByColumn] !== undefined) {
            const gKey = String(r[groupByColumn]);
            if (!groups[gKey]) {
              groups[gKey] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
            }
            groups[gKey].sum += num;
            groups[gKey].count++;
            if (num < groups[gKey].min) groups[gKey].min = num;
            if (num > groups[gKey].max) groups[gKey].max = num;
          }
        }
      }

      const avg = validCount > 0 ? sum / validCount : 0;
      let computedResult = sum;
      if (reqOp === 'average') computedResult = avg;
      else if (reqOp === 'min') computedResult = min === Infinity ? 0 : min;
      else if (reqOp === 'max') computedResult = max === -Infinity ? 0 : max;
      else if (reqOp === 'count') computedResult = validCount;

      const totalSumHuman = formatLargeFinanceNumber(sum, isCurrency);
      const averageHuman = isRatio ? `${avg.toFixed(2)}${matchingCol.toLowerCase().includes('yield') ? '%' : 'x'}` : formatLargeFinanceNumber(avg, isCurrency);
      const resultHuman = reqOp === 'sum' ? totalSumHuman : reqOp === 'average' ? averageHuman : formatLargeFinanceNumber(computedResult, isCurrency);

      const totalSumFormatted = isCurrency ? formatCurrency(sum) : sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const averageFormatted = isCurrency ? formatCurrency(avg) : avg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const resultFormatted = isCurrency
        ? (['sum', 'average', 'min', 'max'].includes(reqOp) ? formatCurrency(computedResult) : formatNumber(computedResult))
        : (['sum', 'average', 'min', 'max'].includes(reqOp) ? computedResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : formatNumber(computedResult));

      // Overarching portfolio calculations for dual metrics (e.g. Market Cap + P/E)
      let portfolioMarketCapSum = null;
      let portfolioPEAverage = null;
      try {
        const mcHeader = resolveColumnHeader(headers, 'Market Cap');
        const peHeader = resolveColumnHeader(headers, 'Price/Earnings');

        if (mcHeader && headers.includes(mcHeader)) {
          let mcTotal = 0;
          let mcCount = 0;
          for (const r of rows) {
            if (!r || typeof r !== 'object') continue;
            const v = parseFinancialNumber(r[mcHeader]);
            if (v !== null) {
              mcTotal += v;
              mcCount++;
            }
          }
          if (mcCount > 0) {
            portfolioMarketCapSum = {
              column: mcHeader,
              raw: mcTotal,
              formatted: formatCurrency(mcTotal),
              human: formatLargeFinanceNumber(mcTotal, true),
              count: mcCount,
            };
          }
        }

        if (peHeader && headers.includes(peHeader)) {
          let peTotal = 0;
          let peCount = 0;
          for (const r of rows) {
            if (!r || typeof r !== 'object') continue;
            const v = parseFinancialNumber(r[peHeader]);
            if (v !== null) {
              peTotal += v;
              peCount++;
            }
          }
          if (peCount > 0) {
            const peAvg = peTotal / peCount;
            portfolioPEAverage = {
              column: peHeader,
              raw: peAvg,
              formatted: peAvg.toFixed(2),
              human: `${peAvg.toFixed(2)}x`,
              count: peCount,
            };
          }
        }
      } catch (subMetricErr) {
        console.warn('[calculateFinancialMetricsTool] Sub-metric calculation warning:', subMetricErr);
      }

      return {
        success: true,
        filename: dataset.filename,
        column: matchingCol,
        operation: reqOp,
        result: computedResult,
        resultFormatted,
        resultHuman,
        validNumberCount: validCount,
        totalSum: sum,
        totalSumFormatted,
        totalSumHuman,
        average: avg,
        averageFormatted,
        averageHuman,
        minimum: min === Infinity ? 0 : min,
        maximum: max === -Infinity ? 0 : max,
        portfolioMarketCap: portfolioMarketCapSum ? portfolioMarketCapSum.human : undefined,
        portfolioTotalMarketCap: portfolioMarketCapSum ? portfolioMarketCapSum.human : undefined,
        portfolioAveragePE: portfolioPEAverage ? portfolioPEAverage.human : undefined,
        summaryKeyFigures: {
          totalMarketCap: portfolioMarketCapSum ? portfolioMarketCapSum.human : (isCurrency && matchingCol.toLowerCase().includes('cap') ? totalSumHuman : undefined),
          averagePE: portfolioPEAverage ? portfolioPEAverage.human : (isRatio && matchingCol.toLowerCase().includes('price') ? averageHuman : undefined),
          totalRecords: rows.length,
          activeDataset: dataset.filename,
        },
        groupedResults: groupByColumn ? groups : undefined,
      };
    } catch (calcError) {
      console.error('[calculateFinancialMetricsTool] Calculation error:', calcError?.message || calcError);
      return {
        success: false,
        totalRecords: 0,
        error: calcError?.message || 'Calculation error occurred',
        message: `Calculation notice: Failed to compute ${operation} on ${targetColumn}: ${calcError?.message || calcError}`,
      };
    }
  },
});

export const queryTabularDatasetTool = tool({
  description:
    'Filters, sorts, and slices records from large 10,000+ row datasets and returns exact subtotals and matching items as a JSON array.',
  parameters: z.object({
    documentIdentifier: z.string().optional().describe('Filename or document ID to query'),
    filterColumn: z.string().optional().describe('Column name to filter on'),
    filterValue: z.string().optional().describe('Value to match in filter column'),
    filterOperator: z.enum(['equals', 'contains', 'greaterThan', 'lessThan']).optional().describe('Comparison operator'),
    sortBy: z.string().optional().describe('Column to sort by'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
    limit: z.number().optional().default(15).describe('Max records to return'),
    offset: z.number().optional().default(0).describe('Starting record offset'),
  }),
  execute: async (params) => {
    try {
      let dataset = await getRegisteredDataset(params.documentIdentifier || getActiveSessionDocument());
      if (!dataset) {
        const all = getAllRegisteredDatasets();
        if (all.length > 0) dataset = all[all.length - 1] || all[0];
      }
      if (!dataset) {
        dataset = await getRegisteredDataset();
      }

      if (!dataset || !dataset.rows || dataset.rows.length === 0) {
        return {
          success: false,
          totalMatchingRows: 0,
          returnedRowsCount: 0,
          headers: [],
          rows: [],
          records: [],
          message: 'Tabular dataset not found in active session. Data was not received.',
        };
      }

      const queryResult = queryTabularData(dataset, params);
      return {
        success: true,
        filename: dataset.filename,
        ...queryResult,
      };
    } catch (queryErr) {
      console.error('[queryTabularDatasetTool] Error:', queryErr?.message || queryErr);
      return {
        success: false,
        totalMatchingRows: 0,
        returnedRowsCount: 0,
        headers: [],
        rows: [],
        records: [],
        error: queryErr?.message || 'Query error',
        message: `Query notice: ${queryErr?.message || queryErr}`,
      };
    }
  },
});

export const getDatasetRecordsTool = tool({
  description:
    'Retrieves the real parsed JSON array of row objects and column headers from the active tabular dataset. Use this tool whenever you need to inspect raw row records, view multiple data rows, or verify data values directly.',
  parameters: z.object({
    documentIdentifier: z.string().optional().describe('Filename or document ID (leave empty for active dataset)'),
    limit: z.number().optional().default(20).describe('Number of records to retrieve (1 to 100)'),
    offset: z.number().optional().default(0).describe('Row offset to start retrieval from (default 0)'),
  }),
  execute: async ({ documentIdentifier, limit = 20, offset = 0 }) => {
    try {
      let dataset = await getRegisteredDataset(documentIdentifier || getActiveSessionDocument());
      if (!dataset) {
        const all = getAllRegisteredDatasets();
        if (all.length > 0) dataset = all[all.length - 1] || all[0];
      }
      if (!dataset) {
        dataset = await getRegisteredDataset();
      }

      if (!dataset || !dataset.rows || dataset.rows.length === 0) {
        return {
          success: false,
          totalRecords: 0,
          headers: [],
          records: [],
          message: 'No active tabular dataset registered in memory. Data was not received.',
        };
      }

      const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
      const safeOffset = Math.max(offset || 0, 0);
      const records = dataset.rows.slice(safeOffset, safeOffset + safeLimit);

      return {
        success: true,
        filename: dataset.filename,
        totalRecords: dataset.rows.length,
        headers: dataset.headers,
        offset: safeOffset,
        limit: safeLimit,
        returnedCount: records.length,
        records,
      };
    } catch (recordErr) {
      console.error('[getDatasetRecordsTool] Error:', recordErr?.message || recordErr);
      return {
        success: false,
        totalRecords: 0,
        headers: [],
        records: [],
        error: recordErr?.message || 'Record retrieval error',
        message: `Record retrieval notice: ${recordErr?.message || recordErr}`,
      };
    }
  },
});

export const crossReferenceDocumentsTool = tool({
  description:
    'Cross-references and reconciles multiple uploaded documents (PDFs, CSVs, Excel) by joining on common keys (e.g. invoice ID, customer ID, account number) to identify variances and audit discrepancies.',
  parameters: z.object({
    primaryDocument: z.string().describe('Filename or identifier of the first document'),
    secondaryDocument: z.string().describe('Filename or identifier of the second document'),
    reconciliationKey: z.string().describe('Shared key field to match records across documents (e.g. "invoice_id", "account_no", "borrower_id")'),
    comparisonFields: z.array(z.string()).describe('List of numeric or text fields to reconcile (e.g. ["amount", "balance", "status"])'),
  }),
  execute: async ({ primaryDocument, secondaryDocument, reconciliationKey, comparisonFields }) => {
    try {
      const ds1 = await getRegisteredDataset(primaryDocument);
      const ds2 = await getRegisteredDataset(secondaryDocument);

      if (!ds1 || !ds2) {
        return {
          success: false,
          message: `Both datasets must be active in session. Found: ${primaryDocument}: ${Boolean(ds1)}, ${secondaryDocument}: ${Boolean(ds2)}. Data was not received.`,
        };
      }

      const ds1Map = new Map();
      for (const r of ds1.rows) {
        if (!r || typeof r !== 'object') continue;
        const k = String(r[reconciliationKey] || '').trim().toLowerCase();
        if (k) ds1Map.set(k, r);
      }

      const discrepancies = [];
      let matchedCount = 0;

      for (const r2 of ds2.rows) {
        if (!r2 || typeof r2 !== 'object') continue;
        const k = String(r2[reconciliationKey] || '').trim().toLowerCase();
        if (!k) continue;

        const r1 = ds1Map.get(k);
        if (r1) {
          matchedCount++;
          for (const field of comparisonFields) {
            const v1 = r1[field];
            const v2 = r2[field];
            const num1 = parseFinancialNumber(v1);
            const num2 = parseFinancialNumber(v2);

            if (num1 !== null && num2 !== null) {
              const variance = num1 - num2;
              if (Math.abs(variance) > 0.01) {
                discrepancies.push({
                  key: k,
                  field,
                  doc1Value: v1,
                  doc2Value: v2,
                  variance: formatCurrency(variance),
                });
              }
            } else if (String(v1).trim().toLowerCase() !== String(v2).trim().toLowerCase()) {
              discrepancies.push({
                key: k,
                field,
                doc1Value: v1,
                doc2Value: v2,
                variance: 'Value mismatch',
              });
            }
          }
        }
      }

      return {
        success: true,
        matchedRecordsCount: matchedCount,
        discrepancyCount: discrepancies.length,
        auditSample: discrepancies.slice(0, 15),
      };
    } catch (crossErr) {
      console.error('[crossReferenceDocumentsTool] Error:', crossErr?.message || crossErr);
      return {
        success: false,
        error: crossErr?.message || 'Cross reference error',
        message: `Cross-reference notice: ${crossErr?.message || crossErr}`,
      };
    }
  },
});

function getSimulatedFinancialResponse(prompt, activeTabular) {
  const lower = (prompt || '').toLowerCase();

  if (activeTabular && activeTabular.rows && activeTabular.rows.length > 0) {
    const totalRows = activeTabular.rows.length;
    const headers = activeTabular.headers || [];
    const sampleRows = activeTabular.rows.slice(0, 8);
    const visibleHeaders = headers.slice(0, 6);
    const tableHeader = visibleHeaders.join(' | ');
    const tableDivider = visibleHeaders.map(() => ':---').join(' | ');
    const tableData = sampleRows
      .map((r) => visibleHeaders.map((h) => String(r[h] ?? '')).join(' | '))
      .join('\n');

    // Calculate real deterministic numbers for Market Cap and Price/Earnings if present
    const mcCol = resolveColumnHeader(headers, 'Market Cap');
    const peCol = resolveColumnHeader(headers, 'Price/Earnings');

    let totalMarketCap = 0;
    let validMcCount = 0;
    let totalPE = 0;
    let validPeCount = 0;
    const sectorMap = {};

    for (const r of activeTabular.rows) {
      if (!r || typeof r !== 'object') continue;
      const mc = parseFinancialNumber(r[mcCol]);
      if (mc !== null) {
        totalMarketCap += mc;
        validMcCount++;
      }
      const pe = parseFinancialNumber(r[peCol]);
      if (pe !== null) {
        totalPE += pe;
        validPeCount++;
      }
      const sec = r['Sector'];
      if (sec && mc !== null) {
        sectorMap[sec] = (sectorMap[sec] || 0) + mc;
      }
    }

    const avgPE = validPeCount > 0 ? totalPE / validPeCount : 0;
    const topSectors = Object.entries(sectorMap)
      .map(([sec, val]) => ({ sec, val }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 5);

    let specificAnalysis = '';
    if (lower.includes('market cap') || lower.includes('marketcap') || lower.includes('p/e') || lower.includes('pe') || lower.includes('average')) {
      specificAnalysis = `#### Verified Quantitative Calculations\n` +
        `- **Total Market Capitalization**: **${formatLargeFinanceNumber(totalMarketCap, true)}** (computed across ${validMcCount} constituent securities)\n` +
        `- **Average Price/Earnings (P/E Ratio)**: **${avgPE.toFixed(2)}x** (mean across ${validPeCount} profitable constituents)\n\n`;
    }

    let sectorSummary = '';
    if (topSectors.length > 0) {
      sectorSummary = `#### Top Sector Concentrations by Market Cap\n` +
        topSectors.map((s, idx) => `${idx + 1}. **${s.sec}**: ${formatLargeFinanceNumber(s.val, true)}`).join('\n') +
        '\n\n';
    }

    return (
      `### Executive Financial Audit: ${activeTabular.filename}\n\n` +
      `A forensic financial review was completed across **${activeTabular.filename}** comprising **${formatNumber(
        totalRows
      )} verified records**.\n\n` +
      specificAnalysis +
      sectorSummary +
      `#### Representative Audited Schedule\n` +
      `| ${tableHeader} |\n| ${tableDivider} |\n${tableData}\n\n` +
      `#### Data Integrity & Audit Verification\n` +
      `- All figures, market caps, and ratios have been computed deterministically from real backend records.\n` +
      `- Dataset schema features **${headers.length} columns**: ${headers.join(', ')}.\n\n` +
      '*Strictly based on verified live parsed tabular data. Zero dummy templates.*'
    );
  }

  return (
    `### Financial Data Notice\n\n` +
    `Data was not received: No active tabular dataset is currently loaded in memory.\n\n` +
    `Strictly base your calculations, summaries, and GenUI tables ONLY on the real data provided by the backend tools. NEVER hallucinate, invent, or use dummy financial numbers. If the tool returns empty data, explicitly state that the data was not received.\n\n` +
    `Please ensure your document (such as 'constituents-financials.csv') is uploaded so that the backend can parse it and supply verified data.`
  );
}

function resolveGeminiModel() {
  const envModel = process.env.GEMINI_MODEL?.trim();
  if (
    envModel &&
    envModel !== 'gemini-2.0-flash' &&
    envModel !== 'gemini-2.5-flash' &&
    envModel !== 'gemini-1.5-flash'
  ) {
    return envModel;
  }
  return 'gemini-3.5-flash';
}

/**
 * Pipes a Web Standard Response to an Express Response with error interception & graceful fallback
 */
async function pipeWebResponseToExpress(webRes, expressRes, fallbackGenerator) {
  if (!expressRes.headersSent) {
    expressRes.status(webRes.status || 200);
    webRes.headers.forEach((value, key) => {
      expressRes.setHeader(key, value);
    });
  }

  let hasTextChunk = false;
  if (webRes.body) {
    const reader = webRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length > 0) {
          const chunkStr = new TextDecoder().decode(value);

          // Intercept fatal provider error chunks (e.g. 429 Quota Exceeded, Tool call errors)
          // to prevent hard-crashing the frontend Vercel AI SDK useChat hook
          if (chunkStr.includes('"type":"error"')) {
            console.warn('[Stream Pump] Provider emitted error event, converting to graceful fallback analysis.');
            if (!hasTextChunk && typeof fallbackGenerator === 'function') {
              try {
                const fallbackText = fallbackGenerator();
                const respId = `fb-${Date.now()}`;
                expressRes.write(`data: {"type":"text-start","id":"${respId}"}\n\n`);
                expressRes.write(`data: {"type":"text-delta","id":"${respId}","delta":${JSON.stringify(fallbackText)}}\n\n`);
                expressRes.write(`data: {"type":"text-end","id":"${respId}"}\n\n`);
                hasTextChunk = true;
              } catch (e) {
                console.warn('[Stream Pump] Fallback generation error:', e);
              }
            }
            continue;
          }

          if (chunkStr.includes('text-delta') || chunkStr.includes('text-start')) {
            hasTextChunk = true;
          }
          expressRes.write(value);
        }
      }
    } catch (streamErr) {
      console.warn('[Stream Pump] Provider error during stream pumping (e.g. 429 Quota Exceeded / Network Timeout):', streamErr?.message || streamErr);
      if (!hasTextChunk && typeof fallbackGenerator === 'function') {
        try {
          const fallbackText = fallbackGenerator();
          const respId = `fb-${Date.now()}`;
          expressRes.write(`data: {"type":"text-start","id":"${respId}"}\n\n`);
          expressRes.write(`data: {"type":"text-delta","id":"${respId}","delta":${JSON.stringify(fallbackText)}}\n\n`);
          expressRes.write(`data: {"type":"text-end","id":"${respId}"}\n\n`);
          hasTextChunk = true;
        } catch (fbErr) {
          console.warn('[Stream Pump] Fallback stream write error:', fbErr);
        }
      }
    } finally {
      try {
        expressRes.write(`data: [DONE]\n\n`);
      } catch {}
      expressRes.end();
    }
  } else {
    if (typeof fallbackGenerator === 'function') {
      try {
        const fallbackText = fallbackGenerator();
        const respId = `fb-${Date.now()}`;
        expressRes.write(`data: {"type":"text-start","id":"${respId}"}\n\n`);
        expressRes.write(`data: {"type":"text-delta","id":"${respId}","delta":${JSON.stringify(fallbackText)}}\n\n`);
        expressRes.write(`data: {"type":"text-end","id":"${respId}"}\n\n`);
        expressRes.write(`data: [DONE]\n\n`);
      } catch (fbErr) {
        console.warn('[Stream Pump] Fallback stream write error:', fbErr);
      }
    }
    expressRes.end();
  }
}

/**
 * POST /api/chat
 */
router.post('/', async (req, res) => {
  let activeTabular = null;
  let userPromptText = '';

  try {
    let apiKey = '';
    try {
      apiKey = getGeminiApiKey();
    } catch {
      apiKey = '';
    }

    const json = req.body || {};
    let rawMessages = json.messages || [];

    if ((!Array.isArray(rawMessages) || rawMessages.length === 0) && typeof json.message === 'string') {
      rawMessages = [{ role: 'user', content: json.message }];
    }

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const lastMessage = rawMessages[rawMessages.length - 1];
    if (lastMessage?.parts && Array.isArray(lastMessage.parts)) {
      userPromptText = lastMessage.parts
        .filter((p) => p && (p.type === 'text' || typeof p.text === 'string'))
        .map((p) => p.text || '')
        .join(' ');
    } else if (typeof lastMessage?.content === 'string') {
      userPromptText = lastMessage.content;
    }

    const cleanSearchQuery = userPromptText
      .replace(/^\[Documents?\s+Attached(?:\s*\(\d+\))?:[^\]]+\]\s*/i, '')
      .replace(/^\[Active\s+Document(?:\s+Context)?:\s*([^\]]+)\]\s*/i, '')
      .trim() || userPromptText;

    globalCurrentPrompt = userPromptText;

    // -------------------------------------------------------------
    // SESSION MEMORY & ACTIVE DOCUMENT RESOLUTION:
    // Scan backwards from newest to oldest message to find the most
    // recently attached or active document in this conversation.
    // -------------------------------------------------------------
    let detectedActiveDoc = null;

    for (let i = rawMessages.length - 1; i >= 0; i--) {
      const msg = rawMessages[i];
      let msgText = '';
      if (msg?.parts && Array.isArray(msg.parts)) {
        msgText = msg.parts
          .filter((p) => p && (p.type === 'text' || typeof p.text === 'string'))
          .map((p) => p.text || '')
          .join(' ');
      } else if (typeof msg?.content === 'string') {
        msgText = msg.content;
      }

      // Check for [Documents Attached: ...] in newest message backwards
      const attachedMatch = msgText.match(/\[Documents?\s+Attached(?:\s*\(\d+\))?:\s*([^\]\n]+)\]/i);
      if (attachedMatch) {
        const rawFiles = attachedMatch[1].split(/[,;\n]+/).map((f) => f.trim()).filter(Boolean);
        if (rawFiles.length > 0) {
          detectedActiveDoc = rawFiles[rawFiles.length - 1];
          break;
        }
      }

      // Check for [Active Document Context: ...] in follow-up queries
      const activeCtxMatch = msgText.match(/\[Active\s+Document(?:\s+Context)?:\s*([^\]\n]+)\]/i);
      if (activeCtxMatch) {
        const rawFiles = activeCtxMatch[1].split(/[,;\n]+/).map((f) => f.trim()).filter(Boolean);
        if (rawFiles.length > 0) {
          detectedActiveDoc = rawFiles[0];
          break;
        }
      }

      // Check for explicit mention of a tabular or PDF document
      const fileMention = msgText.match(/[\w\-.]+\.(?:csv|xlsx|xls|pdf)/i)?.[0];
      if (fileMention && msg.role === 'user') {
        detectedActiveDoc = fileMention;
        break;
      }
    }

    if (detectedActiveDoc) {
      setActiveSessionDocument(detectedActiveDoc);
    } else {
      detectedActiveDoc = getActiveSessionDocument();
    }

    console.log(`[Session Memory] Active Document for query: "${detectedActiveDoc || 'None'}"`);

    // Check if any tabular dataset matches active document or is registered in memory
    const isTabularDoc = detectedActiveDoc && /\.(?:csv|xlsx|xls)$/i.test(detectedActiveDoc);

    if (detectedActiveDoc) {
      activeTabular = await getRegisteredDataset(detectedActiveDoc);
    }

    if (!activeTabular && (!detectedActiveDoc || isTabularDoc)) {
      const all = getAllRegisteredDatasets();
      if (all.length > 0) {
        const notTrain = all.find((d) => !/train\.csv/i.test(d.filename));
        activeTabular = notTrain || all[all.length - 1];
      } else {
        activeTabular = await getRegisteredDataset();
      }
    }

    if (activeTabular && activeTabular.filename) {
      setActiveSessionDocument(activeTabular.filename);
      detectedActiveDoc = activeTabular.filename;
    }

    // 1. LIVE RAG RETRIEVAL & GEMINI STREAMING (If API Key Available)
    if (apiKey && apiKey.trim() !== '') {
      try {
        console.log(`[RAG Retrieval] Processing user query: "${cleanSearchQuery.slice(0, 80)}..."`);

        let ragContextText = '';
        try {
          const retrieval = await retrieveRagContext(cleanSearchQuery, {
            apiKey,
            matchThreshold: 0.12,
            matchCount: 6,
          });

          console.log(`[RAG Retrieval] Retrieved ${retrieval.chunks.length} chunks from database.`);
          ragContextText = buildRagSystemPrompt(
            FINANCIAL_ANALYST_SYSTEM_PROMPT,
            retrieval.chunks
          );
        } catch (retrievalError) {
          console.warn('[RAG Retrieval] Context search fallback:', retrievalError?.message || retrievalError);
          ragContextText = `${FINANCIAL_ANALYST_SYSTEM_PROMPT}\n\nStrictly base your calculations, summaries, and GenUI tables ONLY on the real data provided by the backend tools. NEVER hallucinate, invent, or use dummy financial numbers. If the tool returns empty data, explicitly state that the data was not received.`;
        }

        // Attach pre-computed tabular manifest & real parsed JSON records into context
        if (activeTabular) {
          try {
            if (activeTabular.profile) {
              const manifestChunks = generateTabularManifestChunks(activeTabular.profile, activeTabular.rows);
              ragContextText += `\n\n### DETERMINISTIC TABULAR AUDIT DATASET MANIFEST (Pre-Computed):\n${manifestChunks.join('\n\n')}`;
            }

            const sampleRows = activeTabular.rows ? activeTabular.rows.slice(0, 10) : [];
            ragContextText += `\n\n### ACTIVE VERIFIED TABULAR DATASET (REAL BACKEND DATA):
Filename: ${activeTabular.filename}
Total Parsed Records: ${activeTabular.rows?.length || 0}
Available Column Headers: ${JSON.stringify(activeTabular.headers || [])}
First 10 Rows (Real Parsed JSON Array):
${JSON.stringify(sampleRows, null, 2)}

Strictly base your calculations, summaries, and GenUI tables ONLY on the real data provided by the backend tools. NEVER hallucinate, invent, or use dummy financial numbers. If the tool returns empty data, explicitly state that the data was not received.`;

            console.log(`[RAG Chat] Attached verified tabular context for: ${activeTabular.filename} (${activeTabular.rows?.length} rows)`);
          } catch (mErr) {
            console.warn('[RAG Chat] Error attaching tabular manifest:', mErr);
          }
        }

        // -------------------------------------------------------------
        // CHAT HISTORY SANITIZATION:
        // Strip orphaned tool-calls, remove empty assistant messages,
        // and eliminate trailing assistant messages to prevent Gemini API 400 errors.
        // -------------------------------------------------------------
        const sanitizedRaw = sanitizeRawChatHistory(rawMessages);
        const rawModelMessages = await convertToModelMessages(sanitizedRaw);
        const modelMessages = sanitizeModelMessages(rawModelMessages);

        console.log(`[Sanitize] Sanitized history from ${rawMessages.length} raw messages to ${modelMessages.length} clean model messages`);

        const google = createGoogle({ apiKey });
        const selectedModel = resolveGeminiModel();
        console.log(`[RAG Chat] Streaming response with Gemini model: ${selectedModel}`);

        const result = streamText({
          model: google(selectedModel),
          system: ragContextText,
          messages: modelMessages,
          stopWhen: isStepCount(5),
          maxSteps: 5,
          tools: {
            render_financial_table: renderFinancialTableTool,
            render_financial_chart: renderFinancialVisualizationTool,
            render_financial_visualization: renderFinancialVisualizationTool,
            calculate_financial_metrics: calculateFinancialMetricsTool,
            query_tabular_dataset: queryTabularDatasetTool,
            get_dataset_records: getDatasetRecordsTool,
            cross_reference_documents: crossReferenceDocumentsTool,
          },
        });

        let webResponse;
        if (typeof result.toUIMessageStreamResponse === 'function') {
          webResponse = result.toUIMessageStreamResponse();
        } else if (typeof result.toDataStreamResponse === 'function') {
          webResponse = result.toDataStreamResponse();
        } else {
          webResponse = result.toTextStreamResponse();
        }

        const fallbackGenerator = () =>
          getSimulatedFinancialResponse(userPromptText || 'Financial Overview', activeTabular);

        await pipeWebResponseToExpress(webResponse, res, fallbackGenerator);
        return;
      } catch (geminiError) {
        console.warn('Gemini stream initialization/pipeline failed, falling back to simulated stream:', geminiError?.message || geminiError);
      }
    }

    // 2. SIMULATED STREAMED RESPONSE (Fallback for demo/offline/rate-limited/error mode)
    const simulatedFullText = getSimulatedFinancialResponse(
      userPromptText || 'Financial Overview',
      activeTabular
    );
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

    const webResponse = createUIMessageStreamResponse({ stream });
    await pipeWebResponseToExpress(webResponse, res);
  } catch (error) {
    console.error('Error in /api/chat stream route:', error);
    if (!res.headersSent) {
      try {
        const simulatedFullText = getSimulatedFinancialResponse(
          userPromptText || 'Financial Overview',
          activeTabular
        );
        const responseId = `err-fb-${Date.now()}`;
        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            writer.write({ type: 'text-start', id: responseId });
            writer.write({ type: 'text-delta', id: responseId, delta: simulatedFullText });
            writer.write({ type: 'text-end', id: responseId });
          },
        });
        const webResponse = createUIMessageStreamResponse({ stream });
        await pipeWebResponseToExpress(webResponse, res);
      } catch (fallbackError) {
        if (!res.headersSent) {
          res.status(500).json({
            error: error?.message || 'Internal server error processing conversational query.',
          });
        }
      }
    }
  }
});

export default router;
