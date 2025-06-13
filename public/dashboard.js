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

// Format date

// Format date with location-aware timezone
function formatDate(dateString, segment = null) {
  if (!dateString) return 'Not specified';

  const date = new Date(dateString);

  // For travel segments, try to display in destination timezone
  let timeZone = 'America/New_York'; // Default to your timezone

  if (segment) {
    // Determine appropriate timezone based on segment type and location
    if (segment.type === 'flight') {
      // For flights, show departure in departure timezone, arrival in arrival timezone
      // This would require more complex logic, for now use destination
      timeZone = inferTimezoneFromLocation(segment.destination) || timeZone;
    } else if (segment.type === 'hotel') {
      // Hotels should display in hotel's local timezone
      timeZone = inferTimezoneFromLocation(segment.destination) || timeZone;
    } else if (segment.type === 'car_rental') {
      // Car rentals should display in pickup location timezone
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

// Helper function to infer timezone from location (same as backend)
function inferTimezoneFromLocation(location) {
  if (!location) return null;

  const locationTimezones = {
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

  // Direct match
  if (locationTimezones[normalizedLocation]) {
    return locationTimezones[normalizedLocation];
  }

  // Partial match
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
                        <span class="detail-label">Departure:</span>
                        <span class="detail-value">${formatDate(segment.startDateTime, segment)}</span>
                    </div>
                `
                    : ''
                }
                
                ${
                  segment.endDateTime
                    ? `
                    <div class="detail-row">
                        <span class="detail-label">Arrival:</span>
                        <span class="detail-value">${formatDate(segment.endDateTime, segment)}</span>
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
async function deleteSegment(segmentId) {
  if (
    !confirm(
      'Are you sure you want to delete this travel segment? This will also mark the original email as unprocessed so it can be re-parsed.'
    )
  ) {
    return;
  }

  try {
    updateStatus('loading', 'Deleting segment...');

    const response = await apiRequest(`/parse/segment/${segmentId}`, {
      method: 'DELETE',
    });

    if (response.success) {
      updateStatus('connected', 'Segment deleted successfully');

      // Remove the segment card from the DOM
      const segmentCard = document.querySelector(`[data-segment-id="${segmentId}"]`);
      if (segmentCard) {
        segmentCard.style.transition = 'opacity 0.3s ease';
        segmentCard.style.opacity = '0';
        setTimeout(() => {
          segmentCard.remove();

          // Check if itinerary is now empty
          const itineraryCard = segmentCard.closest('.email-result');
          const remainingSegments = itineraryCard.querySelectorAll('.segment-card');
          if (remainingSegments.length === 0) {
            itineraryCard.style.transition = 'opacity 0.3s ease';
            itineraryCard.style.opacity = '0';
            setTimeout(() => {
              itineraryCard.remove();
              // Refresh the entire view
              loadItineraries();
            }, 300);
          }
        }, 300);
      }
    } else {
      updateStatus('error', `Failed to delete segment: ${response.message}`);
    }
  } catch (error) {
    console.error('Error deleting segment:', error);
    updateStatus('error', `Delete failed: ${error.message}`);
  }
}

// Add bulk delete function (optional)
async function deleteAllSegments() {
  if (
    !confirm(
      'Are you sure you want to delete ALL travel segments? This will mark all emails as unprocessed.'
    )
  ) {
    return;
  }

  const segmentCards = document.querySelectorAll('[data-segment-id]');
  const deletePromises = [];

  for (const card of segmentCards) {
    const segmentId = card.getAttribute('data-segment-id');
    deletePromises.push(deleteSegment(segmentId));
  }

  try {
    await Promise.all(deletePromises);
    updateStatus('connected', 'All segments deleted');
    loadItineraries(); // Refresh the view
  } catch (error) {
    updateStatus('error', 'Some deletions failed');
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

  // Handle delete all button
  document.getElementById('deleteAllBtn').addEventListener('click', deleteAllSegments);

  // Add hover effects to delete all button
  const deleteAllBtn = document.getElementById('deleteAllBtn');
  deleteAllBtn.addEventListener('mouseenter', function () {
    this.style.background = '#c82333';
  });
  deleteAllBtn.addEventListener('mouseleave', function () {
    this.style.background = '#dc3545';
  });

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
