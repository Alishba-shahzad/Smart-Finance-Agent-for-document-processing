import { useState, useCallback, useEffect } from 'react';
import { documentService } from '../services/documentService.js';

/**
 * Reusable hook foundation for Financial Document operations
 */
export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
    async (file, payload) => {
      try {
        const response = await documentService.uploadDocument(file, payload);
        if (response.success && response.data) {
          setDocuments((prev) => [response.data, ...prev]);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const uploadToSupabase = useCallback(async (file) => {
    return documentService.uploadToSupabase(file);
  }, []);

  const triggerProcessing = useCallback(async (id) => {
    try {
      const response = await documentService.triggerProcessing(id);
      return Boolean(response.success);
    } catch {
      return false;
    }
  }, []);

  const deleteDocument = useCallback(async (id) => {
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

