import { embed } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';

export interface DocumentChunkMatch {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
  filename?: string;
}

export interface RetrievalResult {
  query: string;
  embedding: number[];
  chunks: DocumentChunkMatch[];
  formattedContext: string;
}

/**
 * Obtain an active Supabase client for vector search operations
 */
export function getSupabaseClient() {
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
export function getGeminiApiKey(): string {
  const key =
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!key || key.trim() === '' || key === 'your-google-gemini-api-key-here') {
    throw new Error(
      'Missing Gemini API key. Please set GOOGLE_GEMINI_API_KEY (or GOOGLE_API_KEY) in .env.local'
    );
  }
  return key.trim();
}

/**
 * Generate a 768-dimensional query embedding using Gemini embedding model (gemini-embedding-001)
 */
export async function generateQueryEmbedding(
  query: string,
  providedApiKey?: string
): Promise<number[]> {
  const apiKey = providedApiKey || getGeminiApiKey();
  const google = createGoogle({ apiKey });

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
      const { embedding } = await embed({
        model,
        value: query,
        providerOptions: {
          google: {
            outputDimensionality: 768,
          },
        },
      });

      if (embedding && embedding.length > 0) {
        return embedding;
      }
    } catch (err: any) {
      console.warn(`Gemini query embedding model '${modelId}' attempt failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw new Error(
    `Failed to generate query embedding with Gemini: ${lastError?.message || 'No supported embedding model found'}`
  );
}

/**
 * Call Supabase RPC match_document_chunks function with the generated query embedding
 */
export async function searchDocumentChunks(
  embedding: number[],
  options?: {
    matchThreshold?: number;
    matchCount?: number;
  }
): Promise<DocumentChunkMatch[]> {
  const supabase = getSupabaseClient();
  const matchThreshold = options?.matchThreshold ?? 0.2;
  const matchCount = options?.matchCount ?? 5;

  let rawChunks: any[] = [];

  // Primary call matching the exact RPC signature: match_document_chunks(query_embedding, match_threshold, match_count)
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.warn(`Supabase RPC match_document_chunks failed with full args: ${error.message}. Trying fallback parameters...`);

    // Fallback attempt: query_embedding without match_threshold or with match_count only
    const fallback = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_count: matchCount,
    });

    if (fallback.error) {
      console.error('All Supabase RPC match_document_chunks attempts failed:', fallback.error);
      return [];
    }
    rawChunks = fallback.data || [];
  } else {
    rawChunks = data || [];
  }

  if (!rawChunks || rawChunks.length === 0) {
    return [];
  }

  // Fetch document metadata (filename) from 'documents' table to enrich citation context
  const docIds = Array.from(
    new Set(rawChunks.map((c: any) => c.document_id).filter(Boolean))
  ) as string[];

  const docMap: Record<string, string> = {};

  if (docIds.length > 0) {
    try {
      const { data: docs } = await supabase
        .from('documents')
        .select('id, filename')
        .in('id', docIds);

      if (docs) {
        for (const doc of docs) {
          docMap[doc.id] = doc.filename || 'Financial Document';
        }
      }
    } catch (docErr) {
      console.warn('Could not fetch document filenames for chunks:', docErr);
    }
  }

  return rawChunks.map((c: any) => ({
    id: c.id,
    document_id: c.document_id,
    content: c.content || '',
    similarity: typeof c.similarity === 'number' ? c.similarity : 0,
    filename: docMap[c.document_id] || undefined,
  }));
}

/**
 * Format retrieved chunks into a structured Markdown string for injection into the prompt
 */
export function formatRetrievedContext(chunks: DocumentChunkMatch[]): string {
  if (!chunks || chunks.length === 0) {
    return 'No relevant document excerpts were found in the indexed knowledge base for this query.';
  }

  return chunks
    .map((chunk, index) => {
      const docLabel = chunk.filename
        ? `"${chunk.filename}"`
        : `Document ID: ${chunk.document_id || 'Unknown'}`;
      const simPercent = (chunk.similarity * 100).toFixed(1);
      return `--- CONTEXT CHUNK ${index + 1} [Source: ${docLabel} | Semantic Similarity: ${simPercent}%] ---\n${chunk.content}`;
    })
    .join('\n\n');
}

/**
 * Build the complete system prompt with injected context
 */
export function buildRagSystemPrompt(
  baseSystemPrompt: string,
  chunks: DocumentChunkMatch[]
): string {
  const contextBlock = formatRetrievedContext(chunks);

  return `${baseSystemPrompt}

==================================================
RETRIEVED FINANCIAL DOCUMENT CONTEXT (KNOWLEDGE BASE):
==================================================
The following document excerpts were retrieved from the vector database using vector similarity search for the user's query:

${contextBlock}

CRITICAL RULES FOR USING RETRIEVED CONTEXT:
1. Ground your answers strictly in the factual context provided above.
2. Whenever citing facts, figures, policies, or numbers, explicitly cite the source document name (e.g. "[Source: Code of conduct.pdf]" or "[10-K, Item 8]").
3. If the retrieved context does not contain sufficient information to answer the question, clearly state what information is available and what is missing from the indexed documents.
4. Do not invent or hallucinate financial statistics, account numbers, or corporate details not present in the context or standard GAAP rules.
==================================================`;
}

/**
 * High-level helper: Ingests user query, generates embedding, retrieves chunks, and formats context
 */
export async function retrieveRagContext(
  query: string,
  options?: {
    apiKey?: string;
    matchThreshold?: number;
    matchCount?: number;
  }
): Promise<RetrievalResult> {
  const embedding = await generateQueryEmbedding(query, options?.apiKey);
  const chunks = await searchDocumentChunks(embedding, {
    matchThreshold: options?.matchThreshold ?? 0.2,
    matchCount: options?.matchCount ?? 5,
  });
  const formattedContext = formatRetrievedContext(chunks);

  return {
    query,
    embedding,
    chunks,
    formattedContext,
  };
}
