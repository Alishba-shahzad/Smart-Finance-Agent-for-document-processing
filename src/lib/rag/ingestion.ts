import { embedMany } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';
// Direct import of core parser to bypass the testing block in index.js and avoid worker dependencies
// @ts-expect-error - internal module path without declaration file
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export interface IngestionResult {
  success: boolean;
  documentId: string;
  chunksCount: number;
  extractedChars: number;
  status: 'processed' | 'failed';
  error?: string;
}

/**
 * Get active Supabase client for server-side operations
 */
function getSupabaseClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nedjnudzmphfxolcnxcm.supabase.co';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_5W1jLi5I0-uz1Cwv5_I1-g_EnYd6zKf';

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Get Google Gemini API key from environment
 */
function getGeminiApiKey(): string {
  const key =
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!key || key.trim() === '' || key === 'your-google-gemini-api-key-here') {
    throw new Error(
      'Missing Gemini API key. Please set GOOGLE_GEMINI_API_KEY (or GOOGLE_API_KEY) in .env.local and restart the server.'
    );
  }
  return key.trim();
}

/**
 * Extract raw text from a PDF Buffer or Uint8Array using reliable server-side parser
 * with ZERO web worker dependencies
 */
export async function extractTextFromPdf(buffer: Buffer | Uint8Array): Promise<string> {
  try {
    const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const parsed = await pdfParse(nodeBuffer);
    return parsed?.text || '';
  } catch (err: any) {
    throw new Error(`Failed to extract text from PDF: ${err?.message || 'Unknown PDF error'}`);
  }
}

/**
 * Chunk raw document text into meaningful, context-preserving segments
 *
 * @param text Raw text extracted from document
 * @param maxChunkSize Target maximum characters per chunk (default: 800)
 * @param overlap Characters to overlap across chunk boundaries (default: 150)
 */
export function chunkDocumentText(
  text: string,
  maxChunkSize: number = 800,
  overlap: number = 150
): string[] {
  if (!text || text.trim().length === 0) return [];

  // Normalize line breaks and multiple empty spaces
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Split into paragraphs / logical sections
  const paragraphs = cleanText.split('\n\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;

    // If paragraph itself exceeds maxChunkSize, split by sentence boundaries
    if (trimmedPara.length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      const sentences = trimmedPara.split(/(?<=[.?!])\s+/);
      let sentenceChunk = '';

      for (const sentence of sentences) {
        if ((sentenceChunk + ' ' + sentence).length <= maxChunkSize) {
          sentenceChunk = sentenceChunk ? sentenceChunk + ' ' + sentence : sentence;
        } else {
          if (sentenceChunk.trim()) {
            chunks.push(sentenceChunk.trim());
          }
          const overlapText = sentenceChunk.slice(-overlap);
          sentenceChunk = overlapText + ' ' + sentence;
        }
      }

      if (sentenceChunk.trim()) {
        chunks.push(sentenceChunk.trim());
      }
      continue;
    }

    // Accumulate paragraphs until chunk threshold is reached
    if ((currentChunk + '\n\n' + trimmedPara).length <= maxChunkSize) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + '\n\n' + trimmedPara;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Filter out tiny or noise-only chunks (e.g., bare headers or page numbers)
  return chunks
    .map((c) => c.trim())
    .filter((c) => c.length >= 25);
}

/**
 * Generate 768-dimensional embeddings for text chunks using Google Gemini.
 * Uses the active v1beta model 'gemini-embedding-001' with outputDimensionality: 768,
 * with graceful fallbacks for other model environments.
 */
export async function generateGeminiEmbeddings(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return [];

  const apiKey = getGeminiApiKey();
  const google = createGoogle({ apiKey });

  // Priority list of Gemini embedding models.
  // 'gemini-embedding-001' is active on v1beta and supports outputDimensionality: 768.
  const candidateModels = [
    'gemini-embedding-001',
    'text-embedding-004',
    'gemini-embedding-2',
    'embedding-001',
  ];

  let lastError: any = null;

  for (const modelId of candidateModels) {
    try {
      const model = google.embedding(modelId);
      const allEmbeddings: number[][] = [];
      const BATCH_SIZE = 50;

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const { embeddings } = await embedMany({
          model,
          values: batch,
          providerOptions: {
            google: {
              outputDimensionality: 768,
            },
          },
        });

        for (const emb of embeddings) {
          allEmbeddings.push(emb);
        }
      }

      if (allEmbeddings.length === chunks.length) {
        return allEmbeddings;
      }
    } catch (err: any) {
      console.warn(`Gemini embedding model '${modelId}' attempt failed:`, err?.message || err);
      lastError = err;
      // Continue to next candidate model
    }
  }

  throw new Error(
    `Failed to generate embeddings with Gemini: ${lastError?.message || 'No supported embedding model found'}`
  );
}

