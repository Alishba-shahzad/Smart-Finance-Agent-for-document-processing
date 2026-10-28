import { Router } from 'express';

const router = Router();

/**
 * GET /api/dashboard/analytics
 * Retrieve administrative overview metrics, document category statistics, and audit trail
 */
router.get('/analytics', async (_req, res) => {
  const overview = {
    totalDocuments: 142,
    processedDocuments: 136,
    pendingDocuments: 4,
    failedDocuments: 2,
    averageExtractionAccuracyPercent: 96.8,
    averageLatencyMs: 340,
    totalConversations: 89,
    totalQueriesProcessed: 624,
  };

  const categoryBreakdown = [
    { category: 'ANNUAL_REPORT_10K', count: 48, percentage: 33.8 },
    { category: 'QUARTERLY_REPORT_10Q', count: 36, percentage: 25.4 },
    { category: 'BALANCE_SHEET', count: 24, percentage: 16.9 },
    { category: 'INCOME_STATEMENT', count: 18, percentage: 12.7 },
    { category: 'INVOICE', count: 10, percentage: 7.0 },
    { category: 'AUDIT_REPORT', count: 6, percentage: 4.2 },
  ];

  const recentAuditLogs = [
    {
      id: 'log-01',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      action: 'CHAT_QUERY',
      userEmail: 'analyst@firm.com',
      status: 'SUCCESS',
      details: 'Extracted EBITDA comparison across 2024-2025 10-K filings.',
    },
    {
      id: 'log-02',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      action: 'PROCESS',
      documentId: 'doc-001',
      documentName: 'Alpha_Corp_2025_10K_Annual_Report.pdf',
      userEmail: 'system-worker@pipeline.internal',
      status: 'SUCCESS',
      details: 'Completed OCR parsing and indexed 312 vector chunks.',
    },
    {
      id: 'log-03',
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      action: 'UPLOAD',
      documentId: 'doc-003',
      documentName: 'Commercial_Vendor_Invoice_INV9812.pdf',
      userEmail: 'auditor@firm.com',
      status: 'SUCCESS',
      details: 'Uploaded invoice document for entity Global Cloud Logistics LLC.',
    },
  ];

  const response = {
    success: true,
    data: {
      overview,
      categoryBreakdown,
      recentAuditLogs,
    },
    message: 'Dashboard analytics retrieved successfully.',
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
});

export default router;

