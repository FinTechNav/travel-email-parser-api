// src/server.js
require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { PrismaClient } = require('@prisma/client');
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Import email services
const EmailProcessor = require('./services/emailProcessor');
const EmailPoller = require('./services/emailPoller');

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Initialize email services
const emailProcessor = new EmailProcessor();
const emailPoller = new EmailPoller(emailProcessor);

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop email polling first
  emailPoller.stopPolling();

  server.close(() => {
    logger.info('HTTP server closed.');

    prisma
      .$disconnect()
      .then(() => {
        logger.info('Database connection closed.');
        process.exit(0);
      })
      .catch((err) => {
        logger.error('Error during database disconnect:', err);
        process.exit(1);
      });
  });
};

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Travel Email Parser API running on port ${PORT}`);
  logger.info(`📖 API Documentation: http://localhost:${PORT}/docs`);
  logger.info(`🔍 Health Check: http://localhost:${PORT}/api/v1/health`);

  // Start email polling after server is ready
  setTimeout(async () => {
    try {
      logger.info('🔍 Debug: About to start email polling...');
      await emailPoller.startPolling(2);
      logger.info('✅ Email polling started successfully');
    } catch (error) {
      logger.error('❌ Failed to start email polling:', error);
      logger.error('Stack trace:', error.stack);
      // Don't exit - let the API continue running even if email polling fails
    }
  }, 5000); // Wait 5 seconds for server to fully initialize
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  emailPoller.stopPolling();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  emailPoller.stopPolling();
  process.exit(1);
});

module.exports = server;
