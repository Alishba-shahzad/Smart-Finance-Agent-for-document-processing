'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChat } from '@ai-sdk/react';
import { saveRecentChat } from '../lib/chatHistory.js';
import {
  Typography,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PsychologyIcon from '@mui/icons-material/Psychology';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ArticleIcon from '@mui/icons-material/Article';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TableViewIcon from '@mui/icons-material/TableView';
import { Loader2, FileText, FileSpreadsheet, ExternalLink, X, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Defensive Markdown Error Boundary to prevent React render crashes
 */
class MarkdownErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('[Markdown Render Boundary] React-markdown safely intercepted error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-700">
          {this.props.fallbackText}
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Interactive Modern Tailwind UI Table Component (render_financial_table tool & GenUI Table)
 */
function FinancialTableUI({
  columns = [],
  rows = [],
  title,
  summary,
  totals,
  statusMetrics,
}) {
  const [copied, setCopied] = useState(false);
  const [sortIndex, setSortIndex] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  // Normalize safe columns
  const safeColumns = useMemo(
    () => (Array.isArray(columns) ? columns.map((c) => String(c ?? '')) : []),
    [columns]
  );

  // Normalize safe rows (handles string[][], object[], or single row)
  const safeRows = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => {
        if (Array.isArray(r)) {
          return r.map((c) => String(c ?? ''));
        }
        if (typeof r === 'object' && r !== null) {
          return Object.values(r).map((c) => String(c ?? ''));
        }
        return [String(r ?? '')];
      })
      .filter((r) => r.length > 0);
  }, [rows]);

  // Client-side filtering
  const filteredRows = useMemo(() => {
    if (!filterQuery.trim()) return safeRows;
    const q = filterQuery.toLowerCase();
    return safeRows.filter((r) => r.some((cell) => cell.toLowerCase().includes(q)));
  }, [safeRows, filterQuery]);

  // Client-side sorting (detects numeric/currency vs string)
  const sortedRows = useMemo(() => {
    if (sortIndex === null) return filteredRows;
    const sorted = [...filteredRows];
    sorted.sort((rowA, rowB) => {
      const aVal = rowA[sortIndex] ?? '';
      const bVal = rowB[sortIndex] ?? '';

      const cleanA = aVal.replace(/[$,% ]/g, '');
      const cleanB = bVal.replace(/[$,% ]/g, '');
      const numA = parseFloat(cleanA);
      const numB = parseFloat(cleanB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return sorted;
  }, [filteredRows, sortIndex, sortAsc]);

  const handleHeaderClick = (idx) => {
    if (sortIndex === idx) {
      setSortAsc((prev) => !prev);
    } else {
      setSortIndex(idx);
      setSortAsc(true);
    }
  };

  const handleCopyTsv = () => {
    try {
      const headerLine = safeColumns.join('\t');
      const rowLines = sortedRows.map((r) => r.join('\t')).join('\n');
      const tsv = `${headerLine}\n${rowLines}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(tsv);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  };

  if (safeColumns.length === 0 && safeRows.length === 0) return null;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs font-sans">
      {/* Table Header / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-200">
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-md bg-blue-50 text-[#1a56db] flex items-center justify-center shrink-0">
            <TableViewIcon sx={{ fontSize: 13 }} />
          </div>
          <span className="font-semibold text-xs text-slate-800 truncate">
            {title || 'Financial Analysis Schedule'}
          </span>
          <span className="text-[10px] font-mono text-[#1a56db] bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded font-medium">
            Interactive Table
          </span>
        </div>

        {/* Search Filter & Export */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter rows..."
              className="text-[11px] px-2 py-0.5 pl-6 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-28 sm:w-36 text-slate-700"
            />
            <SearchIcon
              sx={{ fontSize: 12 }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]"
              >
                ×
              </button>
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            {sortedRows.length} of {safeRows.length} {safeRows.length === 1 ? 'row' : 'rows'}
          </span>

          <Tooltip title={copied ? 'Copied TSV to clipboard!' : 'Export table to Excel / CSV'}>
            <button
              type="button"
              onClick={handleCopyTsv}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#1a56db] bg-white hover:bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              <ContentCopyIcon sx={{ fontSize: 12 }} />
              <span>{copied ? 'Copied' : 'Export'}</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Optional Status Metrics Banner */}
      {Array.isArray(statusMetrics) && statusMetrics.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3.5 py-2 bg-slate-50 border-b border-slate-200">
          {statusMetrics.map((sm, smIdx) => (
            <div
              key={smIdx}
              className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px]"
            >
              <span className="text-slate-500 font-medium">{sm.label}:</span>
              <span className="font-bold text-slate-900 font-mono">{sm.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Optional Financial Commentary / Summary */}
      {summary && (
        <div className="px-3.5 py-2 bg-blue-50/40 border-b border-slate-200 text-xs text-slate-700 font-sans leading-relaxed">
          {summary}
        </div>
      )}

      {/* Modern Tailwind UI Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 select-none">
              {safeColumns.map((col, idx) => {
                const isSorted = sortIndex === idx;
                return (
                  <th
                    key={idx}
                    onClick={() => handleHeaderClick(idx)}
                    className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-700 uppercase tracking-wider font-mono whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{col}</span>
                      <span className="text-[10px] text-slate-400">
                        {isSorted ? (sortAsc ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={safeColumns.length || 1}
                  className="px-3.5 py-4 text-center text-xs text-slate-400"
                >
                  No matching records found.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-blue-50/30 transition-colors duration-150 odd:bg-white even:bg-slate-50/40"
                >
                  {row.map((cell, cIdx) => {
                    const cellStr = String(cell ?? '');
                    const isPositive = cellStr.startsWith('+') || cellStr.includes('+');
                    const isNegative =
                      (cellStr.startsWith('-') || cellStr.includes('-')) && !cellStr.includes('--');
                    const isFirstCol = cIdx === 0;

                    return (
                      <td
                        key={cIdx}
                        className={`px-3.5 py-2 whitespace-nowrap text-xs ${
                          isFirstCol
                            ? 'font-medium text-slate-900'
                            : isPositive
                            ? 'text-emerald-700 font-medium font-mono'
                            : isNegative
                            ? 'text-rose-600 font-medium font-mono'
                            : 'text-slate-700 font-sans'
                        }`}
                      >
                        {cellStr}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>

          {/* Dedicated Totals / Summary Row */}
          {totals && typeof totals === 'object' && Object.keys(totals).length > 0 && (
            <tfoot>
              <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                {safeColumns.map((col, idx) => {
                  const val = totals[col] || (idx === 0 ? 'Total' : '');
                  return (
                    <td
                      key={idx}
                      className="px-3.5 py-2.5 text-xs text-slate-900 font-mono whitespace-nowrap"
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/**
 * Custom Tailwind UI components map for ReactMarkdown
 */
const markdownComponents = {
  // Custom Table with modern Tailwind UI styling
  table: ({ node, ...props }) => (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs font-sans overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead className="bg-slate-50/80 border-b border-slate-200" {...props} />
  ),
  tbody: ({ node, ...props }) => (
    <tbody className="divide-y divide-slate-100" {...props} />
  ),
  tr: ({ node, ...props }) => (
    <tr className="hover:bg-blue-50/30 transition-colors duration-150 odd:bg-white even:bg-slate-50/40" {...props} />
  ),
  th: ({ node, ...props }) => (
    <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-700 uppercase tracking-wider font-mono whitespace-nowrap" {...props} />
  ),
  td: ({ node, children, ...props }) => {
    const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
    const isPositive = text.startsWith('+') || text.includes('+');
    const isNegative = (text.startsWith('-') || text.includes('-')) && !text.includes('--');

    return (
      <td
        className={`px-3.5 py-2 whitespace-nowrap text-xs text-slate-700 ${
          isPositive
            ? 'text-emerald-700 font-medium font-mono'
            : isNegative
            ? 'text-rose-600 font-medium font-mono'
            : 'text-slate-700'
        }`}
        {...props}
      >
        {children}
      </td>
    );
  },
  // Headings & Text
  h1: ({ node, ...props }) => <h1 className="text-base font-bold text-slate-900 mt-3 mb-1.5" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-sm font-bold text-slate-900 mt-2.5 mb-1" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mt-2 mb-1" {...props} />,
  p: ({ node, ...props }) => <p className="text-xs sm:text-sm leading-relaxed text-slate-700 my-1.5" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc list-inside text-xs sm:text-sm text-slate-700 space-y-1 my-1.5 pl-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-700 space-y-1 my-1.5 pl-1" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-2 border-blue-500 pl-3 py-1 my-2 bg-blue-50/50 text-xs sm:text-sm text-slate-700 italic rounded-r-md" {...props} />
  ),
  code: ({ node, className, children, ...props }) => {
    const isInline = !className && typeof children === 'string' && !children.includes('\n');
    return isInline ? (
      <code className="bg-slate-100 text-[#1a56db] px-1 py-0.5 rounded text-[11px] font-mono" {...props}>
        {children}
      </code>
    ) : (
      <code className="block bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2" {...props}>
        {children}
      </code>
    );
  },
};

// GenUI and Ingestion components
import FinancialBarChart from '@/components/chat/FinancialBarChart';
import FinancialDataTable from '@/components/chat/FinancialDataTable';
import DocumentUploadModal from '@/components/chat/DocumentUploadModal';

/**
 * Extracts visible text content from a UIMessage (supports direct content and message.parts)
 */
function getMessageText(message) {
  // 1. Direct message.content (string or array of text blocks)
  const rawContent = message?.content;
  let directText = '';
  if (typeof rawContent === 'string') {
    directText = rawContent.trim();
  } else if (Array.isArray(rawContent)) {
    directText = rawContent
      .filter((p) => p && (p.type === 'text' || typeof p === 'string' || p.text))
      .map((p) => (typeof p === 'string' ? p : p.text || ''))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  // 2. Direct message.text property if available in UI state
  const rawTextProp = message?.text;
  const textProp = typeof rawTextProp === 'string' ? rawTextProp.trim() : '';

  // 3. Text parts inside message.parts
  let partsText = '';
  if (message.parts && Array.isArray(message.parts)) {
    partsText = message.parts
      .filter((p) => p && (p.type === 'text' || p.text))
      .map((p) => (p.type === 'text' ? p.text : p.text || ''))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  // Merge directText, textProp, and partsText cleanly
  const candidates = [directText, textProp, partsText].filter(Boolean);
  if (candidates.length === 0) return '';

  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    const next = candidates[i];
    if (best === next) continue;
    if (best.includes(next)) continue;
    if (next.includes(best)) {
      best = next;
    } else {
      best = `${best}\n\n${next}`;
    }
  }

  return best;
}

/**
 * Extracts any reasoning content from a UIMessage
 */
function getReasoningText(message) {
  if (message.parts && Array.isArray(message.parts)) {
    const reasoningParts = message.parts.filter(
      (p) => p?.type === 'reasoning'
    );
    if (reasoningParts.length > 0) {
      return reasoningParts
        .map((p) => p.text || p.reasoning || '')
        .filter(Boolean)
        .join('\n');
    }
  }
  return null;
}

export default function ChatPage() {
  // Vercel AI SDK useChat hook
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    setMessages,
  } = useChat();

  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q');
  const lastExecutedQuery = useRef(null);

  const isSubmitting = status === 'submitted' || status === 'streaming';
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef(null);

  // Modals State
  const [sourcesDialogOpen, setSourcesDialogOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [selectedDocuments, setSelectedDocuments] = useState([
    'Alpha_Corp_2025_10K_Annual_Report.pdf',
    'Beta_Tech_Q3_Financial_Statement.pdf',
  ]);

  // Collapsible Reasoning State
  const [expandedReasoning, setExpandedReasoning] = useState({});

  const messagesEndRef = useRef(null);

  const availableDocuments = [
    {
      name: 'Alpha_Corp_2025_10K_Annual_Report.pdf',
      type: '10-K SEC Filing',
      pages: 84,
      status: 'Indexed (312 chunks)',
    },
    {
      name: 'Beta_Tech_Q3_Financial_Statement.pdf',
      type: '10-Q Statement',
      pages: 32,
      status: 'Indexed (120 chunks)',
    },
    {
      name: 'Commercial_Vendor_Invoice_INV9812.pdf',
      type: 'Vendor Invoice',
      pages: 2,
      status: 'Indexed (8 chunks)',
    },
    {
      name: 'Fiscal_Year_2024_Audited_Balance_Sheet.xlsx',
      type: 'Spreadsheet',
      pages: 14,
      status: 'Indexed (45 chunks)',
    },
  ];

  const suggestionCards = [
    {
      id: 'ebitda',
      title: 'Extract Q3 Revenue & EBITDA margin',
      subtitle: 'Dynamically renders GenUI Financial Bar Chart with SEC 10-Q figures.',
      prompt: 'Extract the Q3 Revenue, Operating Income, and EBITDA margin from Beta Tech Q3 financial statement with source citations.',
      icon: <TrendingUpIcon sx={{ fontSize: 22 }} className="text-[#1a56db]" />,
      badge: 'GenUI Bar Chart',
    },
    {
      id: 'balance-sheet',
      title: 'Compare 2024 vs 2025 Balance Sheet',
      subtitle: 'Dynamically renders GenUI Balance Sheet Data Table with YoY shifts.',
      prompt: 'Compare the 2024 vs 2025 Balance Sheet items: Total Current Assets, Total Liabilities, and Retained Earnings.',
      icon: <AccountBalanceIcon sx={{ fontSize: 22 }} className="text-emerald-600" />,
      badge: 'GenUI Data Table',
    },
    {
      id: 'invoice-audit',
      title: 'Audit invoice INV-9812 for discrepancies',
      subtitle: 'Renders forensic invoice audit table highlighting the $550 surcharge.',
      prompt: 'Audit invoice INV-9812 for discrepancies between line item sums, tax calculations, and the stated final payable amount.',
      icon: <FactCheckIcon sx={{ fontSize: 22 }} className="text-purple-600" />,
      badge: 'Audit Table',
    },
    {
      id: 'doc-list',
      title: 'Show me my latest 5 documents',
      subtitle: 'Renders document registry overview and ingestion launch card.',
      prompt: 'Show me my latest 5 uploaded financial documents and their indexing status.',
      icon: <ArticleIcon sx={{ fontSize: 22 }} className="text-amber-600" />,
      badge: 'Doc Ingestion',
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  const handleFilesAdded = (files) => {
    const newItems = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      uploadStatus: 'uploading',
      previewUrl: URL.createObjectURL(file),
    }));

    setAttachedFiles((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => {
      setSelectedDocuments((prev) => (prev.includes(item.name) ? prev : [item.name, ...prev]));
    });

    // Auto-upload and register tabular datasets into server memory immediately
    newItems.forEach(async (item) => {
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('fileName', item.name);
        const res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  uploadStatus: 'ready',
                  serverDocId: data?.data?.id,
                  totalRecords: data?.data?.totalRecords,
                }
              : f
          )
        );
      } catch (err) {
        console.warn('Auto-upload failed for attachment:', err);
        setAttachedFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, uploadStatus: 'ready' } : f))
        );
      }
    });
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id) => {
    setAttachedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleSendMessage = (textToSend) => {
    const text = textToSend ?? inputValue;
    if (!text.trim() && attachedFiles.length === 0) return;

    let fullPrompt = text;
    if (attachedFiles.length > 0) {
      const fileListStr = attachedFiles.map((f) => f.name).join(', ');
      const userQuestion = text.trim() || 'Please analyze the attached financial document(s) and extract key metrics.';
      fullPrompt = `[Documents Attached (${attachedFiles.length}): ${fileListStr}]\n\n${userQuestion}`;
    }

    // Save dynamically to Recent Queries
    saveRecentChat({
      prompt: text.trim(),
      category: attachedFiles.length > 0 ? 'Document Analysis' : undefined,
    });

    sendMessage({ text: fullPrompt });
    setInputValue('');

    attachedFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setAttachedFiles([]);
  };

  useEffect(() => {
    if (queryParam && queryParam !== lastExecutedQuery.current) {
      lastExecutedQuery.current = queryParam;
      handleSendMessage(queryParam);
      setSearchParams({}, { replace: true });
    }
  }, [queryParam]);

  const handleSuggestionClick = (prompt) => {
    handleSendMessage(prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleReasoning = (messageId) => {
    setExpandedReasoning((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const toggleDocumentSelection = (docName) => {
    setSelectedDocuments((prev) =>
      prev.includes(docName) ? prev.filter((d) => d !== docName) : [...prev, docName]
    );
  };

  const handleUploadComplete = (newDocName) => {
    setAttachedFiles((prev) => [
      ...prev,
      {
        id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: newDocName,
      },
    ]);
    setSelectedDocuments((prev) => (prev.includes(newDocName) ? prev : [newDocName, ...prev]));
  };

  const handleNewChat = () => {
    if (status === 'streaming' || status === 'submitted') {
      stop();
    }
    setMessages([]);
    setInputValue('');
    setAttachedFiles([]);
    setExpandedReasoning({});
  };

  /**
   * Helper to parse streaming assistant response and dynamically inject GenUI components
   */
  const renderMessageContent = (text) => {
    if (!text || !text.trim()) return null;

    const hasBarChart = text.includes('<!-- GENUI:BAR_CHART -->');
    const hasBalanceSheet = text.includes('<!-- GENUI:BALANCE_SHEET_TABLE -->');
    const hasInvoice = text.includes('<!-- GENUI:INVOICE_TABLE -->');
    const hasDocRegistry = text.includes('<!-- GENUI:DOCUMENTS_REGISTRY -->');

    const cleanText = text
      .replace('<!-- GENUI:BAR_CHART -->', '')
      .replace('<!-- GENUI:BALANCE_SHEET_TABLE -->', '')
      .replace('<!-- GENUI:INVOICE_TABLE -->', '')
      .replace('<!-- GENUI:DOCUMENTS_REGISTRY -->', '')
      .trim();

    return (
      <div className="space-y-3 font-sans">
        {cleanText && (
          <MarkdownErrorBoundary fallbackText={cleanText}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {cleanText}
            </ReactMarkdown>
          </MarkdownErrorBoundary>
        )}

        {/* Dynamic GenUI: Financial Bar Chart */}
        {hasBarChart && (
          <FinancialBarChart
            title="Beta Tech Q3 Financial Metrics: 2024 vs 2025"
            subtitle="Operating Leverage & EBITDA Reconciliation (Item 1, Form 10-Q)"
            sourceFiling="Beta_Tech_Q3_Financial_Statement.pdf (p. 14)"
          />
        )}

        {/* Dynamic GenUI: Balance Sheet Data Table */}
        {hasBalanceSheet && (
          <FinancialDataTable
            type="balanceSheet"
            title="Consolidated Balance Sheet: YoY Structural Shift"
            subtitle="Alpha Corp Item 8 Form 10-K Audit (in Millions USD)"
            sourceDoc="Alpha_Corp_2025_10K_Annual_Report.pdf (p. 28)"
          />
        )}

        {/* Dynamic GenUI: Invoice Audit Table */}
        {hasInvoice && (
          <FinancialDataTable
            type="invoice"
            title="Invoice #INV-2026-9812: Forensic Line-Item Audit"
            subtitle="Global Cloud Logistics LLC (Verified Line Items vs Final Payable)"
            sourceDoc="Commercial_Vendor_Invoice_INV9812.pdf"
          />
        )}

        {/* Dynamic GenUI: Document Ingestion Launcher */}
        {hasDocRegistry && (
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs my-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a56db] flex items-center justify-center">
                  <CloudUploadIcon fontSize="small" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    Ingest &amp; Vectorize Additional Financial Documents
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Document Ingestion with Multi-stage OCR &amp; Vector DB Indexing
                  </p>
                </div>
              </div>

              <Button
                size="small"
                variant="contained"
                startIcon={<CloudUploadIcon fontSize="small" />}
                onClick={() => setUploadModalOpen(true)}
                sx={{
                  bgcolor: '#1a56db',
                  '&:hover': { bgcolor: '#1545b0' },
                  textTransform: 'none',
                  borderRadius: 2,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  py: 0.6,
                  px: 2,
                  whitespace: 'nowrap',
                }}
              >
                Launch Ingestion Pipeline
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Upload PDF filings, balance sheet spreadsheets, or commercial invoices to simulate multi-stage OCR and vectorization into ChromaDB/Pinecone.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-200/90 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-800">
              Financial Conversational Agent
            </span>
            <span className="text-[11px] font-semibold bg-blue-50 text-[#1a56db] border border-blue-200/80 px-2 py-0.5 rounded-full">
              GenUI Active • Multimodal RAG
            </span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            {isSubmitting ? (
              <Loader2 className="w-3 h-3 animate-spin text-[#1a56db]" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            )}
            <span className={isSubmitting ? 'text-[#1a56db] font-medium' : ''}>
              {isSubmitting ? 'Streaming analysis...' : `${selectedDocuments.length} Filings Active`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="outlined"
            startIcon={<CloudUploadIcon fontSize="small" />}
            onClick={() => setUploadModalOpen(true)}
            className="text-xs text-[#1a56db] border-blue-200 hover:bg-blue-50/50 normal-case rounded-lg py-1 px-2.5 hidden sm:inline-flex"
            sx={{
              color: '#1a56db',
              borderColor: '#bfdbfe',
              textTransform: 'none',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 500,
              py: '4px',
              px: '10px',
              '&:hover': {
                borderColor: '#93c5fd',
                backgroundColor: '#eff6ff',
              },
            }}
          >
            Upload Document
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<Plus className="w-3.5 h-3.5" strokeWidth={2.2} />}
            onClick={handleNewChat}
            className="text-xs text-[#1a56db] border-blue-200 hover:bg-blue-50/50 normal-case rounded-lg py-1 px-2.5 inline-flex"
            sx={{
              color: '#1a56db',
              borderColor: '#bfdbfe',
              textTransform: 'none',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 500,
              py: '4px',
              px: '10px',
              '&:hover': {
                borderColor: '#93c5fd',
                backgroundColor: '#eff6ff',
              },
            }}
          >
            New Chat
          </Button>
        </div>
      </div>

      {/* Main Content Scrollable Viewport */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col">
        {messages.length === 0 ? (
          /* ============================================================= */
          /* CENTRALIZED EMPTY STATE VIEW                                   */
          /* ============================================================= */
          <div className="my-auto max-w-3xl mx-auto w-full flex flex-col items-center text-center py-8">
            {/* AI Agent Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#1a56db] mb-5 shadow-xs">
              <AutoAwesomeIcon sx={{ fontSize: 28 }} />
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3">
              Ask anything about your financial data
            </h1>

            {/* Subtitle explaining capabilities */}
            <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed mb-8">
              Analyze SEC 10-K &amp; 10-Q filings, parse complex balance sheets, track cash flow
              trends, audit invoice discrepancies, and dynamically render GenUI charts and tables.
            </p>

            {/* Four Suggestion Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full text-left">
              {suggestionCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => handleSuggestionClick(card.prompt)}
                  className="group relative p-4 rounded-xl bg-white border border-slate-200 hover:border-[#1a56db] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-blue-50/60 transition-colors">
                        {card.icon}
                      </div>
                      <span className="text-[10px] font-semibold text-[#1a56db] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {card.badge}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#1a56db] transition-colors mb-1">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-normal">
                      {card.subtitle}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-[#1a56db] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Click to render GenUI response</span>
                    <ArrowForwardIcon fontSize="inherit" className="text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ============================================================= */
          /* REAL-TIME STREAMING MESSAGE LIST WITH GENUI RENDERING          */
          /* ============================================================= */
          <div className="max-w-3xl mx-auto w-full space-y-6 pb-6">
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant';
              const textContent = getMessageText(message);
              const reasoningContent = getReasoningText(message);
              const isExpanded = expandedReasoning[message.id];

              const hasToolInvocations =
                (Array.isArray(message.toolInvocations) &&
                  message.toolInvocations.length > 0) ||
                (Array.isArray(message.parts) &&
                  message.parts.some(
                    (p) =>
                      p?.type === 'tool-invocation' ||
                      p?.type === 'dynamic-tool' ||
                      (typeof p?.type === 'string' && p.type.startsWith('tool-'))
                  ));

              const isStreamingThisMessage =
                isSubmitting && message.id === messages[messages.length - 1]?.id;

              // Only skip if completely empty (no text, no reasoning, no tools) and not actively streaming
              if (
                isAssistant &&
                !textContent.trim() &&
                !reasoningContent?.trim() &&
                !hasToolInvocations &&
                !isStreamingThisMessage
              ) {
                return null;
              }

              return (
                <div
                  key={message.id}
                  className={`flex gap-3.5 ${isAssistant ? 'items-start' : 'items-start justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-[#1a56db] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <SmartToyIcon sx={{ fontSize: 18 }} />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl p-4.5 ${
                      isAssistant
                        ? 'bg-[#f9fafb] border border-slate-200 text-slate-900 shadow-2xs'
                        : 'bg-[#1a56db] text-white shadow-xs'
                    }`}
                  >
                    {/* Collapsible Reasoning Block (If Generated) */}
                    {isAssistant && reasoningContent && (
                      <div className="mb-3 rounded-lg border border-slate-200 bg-white overflow-hidden text-xs">
                        <button
                          onClick={() => toggleReasoning(message.id)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 font-medium cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <PsychologyIcon fontSize="inherit" className="text-[#1a56db]" />
                            <span>Financial Reasoning Steps</span>
                          </div>
                          {isExpanded ? (
                            <KeyboardArrowUpIcon fontSize="small" />
                          ) : (
                            <KeyboardArrowDownIcon fontSize="small" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="p-3 bg-white text-slate-600 border-t border-slate-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                            {reasoningContent}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Streamed Content with Dynamic GenUI Injection */}
                    {isAssistant ? (
                      <div className="space-y-3">
                        {/* Loading placeholder while waiting for initial tokens or if stream finishes without text */}
                        {!textContent.trim() && (
                          <div className="space-y-3 py-1">
                            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                              {isStreamingThisMessage ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#1a56db]" />
                              ) : (
                                <AutoAwesomeIcon sx={{ fontSize: 16 }} className="text-[#1a56db]" />
                              )}
                              <span>
                                {isStreamingThisMessage
                                  ? 'Financial Analyst is computing aggregates & structuring analysis...'
                                  : 'Financial Analyst evaluation complete'}
                              </span>
                            </div>
                            {isStreamingThisMessage ? (
                              <div className="space-y-2 py-0.5">
                                <div className="h-2.5 bg-slate-200/80 rounded-full w-4/5 animate-pulse"></div>
                                <div className="h-2.5 bg-slate-200/60 rounded-full w-3/5 animate-pulse"></div>
                              </div>
                            ) : (
                              <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl text-xs text-slate-700">
                                <p className="font-semibold text-[#1a56db] mb-1">Financial Dataset Evaluated</p>
                                <p className="text-slate-600">
                                  The document data has been verified and registered in session memory. You can ask for exact totals, averages, delinquency rates, or specific category breakdowns.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 1. Regular Markdown Text Response (message.content / text parts) */}
                        {textContent.trim() ? (
                          <div className="prose-content">
                            {renderMessageContent(textContent)}
                          </div>
                        ) : null}

                        {/* 2. GenUI Tool Invocations: render_financial_table */}
                        {(() => {
                          const renderedTables = [];
                          const seenIds = new Set();

                          const processInvocation = (
                            id,
                            name,
                            payload,
                            state
                          ) => {
                            const isTableTool =
                              name === 'render_financial_table' ||
                              name === 'renderFinancialTable' ||
                              name?.endsWith('render_financial_table');

                            const isCalcTool =
                              name === 'calculate_financial_metrics' ||
                              name === 'calculateFinancialMetrics' ||
                              name?.endsWith('calculate_financial_metrics');

                            const isQueryTool =
                              name === 'query_tabular_dataset' ||
                              name === 'queryTabularDataset' ||
                              name?.endsWith('query_tabular_dataset');

                            if (isTableTool && !seenIds.has(id)) {
                              seenIds.add(id);

                              // Handle array or JSON string columns
                              let columns = [];
                              if (Array.isArray(payload?.columns)) {
                                columns = payload.columns;
                              } else if (typeof payload?.columns === 'string') {
                                try {
                                  const parsed = JSON.parse(payload.columns);
                                  if (Array.isArray(parsed)) columns = parsed;
                                } catch {}
                              }

                              // Handle array or JSON string rows
                              let rows = [];
                              if (Array.isArray(payload?.rows)) {
                                rows = payload.rows;
                              } else if (typeof payload?.rows === 'string') {
                                try {
                                  const parsed = JSON.parse(payload.rows);
                                  if (Array.isArray(parsed)) rows = parsed;
                                } catch {}
                              }

                              const title = payload?.title;
                              const summary = payload?.summary;
                              const totals = payload?.totals;
                              const statusMetrics = payload?.statusMetrics;

                              if (columns.length > 0 || rows.length > 0) {
                                renderedTables.push(
                                  <FinancialTableUI
                                    key={id}
                                    title={title}
                                    summary={summary}
                                    columns={columns}
                                    rows={rows}
                                    totals={totals}
                                    statusMetrics={statusMetrics}
                                  />
                                );
                              } else if (state === 'call' || state === 'input-streaming' || isSubmitting) {
                                renderedTables.push(
                                  <div
                                    key={id}
                                    className="my-3 p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-[#1a56db]"
                                  >
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Rendering interactive financial table...</span>
                                  </div>
                                );
                              }
                            } else if (isCalcTool && !seenIds.has(id)) {
                              seenIds.add(id);
                              if (payload?.totalSumFormatted || payload?.totalPortfolioVolume || payload?.averageFormatted || payload?.delinquencyRateByCount) {
                                renderedTables.push(
                                  <div key={id} className="my-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-2">
                                      <AutoAwesomeIcon sx={{ fontSize: 16 }} className="text-[#1a56db]" />
                                      <span>Deterministic Calculation: {payload.column || payload.targetColumn || payload.filename || 'Financial Metric'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                      {payload.totalSumFormatted && (
                                        <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                                          <div className="text-slate-400 font-medium text-[10px]">Total Aggregate</div>
                                          <div className="font-bold font-mono text-slate-900 text-xs mt-0.5">{payload.totalSumFormatted}</div>
                                        </div>
                                      )}
                                      {payload.averageFormatted && (
                                        <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                                          <div className="text-slate-400 font-medium text-[10px]">Statistical Mean</div>
                                          <div className="font-bold font-mono text-slate-900 text-xs mt-0.5">{payload.averageFormatted}</div>
                                        </div>
                                      )}
                                      {payload.totalPortfolioVolume && (
                                        <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                                          <div className="text-slate-400 font-medium text-[10px]">Portfolio Volume</div>
                                          <div className="font-bold font-mono text-emerald-700 text-xs mt-0.5">{payload.totalPortfolioVolume}</div>
                                        </div>
                                      )}
                                      {payload.delinquencyRateByCount && (
                                        <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                                          <div className="text-slate-400 font-medium text-[10px]">Delinquency Rate</div>
                                          <div className="font-bold font-mono text-rose-600 text-xs mt-0.5">{payload.delinquencyRateByCount}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              } else if (state === 'call' || isSubmitting) {
                                renderedTables.push(
                                  <div key={id} className="my-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-[#1a56db] flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Calculating deterministic mathematical metrics across dataset records...</span>
                                  </div>
                                );
                              }
                            } else if (isQueryTool && !seenIds.has(id)) {
                              seenIds.add(id);
                              if (payload?.matchingRowsCount || payload?.filteredCount) {
                                renderedTables.push(
                                  <div key={id} className="my-2 p-2.5 rounded-xl bg-blue-50/50 border border-blue-200/70 text-xs text-slate-700">
                                    <span className="font-semibold text-[#1a56db]">Dataset Query: </span>
                                    <span>Matched {payload.filteredCount ?? payload.matchingRowsCount} records for analysis.</span>
                                  </div>
                                );
                              }
                            }
                          };

                          if (Array.isArray(message?.toolInvocations)) {
                            message.toolInvocations.forEach((inv, idx) => {
                              const id = inv.toolCallId || `inv-${idx}`;
                              const name = inv.toolName || inv.name;
                              const payload = {
                                ...(typeof inv.input === 'object' && inv.input ? inv.input : {}),
                                ...(typeof inv.output === 'object' && inv.output ? inv.output : {}),
                                ...(typeof inv.args === 'object' && inv.args ? inv.args : {}),
                                ...(typeof inv.result === 'object' && inv.result ? inv.result : {}),
                              };
                              processInvocation(id, name, payload, inv.state);
                            });
                          }

                          if (Array.isArray(message.parts)) {
                            message.parts.forEach((part, idx) => {
                              if (!part) return;
                              if (part.type === 'tool-invocation' && part.toolInvocation) {
                                const inv = part.toolInvocation;
                                const id = inv.toolCallId || `part-inv-${idx}`;
                                const name = inv.toolName || inv.name;
                                const payload = {
                                  ...(typeof inv.input === 'object' && inv.input ? inv.input : {}),
                                  ...(typeof inv.output === 'object' && inv.output ? inv.output : {}),
                                  ...(typeof inv.args === 'object' && inv.args ? inv.args : {}),
                                  ...(typeof inv.result === 'object' && inv.result ? inv.result : {}),
                                };
                                processInvocation(id, name, payload, inv.state);
                              } else if (
                                part.type === 'tool-render_financial_table' ||
                                part.type === 'render_financial_table' ||
                                part.type === 'tool-renderFinancialTable' ||
                                part.type === 'renderFinancialTable' ||
                                (part.type === 'dynamic-tool' &&
                                  (part.toolName === 'render_financial_table' ||
                                    part.toolName === 'renderFinancialTable'))
                              ) {
                                const id = part.toolCallId || part.id || `tool-part-${idx}`;
                                const payload = {
                                  ...(typeof part.input === 'object' && part.input ? part.input : {}),
                                  ...(typeof part.output === 'object' && part.output ? part.output : {}),
                                  ...(typeof part.args === 'object' && part.args ? part.args : {}),
                                  ...(typeof part.result === 'object' && part.result ? part.result : {}),
                                };
                                processInvocation(id, 'render_financial_table', payload, part.state);
                              }
                            });
                          }

                          return renderedTables.length > 0 ? (
                            <div className="space-y-3 pt-1">{renderedTables}</div>
                          ) : null;
                        })()}

                        {isSubmitting && message.id === messages[messages.length - 1]?.id && (
                          <span className="inline-block w-1.5 h-3.5 bg-[#1a56db] ml-1.5 animate-pulse align-middle rounded-xs" />
                        )}
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        {textContent}
                      </div>
                    )}

                    {/* Footer bar with actions */}
                    {isAssistant && (
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/80 text-[11px] text-slate-400">
                        {isSubmitting && message.id === messages[messages.length - 1]?.id ? (
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#1a56db] font-medium">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            <span>Streaming intelligence...</span>
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] text-slate-500">
                            Financial Analyst Stream
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          <Tooltip title="Copy response">
                            <IconButton
                              size="small"
                              onClick={() => navigator.clipboard.writeText(textContent)}
                              className="text-slate-400 hover:text-slate-700 p-1"
                            >
                              <ContentCopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Helpful audit">
                            <IconButton size="small" className="text-slate-400 hover:text-emerald-600 p-1">
                              <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Flag figure">
                            <IconButton size="small" className="text-slate-400 hover:text-rose-600 p-1">
                              <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Immediate Response Loading Skeleton: Displays as soon as prompt is submitted */}
            {isSubmitting && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-[#1a56db] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <SmartToyIcon sx={{ fontSize: 18 }} />
                </div>
                <div className="max-w-[88%] w-full rounded-2xl p-4.5 bg-[#f9fafb] border border-slate-200 text-slate-900 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-[#1a56db]" />
                    <span>Financial Analyst is analyzing disclosures & computing data...</span>
                  </div>
                  <div className="space-y-2 py-1">
                    <div className="h-2.5 bg-slate-200/80 rounded-full w-4/5 animate-pulse"></div>
                    <div className="h-2.5 bg-slate-200/60 rounded-full w-2/3 animate-pulse"></div>
                    <div className="h-2.5 bg-slate-200/40 rounded-full w-1/2 animate-pulse"></div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="text-[#1a56db] flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1a56db] animate-ping"></span>
                      Evaluating tabular financial dataset...
                    </span>
                    <Tooltip title="Stop generation">
                      <button
                        type="button"
                        onClick={() => stop()}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-[2px] bg-slate-400 hover:bg-rose-600 inline-block transition-colors"></span>
                        <span>Stop</span>
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}

            {/* Active Streaming Indicator for Subsequent Tokens */}
            {isSubmitting && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="flex gap-3 items-center py-1">
                <div className="w-7 h-7 rounded-lg bg-blue-50/90 border border-blue-200/70 text-[#1a56db] flex items-center justify-center shrink-0 shadow-2xs">
                  <SmartToyIcon sx={{ fontSize: 16 }} />
                </div>
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-slate-50/90 border border-slate-200/80 rounded-full text-slate-600 shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a56db] shrink-0" />
                  <span className="text-[11px] font-medium text-slate-600 tracking-tight select-none">
                    Streaming financial intelligence...
                  </span>
                  <div className="flex items-center gap-1 ml-0.5">
                    <span className="w-1 h-1 rounded-full bg-[#1a56db] animate-pulse"></span>
                    <span
                      className="w-1 h-1 rounded-full bg-[#1a56db] animate-pulse"
                      style={{ animationDelay: '150ms' }}
                    ></span>
                    <span
                      className="w-1 h-1 rounded-full bg-[#1a56db] animate-pulse"
                      style={{ animationDelay: '300ms' }}
                    ></span>
                  </div>
                  <div className="h-3 w-px bg-slate-200 mx-0.5" />
                  <Tooltip title="Stop generation">
                    <button
                      type="button"
                      onClick={() => stop()}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-[2px] bg-slate-400 hover:bg-rose-600 inline-block transition-colors"></span>
                      <span>Stop</span>
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Error Notification Banner */}
            {error && (
              <Alert
                severity="error"
                className="rounded-xl border border-rose-200"
                action={
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => handleSendMessage()}
                    startIcon={<RefreshIcon fontSize="small" />}
                  >
                    Retry
                  </Button>
                }
              >
                <div className="text-xs">
                  <p className="font-semibold">Query Processing Failed</p>
                  <p className="mt-0.5 text-slate-700">{error.message}</p>
                </div>
              </Alert>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* STICKY CHAT INPUT BAR AT BOTTOM (Action Pills Removed)         */}
      {/* ============================================================= */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shrink-0 z-20">
        <div className="max-w-3xl mx-auto w-full">
          {/* Input Box Card with Drag & Drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl bg-white border ${
              isDraggingOver
                ? 'border-[#1a56db] ring-2 ring-blue-200 bg-blue-50/20'
                : 'border-slate-300 focus-within:border-[#1a56db] focus-within:ring-2 focus-within:ring-blue-100'
            } shadow-xs transition-all flex flex-col p-2.5`}
          >
            {/* Drag & Drop Overlay */}
            {isDraggingOver && (
              <div className="absolute inset-0 bg-blue-50/95 backdrop-blur-xs rounded-2xl flex items-center justify-center border-2 border-dashed border-[#1a56db] z-30 pointer-events-none">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1a56db]">
                  <CloudUploadIcon fontSize="small" />
                  <span>Drop PDF or CSV files here to attach</span>
                </div>
              </div>
            )}

            {/* Visual Attachment Chips / Badges Container */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-1 pt-0.5 pb-2.5 border-b border-slate-100 mb-1.5">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-0.5 select-none">
                  <AttachFileIcon sx={{ fontSize: 13 }} />
                  <span>
                    {attachedFiles.length} {attachedFiles.length === 1 ? 'file' : 'files'}
                  </span>
                </div>

                {attachedFiles.map((att) => {
                  const isPdf = att.name.toLowerCase().endsWith('.pdf') || att.type === 'application/pdf';
                  const isCsv = att.name.toLowerCase().endsWith('.csv') || att.type === 'text/csv';

                  return (
                    <div
                      key={att.id}
                      className="group inline-flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 shadow-2xs transition-all text-xs"
                    >
                      {/* File Icon Badge */}
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isPdf
                            ? 'bg-rose-50 text-rose-600 border border-rose-200/80'
                            : isCsv
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80'
                            : 'bg-blue-50 text-[#1a56db] border border-blue-200/80'
                        }`}
                      >
                        {isPdf ? (
                          <FileText className="w-3.5 h-3.5" />
                        ) : isCsv ? (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        ) : (
                          <ArticleIcon sx={{ fontSize: 14 }} />
                        )}
                      </div>

                      {/* Clickable File Link -> Previews PDF / CSV in New Tab */}
                      <a
                        href={att.previewUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (!att.previewUrl) e.preventDefault();
                        }}
                        title={`Click to preview ${att.name} in a new tab`}
                        className="flex flex-col min-w-0 pr-1 group/link cursor-pointer"
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[12px] font-medium text-slate-800 group-hover/link:text-[#1a56db] truncate max-w-[140px] sm:max-w-[200px] transition-colors underline-offset-2 hover:underline">
                            {att.name}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover/link:text-[#1a56db] shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                          <span>{isPdf ? 'PDF' : isCsv ? 'CSV' : 'Doc'}</span>
                          {att.size ? <span>• {formatFileSize(att.size)}</span> : null}
                          {att.uploadStatus === 'uploading' ? (
                            <span className="text-amber-600 flex items-center gap-0.5 font-medium">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Ingesting...
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">
                              ✓ Ready {att.totalRecords ? `(${att.totalRecords.toLocaleString()} rows)` : ''}
                            </span>
                          )}
                        </div>
                      </a>

                      {/* Remove 'x' Button */}
                      <Tooltip title={`Remove ${att.name}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveAttachment(att.id);
                          }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Textarea */}
            <textarea
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              placeholder={
                attachedFiles.length > 0
                  ? "Ask questions or request analysis on attached document(s)..."
                  : "Ask anything about financial metrics, 10-K filings, invoices, or cash flow statements..."
              }
              className="w-full resize-none border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-transparent px-2 pt-1 font-sans disabled:opacity-50"
            />

            {/* Bottom Controls inside input bar */}
            <div className="flex items-center justify-between pt-1 px-1">
              {/* Paperclip Attachment Button -> Triggers File Picker */}
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="chat-file-attachment-input"
                />

                <Tooltip title="Attach Files (PDF, CSV, Excel - Multi-file supported)">
                  <IconButton
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="text-slate-500 hover:text-[#1a56db] hover:bg-blue-50 p-1.5 transition-colors cursor-pointer"
                  >
                    <AttachFileIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="text-[11px] text-slate-400 hover:text-[#1a56db] font-medium hidden sm:inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Attach PDF / CSV</span>
                  <span className="text-slate-300">|</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadModalOpen(true);
                    }}
                    className="hover:underline text-slate-500 hover:text-[#1a56db]"
                  >
                    Ingest Modal ↗
                  </span>
                </button>
              </div>

              {/* Submit or Stop Button */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-1 text-[#1a56db]">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Streaming...
                    </span>
                  ) : (
                    'Press Enter ↵'
                  )}
                </span>

                {isSubmitting ? (
                  <Tooltip title="Stop generation">
                    <IconButton
                      size="small"
                      onClick={() => stop()}
                      sx={{
                        bgcolor: '#dc2626',
                        color: '#ffffff',
                        '&:hover': { bgcolor: '#b91c1c' },
                        width: 32,
                        height: 32,
                      }}
                    >
                      <StopIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <IconButton
                    size="small"
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() && attachedFiles.length === 0}
                    sx={{
                      bgcolor: inputValue.trim() || attachedFiles.length > 0 ? '#1a56db' : '#f1f5f9',
                      color: inputValue.trim() || attachedFiles.length > 0 ? '#ffffff' : '#94a3b8',
                      '&:hover': {
                        bgcolor: inputValue.trim() || attachedFiles.length > 0 ? '#1545b0' : '#f1f5f9',
                      },
                      width: 32,
                      height: 32,
                    }}
                  >
                    <SendIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </div>
            </div>
          </div>

          {/* Subtext Disclaimer */}
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Financial AI Agent may produce inaccuracies. Cross-reference figures with primary source filings.
          </p>
        </div>
      </div>

      {/* ============================================================= */}
      {/* DOCUMENT UPLOAD & VECTORIZING MODAL                           */}
      {/* ============================================================= */}
      <DocumentUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* ============================================================= */}
      {/* SOURCES FILTER MODAL / DIALOG                                  */}
      {/* ============================================================= */}
      <Dialog
        open={sourcesDialogOpen}
        onClose={() => setSourcesDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              p: 1,
            },
          },
        }}
      >
        <DialogTitle className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <MenuBookIcon className="text-[#1a56db]" />
            <span className="font-bold text-base text-slate-900">
              Active Financial Sources
            </span>
          </div>
          <IconButton size="small" onClick={() => setSourcesDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers className="space-y-2 py-4">
          <p className="text-xs text-slate-500 mb-3">
            Select the indexed financial documents to include in the RAG retrieval context window for your queries:
          </p>
          {availableDocuments.map((doc, idx) => {
            const isSelected = selectedDocuments.includes(doc.name);
            return (
              <div
                key={idx}
                onClick={() => toggleDocumentSelection(doc.name)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#1a56db] bg-blue-50/60 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'bg-[#1a56db] text-white'
                        : 'border border-slate-300 bg-white text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 leading-tight">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span>{doc.type}</span>
                      <span>•</span>
                      <span>{doc.pages} pages</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-mono">{doc.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </DialogContent>

        <DialogActions className="px-4 py-3 flex items-center justify-between">
          <Button
            size="small"
            onClick={() => setSelectedDocuments(availableDocuments.map((d) => d.name))}
            className="text-xs text-slate-600 normal-case"
          >
            Select All
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => setSourcesDialogOpen(false)}
            sx={{
              bgcolor: '#1a56db',
              '&:hover': { bgcolor: '#1545b0' },
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
            }}
          >
            Apply ({selectedDocuments.length})
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
