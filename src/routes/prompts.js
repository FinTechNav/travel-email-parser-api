// src/routes/prompts.js - API endpoints for prompt management
const express = require('express');
const PromptService = require('../services/promptService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const promptService = new PromptService();

// Get all prompt templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const { category, type, active } = req.query;

    const where = {};
    if (category) where.category = category;
    if (type) where.type = type;
    if (active !== undefined) where.isActive = active === 'true';

    const templates = await promptService.prisma.promptTemplate.findMany({
      where,
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
      include: {
        _count: {
          select: { usage: true },
        },
      },
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Error fetching prompt templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
    });
  }
});

// Get specific prompt template
router.get('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const template = await promptService.prisma.promptTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        usage: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Error fetching prompt template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template',
    });
  }
});

// Create new prompt template
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const { name, category, type, prompt, variables, metadata, testGroup } = req.body;

    if (!name || !category || !type || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, category, type, prompt',
      });
    }

    const template = await promptService.createPromptTemplate({
      name,
      category,
      type,
      prompt,
      variables,
      metadata,
      testGroup,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Error creating prompt template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
    });
  }
});

// Update prompt template (creates new version)
router.post('/templates/:id/version', authenticateToken, async (req, res) => {
  try {
    const existingTemplate = await promptService.prisma.promptTemplate.findUnique({
      where: { id: req.params.id },
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    const { prompt, variables, metadata, testGroup } = req.body;

    const newVersion = await promptService.createPromptTemplate({
      name: existingTemplate.name,
      category: existingTemplate.category,
      type: existingTemplate.type,
      prompt: prompt || existingTemplate.prompt,
      variables: variables || existingTemplate.variables,
      metadata: metadata || existingTemplate.metadata,
      testGroup,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: newVersion,
    });
  } catch (error) {
    logger.error('Error creating template version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template version',
    });
  }
});

// Activate prompt template
router.post('/templates/:id/activate', authenticateToken, async (req, res) => {
  try {
    await promptService.activatePromptTemplate(req.params.id);

    res.json({
      success: true,
      message: 'Template activated successfully',
    });
  } catch (error) {
    logger.error('Error activating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate template',
    });
  }
});

// Get prompt usage analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { category, type, days = 7 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const where = {
      createdAt: { gte: since },
    };

    if (category || type) {
      where.template = {};
      if (category) where.template.category = category;
      if (type) where.template.type = type;
    }

    const usage = await promptService.prisma.promptUsage.findMany({
      where,
      include: {
        template: {
          select: {
            name: true,
            category: true,
            type: true,
            version: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate analytics
    const analytics = {
      totalUsage: usage.length,
      successRate: (usage.filter((u) => u.success).length / usage.length) * 100,
      averageResponseTime: usage.reduce((sum, u) => sum + (u.responseTime || 0), 0) / usage.length,
      totalTokens: usage.reduce((sum, u) => sum + (u.tokenUsage || 0), 0),
      byTemplate: {},
    };

    // Group by template
    usage.forEach((u) => {
      const key = `${u.template.name}_v${u.template.version}`;
      if (!analytics.byTemplate[key]) {
        analytics.byTemplate[key] = {
          name: u.template.name,
          category: u.template.category,
          type: u.template.type,
          version: u.template.version,
          totalUsage: 0,
          successCount: 0,
          avgResponseTime: 0,
          totalTokens: 0,
        };
      }

      analytics.byTemplate[key].totalUsage++;
      if (u.success) analytics.byTemplate[key].successCount++;
      analytics.byTemplate[key].avgResponseTime += u.responseTime || 0;
      analytics.byTemplate[key].totalTokens += u.tokenUsage || 0;
    });

    // Calculate averages
    Object.values(analytics.byTemplate).forEach((template) => {
      template.successRate = (template.successCount / template.totalUsage) * 100;
      template.avgResponseTime = template.avgResponseTime / template.totalUsage;
    });

    res.json({
      success: true,
      data: {
        analytics,
        recentUsage: usage.slice(0, 50), // Last 50 uses
      },
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});

// Test prompt with sample email
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { templateId, emailContent, emailType } = req.body;

    if (!templateId || !emailContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing templateId or emailContent',
      });
    }

    const template = await promptService.prisma.promptTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Generate prompt using the template
    const prompt = promptService.interpolatePrompt(template.prompt, {
      emailContent,
      emailType: emailType || 'auto',
      extractedTimes: '',
    });

    res.json({
      success: true,
      data: {
        template: {
          id: template.id,
          name: template.name,
          version: template.version,
        },
        generatedPrompt: prompt,
        promptLength: prompt.length,
      },
    });
  } catch (error) {
    logger.error('Error testing prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test prompt',
    });
  }
});

// AI Configuration endpoints
router.get('/ai-config', authenticateToken, async (req, res) => {
  try {
    const configs = await promptService.prisma.aIConfiguration.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    logger.error('Error fetching AI configs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI configurations',
    });
  }
});

router.post('/ai-config', authenticateToken, async (req, res) => {
  try {
    const { name, model, temperature, maxTokens, metadata } = req.body;

    if (!name || !model) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, model',
      });
    }

    const config = await promptService.prisma.aIConfiguration.create({
      data: {
        name,
        model,
        temperature: temperature || 0.1,
        maxTokens: maxTokens || 2000,
        metadata,
        isActive: false, // New configs start inactive
      },
    });

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Error creating AI config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create AI configuration',
    });
  }
});

router.post('/ai-config/:id/activate', authenticateToken, async (req, res) => {
  try {
    // Deactivate all other configs
    await promptService.prisma.aIConfiguration.updateMany({
      where: { id: { not: req.params.id } },
      data: { isActive: false },
    });

    // Activate this config
    await promptService.prisma.aIConfiguration.update({
      where: { id: req.params.id },
      data: { isActive: true },
    });

    res.json({
      success: true,
      message: 'AI configuration activated successfully',
    });
  } catch (error) {
    logger.error('Error activating AI config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate AI configuration',
    });
  }
});

module.exports = router;