/**
 * Execute the complete RAG ingestion pipeline for a stored document:
 * 1. Fetch document from Postgres 'documents' table
 * 2. Download PDF / file from Supabase Storage public URL
 * 3. Extract text from PDF
 * 4. Chunk text into semantic chunks
 * 5. Generate embeddings using Gemini text-embedding-004 via Vercel AI SDK
 * 6. Insert chunks and embeddings into 'document_chunks' table
 * 7. Update document status from 'pending' to 'processed'
 */
export async function processDocumentRAG(documentId: string): Promise<IngestionResult> {
  const supabase = getSupabaseClient();

  try {
    // 1. Fetch document record
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      throw new Error(`Document not found with ID ${documentId}: ${fetchError?.message || ''}`);
    }

    if (!doc.file_url) {
      throw new Error(`Document ${documentId} does not have a valid file_url.`);
    }

    // 2. Fetch binary file from public URL
    const fileResponse = await fetch(doc.file_url);
    if (!fileResponse.ok) {
      throw new Error(
        `Failed to download document from URL (${fileResponse.status} ${fileResponse.statusText}): ${doc.file_url}`
      );
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Extract text based on file format
    let extractedText = '';
    const isPdf =
      doc.filename?.toLowerCase().endsWith('.pdf') ||
      doc.file_url?.toLowerCase().includes('.pdf');
    const isCsvOrText =
      doc.filename?.toLowerCase().endsWith('.csv') ||
      doc.filename?.toLowerCase().endsWith('.txt');

    if (isPdf) {
      extractedText = await extractTextFromPdf(buffer);
    } else if (isCsvOrText) {
      extractedText = buffer.toString('utf-8');
    } else {
      // Default attempt as PDF first, fallback to text
      try {
        extractedText = await extractTextFromPdf(buffer);
      } catch {
        extractedText = buffer.toString('utf-8');
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error(
        'No readable text could be extracted from this document. It may be an image-only scan or empty.'
      );
    }

    // 4. Split text into meaningful semantic chunks
    const chunks = chunkDocumentText(extractedText, 800, 150);

    if (chunks.length === 0) {
      throw new Error('Extracted text was too brief to produce vector chunks.');
    }

    // 5. Generate embeddings using Google Gemini text-embedding-004
    const embeddings = await generateGeminiEmbeddings(chunks);

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding generation mismatch: generated ${embeddings.length} vectors for ${chunks.length} chunks.`
      );
    }

    // 6. Remove any existing chunks for this document to avoid duplication on re-indexing
    await supabase.from('document_chunks').delete().eq('document_id', documentId);

    // 7. Insert chunks and embeddings into Supabase 'document_chunks' table
    const chunkRows = chunks.map((chunk, index) => ({
      document_id: documentId,
      content: chunk,
      embedding: embeddings[index],
    }));

    const INSERT_BATCH_SIZE = 50;
    for (let i = 0; i < chunkRows.length; i += INSERT_BATCH_SIZE) {
      const batch = chunkRows.slice(i, i + INSERT_BATCH_SIZE);
      const { error: insertError } = await supabase.from('document_chunks').insert(batch);
      if (insertError) {
        throw new Error(`Failed to insert document chunks into Supabase: ${insertError.message}`);
      }
    }

    // 8. Update main documents table status to 'processed'
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'processed',
      })
      .eq('id', documentId);

    if (updateError) {
      console.warn(`Warning: Chunks inserted, but failed to update status to processed: ${updateError.message}`);
    }

    return {
      success: true,
      documentId,
      chunksCount: chunks.length,
      extractedChars: extractedText.length,
      status: 'processed',
    };
  } catch (err: any) {
    console.error(`RAG Ingestion pipeline failed for document ${documentId}:`, err);

    // Mark as failed in database if possible
    try {
      await supabase
        .from('documents')
        .update({
          status: 'failed',
        })
        .eq('id', documentId);
    } catch {
      // Ignore update error on failure
    }

    return {
      success: false,
      documentId,
      chunksCount: 0,
      extractedChars: 0,
      status: 'failed',
      error: err?.message || 'Unknown RAG ingestion error',
    };
  }
}
