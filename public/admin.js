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
// COMPLETE ADMIN SYSTEM IMPLEMENTATION
// =====================================================================

// =====================================================================
// 1. COMPLETE EDIT FUNCTIONS
// =====================================================================

async function editSegmentType(name) {
  try {
    // Fetch current data
    const response = await fetch('/api/v1/admin/segment-types');
    if (!response.ok) throw new Error('Failed to load segment types');
    
    const segmentTypes = await response.json();
    const segmentType = segmentTypes.find(type => type.name === name);
    
    if (!segmentType) {
      showAlert('danger', `Segment type "${name}" not found`);
      return;
    }

    showEditSegmentTypeModal(segmentType);
    
  } catch (error) {
    console.error('Error loading segment type for editing:', error);
    showAlert('danger', 'Failed to load segment type data');
  }
}

async function editRule(id) {
  try {
    // For now, show inline edit prompt (can be enhanced with modal later)
    const newPattern = prompt('Enter new pattern for this rule:');
    if (!newPattern) return;
    
    const response = await fetch(`/api/v1/admin/classification-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern: newPattern })
    });

    if (response.ok) {
      showAlert('success', 'Rule updated successfully');
      loadClassificationRules(); // Refresh the table
    } else {
      const error = await response.json();
      showAlert('danger', error.error || 'Failed to update rule');
    }
  } catch (error) {
    showAlert('danger', 'Failed to update rule');
  }
}

async function deleteRule(id) {
  if (!confirm('Are you sure you want to delete this classification rule?')) return;
  
  try {
    const response = await fetch(`/api/v1/admin/classification-rules/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showAlert('success', 'Rule deleted successfully');
      loadClassificationRules(); // Refresh the table
    } else {
      const error = await response.json();
      showAlert('danger', error.error || 'Failed to delete rule');
    }
  } catch (error) {
    showAlert('danger', 'Failed to delete rule');
  }
}

async function editPrompt(id) {
  try {
    // Get current prompt data
    const response = await fetch('/api/v1/admin/prompts');
    if (!response.ok) throw new Error('Failed to load prompts');
    
    const prompts = await response.json();
    const prompt = prompts.find(p => p.id === parseInt(id));
    
    if (!prompt) {
      showAlert('danger', 'Prompt not found');
      return;
    }

    showEditPromptModal(prompt);
    
  } catch (error) {
    showAlert('danger', 'Failed to load prompt data');
  }
}

async function togglePrompt(id, active) {
  try {
    const response = await fetch(`/api/v1/admin/prompts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: active })
    });

    if (response.ok) {
      showAlert('success', `Prompt ${active ? 'activated' : 'deactivated'} successfully`);
      loadPrompts(); // Refresh the table
    } else {
      const error = await response.json();
      showAlert('danger', error.error || 'Failed to update prompt');
    }
  } catch (error) {
    showAlert('danger', 'Failed to update prompt');
  }
}

async function toggleSegmentType(name, active) {
  try {
    const response = await fetch(`/api/v1/admin/segment-types/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: active })
    });

    if (response.ok) {
      showAlert('success', `Segment type ${active ? 'enabled' : 'disabled'} successfully`);
      loadSegmentTypes(); // Refresh the table
    } else {
      const error = await response.json();
      showAlert('danger', error.error || 'Failed to update segment type');
    }
  } catch (error) {
    showAlert('danger', 'Failed to update segment type');
  }
}

// =====================================================================
// 2. COMPLETE MODAL IMPLEMENTATIONS
// =====================================================================

function showEditSegmentTypeModal(segmentType) {
  const modalHTML = `
    <div class="modal" id="editSegmentTypeModal" style="display: flex;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="editSegmentTypeModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edit Segment Type: ${segmentType.name}</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="editSegmentTypeModal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editSegmentTypeForm">
            <div class="form-group">
              <label for="editDisplayName">Display Name:</label>
              <input type="text" id="editDisplayName" name="displayName" value="${segmentType.display_name || segmentType.displayName || ''}" required>
            </div>
            <div class="form-group">
              <label for="editDescription">Description:</label>
              <textarea id="editDescription" name="description" rows="3">${segmentType.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="editDefaultTimezone">Default Timezone:</label>
              <select id="editDefaultTimezone" name="defaultTimezone">
                <option value="America/New_York" ${(segmentType.default_timezone === 'America/New_York') ? 'selected' : ''}>Eastern</option>
                <option value="America/Chicago" ${(segmentType.default_timezone === 'America/Chicago') ? 'selected' : ''}>Central</option>
                <option value="America/Denver" ${(segmentType.default_timezone === 'America/Denver') ? 'selected' : ''}>Mountain</option>
                <option value="America/Los_Angeles" ${(segmentType.default_timezone === 'America/Los_Angeles') ? 'selected' : ''}>Pacific</option>
              </select>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="isActive" ${segmentType.is_active ? 'checked' : ''}> Active
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-admin success">Save Changes</button>
              <button type="button" class="btn-admin secondary" data-action="hide-modal" data-modal="editSegmentTypeModal">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal and add new one
  const existingModal = document.getElementById('editSegmentTypeModal');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Setup form submission
  document.getElementById('editSegmentTypeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      displayName: formData.get('displayName'),
      description: formData.get('description'),
      defaultTimezone: formData.get('defaultTimezone'),
      isActive: formData.get('isActive') === 'on'
    };

    try {
      const response = await fetch(`/api/v1/admin/segment-types/${segmentType.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        hideModal('editSegmentTypeModal');
        showAlert('success', 'Segment type updated successfully');
        loadSegmentTypes();
      } else {
        const error = await response.json();
        showAlert('danger', error.error || 'Failed to update segment type');
      }
    } catch (error) {
      showAlert('danger', 'Failed to update segment type');
    }
  });
  
  // Setup close handlers
  setupModalCloseHandlers('editSegmentTypeModal');
}

