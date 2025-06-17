// public/js/components/SegmentTypesManager.js
class SegmentTypesManager {
  constructor() {
    this.container = null;
    this.data = [];
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    this.setupEventListeners();
    return this;
  }

  setupEventListeners() {
    window.eventManager.on('load-segment-types', () => this.loadSegmentTypes());
    window.eventManager.on('edit-segment-type', (name) => this.editSegmentType(name));
    window.eventManager.on('toggle-segment-type', (name, active) => this.toggleSegmentType(name, active));
    window.eventManager.on('form-submit', (formId, event) => {
      if (formId === 'createSegmentTypeForm') this.handleCreateSegmentType(event);
      if (formId === 'editSegmentTypeForm') this.handleEditSegmentType(event);
    });
  }

  async loadSegmentTypes() {
    if (!this.container) return;
    
    this.container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading segment types...</div>';

    try {
      const segmentTypes = await window.adminState.getOrFetch('segmentTypes', async () => {
        return await window.adminAPI.getSegmentTypes();
      });

      this.data = segmentTypes;
      this.displaySegmentTypes(segmentTypes);
      
      const countElement = document.getElementById('segmentTypeCount');
      if (countElement) countElement.textContent = `${segmentTypes.length} types`;

    } catch (error) {
      console.error('Error loading segment types:', error);
      this.container.innerHTML = `
        <div class="alert alert-danger">
          ❌ Could not load segment types. Admin system may not be set up yet.
        </div>
      `;
    }
  }

  displaySegmentTypes(segmentTypes) {
    if (!this.container) return;

    if (segmentTypes.length === 0) {
      this.container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6c757d;">No segment types configured</div>';
      return;
    }

    const tableHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Display Name</th>
            <th>Status</th>
            <th>Default Timezone</th>
            <th>Rules</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${segmentTypes.map(type => `
            <tr>
              <td><code>${type.name}</code></td>
              <td>${type.display_name || type.displayName}</td>
              <td>
                <span class="status-badge ${type.is_active ? 'status-active' : 'status-inactive'}">
                  ${type.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>${type.default_timezone || type.defaultTimezone}</td>
              <td>${type.classificationRules?.length || 0}</td>
              <td>
                <button class="btn-admin btn-small" data-action="edit-segment-type" data-name="${type.name}">Edit</button>
                <button class="btn-admin btn-small secondary" data-action="toggle-segment-type" data-name="${type.name}" data-active="${!type.is_active}">
                  ${type.is_active ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    this.container.innerHTML = tableHTML;
  }

  async editSegmentType(name) {
    const segmentType = this.data.find(type => type.name === name);
    if (!segmentType) {
      window.showAlert('danger', `Segment type "${name}" not found`);
      return;
    }
    this.showEditModal(segmentType);
  }

  async toggleSegmentType(name, active) {
    try {
      await window.adminAPI.updateSegmentType(name, { isActive: active });
      window.showAlert('success', `Segment type ${active ? 'enabled' : 'disabled'} successfully`);
      window.adminState.clear('segmentTypes');
      this.loadSegmentTypes();
    } catch (error) {
      window.showAlert('danger', 'Failed to update segment type');
    }
  }

  showEditModal(segmentType) {
    // Simplified modal creation
    console.log('Edit modal for:', segmentType.name);
    window.showAlert('info', `Edit functionality for ${segmentType.name} - Full implementation in progress`);
  }

  async handleCreateSegmentType(event) {
    event.preventDefault();
    // Form handling implementation
    window.showAlert('info', 'Create segment type functionality - Implementation in progress');
  }

  async handleEditSegmentType(event) {
    event.preventDefault();
    // Form handling implementation  
    window.showAlert('info', 'Edit segment type functionality - Implementation in progress');
  }
}

window.segmentTypesManager = new SegmentTypesManager();
document.addEventListener('DOMContentLoaded', () => {
  window.segmentTypesManager.init('segmentTypesContainer');
});
