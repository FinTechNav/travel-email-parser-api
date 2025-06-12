// src/routes/parse.js
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const EmailProcessor = require('../services/emailProcessor');
const logger = require('../utils/logger');

const router = express.Router();
const emailProcessor = new EmailProcessor();

// GET /api/v1/parse/test-email-connection - Test email IMAP connection (ADD THIS)
router.get('/test-email-connection', async (req, res) => {
  try {
    const config = {
      user: process.env.PARSE_EMAIL_ADDRESS,
      password: process.env.PARSE_EMAIL_PASSWORD,
      host: process.env.PARSE_EMAIL_HOST || 'imap.zoho.com',
      port: parseInt(process.env.PARSE_EMAIL_PORT) || 993,
    };

    // Check if credentials are configured
    if (!config.user || !config.password) {
      return res.json({
        success: false,
        error: 'Email credentials not configured',
        config: {
          user: config.user ? 'SET' : 'MISSING',
          password: config.password ? 'SET' : 'MISSING',
          host: config.host,
          port: config.port,
        },
      });
    }

    // Test IMAP connection
    const Imap = require('imap');
    const imap = new Imap({
      ...config,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 10000,
    });

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 10 seconds'));
      }, 10000);

      imap.once('ready', () => {
        clearTimeout(timeout);
        imap.end();
        resolve({
          success: true,
          message: 'IMAP connection successful',
          config: {
            host: config.host,
            port: config.port,
            user: config.user,
          },
        });
      });

      imap.once('error', (err) => {
        clearTimeout(timeout);
        reject({
          success: false,
          error: err.message,
          code: err.code,
          config: {
            host: config.host,
            port: config.port,
            user: config.user,
          },
        });
      });

      imap.connect();
    });

    res.json(result);
  } catch (error) {
    res.json({
      success: false,
      error: error.message || error.error,
      code: error.code,
      config: error.config,
    });
  }
});

// POST /api/v1/parse/email - Main parsing endpoint (YOUR EXISTING CODE)
router.post(
  '/email',
  authMiddleware,
  [
    body('email_content')
      .notEmpty()
      .withMessage('Email content is required')
      .isLength({ min: 50, max: 50000 })
      .withMessage('Email content must be between 50 and 50,000 characters'),
    body('user_email').isEmail().withMessage('Valid user email is required'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email_content, user_email, metadata = {} } = req.body;

      logger.info(`Processing email for user: ${user_email}`);

      const result = await emailProcessor.processEmail({
        content: email_content,
        userEmail: user_email,
        userId: req.user.id,
        metadata,
      });

      // Track usage
      await emailProcessor.trackUsage(req.user.id, 'parse_email');

      res.json({
        success: true,
        message: 'Email processed successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Email parsing failed:', error);
      next(error);
    }
  }
);

// POST /api/v1/parse/email - Main parsing endpoint
router.post(
  '/email',
  authMiddleware,
  [
    body('email_content')
      .notEmpty()
      .withMessage('Email content is required')
      .isLength({ min: 50, max: 50000 })
      .withMessage('Email content must be between 50 and 50,000 characters'),
    body('user_email').isEmail().withMessage('Valid user email is required'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email_content, user_email, metadata = {} } = req.body;

      logger.info(`Processing email for user: ${user_email}`);

      const result = await emailProcessor.processEmail({
        content: email_content,
        userEmail: user_email,
        userId: req.user.id,
        metadata,
      });

      // Track usage
      await emailProcessor.trackUsage(req.user.id, 'parse_email');

      res.json({
        success: true,
        message: 'Email processed successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Email parsing failed:', error);
      next(error);
    }
  }
);

// POST /api/v1/parse/batch - Batch parsing endpoint
router.post(
  '/batch',
  authMiddleware,
  [
    body('emails')
      .isArray({ min: 1, max: 10 })
      .withMessage('Emails must be an array of 1-10 items'),
    body('emails.*.content').notEmpty().withMessage('Each email must have content'),
    body('emails.*.user_email').isEmail().withMessage('Each email must have a valid user_email'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { emails } = req.body;

      logger.info(`Processing ${emails.length} emails in batch for user: ${req.user.id}`);

      const results = await emailProcessor.processBatch(emails, req.user.id);

      // Track usage
      await emailProcessor.trackUsage(req.user.id, 'parse_batch', emails.length);

      res.json({
        success: true,
        message: `Processed ${emails.length} emails`,
        data: results,
      });
    } catch (error) {
      logger.error('Batch parsing failed:', error);
      next(error);
    }
  }
);

// GET /api/v1/parse/itineraries - Get user's itineraries
router.get(
  '/itineraries',
  authMiddleware,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    query('type')
      .optional()
      .isIn(['flight', 'hotel', 'car_rental', 'train', 'cruise', 'restaurant', 'event'])
      .withMessage('Invalid type filter'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { limit = 20, offset = 0, type } = req.query;

      const itineraries = await emailProcessor.getUserItineraries(req.user.id, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        type,
      });

      res.json({
        success: true,
        data: itineraries,
      });
    } catch (error) {
      logger.error('Failed to fetch itineraries:', error);
      next(error);
    }
  }
);

// GET /api/v1/parse/itinerary/:id - Get specific itinerary
router.get('/itinerary/:id', authMiddleware, async (req, res, next) => {
  try {
    const itinerary = await emailProcessor.getItinerary(req.params.id, req.user.id);

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        message: 'Itinerary not found',
      });
    }

    res.json({
      success: true,
      data: itinerary,
    });
  } catch (error) {
    logger.error('Failed to fetch itinerary:', error);
    next(error);
  }
});

// PUT /api/v1/parse/itinerary/:id - Update itinerary
router.put(
  '/itinerary/:id',
  authMiddleware,
  [
    body('trip_name')
      .optional()
      .isLength({ min: 1, max: 255 })
      .withMessage('Trip name must be between 1 and 255 characters'),
    body('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('end_date').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const updatedItinerary = await emailProcessor.updateItinerary(
        req.params.id,
        req.user.id,
        req.body
      );

      if (!updatedItinerary) {
        return res.status(404).json({
          success: false,
          message: 'Itinerary not found',
        });
      }

      res.json({
        success: true,
        message: 'Itinerary updated successfully',
        data: updatedItinerary,
      });
    } catch (error) {
      logger.error('Failed to update itinerary:', error);
      next(error);
    }
  }
);

// DELETE /api/v1/parse/itinerary/:id - Delete itinerary
router.delete('/itinerary/:id', authMiddleware, async (req, res, next) => {
  try {
    const deleted = await emailProcessor.deleteItinerary(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Itinerary not found',
      });
    }

    res.json({
      success: true,
      message: 'Itinerary deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete itinerary:', error);
    next(error);
  }
});

// GET /api/v1/parse/stats - Get parsing statistics
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const stats = await emailProcessor.getUserStats(req.user.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to fetch stats:', error);
    next(error);
  }
});

module.exports = router;
