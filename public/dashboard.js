let apiConfig = {
  baseUrl: '',
  apiKey: '',
};

// Load saved configuration
function loadConfig() {
  const saved = JSON.parse(localStorage.getItem('emailParserConfig') || '{}');
  if (saved.baseUrl) {
    document.getElementById('apiUrl').value = saved.baseUrl;
    apiConfig.baseUrl = saved.baseUrl;
  }
  if (saved.apiKey) {
    document.getElementById('apiKey').value = saved.apiKey;
    apiConfig.apiKey = saved.apiKey;
  }
}

// Save configuration
function saveConfig() {
  localStorage.setItem('emailParserConfig', JSON.stringify(apiConfig));
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

// Get segment type color
function getSegmentTypeColor(type) {
  const colors = {
    flight: '#007bff',
    hotel: '#28a745',
    car_rental: '#ffc107',
    train: '#6f42c1',
    other: '#6c757d',
  };
  return colors[type] || colors.other;
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
  // Handle form submission
  document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    apiConfig.baseUrl = document.getElementById('apiUrl').value.trim();
    apiConfig.apiKey = document.getElementById('apiKey').value.trim();

    // Remove trailing slash from URL
    if (apiConfig.baseUrl.endsWith('/')) {
      apiConfig.baseUrl = apiConfig.baseUrl.slice(0, -1);
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
