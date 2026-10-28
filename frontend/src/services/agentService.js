/**
 * Conversational Agent Service
 */
export class AgentService {
  constructor() {
    this.baseUrl = '/api/chat';
  }

  async getConversations() {
    const res = await fetch(this.baseUrl);
    return res.json();
  }

  async sendMessage(payload) {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
}

export const agentService = new AgentService();

