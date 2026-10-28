import { NextRequest, NextResponse } from 'next/server';
import { processDocumentRAG } from '@/lib/rag/ingestion';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const maxDuration = 60;

/**
 * POST /api/documents/[id]/process
 * Real RAG Ingestion Pipeline:
 * 1. Extract text from uploaded PDF
 * 2. Split into meaningful chunks
 * 3. Generate embeddings using Google Gemini (text-embedding-004) via Vercel AI SDK
 * 4. Insert chunks and embeddings into document_chunks table
 * 5. Update documents table status from 'pending' to 'processed'
 */
export async function POST(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ID',
            message: 'Document ID parameter is required.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const result = await processDocumentRAG(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INGESTION_FAILED',
            message: result.error || 'Failed to process document into vector database.',
          },
          data: result,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `RAG ingestion pipeline completed successfully: ${result.chunksCount} chunks created and embedded with Gemini embeddings (768-dim).`,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('API /api/documents/[id]/process route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error?.message || 'An unexpected error occurred during document processing.',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/[id]/process
 * Get current processing status and indexed chunk count for a document
 */
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nedjnudzmphfxolcnxcm.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_5W1jLi5I0-uz1Cwv5_I1-g_EnYd6zKf';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const { count, error: countError } = await supabase
      .from('document_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', id);

    return NextResponse.json({
      success: true,
      data: {
        document: doc,
        chunkCount: countError ? 0 : count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to query status' },
      { status: 500 }
    );
  }
}
