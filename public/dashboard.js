// Environment configuration
const environments = {
  local: 'http://localhost:3000/api/v1',
  hosted: 'https://your-travel-parser.railway.app/api/v1', // Update this with your actual hosted URL
  custom: '',
};

let apiConfig = {
  baseUrl: '',
  apiKey: '',
  environment: 'local',
  selectedUser: null,
};

let users = [];

// Load saved configuration
function loadConfig() {
  const saved = JSON.parse(localStorage.getItem('emailParserConfig') || '{}');

  if (saved.environment) {
    document.getElementById('environment').value = saved.environment;
    apiConfig.environment = saved.environment;
  }

  if (saved.selectedUser) {
    apiConfig.selectedUser = saved.selectedUser;
    // Will be set after users are loaded
  }

  if (saved.customUrl) {
    document.getElementById('customUrl').value = saved.customUrl;
  }

  updateApiUrl();
}

// Save configuration
function saveConfig() {
  const config = {
    environment: apiConfig.environment,
    selectedUser: apiConfig.selectedUser,
  };

  if (apiConfig.environment === 'custom') {
    config.customUrl = document.getElementById('customUrl').value;
  }

  localStorage.setItem('emailParserConfig', JSON.stringify(config));
}

// Update API URL based on environment selection
function updateApiUrl() {
  const environment = document.getElementById('environment').value;
  const customUrlGroup = document.getElementById('customUrlGroup');
  const currentUrlSpan = document.getElementById('currentUrl');

  if (environment === 'custom') {
    customUrlGroup.style.display = 'block';
    const customUrl = document.getElementById('customUrl').value;
    apiConfig.baseUrl = customUrl || '';
    currentUrlSpan.textContent = customUrl || 'Please enter custom URL';
  } else {
    customUrlGroup.style.display = 'none';
    apiConfig.baseUrl = environments[environment];
    currentUrlSpan.textContent = environments[environment];
  }

  apiConfig.environment = environment;
}

// Load users from API
async function loadUsers() {
  try {
    const response = await fetch(`${apiConfig.baseUrl}/auth/users`);
    const result = await response.json();

    if (result.success) {
      users = result.data;
      populateUserDropdown();
    } else {
      console.error('Failed to load users:', result.message);
      updateUserDropdown('Error loading users');
    }
  } catch (error) {
    console.error('Error loading users:', error);
    updateUserDropdown('Error loading users');
  }
}

// Populate user dropdown
function populateUserDropdown() {
  const select = document.getElementById('userSelect');
  select.innerHTML = '<option value="">Select a user...</option>';

  users.forEach((user) => {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = `${user.name} (${user.email})`;
    option.dataset.user = JSON.stringify(user);
    select.appendChild(option);
  });

  // Restore saved selection
  if (apiConfig.selectedUser) {
    const savedUser = users.find((u) => u.id === apiConfig.selectedUser);
    if (savedUser) {
      select.value = savedUser.id;
      updateUserInfo(savedUser);
    }
  }
}

// Update user dropdown with message
function updateUserDropdown(message) {
  const select = document.getElementById('userSelect');
  select.innerHTML = `<option value="">${message}</option>`;
  hideUserInfo();
}

// Update user info display
function updateUserInfo(user) {
  if (!user) {
    hideUserInfo();
    return;
  }

  document.getElementById('userEmail').textContent = user.email;
  document.getElementById('userName').textContent = user.name || 'N/A';
  document.getElementById('userCreated').textContent = new Date(user.createdAt).toLocaleString();
  document.getElementById('userApiKey').textContent = user.apiKey;
  document.getElementById('userInfo').style.display = 'block';

  // Update API config
  apiConfig.apiKey = user.apiKey;
  apiConfig.selectedUser = user.id;
}

// Hide user info
function hideUserInfo() {
  document.getElementById('userInfo').style.display = 'none';
  apiConfig.apiKey = '';
  apiConfig.selectedUser = null;
}

// Handle user selection
function handleUserSelection() {
  const select = document.getElementById('userSelect');
  const selectedOption = select.options[select.selectedIndex];

  if (selectedOption && selectedOption.dataset.user) {
    const user = JSON.parse(selectedOption.dataset.user);
    updateUserInfo(user);
  } else {
    hideUserInfo();
  }
}

