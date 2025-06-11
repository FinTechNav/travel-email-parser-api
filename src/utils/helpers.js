// src/utils/helpers.js
const crypto = require('crypto');
const { format, parseISO, isValid, differenceInDays, addDays } = require('date-fns');

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

/**
 * Generate a secure API key
 * @returns {string} API key
 */
const generateApiKey = () => {
  const prefix = 'tep_'; // travel email parser
  const key = generateRandomString(28);
  return prefix + key;
};

/**
 * Hash a string using SHA256
 * @param {string} str - String to hash
 * @returns {string} Hashed string
 */
const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Clean and normalize text
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
const cleanText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-.,!?()]/g, '');
};

/**
 * Extract domain from email
 * @param {string} email - Email address
 * @returns {string} Domain
 */
const extractDomain = (email) => {
  if (!isValidEmail(email)) return '';
  return email.split('@')[1].toLowerCase();
};

/**
 * Format date to ISO string
 * @param {Date|string} date - Date to format
 * @returns {string|null} ISO string or null
 */
const formatDateISO = (date) => {
  if (!date) return null;
  
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsedDate) ? parsedDate.toISOString() : null;
  } catch (error) {
    return null;
  }
};

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string
 * @returns {string} Formatted date
 */
const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
  if (!date) return '';
  
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsedDate) ? format(parsedDate, formatStr) : '';
  } catch (error) {
    return '';
  }
};

/**
 * Calculate days between dates
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Days difference
 */
const daysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    if (!isValid(start) || !isValid(end)) return 0;
    return differenceInDays(end, start);
  } catch (error) {
    return 0;
  }
};

/**
 * Check if date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} Is future date
 */
const isFutureDate = (date) => {
  if (!date) return false;
  
  try {
    const checkDate = typeof date === 'string' ? parseISO(date) : date;
    return isValid(checkDate) && checkDate > new Date();
  } catch (error) {
    return false;
  }
};

/**
 * Normalize airport/city codes
 * @param {string} location - Location string
 * @returns {string} Normalized location
 */
const normalizeLocation = (location) => {
  if (!location || typeof location !== 'string') return '';
  
  // Remove extra spaces and special characters
  let normalized = location.trim().toUpperCase();
  
  // Extract airport codes (3 letters)
  const airportMatch = normalized.match(/\b[A-Z]{3}\b/);
  if (airportMatch) {
    return airportMatch[0];
  }
  
  // Return cleaned city name
  return normalized.replace(/[^A-Z\s]/g, '').trim();
};

/**
 * Extract confirmation number from text
 * @param {string} text - Text to search
 * @returns {string|null} Confirmation number
 */
const extractConfirmationNumber = (text) => {
  if (!text || typeof text !== 'string') return null;
  
  // Common patterns for confirmation numbers
  const patterns = [
    /(?:confirmation|booking|reference)[\s:]+([A-Z0-9]{6,})/i,
    /\b[A-Z]{2}\d{4,}\b/,
    /\b[A-Z0-9]{6,8}\b/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return null;
};

/**
 * Parse price from text
 * @param {string} text - Text containing price
 * @returns {object|null} {amount: number, currency: string}
 */
const parsePrice = (text) => {
  if (!text || typeof text !== 'string') return null;
  
  // Common price patterns
  const patterns = [
    /([A-Z]{3})\s*([\d,]+\.?\d*)/i, // EUR 299.99
    /([\d,]+\.?\d*)\s*([A-Z]{3})/i, // 299.99 USD
    /\$\s*([\d,]+\.?\d*)/i, // $299.99
    /€\s*([\d,]+\.?\d*)/i, // €299.99
    /£\s*([\d,]+\.?\d*)/i  // £299.99
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.toString().includes('([A-Z]{3})')) {
        // Currency first
        return {
          amount: parseFloat(match[2].replace(/,/g, '')),
          currency: match[1].toUpperCase()
        };
      } else if (pattern.toString().includes('([A-Z]{3})') && match[2]) {
        // Amount first
        return {
          amount: parseFloat(match[1].replace(/,/g, '')),
          currency: match[2].toUpperCase()
        };
      } else {
        // Symbol-based
        const symbol = text.match(/[$€£]/)[0];
        const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP' };
        return {
          amount: parseFloat(match[1].replace(/,/g, '')),
          currency: currencyMap[symbol] || 'USD'
        };
      }
    }
  }
  
  return null;
};

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return 'untitled';
  
  return filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);
};

/**
 * Deep clone object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * Check if object is empty
 * @param {object} obj - Object to check
 * @returns {boolean} Is empty
 */
const isEmpty = (obj) => {
  if (obj == null) return true;
  if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Capitalize first letter of each word
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
const capitalizeWords = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Generate pagination metadata
 * @param {number} total - Total items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
const generatePagination = (total, page = 1, limit = 20) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
};

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise} Result of function
 */
const retry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add
 * @returns {string} Truncated text
 */
const truncate = (text, length = 100, suffix = '...') => {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= length) return text;
  
  return text.substring(0, length - suffix.length) + suffix;
};

module.exports = {
  generateRandomString,
  generateApiKey,
  hashString,
  isValidEmail,
  cleanText,
  extractDomain,
  formatDateISO,
  formatDate,
  daysBetween,
  isFutureDate,
  normalizeLocation,
  extractConfirmationNumber,
  parsePrice,
  sanitizeFilename,
  deepClone,
  isEmpty,
  capitalizeWords,
  generatePagination,
  retry,
  truncate
};