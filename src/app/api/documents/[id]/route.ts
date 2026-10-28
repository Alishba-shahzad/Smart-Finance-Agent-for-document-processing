import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';
import { FinancialDocument } from '@/types/document';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/documents/[id]
 * Fetch single financial document with extraction details
 */
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  const mockDoc: FinancialDocument = {
    id,
    fileName: `Financial_Report_${id}.pdf`,
    fileSize: 3145728,
    mimeType: 'application/pdf',
    fileUrl: `/uploads/${id}.pdf`,
    category: 'ANNUAL_REPORT_10K',
    fiscalYear: 2025,
    entityName: 'Enterprise Financial Holdings Ltd.',
    status: 'INDEXED',
    uploadedAt: '2026-03-10T10:00:00.000Z',
    processedAt: '2026-03-10T10:02:15.000Z',
    totalPages: 52,
    vectorIndexedChunkCount: 198,
    extractedEntities: [
      {
        id: 'ent-1',
        key: 'OperatingRevenue',
        label: 'Operating Revenue',
        value: '$1,240,000,000',
        confidenceScore: 0.97,
        pageNumber: 18,
      },
      {
        id: 'ent-2',
        key: 'OperatingMargin',
        label: 'Operating Margin',
        value: '22.4%',
        confidenceScore: 0.95,
        pageNumber: 21,
      },
    ],
  };

  const response: ApiResponse<FinancialDocument> = {
    success: true,
    data: mockDoc,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}

/**
 * DELETE /api/documents/[id]
 * Remove document and invalidate vector chunks
 */
export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  const response: ApiResponse<{ id: string; deleted: boolean }> = {
    success: true,
    data: { id, deleted: true },
    message: `Document ${id} and associated vector embeddings successfully queued for deletion.`,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}