// Update status
function updateStatus(type, message) {
  const indicator = document.getElementById('statusIndicator');
  const text = document.getElementById('statusText');

  indicator.className = 'status-indicator status-' + type;
  text.textContent = message;
}

// API request helper
async function apiRequest(endpoint, options = {}) {
  const url = `${apiConfig.baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': apiConfig.apiKey,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${response.statusText}`);
  }

  return response.json();
}

// Format date with location-aware timezone
function formatDate(dateString, segment = null, isArrival = false) {
  if (!dateString) return 'Not specified';

  const date = new Date(dateString);

  // Default to user's timezone
  let timeZone = 'America/New_York'; // Your EST timezone

  if (segment) {
    // Special timezone handling for private terminals
    if (segment.type === 'private_terminal') {
      // Use facility timezone (origin), NOT destination timezone
      timeZone = inferTimezoneFromLocation(segment.origin) || timeZone;
      console.log(`🌎 Private terminal ${segment.origin} using timezone: ${timeZone}`);
    } else if (segment.type === 'flight') {
      // For flights: departure times in departure timezone, arrival times in arrival timezone
      if (isArrival) {
        timeZone = inferTimezoneFromLocation(segment.destination) || timeZone;
      } else {
        timeZone = inferTimezoneFromLocation(segment.origin) || timeZone;
      }
    } else {
      // For hotels/cars: use destination timezone
      timeZone = inferTimezoneFromLocation(segment.destination) || timeZone;
    }
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone,
    timeZoneName: 'short',
  });
}

function inferTimezoneFromLocation(location) {
  if (!location) return null;

  const locationTimezones = {
    // PS Private Terminal Facilities (use facility timezone)
    'ps atl': 'America/New_York',     // PS Atlanta → Eastern Time
    'ps lax': 'America/Los_Angeles',  // PS Los Angeles → Pacific Time  
    'ps jfk': 'America/New_York',     // PS JFK → Eastern Time
    'ps ord': 'America/Chicago',      // PS Chicago → Central Time

    // Regular locations
    atlanta: 'America/New_York',
    atl: 'America/New_York',
    austin: 'America/Chicago',
    aus: 'America/Chicago',
    'austin, tx': 'America/Chicago',
    'new york': 'America/New_York',
    nyc: 'America/New_York',
    'los angeles': 'America/Los_Angeles',
    lax: 'America/Los_Angeles',
    chicago: 'America/Chicago',
    ord: 'America/Chicago',
    denver: 'America/Denver',
    den: 'America/Denver',
    phoenix: 'America/Phoenix',
    phx: 'America/Phoenix',
    miami: 'America/New_York',
    mia: 'America/New_York',
    seattle: 'America/Los_Angeles',
    sea: 'America/Los_Angeles',
  };

  const normalizedLocation = location.toLowerCase().trim();

  if (locationTimezones[normalizedLocation]) {
    return locationTimezones[normalizedLocation];
  }

  for (const [key, timezone] of Object.entries(locationTimezones)) {
    if (normalizedLocation.includes(key)) {
      return timezone;
    }
  }

  return null;
}

// Format date range
function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return 'Dates not specified';
  if (!endDate) return `From ${formatDate(startDate)}`;
  if (!startDate) return `Until ${formatDate(endDate)}`;

  const start = new Date(startDate);
  const end = new Date(endDate);

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// Render segment

