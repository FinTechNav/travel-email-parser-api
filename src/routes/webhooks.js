// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    let token = null;
    
    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Check for API key in X-API-Key header
    const apiKey = req.headers['x-api-key'];
    
    if (!token && !apiKey) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token or API key provided.',
        hint: 'Include either Authorization: Bearer <token> or X-API-Key: <api-key> header'
      });
    }

    let user = null;

    // Authenticate with JWT token
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            name: true,
            apiKey: true,
            createdAt: true
          }
        });

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Invalid token. User not found.'
          });
        }
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token expired. Please login again.'
          });
        }
        
        return res.status(401).json({
          success: false,
          message: 'Invalid token.'
        });
      }
    }
    
    // Authenticate with API key
    if (apiKey && !user) {
      user = await prisma.user.findUnique({
        where: { apiKey },
        select: {
          id: true,
          email: true,
          name: true,
          apiKey: true,
          createdAt: true
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key.'
        });
      }
    }

    // Attach user to request object
    req.user = user;
    req.authMethod = token ? 'jwt' : 'api_key';
    
    logger.debug(`User ${user.email} authenticated via ${req.authMethod}`);
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal authentication error.'
    });
  }
};

module.exports = authMiddleware;