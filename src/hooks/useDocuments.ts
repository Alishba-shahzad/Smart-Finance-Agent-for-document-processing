'use client';

import { useState, useCallback, useEffect } from 'react';
import { FinancialDocument, DocumentUploadPayload } from '@/types/document';
import { documentService } from '@/services/documentService';

export interface UseDocumentsReturn {
  documents: FinancialDocument[];
  isLoading: boolean;
  error: string | null;
  refreshDocuments: () => Promise<void>;
  uploadDocument: (file: File, payload: DocumentUploadPayload) => Promise<boolean>;
  uploadToSupabase: (file: File) => Promise<{ success: boolean; data?: any; publicUrl?: string; error?: string }>;
  triggerProcessing: (id: string) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
}

/**
 * Reusable hook foundation for Financial Document operations
 */
export function useDocuments(): UseDocumentsReturn {
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await documentService.getDocuments();
      if (response.success && response.data) {
        setDocuments(response.data.items);
      } else {
        setError(response.error?.message || 'Failed to fetch documents.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  const uploadDocument = useCallback(
    async (file: File, payload: DocumentUploadPayload): Promise<boolean> => {
      try {
        const response = await documentService.uploadDocument(file, payload);
        if (response.success && response.data) {
          setDocuments((prev) => [response.data!, ...prev]);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const uploadToSupabase = useCallback(async (file: File) => {
    return documentService.uploadToSupabase(file);
  }, []);

  const triggerProcessing = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await documentService.triggerProcessing(id);
      return Boolean(response.success);
    } catch {
      return false;
    }
  }, []);

  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await documentService.deleteDocument(id);
      if (response.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    documents,
    isLoading,
    error,
    refreshDocuments,
    uploadDocument,
    uploadToSupabase,
    triggerProcessing,
    deleteDocument,
  };
}
