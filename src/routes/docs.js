const express = require('express');
const path = require('path');
const router = express.Router();

// Serve OpenAPI documentation
router.get('/', (req, res) => {
  res.json({
    message: 'API Documentation',
    endpoints: {
      openapi: '/docs/openapi.yaml',
      health: '/api/v1/health',
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login'
      },
      parse: {
        email: 'POST /api/v1/parse/email',
        itineraries: 'GET /api/v1/parse/itineraries'
      }
    },
    examples: {
      register: {
        url: '/api/v1/auth/register',
        method: 'POST',
        body: {
          email: 'user@example.com',
          name: 'User Name',
          password: 'password123'
        }
      },
      parseEmail: {
        url: '/api/v1/parse/email',
        method: 'POST',
        headers: {
          'X-API-Key': 'your_api_key_here'
        },
        body: {
          email_content: 'Your flight confirmation...',
          user_email: 'user@example.com'
        }
      }
    }
  });
});

// Serve OpenAPI spec
router.get('/openapi.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, '../../docs/openapi.yaml'));
});

module.exports = router;