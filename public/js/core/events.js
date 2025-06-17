// public/js/core/events.js
// Centralized event management to prevent duplicate handlers

class EventManager {
  constructor() {
    this.handlers = new Map();
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    // Main click handler for all data-action elements
    document.addEventListener('click', (e) => {
      const target = e.target;
      const action = target.getAttribute('data-action');
      
      if (action) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.handleAction(action, target, e);
      }
    }, true);

    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-button')) {
        const tabName = e.target.getAttribute('data-tab');
        if (tabName) {
          e.preventDefault();
          this.handleTabSwitch(tabName, e.target);
        }
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.id) {
        this.handleFormSubmission(form.id, e);
      }
    });

    this.initialized = true;
    console.log('✅ EventManager initialized');
  }

  handleAction(action, element, event) {
    console.log(`🎯 Action: ${action}`);
    
    const data = {
      id: element.getAttribute('data-id'),
      modal: element.getAttribute('data-modal'),
      name: element.getAttribute('data-name'),
      active: element.getAttribute('data-active') === 'true',
      category: element.getAttribute('data-category')
    };

    switch (action) {
      case 'show-modal':
      case 'show-create-segment-modal':
      case 'show-create-rule-modal':
      case 'show-create-prompt-modal':
        this.showModal(data.modal || this.getModalIdFromAction(action));
        break;
        
      case 'hide-modal':
        this.hideModal(data.modal);
        break;

      case 'load-segment-types':
        this.emit('load-segment-types');
        break;
        
      case 'load-classification-rules':
        this.emit('load-classification-rules');
        break;
        
      case 'load-prompts':
        this.emit('load-prompts');
        break;

      case 'edit-segment-type':
        this.emit('edit-segment-type', data.name);
        break;
        
      case 'edit-rule':
        this.emit('edit-rule', data.id);
        break;
        
      case 'edit-prompt':
        this.emit('edit-prompt', data.id);
        break;
        
      case 'delete-rule':
        this.emit('delete-rule', data.id);
        break;
        
      case 'delete-prompt':
        this.emit('delete-prompt', data.id);
        break;
        
      case 'toggle-segment-type':
        this.emit('toggle-segment-type', data.name, data.active);
        break;
        
      case 'toggle-prompt':
        this.emit('toggle-prompt', data.id, data.active);
        break;
        
      case 'duplicate-prompt':
        this.emit('duplicate-prompt', data.id);
        break;

      case 'check-system-status':
        this.emit('check-system-status');
        break;
        
      case 'fix-ps-timezone':
        this.emit('fix-ps-timezone');
        break;
        
      case 'reprocess-all-segments':
        this.emit('reprocess-segments');
        break;
        
      case 'test-classification-rules':
        this.showModal('testClassificationModal');
        break;

      case 'switch-prompt-category':
        this.switchPromptCategory(data.category);
        break;

      case 'clear-prompts-filters':
        this.emit('clear-prompts-filters');
        break;
        
      case 'export-prompts':
        this.emit('export-prompts');
        break;

      default:
        console.warn(`Unknown action: ${action}`);
        this.emit(action, data);
    }
  }

  getModalIdFromAction(action) {
    const modalMap = {
      'show-create-segment-modal': 'createSegmentTypeModal',
      'show-create-rule-modal': 'createRuleModal',
      'show-create-prompt-modal': 'createPromptModal'
    };
    return modalMap[action];
  }

  handleTabSwitch(tabName, button) {
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
      targetTab.classList.add('active');
      button.classList.add('active');
      
      this.emit('tab-changed', tabName);
      
      if (tabName === 'admin') {
        setTimeout(() => {
          this.emit('admin-tab-loaded');
        }, 100);
      }
    }
  }

  showModal(modalId) {
    if (!modalId) return;
    
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      this.emit('modal-shown', modalId);
    } else {
      console.error(`Modal not found: ${modalId}`);
    }
  }

  hideModal(modalId) {
    if (!modalId) return;
    
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      this.emit('modal-hidden', modalId);
    }
  }

  switchPromptCategory(category) {
    document.querySelectorAll('.prompt-category-section').forEach(section => {
      section.style.display = 'none';
    });
    
    const targetSection = document.querySelector(`.prompt-category-section[data-category="${category}"]`);
    if (targetSection) {
      targetSection.style.display = 'block';
    }
    
    document.querySelectorAll('[data-action="switch-prompt-category"]').forEach(button => {
      button.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    this.emit('prompt-category-changed', category);
  }

  handleFormSubmission(formId, event) {
    console.log(`📝 Form submission: ${formId}`);
    this.emit('form-submit', formId, event);
  }

  emit(eventName, ...args) {
    const handlers = this.handlers.get(eventName);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Event handler error for ${eventName}:`, error);
        }
      });
    }
  }

  on(eventName, handler) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName).add(handler);
    
    return () => {
      const handlers = this.handlers.get(eventName);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  off(eventName) {
    this.handlers.delete(eventName);
  }

  getDebugInfo() {
    const info = {
      initialized: this.initialized,
      handlerCount: this.handlers.size,
      events: {}
    };
    
    this.handlers.forEach((handlers, eventName) => {
      info.events[eventName] = handlers.size;
    });
    
    return info;
  }
}

window.eventManager = new EventManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.eventManager.init();
  });
} else {
  window.eventManager.init();
}
