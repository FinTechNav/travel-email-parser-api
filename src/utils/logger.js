// src/utils/logger.js - Custom homegrown logger
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// Log levels
const levels = {
  error: { priority: 0, color: colors.red, label: 'ERROR' },
  warn: { priority: 1, color: colors.yellow, label: 'WARN ' },
  info: { priority: 2, color: colors.green, label: 'INFO ' },
  http: { priority: 3, color: colors.magenta, label: 'HTTP ' },
  debug: { priority: 4, color: colors.gray, label: 'DEBUG' },
};

class CustomLogger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.currentLogLevel = levels[this.logLevel]?.priority ?? 2;

    // Create logs directory if needed (only in production)
    if (process.env.NODE_ENV === 'production') {
      this.logsDir = path.join(__dirname, '../../logs');
      this.ensureLogsDirectory();
    }
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  formatTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}:${milliseconds}`;
  }

  formatMessage(level, message) {
    const timestamp = this.formatTimestamp();
    const levelInfo = levels[level];

    // Console format (with colors)
    const consoleMessage = `${timestamp} ${levelInfo.color}${levelInfo.label}${colors.reset}: ${message}`;

    // File format (no colors)
    const fileMessage = `${timestamp} ${levelInfo.label}: ${message}`;

    return { consoleMessage, fileMessage, timestamp };
  }

  log(level, message) {
    const levelInfo = levels[level];
    if (!levelInfo || levelInfo.priority > this.currentLogLevel) {
      return; // Don't log if level is disabled
    }

    const { consoleMessage, fileMessage } = this.formatMessage(level, message);

    // Always log to console
    console.log(consoleMessage);

    // Log to files in production
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(level, fileMessage);
    }
  }

  writeToFile(level, message) {
    try {
      // Write to combined log
      const combinedLogPath = path.join(this.logsDir, 'combined.log');
      fs.appendFileSync(combinedLogPath, message + '\n');

      // Write errors to separate error log
      if (level === 'error') {
        const errorLogPath = path.join(this.logsDir, 'error.log');
        fs.appendFileSync(errorLogPath, message + '\n');
      }
    } catch (error) {
      // If file logging fails, just continue (don't crash the app)
      console.error('Failed to write to log file:', error.message);
    }
  }

  // Public logging methods
  error(message) {
    this.log('error', message);
  }

  warn(message) {
    this.log('warn', message);
  }

  info(message) {
    this.log('info', message);
  }

  http(message) {
    this.log('http', message);
  }

  debug(message) {
    this.log('debug', message);
  }
}

// Create and export singleton instance
const logger = new CustomLogger();

module.exports = logger;
