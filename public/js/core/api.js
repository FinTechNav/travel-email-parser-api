// public/js/core/api.js
// Centralized API client - replaces ~800 lines of fetch logic

class AdminAPI {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.requestCount = 0;
    this.activeRequests = new Map();
  }

  configure(config) {
    this.baseUrl = config.baseUrl || this.baseUrl;
    this.apiKey = config.apiKey || this.apiKey;
  }

  async request(endpoint, options = {}) {
    const requestId = ++this.requestCount;
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };

    const config = {
      method: 'GET',
      headers: { ...defaultHeaders, ...options.headers },
      ...options
    };

    console.log(`🔍 API Request #${requestId}: ${config.method} ${endpoint}`);
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response #${requestId}: Success`);
      
      return data;
    } catch (error) {
      console.error(`❌ API Error #${requestId}:`, error.message);
      throw error;
    }
  }

  // Segment Types API
  async getSegmentTypes() {
    return this.request('/admin/segment-types');
  }

  async createSegmentType(data) {
    return this.request('/admin/segment-types', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateSegmentType(name, data) {
    return this.request(`/admin/segment-types/${name}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Classification Rules API
  async getClassificationRules() {
    return this.request('/admin/classification-rules');
  }

  async createClassificationRule(data) {
    return this.request('/admin/classification-rules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateClassificationRule(id, data) {
    return this.request(`/admin/classification-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteClassificationRule(id) {
    return this.request(`/admin/classification-rules/${id}`, {
      method: 'DELETE'
    });
  }

  // AI Prompts API - CORRECTED ENDPOINTS
  async getPrompts() {
    return this.request('/prompts');
  }

  async getPrompt(id) {
    return this.request(`/prompts/${id}`);
  }

  async createPrompt(data) {
    return this.request('/prompts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePrompt(id, data) {
    return this.request(`/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePrompt(id) {
    return this.request(`/prompts/${id}`, {
      method: 'DELETE'
    });
  }

  async duplicatePrompt(id) {
    return this.request(`/prompts/${id}/duplicate`, {
      method: 'POST'
    });
  }

  // System API
  async getSystemStatus() {
    return this.request('/admin/system-status');
  }

  async testClassification(data) {
    return this.request('/admin/test-classification', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async fixPSTimezone() {
    return this.request('/admin/fix-ps-timezone', {
      method: 'POST'
    });
  }

  async reprocessSegments() {
    return this.request('/admin/reprocess-segments', {
      method: 'POST'
    });
  }

  // Debug utilities
  getTotalRequests() {
    return this.requestCount;
  }

  getActiveRequests() {
    return Array.from(this.activeRequests.entries()).map(([id, req]) => ({
      id,
      ...req,
      duration: Date.now() - req.timestamp
    }));
  }
}

// Create global instance
window.adminAPI = new AdminAPI();