// src/routes/health.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const AIParser = require('../services/aiParser');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();
const aiParser = new AIParser();

// GET /api/v1/health - Basic health check
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/health/detailed - Comprehensive health check
router.get('/detailed', async (req, res) => {
  const checks = {};
  let overallStatus = 'healthy';

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', responseTime: Date.now() };
  } catch (error) {
    checks.database = { status: 'unhealthy', error: error.message };
    overallStatus = 'unhealthy';
  }

  // AI service check
  try {
    const aiHealthy = await aiParser.healthCheck();
    checks.ai_service = { 
      status: aiHealthy ? 'healthy' : 'unhealthy',
      provider: 'OpenAI',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    };
    if (!aiHealthy) overallStatus = 'degraded';
  } catch (error) {
    checks.ai_service = { status: 'unhealthy', error: error.message };
    overallStatus = 'unhealthy';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memoryHealthy = memUsage.heapUsed < (500 * 1024 * 1024); // 500MB threshold
  checks.memory = {
    status: memoryHealthy ? 'healthy' : 'warning',
    usage: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    }
  };

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503;

  res.status(statusCode).json(response);
});

// GET /api/v1/health/ready - Readiness probe
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/health/live - Liveness probe
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

module.exports = router;