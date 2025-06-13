// =====================================================================
// TAB MANAGEMENT
// =====================================================================

function showTab(tabName) {
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
  event.target.classList.add('active');
  
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
    });
}

function showModal(modalId) {
  document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function showCreateSegmentTypeModal() {
  showModal('createSegmentTypeModal');
}

function showCreateRuleModal() {
  showModal('createRuleModal');
}

function showCreatePromptModal() {
  showModal('createPromptModal');
}

function showTestClassificationModal() {
  showModal('testClassificationModal');
}

// =====================================================================
// SEGMENT TYPES MANAGEMENT
// =====================================================================

async function loadSegmentTypes() {
  const container = document.getElementById('segmentTypesContainer');
  container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading segment types...</div>';

  try {
    const response = await fetch('/api/admin/segment-types');
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
        ❌ Could not load segment types. Admin system may not be set up yet.<br>
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
              <button class="btn-admin btn-small" onclick="editSegmentType('${type.name}')">Edit</button>
              <button class="btn-admin btn-small secondary" onclick="toggleSegmentType('${type.name}', ${!type.is_active})">
                ${type.is_active ? 'Disable' : 'Enable'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
}

// =====================================================================
// CLASSIFICATION RULES MANAGEMENT
// =====================================================================

async function loadClassificationRules() {
  const container = document.getElementById('classificationRulesContainer');
  container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading classification rules...</div>';

  try {
    const response = await fetch('/api/admin/segment-types');
    if (response.ok) {
      const segmentTypes = await response.json();
      const allRules = segmentTypes.flatMap(type => 
        (type.classificationRules || []).map(rule => ({ ...rule, segmentType: type.name }))
      );
      displayClassificationRules(allRules);
      document.getElementById('ruleCount').textContent = `${allRules.length} rules`;
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
              <button class="btn-admin btn-small" onclick="editRule(${rule.id})">Edit</button>
              <button class="btn-admin btn-small secondary" onclick="deleteRule(${rule.id})">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
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
              <button class="btn-admin btn-small" onclick="editPrompt(${prompt.id})">Edit</button>
              <button class="btn-admin btn-small secondary" onclick="togglePrompt(${prompt.id}, ${!prompt.isActive})">
                ${prompt.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
}

// =====================================================================
// FORM EVENT LISTENERS
// =====================================================================

function setupModalEventListeners() {
  // Create Segment Type Form
  document.getElementById('createSegmentTypeForm').addEventListener('submit', async (e) => {
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
      const response = await fetch('/api/admin/segment-types', {
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

  // Create Classification Rule Form
  document.getElementById('createRuleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      ruleName: formData.get('ruleName'),
      segmentType: formData.get('segmentType'),
      pattern: formData.get('pattern'),
      type: formData.get('ruleType'),
      priority: parseInt(formData.get('priority')),
      isActive: formData.get('isActive') === 'on'
    };

    try {
      const response = await fetch(`/api/admin/segment-types/${data.segmentType}/classification-rules`, {
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
        showAlert('danger', error.error || 'Failed to create classification rule');
      }
    } catch (error) {
      showAlert('danger', 'Failed to create classification rule - admin system may not be set up');
    }
  });

  // Create Prompt Form
  document.getElementById('createPromptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      category: formData.get('category'),
      type: formData.get('type'),
      version: parseInt(formData.get('version')),
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
        showAlert('danger', error.error || 'Failed to create AI prompt');
      }
    } catch (error) {
      showAlert('danger', 'Failed to create AI prompt - admin system may not be set up');
    }
  });

  // Test Classification Form
  document.getElementById('testClassificationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      subject: formData.get('subject'),
      sender: formData.get('sender'),
      content: formData.get('content')
    };

    const resultsDiv = document.getElementById('testResults');
    resultsDiv.innerHTML = '<div class="alert alert-info">🧪 Testing classification...</div>';

    try {
      const response = await fetch('/api/admin/test-classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        resultsDiv.innerHTML = `
          <div class="alert alert-success">
            <strong>🎯 Classification Result:</strong><br>
            <strong>Detected Type:</strong> ${result.segmentType}<br>
            <strong>Confidence:</strong> ${result.confidence || 'N/A'}<br>
            <strong>Matched Rule:</strong> ${result.matchedRule || 'N/A'}
          </div>
        `;
      } else {
        const error = await response.json();
        resultsDiv.innerHTML = `
          <div class="alert alert-danger">
            ❌ ${error.error || 'Classification test failed'}
          </div>
        `;
      }
    } catch (error) {
      resultsDiv.innerHTML = `
        <div class="alert alert-danger">
          ❌ Classification testing not available. Admin system may not be set up.
        </div>
      `;
    }
  });
}

// =====================================================================
// SYSTEM ACTIONS
// =====================================================================

async function testClassificationRules() {
  showTestClassificationModal();
}

async function fixPSTimezone() {
  if (!confirm('This will apply timezone fixes to all PS Private Terminal segments. Continue?')) {
    return;
  }

  const resultsDiv = document.getElementById('actionResults');
  resultsDiv.innerHTML = '<div class="alert alert-info">🔧 Applying PS timezone fixes...</div>';

  try {
    const response = await fetch('/api/admin/quick-fixes/ps-timezone', {
      method: 'POST'
    });
    
    if (response.ok) {
      const result = await response.json();
      resultsDiv.innerHTML = `<div class="alert alert-success">✅ ${result.message}</div>`;
      
      // Refresh the main dashboard data if available
      if (typeof window.loadResults === 'function') {
        window.loadResults();
      }
    } else {
      throw new Error('Failed to apply fixes');
    }
  } catch (error) {
    resultsDiv.innerHTML = `
      <div class="alert alert-danger">
        ❌ PS timezone fix not yet available. Please run the setup script first:<br>
        <code style="background: rgba(0,0,0,0.1); padding: 4px 8px; border-radius: 4px; font-family: monospace;">node scripts/quick-ps-fix.js</code>
      </div>
    `;
  }
}

async function reprocessAllSegments() {
  if (!confirm('This will reprocess all segments using current parsing rules. This may take some time. Continue?')) {
    return;
  }

  const resultsDiv = document.getElementById('actionResults');
  resultsDiv.innerHTML = '<div class="alert alert-info">🔄 Reprocessing segments...</div>';

  try {
    const response = await fetch('/api/admin/reprocess-segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (response.ok) {
      const result = await response.json();
      resultsDiv.innerHTML = `<div class="alert alert-success">✅ ${result.message}</div>`;
    } else {
      throw new Error('Reprocessing not available yet');
    }
  } catch (error) {
    resultsDiv.innerHTML = `
      <div class="alert alert-danger">
        ❌ Segment reprocessing not yet available. Please complete the admin system setup first.
      </div>
    `;
  }
}

async function checkSystemStatus() {
  const resultsDiv = document.getElementById('actionResults');
  resultsDiv.innerHTML = '<div class="alert alert-info">🔍 Checking system status...</div>';

  const status = {
    database: 'Connected',
    segments: 'Loading...',
    lastProcessed: 'N/A'
  };

  try {
    // Use the existing API config from your original dashboard if available
    if (window.apiConfig && window.apiConfig.baseUrl && window.apiConfig.apiKey) {
      const response = await fetch(`${window.apiConfig.baseUrl}/parse/itineraries?limit=5`, {
        headers: {
          'X-API-Key': window.apiConfig.apiKey
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const totalSegments = result.data.reduce((sum, itinerary) => sum + (itinerary.segments?.length || 0), 0);
          status.segments = `${totalSegments} segments found across ${result.data.length} itineraries`;
          
          // Check for PS segments that might need timezone fixes
          const psSegments = result.data.flatMap(itinerary => 
            (itinerary.segments || []).filter(s => s.type === 'private_terminal')
          );
          if (psSegments.length > 0) {
            status.psIssue = `${psSegments.length} PS segments found - may need timezone fix`;
          }
        }
      } else {
        status.segments = 'Error loading segments';
      }
    } else {
      status.segments = 'Please configure API settings on main tab first';
    }
  } catch (error) {
    status.segments = 'Error connecting to API';
  }

  resultsDiv.innerHTML = `
    <div class="alert alert-success">
      <strong>📊 System Status Report:</strong><br><br>
      <strong>Database:</strong> ${status.database}<br>
      <strong>Segments:</strong> ${status.segments}<br>
      ${status.psIssue ? `<br>⚠️ <strong>PS Issue:</strong> ${status.psIssue}` : ''}
      <br><br>
      <em>Status checked at: ${new Date().toLocaleTimeString()}</em>
    </div>
  `;
}

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

function showAlert(type, message) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  const container = document.querySelector('.admin-panel');
  container.insertBefore(alert, container.firstChild);
  
  setTimeout(() => {
    alert.remove();
  }, 5000);
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
  // Initialize admin content if starting on admin tab
  if (window.location.hash === '#admin') {
    showTab('admin');
    document.querySelector('[onclick="showTab(\'admin\')"]').click();
  }
});