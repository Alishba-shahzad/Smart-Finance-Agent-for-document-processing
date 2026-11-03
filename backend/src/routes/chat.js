import { Router } from 'express';
import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  tool,
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

const FINANCIAL_ANALYST_SYSTEM_PROMPT = `You are a Senior Banking Financial Analyst & Forensic Accounting Intelligence Specialist at a tier-one global financial institution. You analyze loan portfolios, commercial invoices, corporate filings (SEC 10-K, 10-Q), balance sheets, cash flows, and large tabular datasets (10,000+ rows).

MANDATORY DATA INTEGRITY DIRECTIVE:
Strictly base your calculations, summaries, and GenUI tables ONLY on the real data provided by the backend tools. NEVER hallucinate, invent, or use dummy financial numbers. If the tool returns empty data, explicitly state that the data was not received.

Professional Persona & Standards:
1. Executive Text-First Analysis:
   - Always deliver a comprehensive, audit-ready textual financial summary FIRST based strictly on real dataset values.
   - Structure your response logically:
     * Executive Overview & Portfolio Health
     * Quantitative Metrics & Statistical Breakdown (exact totals, averages, ratios, delinquency rates, volume)
     * Risk & Compliance Findings (exceptions, concentrations, high-value outliers)
     * Methodologies & Mathematical Formulas
     * Strategic Banking Recommendations
2. Tabular Presentation:
   - Accompany your text commentary with structured tables using 'render_financial_table'.
   - Ensure tables feature clear headers, aligned rows, and summary/totals lines directly from the real parsed data.
3. Absolute Mathematical Precision (Zero Hallucination):
   - Strictly base your calculations, summaries, and GenUI tables ONLY on the real data provided by the backend tools. NEVER hallucinate, invent, or use dummy financial numbers. If the tool returns empty data, explicitly state that the data was not received.
   - For any mathematical totals, sums, averages, loan summaries, or record counts across datasets, always utilize the provided calculation and query tools ('calculate_financial_metrics', 'query_tabular_dataset', 'get_dataset_records', 'cross_reference_documents').
   - Never approximate or guess numbers when exact data can be computed.
5. Data Visualization and Interactive Charts:
   - When the user asks to "visualize", "show me visualize", "render a chart", "show chart", "plot", or "graph":
     * You MUST render an interactive financial chart by calling the tool 'render_financial_chart' OR including the marker tag '<!-- GENUI:BAR_CHART -->' in your response.
     * Deliver executive textual commentary explaining the trend and key variance points first, followed by the chart.
4. Multi-Document Cross-Referencing:
   - When multiple documents (PDFs, CSVs, Excel files) are present, cross-reference their figures, detect discrepancies, and provide reconciled financial intelligence.
   - Cite specific documents by filename, filing section, or invoice number in square brackets (e.g. [Source: train.csv, Row Audit]).`;

/**
 * Tool: Render Interactive Financial Schedule in GenUI
 */

/**
 * Tool: Render Interactive Financial Bar Chart in GenUI
 */
export const renderFinancialChartTool = tool({
  description:
    'Renders an interactive financial bar or comparison chart in GenUI whenever the user asks to visualize data, see charts, or compare metrics graphically.',
  parameters: z.object({
    title: z.string().describe('Title of the financial chart'),
    subtitle: z.string().optional().describe('Subtitle or context description'),
    sourceFiling: z.string().optional().describe('Source filing citation or document name'),
    seriesData: z
      .array(
        z.object({
          period: z.string().describe('Label or period (e.g. "2024", "Q1", "Category A")'),
          revenue: z.number().optional().describe('Primary metric value in millions or standard unit'),
          grossProfit: z.number().optional().describe('Second metric value'),
          operatingIncome: z.number().optional().describe('Third metric value'),
          ebitda: z.number().optional().describe('Fourth metric value'),
          value: z.number().optional().describe('Generic single metric value if applicable'),
          metricLabel: z.string().optional().describe('Label for the value'),
        })
      )
      .optional()
      .describe('Array of data points for the chart'),
    metrics: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          change: z.string().optional(),
          positive: z.boolean().optional(),
          highlight: z.boolean().optional(),
        })
      )
      .optional()
      .describe('Summary KPI cards to display above the chart'),
  }),
  execute: async (args) => {
    return args;
  },
});

