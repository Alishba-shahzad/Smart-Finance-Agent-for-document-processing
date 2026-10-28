import { ApiResponse } from '@/types/api';
import { ChatMessage, Conversation, ChatQueryRequest } from '@/types/chat';

/**
 * Conversational Agent Service Contract
 * Interfaces for querying the financial document RAG agent
 */
export interface IAgentService {
  getConversations(): Promise<ApiResponse<Conversation[]>>;
  sendMessage(payload: ChatQueryRequest): Promise<ApiResponse<ChatMessage>>;
}

export class AgentService implements IAgentService {
  private baseUrl = '/api/chat';

  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    const res = await fetch(this.baseUrl);
    return res.json();
  }

  async sendMessage(payload: ChatQueryRequest): Promise<ApiResponse<ChatMessage>> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
}

export const agentService = new AgentService();
