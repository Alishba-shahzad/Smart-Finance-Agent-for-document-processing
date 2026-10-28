import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { FinancialDocument } from '@/types/document';

/**
 * GET /api/documents
 * List uploaded financial documents with status and metadata
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  // Baseline document list with metadata and extracted entities
  const sampleDocuments: FinancialDocument[] = [
    {
      id: 'doc-001',
      fileName: 'Alpha_Corp_2025_10K_Annual_Report.pdf',
      fileSize: 4823901,
      mimeType: 'application/pdf',
      fileUrl: '/uploads/Alpha_Corp_2025_10K.pdf',
      category: 'ANNUAL_REPORT_10K',
      fiscalYear: 2025,
      entityName: 'Alpha Corporation',
      status: 'INDEXED',
      uploadedAt: '2026-03-15T09:24:00.000Z',
      processedAt: '2026-03-15T09:25:30.000Z',
      totalPages: 84,
      vectorIndexedChunkCount: 312,
      extractedEntities: [
        {
          id: 'ent-1',
          key: 'TotalRevenue',
          label: 'Total Revenue',
          value: '$4,820,500,000',
          confidenceScore: 0.98,
          pageNumber: 28,
        },
        {
          id: 'ent-2',
          key: 'NetIncome',
          label: 'Net Income',
          value: '$840,200,000',
          confidenceScore: 0.96,
          pageNumber: 29,
        },
      ],
    },
    {
      id: 'doc-002',
      fileName: 'Beta_Tech_Q3_Financial_Statement.pdf',
      fileSize: 1984210,
      mimeType: 'application/pdf',
      fileUrl: '/uploads/Beta_Tech_Q3.pdf',
      category: 'QUARTERLY_REPORT_10Q',
      fiscalYear: 2025,
      fiscalQuarter: 'Q3',
      entityName: 'Beta Technologies Inc.',
      status: 'EXTRACTED',
      uploadedAt: '2026-03-20T14:10:00.000Z',
      processedAt: '2026-03-20T14:11:45.000Z',
      totalPages: 32,
      vectorIndexedChunkCount: 120,
    },
    {
      id: 'doc-003',
      fileName: 'Commercial_Vendor_Invoice_INV9812.pdf',
      fileSize: 421098,
      mimeType: 'application/pdf',
      fileUrl: '/uploads/Invoice_INV9812.pdf',
      category: 'INVOICE',
      entityName: 'Global Cloud Logistics LLC',
      status: 'PENDING',
      uploadedAt: '2026-03-22T11:05:00.000Z',
    },
  ];

  const filtered = sampleDocuments.filter((doc) => {
    if (category && doc.category !== category) return false;
    if (status && doc.status !== status) return false;
    return true;
  });

  const paginatedResult: PaginatedResponse<FinancialDocument> = {
    items: filtered,
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  };

  const response: ApiResponse<PaginatedResponse<FinancialDocument>> = {
    success: true,
    data: paginatedResult,
    message: 'Financial documents retrieved successfully.',
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}

/**
 * POST /api/documents
 * Upload endpoint for financial documents
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Multipart form-data is required for document upload.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Foundational mock response for upload handler
    const uploadedDocument: FinancialDocument = {
      id: `doc-${Date.now()}`,
      fileName: 'Uploaded_Financial_Document.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      fileUrl: '/uploads/sample.pdf',
      category: 'ANNUAL_REPORT_10K',
      status: 'PENDING',
      uploadedAt: new Date().toISOString(),
    };

    const response: ApiResponse<FinancialDocument> = {
      success: true,
      data: uploadedDocument,
      message: 'Document uploaded successfully. Ready for processing pipeline.',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Failed to upload document',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
