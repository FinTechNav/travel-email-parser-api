// PERMANENT FIX: Update public/js/core/api.js
// Add this initialization to the AdminAPI constructor

class AdminAPI {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.config = null;
    this.requestCount = 0;
    
    // 🔧 PERMANENT FIX: Auto-configure from global apiConfig
    this.initializeFromGlobalConfig();
  }

  // 🔧 NEW METHOD: Initialize from global apiConfig
  initializeFromGlobalConfig() {
    // Check if apiConfig exists globally
    if (typeof window !== 'undefined' && typeof window.apiConfig !== 'undefined') {
      this.baseUrl = window.apiConfig.baseUrl;
      this.apiKey = window.apiConfig.apiKey || '';
      this.config = window.apiConfig;
      console.log('🔧 AdminAPI auto-configured from global apiConfig');
      console.log('   baseUrl:', this.baseUrl);
      console.log('   apiKey:', this.apiKey ? 'SET' : 'EMPTY');
    } else if (typeof apiConfig !== 'undefined') {
      // Fallback: check for apiConfig in current scope
      this.baseUrl = apiConfig.baseUrl;
      this.apiKey = apiConfig.apiKey || '';
      this.config = apiConfig;
      console.log('🔧 AdminAPI auto-configured from local apiConfig');
    } else {
      console.warn('⚠️ AdminAPI: No apiConfig found - manual configuration required');
    }
  }

  // 🔧 NEW METHOD: Manual configuration override
  configure(config) {
    this.baseUrl = config.baseUrl || this.baseUrl;
    this.apiKey = config.apiKey || this.apiKey;
    this.config = { ...this.config, ...config };
    console.log('🔧 AdminAPI manually configured');
    return this;
  }

  // Rest of your existing AdminAPI methods...
  async request(endpoint, options = {}) {
    this.requestCount++;
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`🔍 API Request #${this.requestCount}: ${options.method || 'GET'} ${endpoint}`);
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    // Add API key if available
    if (this.apiKey) {
      defaultHeaders['X-API-Key'] = this.apiKey;
    }
    
    const requestOptions = {
      method: 'GET',
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
    
    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ API Response #${this.requestCount}: Success`);
      return data;
    } catch (error) {
      console.error(`❌ API Request #${this.requestCount} failed:`, error);
      throw error;
    }
  }

  // Admin endpoints
  async getPrompts() {
    return this.request('/admin/prompts');
  }

  async getSegmentTypes() {
    return this.request('/admin/segment-types');
  }

  async getClassificationRules() {
    return this.request('/admin/classification-rules');
  }

  async getSystemStatus() {
    return this.request('/admin/system-status');
  }

  // Utility methods
  getTotalRequests() {
    return this.requestCount;
  }

  getConfig() {
    return {
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      requestCount: this.requestCount
    };
  }
}