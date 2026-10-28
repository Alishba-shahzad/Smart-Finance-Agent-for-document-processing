import { embedMany } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { getSupabaseClient } from '../supabase.js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import {
  parseTabularBuffer,
  profileTabularDataset,
  generateTabularManifestChunks,
  registerDataset,
} from './tabularEngine.js';

/**
 * Get Google Gemini API key from environment
 */
export function getGeminiApiKey() {
  const key =
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!key || key.trim() === '' || key === 'your-google-gemini-api-key-here') {
    throw new Error(
      'Missing Gemini API key. Please set GOOGLE_GEMINI_API_KEY (or GOOGLE_API_KEY) in .env and restart the server.'
    );
  }
  return key.trim();
}

/**
 * Extract raw text from a PDF Buffer or Uint8Array using reliable server-side parser
 */
export async function extractTextFromPdf(buffer) {
  try {
    const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const parsed = await pdfParse(nodeBuffer);
    return parsed?.text || '';
  } catch (err) {
    throw new Error(`Failed to extract text from PDF: ${err?.message || 'Unknown PDF error'}`);
  }
}

/**
 * Chunk raw document text into meaningful, context-preserving segments
 */
export function chunkDocumentText(text, maxChunkSize = 800, overlap = 150) {
  if (!text || text.trim().length === 0) return [];

  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const paragraphs = cleanText.split('\n\n');
  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;

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

  return chunks
    .map((c) => c.trim())
    .filter((c) => c.length >= 25);
}

/**
 * Generate 768-dimensional embeddings for text chunks using Google Gemini.
 */
export async function generateGeminiEmbeddings(chunks) {
  if (chunks.length === 0) return [];

  const apiKey = getGeminiApiKey();
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
      const allEmbeddings = [];
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
    } catch (err) {
      console.warn(`Gemini embedding model '${modelId}' attempt failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw new Error(
    `Failed to generate embeddings with Gemini: ${lastError?.message || 'No supported embedding model found'}`
  );
}

/**
 * Execute the complete RAG ingestion pipeline for a stored document:
 */
export async function processDocumentRAG(documentId) {
  const supabase = getSupabaseClient();

  try {
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

    const fileResponse = await fetch(doc.file_url);
    if (!fileResponse.ok) {
      throw new Error(
        `Failed to download document from URL (${fileResponse.status} ${fileResponse.statusText}): ${doc.file_url}`
      );
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const lowerFilename = (doc.filename || '').toLowerCase();
    const isTabular =
      lowerFilename.endsWith('.csv') ||
      lowerFilename.endsWith('.xlsx') ||
      lowerFilename.endsWith('.xls') ||
      doc.file_url?.toLowerCase().includes('.csv') ||
      doc.file_url?.toLowerCase().includes('.xlsx') ||
      doc.file_url?.toLowerCase().includes('.xls');

    let chunks = [];
    let extractedChars = 0;

    if (isTabular) {
      // High-performance tabular ingestion engine (supports 10,000+ rows)
      console.log(`[TabularEngine] Ingesting large tabular dataset: ${doc.filename}`);
      const parsed = parseTabularBuffer(buffer, doc.filename);
      const profile = profileTabularDataset(parsed.rows, parsed.headers, doc.filename);

      // Register dataset in memory store for live tool queries
      registerDataset(documentId, {
        ...parsed,
        ...profile,
        documentId,
        filename: doc.filename,
      });

      // Generate compact master semantic manifest chunks for vector indexing
      chunks = generateTabularManifestChunks(profile, parsed.rows);
      extractedChars = chunks.reduce((acc, c) => acc + c.length, 0);
      console.log(
        `[TabularEngine] Successfully processed ${parsed.totalRows} rows -> ${chunks.length} dense manifest chunks`
      );
    } else {
      // Standard PDF / Unstructured Text Ingestion
      const isPdf =
        lowerFilename.endsWith('.pdf') || doc.file_url?.toLowerCase().includes('.pdf');
      let extractedText = '';

      if (isPdf) {
        extractedText = await extractTextFromPdf(buffer);
      } else {
        extractedText = buffer.toString('utf-8');
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error(
          'No readable text could be extracted from this document. It may be an image-only scan or empty.'
        );
      }

      chunks = chunkDocumentText(extractedText, 800, 150);
      extractedChars = extractedText.length;
    }

    if (chunks.length === 0) {
      throw new Error('Extracted text or tabular data was too brief to produce vector chunks.');
    }

    const embeddings = await generateGeminiEmbeddings(chunks);

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding generation mismatch: generated ${embeddings.length} vectors for ${chunks.length} chunks.`
      );
    }

    await supabase.from('document_chunks').delete().eq('document_id', documentId);

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
  } catch (err) {
    console.error(`RAG Ingestion pipeline failed for document ${documentId}:`, err);

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

