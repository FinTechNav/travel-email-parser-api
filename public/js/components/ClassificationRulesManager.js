// public/js/components/ClassificationRulesManager.js
class ClassificationRulesManager {
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
    window.eventManager.on('load-classification-rules', () => this.loadClassificationRules());
    window.eventManager.on('edit-rule', (id) => this.editRule(id));
    window.eventManager.on('delete-rule', (id) => this.deleteRule(id));
  }

  async loadClassificationRules() {
    if (!this.container) return;

    this.container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading classification rules...</div>';

    try {
      // Since admin routes don't exist yet, show placeholder data
      const rules = [
        {
          id: '1',
          name: 'private_terminal_sender',
          segment_type_name: 'private_terminal',
          type: 'sender',
          pattern: '@privateterminal.com',
          priority: 10,
          is_active: true
        },
        {
          id: '2', 
          name: 'flight_confirmation',
          segment_type_name: 'flight',
          type: 'subject',
          pattern: 'flight confirmation',
          priority: 8,
          is_active: true
        },
        {
          id: '3',
          name: 'hotel_booking',
          segment_type_name: 'hotel', 
          type: 'keyword',
          pattern: 'hotel reservation',
          priority: 7,
          is_active: true
        }
      ];

      this.data = rules;
      this.displayClassificationRules(rules);
      
      const countElement = document.getElementById('ruleCount');
      if (countElement) countElement.textContent = `${rules.length} rules`;

    } catch (error) {
      console.error('Error loading classification rules:', error);
      this.container.innerHTML = `
        <div class="alert alert-info">
          📝 Classification Rules (Placeholder Data)
          <p>Admin API endpoints not yet implemented. Showing sample data.</p>
        </div>
      `;
    }
  }

  displayClassificationRules(rules) {
    if (!this.container) return;

    const tableHTML = `
      <div style="margin-bottom: 15px;">
        <span style="color: #6c757d; font-size: 0.9rem;">📝 Sample data - Admin endpoints pending</span>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Rule Name</th>
            <th>Segment Type</th>
            <th>Type</th>
            <th>Pattern</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rules.map(rule => `
            <tr>
              <td>${rule.name}</td>
              <td><code>${rule.segment_type_name}</code></td>
              <td>${rule.type}</td>
              <td><code>${rule.pattern}</code></td>
              <td>${rule.priority}</td>
              <td>
                <span class="status-badge ${rule.is_active ? 'status-active' : 'status-inactive'}">
                  ${rule.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <button class="btn-admin btn-small" onclick="window.showAlert('info', 'Edit functionality requires admin API endpoints')">Edit</button>
                <button class="btn-admin btn-small secondary" onclick="window.showAlert('info', 'Delete functionality requires admin API endpoints')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    this.container.innerHTML = tableHTML;
  }

  async editRule(id) {
    window.showAlert('info', 'Edit functionality requires admin API endpoints to be implemented');
  }

  async deleteRule(id) {
    window.showAlert('info', 'Delete functionality requires admin API endpoints to be implemented');
  }
}

window.classificationRulesManager = new ClassificationRulesManager();
document.addEventListener('DOMContentLoaded', () => {
  window.classificationRulesManager.init('classificationRulesContainer');
});