// public/js/components/PromptsManager.js
// Complete PromptsManager - handles all AI prompt functionality

class PromptsManager {
  constructor() {
    this.container = null;
    this.data = [];
    this.loading = false;
    this.searchLoaded = false;
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    this.setupEventListeners();
    return this;
  }

  setupEventListeners() {
    // Load prompts
    window.eventManager.on('load-prompts', () => this.loadPrompts());
    
    // CRUD operations
    window.eventManager.on('edit-prompt', (id) => this.editPrompt(id));
    window.eventManager.on('toggle-prompt', (id, active) => this.togglePromptStatus(id, active));
    window.eventManager.on('delete-prompt', (id) => this.deletePrompt(id));
    window.eventManager.on('duplicate-prompt', (id) => this.duplicatePrompt(id));
    
    // Utility functions
    window.eventManager.on('clear-prompts-filters', () => this.clearPromptsFilters());
    window.eventManager.on('export-prompts', () => this.exportPrompts());

    // Form submissions
    window.eventManager.on('form-submit', (formId, event) => {
      if (formId === 'createPromptForm') {
        this.handleCreatePrompt(event);
      } else if (formId === 'editPromptForm') {
        this.handleEditPrompt(event);
      }
    });
  }

  async loadPrompts() {
    if (!this.container) return;

    console.log('🔍 LOAD: loadPrompts called');
    this.loading = true;
    this.container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading AI prompts...</div>';

    try {
      const prompts = await window.adminState.getOrFetch('prompts', async () => {
        return await window.adminAPI.getPrompts();
      });

      console.log('✅ loadPrompts: Received', prompts.length, 'prompts');
      this.data = prompts;
      this.displayPrompts(prompts);

      // Add search functionality after first load
      if (!this.searchLoaded) {
        setTimeout(() => {
          this.addPromptsSearchAndFilter();
          this.searchLoaded = true;
        }, 100);
      }

      return prompts;
    } catch (error) {
      console.error('Failed to load prompts:', error);
      this.container.innerHTML = `
        <div class="alert alert-danger">
          <strong>❌ Failed to load AI prompts</strong>
          <p>Error: ${error.message}</p>
          <p>Please ensure the admin API endpoints are properly configured.</p>
          <button class="btn-admin" onclick="window.promptsManager.loadPrompts()">Retry</button>
        </div>
      `;
    } finally {
      this.loading = false;
    }
  }

