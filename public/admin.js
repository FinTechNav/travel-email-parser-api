// =====================================================================
// CSP-COMPLIANT ADMIN PANEL JAVASCRIPT - COMPLETE VERSION
// =====================================================================

// =====================================================================
// TAB MANAGEMENT
// =====================================================================

function showTab(tabName, clickedButton) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(`${tabName}-tab`).classList.add('active');
  clickedButton.classList.add('active');
  
  // Load admin content if admin tab selected
  if (tabName === 'admin') {
    loadModals();
  }
}

// =====================================================================
// MODAL MANAGEMENT
// =====================================================================

function loadModals() {
  // Load modals into the container
  fetch('modals.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('modals-container').innerHTML = html;
      setupModalEventListeners();
    })
    .catch(error => {
      console.error('Error loading modals:', error);
      // Create basic modals HTML inline if fetch fails
      createInlineModals();
      setupModalEventListeners();
    });
}

function createInlineModals() {
  // If modals.html can't be fetched, create basic modal structure
  const modalsContainer = document.getElementById('modals-container');
  modalsContainer.innerHTML = `
    <!-- Basic modal structure will be created here if needed -->
    <div id="createSegmentTypeModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="createSegmentTypeModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create Segment Type</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="createSegmentTypeModal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Modal functionality requires full admin system setup.</p>
        </div>
      </div>
    </div>
    
    <div id="createRuleModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="createRuleModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create Classification Rule</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="createRuleModal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Modal functionality requires full admin system setup.</p>
        </div>
      </div>
    </div>
    
    <div id="createPromptModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="createPromptModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create AI Prompt</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="createPromptModal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Modal functionality requires full admin system setup.</p>
        </div>
      </div>
    </div>
    
    <div id="testClassificationModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="testClassificationModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Test Email Classification</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="testClassificationModal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Classification testing requires full admin system setup.</p>
        </div>
      </div>
    </div>
  `;
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// =====================================================================
// EVENT LISTENERS SETUP
// =====================================================================

function setupModalEventListeners() {
  // Handle all modal hide actions
  document.querySelectorAll('[data-action="hide-modal"]').forEach(element => {
    element.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const modalId = this.getAttribute('data-modal');
      hideModal(modalId);
    });
  });

  // Setup form event listeners if modals exist
  setupFormEventListeners();
}

