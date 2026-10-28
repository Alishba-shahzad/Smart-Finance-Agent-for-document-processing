/**
 * Financial Document Domain Types
 */

export type FinancialDocumentCategory =
  | 'ANNUAL_REPORT_10K'
  | 'QUARTERLY_REPORT_10Q'
  | 'BALANCE_SHEET'
  | 'INCOME_STATEMENT'
  | 'CASH_FLOW_STATEMENT'
  | 'INVOICE'
  | 'TAX_RETURN'
  | 'AUDIT_REPORT'
  | 'BANK_STATEMENT'
  | 'CUSTOM';

export type DocumentProcessingStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'INDEXED'
  | 'FAILED';

export interface ExtractedFinancialEntity {
  id: string;
  key: string; // e.g. "NetIncome", "TotalRevenue", "EBITDA"
  label: string;
  value: string | number;
  unit?: string; // e.g. "USD", "%"
  confidenceScore: number;
  pageNumber?: number;
  contextSnippet?: string;
}

export interface FinancialDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  category: FinancialDocumentCategory;
  fiscalYear?: number;
  fiscalQuarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  entityName?: string; // Company / Organization name
  status: DocumentProcessingStatus;
  uploadedAt: string;
  processedAt?: string;
  errorMessage?: string;
  totalPages?: number;
  vectorIndexedChunkCount?: number;
  extractedEntities?: ExtractedFinancialEntity[];
  metadata?: Record<string, unknown>;
}

export interface DocumentUploadPayload {
  category: FinancialDocumentCategory;
  fiscalYear?: number;
  fiscalQuarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  entityName?: string;
  notes?: string;
}