function showEditPromptModal(prompt) {
  const modalHTML = `
    <div class="modal" id="editPromptModal" style="display: flex;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="editPromptModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edit AI Prompt: ${prompt.name}</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="editPromptModal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editPromptForm">
            <div class="form-group">
              <label for="editPromptText">Prompt Text:</label>
              <textarea id="editPromptText" name="prompt" rows="10" style="width: 100%; font-family: monospace;" required>${prompt.prompt || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="editPromptVersion">Version:</label>
              <input type="number" id="editPromptVersion" name="version" value="${prompt.version || 1}" min="1" required>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="isActive" ${prompt.isActive ? 'checked' : ''}> Active
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-admin success">Save Changes</button>
              <button type="button" class="btn-admin secondary" data-action="hide-modal" data-modal="editPromptModal">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal and add new one
  const existingModal = document.getElementById('editPromptModal');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Setup form submission
  document.getElementById('editPromptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      prompt: formData.get('prompt'),
      version: parseInt(formData.get('version')),
      isActive: formData.get('isActive') === 'on'
    };

    try {
      const response = await fetch(`/api/v1/admin/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        hideModal('editPromptModal');
        showAlert('success', 'Prompt updated successfully');
        loadPrompts();
      } else {
        const error = await response.json();
        showAlert('danger', error.error || 'Failed to update prompt');
      }
    } catch (error) {
      showAlert('danger', 'Failed to update prompt');
    }
  });
  
  setupModalCloseHandlers('editPromptModal');
}

// =====================================================================
// 3. COMPLETE WORKING MODALS
// =====================================================================

function createWorkingModals() {
  const modalsHTML = `
    <!-- Create Segment Type Modal -->
    <div id="createSegmentTypeModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="createSegmentTypeModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create New Segment Type</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="createSegmentTypeModal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="createSegmentTypeForm">
            <div class="form-group">
              <label for="segmentName">Internal Name:</label>
              <input type="text" id="segmentName" name="name" placeholder="e.g., rideshare" required>
              <small>Lowercase, underscore separated (used in code)</small>
            </div>
            <div class="form-group">
              <label for="segmentDisplayName">Display Name:</label>
              <input type="text" id="segmentDisplayName" name="displayName" placeholder="e.g., Rideshare" required>
            </div>
            <div class="form-group">
              <label for="segmentDescription">Description:</label>
              <textarea id="segmentDescription" name="description" rows="3" placeholder="Brief description of this segment type"></textarea>
            </div>
            <div class="form-group">
              <label for="segmentTimezone">Default Timezone:</label>
              <select id="segmentTimezone" name="defaultTimezone">
                <option value="America/New_York">Eastern (America/New_York)</option>
                <option value="America/Chicago">Central (America/Chicago)</option>
                <option value="America/Denver">Mountain (America/Denver)</option>
                <option value="America/Los_Angeles">Pacific (America/Los_Angeles)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="segmentPrompt">AI Parsing Prompt:</label>
              <textarea id="segmentPrompt" name="parsingPrompt" rows="6" placeholder="Enter the AI prompt for parsing this type of email..." required></textarea>
              <small>Use {{emailContent}} to reference the email content</small>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-admin success">Create Segment Type</button>
              <button type="button" class="btn-admin secondary" data-action="hide-modal" data-modal="createSegmentTypeModal">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Create Classification Rule Modal -->
    <div id="createRuleModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="createRuleModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create Classification Rule</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="createRuleModal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="createRuleForm">
            <div class="form-group">
              <label for="ruleName">Rule Name:</label>
              <input type="text" id="ruleName" name="ruleName" placeholder="e.g., uber_sender_pattern" required>
            </div>
            <div class="form-group">
              <label for="ruleSegmentType">Segment Type:</label>
              <select id="ruleSegmentType" name="segmentType" required>
                <option value="">Select segment type...</option>
                <!-- Will be populated dynamically -->
              </select>
            </div>
            <div class="form-group">
              <label for="ruleType">Rule Type:</label>
              <select id="ruleType" name="ruleType">
                <option value="sender">Email Sender</option>
                <option value="subject">Email Subject</option>
                <option value="keyword">Content Keyword</option>
                <option value="regex">Regular Expression</option>
              </select>
            </div>
            <div class="form-group">
              <label for="rulePattern">Pattern:</label>
              <input type="text" id="rulePattern" name="pattern" placeholder="e.g., @uber.com or Trip confirmed" required>
              <small>Pattern to match in emails</small>
            </div>
            <div class="form-group">
              <label for="rulePriority">Priority:</label>
              <input type="number" id="rulePriority" name="priority" value="10" min="1" max="100">
              <small>Higher numbers = checked first</small>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="isActive" checked> Active
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-admin success">Create Rule</button>
              <button type="button" class="btn-admin secondary" data-action="hide-modal" data-modal="createRuleModal">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Test Classification Modal -->
    <div id="testClassificationModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="testClassificationModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Test Email Classification</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="testClassificationModal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="testClassificationForm">
            <div class="form-group">
              <label for="testSender">Email Sender:</label>
              <input type="email" id="testSender" name="sender" placeholder="no-reply@uber.com">
            </div>
            <div class="form-group">
              <label for="testSubject">Email Subject:</label>
              <input type="text" id="testSubject" name="subject" placeholder="Your trip receipt">
            </div>
            <div class="form-group">
              <label for="testContent">Email Content:</label>
              <textarea id="testContent" name="content" rows="8" placeholder="Paste email content here..." required></textarea>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-admin success">Test Classification</button>
              <button type="button" class="btn-admin secondary" data-action="hide-modal" data-modal="testClassificationModal">Cancel</button>
            </div>
          </form>
          <div id="testResults" style="margin-top: 20px;"></div>
        </div>
      </div>
    </div>
  `;

  // Add modals to the page
  const modalsContainer = document.getElementById('modals-container') || document.body;
  modalsContainer.innerHTML = modalsHTML;
  
  setupModalEventListeners();
}