  displayPrompts(prompts) {
    if (!this.container) return;

    if (prompts.length === 0) {
      this.container.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <h4 style="color: #6c757d; margin-bottom: 15px;">No AI prompts configured</h4>
          <p style="color: #6c757d; margin-bottom: 20px;">Start by creating your first AI parsing prompt for travel emails.</p>
          <button class="btn-admin" data-action="show-modal" data-modal="createPromptModal">
            Create First Prompt
          </button>
        </div>
      `;
      return;
    }

    // Group prompts by category for better organization
    const promptsByCategory = prompts.reduce((acc, prompt) => {
      if (!acc[prompt.category]) acc[prompt.category] = [];
      acc[prompt.category].push(prompt);
      return acc;
    }, {});

    let tableHTML = `
      <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0;">AI Parsing Prompts (${prompts.length})</h3>
          <p style="margin: 5px 0 0 0; color: #6c757d;">Manage AI prompts for email parsing and classification</p>
        </div>
        <button class="btn-admin" data-action="show-modal" data-modal="createPromptModal">
          <strong>+</strong> New Prompt
        </button>
      </div>
    `;

    // Create tabbed interface for different categories
    const categories = Object.keys(promptsByCategory).sort();
    if (categories.length > 1) {
      tableHTML += `
        <div class="tab-navigation" style="margin-bottom: 20px;">
          ${categories.map((category, index) => `
            <button class="tab-button ${index === 0 ? 'active' : ''}" 
                    data-category="${category}" 
                    data-action="switch-prompt-category">
                ${category.charAt(0).toUpperCase() + category.slice(1)} 
                (${promptsByCategory[category].length})
              </button>
          `).join('')}
        </div>
      `;
    }

    // Create tables for each category
    categories.forEach((category, index) => {
      const isVisible = index === 0 ? '' : 'style="display: none;"';
      tableHTML += `
        <div class="prompt-category-section" data-category="${category}" ${isVisible}>
          <table class="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Version</th>
                <th>Status</th>
                <th>Usage</th>
                <th>Success Rate</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${promptsByCategory[category].map(prompt => `
                <tr class="prompt-row" data-prompt-id="${prompt.id}">
                  <td>
                    <div>
                      <code style="font-weight: bold;">${prompt.name}</code>
                      ${prompt.testGroup ? `<span class="badge badge-info">Test: ${prompt.testGroup}</span>` : ''}
                    </div>
                  </td>
                  <td>
                    <span class="type-badge type-${prompt.type}">${prompt.type}</span>
                  </td>
                  <td>v${prompt.version}</td>
                  <td>
                    <span class="status-badge ${prompt.isActive ? 'status-active' : 'status-inactive'}">
                      ${prompt.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>${prompt.usageCount || 0} uses</td>
                  <td>
                    ${prompt.successRate !== null
                      ? `<span class="success-rate ${this.getSuccessRateClass(prompt.successRate)}">${(prompt.successRate * 100).toFixed(1)}%</span>`
                      : '<span style="color: #6c757d;">No data</span>'
                    }
                  </td>
                  <td>${this.formatDate(prompt.updatedAt)}</td>
                  <td class="actions-cell">
                    <div class="action-buttons">
                      <button class="btn-admin btn-small" 
                              data-action="edit-prompt" 
                              data-id="${prompt.id}"
                              title="Edit Prompt">
                        ✏️ Edit
                      </button>
                      <button class="btn-admin btn-small ${prompt.isActive ? 'secondary' : 'primary'}" 
                              data-action="toggle-prompt" 
                              data-id="${prompt.id}" 
                              data-active="${!prompt.isActive}"
                              title="${prompt.isActive ? 'Deactivate' : 'Activate'} Prompt">
                        ${prompt.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                      </button>
                      <button class="btn-admin btn-small secondary" 
                              data-action="duplicate-prompt" 
                              data-id="${prompt.id}"
                              title="Duplicate Prompt">
                        📋 Duplicate
                      </button>
                      <button class="btn-admin btn-small danger" 
                              data-action="delete-prompt" 
                              data-id="${prompt.id}"
                              title="Delete Prompt">
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    this.container.innerHTML = tableHTML;
  }

  getSuccessRateClass(rate) {
    if (rate >= 0.9) return 'success-high';
    if (rate >= 0.7) return 'success-medium';
    return 'success-low';
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async editPrompt(promptId) {
    try {
      // Find prompt in our data first
      let prompt = this.data.find(p => p.id === promptId);
      
      if (!prompt) {
        prompt = await window.adminAPI.getPrompt(promptId);
      }

      if (!prompt) {
        window.showAlert('danger', 'Prompt not found');
        return;
      }

      this.showEditPromptModal(prompt);
    } catch (error) {
      console.error('Error in editPrompt:', error);
      window.showAlert('danger', 'Failed to load prompt data for editing');
    }
  }

  showEditPromptModal(prompt) {
    // Remove existing modal
    const existingModal = document.getElementById('editPromptModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modalHTML = `
      <div class="modal" id="editPromptModal" style="display: flex;">
        <div class="modal-backdrop" data-action="hide-modal" data-modal="editPromptModal"></div>
        <div class="modal-content large-modal">
          <div class="modal-header">
            <h3>Edit AI Prompt: ${prompt.name}</h3>
            <button class="modal-close" data-action="hide-modal" data-modal="editPromptModal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="editPromptForm">
              <input type="hidden" id="editPromptId" name="id" value="${prompt.id}">
              
              <div class="form-row">
                <div class="form-group">
                  <label for="editPromptName">Prompt Name</label>
                  <input type="text" id="editPromptName" name="name" value="${prompt.name}" readonly>
                  <small>Name cannot be changed. Create a new prompt if needed.</small>
                </div>
                <div class="form-group">
                  <label for="editPromptVersion">Version</label>
                  <input type="number" id="editPromptVersion" name="version" value="${prompt.version}" min="1">
                </div>
              </div>

              <div class="form-group">
                <label for="editPromptTestGroup">Test Group</label>
                <input type="text" id="editPromptTestGroup" name="testGroup" value="${prompt.testGroup || ''}">
              </div>
              
              <div class="form-group">
                <label for="editPromptText">Prompt Text *</label>
                <textarea id="editPromptText" name="prompt" required rows="15">${prompt.prompt}</textarea>
              </div>

              <div class="form-group">
                <label>
                  <input type="checkbox" id="editPromptActive" name="isActive" ${prompt.isActive ? 'checked' : ''}> 
                  Set as active prompt
                </label>
              </div>

              <div class="modal-actions">
                <button type="button" data-action="hide-modal" data-modal="editPromptModal" class="btn-admin secondary">
                  Cancel
                </button>
                <button type="submit" class="btn-admin primary">
                  Update Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  async togglePromptStatus(promptId, newActiveState) {
    try {
      await window.adminAPI.updatePrompt(promptId, { isActive: newActiveState });
      window.showAlert('success', `Prompt ${newActiveState ? 'activated' : 'deactivated'} successfully`);
      
      // Clear cache and reload
      window.adminState.clear('prompts');
      this.loadPrompts();
    } catch (error) {
      console.error('Error toggling prompt status:', error);
      window.showAlert('danger', 'Failed to update prompt status');
    }
  }

  async duplicatePrompt(promptId) {
    try {
      await window.adminAPI.duplicatePrompt(promptId);
      window.showAlert('success', 'Prompt duplicated successfully');
      
      // Clear cache and reload
      window.adminState.clear('prompts');
      this.loadPrompts();
    } catch (error) {
      console.error('Error duplicating prompt:', error);
      window.showAlert('danger', 'Failed to duplicate prompt');
    }
  }

  async deletePrompt(promptId) {
    if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      return;
    }

    try {
      await window.adminAPI.deletePrompt(promptId);
      window.showAlert('success', 'Prompt deleted successfully');
      
      // Clear cache and reload
      window.adminState.clear('prompts');
      this.loadPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      window.showAlert('danger', 'Failed to delete prompt');
    }
  }

  async handleCreatePrompt(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
      name: formData.get('name'),
      type: formData.get('type'),
      category: formData.get('category'),
      version: parseInt(formData.get('version')) || 1,
      prompt: formData.get('prompt'),
      testGroup: formData.get('testGroup') || null,
      isActive: formData.get('isActive') === 'on',
    };

    try {
      await window.adminAPI.createPrompt(data);
      
      window.eventManager.hideModal('createPromptModal');
      event.target.reset();
      window.showAlert('success', 'AI prompt created successfully');
      
      // Clear cache and reload
      window.adminState.clear('prompts');
      this.loadPrompts();
    } catch (error) {
      console.error('Error creating prompt:', error);
      window.showAlert('danger', error.message || 'Failed to create prompt');
    }
  }

  async handleEditPrompt(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const promptId = formData.get('id');

    try {
      const data = {
        version: parseInt(formData.get('version')),
        prompt: formData.get('prompt'),
        testGroup: formData.get('testGroup') || null,
        isActive: formData.get('isActive') === 'on',
      };

      await window.adminAPI.updatePrompt(promptId, data);
      
      window.eventManager.hideModal('editPromptModal');
      window.showAlert('success', 'AI prompt updated successfully');
      
      // Clear cache and reload
      window.adminState.clear('prompts');
      this.loadPrompts();
    } catch (error) {
      console.error('Error updating prompt:', error);
      window.showAlert('danger', error.message || 'Failed to update prompt');
    }
  }

  addPromptsSearchAndFilter() {
    const searchHTML = `
      <div class="prompts-search-filter" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
        <div class="search-row" style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
          <div class="search-group">
            <input type="text" id="promptSearch" placeholder="Search prompts..." 
                   style="width: 300px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          <div class="filter-group" style="display: flex; gap: 10px;">
            <select id="statusFilter" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <div class="action-group">
            <button class="btn-admin btn-small secondary" data-action="clear-prompts-filters">
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    `;

    const existingSearch = this.container.parentNode.querySelector('.prompts-search-filter');
    if (!existingSearch) {
      this.container.insertAdjacentHTML('beforebegin', searchHTML);
      this.setupSearchHandlers();
    }
  }

  setupSearchHandlers() {
    const searchInput = document.getElementById('promptSearch');
    const statusFilter = document.getElementById('statusFilter');

    let searchTimeout;
    const handleSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.filterPrompts(), 300);
    };

    if (searchInput) searchInput.addEventListener('input', handleSearch);
    if (statusFilter) statusFilter.addEventListener('change', () => this.filterPrompts());
  }

