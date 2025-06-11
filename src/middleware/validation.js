// src/middleware/validation.js
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed:', {
      url: req.url,
      method: req.method,
      errors: errors.array(),
      user: req.user?.email || 'anonymous'
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }

  next();
};

// Common validation schemas
const emailValidation = {
  email_content: {
    notEmpty: {
      errorMessage: 'Email content is required'
    },
    isLength: {
      options: { min: 50, max: 50000 },
      errorMessage: 'Email content must be between 50 and 50,000 characters'
    }
  },
  user_email: {
    isEmail: {
      errorMessage: 'Valid user email is required'
    },
    normalizeEmail: true
  }
};

const paginationValidation = {
  limit: {
    optional: true,
    isInt: {
      options: { min: 1, max: 100 },
      errorMessage: 'Limit must be between 1 and 100'
    },
    toInt: true
  },
  offset: {
    optional: true,
    isInt: {
      options: { min: 0 },
      errorMessage: 'Offset must be a non-negative integer'
    },
    toInt: true
  }
};

module.exports = {
  handleValidationErrors,
  emailValidation,
  paginationValidation
};