// API client for WhatsApp Platform
// Handles all backend communication with JWT token management

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get JWT token from localStorage
   */
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Store JWT token in localStorage
   */
  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Remove JWT token from localStorage
   */
  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Make HTTP request with automatic JWT attachment
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized - clear token and redirect to login
        if (response.status === 401) {
          this.removeToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return {
          error: data.error || data.message || 'Request failed',
          status: response.status,
        };
      }

      return { data: data as T, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  // ============================================
  // AUTH ENDPOINTS
  // ============================================

  async login(email: string, password: string, role?: string): Promise<{ token?: string; error?: string }> {
    const { data, error } = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });

    if (error) return { error };
    if (data?.token) {
      this.setToken(data.token);
      return { token: data.token };
    }
    return { error: 'No token received' };
  }

  async logout(): Promise<void> {
    this.removeToken();
    await this.request('/auth/logout', { method: 'POST' });
  }

  async getCurrentUser(): Promise<{ user?: any; error?: string }> {
    const { data, error } = await this.request<{ user: any }>('/auth/me');
    if (error) return { error };
    return { user: data?.user };
  }

  // ============================================
  // CONTACTS ENDPOINTS
  // ============================================

  async getContacts(accountId?: string): Promise<{ contacts?: any[]; error?: string }> {
    const query = accountId ? `?accountId=${accountId}` : '';
    const { data, error } = await this.request<{ contacts: any[] }>(`/contacts${query}`);
    if (error) return { error };
    return { contacts: data?.contacts };
  }

  async createContact(contactData: any): Promise<{ contact?: any; error?: string }> {
    const { data, error } = await this.request<{ contact: any }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
    if (error) return { error };
    return { contact: data?.contact };
  }

  async updateContact(id: string, contactData: any): Promise<{ contact?: any; error?: string }> {
    const { data, error } = await this.request<{ contact: any }>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
    if (error) return { error };
    return { contact: data?.contact };
  }

  async deleteContact(id: string): Promise<{ success?: boolean; error?: string }> {
    const { data, error } = await this.request<{ success: boolean }>(`/contacts/${id}`, {
      method: 'DELETE',
    });
    if (error) return { error };
    return { success: data?.success };
  }

  // ============================================
  // TEMPLATES ENDPOINTS
  // ============================================

  async getTemplates(accountId?: string): Promise<{ templates?: any[]; error?: string }> {
    const query = accountId ? `?accountId=${accountId}` : '';
    const { data, error } = await this.request<{ templates: any[] }>(`/templates${query}`);
    if (error) return { error };
    return { templates: data?.templates };
  }

  async createTemplate(templateData: any): Promise<{ template?: any; error?: string }> {
    const { data, error } = await this.request<{ template: any }>('/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
    if (error) return { error };
    return { template: data?.template };
  }

  async updateTemplate(id: string, templateData: any): Promise<{ template?: any; error?: string }> {
    const { data, error } = await this.request<{ template: any }>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
    if (error) return { error };
    return { template: data?.template };
  }

  async deleteTemplate(id: string): Promise<{ success?: boolean; error?: string }> {
    const { data, error } = await this.request<{ success: boolean }>(`/templates/${id}`, {
      method: 'DELETE',
    });
    if (error) return { error };
    return { success: data?.success };
  }

  // ============================================
  // BROADCASTS ENDPOINTS
  // ============================================

  async getBroadcasts(accountId?: string): Promise<{ broadcasts?: any[]; error?: string }> {
    const query = accountId ? `?accountId=${accountId}` : '';
    const { data, error } = await this.request<{ broadcasts: any[] }>(`/broadcasts${query}`);
    if (error) return { error };
    return { broadcasts: data?.broadcasts };
  }

  async createBroadcast(broadcastData: any): Promise<{ broadcast?: any; error?: string }> {
    const { data, error } = await this.request<{ broadcast: any }>('/broadcasts', {
      method: 'POST',
      body: JSON.stringify(broadcastData),
    });
    if (error) return { error };
    return { broadcast: data?.broadcast };
  }

  async updateBroadcast(id: string, broadcastData: any): Promise<{ broadcast?: any; error?: string }> {
    const { data, error } = await this.request<{ broadcast: any }>(`/broadcasts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(broadcastData),
    });
    if (error) return { error };
    return { broadcast: data?.broadcast };
  }

  async deleteBroadcast(id: string): Promise<{ success?: boolean; error?: string }> {
    const { data, error } = await this.request<{ success: boolean }>(`/broadcasts/${id}`, {
      method: 'DELETE',
    });
    if (error) return { error };
    return { success: data?.success };
  }

  async sendBroadcast(id: string): Promise<{ success?: boolean; error?: string }> {
    const { data, error } = await this.request<{ success: boolean }>(`/broadcasts/${id}/send`, {
      method: 'POST',
    });
    if (error) return { error };
    return { success: data?.success };
  }

  // ============================================
  // CONVERSATIONS ENDPOINTS
  // ============================================

  async getConversations(accountId?: string): Promise<{ conversations?: any[]; error?: string }> {
    const query = accountId ? `?accountId=${accountId}` : '';
    const { data, error } = await this.request<{ conversations: any[] }>(`/conversations${query}`);
    if (error) return { error };
    return { conversations: data?.conversations };
  }

  async getConversationMessages(conversationId: string): Promise<{ messages?: any[]; error?: string }> {
    const { data, error } = await this.request<{ messages: any[] }>(`/conversations/${conversationId}/messages`);
    if (error) return { error };
    return { messages: data?.messages };
  }

  async sendMessage(messageData: any): Promise<{ message?: any; error?: string }> {
    const { data, error } = await this.request<{ message: any }>('/messages/send', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
    if (error) return { error };
    return { message: data?.message };
  }

  // ============================================
  // STATS ENDPOINTS
  // ============================================

  async getStats(accountId?: string): Promise<{ stats?: any; error?: string }> {
    const query = accountId ? `?accountId=${accountId}` : '';
    const { data, error } = await this.request<{ stats: any }>(`/stats${query}`);
    if (error) return { error };
    return { stats: data?.stats };
  }

  // ============================================
  // ACCOUNTS ENDPOINTS
  // ============================================

  async getAccounts(): Promise<{ accounts?: any[]; error?: string }> {
    const { data, error } = await this.request<{ accounts: any[] }>('/accounts');
    if (error) return { error };
    return { accounts: data?.accounts };
  }

  async createAccount(accountData: any): Promise<{ account?: any; error?: string }> {
    const { data, error } = await this.request<{ account: any }>('/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
    if (error) return { error };
    return { account: data?.account };
  }

  async getAccount(id: string): Promise<{ account?: any; error?: string }> {
    const { data, error } = await this.request<{ account: any }>(`/accounts/${id}`);
    if (error) return { error };
    return { account: data?.account };
  }

  async updateAccount(id: string, accountData: any): Promise<{ account?: any; error?: string }> {
    const { data, error } = await this.request<{ account: any }>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(accountData),
    });
    if (error) return { error };
    return { account: data?.account };
  }

  // ============================================
  // CAMPAIGNS ENDPOINTS
  // ============================================

  async getCampaigns(accountId?: string): Promise<{ campaigns?: any[]; error?: string }> {
    const query = accountId ? `?accountId=${accountId}` : '';
    const { data, error } = await this.request<{ campaigns: any[] }>(`/campaigns${query}`);
    if (error) return { error };
    return { campaigns: data?.campaigns };
  }

  async createCampaign(campaignData: any): Promise<{ campaign?: any; error?: string }> {
    const { data, error } = await this.request<{ campaign: any }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });
    if (error) return { error };
    return { campaign: data?.campaign };
  }

  async updateCampaign(id: string, campaignData: any): Promise<{ campaign?: any; error?: string }> {
    const { data, error } = await this.request<{ campaign: any }>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(campaignData),
    });
    if (error) return { error };
    return { campaign: data?.campaign };
  }

  async deleteCampaign(id: string): Promise<{ success?: boolean; error?: string }> {
    const { data, error } = await this.request<{ success: boolean }>(`/campaigns/${id}`, {
      method: 'DELETE',
    });
    if (error) return { error };
    return { success: data?.success };
  }
}

// Export singleton instance
export const api = new ApiClient();
