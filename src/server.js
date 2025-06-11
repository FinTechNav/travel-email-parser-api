// src/server.js
require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed.');
    
    prisma.$disconnect()
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
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = server;