import { FinancialDocumentCategory } from '@/types/document';

/**
 * Project Information
 */
export const APP_CONFIG = {
  PROJECT_NAME: 'Smart Conversational Agent for Financial Document Processing',
  SHORT_NAME: 'Financial Doc Agent',
  STATUS: 'Production Ready',
  API_VERSION: 'v1',
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  SUPPORTED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/csv',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ],
  SUPPORTED_FILE_EXTENSIONS: ['.pdf', '.xlsx', '.csv', '.png', '.jpg', '.jpeg', '.docx'],
};

/**
 * Financial Document Category Display Configuration
 */
export const DOCUMENT_CATEGORY_CONFIG: Record<
  FinancialDocumentCategory,
  { label: string; description: string; badgeColor: string }
> = {
  ANNUAL_REPORT_10K: {
    label: '10-K Annual Report',
    description: 'Comprehensive financial report filed annually by public companies with SEC.',
    badgeColor: '#1E40AF',
  },
  QUARTERLY_REPORT_10Q: {
    label: '10-Q Quarterly Report',
    description: 'Quarterly financial statements and ongoing business operations update.',
    badgeColor: '#2563EB',
  },
  BALANCE_SHEET: {
    label: 'Balance Sheet',
    description: 'Statement showing assets, liabilities, and shareholders equity at a point in time.',
    badgeColor: '#059669',
  },
  INCOME_STATEMENT: {
    label: 'Income Statement (P&L)',
    description: 'Report showing revenues, expenses, and net profit over a fiscal reporting period.',
    badgeColor: '#0891B2',
  },
  CASH_FLOW_STATEMENT: {
    label: 'Cash Flow Statement',
    description: 'Breakdown of operating, investing, and financing cash flows.',
    badgeColor: '#0D9488',
  },
  INVOICE: {
    label: 'Invoice & Billing',
    description: 'Commercial invoice detailing goods/services rendered, tax, and payment terms.',
    badgeColor: '#7C3AED',
  },
  TAX_RETURN: {
    label: 'Tax Return & Filing',
    description: 'Corporate or entity tax declaration forms and schedules.',
    badgeColor: '#D97706',
  },
  AUDIT_REPORT: {
    label: 'Independent Audit Report',
    description: 'Certified public accountant opinion and compliance findings.',
    badgeColor: '#DC2626',
  },
  BANK_STATEMENT: {
    label: 'Bank Statement',
    description: 'Official monthly summary of financial account activities and balances.',
    badgeColor: '#4B5563',
  },
  CUSTOM: {
    label: 'Other Financial Document',
    description: 'Custom financial tables, contracts, credit memos, or receipts.',
    badgeColor: '#6B7280',
  },
};

/**
 * Default Navigation Routes
 */
export const NAVIGATION_LINKS = [
  { label: 'Chat Interface', href: '/chat', description: 'Query financial documents with AI agent' },
  { label: 'Admin Dashboard', href: '/dashboard', description: 'Monitor processing metrics and uploaded files' },
];
