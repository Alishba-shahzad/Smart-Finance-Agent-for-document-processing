import { createClient } from '../lib/supabase/client.js';

/**
 * Concrete client implementation for document service API
 */
export class DocumentService {
  constructor() {
    this.baseUrl = '/api/documents';
  }

  async getDocuments(params) {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());

    const res = await fetch(`${this.baseUrl}?${query.toString()}`);
    return res.json();
  }

  async getDocumentById(id) {
    const res = await fetch(`${this.baseUrl}/${id}`);
    return res.json();
  }

  async uploadDocument(file, payload) {
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
  async uploadToSupabase(file) {
    try {
      const supabase = createClient();
      const fileExt = file.name.includes('.') ? file.name.split('.').pop() : '';
      const cleanBaseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 60);
      const storagePath = `${Date.now()}_${cleanBaseName}${fileExt ? `.${fileExt}` : ''}`;

      const { error: uploadError } = await supabase.storage
        .from('financial_documents')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      const { data: publicUrlData } = supabase.storage
        .from('financial_documents')
        .getPublicUrl(storagePath);

      const publicUrl = publicUrlData.publicUrl;

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
        data: docRecord,
        publicUrl,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown upload error',
      };
    }
  }

  async triggerProcessing(id, options) {
    const res = await fetch(`${this.baseUrl}/${id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    return res.json();
  }

  /**
   * Trigger the real RAG ingestion pipeline
   */
  async processRAG(id) {
    try {
      const res = await fetch(`${this.baseUrl}/${id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.json();
    } catch (err) {
      return { success: false, error: err?.message || 'Network error executing RAG pipeline' };
    }
  }

  async deleteDocument(id) {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  }
}

export const documentService = new DocumentService();

