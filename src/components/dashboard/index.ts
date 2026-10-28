/**
 * Reusable Admin Dashboard Components
 * 
 * Directory Structure:
 * - MetricCard: KPI overview cards displaying count, trend, percentage, and icon
 * - DocumentTable: DataGrid/Table with sorting, filtering, status badges, and actions
 * - DocumentUploadModal: Drag-and-drop file upload modal with category selection and progress
 * - ProcessingStatusBadge: Visual badge showing status (PENDING, PROCESSING, INDEXED, FAILED)
 * - CategoryDistributionChart: Visual category distribution graph / breakdown
 * - AuditLogTable: Audit log list showing user actions, timestamps, and status
 * 
 * Reusable dashboard component interfaces.
 */

import { FinancialDocument, FinancialDocumentCategory, DocumentProcessingStatus } from '@/types/document';
import { DashboardMetricOverview, AuditLogEntry, CategoryBreakdown } from '@/types/dashboard';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconName?: string;
}

export interface DocumentTableProps {
  documents: FinancialDocument[];
  isLoading?: boolean;
  onViewDocument?: (document: FinancialDocument) => void;
  onProcessDocument?: (id: string) => void;
  onDeleteDocument?: (id: string) => void;
}

export interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (newDoc: FinancialDocument) => void;
}

export interface ProcessingStatusBadgeProps {
  status: DocumentProcessingStatus;
}

export interface CategoryBreakdownChartProps {
  data: CategoryBreakdown[];
}

export interface AuditLogTableProps {
  logs: AuditLogEntry[];
}
