// public/js/utils/helpers.js
// Utility functions extracted from admin.js

function showAlert(type, message, duration = 5000) {
  document.querySelectorAll('.admin-alert').forEach(alert => alert.remove());

  const alertDiv = document.createElement('div');
  alertDiv.className = `admin-alert alert alert-${type}`;
  alertDiv.innerHTML = `
    <span>${message}</span>
    <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  const container = document.querySelector('.admin-panel') || document.body;
  container.insertBefore(alertDiv, container.firstChild);

  setTimeout(() => {
    if (alertDiv.parentElement) {
      alertDiv.remove();
    }
  }, duration);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSuccessRateClass(rate) {
  if (rate >= 0.9) return 'success-high';
  if (rate >= 0.7) return 'success-medium';
  return 'success-low';
}

// Global exports
window.showAlert = showAlert;
window.formatDate = formatDate;
window.getSuccessRateClass = getSuccessRateClass;
