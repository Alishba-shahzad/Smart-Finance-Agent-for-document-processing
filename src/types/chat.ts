/**
 * Chat and Conversational Agent Type Definitions
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Citation {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber?: number;
  snippet: string;
  confidenceScore?: number;
  financialMetricReference?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  citations?: Citation[];
  metadata?: {
    modelUsed?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    processingTimeMs?: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  associatedDocumentIds: string[];
  messageCount: number;
  lastMessageSnippet?: string;
}

export interface ChatQueryRequest {
  conversationId?: string;
  message: string;
  documentFilterIds?: string[];
  stream?: boolean;
}
