// src/middleware/rateLimitAdvanced.js
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Create different rate limiters for different tiers
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Custom key generator that considers user
    keyGenerator: (req) => {
      return req.user ? req.user.id : req.ip;
    },
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        user: req.user?.email || req.ip,
        endpoint: req.originalUrl,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max,
        windowMs
      });
    }
  });
};

// Different limiters for different endpoints
const parseEmailLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  50, // 50 requests per window
  'Too many parsing requests. Please try again later.'
);

const batchLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 batch requests per hour
  'Batch parsing limit exceeded. Please try again later.'
);

const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per window
  'Too many authentication attempts. Please try again later.'
);

// Advanced rate limiter that checks user's subscription tier
const tierBasedLimiter = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Get user's usage for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.apiUsage.findFirst({
      where: {
        userId: req.user.id,
        endpoint: 'parse_email',
        date: today
      }
    });

    const currentCount = usage?.requestsCount || 0;
    
    // Define limits based on user tier (you can expand this)
    const limits = {
      free: 100,
      pro: 1000,
      enterprise: 10000
    };

    // For now, everyone is on free tier
    const userTier = 'free';
    const limit = limits[userTier];

    if (currentCount >= limit) {
      logger.warn('Daily limit exceeded', {
        user: req.user.email,
        currentCount,
        limit,
        tier: userTier
      });

      return res.status(429).json({
        success: false,
        error: `Daily limit of ${limit} requests exceeded for ${userTier} tier.`,
        usage: {
          current: currentCount,
          limit,
          tier: userTier
        }
      });
    }

    // Add usage info to response headers
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': (limit - currentCount).toString(),
      'X-RateLimit-Reset': new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
    });

    next();
  } catch (error) {
    logger.error('Tier-based rate limiting error:', error);
    // Don't block the request if rate limiting fails
    next();
  }
};

module.exports = {
  parseEmailLimiter,
  batchLimiter,
  authLimiter,
  tierBasedLimiter
};