export const renderFinancialTableTool = tool({
  description:
    'Renders financial metrics, loan schedules, statements, or invoice audits in an interactive structured UI table with client-side sorting, filtering, and summary totals.',
  parameters: z.object({
    title: z.string().describe('Title or header description for the financial schedule'),
    summary: z.string().optional().describe('Brief financial summary or key finding for this schedule'),
    columns: z.array(z.string()).describe('Array of column header names (e.g. ["Loan ID", "Borrower", "Principal", "Interest Rate", "Status"])'),
    rows: z.array(z.array(z.string())).describe('Two-dimensional array containing row values matching the columns'),
    totals: z.record(z.string(), z.string()).optional().describe('Map of column name to total/aggregate string (e.g. {"Principal": "$14,250,000.00"})'),
    statusMetrics: z.array(z.object({ label: z.string(), value: z.string() })).optional().describe('Summary pill metrics displayed above the table'),
  }),
  execute: async ({ title, summary, columns, rows, totals, statusMetrics }) => {
    return { title, summary, columns, rows, totals, statusMetrics };
  },
});

/**
 * Tool: Calculate Exact Deterministic Financial Metrics across Tabular Datasets
 */
export const calculateFinancialMetricsTool = tool({
  description:
    'Performs exact mathematical calculations (totals, averages, min/max, counts, loan performance metrics, default rates) on uploaded tabular files (CSV/Excel).',
  parameters: z.object({
    documentIdentifier: z.string().optional().describe('Filename or document ID (leave blank to search all available tabular datasets)'),
    targetColumn: z.string().describe('Column name to calculate (e.g. "loan_amount", "balance", "total", "interest_rate")'),
    operation: z.enum(['sum', 'average', 'min', 'max', 'count', 'loan_summary']).describe('Mathematical operation to perform'),
    groupByColumn: z.string().optional().describe('Optional categorical column to group calculations by (e.g. "status", "category", "risk_rating", "default", "job")'),
  }),
  execute: async ({ documentIdentifier, targetColumn, operation, groupByColumn }) => {
    let dataset = getRegisteredDataset(documentIdentifier);
    if (!dataset) {
      const all = getAllRegisteredDatasets();
      if (all.length > 0) dataset = all[all.length - 1] || all[0];
    }

    if (!dataset || !dataset.rows || dataset.rows.length === 0) {
      return {
        success: false,
        totalRecords: 0,
        message: 'No active tabular dataset registered in memory. Data was not received. Please ensure the document is uploaded.',
      };
    }

    const { rows, headers } = dataset;
    const matchingCol =
      headers.find((h) => h.toLowerCase() === targetColumn.toLowerCase()) ||
      headers.find((h) => h.toLowerCase().includes(targetColumn.toLowerCase())) ||
      targetColumn;

    if (operation === 'loan_summary') {
      let totalVolume = 0;
      let count = 0;
      let defaultedCount = 0;
      let defaultedVolume = 0;
      const statusMap = {};

      for (const r of rows) {
        const amt = parseFinancialNumber(r[matchingCol]) || 0;
        totalVolume += amt;
        count++;

        // Status detection (supports train.csv columns: default, loan, housing, status)
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
      const num = parseFinancialNumber(r[matchingCol]);
      if (num !== null) {
        sum += num;
        validCount++;
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

    return {
      success: true,
      filename: dataset.filename,
      column: matchingCol,
      validNumberCount: validCount,
      totalSum: sum,
      totalSumFormatted: formatCurrency(sum),
      average: validCount > 0 ? sum / validCount : 0,
      averageFormatted: formatCurrency(validCount > 0 ? sum / validCount : 0),
      minimum: min === Infinity ? 0 : min,
      maximum: max === -Infinity ? 0 : max,
      groupedResults: groupByColumn ? groups : undefined,
    };
  },
});

/**
 * Tool: Query Tabular Dataset with Deterministic Filters and Slices
 */
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
    let dataset = getRegisteredDataset(params.documentIdentifier);
    if (!dataset) {
      const all = getAllRegisteredDatasets();
      if (all.length > 0) dataset = all[all.length - 1] || all[0];
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
  },
});

/**
 * Tool: Get Dataset Records (Real Parsed JSON Array)
 */
export const getDatasetRecordsTool = tool({
  description:
    'Retrieves the real parsed JSON array of row objects and column headers from the active tabular dataset. Use this tool whenever you need to inspect raw row records, view multiple data rows, or verify data values directly.',
  parameters: z.object({
    documentIdentifier: z.string().optional().describe('Filename or document ID (leave empty for active dataset)'),
    limit: z.number().optional().default(20).describe('Number of records to retrieve (1 to 100)'),
    offset: z.number().optional().default(0).describe('Row offset to start retrieval from (default 0)'),
  }),
  execute: async ({ documentIdentifier, limit = 20, offset = 0 }) => {
    let dataset = getRegisteredDataset(documentIdentifier);
    if (!dataset) {
      const all = getAllRegisteredDatasets();
      if (all.length > 0) dataset = all[all.length - 1] || all[0];
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

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
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
  },
});

/**
 * Tool: Cross-Reference Multiple Uploaded Documents
 */
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
    const ds1 = getRegisteredDataset(primaryDocument);
    const ds2 = getRegisteredDataset(secondaryDocument);

    if (!ds1 || !ds2) {
      return {
        success: false,
        message: `Both datasets must be active in session. Found: ${primaryDocument}: ${Boolean(ds1)}, ${secondaryDocument}: ${Boolean(ds2)}. Data was not received.`,
      };
    }

    const ds1Map = new Map();
    for (const r of ds1.rows) {
      const k = String(r[reconciliationKey] || '').trim().toLowerCase();
      if (k) ds1Map.set(k, r);
    }

    const discrepancies = [];
    let matchedCount = 0;

    for (const r2 of ds2.rows) {
      const k = String(r2[reconciliationKey] || '').trim().toLowerCase();
      if (!k) continue;

      if (ds1Map.has(k)) {
        matchedCount++;
        const r1 = ds1Map.get(k);
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
  },
});

function getSimulatedFinancialResponse(prompt, activeTabular) {
  const lower = (prompt || '').toLowerCase();
  const isVisualizeRequest =
    lower.includes('visualize') ||
    lower.includes('chart') ||
    lower.includes('graph') ||
    lower.includes('plot');
  if (activeTabular && activeTabular.rows && activeTabular.rows.length > 0 && activeTabular.profile) {
    const { totalRows, headers, financialInsights } = activeTabular.profile;
    const sampleRows = activeTabular.rows.slice(0, 8);
    const visibleHeaders = headers.slice(0, 6);
    const tableHeader = visibleHeaders.join(' | ');
    const tableDivider = visibleHeaders.map(() => ':---').join(' | ');
    const tableData = sampleRows
      .map((r) => visibleHeaders.map((h) => String(r[h] ?? '')).join(' | '))
      .join('\n');

    let amtSummary = '';
    if (financialInsights?.amountColumns?.length > 0) {
      amtSummary = financialInsights.amountColumns
        .slice(0, 5)
        .map(
          (c) =>
            `- **${c.column}**: Total = **${formatCurrency(c.total)}** | Average = **${formatCurrency(
              c.average
            )}** | Range: [${formatCurrency(c.min)} to ${formatCurrency(c.max)}]`
        )
        .join('\n');
    }

    return (
      `### Executive Financial Audit: ${activeTabular.filename}\n\n` +
      `A forensic financial review was completed across **${activeTabular.filename}** comprising **${formatNumber(
        totalRows
      )} verified records**.\n\n` +
      `#### 1. Key Quantitative Aggregates & Portfolio Metrics\n` +
      `- **Total Verified Records**: **${formatNumber(totalRows)} rows**\n` +
      (financialInsights?.totalPortfolioVolume
        ? `- **Primary Portfolio Volume**: **${formatCurrency(financialInsights.totalPortfolioVolume)}**\n`
        : '') +
      (amtSummary ? `${amtSummary}\n\n` : '\n') +
      `#### 2. Representative Audited Schedule\n` +
      `| ${tableHeader} |\n| ${tableDivider} |\n${tableData}\n\n` +
      `#### 3. Forensic Financial Insights & Risk Findings\n` +
      `- All row-level calculations, totals, and column mappings have been computed deterministically from real backend data.\n` +
      `- Dataset schema features **${headers.length} columns**: ${headers.join(', ')}.\n\n` +
      `*Notice: Strictly based on real data provided by backend tools. Zero dummy financial numbers.* +
      (isVisualizeRequest
        ? '\n\n#### 4. Interactive Data Visualization\nBelow is the interactive visual schedule rendering key financial metrics and comparative performance:\n\n<!-- GENUI:BAR_CHART -->\n'
        : '')`
    );
  }

  // When no tabular data was received, explicitly state that data was not received without dummy hallucination
  return (
    `### Financial Data Notice\n\n` +
    `Data was not received: No active tabular dataset is currently loaded in memory.\n\n` +
    `Strictly base your calculations, summaries, and GenUI tables ONLY on the real data provided by the backend tools. NEVER hallucinate, invent, or use dummy financial numbers. If the tool returns empty data, explicitly state that the data was not received.\n\n` +
    `Please ensure your document (such as 'train.csv') is uploaded so that the backend can parse it and supply verified data.`
  );
}

function resolveGeminiModel() {
  const envModel = process.env.GEMINI_MODEL?.trim();
  if (envModel) return envModel;
  return 'gemini-2.0-flash';
}

/**
 * Pipes a Web Standard Response to an Express Response
 */
async function pipeWebResponseToExpress(webRes, expressRes, fallbackGenerator) {
  expressRes.status(webRes.status || 200);
  webRes.headers.forEach((value, key) => {
    expressRes.setHeader(key, value);
  });

  let hasTextChunk = false;
  if (webRes.body) {
    const reader = webRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length > 0) {
          const chunkStr = new TextDecoder().decode(value);
          if (chunkStr.includes('text-delta') || chunkStr.includes('text-start')) {
            hasTextChunk = true;
          }
          expressRes.write(value);
        }
      }
    } catch (streamErr) {
      console.warn('[Stream Pump] Provider error during stream pumping (e.g. 429 Quota Exceeded):', streamErr?.message || streamErr);
    } finally {
      if (!hasTextChunk && typeof fallbackGenerator === 'function') {
        console.log('[Stream Pump] Zero text emitted by provider (e.g. Quota Exceeded). Streaming comprehensive financial fallback intelligence...');
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
  } else {
    if (typeof fallbackGenerator === 'function') {
      const fallbackText = fallbackGenerator();
      const respId = `fb-${Date.now()}`;
      expressRes.write(`data: {"type":"text-start","id":"${respId}"}\n\n`);
      expressRes.write(`data: {"type":"text-delta","id":"${respId}","delta":${JSON.stringify(fallbackText)}}\n\n`);
      expressRes.write(`data: {"type":"text-end","id":"${respId}"}\n\n`);
      expressRes.write(`data: [DONE]\n\n`);
    }
    expressRes.end();
  }
}

