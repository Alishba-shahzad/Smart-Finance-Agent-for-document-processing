import { ApiResponse, PaginatedResponse } from '@/types/api';
import { FinancialDocument, DocumentUploadPayload } from '@/types/document';
import { createClient } from '@/lib/supabase/client';

export interface SupabaseDocumentRecord {
  id: string;
  filename: string;
  file_url: string;
  user_id: string | null;
  status: string;
  created_at: string;
}

/**
 * Financial Document Service Contract
 * Interfaces for interacting with the backend document management and processing API
 */
export interface IDocumentService {
  getDocuments(params?: {
    category?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<FinancialDocument>>>;

  getDocumentById(id: string): Promise<ApiResponse<FinancialDocument>>;

  uploadDocument(
    file: File,
    payload: DocumentUploadPayload
  ): Promise<ApiResponse<FinancialDocument>>;

  uploadToSupabase(file: File): Promise<{
    success: boolean;
    data?: SupabaseDocumentRecord;
    publicUrl?: string;
    error?: string;
  }>;

  triggerProcessing(
    id: string,
    options?: { forceReindex?: boolean }
  ): Promise<ApiResponse<Partial<FinancialDocument>>>;

  deleteDocument(id: string): Promise<ApiResponse<{ id: string; deleted: boolean }>>;
}

/**
 * Concrete client implementation for document service API
 */
export class DocumentService implements IDocumentService {
  private baseUrl = '/api/documents';

  async getDocuments(params?: {
    category?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<FinancialDocument>>> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());

    const res = await fetch(`${this.baseUrl}?${query.toString()}`);
    return res.json();
  }

  async getDocumentById(id: string): Promise<ApiResponse<FinancialDocument>> {
    const res = await fetch(`${this.baseUrl}/${id}`);
    return res.json();
  }

  async uploadDocument(
    file: File,
    payload: DocumentUploadPayload
  ): Promise<ApiResponse<FinancialDocument>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('payload', JSON.stringify(payload));

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  }

  /**
   * Upload a file directly to Supabase Storage ('financial_documents' public bucket)
   * and insert a record into the Postgres 'documents' table with 'pending' status.
   */
  async uploadToSupabase(file: File): Promise<{
    success: boolean;
    data?: SupabaseDocumentRecord;
    publicUrl?: string;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      const fileExt = file.name.includes('.') ? file.name.split('.').pop() : '';
      const cleanBaseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 60);
      const storagePath = `${Date.now()}_${cleanBaseName}${fileExt ? `.${fileExt}` : ''}`;

      // 1. Upload to Supabase Storage bucket 'financial_documents'
      const { error: uploadError } = await supabase.storage
        .from('financial_documents')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      // 2. Obtain public file URL
      const { data: publicUrlData } = supabase.storage
        .from('financial_documents')
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData.publicUrl;

      // 3. Insert record into Postgres 'documents' table
      const { data: docRecord, error: dbError } = await supabase
        .from('documents')
        .insert({
          filename: file.name,
          file_url: publicUrl,
          status: 'pending',
        })
        .select('*')
        .single();

      if (dbError) {
        return { success: false, error: dbError.message };
      }

      return {
        success: true,
        data: docRecord as SupabaseDocumentRecord,
        publicUrl,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown upload error',
      };
    }
  }

  async triggerProcessing(
    id: string,
    options?: { forceReindex?: boolean }
  ): Promise<ApiResponse<Partial<FinancialDocument>>> {
    const res = await fetch(`${this.baseUrl}/${id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    return res.json();
  }

  /**
   * Trigger the real RAG ingestion pipeline (PDF text extraction, chunking, Gemini embeddings, and status update)
   */
  async processRAG(id: string): Promise<{
    success: boolean;
    data?: { chunksCount: number; documentId: string; status: string; extractedChars: number };
    error?: string;
    message?: string;
  }> {
    try {
      const res = await fetch(`${this.baseUrl}/${id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error executing RAG pipeline' };
    }
  }

  async deleteDocument(id: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  }
}

export const documentService = new DocumentService();

