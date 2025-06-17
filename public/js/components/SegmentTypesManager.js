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
  }

  async loadSegmentTypes() {
    if (!this.container) return;
    
    this.container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading segment types...</div>';

    try {
      // Since admin routes don't exist yet, show placeholder data
      const segmentTypes = [
        {
          name: 'flight',
          display_name: 'Flight',
          is_active: true,
          default_timezone: 'America/New_York',
          classificationRules: []
        },
        {
          name: 'hotel', 
          display_name: 'Hotel',
          is_active: true,
          default_timezone: 'America/New_York',
          classificationRules: []
        },
        {
          name: 'car_rental',
          display_name: 'Car Rental', 
          is_active: true,
          default_timezone: 'America/New_York',
          classificationRules: []
        },
        {
          name: 'private_terminal',
          display_name: 'Private Terminal',
          is_active: true,
          default_timezone: 'America/New_York', 
          classificationRules: []
        }
      ];

      this.data = segmentTypes;
      this.displaySegmentTypes(segmentTypes);
      
      const countElement = document.getElementById('segmentTypeCount');
      if (countElement) countElement.textContent = `${segmentTypes.length} types`;

    } catch (error) {
      console.error('Error loading segment types:', error);
      this.container.innerHTML = `
        <div class="alert alert-info">
          📝 Segment Types (Placeholder Data)
          <p>Admin API endpoints not yet implemented. Showing sample data.</p>
        </div>
      `;
    }
  }

  displaySegmentTypes(segmentTypes) {
    if (!this.container) return;

    const tableHTML = `
      <div style="margin-bottom: 15px;">
        <span style="color: #6c757d; font-size: 0.9rem;">📝 Sample data - Admin endpoints pending</span>
      </div>
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
                <button class="btn-admin btn-small" onclick="window.showAlert('info', 'Edit functionality requires admin API endpoints')">Edit</button>
                <button class="btn-admin btn-small secondary" onclick="window.showAlert('info', 'Toggle functionality requires admin API endpoints')">
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
    window.showAlert('info', 'Edit functionality requires admin API endpoints to be implemented');
  }

  async toggleSegmentType(name, active) {
    window.showAlert('info', 'Toggle functionality requires admin API endpoints to be implemented');
  }
}

window.segmentTypesManager = new SegmentTypesManager();
document.addEventListener('DOMContentLoaded', () => {
  window.segmentTypesManager.init('segmentTypesContainer');
});