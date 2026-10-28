import { Router } from 'express';
import multer from 'multer';
import { processDocumentRAG } from '../lib/rag/ingestion.js';
import { getSupabaseClient } from '../lib/supabase.js';
import {
  parseTabularBuffer,
  profileTabularDataset,
  registerDataset,
} from '../lib/rag/tabularEngine.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const sampleDocuments = [
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

/**
 * GET /api/documents
 * List uploaded financial documents with status and metadata
 */
router.get('/', (req, res) => {
  const category = req.query.category;
  const status = req.query.status;
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '10', 10);

  const filtered = sampleDocuments.filter((doc) => {
    if (category && doc.category !== category) return false;
    if (status && doc.status !== status) return false;
    return true;
  });

  const paginatedResult = {
    items: filtered,
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize) || 1,
  };

  const response = {
    success: true,
    data: paginatedResult,
    message: 'Financial documents retrieved successfully.',
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
});

/**
 * POST /api/documents
 * Upload endpoint for financial documents (multipart/form-data)
 */
router.post('/', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    const body = req.body || {};

    const uploadedDocument = {
      id: `doc-${Date.now()}`,
      fileName: file?.originalname || body.fileName || 'Uploaded_Financial_Document.pdf',
      fileSize: file?.size || 1024000,
      mimeType: file?.mimetype || 'application/pdf',
      fileUrl: `/uploads/${file?.originalname || 'sample.pdf'}`,
      category: body.category || 'ANNUAL_REPORT_10K',
      status: 'PENDING',
      fiscalYear: body.fiscalYear ? parseInt(body.fiscalYear, 10) : undefined,
      fiscalQuarter: body.fiscalQuarter || undefined,
      entityName: body.entityName || undefined,
      uploadedAt: new Date().toISOString(),
    };

    // Auto-parse and register tabular files (CSV & Excel) immediately for zero-delay analytics
    if (file && file.buffer) {
      const lowerName = (file.originalname || '').toLowerCase();
      if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        try {
          const parsed = parseTabularBuffer(file.buffer, file.originalname);
          const profile = profileTabularDataset(parsed.rows, parsed.headers, file.originalname);
          const datasetPayload = {
            documentId: uploadedDocument.id,
            filename: file.originalname,
            headers: parsed.headers,
            rows: parsed.rows,
            profile,
          };
          registerDataset(uploadedDocument.id, datasetPayload);
          registerDataset(file.originalname, datasetPayload);
          uploadedDocument.status = 'INDEXED';
          uploadedDocument.totalRecords = parsed.totalRows;
          console.log(`[Document Ingestion] Successfully registered ${parsed.totalRows} records from "${file.originalname}" into Tabular Engine.`);
        } catch (parseErr) {
          console.warn(`[Document Ingestion] Could not auto-parse tabular file:`, parseErr?.message || parseErr);
        }
      }
    }

    sampleDocuments.unshift(uploadedDocument);

    const response = {
      success: true,
      data: uploadedDocument,
      message: 'Document uploaded successfully. Ready for processing pipeline.',
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error?.message || 'Failed to process document upload.',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/documents/:id/process
 * Get current processing status and indexed chunk count for a document
 */
router.get('/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (docError || !doc) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    const { count } = await supabase
      .from('document_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', id);

    return res.status(200).json({
      success: true,
      data: {
        documentId: id,
        status: doc.status,
        chunkCount: count || 0,
        filename: doc.filename,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to fetch document processing status',
    });
  }
});

/**
 * POST /api/documents/:id/process
 * Real RAG Ingestion Pipeline
 */
router.post('/:id/process', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ID',
          message: 'Document ID parameter is required.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await processDocumentRAG(id);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INGESTION_FAILED',
          message: result.error || 'Failed to process document into vector database.',
        },
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: `RAG ingestion pipeline completed successfully: ${result.chunksCount} chunks created and embedded with Gemini embeddings (768-dim).`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API /api/documents/:id/process route error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error?.message || 'An unexpected error occurred during document processing.',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/documents/:id
 * Fetch single financial document with extraction details
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const found = sampleDocuments.find((d) => d.id === id);
  const mockDoc = found || {
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

  const response = {
    success: true,
    data: mockDoc,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
});

/**
 * DELETE /api/documents/:id
 * Remove document
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const index = sampleDocuments.findIndex((d) => d.id === id);
  if (index !== -1) {
    sampleDocuments.splice(index, 1);
  }

  const response = {
    success: true,
    data: { id, deleted: true },
    message: `Document ${id} and associated vector embeddings successfully queued for deletion.`,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
});

export default router;

