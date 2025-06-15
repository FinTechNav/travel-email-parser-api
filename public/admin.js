// =====================================================================
// CSP-COMPLIANT ADMIN PANEL JAVASCRIPT - COMPLETE VERSION
// =====================================================================


// Prevent multiple initialization
if (window.adminSystemInitialized) {
  console.log('Admin system already initialized, skipping...');
} else {
  window.adminSystemInitialized = true;
}

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
    loadModals(); // Your existing function
    
    // Small delay to ensure DOM is ready, then load all admin content
    setTimeout(() => {
      loadSegmentTypes();     // Your existing
      loadClassificationRules(); // Your existing
      loadPrompts();         // NEW - AI Prompts loading
      loadSystemStatus();    // Your existing if you have it
    }, 100);
  }
}

// =====================================================================
// MODAL MANAGEMENT
// =====================================================================


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
  console.log(`🔄 Showing modal: ${modalId}`);
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    // Add modal to stack for proper layering
    if (!window.openModals) window.openModals = [];
    window.openModals.push(modalId);
  } else {
    console.error(`❌ Modal not found: ${modalId}`);
  }
}

function hideModal(modalId) {
  console.log(`🔄 Hiding modal: ${modalId}`);
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    // Remove from modal stack
    if (window.openModals) {
      window.openModals = window.openModals.filter(id => id !== modalId);
    }
  }
}


// =====================================================================
// EVENT LISTENERS SETUP
// =====================================================================

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
        const response = await fetch('/api/v1/admin/prompts', {
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

function loadSystemStatus() {
  // Just call the existing checkSystemStatus function
  checkSystemStatus();
}

// =====================================================================
// ADMIN ACTION HANDLERS
// =====================================================================

function setupTabEventListeners() {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function(e) {
      const tabName = this.getAttribute('data-tab');
      if (tabName) {
        showTab(tabName, this);
      }
    });
  });
}