  filterPrompts() {
    const searchTerm = document.getElementById('promptSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    const promptRows = document.querySelectorAll('.prompt-row');
    let visibleCount = 0;

    promptRows.forEach(row => {
      const promptName = row.querySelector('code')?.textContent.toLowerCase() || '';
      const isActive = row.querySelector('.status-active') !== null;

      let visible = true;

      if (searchTerm && !promptName.includes(searchTerm)) {
        visible = false;
      }

      if (statusFilter === 'active' && !isActive) {
        visible = false;
      } else if (statusFilter === 'inactive' && isActive) {
        visible = false;
      }

      row.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });
  }

  clearPromptsFilters() {
    const searchInput = document.getElementById('promptSearch');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';

    document.querySelectorAll('.prompt-row').forEach(row => {
      row.style.display = '';
    });

    window.showAlert('info', 'Filters cleared');
  }

  async exportPrompts() {
    try {
      const prompts = this.data.length ? this.data : await window.adminAPI.getPrompts();
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        prompts: prompts,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      window.showAlert('success', 'Prompts exported successfully');
    } catch (error) {
      console.error('Error exporting prompts:', error);
      window.showAlert('danger', 'Failed to export prompts');
    }
  }
}

// Create global instance
window.promptsManager = new PromptsManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.promptsManager.init('promptsContainer');
});