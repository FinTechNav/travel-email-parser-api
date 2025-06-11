// src/middleware/requestLogger.js
const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom token for response time
morgan.token('response-time-ms', (req, res) => {
  if (!req._startTime) return '-';
  const diff = process.hrtime(req._startTime);
  return (diff[0] * 1000 + diff[1] * 1e-6).toFixed(2);
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
const customFormat = ':remote-addr - :user ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms';

// Create the middleware
const requestLogger = morgan(customFormat, {
  stream: {
    write: (message) => {
      // Remove trailing newline and log
      logger.http(message.trim());
    }
  },
  // Skip logging for health checks in production
  skip: (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return req.url.startsWith('/api/v1/health');
    }
    return false;
  }
});

module.exports = requestLogger;