function setupAdminActionListeners() {
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
        case 'check-system-status':
          checkSystemStatus();
          break;
        case 'fix-ps-timezone':
          fixPSTimezone();
          break;
        case 'reprocess-all-segments':
          reprocessAllSegments();
          break;
        case 'test-classification-rules':
          showModal('testClassificationModal');
          break;
        case 'show-prompts-help':
          showPromptsHelp();
          break;
        case 'clear-prompts-filters':
          clearPromptsFilters();
          break;
        case 'export-prompts':
          exportPrompts();
          break;
        case 'show-import-modal':
          showImportModal();
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
// AI PROMPTS MANAGEMENT 
// =====================================================================


async function loadPrompts() {
  const container = document.getElementById('promptsContainer');
  if (!container) return;
  
  container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading AI prompts...</div>';

  try {
    const response = await fetch('/api/v1/admin/prompts');
    if (response.ok) {

      const prompts = await response.json();
      displayPrompts(prompts);

      // Add enhanced features after displaying prompts (only once)
      if (!window.promptEnhancementsLoaded) {
        setTimeout(() => {
          addPromptsSearchAndFilter();
          addBulkOperations();
          loadPromptAnalytics();
          window.promptEnhancementsLoaded = true;
        }, 100);
      }
      
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to load prompts:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <strong>❌ Failed to load AI prompts</strong>
        <p>Error: ${error.message}</p>
        <p>Please ensure the admin API endpoints are properly configured.</p>
        <button class="btn-admin" onclick="loadPrompts()">Retry</button>
      </div>
    `;
  }
}

// =====================================================================
// ADD THIS MISSING displayPrompts FUNCTION AFTER YOUR loadPrompts FUNCTION
// =====================================================================

function displayPrompts(prompts) {
  const container = document.getElementById('promptsContainer');
  
  if (prompts.length === 0) {
    container.innerHTML = `
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
                  ${prompt.successRate !== null ? 
                    `<span class="success-rate ${getSuccessRateClass(prompt.successRate)}">${(prompt.successRate * 100).toFixed(1)}%</span>` : 
                    '<span style="color: #6c757d;">No data</span>'
                  }
                </td>
                <td>${formatDate(prompt.updatedAt)}</td>
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
  
  container.innerHTML = tableHTML;
  setupPromptActionListeners();
    // Add these lines after displayPrompts:
setTimeout(() => {
  if (!window.promptSearchLoaded) {
    addPromptsSearchAndFilter();
    window.promptSearchLoaded = true;
  }
}, 100);
}

function getSuccessRateClass(rate) {
  if (rate >= 0.9) return 'success-high';
  if (rate >= 0.7) return 'success-medium';
  return 'success-low';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}


function switchPromptCategory(category) {
  // Hide all category sections
  document.querySelectorAll('.prompt-category-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show selected category
  const targetSection = document.querySelector(`[data-category="${category}"]`);
  if (targetSection) {
    targetSection.style.display = 'block';
  }
  
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  document.querySelector(`[data-category="${category}"]`).classList.add('active');
}

// =====================================================================
// PROMPT CRUD OPERATIONS
// =====================================================================

function setupPromptActionListeners() {
  // Edit prompt button
  document.querySelectorAll('[data-action="edit-prompt"]').forEach(button => {
    button.addEventListener('click', async (e) => {
      const promptId = e.target.getAttribute('data-id');
      await editPrompt(promptId);
    });
  });

  // Toggle prompt active status
  document.querySelectorAll('[data-action="toggle-prompt"]').forEach(button => {
    button.addEventListener('click', async (e) => {
      const promptId = e.target.getAttribute('data-id');
      const newActiveState = e.target.getAttribute('data-active') === 'true';
      await togglePromptStatus(promptId, newActiveState);
    });
  });

  // Duplicate prompt
  document.querySelectorAll('[data-action="duplicate-prompt"]').forEach(button => {
    button.addEventListener('click', async (e) => {
      const promptId = e.target.getAttribute('data-id');
      await duplicatePrompt(promptId);
    });
  });

  // Delete prompt
  document.querySelectorAll('[data-action="delete-prompt"]').forEach(button => {
    button.addEventListener('click', async (e) => {
      const promptId = e.target.getAttribute('data-id');
      await deletePrompt(promptId);
    });
  });
}

async function editPrompt(promptId) {
  try {
    // Fetch current prompt data
    const response = await fetch(`/api/v1/admin/prompts/${promptId}`);
    if (!response.ok) throw new Error('Failed to fetch prompt data');
    
    const prompt = await response.json();
    
    // Populate edit modal with current data
    populatePromptEditModal(prompt);
    showModal('editPromptModal');
    
  } catch (error) {
    console.error('Error loading prompt for editing:', error);
    showAlert('danger', 'Failed to load prompt data for editing');
  }
}

async function togglePromptStatus(promptId, newActiveState) {
  try {
    const response = await fetch(`/api/v1/admin/prompts/${promptId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: newActiveState })
    });

    if (response.ok) {
      showAlert('success', `Prompt ${newActiveState ? 'activated' : 'deactivated'} successfully`);
      loadPrompts(); // Refresh the list
    } else {
      throw new Error('Failed to update prompt status');
    }
  } catch (error) {
    console.error('Error toggling prompt status:', error);
    showAlert('danger', 'Failed to update prompt status');
  }
}

async function duplicatePrompt(promptId) {
  try {
    const response = await fetch(`/api/v1/admin/prompts/${promptId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      showAlert('success', 'Prompt duplicated successfully');
      loadPrompts(); // Refresh the list
    } else {
      throw new Error('Failed to duplicate prompt');
    }
  } catch (error) {
    console.error('Error duplicating prompt:', error);
    showAlert('danger', 'Failed to duplicate prompt');
  }
}

async function deletePrompt(promptId) {
  if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/v1/admin/prompts/${promptId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showAlert('success', 'Prompt deleted successfully');
      loadPrompts(); // Refresh the list
    } else {
      const error = await response.json();
      showAlert('danger', error.error || 'Failed to delete prompt');
    }
  } catch (error) {
    console.error('Error deleting prompt:', error);
    showAlert('danger', 'Failed to delete prompt');
  }
}

async function deletePromptsBulk(promptIds) {
  try {
    showAlert('info', `Deleting ${promptIds.length} prompts...`);
    
    const promises = promptIds.map(id => 
      fetch(`/api/v1/admin/prompts/${id}`, { method: 'DELETE' })
    );
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.ok).length;
    
    if (successCount === promptIds.length) {
      showAlert('success', `${successCount} prompts deleted successfully`);
    } else {
      showAlert('warning', `${successCount}/${promptIds.length} prompts deleted successfully`);
    }
    
    loadPrompts(); // Refresh the table
    clearSelection();
  } catch (error) {
    showAlert('danger', `Failed to delete prompts: ${error.message}`);
  }
}

// =====================================================================
// ENHANCED PROMPT MODALS
// =====================================================================

function createPromptModals() {
  return `
    <!-- Create Prompt Modal -->
    <div id="createPromptModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="createPromptModal"></div>
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h3>Create New AI Prompt</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="createPromptModal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="createPromptForm">
            <div class="form-row">
              <div class="form-group">
                <label for="promptName">Prompt Name *</label>
                <input type="text" id="promptName" name="name" required 
                       placeholder="e.g., email_parsing_flight"
                       pattern="[a-zA-Z0-9_]+"
                       title="Only letters, numbers, and underscores allowed">
                <small>Use snake_case naming (letters, numbers, underscores only)</small>
              </div>
              <div class="form-group">
                <label for="promptCategory">Category *</label>
                <select id="promptCategory" name="category" required>
                  <option value="">Select category...</option>
                  <option value="parsing">Email Parsing</option>
                  <option value="classification">Email Classification</option>
                  <option value="enhancement">Data Enhancement</option>
                  <option value="validation">Data Validation</option>
                </select>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="promptType">Segment Type *</label>
                <select id="promptType" name="type" required>
                  <option value="">Select type...</option>
                  <option value="flight">Flight</option>
                  <option value="hotel">Hotel</option>
                  <option value="car">Car Rental</option>
                  <option value="private_terminal">Private Terminal</option>
                  <option value="rideshare">Rideshare</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div class="form-group">
                <label for="promptVersion">Version</label>
                <input type="number" id="promptVersion" name="version" value="1" min="1">
              </div>
            </div>

            <div class="form-group">
              <label for="promptTestGroup">Test Group (Optional)</label>
              <input type="text" id="promptTestGroup" name="testGroup" 
                     placeholder="e.g., A, B, experimental">
              <small>Used for A/B testing different prompt versions</small>
            </div>
            
            <div class="form-group">
              <label for="promptText">Prompt Text *</label>
              <textarea id="promptText" name="prompt" required rows="15" 
                        placeholder="Enter your AI prompt here. You can use variables like {{emailContent}}, {{extractedTimes}}, etc."></textarea>
              <small>
                <strong>Available variables:</strong> {{emailContent}}, {{extractedTimes}}, {{senderEmail}}, {{subject}}
              </small>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" name="isActive" checked> 
                Set as active prompt
              </label>
              <small>Active prompts are used for processing. Only one version per name can be active.</small>
            </div>

            <div class="modal-actions">
              <button type="button" data-action="hide-modal" data-modal="createPromptModal" class="btn-admin secondary">
                Cancel
              </button>
              <button type="submit" class="btn-admin primary">
                Create Prompt
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Prompt Modal -->
    <div id="editPromptModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="editPromptModal"></div>
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h3>Edit AI Prompt</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="editPromptModal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editPromptForm">
            <input type="hidden" id="editPromptId" name="id">
            
            <div class="form-row">
              <div class="form-group">
                <label for="editPromptName">Prompt Name</label>
                <input type="text" id="editPromptName" name="name" readonly>
                <small>Name cannot be changed. Create a new prompt if needed.</small>
              </div>
              <div class="form-group">
                <label for="editPromptVersion">Version</label>
                <input type="number" id="editPromptVersion" name="version" min="1">
              </div>
            </div>

            <div class="form-group">
              <label for="editPromptTestGroup">Test Group</label>
              <input type="text" id="editPromptTestGroup" name="testGroup">
            </div>
            
            <div class="form-group">
              <label for="editPromptText">Prompt Text *</label>
              <textarea id="editPromptText" name="prompt" required rows="15"></textarea>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" id="editPromptActive" name="isActive"> 
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
}

// =================================================================
// 🔧 CREATE EDIT PROMPT MODAL FUNCTION
// =================================================================

function createEditPromptModal() {
  // Remove existing modal if it exists
  const existingModal = document.getElementById('editPromptModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create the modal HTML
  const modalHTML = `
    <div id="editPromptModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="editPromptModal"></div>
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h3>Edit AI Prompt</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="editPromptModal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editPromptForm">
            <input type="hidden" id="editPromptId" name="id">
            
            <div class="form-row">
              <div class="form-group">
                <label for="editPromptName">Prompt Name</label>
                <input type="text" id="editPromptName" name="name" readonly>
                <small>Name cannot be changed. Create a new prompt if needed.</small>
              </div>
              <div class="form-group">
                <label for="editPromptVersion">Version</label>
                <input type="number" id="editPromptVersion" name="version" min="1">
              </div>
            </div>

            <div class="form-group">
              <label for="editPromptTestGroup">Test Group</label>
              <input type="text" id="editPromptTestGroup" name="testGroup">
            </div>
            
            <div class="form-group">
              <label for="editPromptText">Prompt Text *</label>
              <textarea id="editPromptText" name="prompt" required rows="15"></textarea>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" id="editPromptActive" name="isActive"> 
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
  
  // Add modal to the page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  console.log('✅ Edit modal created and added to DOM');
}

function populatePromptEditModal(prompt) {
  // Ensure modal exists first
  const modal = document.getElementById('editPromptModal');
  if (!modal) {
    console.error('❌ Edit modal not found in DOM');
    createEditPromptModal();
    // Wait for modal creation
    setTimeout(() => populatePromptEditModal(prompt), 100);
    return;
  }
  
  // Now populate the fields safely
  const idField = document.getElementById('editPromptId');
  const nameField = document.getElementById('editPromptName');
  const versionField = document.getElementById('editPromptVersion');
  const testGroupField = document.getElementById('editPromptTestGroup');
  const textField = document.getElementById('editPromptText');
  const activeField = document.getElementById('editPromptActive');
  
  if (idField) idField.value = prompt.id;
  if (nameField) nameField.value = prompt.name;
  if (versionField) versionField.value = prompt.version;
  if (testGroupField) testGroupField.value = prompt.testGroup || '';
  if (textField) textField.value = prompt.prompt;
  if (activeField) activeField.checked = prompt.isActive;
  
  console.log('✅ Modal populated with prompt data:', prompt.name);
}


// =====================================================================
// FORM SUBMISSION HANDLERS
// =====================================================================

function setupPromptFormHandlers() {
  // Create Prompt Form Handler
  const createPromptForm = document.getElementById('createPromptForm');
  if (createPromptForm) {
    createPromptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        category: formData.get('category'),
        type: formData.get('type'),
        version: parseInt(formData.get('version')) || 1,
        prompt: formData.get('prompt'),
        testGroup: formData.get('testGroup') || null,
        isActive: formData.get('isActive') === 'on'
      };

      try {
        const response = await fetch('/api/v1/admin/prompts', {
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
        console.error('Error creating prompt:', error);
        showAlert('danger', 'Failed to create prompt - check console for details');
      }
    });
  }

  // Edit Prompt Form Handler
  const editPromptForm = document.getElementById('editPromptForm');
  if (editPromptForm) {
    editPromptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const promptId = formData.get('id');
      const data = {
        version: parseInt(formData.get('version')),
        prompt: formData.get('prompt'),
        testGroup: formData.get('testGroup') || null,
        isActive: formData.get('isActive') === 'on'
      };

      try {
        const response = await fetch(`/api/v1/admin/prompts/${promptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          hideModal('editPromptModal');
          showAlert('success', 'AI prompt updated successfully');
          loadPrompts();
        } else {
          const error = await response.json();
          showAlert('danger', error.error || 'Failed to update prompt');
        }
      } catch (error) {
        console.error('Error updating prompt:', error);
        showAlert('danger', 'Failed to update prompt - check console for details');
      }
    });
  }
}

// =====================================================================
// ADDITIONAL CSS STYLES FOR PROMPTS
// =====================================================================

function addPromptStyles() {
  const styles = `
    <style>
      /* Prompt-specific styles */
      .large-modal .modal-content {
        width: 90%;
        max-width: 900px;
        max-height: 90vh;
        overflow-y: auto;
      }

      .form-row {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
      }

      .form-row .form-group {
        flex: 1;
      }

      .type-badge {
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
      }

      .type-flight { background: #e3f2fd; color: #1976d2; }
      .type-hotel { background: #f3e5f5; color: #7b1fa2; }
      .type-car { background: #e8f5e8; color: #388e3c; }
      .type-private_terminal { background: #fff3e0; color: #f57c00; }
      .type-general { background: #f5f5f5; color: #616161; }

      .success-rate {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
      }

      .success-high { background: #c8e6c9; color: #2e7d32; }
      .success-medium { background: #fff3c4; color: #f57f17; }
      .success-low { background: #ffcdd2; color: #c62828; }

      .badge {
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
        margin-left: 8px;
      }

      .badge-info { background: #e1f5fe; color: #0277bd; }

      .tab-navigation {
        display: flex;
        border-bottom: 2px solid #e0e0e0;
      }

      .tab-button {
        padding: 10px 20px;
        border: none;
        background: none;
        cursor: pointer;
        border-bottom: 3px solid transparent;
        font-weight: 500;
      }

      .tab-button.active {
        border-bottom-color: #007bff;
        color: #007bff;
      }

      .actions-cell {
        white-space: nowrap;
      }

      .action-buttons {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
      }

      .btn-small {
        padding: 4px 8px;
        font-size: 12px;
        min-width: auto;
      }

      .prompt-row:hover {
        background-color: #f8f9fa;
      }

      textarea[name="prompt"] {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
      }
        /* Admin Alert Styles - ADD THIS INSIDE YOUR EXISTING <style> TAG */
.admin-alert {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  min-width: 300px;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  margin-left: 10px;
}

/* System Status Styles */
.system-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.status-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.status-card h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.status-metrics {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.metric {
  text-align: center;
}

.metric .value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}

.metric .label {
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
}

.status-indicator {
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
}

.status-indicator.healthy {
  background: #d4edda;
  color: #155724;
}

.status-indicator.warning {
  background: #fff3cd;
  color: #856404;
}

.status-indicator.error {
  background: #f8d7da;
  color: #721c24;
}

.actions-card .action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.recent-activity {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.activity-item {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
}

/* Search and Filter Styles */
.prompts-search-filter {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  padding: 15px;
  margin: 20px 0;
}

.search-row {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.search-group input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  width: 300px;
}

.filter-group {
  display: flex;
  gap: 10px;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  min-width: 120px;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.metric-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.metric-card h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #6c757d;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}
    </style>
  `;
  
  document.head.insertAdjacentHTML('beforeend', styles);
}

// =====================================================================
// TABLE ACTION HANDLERS
// =====================================================================

function setupTableActionListeners() {
  // Handle all table action buttons with event delegation
  document.addEventListener('click', function(e) {
    const target = e.target;
    const action = target.getAttribute('data-action');
    
    if (!action) return;
    
    e.preventDefault();
    
    const id = target.getAttribute('data-id');
    const name = target.getAttribute('data-name');
    const active = target.getAttribute('data-active') === 'true';
    
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
      case 'duplicate-prompt':
        duplicatePrompt(id);
        break;
      case 'delete-prompt':
        deletePrompt(id);
        break;
    }
  });
}
// =====================================================================
// SYSTEM ACTIONS
// =====================================================================

async function fixPSTimezone() {
  try {
    showAlert('info', 'Fixing PS timezone issues...');
    const response = await fetch('/api/v1/admin/fix-ps-timezone', { method: 'POST' });
    
    if (response.ok) {
      const result = await response.json();
      showAlert('success', `✅ Fixed ${result.updatedCount || 0} PS segments`);
    } else {
      const error = await response.json();
      showAlert('danger', error.error || 'Failed to fix PS timezone issues');
    }
  } catch (error) {
    showAlert('danger', 'Could not connect to admin system');
  }
}

async function reprocessAllSegments() {
  if (!confirm('This will reprocess ALL travel segments with current rules. This may take several minutes. Are you sure?')) return;
  
  try {
    showAlert('info', 'Starting segment reprocessing...');
    const response = await fetch('/api/v1/admin/reprocess-segments', { method: 'POST' });
    
    if (response.ok) {
      const result = await response.json();
      showAlert('success', `✅ Reprocessing started for ${result.segmentCount || 0} segments`);
    } else {
      const error = await response.json();
      showAlert('danger', error.error || 'Failed to start reprocessing');
    }
  } catch (error) {
    showAlert('danger', 'Could not connect to admin system');
  }
}

async function checkSystemStatus() {
  try {
    // Your existing system status logic
    const response = await fetch('/api/v1/admin/system-status');
    
    // Also get prompt analytics for enhanced status
    const promptAnalyticsResponse = await fetch('/api/v1/admin/prompts/analytics?timeframe=1d');
    
    const systemStatus = response.ok ? await response.json() : {};
    const promptAnalytics = promptAnalyticsResponse.ok ? await promptAnalyticsResponse.json() : {};
    
    // Display enhanced system status
    displayEnhancedSystemStatus(systemStatus, promptAnalytics);
    
  } catch (error) {
    console.error('Error checking system status:', error);
    // Your existing error handling
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
// UTILITY FUNCTIONS
// =====================================================================

// Enhanced alert system
function showAlert(type, message, duration = 5000) {
  // Remove existing alerts
  document.querySelectorAll('.admin-alert').forEach(alert => alert.remove());
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `admin-alert alert alert-${type}`;
  alertDiv.innerHTML = `
    <span>${message}</span>
    <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  // Add to page
  const container = document.querySelector('.admin-panel') || document.body;
  container.insertBefore(alertDiv, container.firstChild);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (alertDiv.parentElement) {
      alertDiv.remove();
    }
  }, duration);
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

  const existingModal = document.getElementById('editSegmentTypeModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modalHTML = `
    <div class="modal" id="editSegmentTypeModal" style="display: flex;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="editSegmentTypeModal"></div>
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h3>Edit Segment Type: ${segmentType.name}</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="editSegmentTypeModal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editSegmentTypeForm">
            <input type="hidden" name="originalName" value="${segmentType.name}">
            
            <div class="form-group">
              <label for="editDisplayName">Display Name *</label>
              <input type="text" id="editDisplayName" name="displayName" 
                     value="${segmentType.display_name || segmentType.displayName || ''}" required>
            </div>
            
            <div class="form-group">
              <label for="editDescription">Description</label>
              <textarea id="editDescription" name="description" rows="3">${segmentType.description || ''}</textarea>
            </div>
            
            <div class="form-group">
              <label for="editDefaultTimezone">Default Timezone</label>
              <select id="editDefaultTimezone" name="defaultTimezone">
                <option value="America/New_York" ${(segmentType.default_timezone === 'America/New_York') ? 'selected' : ''}>Eastern Time</option>
                <option value="America/Chicago" ${(segmentType.default_timezone === 'America/Chicago') ? 'selected' : ''}>Central Time</option>
                <option value="America/Denver" ${(segmentType.default_timezone === 'America/Denver') ? 'selected' : ''}>Mountain Time</option>
                <option value="America/Los_Angeles" ${(segmentType.default_timezone === 'America/Los_Angeles') ? 'selected' : ''}>Pacific Time</option>
                <option value="UTC" ${(segmentType.default_timezone === 'UTC') ? 'selected' : ''}>UTC</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" name="isActive" ${segmentType.is_active ? 'checked' : ''}> 
                Active
              </label>
            </div>

            <div class="modal-actions">
              <button type="button" data-action="hide-modal" data-modal="editSegmentTypeModal" class="btn-admin secondary">
                Cancel
              </button>
              <button type="submit" class="btn-admin primary">
                Update Segment Type
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Setup form submission
  document.getElementById('editSegmentTypeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const originalName = formData.get('originalName');
    const data = {
      displayName: formData.get('displayName'),
      description: formData.get('description'),
      defaultTimezone: formData.get('defaultTimezone'),
      isActive: formData.get('isActive') === 'on'
    };

    try {
      const response = await fetch(`/api/v1/admin/segment-types/${originalName}`, {
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



function addEnhancedPromptStyles() {
  // Add basic styles for prompts (already included in your addPromptStyles function)
  console.log('Enhanced prompt styles setup complete');
}

function createPromptTestModal() {
  return `
    <div id="testPromptModal" class="modal" style="display: none;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="testPromptModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Test AI Prompt</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="testPromptModal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Test prompt functionality - requires full implementation</p>
        </div>
      </div>
    </div>
  `;
}

function setupPromptTestForm() {
  // Basic setup for prompt testing
  console.log('Prompt test form setup complete');
}


// =====================================================================
// KEYBOARD SHORTCUTS
// =====================================================================

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when not typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Ctrl/Cmd + N = New Prompt
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      showModal('createPromptModal');
    }
    
    // Ctrl/Cmd + T = Test Prompt
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      showTestModal();
    }
    
    // Ctrl/Cmd + E = Export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      exportPrompts();
    }
    
    // Ctrl/Cmd + I = Import
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      showImportModal();
    }
    
    // Escape = Close modals
    if (e.key === 'Escape') {
      const visibleModals = document.querySelectorAll('.modal[style*="flex"]');
      visibleModals.forEach(modal => {
        modal.style.display = 'none';
      });
    }
  });
}

// =====================================================================
// HELP AND DOCUMENTATION
// =====================================================================

function addPromptsHelpButton() {
  const helpHTML = `
    <button class="btn-admin btn-small secondary help-button" data-action="show-prompts-help"
            style="position: fixed; bottom: 20px; right: 20px; z-index: 1000; border-radius: 50%; width: 50px; height: 50px;">
      ❓
    </button>
  `;
  
  if (!document.querySelector('.help-button')) {
    document.body.insertAdjacentHTML('beforeend', helpHTML);
  }
}

function showPromptsHelp() {
  // Remove existing help modal
  const existingModal = document.getElementById('helpModal');
  if (existingModal) {
    existingModal.remove();
  }

  const helpHTML = `
    <div id="helpModal" class="modal" style="display: flex;">
      <div class="modal-backdrop" data-action="close-help-modal"></div>
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h3>AI Prompts Help</h3>
          <button class="modal-close" data-action="close-help-modal">&times;</button>
        </div>
        <div class="modal-body">
          <h4>🤖 About AI Prompts</h4>
          <p>AI Prompts control how the system extracts travel information from emails. Each prompt is a set of instructions for the AI to follow when parsing email content.</p>
          
          <h4>📝 Prompt Types</h4>
          <ul>
            <li><strong>Base Prompts:</strong> Core parsing instructions</li>
            <li><strong>Override Prompts:</strong> Replace base prompts for specific cases</li>
            <li><strong>Enhancement Prompts:</strong> Add additional extraction rules</li>
          </ul>
          
          <h4>🏷️ Categories</h4>
          <ul>
            <li><strong>Parsing:</strong> Extract travel details from emails</li>
            <li><strong>Classification:</strong> Determine email types</li>
            <li><strong>Enhancement:</strong> Add context or corrections</li>
          </ul>
          
          <h4>🔧 Variables Available</h4>
          <p>Use these variables in your prompts:</p>
          <ul>
            <li><code>{{emailContent}}</code> - Full email body</li>
            <li><code>{{senderEmail}}</code> - Email sender address</li>
            <li><code>{{subject}}</code> - Email subject line</li>
            <li><code>{{extractedTimes}}</code> - Pre-extracted time information</li>
          </ul>
          
          <h4>⚡ Best Practices</h4>
          <ul>
            <li>Use specific, clear instructions</li>
            <li>Test prompts before activating</li>
            <li>Only one version per name can be active</li>
            <li>Higher version numbers take precedence</li>
          </ul>
        </div>
        <div class="modal-actions">
          <button class="btn-admin primary" data-action="close-help-modal">Got it!</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', helpHTML);
  
  // Setup close handlers
  document.querySelectorAll('[data-action="close-help-modal"]').forEach(element => {
    element.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('helpModal').remove();
    });
  });
}

// =====================================================================
// SEARCH AND FILTERING
// =====================================================================

function addPromptsSearchAndFilter() {
  const searchHTML = `
    <div class="prompts-search-filter" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
      <div class="search-row">
        <div class="search-group">
          <input type="text" id="promptSearch" placeholder="Search prompts by name or content..." 
                 style="width: 300px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div class="filter-group">
          <select id="categoryFilter" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="">All Categories</option>
          </select>
          <select id="typeFilter" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="">All Types</option>
          </select>
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
  
  const promptsContainer = document.getElementById('promptsContainer');
  const existingSearch = promptsContainer.parentNode.querySelector('.prompts-search-filter');
  
  if (!existingSearch) {
    promptsContainer.insertAdjacentHTML('beforebegin', searchHTML);
    setupPromptsSearchHandlers();
  }
}

function setupPromptsSearchHandlers() {
  const searchInput = document.getElementById('promptSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  const typeFilter = document.getElementById('typeFilter');
  const statusFilter = document.getElementById('statusFilter');
  
  // Populate filter options
  populateFilterOptions();
  
  // Setup search handlers with debouncing
  let searchTimeout;
  function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(filterPrompts, 300);
  }
  
  if (searchInput) searchInput.addEventListener('input', handleSearch);
  if (categoryFilter) categoryFilter.addEventListener('change', filterPrompts);
  if (typeFilter) typeFilter.addEventListener('change', filterPrompts);
  if (statusFilter) statusFilter.addEventListener('change', filterPrompts);
}

async function populateFilterOptions() {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const [categoriesResponse, typesResponse] = await Promise.all([
      fetch('/api/v1/admin/prompts/categories'),
      fetch('/api/v1/admin/prompts/types')
    ]);
    
    if (categoriesResponse.ok) {
      const categories = await categoriesResponse.json();
      const categoryFilter = document.getElementById('categoryFilter');
      
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = `${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)} (${cat.count})`;
        categoryFilter.appendChild(option);
      });
    }
    
    if (typesResponse.ok) {
      const types = await typesResponse.json();
      const typeFilter = document.getElementById('typeFilter');
      
      types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.name;
        option.textContent = `${type.name.charAt(0).toUpperCase() + type.name.slice(1)} (${type.count})`;
        typeFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading filter options:', error);
  }
}

function filterPrompts() {
  const searchTerm = document.getElementById('promptSearch')?.value.toLowerCase() || '';
  const categoryFilter = document.getElementById('categoryFilter')?.value || '';
  const typeFilter = document.getElementById('typeFilter')?.value || '';
  const statusFilter = document.getElementById('statusFilter')?.value || '';
  
  const promptRows = document.querySelectorAll('.prompt-row');
  let visibleCount = 0;
  
  promptRows.forEach(row => {
    const promptName = row.querySelector('code')?.textContent.toLowerCase() || '';
    const promptCategory = row.querySelector('.type-badge')?.textContent.toLowerCase() || '';
    const promptType = row.querySelector('.type-badge')?.className.includes('type-') ? 
      row.querySelector('.type-badge').className.match(/type-(\w+)/)?.[1] || '' : '';
    const isActive = row.querySelector('.status-active') !== null;
    
    let visible = true;
    
    // Apply search filter
    if (searchTerm && !promptName.includes(searchTerm)) {
      visible = false;
    }
    
    // Apply category filter
    if (categoryFilter && !promptCategory.includes(categoryFilter)) {
      visible = false;
    }
    
    // Apply type filter
    if (typeFilter && promptType !== typeFilter) {
      visible = false;
    }
    
    // Apply status filter
    if (statusFilter === 'active' && !isActive) {
      visible = false;
    } else if (statusFilter === 'inactive' && isActive) {
      visible = false;
    }
    
    row.style.display = visible ? '' : 'none';
    if (visible) visibleCount++;
  });
  
  // Update result count
  updateFilterResultCount(visibleCount);
}

function updateFilterResultCount(count) {
  let resultCounter = document.querySelector('.filter-result-count');
  if (!resultCounter) {
    const searchContainer = document.querySelector('.prompts-search-filter');
    resultCounter = document.createElement('div');
    resultCounter.className = 'filter-result-count';
    resultCounter.style.cssText = 'margin-top: 10px; font-size: 12px; color: #6c757d;';
    searchContainer.appendChild(resultCounter);
  }
  
  resultCounter.textContent = `Showing ${count} prompt${count !== 1 ? 's' : ''}`;
}

function clearPromptsFilters() {
  // Clear all filter inputs
  const searchInput = document.getElementById('promptSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  const typeFilter = document.getElementById('typeFilter');
  const statusFilter = document.getElementById('statusFilter');
  
  if (searchInput) searchInput.value = '';
  if (categoryFilter) categoryFilter.value = '';
  if (typeFilter) typeFilter.value = '';
  if (statusFilter) statusFilter.value = '';
  
  // Show all prompt rows
  document.querySelectorAll('.prompt-row').forEach(row => {
    row.style.display = '';
  });
  
  // Update result count
  const promptRows = document.querySelectorAll('.prompt-row');
  updateFilterResultCount(promptRows.length);
  
  showAlert('info', 'Filters cleared');
}

// =====================================================================
// 6. MISSING PROMPT ANALYTICS FUNCTIONS
// =====================================================================

async function loadPromptAnalytics() {
  // Guard against multiple calls
  if (window.promptAnalyticsSetup) return;
  window.promptAnalyticsSetup = true;
  
  try {
    const response = await fetch('/api/v1/admin/prompts/analytics?timeframe=7d');
    if (response.ok) {
      const analytics = await response.json();
      displayPromptAnalytics(analytics);
    }
  } catch (error) {
    console.log('Prompt analytics not available yet');
  }
  
  console.log('Prompt analytics setup complete');
}

function displayPromptAnalytics(analytics) {
  const container = document.getElementById('promptAnalytics');
  if (!container) return;
  
  container.innerHTML = `
    <div class="analytics-grid">
      <div class="metric-card">
        <h4>Total Prompts</h4>
        <div class="metric-value">${analytics.totalPrompts || 0}</div>
      </div>
      <div class="metric-card">
        <h4>Active Prompts</h4>
        <div class="metric-value">${analytics.activePrompts || 0}</div>
      </div>
      <div class="metric-card">
        <h4>Usage (7 days)</h4>
        <div class="metric-value">${analytics.weeklyUsage || 0}</div>
      </div>
      <div class="metric-card">
        <h4>Success Rate</h4>
        <div class="metric-value">${analytics.successRate || 0}%</div>
      </div>
    </div>
  `;
}
// =====================================================================
// ENHANCED FORM VALIDATION AND UX
// =====================================================================

function validatePromptForm(formData) {
  const errors = [];
  
  // Validate prompt name
  const name = formData.get('name');
  if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) {
    errors.push('Prompt name must contain only letters, numbers, and underscores');
  }
  
  // Validate prompt content
  const prompt = formData.get('prompt');
  if (!prompt || prompt.trim().length < 50) {
    errors.push('Prompt must be at least 50 characters long');
  }
  
  // Check for required variables in prompt
  const requiredVars = ['{{emailContent}}'];
  const missingVars = requiredVars.filter(variable => !prompt.includes(variable));
  if (missingVars.length > 0) {
    errors.push(`Prompt must include required variables: ${missingVars.join(', ')}`);
  }
  
  return errors;
}

// Enhanced form submission with validation
function setupEnhancedPromptFormHandlers() {
  const createForm = document.getElementById('createPromptForm');
  const editForm = document.getElementById('editPromptForm');
  
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const errors = validatePromptForm(formData);
      
      if (errors.length > 0) {
        showAlert('danger', 'Validation errors: ' + errors.join('; '));
        return;
      }
      
      // Show loading state
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating...';
      submitBtn.disabled = true;
      
      try {
        const data = {
          name: formData.get('name'),
          category: formData.get('category'),
          type: formData.get('type'),
          version: parseInt(formData.get('version')) || 1,
          prompt: formData.get('prompt'),
          testGroup: formData.get('testGroup') || null,
          isActive: formData.get('isActive') === 'on'
        };

        const response = await fetch('/api/v1/admin/prompts', {
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
        console.error('Error creating prompt:', error);
        showAlert('danger', 'Failed to create prompt - check console for details');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
  
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const promptId = formData.get('id');
      
      // Show loading state
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Updating...';
      submitBtn.disabled = true;
      
      try {
        const data = {
          version: parseInt(formData.get('version')),
          prompt: formData.get('prompt'),
          testGroup: formData.get('testGroup') || null,
          isActive: formData.get('isActive') === 'on'
        };

        const response = await fetch(`/api/v1/admin/prompts/${promptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          hideModal('editPromptModal');
          showAlert('success', 'AI prompt updated successfully');
          loadPrompts();
        } else {
          const error = await response.json();
          showAlert('danger', error.error || 'Failed to update prompt');
        }
      } catch (error) {
        console.error('Error updating prompt:', error);
        showAlert('danger', 'Failed to update prompt - check console for details');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
}

function addBulkOperations() {
  // Add bulk operations
  console.log('Bulk operations setup complete');
}

function loadPromptAnalytics() {
  // Load analytics data
  console.log('Prompt analytics setup complete');
}

function showTestModal() {
  showModal('testPromptModal');
}

function exportPrompts() {
  showAlert('info', 'Export functionality not yet implemented');
}

function showImportModal() {
  const modalHTML = `
    <div id="importModal" class="modal" style="display: flex;">
      <div class="modal-backdrop" data-action="hide-modal" data-modal="importModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Import Prompts</h3>
          <button class="modal-close" data-action="hide-modal" data-modal="importModal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="importForm">
            <div class="form-group">
              <label for="importFile">Select JSON file:</label>
              <input type="file" id="importFile" accept=".json" required>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="overwriteExisting"> 
                Overwrite existing prompts with same name
              </label>
            </div>
          </form>
        </div>
        <div class="modal-actions">
          <button type="button" data-action="hide-modal" data-modal="importModal" class="btn-admin secondary">Cancel</button>
          <button type="button" onclick="processImport()" class="btn-admin primary">Import</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  setupModalCloseHandlers('importModal');
}

async function exportPrompts() {
  try {
    const response = await fetch('/api/v1/admin/prompts');
    if (!response.ok) throw new Error('Failed to fetch prompts');
    
    const prompts = await response.json();
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      prompts: prompts
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
    
    showAlert('success', 'Prompts exported successfully');
  } catch (error) {
    showAlert('danger', 'Failed to export prompts');
  }
}

async function processImport() {
  const fileInput = document.getElementById('importFile');
  const overwrite = document.querySelector('input[name="overwriteExisting"]').checked;
  
  if (!fileInput.files[0]) {
    showAlert('warning', 'Please select a file to import');
    return;
  }
  
  try {
    const text = await fileInput.files[0].text();
    const data = JSON.parse(text);
    
    if (!data.prompts || !Array.isArray(data.prompts)) {
      throw new Error('Invalid file format');
    }
    
    showAlert('info', `Importing ${data.prompts.length} prompts...`);
    
    const results = await Promise.all(
      data.prompts.map(prompt => 
        fetch('/api/v1/admin/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prompt)
        })
      )
    );
    
    const successCount = results.filter(r => r.ok).length;
    hideModal('importModal');
    
    if (successCount === data.prompts.length) {
      showAlert('success', `All ${successCount} prompts imported successfully`);
    } else {
      showAlert('warning', `${successCount}/${data.prompts.length} prompts imported successfully`);
    }
    
    loadPrompts();
  } catch (error) {
    showAlert('danger', `Import failed: ${error.message}`);
  }
}
// Bulk operation stubs

function bulkActivatePrompts() {
  const selectedPrompts = getSelectedPrompts();
  if (selectedPrompts.length === 0) {
    showAlert('warning', 'Please select prompts to activate');
    return;
  }
  
  if (!confirm(`Activate ${selectedPrompts.length} selected prompts?`)) return;
  
  updatePromptsBulk(selectedPrompts, { isActive: true }, 'activated');
}

function bulkDeactivatePrompts() {
  const selectedPrompts = getSelectedPrompts();
  if (selectedPrompts.length === 0) {
    showAlert('warning', 'Please select prompts to deactivate');
    return;
  }
  
  if (!confirm(`Deactivate ${selectedPrompts.length} selected prompts?`)) return;
  
  updatePromptsBulk(selectedPrompts, { isActive: false }, 'deactivated');
}

function bulkSetTestGroup() {
  const selectedPrompts = getSelectedPrompts();
  if (selectedPrompts.length === 0) {
    showAlert('warning', 'Please select prompts to update');
    return;
  }
  
  const testGroup = prompt('Enter test group name:');
  if (!testGroup) return;
  
  updatePromptsBulk(selectedPrompts, { testGroup }, `test group set to "${testGroup}"`);
}

function bulkDeletePrompts() {
  const selectedPrompts = getSelectedPrompts();
  if (selectedPrompts.length === 0) {
    showAlert('warning', 'Please select prompts to delete');
    return;
  }
  
  if (!confirm(`DELETE ${selectedPrompts.length} selected prompts? This cannot be undone!`)) return;
  
  deletePromptsBulk(selectedPrompts);
}

function getSelectedPrompts() {
  const checkboxes = document.querySelectorAll('input[name="selectedPrompts"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

async function updatePromptsBulk(promptIds, updateData, action) {
  try {
    showAlert('info', `Updating ${promptIds.length} prompts...`);
    
    const promises = promptIds.map(id => 
      fetch(`/api/v1/admin/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
    );
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.ok).length;
    
    if (successCount === promptIds.length) {
      showAlert('success', `${successCount} prompts ${action} successfully`);
    } else {
      showAlert('warning', `${successCount}/${promptIds.length} prompts ${action} successfully`);
    }
    
    loadPrompts(); // Refresh the table
    clearSelection();
  } catch (error) {
    showAlert('danger', `Failed to update prompts: ${error.message}`);
  }
}


function clearSelection() {
  document.querySelectorAll('input[name="selectedPrompts"]').forEach(cb => {
    cb.checked = false;
  });
  
  // Hide bulk operations toolbar if it exists
  const bulkToolbar = document.getElementById('bulkOperationsToolbar');
  if (bulkToolbar) {
    bulkToolbar.style.display = 'none';
  }
}


// =====================================================================
// ENHANCED SYSTEM STATUS WITH PROMPT METRICS
// =====================================================================

async function loadSystemStatus() {
  const container = document.getElementById('systemStatusContainer');
  if (!container) return;
  
  container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading system status...</div>';

  try {
    // Load existing system status
    const statusResponse = await fetch('/api/v1/admin/system-status');
    const promptAnalyticsResponse = await fetch('/api/v1/admin/prompts/analytics?timeframe=1d');
    
    const systemStatus = statusResponse.ok ? await statusResponse.json() : {};
    const promptAnalytics = promptAnalyticsResponse.ok ? await promptAnalyticsResponse.json() : {};
    
    displayEnhancedSystemStatus(systemStatus, promptAnalytics);
    
  } catch (error) {
    console.error('Error loading system status:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        ❌ Could not load system status
        <button class="btn-admin" onclick="loadSystemStatus()">Retry</button>
      </div>
    `;
  }
}

function displayEnhancedSystemStatus(systemStatus, promptAnalytics) {
  const container = document.getElementById('systemStatusContainer');
  
  const statusHTML = `
    <div class="system-status-grid">
      <!-- Email Processing Status -->
      <div class="status-card">
        <h4>📧 Email Processing</h4>
        <div class="status-metrics">
          <div class="metric">
            <span class="value">${systemStatus.emailsProcessedToday || 0}</span>
            <span class="label">Emails Today</span>
          </div>
          <div class="metric">
            <span class="value">${systemStatus.processingQueueSize || 0}</span>
            <span class="label">Queue Size</span>
          </div>
        </div>
        <div class="status-indicator ${systemStatus.emailProcessingHealthy ? 'healthy' : 'warning'}">
          ${systemStatus.emailProcessingHealthy ? '✅ Healthy' : '⚠️ Issues Detected'}
        </div>
      </div>
      
      <!-- AI Prompt Performance -->
      <div class="status-card">
        <h4>🤖 AI Prompts</h4>
        <div class="status-metrics">
          <div class="metric">
            <span class="value">${promptAnalytics.summary?.totalUsage || 0}</span>
            <span class="label">Executions Today</span>
          </div>
          <div class="metric">
            <span class="value">${promptAnalytics.summary ? (promptAnalytics.summary.successRate * 100).toFixed(1) : 0}%</span>
            <span class="label">Success Rate</span>
          </div>
        </div>
        <div class="status-indicator ${(promptAnalytics.summary?.successRate || 0) > 0.9 ? 'healthy' : 'warning'}">
          ${(promptAnalytics.summary?.successRate || 0) > 0.9 ? '✅ Performing Well' : '⚠️ Below Target'}
        </div>
      </div>
      
      <!-- Database Status -->
      <div class="status-card">
        <h4>🗄️ Database</h4>
        <div class="status-metrics">
          <div class="metric">
            <span class="value">${systemStatus.totalSegments || 0}</span>
            <span class="label">Total Segments</span>
          </div>
          <div class="metric">
            <span class="value">${systemStatus.activePrompts || 0}</span>
            <span class="label">Active Prompts</span>
          </div>
        </div>
        <div class="status-indicator ${systemStatus.databaseHealthy ? 'healthy' : 'error'}">
          ${systemStatus.databaseHealthy ? '✅ Connected' : '❌ Connection Issues'}
        </div>
      </div>
      
      <!-- System Actions -->
      <div class="status-card actions-card">
        <h4>🛠️ Quick Actions</h4>
        <div class="action-buttons">
          <button class="btn-admin btn-small" onclick="testEmailClassification()">
            Test Classification
          </button>
          <button class="btn-admin btn-small" onclick="showTestModal()">
            Test AI Prompt
          </button>
          <button class="btn-admin btn-small secondary" onclick="reprocessFailedSegments()">
            Reprocess Failed
          </button>
          <button class="btn-admin btn-small secondary" onclick="refreshSystemStatus()">
            Refresh Status
          </button>
        </div>
      </div>
    </div>
    
    <!-- Recent Activity -->
    <div class="recent-activity">
      <h4>📊 Recent Activity</h4>
      <div class="activity-grid">
        <div class="activity-item">
          <strong>Average Response Time:</strong>
          <span>${promptAnalytics.summary?.avgResponseTime ? promptAnalytics.summary.avgResponseTime.toFixed(0) + 'ms' : 'No data'}</span>
        </div>
        <div class="activity-item">
          <strong>System Uptime:</strong>
          <span>${systemStatus.uptime || 'Unknown'}</span>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = statusHTML;
}

// =====================================================================
// CONSOLIDATED INITIALIZATION - ENHANCED VERSION
// =====================================================================
// =====================================================================
// CONSOLIDATED INITIALIZATION - CLEAN VERSION
// Assumes all functions are already implemented elsewhere in the file
// =====================================================================

// =====================================================================
// COMPLETE DOMCONTENTLOADED SECTION - COPY/PASTE THIS ENTIRE SECTION
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Prevent multiple initialization
  if (window.adminSystemInitialized) {
    console.log('Admin system already initialized, skipping...');
    return;
  }
  window.adminSystemInitialized = true;
  
  console.log('🚀 Initializing complete enhanced admin system...');
  
  // =================================================================
  // 1. ADD CSS STYLES FIRST
  // =================================================================
  addPromptStyles();
  
  // =================================================================
  // 2. SETUP TAB NAVIGATION
  // =================================================================
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function(e) {
      const tabName = this.getAttribute('data-tab');
      if (tabName) {
        showTab(tabName, this);
      }
    });
  });
  
  // =================================================================
  // 3. SETUP ADMIN ACTION LISTENERS
  // =================================================================
  setupAdminActionListeners();
  
  // =================================================================
  // 4. SETUP TABLE ACTION LISTENERS (CONSOLIDATED)
  // =================================================================
  setupTableActionListeners();
  
  // =================================================================
  // 5. CREATE WORKING MODALS
  // =================================================================
  createWorkingModals();
  
  // =================================================================
  // 6. SETUP FORM HANDLERS
  // =================================================================
  setupFormEventListeners();
  setupPromptFormHandlers();
  
  // =================================================================
  // 7. SETUP ENHANCED FEATURES
  // =================================================================
  
  // Setup keyboard shortcuts for power users
  setupKeyboardShortcuts();
  
  // Add help button
  addPromptsHelpButton();
  
  // Add prompt modals to the DOM
  const modalContainer = document.querySelector('#modals-container') || document.body;
  modalContainer.insertAdjacentHTML('beforeend', createPromptModals());
  modalContainer.insertAdjacentHTML('beforeend', createPromptTestModal());
  
  // =================================================================
  // 8. ENHANCED INTEGRATION FEATURES
  // =================================================================
  
  // Wait for existing admin system to load, then add enhanced features
  setTimeout(() => {
    // Override existing functions with enhanced versions
    if (window.loadPrompts) {
      const originalLoadPrompts = window.loadPrompts;
      window.loadPrompts = async function() {
        await originalLoadPrompts();
        // Add search and filter after prompts are loaded
        setTimeout(() => {
          if (!window.promptSearchLoaded) {
            addPromptsSearchAndFilter();
            window.promptSearchLoaded = true;
          }
        }, 100);
      };
    }
    
    // Setup enhanced prompt form handlers
    setupEnhancedPromptFormHandlers();
    
    console.log('✅ Enhanced AI Prompts system fully integrated');
  }, 500);
  
  // =================================================================
  // 9. PROMPT TAB SWITCHING EVENT DELEGATION
  // =================================================================
  
  document.addEventListener('click', function(e) {
    if (e.target.getAttribute('data-action') === 'switch-prompt-category') {
      e.preventDefault();
      e.stopPropagation(); // Prevent other handlers from interfering
      
      const category = e.target.getAttribute('data-category');
      console.log('🔄 Switching to prompt category:', category);
      
      // Hide all prompt category sections
      document.querySelectorAll('.prompt-category-section').forEach(section => {
        section.style.display = 'none';
      });
      
      // Show the selected category section
      const targetSection = document.querySelector(`.prompt-category-section[data-category="${category}"]`);
      if (targetSection) {
        targetSection.style.display = 'block';
        console.log('✅ Showing section for category:', category);
      } else {
        console.error('❌ Could not find section for category:', category);
      }
      
      // Update tab button states
      document.querySelectorAll('[data-action="switch-prompt-category"]').forEach(button => {
        button.classList.remove('active');
      });
      e.target.classList.add('active');
      
      console.log('🎯 Tab switching complete for category:', category);
    }
  }, true); // Use capture phase to ensure this runs first
  
  // =================================================================
  // 10. ENHANCED DEBUG EDIT PROMPT LISTENER
  // =================================================================
  
  document.addEventListener('click', function(e) {
    if (e.target.getAttribute('data-action') === 'edit-prompt') {
      console.log('🔍 Edit button clicked!');
      const promptId = e.target.getAttribute('data-id');
      console.log('🔍 Prompt ID from button:', promptId);
      
      const editPromptWithDebug = async (id) => {
        try {
          console.log('🔄 Attempting to fetch prompt with ID:', id);
          const response = await fetch(`/api/v1/admin/prompts/${id}`);
          console.log('🔍 Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            showAlert('danger', `Failed to load prompt: ${response.status} - ${errorText}`);
            return;
          }
          
          const prompt = await response.json();
          console.log('✅ Prompt data received:', prompt);
          
          console.log('🔄 Checking if edit modal exists...');
          const editModal = document.getElementById('editPromptModal');
          console.log('🔍 Edit modal element:', editModal);
          
          if (!editModal) {
            console.log('⚠️ Edit modal not found! Creating it now...');
            createEditPromptModal();
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          console.log('🔄 Attempting to populate modal...');
          populatePromptEditModal(prompt);
          
          console.log('🔄 Attempting to show edit modal...');
          showModal('editPromptModal');
          
        } catch (error) {
          console.error('❌ Error in editPrompt:', error);
          showAlert('danger', 'Failed to load prompt data for editing');
        }
      };
      
      editPromptWithDebug(promptId);
    }
  }, true);
  
  // =================================================================
  // 11. INITIALIZE ADMIN CONTENT IF STARTING ON ADMIN TAB
  // =================================================================
  if (window.location.hash === '#admin') {
    const adminButton = document.querySelector('[data-tab="admin"]');
    if (adminButton) {
      adminButton.click();
    }
  }
  
document.addEventListener('click', function(e) {
    if (e.target.getAttribute('data-action') === 'edit-prompt') {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🔍 Edit button clicked!');
      const promptId = e.target.getAttribute('data-id');
      console.log('🔍 Prompt ID from button:', promptId);
      
      if (promptId) {
        editPrompt(promptId);
      } else {
        console.error('❌ No prompt ID found on edit button');
        showAlert('danger', 'Could not identify prompt to edit');
      }
    }
  }, true); // Use capture phase
  
  // 11. Initialize admin content if starting on admin tab
  if (window.location.hash === '#admin') {
    const adminButton = document.querySelector('[data-tab="admin"]');
    if (adminButton) {
      adminButton.click();
    }
  }
  
  console.log('✅ Complete enhanced admin system fully initialized');
  // Enhanced debug edit prompt listener - ADD THIS
  document.addEventListener('click', function(e) {
    if (e.target.getAttribute('data-action') === 'edit-prompt') {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🔍 Edit button clicked!');
      const promptId = e.target.getAttribute('data-id');
      console.log('🔍 Prompt ID from button:', promptId);
      
      if (promptId) {
        editPrompt(promptId);
      } else {
        console.error('❌ No prompt ID found on edit button');
        showAlert('danger', 'Could not identify prompt to edit');
      }
    }
  }, true);

});

// =====================================================================
// ENHANCED FORM HANDLERS - COMBINES EXISTING + NEW FUNCTIONALITY
// =====================================================================

function setupEnhancedFormHandlers() {
  // Your existing form handlers
  setupFormEventListeners(); // Keep your existing function
  
  // New AI Prompts form handlers
  setupPromptFormHandlers();
  setupPromptTestForm();
}

// =====================================================================
// INTEGRATION WITH EXISTING ADMIN SYSTEM
// =====================================================================

// Update the tab switching function to load prompts when admin tab is selected
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabName) {
  // Call original function
  if (originalSwitchTab) {
    originalSwitchTab(tabName);
  }
  
  // Load prompts when admin tab is selected
  if (tabName === 'admin') {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (document.getElementById('promptsContainer')) {
        loadPrompts();
      }
    }, 100);
  }
};

// Update the main admin initialization
function initializeAdminSystem() {
  // Guard against multiple initialization
  if (window.adminSystemInitialized) {
    console.log('Admin system already initialized');
    return;
  }
  window.adminSystemInitialized = true;
  
  console.log('🚀 Initializing enhanced admin system...');
  
  // Setup all event listeners
  setupTabEventListeners();
  setupAdminActionListeners();
  setupTableActionListeners();
  
  // Load initial data
  setTimeout(() => {
    if (document.getElementById('admin-tab').classList.contains('active')) {
      loadSegmentTypes();
      loadClassificationRules();
      loadPrompts();
      checkSystemStatus();
    }
  }, 100);
  
  console.log('✅ Enhanced admin system fully initialized');
}



function setupEnhancedModalHandlers() {
  // Existing modal handlers...
  setupModalEventListeners();
  setupFormEventListeners();
  
  // New prompt-specific handlers
  setupPromptFormHandlers();
  
  // Enhanced event delegation for dynamic content
  document.addEventListener('click', handleDynamicClicks);
}

// =====================================================================
// DYNAMIC CLICK HANDLING FOR NEW AI PROMPTS FEATURES
// =====================================================================

function setupDynamicClickHandlers() {
  // Enhanced event delegation for dynamic content
  document.addEventListener('click', handleDynamicClicks);
}

function handleDynamicClicks(e) {
  const target = e.target;
  const action = target.getAttribute('data-action');
  
  if (!action) return;
  
  // Handle your existing actions first
  switch (action) {
    case 'show-modal':
      const modalId = target.getAttribute('data-modal');
      if (modalId === 'testPromptModal') {
        showTestModal();
      } else {
        showModal(modalId);
      }
      break;
      
    // New AI Prompts actions
    case 'edit-prompt':
      const promptId = target.getAttribute('data-id');
      editPrompt(promptId);
      break;
    
    case 'switch-prompt-category':
      const category = target.getAttribute('data-category');
      switchPromptCategory(category);
      break;

    case 'toggle-prompt':
      const togglePromptId = target.getAttribute('data-id');
      const newState = target.getAttribute('data-active') === 'true';
      togglePromptStatus(togglePromptId, newState);
      break;
      
    case 'duplicate-prompt':
      const duplicatePromptId = target.getAttribute('data-id');
      duplicatePrompt(duplicatePromptId);
      break;
      
    case 'delete-prompt':
      const deletePromptId = target.getAttribute('data-id');
      deletePrompt(deletePromptId);
      break;
      
    // Keep your existing admin actions
    case 'check-system-status':
      checkSystemStatus();
      break;
      
    case 'hide-modal':
      const hideModalId = target.getAttribute('data-modal');
      hideModal(hideModalId);
      break;
    
    case 'show-prompts-help':
      showPromptsHelp();
      break;

    case 'close-help-modal':
      document.getElementById('helpModal').remove();
      break;

    case 'clear-prompts-filters':
      clearPromptsFilters();
      break;
      }
}

// =====================================================================
// GLOBAL EXPORTS - PUT THIS AT THE VERY END OF YOUR FILE
// =====================================================================

// Make sure these functions are available globally for any remaining 
// onclick handlers or external scripts that might need them
window.showTab = showTab;
window.checkSystemStatus = checkSystemStatus;
window.loadPrompts = loadPrompts;
window.showTestModal = showTestModal;
window.exportPrompts = exportPrompts;
window.showImportModal = showImportModal;
window.hideModal = hideModal;
window.showModal = showModal;
window.loadSegmentTypes = loadSegmentTypes;
window.loadClassificationRules = loadClassificationRules;

// Also export any other functions that might be called from HTML or other scripts
window.editPrompt = editPrompt;
window.togglePromptStatus = togglePromptStatus;
window.duplicatePrompt = duplicatePrompt;
window.deletePrompt = deletePrompt;
window.bulkActivatePrompts = bulkActivatePrompts;
window.bulkDeactivatePrompts = bulkDeactivatePrompts;
window.bulkSetTestGroup = bulkSetTestGroup;
window.bulkDeletePrompts = bulkDeletePrompts;
window.clearSelection = clearSelection;
window.clearPromptsFilters = clearPromptsFilters;
window.showPromptsHelp = showPromptsHelp;
window.refreshSystemStatus = () => checkSystemStatus();
window.initializeAdminSystem = initializeAdminSystem;
window.loadSystemStatus = loadSystemStatus;
window.refreshSystemStatus = () => loadSystemStatus();
window.processImport = processImport;
window.testEmailClassification = () => showModal('testClassificationModal');
window.reprocessFailedSegments = async () => {
  if (confirm('Reprocess all failed segments? This may take some time.')) {
    try {
      const response = await fetch('/api/v1/admin/reprocess-segments', { method: 'POST' });
      if (response.ok) {
        showAlert('success', 'Reprocessing started successfully');
      } else {
        throw new Error('Failed to start reprocessing');
      }
    } catch (error) {
      showAlert('danger', 'Failed to start reprocessing');
    }
  }
};

console.log('📦 Global admin functions exported to window object');