function renderSegment(segment) {
  const details = segment.details || {};

  return `
        <div class="segment-card segment-${segment.type}" data-segment-id="${segment.id}">
            <div class="segment-header">
                <span class="segment-type">${segment.type.replace('_', ' ')}</span>
                ${segment.confirmationNumber ? `<span class="confirmation-number">${segment.confirmationNumber}</span>` : ''}
                ${details.flight_number ? `<span class="flight-number" style="background: rgba(0,123,255,0.1); color: #007bff; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; margin-left: 8px;">${details.flight_number}</span>` : ''}
                <button class="delete-segment-btn" data-segment-id="${segment.id}" style="
                    background: #dc3545; 
                    color: white; 
                    border: none; 
                    padding: 4px 8px; 
                    border-radius: 6px; 
                    font-size: 0.7rem; 
                    cursor: pointer; 
                    margin-left: auto;
                    transition: all 0.2s ease;
                ">
                    🗑️ Delete
                </button>
            </div>
            
            ${
              segment.origin || segment.destination
                ? `
                <div class="route-display">
                    <span class="location">${segment.origin || 'Origin'}</span>
                    <span class="route-arrow">→</span>
                    <span class="location">${segment.destination || 'Destination'}</span>
                </div>
            `
                : ''
            }
            
            <div class="segment-details">
                ${
                  segment.startDateTime
                    ? `
                    <div class="detail-row">
                        <span class="detail-label">${segment.type === 'hotel' ? 'Check-in:' : 'Departure:'}</span>
                        <span class="detail-value">${formatDate(segment.startDateTime, segment, false)}</span>
                    </div>
                `
                    : ''
                }
                
                ${
                  segment.endDateTime
                    ? `
                    <div class="detail-row">
                        <span class="detail-label">${segment.type === 'hotel' ? 'Check-out:' : 'Arrival:'}</span>
                        <span class="detail-value">${formatDate(segment.endDateTime, segment, true)}</span>
                    </div>
                `
                    : ''
                }
                
                ${
                  details.passenger_name
                    ? `
                    <div class="detail-row">
                        <span class="detail-label">Passenger:</span>
                        <span class="detail-value">${details.passenger_name}</span>
                    </div>
                `
                    : ''
                }
                
                ${
                  details.seat
                    ? `
                    <div class="detail-row">
                        <span class="detail-label">Seat:</span>
                        <span class="detail-value">${details.seat}</span>
                    </div>
                `
                    : ''
                }
                
                ${
                  details.aircraft
                    ? `
                    <div class="detail-row">
                        <span class="detail-label">Aircraft:</span>
                        <span class="detail-value">${details.aircraft}</span>
                    </div>
                `
                    : ''
                }
                
                ${
                  details.price
                    ? `
                    <div class="detail-row">
                        <span class="detail-label">Price:</span>
                        <span class="detail-value">${details.price.currency || '$'}${details.price.amount || details.price}</span>
                    </div>
                `
                    : ''
                }
                
                ${
                  details.segment_index && details.total_segments
                    ? `
                    <div class="detail-row">
                        <span class="detail-label">Segment:</span>
                        <span class="detail-value">${details.segment_index} of ${details.total_segments}</span>
                    </div>
                `
                    : ''
                }
            </div>
        </div>
    `;
}

// Render itinerary

function renderItinerary(itinerary) {
  // Sort segments by startDateTime (chronological order)
  const sortedSegments = [...itinerary.segments].sort((a, b) => {
    // Handle null dates by putting them at the end
    if (!a.startDateTime && !b.startDateTime) return 0;
    if (!a.startDateTime) return 1;
    if (!b.startDateTime) return -1;

    const dateA = new Date(a.startDateTime);
    const dateB = new Date(b.startDateTime);

    return dateA - dateB;
  });

  return `
        <div class="email-result">
            <div class="result-header">
                <div class="trip-info">
                    <div class="trip-name">${itinerary.tripName || 'Travel Itinerary'}</div>
                    <div class="trip-dates">${formatDateRange(itinerary.startDate, itinerary.endDate)}</div>
                    ${itinerary.destination ? `<div class="trip-destination">📍 ${itinerary.destination}</div>` : ''}
                </div>
                <div class="timestamp">
                    ${formatDate(itinerary.updatedAt || itinerary.createdAt)}
                </div>
            </div>
            
            <div class="segments-timeline">
                ${sortedSegments
                  .map(
                    (segment, index) => `
                    ${renderSegment(segment)}
                    ${index < sortedSegments.length - 1 ? renderTimelineConnector(sortedSegments[index], sortedSegments[index + 1]) : ''}
                `
                  )
                  .join('')}
            </div>
        </div>
    `;
}

