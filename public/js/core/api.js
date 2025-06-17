// Fixed public/js/core/api.js
// Auto-configuration logic corrected to check local scope first

class AdminAPI {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.config = null;
    this.requestCount = 0;
    
    // 🔧 PERMANENT FIX: Auto-configure from apiConfig
    this.initializeFromGlobalConfig();
  }

  // 🔧 FIXED METHOD: Check local scope first, then global (with validation)
  initializeFromGlobalConfig() {
    // Check for apiConfig in current/local scope FIRST
    if (typeof apiConfig !== 'undefined' && apiConfig.baseUrl) {
      this.baseUrl = apiConfig.baseUrl;
      this.apiKey = apiConfig.apiKey || '';
      this.config = apiConfig;
      console.log('🔧 AdminAPI auto-configured from local apiConfig');
      console.log('   baseUrl:', this.baseUrl);
      console.log('   apiKey:', this.apiKey ? 'SET' : 'EMPTY');
    } 
    // Fallback: check if apiConfig exists globally  
    else if (typeof window !== 'undefined' && typeof window.apiConfig !== 'undefined' && window.apiConfig.baseUrl) {
      this.baseUrl = window.apiConfig.baseUrl;
      this.apiKey = window.apiConfig.apiKey || '';
      this.config = window.apiConfig;
      console.log('🔧 AdminAPI auto-configured from global apiConfig');
      console.log('   baseUrl:', this.baseUrl);
      console.log('   apiKey:', this.apiKey ? 'SET' : 'EMPTY');
    } else {
      console.warn('⚠️ AdminAPI: No valid apiConfig found - will retry on first request');
      // Set up delayed configuration on first request
      this._needsConfiguration = true;
    }
  }

  // 🔧 NEW METHOD: Try to configure on first request if needed
  _ensureConfigured() {
    if (this._needsConfiguration) {
      console.log('🔄 Attempting delayed configuration...');
      this.initializeFromGlobalConfig();
      this._needsConfiguration = false;
    }
  }

  // 🔧 Manual configuration override
  configure(config) {
    this.baseUrl = config.baseUrl || this.baseUrl;
    this.apiKey = config.apiKey || this.apiKey;
    this.config = { ...this.config, ...config };
    console.log('🔧 AdminAPI manually configured');
    console.log('   baseUrl:', this.baseUrl);
    console.log('   apiKey:', this.apiKey ? 'SET' : 'EMPTY');
    return this;
  }

  async request(endpoint, options = {}) {
    // Try delayed configuration if needed
    this._ensureConfigured();
    
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

// Create global instance
window.adminAPI = new AdminAPI();