function setupFormEventListeners() {
  // Create Segment Type Form
  const createSegmentForm = document.getElementById('createSegmentTypeForm');
  if (createSegmentForm) {
    createSegmentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        displayName: formData.get('displayName'),
        description: formData.get('description'),
        defaultTimezone: formData.get('defaultTimezone'),
        parsingPrompt: formData.get('parsingPrompt')
      };

      try {
        const response = await fetch('/api/v1/admin/segment-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          hideModal('createSegmentTypeModal');
          e.target.reset();
          showAlert('success', 'Segment type created successfully');
          loadSegmentTypes();
        } else {
          const error = await response.json();
          showAlert('danger', error.error || 'Failed to create segment type');
        }
      } catch (error) {
        showAlert('danger', 'Failed to create segment type - admin system may not be set up');
      }
    });
  }

  // Create Classification Rule Form
  const createRuleForm = document.getElementById('createRuleForm');
  if (createRuleForm) {
    createRuleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = {
        ruleName: formData.get('ruleName'),
        segmentType: formData.get('segmentType'),
        ruleType: formData.get('ruleType'),
        pattern: formData.get('pattern'),
        priority: parseInt(formData.get('priority')) || 10,
        isActive: formData.get('isActive') === 'on'
      };

      try {
        const response = await fetch('/api/v1/admin/classification-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          hideModal('createRuleModal');
          e.target.reset();
          showAlert('success', 'Classification rule created successfully');
          loadClassificationRules();
        } else {
          const error = await response.json();
          showAlert('danger', error.error || 'Failed to create rule');
        }
      } catch (error) {
        showAlert('danger', 'Failed to create rule - admin system may not be set up');
      }
    });
  }

  // Create Prompt Form
  const createPromptForm = document.getElementById('createPromptForm');
  if (createPromptForm) {
    createPromptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        type: formData.get('type'),
        category: formData.get('category'),
        version: parseInt(formData.get('version')) || 1,
        prompt: formData.get('prompt'),
        isActive: formData.get('isActive') === 'on'
      };

      try {
        const response = await fetch('/api/admin/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          hideModal('createPromptModal');
          e.target.reset();
          showAlert('success', 'AI prompt created successfully');
          loadPrompts();
        } else {
          const error = await response.json();
          showAlert('danger', error.error || 'Failed to create prompt');
        }
      } catch (error) {
        showAlert('danger', 'Failed to create prompt - admin system may not be set up');
      }
    });
  }

  // Test Classification Form
  const testClassificationForm = document.getElementById('testClassificationForm');
  if (testClassificationForm) {
    testClassificationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = {
        subject: formData.get('subject'),
        sender: formData.get('sender'),
        content: formData.get('content')
      };

      try {
        const response = await fetch('/api/admin/test-classification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await response.json();
        const resultsDiv = document.getElementById('testResults');
        
        if (response.ok) {
          resultsDiv.innerHTML = `
            <div class="alert alert-success">
              <h5>✅ Classification Result:</h5>
              <p><strong>Detected Type:</strong> ${result.segmentType || 'Unknown'}</p>
              <p><strong>Confidence:</strong> ${result.confidence || 'N/A'}</p>
              <p><strong>Rules Matched:</strong> ${result.rulesMatched?.join(', ') || 'None'}</p>
            </div>
          `;
        } else {
          resultsDiv.innerHTML = `
            <div class="alert alert-danger">
              <h5>❌ Test Failed:</h5>
              <p>${result.error || 'Unable to test classification'}</p>
            </div>
          `;
        }
      } catch (error) {
        const resultsDiv = document.getElementById('testResults');
        resultsDiv.innerHTML = `
          <div class="alert alert-danger">
            <h5>❌ Error:</h5>
            <p>Admin system may not be set up yet</p>
          </div>
        `;
      }
    });
  }
}

// =====================================================================
// ADMIN ACTION HANDLERS
// =====================================================================

function setupAdminActionListeners() {
  // Handle all admin action buttons
  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const action = this.getAttribute('data-action');
      
      switch(action) {
        case 'show-create-segment-modal':
          showModal('createSegmentTypeModal');
          break;
        case 'show-create-rule-modal':
          showModal('createRuleModal');
          break;
        case 'show-create-prompt-modal':
          showModal('createPromptModal');
          break;
        case 'load-segment-types':
          loadSegmentTypes();
          break;
        case 'load-classification-rules':
          loadClassificationRules();
          break;
        case 'load-prompts':
          loadPrompts();
          break;
        case 'fix-ps-timezone':
          fixPSTimezone();
          break;
        case 'reprocess-all-segments':
          reprocessAllSegments();
          break;
        case 'check-system-status':
          checkSystemStatus();
          break;
        case 'test-classification-rules':
          showModal('testClassificationModal');
          break;
        case 'hide-modal':
          const modalId = this.getAttribute('data-modal');
          hideModal(modalId);
          break;
      }
    });
  });
}

// =====================================================================
// SEGMENT TYPES MANAGEMENT
// =====================================================================