// Add this new function to render timeline connectors
function renderTimelineConnector(currentSegment, nextSegment) {
  if (!currentSegment.endDateTime || !nextSegment.startDateTime) {
    return '<div class="timeline-connector simple">⬇️</div>';
  }

  const currentEnd = new Date(currentSegment.endDateTime || currentSegment.startDateTime);
  const nextStart = new Date(nextSegment.startDateTime);
  const timeDiff = nextStart - currentEnd;
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  let timeText = '';
  if (days > 0) {
    timeText = `${days} day${days > 1 ? 's' : ''} later`;
  } else if (hours > 0) {
    timeText = `${hours} hour${hours > 1 ? 's' : ''} later`;
  } else {
    timeText = 'Next';
  }

  return `
        <div class="timeline-connector" style="
            text-align: center;
            padding: 10px;
            color: #6c757d;
            font-size: 0.9rem;
            background: linear-gradient(to bottom, transparent 45%, #e9ecef 45%, #e9ecef 55%, transparent 55%);
        ">
            <div style="background: white; padding: 5px 15px; border-radius: 20px; display: inline-block; border: 2px solid #e9ecef;">
                ⬇️ ${timeText}
            </div>
        </div>
    `;
}

// Load itineraries

async function loadItineraries() {
  if (!apiConfig.baseUrl || !apiConfig.apiKey) {
    return;
  }

  updateStatus('loading', 'Loading recent travel data...');

  try {
    const response = await apiRequest('/parse/itineraries?limit=5');

    if (response.success && response.data.length > 0) {
      updateStatus('connected', `Found ${response.data.length} travel itineraries`);

      const html = response.data.map((itinerary) => renderItinerary(itinerary)).join('');
      document.getElementById('resultsContainer').innerHTML = html;

      // Add event listeners to delete buttons after rendering
      addDeleteEventListeners();
    } else {
      updateStatus('connected', 'Connected - No travel data found');
      document.getElementById('resultsContainer').innerHTML = `
                <div class="empty-state">
                    <h3>📭 No travel data found</h3>
                    <p>Forward your travel confirmation emails to trips@fintechnav.com<br>
                    The system will automatically process them within 2 minutes.</p>
                </div>
            `;
    }
  } catch (error) {
    console.error('Error loading itineraries:', error);
    updateStatus('error', `Connection failed: ${error.message}`);
    document.getElementById('resultsContainer').innerHTML = `
            <div class="error-message">
                <h3>❌ Unable to load travel data</h3>
                <p>${error.message}</p>
                <p>Please check your API URL and key configuration.</p>
            </div>
        `;
  }
}

// Add this function in public/dashboard.js after loadItineraries
function addDeleteEventListeners() {
  // Add event listeners to individual delete buttons
  document.querySelectorAll('.delete-segment-btn').forEach((button) => {
    button.addEventListener('click', async function () {
      const segmentId = this.getAttribute('data-segment-id');
      await deleteSegment(segmentId);
    });

    // Add hover effects
    button.addEventListener('mouseenter', function () {
      this.style.background = '#c82333';
    });

    button.addEventListener('mouseleave', function () {
      this.style.background = '#dc3545';
    });
  });
}

// Refresh users list
async function refreshUsers() {
  updateUserDropdown('Refreshing users...');
  updateApiUrl(); // Make sure API URL is current
  await loadUsers();
}

// Delete segment function

// REPLACE the deleteSegment function in public/dashboard.js

async function deleteSegment(segmentId) {
  try {
    updateStatus('loading', 'Checking segment details...');

    // First, get segment info to determine if we need special confirmation
    const segmentInfo = await apiRequest(`/parse/segment/${segmentId}/info`);

    let confirmMessage =
      'Are you sure you want to delete this travel segment? This will also mark the original email as unprocessed so it can be re-parsed.';

    // If this is a flight segment with multiple related segments
    if (segmentInfo && segmentInfo.relatedSegmentsCount > 1) {
      confirmMessage = `This flight is part of a ${segmentInfo.relatedSegmentsCount}-segment booking. Deleting this will remove ALL ${segmentInfo.relatedSegmentsCount} flight segments from this booking and mark the email as unprocessed. Continue?`;
    }

    if (!confirm(confirmMessage)) {
      updateStatus('connected', 'Delete cancelled');
      return;
    }

    updateStatus('loading', 'Deleting segment(s)...');

    const response = await apiRequest(`/parse/segment/${segmentId}`, {
      method: 'DELETE',
    });

    if (response.success) {
      const message =
        response.deletedCount > 1
          ? `${response.deletedCount} segments deleted successfully`
          : 'Segment deleted successfully';

      updateStatus('connected', message);

      // Refresh the entire view to show updated state
      setTimeout(() => {
        loadItineraries();
      }, 500);
    } else {
      updateStatus('error', `Failed to delete segment: ${response.message}`);
    }
  } catch (error) {
    console.error('Error deleting segment:', error);
    updateStatus('error', `Delete failed: ${error.message}`);
  }
}

