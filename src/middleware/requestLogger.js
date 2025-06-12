// src/middleware/requestLogger.js - Fixed hrtime issue
const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom token for response time - FIXED VERSION
morgan.token('response-time-ms', (req, res) => {
  if (!req._startTime) return '-';

  // Check if _startTime is an hrtime array or a Date
  if (Array.isArray(req._startTime)) {
    // If it's already an hrtime array, use it directly
    const diff = process.hrtime(req._startTime);
    return (diff[0] * 1000 + diff[1] * 1e-6).toFixed(2);
  } else {
    // If it's a Date object or timestamp, calculate difference manually
    const now = Date.now();
    const startTime = req._startTime instanceof Date ? req._startTime.getTime() : req._startTime;
    return (now - startTime).toFixed(2);
  }
});

// Custom token for user info
morgan.token('user', (req) => {
  return req.user ? req.user.email : 'anonymous';
});

// Custom token for API key (masked)
morgan.token('api-key', (req) => {
  const apiKey = req.headers['x-api-key'];
  return apiKey ? `${apiKey.substring(0, 8)}...` : '-';
});

// Create custom format
const customFormat =
  ':remote-addr - :user ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms';

// Create the middleware
const requestLogger = morgan(customFormat, {
  stream: {
    write: (message) => {
      // Remove trailing newline and log using our custom logger
      logger.http(message.trim());
    },
  },
  // Skip logging for health checks in production
  skip: (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return req.url.startsWith('/api/v1/health');
    }
    return false;
  },
});

module.exports = requestLogger;