async function loadSegmentTypes() {
  const container = document.getElementById('segmentTypesContainer');
  container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading segment types...</div>';

  try {
    const response = await fetch('/api/v1/admin/segment-types');
    if (response.ok) {
      const segmentTypes = await response.json();
      displaySegmentTypes(segmentTypes);
      document.getElementById('segmentTypeCount').textContent = `${segmentTypes.length} types`;
    } else {
      throw new Error('Failed to load segment types');
    }
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger">
        ❌ Could not load segment types.<br>
        Admin system may not be set up yet.<br>
        <small>Run: <code>node scripts/setup-admin-system-fixed.js</code></small>
      </div>
    `;
  }
}

function displaySegmentTypes(segmentTypes) {
  const container = document.getElementById('segmentTypesContainer');
  
  if (segmentTypes.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6c757d;">No segment types configured</div>';
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
  
  container.innerHTML = tableHTML;
  
  // Add event listeners to the new buttons
  setupTableActionListeners();
}

// =====================================================================
// CLASSIFICATION RULES MANAGEMENT
// =====================================================================

async function loadClassificationRules() {
  const container = document.getElementById('classificationRulesContainer');
  container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading classification rules...</div>';

  try {
    const response = await fetch('/api/v1/admin/segment-types');
    if (response.ok) {
      const segmentTypes = await response.json();
      const allRules = segmentTypes.flatMap(type => 
        (type.classificationRules || []).map(rule => ({ ...rule, segmentType: type.name }))
      );
      
      // DEDUPLICATE by rule ID
      const uniqueRules = allRules.filter((rule, index, self) => 
        index === self.findIndex(r => r.id === rule.id)
      );
      
      displayClassificationRules(uniqueRules);
      document.getElementById('ruleCount').textContent = `${uniqueRules.length} rules`;
    } else {
      throw new Error('Failed to load rules');
    }
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger">
        ❌ Could not load classification rules. Admin system may not be set up yet.
      </div>
    `;
  }
}

function displayClassificationRules(rules) {
  const container = document.getElementById('classificationRulesContainer');
  
  if (rules.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6c757d;">No classification rules configured</div>';
    return;
  }

  const tableHTML = `
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
            <td><code>${rule.segmentType}</code></td>
            <td>${rule.type}</td>
            <td><code>${rule.pattern}</code></td>
            <td>${rule.priority}</td>
            <td>
              <span class="status-badge ${rule.is_active ? 'status-active' : 'status-inactive'}">
                ${rule.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <button class="btn-admin btn-small" data-action="edit-rule" data-id="${rule.id}">Edit</button>
              <button class="btn-admin btn-small secondary" data-action="delete-rule" data-id="${rule.id}">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
  setupTableActionListeners();
}

// =====================================================================
// PROMPTS MANAGEMENT
// =====================================================================

async function loadPrompts() {
  const container = document.getElementById('promptsContainer');
  container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading AI prompts...</div>';

  try {
    const response = await fetch('/api/admin/prompts');
    if (response.ok) {
      const prompts = await response.json();
      displayPrompts(prompts);
    } else {
      throw new Error('Failed to load prompts');
    }
  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger">
        ❌ Could not load AI prompts. Admin system may not be set up yet.
      </div>
    `;
  }
}