// Wait for DOM to be ready
// In public/dashboard.js - Update the DOMContentLoaded section
document.addEventListener('DOMContentLoaded', function () {
  // Handle environment change
  document.getElementById('environment').addEventListener('change', function () {
    updateApiUrl();
    refreshUsers(); // Reload users when environment changes
  });

  // Handle custom URL change
  document.getElementById('customUrl').addEventListener('input', updateApiUrl);

  // Handle user selection
  document.getElementById('userSelect').addEventListener('change', handleUserSelection);

  // Handle form submission
  document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!apiConfig.apiKey) {
      updateStatus('error', 'Please select a user first');
      return;
    }

    // Update API URL based on current selection
    updateApiUrl();

    if (!apiConfig.baseUrl) {
      updateStatus('error', 'Please enter a valid API URL');
      return;
    }

    saveConfig();
    await loadItineraries();
  });

  // Auto-refresh every 30 seconds if connected
  setInterval(() => {
    if (apiConfig.baseUrl && apiConfig.apiKey) {
      loadItineraries();
    }
  }, 30000);

  // Initialize
  loadConfig();

  // Load users initially
  if (apiConfig.baseUrl) {
    refreshUsers();
  }
});
// =====================================================================
// CSP-COMPLIANT TAB MANAGEMENT FOR DASHBOARD.JS
// Add this code to the END of your existing dashboard.js file
// =====================================================================

// =====================================================================
// TAB MANAGEMENT - CSP COMPLIANT EVENT LISTENERS
// =====================================================================

// Add event listeners for tab navigation (CSP compliant)
document.addEventListener('DOMContentLoaded', () => {
  // Add click event listeners to all tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function(e) {
      const tabName = this.getAttribute('data-tab');
      showTab(tabName, this);
    });
  });
  
  // Add click event listeners to admin action buttons
  setupAdminActionListeners();
});

// Update the showTab function to be CSP compliant
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
    // Load modals if admin.js is available
    if (typeof loadModals === 'function') {
      loadModals();
    } else {
      // Create basic admin functionality
      setupBasicAdminFunctionality();
    }
  }
}

function setupBasicAdminFunctionality() {
  // Basic admin setup if admin.js is not loaded
  const adminActionButtons = document.querySelectorAll('[data-action]');
  adminActionButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const action = this.getAttribute('data-action');
      console.log(`Admin action: ${action}`);
      
      // Show basic alerts for actions
      const alert = document.createElement('div');
      alert.className = 'alert alert-info';
      alert.textContent = `Admin action "${action}" triggered. Full admin system may need setup.`;
      
      const adminPanel = document.querySelector('.admin-panel');
      if (adminPanel) {
        adminPanel.insertBefore(alert, adminPanel.firstChild);
        setTimeout(() => alert.remove(), 3000);
      }
    });
  });
}

function setupAdminActionListeners() {
  // Handle all data-action buttons throughout the page
  document.addEventListener('click', function(e) {
    const target = e.target;
    const action = target.getAttribute('data-action');
    
    if (action) {
      e.preventDefault();
      handleAdminAction(action, target);
    }
  });
}

function handleAdminAction(action, element) {
  switch(action) {
    case 'check-system-status':
      showAlert('info', 'Checking system status...');
      break;
    case 'test-classification-rules':
      showAlert('info', 'Opening test classification modal...');
      break;
    case 'fix-ps-timezone':
      showAlert('info', 'Fixing PS timezone issues...');
      break;
    case 'reprocess-all-segments':
      if (confirm('Reprocess all segments?')) {
        showAlert('info', 'Starting reprocessing...');
      }
      break;
    case 'load-segment-types':
      showAlert('info', 'Loading segment types...');
      break;
    case 'load-classification-rules':
      showAlert('info', 'Loading classification rules...');
      break;
    case 'load-prompts':
      showAlert('info', 'Loading AI prompts...');
      break;
    default:
      console.log(`Admin action: ${action}`);
      showAlert('info', `Action "${action}" triggered`);
  }
}

