/**
 * Admin Dashboard & System Analytics Type Definitions
 */

import { FinancialDocumentCategory, DocumentProcessingStatus } from './document';

export interface DashboardMetricOverview {
  totalDocuments: number;
  processedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  averageExtractionAccuracyPercent: number;
  averageLatencyMs: number;
  totalConversations: number;
  totalQueriesProcessed: number;
}

export interface CategoryBreakdown {
  category: FinancialDocumentCategory;
  count: number;
  percentage: number;
}

export interface ProcessingTimelinePoint {
  date: string;
  processedCount: number;
  failedCount: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'UPLOAD' | 'PROCESS' | 'DELETE' | 'CHAT_QUERY' | 'EXPORT' | 'CONFIG_UPDATE';
  documentId?: string;
  documentName?: string;
  userEmail: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILURE';
  details: string;
  ipAddress?: string;
}

export interface ServiceHealthCheck {
  service: 'NextJS_App' | 'Vector_Database' | 'OCR_Engine' | 'LLM_Service';
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  lastChecked: string;
  message?: string;
}
