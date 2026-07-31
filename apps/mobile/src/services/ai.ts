/**
 * AI/chat service for DW.ai mobile app.
 * Wraps the backend chat endpoint with timeout and retry.
 */

import { api } from './api';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  context?: string;
  sessionId?: string;
}

export interface ChatResponse {
  message: string;
  sessionId?: string;
}

export interface GuidanceInsight {
  type: string;
  content: string;
  actionItems?: string[];
}

export const aiService = {
  /**
   * Send a message to the DW AI concierge.
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return await api.post<ChatResponse>(
      '/api/chat',
      {
        message: request.message,
        context: request.context,
        sessionId: request.sessionId,
      },
      { headers: { 'X-Timeout': '30000' } },
    );
  },

  /**
   * Get today's AI-generated briefing.
   */
  async getMorningBriefing(): Promise<{ briefing: string }> {
    return await api.get<{ briefing: string }>('/api/proactive/morning-briefing');
  },

  /**
   * Get personalized wellness insights.
   */
  async getDashboardInsight(): Promise<GuidanceInsight> {
    return await api.get<GuidanceInsight>('/api/dashboard/insight');
  },

  /**
   * Get user's current mood/energy context.
   */
  async getMoodContext(): Promise<{ energy: number; mood: number; clarity: number }> {
    return await api.get<{ energy: number; mood: number; clarity: number }>('/api/mood/current');
  },
};