function showAlert(type, message) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  // Try to find admin panel first, then any container
  let container = document.querySelector('.admin-panel');
  if (!container) {
    container = document.querySelector('.config-panel');
  }
  if (!container) {
    container = document.querySelector('.container');
  }
  
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
// SAFE CSP-COMPLIANT TAB MANAGEMENT FOR DASHBOARD.JS
// Add this code to the END of your existing dashboard.js file
// =====================================================================

// =====================================================================
// SAFE EVENT LISTENER SETUP
// =====================================================================

function setupSafeEventListeners() {
  // Setup tab navigation with null checks
  const tabButtons = document.querySelectorAll('.tab-button');
  if (tabButtons && tabButtons.length > 0) {
    tabButtons.forEach(button => {
      if (button && typeof button.addEventListener === 'function') {
        button.addEventListener('click', function(e) {
          const tabName = this.getAttribute('data-tab');
          if (tabName) {
            showTabSafe(tabName, this);
          }
        });
      }
    });
  }
  
  // Setup admin action listeners with null checks
  const actionButtons = document.querySelectorAll('[data-action]');
  if (actionButtons && actionButtons.length > 0) {
    actionButtons.forEach(button => {
      if (button && typeof button.addEventListener === 'function') {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          const action = this.getAttribute('data-action');
          if (action) {
            handleAdminActionSafe(action, this);
          }
        });
      }
    });
  }
}

// Safe tab switching function
function showTabSafe(tabName, clickedButton) {
  try {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabContents) {
      tabContents.forEach(tab => {
        if (tab) tab.classList.remove('active');
      });
    }
    
    // Remove active class from all buttons
    const allTabButtons = document.querySelectorAll('.tab-button');
    if (allTabButtons) {
      allTabButtons.forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
    }
    
    // Show selected tab
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
      targetTab.classList.add('active');
    }
    
    if (clickedButton) {
      clickedButton.classList.add('active');
    }
    
    // Load admin content if admin tab selected
    if (tabName === 'admin') {
      loadAdminContentSafe();
    }
  } catch (error) {
    console.error('Error in showTabSafe:', error);
  }
}

// Safe admin content loading
function loadAdminContentSafe() {
  try {
    // Check if admin.js functions are available
    if (typeof loadModals === 'function') {
      loadModals();
    } else {
      // Basic admin setup without full admin.js
      setupBasicAdminFunctionality();
    }
  } catch (error) {
    console.error('Error loading admin content:', error);
    setupBasicAdminFunctionality();
  }
}

// Basic admin functionality fallback
function setupBasicAdminFunctionality() {
  const adminPanel = document.querySelector('.admin-panel');
  if (!adminPanel) return;
  
  // Show a message that admin system needs setup
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-info';
  alertDiv.innerHTML = `
    <h5>🔧 Admin System Setup Required</h5>
    <p>The admin panel requires backend setup. Run the following command:</p>
    <code>node scripts/setup-admin-system-fixed.js</code>
    <p style="margin-top: 10px;">This will create the necessary database tables and API endpoints.</p>
  `;
  
  // Only add if not already present
  if (!adminPanel.querySelector('.alert-info')) {
    adminPanel.insertBefore(alertDiv, adminPanel.firstChild);
  }
}

// Safe admin action handler
function handleAdminActionSafe(action, element) {
  try {
    switch(action) {
      case 'check-system-status':
        showAlertSafe('info', 'Checking system status... (Admin system setup required)');
        break;
      case 'test-classification-rules':
        showAlertSafe('info', 'Test classification requires admin system setup');
        break;
      case 'fix-ps-timezone':
        showAlertSafe('info', 'PS timezone fix requires admin system setup');
        break;
      case 'reprocess-all-segments':
        showAlertSafe('info', 'Segment reprocessing requires admin system setup');
        break;
      case 'load-segment-types':
        loadSegmentTypesSafe();
        break;
      case 'load-classification-rules':
        showAlertSafe('info', 'Classification rules require admin system setup');
        break;
      case 'load-prompts':
        showAlertSafe('info', 'AI prompts require admin system setup');
        break;
      case 'show-create-segment-modal':
      case 'show-create-rule-modal':
      case 'show-create-prompt-modal':
        showAlertSafe('info', 'Modal functionality requires admin system setup');
        break;
      default:
        console.log(`Admin action: ${action}`);
        showAlertSafe('info', `Action "${action}" requires admin system setup`);
    }
  } catch (error) {
    console.error('Error in handleAdminActionSafe:', error);
  }
}