function displayPrompts(prompts) {
  const container = document.getElementById('promptsContainer');
  
  if (prompts.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6c757d;">No AI prompts configured</div>';
    return;
  }

  const tableHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Type</th>
          <th>Version</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${prompts.map(prompt => `
          <tr>
            <td><code>${prompt.name}</code></td>
            <td>${prompt.category}</td>
            <td>${prompt.type}</td>
            <td>v${prompt.version}</td>
            <td>
              <span class="status-badge ${prompt.isActive ? 'status-active' : 'status-inactive'}">
                ${prompt.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <button class="btn-admin btn-small" data-action="edit-prompt" data-id="${prompt.id}">Edit</button>
              <button class="btn-admin btn-small secondary" data-action="toggle-prompt" data-id="${prompt.id}" data-active="${!prompt.isActive}">
                ${prompt.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
  setupTableActionListeners();
}

// =====================================================================
// TABLE ACTION HANDLERS
// =====================================================================

function setupTableActionListeners() {
  // Handle all table action buttons
  document.querySelectorAll('[data-action^="edit-"], [data-action^="delete-"], [data-action^="toggle-"]').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const action = this.getAttribute('data-action');
      const id = this.getAttribute('data-id');
      const name = this.getAttribute('data-name');
      const active = this.getAttribute('data-active') === 'true';
      
      switch(action) {
        case 'edit-segment-type':
          editSegmentType(name);
          break;
        case 'toggle-segment-type':
          toggleSegmentType(name, active);
          break;
        case 'edit-rule':
          editRule(id);
          break;
        case 'delete-rule':
          deleteRule(id);
          break;
        case 'edit-prompt':
          editPrompt(id);
          break;
        case 'toggle-prompt':
          togglePrompt(id, active);
          break;
      }
    });
  });
}

// =====================================================================
// SYSTEM ACTIONS
// =====================================================================

async function fixPSTimezone() {
  try {
    showAlert('info', 'Fixing PS timezone issues...');
    const response = await fetch('/api/admin/fix-ps-timezone', { method: 'POST' });
    const result = await response.json();
    
    if (response.ok) {
      showAlert('success', `✅ Fixed ${result.updatedCount} PS segments`);
    } else {
      showAlert('danger', result.error || 'Failed to fix PS timezone issues');
    }
  } catch (error) {
    showAlert('danger', 'Could not connect to admin system');
  }
}

async function reprocessAllSegments() {
  if (!confirm('This will reprocess ALL travel segments. Are you sure?')) return;
  
  try {
    showAlert('info', 'Starting segment reprocessing...');
    const response = await fetch('/api/admin/reprocess-segments', { method: 'POST' });
    const result = await response.json();
    
    if (response.ok) {
      showAlert('success', `✅ Reprocessing started for ${result.segmentCount} segments`);
    } else {
      showAlert('danger', result.error || 'Failed to start reprocessing');
    }
  } catch (error) {
    showAlert('danger', 'Could not connect to admin system');
  }
}

async function checkSystemStatus() {
  try {
    showAlert('info', 'Checking system status...');
    const response = await fetch('/api/admin/system-status');
    const status = await response.json();
    
    const resultsDiv = document.getElementById('actionResults');
    resultsDiv.innerHTML = `
      <div class="alert alert-info">
        <h5>📊 System Status Report</h5>
        <strong>Database:</strong> ${status.database ? '✅ Connected' : '❌ Disconnected'}<br>
        <strong>Email Processor:</strong> ${status.emailProcessor ? '✅ Active' : '❌ Inactive'}<br>
        <strong>Total Segments:</strong> ${status.totalSegments || 0}<br>
        <strong>Total Users:</strong> ${status.totalUsers || 0}<br>
        <strong>Segment Types:</strong> ${status.segmentTypes || 0}<br>
        <strong>Classification Rules:</strong> ${status.classificationRules || 0}<br>
        ${status.psIssue ? `<br>⚠️ <strong>PS Issue:</strong> ${status.psIssue}` : ''}
        <br><br>
        <em>Status checked at: ${new Date().toLocaleTimeString()}</em>
      </div>
    `;
  } catch (error) {
    const resultsDiv = document.getElementById('actionResults');
    resultsDiv.innerHTML = `
      <div class="alert alert-danger">
        ❌ Could not check system status. Admin system may not be set up.
      </div>
    `;
  }
}

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

function showAlert(type, message) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  const container = document.querySelector('.admin-panel');
  if (container) {
    container.insertBefore(alert, container.firstChild);
    
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  }
}

// =====================================================================
// PLACEHOLDER EDIT FUNCTIONS (for full implementation)
// =====================================================================

function editSegmentType(name) {
  showAlert('info', `Edit segment type: ${name} (requires full admin system implementation)`);
}

function toggleSegmentType(name, active) {
  showAlert('info', `Toggle segment type: ${name} to ${active ? 'active' : 'inactive'} (requires full admin system implementation)`);
}

function editRule(id) {
  showAlert('info', `Edit rule ID: ${id} (requires full admin system implementation)`);
}

function deleteRule(id) {
  if (confirm('Are you sure you want to delete this classification rule?')) {
    showAlert('info', `Delete rule ID: ${id} (requires full admin system implementation)`);
  }
}

function editPrompt(id) {
  showAlert('info', `Edit prompt ID: ${id} (requires full admin system implementation)`);
}

function togglePrompt(id, active) {
  showAlert('info', `Toggle prompt ID: ${id} to ${active ? 'active' : 'inactive'} (requires full admin system implementation)`);
}

// =====================================================================
// INITIALIZATION
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Setup tab navigation event listeners
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function(e) {
      const tabName = this.getAttribute('data-tab');
      showTab(tabName, this);
    });
  });
  
  // Setup admin action listeners
  setupAdminActionListeners();
  
  // Initialize admin content if starting on admin tab
  if (window.location.hash === '#admin') {
    const adminButton = document.querySelector('[data-tab="admin"]');
    if (adminButton) {
      adminButton.click();
    }
  }
});