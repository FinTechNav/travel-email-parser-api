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
};

// Load saved configuration
function loadConfig() {
  const saved = JSON.parse(localStorage.getItem('emailParserConfig') || '{}');

  if (saved.environment) {
    document.getElementById('environment').value = saved.environment;
    apiConfig.environment = saved.environment;
  }

  if (saved.apiKey) {
    document.getElementById('apiKey').value = saved.apiKey;
    apiConfig.apiKey = saved.apiKey;
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
    apiKey: apiConfig.apiKey,
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
function formatDate(dateString) {
  if (!dateString) return 'Not specified';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
        <div class="segment-card segment-${segment.type}">
            <div class="segment-header">
                <span class="segment-type">${segment.type.replace('_', ' ')}</span>
                ${segment.confirmationNumber ? `<span class="confirmation-number">${segment.confirmationNumber}</span>` : ''}
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
                        <span class="detail-value">${formatDate(segment.startDateTime)}</span>
                    </div>
                `
                    : ''
                }
                
                ${
                  segment.endDateTime
                    ? `
                    <div class="detail-row">
                        <span class="detail-label">Return/End:</span>
                        <span class="detail-value">${formatDate(segment.endDateTime)}</span>
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
                  details.price
                    ? `
                    <div class="detail-row">
                        <span class="detail-label">Price:</span>
                        <span class="detail-value">${details.price.currency || '$'}${details.price.amount || details.price}</span>
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
            
            <div class="segments-grid">
                ${itinerary.segments.map((segment) => renderSegment(segment)).join('')}
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

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function () {
  // Handle environment change
  document.getElementById('environment').addEventListener('change', updateApiUrl);

  // Handle custom URL change
  document.getElementById('customUrl').addEventListener('input', updateApiUrl);

  // Handle form submission
  document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    apiConfig.apiKey = document.getElementById('apiKey').value.trim();

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
  if (apiConfig.baseUrl && apiConfig.apiKey) {
    loadItineraries();
  }
});
