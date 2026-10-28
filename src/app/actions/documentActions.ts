'use server';

import { processDocumentRAG, IngestionResult } from '@/lib/rag/ingestion';

/**
 * Server Action: Ingest and process a document through the RAG pipeline
 * 1. Extract text from uploaded PDF
 * 2. Split into meaningful chunks
 * 3. Generate embeddings with Gemini text-embedding-004 via Vercel AI SDK
 * 4. Insert chunks and embeddings into document_chunks table
 * 5. Update main documents table status from 'pending' to 'processed'
 */
export async function ingestDocumentAction(documentId: string): Promise<IngestionResult> {
  if (!documentId) {
    return {
      success: false,
      documentId: '',
      chunksCount: 0,
      extractedChars: 0,
      status: 'failed',
      error: 'Document ID must be provided.',
    };
  }

  return processDocumentRAG(documentId);
}
