import { embed } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { getSupabaseClient } from '../supabase.js';
import { getGeminiApiKey } from './ingestion.js';

/**
 * Generate a 768-dimensional query embedding using Gemini embedding model
 */
export async function generateQueryEmbedding(query, providedApiKey) {
  const apiKey = providedApiKey || getGeminiApiKey();
  const google = createGoogle({ apiKey });

  const candidateModels = [
    'gemini-embedding-001',
    'text-embedding-004',
    'gemini-embedding-2',
    'embedding-001',
  ];

  let lastError = null;

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
    } catch (err) {
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
export async function searchDocumentChunks(embedding, options) {
  const supabase = getSupabaseClient();
  const matchThreshold = options?.matchThreshold ?? 0.2;
  const matchCount = options?.matchCount ?? 5;

  let rawChunks = [];

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.warn(`Supabase RPC match_document_chunks failed with full args: ${error.message}. Trying fallback parameters...`);

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

  const docIds = Array.from(
    new Set(rawChunks.map((c) => c.document_id).filter(Boolean))
  );

  const docMap = {};

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

  return rawChunks.map((c) => ({
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
export function formatRetrievedContext(chunks) {
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
export function buildRagSystemPrompt(baseSystemPrompt, chunks) {
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
export async function retrieveRagContext(query, options) {
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

