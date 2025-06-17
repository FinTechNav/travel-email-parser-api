// public/js/core/state.js
// Centralized state management with caching

class AdminState {
  constructor() {
    this.data = {
      segmentTypes: null,
      classificationRules: null,
      prompts: null,
      systemStatus: null
    };
    
    this.timestamps = {
      segmentTypes: 0,
      classificationRules: 0,
      prompts: 0,
      systemStatus: 0
    };
    
    this.promises = {
      segmentTypes: null,
      classificationRules: null,
      prompts: null,
      systemStatus: null
    };
    
    this.cacheTimeout = 30000; // 30 seconds
  }

  isValid(key) {
    const now = Date.now();
    return this.data[key] && (now - this.timestamps[key]) < this.cacheTimeout;
  }

  get(key) {
    if (this.isValid(key)) {
      console.log(`📦 Cache hit: ${key}`);
      return this.data[key];
    }
    console.log(`📦 Cache miss: ${key}`);
    return null;
  }

  set(key, data) {
    this.data[key] = data;
    this.timestamps[key] = Date.now();
    this.promises[key] = null;
    console.log(`📦 Cached: ${key} (${Array.isArray(data) ? data.length : 'object'} items)`);
  }

  clear(key) {
    this.data[key] = null;
    this.timestamps[key] = 0;
    this.promises[key] = null;
    console.log(`📦 Cleared cache: ${key}`);
  }

  clearAll() {
    Object.keys(this.data).forEach(key => this.clear(key));
    console.log('📦 Cleared all cache');
  }

  async getOrFetch(key, fetchFunction) {
    const cached = this.get(key);
    if (cached) {
      return cached;
    }

    if (this.promises[key]) {
      console.log(`⏳ Waiting for ongoing fetch: ${key}`);
      return await this.promises[key];
    }

    console.log(`🔄 Fetching: ${key}`);
    const promise = fetchFunction().then(data => {
      this.set(key, data);
      return data;
    }).catch(error => {
      this.promises[key] = null;
      throw error;
    });

    this.promises[key] = promise;
    return await promise;
  }

  getStats() {
    const now = Date.now();
    const stats = {};
    
    Object.keys(this.data).forEach(key => {
      stats[key] = {
        cached: !!this.data[key],
        valid: this.isValid(key),
        age: now - this.timestamps[key],
        loading: !!this.promises[key],
        size: Array.isArray(this.data[key]) ? this.data[key].length : 
              this.data[key] ? 1 : 0
      };
    });
    
    return stats;
  }
}

window.adminState = new AdminState();
