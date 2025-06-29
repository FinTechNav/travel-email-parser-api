// public/js/components/SegmentTypesManager.js
// Migrated from admin.js - Segment Types management functionality
// Following the proven PromptsManager pattern

class SegmentTypesManager {
  constructor() {
    this.container = null;
    this.segmentTypes = [];
    this.isLoading = false;
    this.lastError = null;
    this.loadStartTime = null;
  }

  init(containerId = 'segmentTypesContainer') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('❌ SegmentTypesManager: Container not found:', containerId);
      return;
    }

    this.setupEventListeners();
    console.log('✅ SegmentTypesManager initialized');
  }

  setupEventListeners() {
    // Listen for tab activation to load data
    window.eventManager.on('show-segment-types', () => {
      console.log('🎯 SegmentTypesManager: Tab activated, loading data');
      this.loadSegmentTypes();
    });

    // Listen for refresh actions
    window.eventManager.on('refresh-segment-types', () => {
      console.log('🔄 SegmentTypesManager: Manual refresh triggered');
      this.loadSegmentTypes(true); // Force refresh
    });

    // Listen for create actions
    window.eventManager.on('create-segment-type', () => {
      console.log('➕ SegmentTypesManager: Create action triggered');
      this.showCreateModal();
    });

    // Add click event delegation for CSP compliance
    document.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');
      const segmentName = e.target.getAttribute('data-segment-name');

      switch (action) {
        case 'edit-segment-type':
          if (segmentName) {
            e.preventDefault();
            this.editSegmentType(segmentName);
          }
          break;
        case 'view-segment-rules':
          if (segmentName) {
            e.preventDefault();
            this.viewRules(segmentName);
          }
          break;
        case 'retry-load-segment-types':
          e.preventDefault();
          this.loadSegmentTypes(true);
          break;
        case 'create-segment-type':
          e.preventDefault();
          window.eventManager.trigger('create-segment-type');
          break;
      }
    });
  }

  async loadSegmentTypes(forceRefresh = false) {
    if (this.isLoading) {
      console.log('⏳ SegmentTypesManager: Already loading, skipping');
      return;
    }

    try {
      this.isLoading = true;
      this.loadStartTime = Date.now();
      
      // Show loading state
      this.showLoadingState();

      // Get data from cache or API
      const data = await window.adminState.getOrFetch(
        'segmentTypes',
        () => window.adminAPI.getSegmentTypes(),
        forceRefresh
      );

      this.segmentTypes = data || [];
      console.log(`✅ SegmentTypesManager: Loaded ${this.segmentTypes.length} segment types`);
      
      this.displaySegmentTypes();
      this.updateCounter();
      this.lastError = null;

    } catch (error) {
      console.error('❌ SegmentTypesManager: Load failed:', error);
      this.lastError = error;
      this.showErrorState(error);
    } finally {
      this.isLoading = false;
      const loadTime = Date.now() - this.loadStartTime;
      console.log(`⏱️ SegmentTypesManager: Load completed in ${loadTime}ms`);
    }
  }

  showLoadingState() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="color: #48bb78; font-size: 32px; margin-bottom: 16px;">
          <div style="width: 40px; height: 40px; border: 3px solid #48bb78; border-top: 3px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
        <p style="color: #4a5568; margin: 0;">Loading segment types...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  showErrorState(error) {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; background: #fed7d7; border: 1px solid #fc8181; border-radius: 8px;">
        <div style="color: #e53e3e; font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h5 style="color: #742a2a; margin-bottom: 8px;">Failed to load segment types</h5>
        <p style="color: #822727; margin-bottom: 20px;">${error.message}</p>
        <button data-action="retry-load-segment-types" style="
          background: #e53e3e; 
          color: white; 
          border: none; 
          padding: 8px 16px; 
          border-radius: 6px; 
          cursor: pointer;
          font-size: 14px;
        ">
          🔄 Retry
        </button>
      </div>
    `;
  }

  displaySegmentTypes() {
  if (!this.container) return;

  if (this.segmentTypes.length === 0) {
    this.container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="color: #a0aec0; font-size: 48px; margin-bottom: 16px;">📋</div>
      <h4 style="color: #4a5568; margin-bottom: 8px;">No segment types configured yet</h4>
      <p style="color: #718096; margin-bottom: 20px;">Create your first segment type to start organizing travel services.</p>
      <button data-action="create-segment-type" style="
        background: #48bb78; 
        color: white; 
        border: none; 
        padding: 12px 24px; 
        border-radius: 8px; 
        font-weight: 500;
        cursor: pointer;
        font-size: 14px;
      ">
        ➕ Create First Segment Type
      </button>
    </div>
    `;
    return;
  }

  const segmentTypesHtml = `
    <table style="width: 100%; border-collapse: collapse; background: white;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="padding: 12px 16px; text-align: left; color: #495057; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #dee2e6;">TYPE NAME</th>
          <th style="padding: 12px 16px; text-align: left; color: #495057; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #dee2e6;">DISPLAY NAME</th>
          <th style="padding: 12px 16px; text-align: left; color: #495057; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #dee2e6;">DEFAULT TIMEZONE</th>
          <th style="padding: 12px 16px; text-align: center; color: #495057; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #dee2e6;">CLASSIFICATION RULES</th>
          <th style="padding: 12px 16px; text-align: center; color: #495057; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #dee2e6;">STATUS</th>
          <th style="padding: 12px 16px; text-align: center; color: #495057; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #dee2e6;">ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        ${this.segmentTypes.map(type => `
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 12px 16px; color: #212529;">${this.escapeHtml(type.name)}</td>
            <td style="padding: 12px 16px; color: #212529;">${this.escapeHtml(type.displayName || type.name)}</td>
            <td style="padding: 12px 16px; color: #212529;"><code style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">${this.escapeHtml(type.defaultTimezone || 'Not set')}</code></td>
            <td style="padding: 12px 16px; text-align: center; color: #212529;">${(type.classificationRules || []).length}</td>
            <td style="padding: 12px 16px; text-align: center;">
              <span style="color: ${type.isActive ? '#28a745' : '#6c757d'}; font-weight: 500;">
                ${type.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td style="padding: 12px 16px; text-align: center;">
              <button data-action="edit-segment-type" data-segment-name="${this.escapeHtml(type.name)}" style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-right: 4px;">Edit</button>
              <button data-action="view-segment-rules" data-segment-name="${this.escapeHtml(type.name)}" style="background: #6c757d; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  this.container.innerHTML = segmentTypesHtml;
}

  updateCounter() {
    const counterElement = document.getElementById('segmentTypeCount');
    if (counterElement) {
      counterElement.textContent = `${this.segmentTypes.length} types`;
    }

    // Update tab title if available
    const tabElement = document.querySelector('[data-tab="segment-types"]');
    if (tabElement) {
      const originalText = tabElement.textContent.split('(')[0].trim();
      tabElement.textContent = `${originalText} (${this.segmentTypes.length})`;
    }
  }

  showCreateModal() {
    // Trigger the create modal - this would integrate with existing modal system
    const modal = document.getElementById('createSegmentTypeModal');
    if (modal) {
      // Using Bootstrap modal if available
      if (window.bootstrap?.Modal) {
        new bootstrap.Modal(modal).show();
      } else if (window.$) {
        // Fallback to jQuery if Bootstrap 4
        $(modal).modal('show');
      } else {
        // Manual modal show
        modal.style.display = 'block';
        modal.classList.add('show');
      }
    } else {
      console.warn('⚠️ SegmentTypesManager: Create modal not found');
    }
  }

  async editSegmentType(name) {
    try {
      console.log('✏️ SegmentTypesManager: Editing segment type:', name);
      
      // Find the segment type data
      const segmentType = this.segmentTypes.find(type => type.name === name);
      if (!segmentType) {
        throw new Error(`Segment type "${name}" not found`);
      }

      // Populate edit modal with current data
      this.populateEditModal(segmentType);
      
      // Show edit modal
      const modal = document.getElementById('editSegmentTypeModal');
      if (modal) {
        if (window.bootstrap?.Modal) {
          new bootstrap.Modal(modal).show();
        } else if (window.$) {
          $(modal).modal('show');
        } else {
          modal.style.display = 'block';
          modal.classList.add('show');
        }
      }

    } catch (error) {
      console.error('❌ SegmentTypesManager: Edit failed:', error);
      this.showAlert('danger', `Failed to edit segment type: ${error.message}`);
    }
  }

  populateEditModal(segmentType) {
    // Populate form fields with current values
    const form = document.getElementById('editSegmentTypeForm');
    if (form) {
      const fields = {
        'edit-name': segmentType.name,
        'edit-displayName': segmentType.displayName,
        'edit-description': segmentType.description,
        'edit-defaultTimezone': segmentType.defaultTimezone,
        'edit-isActive': segmentType.isActive
      };

      for (const [fieldName, value] of Object.entries(fields)) {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field) {
          if (field.type === 'checkbox') {
            field.checked = value;
          } else {
            field.value = value || '';
          }
        }
      }
    }
  }

  async viewRules(segmentTypeName) {
    console.log('📋 SegmentTypesManager: Viewing rules for:', segmentTypeName);
    
    // Switch to classification rules tab and filter by segment type
    window.eventManager.trigger('show-classification-rules', { 
      filterBySegmentType: segmentTypeName 
    });
  }

  async createSegmentType(formData) {
    try {
      console.log('➕ SegmentTypesManager: Creating segment type');
      
      const response = await window.adminAPI.createSegmentType(formData);
      
      console.log('✅ SegmentTypesManager: Segment type created successfully');
      this.showAlert('success', 'Segment type created successfully');
      
      // Refresh the list
      await this.loadSegmentTypes(true);
      
      return response;

    } catch (error) {
      console.error('❌ SegmentTypesManager: Create failed:', error);
      this.showAlert('danger', `Failed to create segment type: ${error.message}`);
      throw error;
    }
  }

  async updateSegmentType(name, formData) {
    try {
      console.log('💾 SegmentTypesManager: Updating segment type:', name);
      
      const response = await window.adminAPI.updateSegmentType(name, formData);
      
      console.log('✅ SegmentTypesManager: Segment type updated successfully');
      this.showAlert('success', 'Segment type updated successfully');
      
      // Refresh the list
      await this.loadSegmentTypes(true);
      
      return response;

    } catch (error) {
      console.error('❌ SegmentTypesManager: Update failed:', error);
      this.showAlert('danger', `Failed to update segment type: ${error.message}`);
      throw error;
    }
  }

  showAlert(type, message) {
    // Create and show alert - integrate with existing alert system
    const alertContainer = document.getElementById('alertContainer') || document.body;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      ${message}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    `;
    
    alertContainer.prepend(alert);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  }

  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Debug and health check methods
  getDebugInfo() {
    return {
      component: 'SegmentTypesManager',
      initialized: !!this.container,
      isLoading: this.isLoading,
      dataCount: this.segmentTypes.length,
      lastError: this.lastError?.message,
      loadTime: this.loadStartTime ? Date.now() - this.loadStartTime : null
    };
  }

  // Manual refresh method for console debugging
  async refresh() {
    console.log('🔄 SegmentTypesManager: Manual refresh triggered');
    await this.loadSegmentTypes(true);
  }
}

// Initialize and attach to window for global access
window.segmentTypesManager = new SegmentTypesManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.segmentTypesManager.init();
  });
} else {
  window.segmentTypesManager.init();
}