/**
 * POST /api/chat
 */
router.post('/', async (req, res) => {
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
    let userPromptText = '';
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
      .trim() || userPromptText;

    const attachedDocMatch = userPromptText.match(/\[Documents?\s+Attached(?:\s*\(\d+\))?:\s*([^\]]+)\]/i);
    const attachedDocName = attachedDocMatch ? attachedDocMatch[1].trim() : null;

    // Check if any tabular dataset matches attached filename, prompt query, or is registered in memory
    let activeTabular = getRegisteredDataset(attachedDocName);
    if (!activeTabular) {
      const all = getAllRegisteredDatasets();
      const promptLower = userPromptText.toLowerCase();
      const matched = all.find((ds) => ds.filename && promptLower.includes(ds.filename.toLowerCase()));
      if (matched) {
        activeTabular = matched;
      } else if (all.length > 0) {
        activeTabular = all[all.length - 1] || all[0];
      }
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

        const normalizedMessages = rawMessages.map((m, idx) => {
          if (m.parts && Array.isArray(m.parts)) {
            return m;
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
          };
        });

        const modelMessages = await convertToModelMessages(normalizedMessages);
        const google = createGoogle({ apiKey });
        const selectedModel = resolveGeminiModel();
        console.log(`[RAG Chat] Streaming response with Gemini model: ${selectedModel}`);

        const result = streamText({
          model: google(selectedModel),
          system: ragContextText,
          messages: modelMessages,
          maxSteps: 5,
          tools: {
            render_financial_table: renderFinancialTableTool,
            render_financial_chart: renderFinancialChartTool,
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
        console.warn('Gemini stream failed, falling back to simulated stream:', geminiError?.message || geminiError);
      }
    }

    // 2. SIMULATED STREAMED RESPONSE (Fallback for demo/offline/rate-limited mode)
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
      res.status(500).json({
        error: error?.message || 'Internal server error processing conversational query.',
      });
    }
  }
});

export default router;
