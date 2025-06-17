// public/js/admin-main.js
// Main admin orchestration - replaces the massive admin.js

class AdminOrchestrator {
  constructor() {
    this.initialized = false;
    this.components = {};
  }

  async init() {
    if (this.initialized) return;

    console.log('🚀 Initializing Modular Admin System...');
    console.log('📊 Reduced from 3,500 lines to modular components');

    // Initialize components
    this.initializeComponents();

    // Setup global event handlers
    this.setupEventHandlers();

    this.initialized = true;
    console.log('✅ Modular Admin System Ready');
  }

  initializeComponents() {
    this.components = {
      segmentTypes: window.segmentTypesManager,
      classificationRules: window.classificationRulesManager,
      prompts: window.promptsManager,
      systemStatus: window.systemStatusManager
    };
    console.log('🔧 Components initialized');
  }

  setupEventHandlers() {
    // Tab switching
    window.eventManager.on('tab-changed', (tabName) => {
      if (tabName === 'admin') {
        this.onAdminTabActivated();
      }
    });

    window.eventManager.on('admin-tab-loaded', () => {
      this.loadInitialData();
    });

    console.log('📡 Event handlers setup complete');
  }

  onAdminTabActivated() {
    console.log('📋 Admin tab activated - loading initial data');
    this.loadInitialData();
  }

  loadInitialData() {
    // Load data for all components
    if (this.components.segmentTypes) {
      this.components.segmentTypes.loadSegmentTypes();
    }
    if (this.components.classificationRules) {
      this.components.classificationRules.loadClassificationRules();
    }
    if (this.components.prompts) {
      this.components.prompts.loadPrompts();
    }
    if (this.components.systemStatus) {
      // System status loads on demand
    }
  }
}

// Initialize when DOM is ready
window.adminOrchestrator = new AdminOrchestrator();
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure all components are loaded
  setTimeout(() => {
    window.adminOrchestrator.init();
  }, 100);
});

// Global exports for backward compatibility
window.showTab = (tabName, button) => window.eventManager.handleTabSwitch(tabName, button);
window.showModal = (modalId) => window.eventManager.showModal(modalId);
window.hideModal = (modalId) => window.eventManager.hideModal(modalId);
window.loadSegmentTypes = () => window.segmentTypesManager?.loadSegmentTypes();
window.loadClassificationRules = () => window.classificationRulesManager?.loadClassificationRules();
window.loadPrompts = () => window.promptsManager?.loadPrompts();
window.checkSystemStatus = () => window.systemStatusManager?.checkSystemStatus();