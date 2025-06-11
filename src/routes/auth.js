// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/v1/auth/register - Register new user
router.post('/register',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('name')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, name, password } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          apiKey: uuidv4().replace(/-/g, '')
        },
        select: {
          id: true,
          email: true,
          name: true,
          apiKey: true,
          createdAt: true
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      });
    } catch (error) {
      logger.error('Registration failed:', error);
      next(error);
    }
  }
);

// POST /api/v1/auth/login - User login
router.post('/login',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user with password
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      });
    } catch (error) {
      logger.error('Login failed:', error);
      next(error);
    }
  }
);

// POST /api/v1/auth/refresh-api-key - Refresh API key
router.post('/refresh-api-key',
  require('../middleware/auth'),
  async (req, res, next) => {
    try {
      const newApiKey = uuidv4().replace(/-/g, '');

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { apiKey: newApiKey },
        select: {
          id: true,
          email: true,
          name: true,
          apiKey: true
        }
      });

      logger.info(`API key refreshed for user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'API key refreshed successfully',
        data: {
          apiKey: updatedUser.apiKey
        }
      });
    } catch (error) {
      logger.error('API key refresh failed:', error);
      next(error);
    }
  }
);

module.exports = router;