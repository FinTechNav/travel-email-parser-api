// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const parseRoutes = require('./routes/parse');
const healthRoutes = require('./routes/health');
const webhookRoutes = require('./routes/webhooks');
const authRoutes = require('./routes/auth');
const docsRoutes = require('./routes/docs');
const adminRoutes = require('./routes/admin');

// Import middlewar e
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');

const app = express();

const promptRoutes = require('./routes/prompts');
app.use('/api/v1/prompts', promptRoutes);

app.use('/api/v1/admin', adminRoutes);

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  })
);

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(
  express.json({
    limit: process.env.MAX_FILE_SIZE || '10mb',
    verify: (req, res, buf, encoding) => {
      // Store raw body for webhook signature verification
      req.rawBody = buf;
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.MAX_FILE_SIZE || '10mb',
  })
);

app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/parse', parseRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/docs', docsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Travel Email Parser API',
    version: '1.0.0',
    status: 'running',
    documentation: '/docs',
    endpoints: {
      health: '/api/v1/health',
      parse: '/api/v1/parse/email',
      itineraries: '/api/v1/parse/itineraries',
      webhooks: '/api/v1/webhooks',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.originalUrl} does not exist`,
    availableEndpoints: {
      health: '/api/v1/health',
      parse: '/api/v1/parse/email',
      docs: '/docs',
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