// Safe segment types loading with proper error handling
async function loadSegmentTypesSafe() {
  const container = document.getElementById('segmentTypesContainer');
  if (!container) return;
  
  container.innerHTML = '<div style="padding: 20px; text-align: center;">Checking for admin system...</div>';
  
  try {
    const response = await fetch('/api/admin/segment-types');
    
    if (response.status === 404) {
      // API endpoint doesn't exist
      container.innerHTML = `
        <div class="alert alert-warning">
          <h5>⚠️ Admin API Not Found</h5>
          <p>The admin system backend is not set up yet.</p>
          <p><strong>Setup Instructions:</strong></p>
          <ol style="text-align: left; margin: 10px 0;">
            <li>Run: <code>node scripts/setup-admin-system-fixed.js</code></li>
            <li>Add admin routes to your Express app</li>
            <li>Restart your server</li>
          </ol>
        </div>
      `;
      return;
    }
    
    if (response.ok) {
      const segmentTypes = await response.json();
      displaySegmentTypesSafe(segmentTypes);
      
      const countElement = document.getElementById('segmentTypeCount');
      if (countElement) {
        countElement.textContent = `${segmentTypes.length} types`;
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error loading segment types:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <h5>❌ Could not load segment types</h5>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Make sure the admin system is set up and your server is running.</p>
      </div>
    `;
  }
}

// Safe segment types display
function displaySegmentTypesSafe(segmentTypes) {
  const container = document.getElementById('segmentTypesContainer');
  if (!container) return;
  
  if (!segmentTypes || segmentTypes.length === 0) {
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
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${segmentTypes.map(type => `
          <tr>
            <td><code>${type.name || 'Unknown'}</code></td>
            <td>${type.display_name || type.displayName || 'N/A'}</td>
            <td>
              <span class="status-badge ${type.is_active ? 'status-active' : 'status-inactive'}">
                ${type.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>${type.default_timezone || type.defaultTimezone || 'N/A'}</td>
            <td>
              <button class="btn-admin btn-small" disabled>Edit (Setup Required)</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
}

// Safe alert function
function showAlertSafe(type, message) {
  try {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Try to find the best container
    let container = document.querySelector('.admin-panel');
    if (!container) {
      container = document.querySelector('.config-panel');
    }
    if (!container) {
      container = document.querySelector('.container');
    }
    
    if (container) {
      container.insertBefore(alert, container.firstChild);
      
      setTimeout(() => {
        if (alert && alert.parentNode) {
          alert.remove();
        }
      }, 5000);
    }
  } catch (error) {
    console.error('Error showing alert:', error);
    // Fallback to console if DOM manipulation fails
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}

// =====================================================================
// INITIALIZATION - SAFE VERSION
// =====================================================================

// Use a more robust initialization approach
function initializeDashboardSafe() {
  try {
    setupSafeEventListeners();
    
    // Handle hash-based navigation
    if (window.location.hash === '#admin') {
      setTimeout(() => {
        const adminButton = document.querySelector('[data-tab="admin"]');
        if (adminButton) {
          adminButton.click();
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error initializing dashboard:', error);
  }
}

// Multiple initialization approaches for maximum compatibility
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboardSafe);
} else {
  // DOM is already loaded
  initializeDashboardSafe();
}

// Backup initialization after a delay
setTimeout(initializeDashboardSafe, 500);

// =====================================================================
// EXPORT FUNCTIONS FOR ADMIN.JS COMPATIBILITY
// =====================================================================

// Make functions available globally for admin.js
window.showTabSafe = showTabSafe;
window.showAlertSafe = showAlertSafe;
window.loadSegmentTypesSafe = loadSegmentTypesSafe;