// =====================================================================
// 4. ENHANCED MODAL EVENT HANDLERS
// =====================================================================

function setupModalEventListeners() {
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
        showAlert('danger', 'Failed to create segment type');
      }
    });
  }

  // Test Classification Form
  const testForm = document.getElementById('testClassificationForm');
  if (testForm) {
    testForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = {
        sender: formData.get('sender'),
        subject: formData.get('subject'),
        content: formData.get('content')
      };

      try {
        const response = await fetch('/api/v1/admin/test-classification', {
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
              <p><strong>Matched Rule:</strong> ${result.matchedRule || 'None'}</p>
              <p><strong>Confidence:</strong> ${result.confidence || 'N/A'}</p>
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

  // Setup close handlers for all modals
  document.querySelectorAll('[data-action="hide-modal"]').forEach(element => {
    element.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const modalId = this.getAttribute('data-modal');
      hideModal(modalId);
    });
  });
}

function setupModalCloseHandlers(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  modal.querySelectorAll('[data-action="hide-modal"]').forEach(element => {
    element.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      hideModal(modalId);
    });
  });
}

// =====================================================================
// 5. ENHANCED SYSTEM STATUS FUNCTION
// =====================================================================

async function checkSystemStatus() {
  try {
    showAlert('info', 'Checking system status...');
    
    // Create or find results container
    let resultsDiv = document.getElementById('actionResults');
    if (!resultsDiv) {
      resultsDiv = document.createElement('div');
      resultsDiv.id = 'actionResults';
      const systemInfo = document.getElementById('systemInfo');
      if (systemInfo) {
        systemInfo.appendChild(resultsDiv);
      } else {
        document.querySelector('.admin-panel').appendChild(resultsDiv);
      }
    }
    
    const response = await fetch('/api/v1/admin/system-status');
    
    if (response.ok) {
      const status = await response.json();
      
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
    } else {
      resultsDiv.innerHTML = `
        <div class="alert alert-danger">
          ❌ Could not check system status. Response: ${response.status}
        </div>
      `;
    }
  } catch (error) {
    let resultsDiv = document.getElementById('actionResults');
    if (!resultsDiv) {
      resultsDiv = document.createElement('div');
      resultsDiv.id = 'actionResults';
      document.querySelector('.admin-panel').appendChild(resultsDiv);
    }
    
    resultsDiv.innerHTML = `
      <div class="alert alert-danger">
        ❌ Could not check system status. Error: ${error.message}
      </div>
    `;
  }
}

// =====================================================================
// 6. UPDATE THE LOADMODALS FUNCTION
// =====================================================================

function loadModals() {
  // Try to load external modals file first
  fetch('modals.html')
    .then(response => {
      if (!response.ok) throw new Error('Modals file not found');
      return response.text();
    })
    .then(html => {
      document.getElementById('modals-container').innerHTML = html;
      setupModalEventListeners();
    })
    .catch(error => {
      console.log('Loading inline modals instead of external file');
      createWorkingModals();
    });
}

// =====================================================================
// 7. INITIALIZATION - UPDATE DOMCONTENTLOADED
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
  
  // Create working modals immediately
  createWorkingModals();
  
  // Initialize admin content if starting on admin tab
  if (window.location.hash === '#admin') {
    const adminButton = document.querySelector('[data-tab="admin"]');
    if (adminButton) {
      adminButton.click();
    }
  }
});

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