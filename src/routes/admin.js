// src/routes/admin.js - Admin API endpoints for segment management
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// =====================================================================
// SEGMENT TYPES MANAGEMENT
// =====================================================================

// GET /api/admin/segment-types - List all configured segment types

router.get('/segment-types', async (req, res) => {
  try {
    const segmentTypes = await prisma.segmentTypeConfig.findMany({
      include: {
        classification_rules: {
          where: {
            isActive: true  // ← Use Prisma field name (camelCase)
          },
          select: {
            id: true,
            name: true,
            pattern: true,
            type: true,
            priority: true,
            isActive: true  // ← Use Prisma field name (camelCase)
          },
          orderBy: {
            priority: "desc"
          }
        },
        timezone_rules: {
          select: {
            id: true,
            locationPattern: true,  // ← Use Prisma field name (camelCase)
            timezone: true,
            priority: true
          },
          orderBy: {
            priority: "desc"
          }
        },
        display_rules: {
          select: {
            id: true,
            primaryTimeField: true,    // ← Use Prisma field name (camelCase)
            timezoneSource: true,      // ← Use Prisma field name (camelCase)
            routeFormat: true,         // ← Use Prisma field name (camelCase)
            customFields: true         // ← Use Prisma field name (camelCase)
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    // Transform for frontend compatibility
    const transformedTypes = segmentTypes.map(type => ({
      id: type.id,
      name: type.name,
      display_name: type.displayName,
      description: type.description,
      is_active: type.isActive,
      default_timezone: type.defaultTimezone,
      display_config: type.displayConfig,
      created_at: type.createdAt,
      updated_at: type.updatedAt,
      classificationRules: type.classification_rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        pattern: rule.pattern,
        type: rule.type,
        priority: rule.priority,
        isActive: rule.isActive
      })),
      timezoneRules: type.timezone_rules,
      displayRules: type.display_rules
    }));

    res.json(transformedTypes);
  } catch (error) {
    console.error('Error fetching segment types:', error);
    res.status(500).json({ error: 'Failed to fetch segment types' });
  }
});
// POST /api/admin/segment-types - Create new segment type

router.post('/segment-types', async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      isActive = true,
      defaultTimezone = 'America/New_York',
      classificationRules = [],
      parsingPrompt,
      displayConfig = {},
      timezoneRules = []
    } = req.body;

    // Validate required fields
    if (!name || !displayName || !parsingPrompt) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, displayName, parsingPrompt' 
      });
    }

    // Validate name format
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return res.status(400).json({
        error: 'Name must be lowercase and underscore separated (e.g., car_rental)'
      });
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create segment type config
      const segmentType = await tx.segmentTypeConfig.create({
        data: {
          name,
          displayName,
          description,
          isActive,
          defaultTimezone,
          displayConfig
        }
      });

      // Create parsing prompt
      await tx.promptTemplate.create({
        data: {
          name: `email_parsing_${name}`,
          category: 'parsing',
          type: name,
          version: 1,
          isActive: true,
          prompt: parsingPrompt
        }
      });

      // Create classification rules if provided
      if (classificationRules.length > 0) {
        await tx.classificationRule.createMany({
          data: classificationRules.map(rule => ({
            name: rule.name,
            segmentTypeName: name,
            pattern: rule.pattern,
            type: rule.type || 'keyword',
            priority: rule.priority || 10,
            isActive: rule.isActive !== false
          }))
        });
      }

      // Create timezone rules if provided
      if (timezoneRules.length > 0) {
        await tx.timezoneRule.createMany({
          data: timezoneRules.map(rule => ({
            segmentTypeName: name,
            locationPattern: rule.locationPattern,
            timezone: rule.timezone,
            priority: rule.priority || 10
          }))
        });
      }

      return segmentType;
    });

    res.status(201).json({ 
      message: 'Segment type created successfully',
      segmentType: {
        name: result.name,
        displayName: result.displayName,
        isActive: result.isActive
      }
    });
  } catch (error) {
    console.error('Error creating segment type:', error);
    
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Segment type with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create segment type' });
    }
  }
});

// UPDATE segment type
router.put('/segment-types/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { displayName, description, isActive, defaultTimezone } = req.body;

    const segmentType = await prisma.segmentTypeConfig.update({
      where: { name },
      data: {
        displayName,
        description,
        isActive,
        defaultTimezone
      }
    });

    res.json({ 
      message: 'Segment type updated successfully',
      segmentType: {
        name: segmentType.name,
        displayName: segmentType.displayName,
        isActive: segmentType.isActive
      }
    });
  } catch (error) {
    console.error('Error updating segment type:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Segment type not found' });
    } else {
      res.status(500).json({ error: 'Failed to update segment type' });
    }
  }
});


// =====================================================================
// CLASSIFICATION RULES MANAGEMENT
// =====================================================================

// POST /api/admin/segment-types/:name/classification-rules
router.post('/segment-types/:name/classification-rules', async (req, res) => {
  try {
    const { name } = req.params;
    const { ruleName, pattern, type = 'keyword', priority = 10, isActive = true } = req.body;

    if (!ruleName || !pattern) {
      return res.status(400).json({ error: 'Rule name and pattern are required' });
    }

const rule = await prisma.classificationRule.create({
  data: {
    name: ruleName,
    segmentTypeName: name,
    pattern,
    type,
    priority,
    isActive
  }
});

    res.status(201).json({ message: 'Classification rule created successfully' });
  } catch (error) {
    console.error('Error creating classification rule:', error);
    
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Classification rule with this name already exists' });
    } else if (error.code === 'P2003') {
      res.status(404).json({ error: 'Segment type not found' });
    } else {
      res.status(500).json({ error: 'Failed to create classification rule' });
    }
  }
});


// DELETE /api/admin/classification-rules/:id
router.delete('/classification-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.classificationRule.delete({
      where: { id: id }
    });

    res.json({ message: 'Classification rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting classification rule:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Classification rule not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete classification rule' });
    }
  }
});


// =====================================================================
// TIMEZONE RULES MANAGEMENT
// =====================================================================

// POST /api/admin/segment-types/:name/timezone-rules
router.post('/segment-types/:name/timezone-rules', async (req, res) => {
  try {
    const { name } = req.params;
    const { locationPattern, timezone, priority = 10 } = req.body;

    if (!locationPattern || !timezone) {
      return res.status(400).json({ error: 'Location pattern and timezone are required' });
    }

    const timezoneRule = await prisma.timezoneRule.create({
      data: {
        segmentTypeName: name,
        locationPattern,
        timezone,
        priority
      }
    });

    res.status(201).json({ message: 'Timezone rule created successfully' });
  } catch (error) {
    console.error('Error creating timezone rule:', error);
    res.status(500).json({ error: 'Failed to create timezone rule' });
  }
});

// =====================================================================
// SEGMENT REPROCESSING
// =====================================================================

// POST /api/admin/reprocess-segments
router.post('/reprocess-segments', async (req, res) => {
  try {
    const { segmentType, segmentIds } = req.body;

    let whereClause = {};
    if (segmentType) {
      whereClause.type = segmentType;
    }
    if (segmentIds && segmentIds.length > 0) {
      whereClause.id = { in: segmentIds };
    }

    // Find segments to reprocess
    const segments = await prisma.segment.findMany({
      where: whereClause,
      include: { email: true }
    });

    const results = [];

    for (const segment of segments) {
      try {
        // Mark as reprocessed - actual reprocessing would use email processor
        const updated = await prisma.segment.update({
          where: { id: segment.id },
          data: {
            details: {
              ...segment.details,
              reprocessed_at: new Date().toISOString(),
              admin_reprocessed: true
            }
          }
        });

        results.push({ id: segment.id, status: 'success' });
      } catch (error) {
        console.error(`Error reprocessing segment ${segment.id}:`, error);
        results.push({ id: segment.id, status: 'error', error: error.message });
      }
    }

    res.json({ 
      message: `Marked ${segments.length} segments for reprocessing`,
      results 
    });
  } catch (error) {
    console.error('Error reprocessing segments:', error);
    res.status(500).json({ error: 'Failed to reprocess segments' });
  }
});

// =====================================================================
// QUICK FIXES
// =====================================================================

// POST /api/admin/quick-fixes/ps-timezone
router.post('/quick-fixes/ps-timezone', async (req, res) => {
  try {
    // Fix PS timezone issues specifically
    const psSegments = await prisma.segment.findMany({
      where: { type: 'private_terminal' }
    });

    const results = [];

    for (const segment of psSegments) {
      try {
        const details = segment.details || {};
        const serviceDetails = details.service_details || {};
        
        // Determine correct timezone
        let correctTimezone = 'America/New_York';
        if (serviceDetails.facility_name?.includes('LAX')) {
          correctTimezone = 'America/Los_Angeles';
        } else if (serviceDetails.facility_name?.includes('ORD')) {
          correctTimezone = 'America/Chicago';
        }

        // Update times with correct timezone
        const updated = await prisma.segment.update({
          where: { id: segment.id },
          data: {
            details: {
              ...details,
              corrected_timezone: correctTimezone,
              timezone_fix_applied: new Date().toISOString()
            }
          }
        });

        results.push({ id: segment.id, status: 'success', timezone: correctTimezone });
      } catch (error) {
        results.push({ id: segment.id, status: 'error', error: error.message });
      }
    }

    res.json({
      message: `Applied timezone fixes to ${psSegments.length} PS segments`,
      results
    });
  } catch (error) {
    console.error('Error applying PS timezone fix:', error);
    res.status(500).json({ error: 'Failed to apply timezone fix' });
  }
});


// =====================================================================
// 1. CLASSIFICATION RULES CRUD ENDPOINTS
// =====================================================================

// PUT /api/v1/admin/classification-rules/:id - Update classification rule
router.put('/classification-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pattern, type, priority, isActive } = req.body;

    const rule = await prisma.classificationRule.update({
      where: { id: parseInt(id) },
      data: {
        pattern,
        type,
        priority,
        isActive,
        updatedAt: new Date()
      }
    });

    res.json({ 
      message: 'Classification rule updated successfully',
      rule
    });
  } catch (error) {
    console.error('Error updating classification rule:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Classification rule not found' });
    } else {
      res.status(500).json({ error: 'Failed to update classification rule' });
    }
  }
});



// POST /api/v1/admin/classification-rules - Create classification rule

router.post('/classification-rules', async (req, res) => {
  try {
    const { ruleName, segmentType, pattern, ruleType = 'keyword', priority = 10, isActive = true } = req.body;

    if (!ruleName || !segmentType || !pattern) {
      return res.status(400).json({ 
        error: 'Missing required fields: ruleName, segmentType, pattern' 
      });
    }

    const rule = await prisma.classificationRule.create({
      data: {
        name: ruleName,
        segmentTypeName: segmentType,
        pattern,
        type: ruleType,
        priority,
        isActive
      },
      include: {
        segmentTypeConfig: {
          select: { displayName: true }
        }
      }
    });

    res.status(201).json({ 
      message: 'Classification rule created successfully',
      rule: {
        id: rule.id,
        name: rule.name,
        pattern: rule.pattern,
        type: rule.type,
        priority: rule.priority,
        is_active: rule.isActive,
        segmentType: rule.segmentTypeName
      }
    });
  } catch (error) {
    console.error('Error creating classification rule:', error);
    
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Classification rule with this name already exists' });
    } else if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid segment type specified' });
    } else {
      res.status(500).json({ error: 'Failed to create classification rule' });
    }
  }
});
// =====================================================================
// 2. PROMPTS MANAGEMENT ENDPOINTS
// =====================================================================

// GET /api/v1/admin/prompts - Get all prompt templates
router.get('/prompts', async (req, res) => {
  try {
    const prompts = await prisma.promptTemplate.findMany({
      orderBy: [
        { name: 'asc' },
        { version: 'desc' }
      ]
    });

    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// POST /api/v1/admin/prompts - Create new prompt template
router.post('/prompts', async (req, res) => {
  try {
    const { name, category, type, prompt, version = 1, isActive = true } = req.body;

    if (!name || !category || !type || !prompt) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, category, type, prompt' 
      });
    }

    // Deactivate other versions if this is being set as active
    if (isActive) {
      await prisma.promptTemplate.updateMany({
        where: { name, isActive: true },
        data: { isActive: false }
      });
    }

    const promptTemplate = await prisma.promptTemplate.create({
      data: {
        name,
        category,
        type,
        version,
        isActive,
        prompt
      }
    });

    res.status(201).json({ 
      message: 'Prompt template created successfully',
      promptTemplate
    });
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ error: 'Failed to create prompt template' });
  }
});

// PUT /api/v1/admin/prompts/:id - Update prompt template
router.put('/prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { prompt, isActive, version } = req.body;

    // If setting this prompt as active, deactivate others with same name
    if (isActive) {
      const currentPrompt = await prisma.promptTemplate.findUnique({
        where: { id: id }
      });
      
      if (currentPrompt) {
        await prisma.promptTemplate.updateMany({
          where: { 
            name: currentPrompt.name, 
            isActive: true,
            id: { not: id }
          },
          data: { isActive: false }
        });
      }
    }

    const updatedPrompt = await prisma.promptTemplate.update({
      where: { id: id },
      data: { prompt, isActive, version }
    });

    res.json({ 
      message: 'Prompt template updated successfully',
      promptTemplate: updatedPrompt
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Prompt template not found' });
    } else {
      res.status(500).json({ error: 'Failed to update prompt template' });
    }
  }
});

// =====================================================================
// 3. SYSTEM STATUS ENDPOINT
// =====================================================================

// GET /api/v1/admin/system-status - Get comprehensive system status

router.get('/system-status', async (req, res) => {
  try {
    // Get all counts in parallel for better performance
    const [
      totalSegments,
      totalUsers,
      segmentTypes,
      classificationRules,
      psSegments
    ] = await Promise.all([
      prisma.segment.count(),
      prisma.user.count(),
      prisma.segmentTypeConfig.count(),
      prisma.classificationRule.count({
        where: { isActive: true }
      }),
      prisma.segment.findMany({
        where: { type: 'private_terminal' },
        take: 5
      })
    ]);

    // Check for PS timezone issues
    const hasTimezoneIssues = psSegments.some(segment => {
      const details = segment.details || {};
      return !details.corrected_timezone;
    });

    const psIssue = hasTimezoneIssues 
      ? `${psSegments.length} PS segments may have timezone issues` 
      : null;

    res.json({
      database: true,
      emailProcessor: true,
      totalSegments,
      totalUsers,
      segmentTypes,
      classificationRules,
      psIssue,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking system status:', error);
    res.status(500).json({ error: 'Failed to check system status' });
  }
});

// =====================================================================
// 4. REPROCESS SEGMENTS ENDPOINT
// =====================================================================

// POST /api/v1/admin/reprocess-segments - Reprocess all travel segments
router.post('/reprocess-segments', async (req, res) => {
  try {
    // Get all segments that need reprocessing
    const segments = await prisma.segment.findMany({
      take: 100, // Limit to prevent overwhelming the system
      orderBy: { parsedAt: 'desc' }
    });

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const segment of segments) {
      try {
        // Mark for reprocessing by updating a flag
        await prisma.segment.update({
          where: { id: segment.id },
          data: {
            details: {
              ...segment.details,
              reprocessing_requested: true,
              reprocessing_requested_at: new Date().toISOString()
            }
          }
        });

        results.push({ id: segment.id, status: 'queued' });
        successCount++;
      } catch (error) {
        results.push({ id: segment.id, status: 'error', error: error.message });
        errorCount++;
      }
    }

    res.json({
      message: `Queued ${successCount} segments for reprocessing`,
      segmentCount: segments.length,
      successCount,
      errorCount,
      results
    });
  } catch (error) {
    console.error('Error reprocessing segments:', error);
    res.status(500).json({ error: 'Failed to reprocess segments' });
  }
});

// =====================================================================
// 5. PS TIMEZONE FIX ENDPOINT (Update path)
// =====================================================================

// POST /api/v1/admin/fix-ps-timezone - Fix PS timezone issues

router.post('/fix-ps-timezone', async (req, res) => {
  try {
    // FIXED: Use correct model name
    const psSegments = await prisma.segment.findMany({
      where: { type: 'private_terminal' }
    });

    const results = [];
    let updatedCount = 0;

    for (const segment of psSegments) {
      try {
        const details = segment.details || {};
        
        // Determine correct timezone based on origin
        let correctTimezone = 'America/New_York';
        const origin = segment.origin || '';
        
        if (origin.includes('LAX')) {
          correctTimezone = 'America/Los_Angeles';
        } else if (origin.includes('ORD') || origin.includes('CHI')) {
          correctTimezone = 'America/Chicago';
        } else if (origin.includes('DFW')) {
          correctTimezone = 'America/Chicago';
        }

        await prisma.segment.update({
          where: { id: segment.id },
          data: {
            details: {
              ...details,
              corrected_timezone: correctTimezone,
              timezone_fix_applied: new Date().toISOString()
            }
          }
        });

        results.push({ 
          id: segment.id, 
          status: 'success', 
          timezone: correctTimezone,
          origin: origin
        });
        updatedCount++;
        
      } catch (error) {
        results.push({ id: segment.id, status: 'error', error: error.message });
      }
    }

    res.json({
      message: `Applied timezone fixes to ${updatedCount} PS segments`,
      updatedCount,
      totalSegments: psSegments.length,
      results
    });
  } catch (error) {
    console.error('Error applying PS timezone fix:', error);
    res.status(500).json({ error: 'Failed to apply timezone fix' });
  }
});

// =====================================================================
// 6. ENHANCED TEST CLASSIFICATION ENDPOINT
// =====================================================================

// POST /api/v1/admin/test-classification - Test email classification
router.post('/test-classification', async (req, res) => {
  try {
    const { subject, sender, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Email content is required for testing' });
    }

    // Get all active classification rules with segment type info
    const rules = await prisma.classificationRule.findMany({
      where: { isActive: true },
      include: {
        segmentTypeConfig: {
          select: { 
            name: true, 
            displayName: true 
          }
        }
      },
      orderBy: { priority: 'desc' }
    });

    // Test classification logic
    const searchText = `${subject || ''} ${content} ${sender || ''}`.toLowerCase();
    let matchedRule = null;
    let segmentType = 'other';
    let confidence = 'Low';

    for (const rule of rules) {
      const pattern = rule.pattern.toLowerCase();
      let matches = false;

      switch (rule.type) {
        case 'sender':
          matches = (sender || '').toLowerCase().includes(pattern);
          break;
        case 'subject':
          matches = (subject || '').toLowerCase().includes(pattern);
          break;
        case 'keyword':
          matches = searchText.includes(pattern);
          break;
        case 'regex':
          try {
            const regex = new RegExp(pattern, 'i');
            matches = regex.test(searchText);
          } catch (error) {
            console.error('Invalid regex:', pattern);
          }
          break;
      }

      if (matches) {
        matchedRule = rule.name;
        segmentType = rule.segmentTypeName;
        confidence = rule.priority > 20 ? 'High' : rule.priority > 10 ? 'Medium' : 'Low';
        break;
      }
    }

    res.json({
      segmentType,
      matchedRule,
      confidence,
      totalRulesChecked: rules.length,
      rulesMatched: matchedRule ? [matchedRule] : []
    });
  } catch (error) {
    console.error('Error testing classification:', error);
    res.status(500).json({ error: 'Failed to test classification' });
  }
});

// Enhanced Admin Prompts API Endpoints
// Add these routes to your existing src/routes/admin.js file

// =====================================================================
// ENHANCED PROMPT TEMPLATE MANAGEMENT API
// =====================================================================

// GET /api/v1/admin/prompts/:id - Get single prompt
router.get('/prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Valid prompt ID is required' });
    }
    
    const prompt = await prisma.promptTemplate.findUnique({
      where: { id: id },
      include: {
        usage: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }

    res.json(prompt);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt template' });
  }
});

// POST /api/v1/admin/prompts/:id/duplicate - Duplicate prompt
router.post('/prompts/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const originalPrompt = await prisma.promptTemplate.findUnique({
      where: { id: id }
    });

    if (!originalPrompt) {
      return res.status(404).json({ error: 'Original prompt not found' });
    }

    // Create duplicate with incremented version and inactive status
    const duplicatePrompt = await prisma.promptTemplate.create({
      data: {
        name: `${originalPrompt.name}_copy`,
        category: originalPrompt.category,
        type: originalPrompt.type,
        version: originalPrompt.version + 1,
        prompt: originalPrompt.prompt,
        variables: originalPrompt.variables,
        isActive: false, // Duplicates start inactive
        metadata: {
          ...originalPrompt.metadata,
          duplicatedFrom: originalPrompt.id,
          duplicatedAt: new Date().toISOString()
        },
        testGroup: originalPrompt.testGroup,
        segmentTypeName: originalPrompt.segmentTypeName
      }
    });

    res.status(201).json({ 
      message: 'Prompt duplicated successfully',
      promptTemplate: duplicatePrompt
    });
  } catch (error) {
    console.error('Error duplicating prompt:', error);
    
    if (error.code === 'P2002') {
      res.status(400).json({ 
        error: 'A prompt with this name already exists. Try a different name.' 
      });
    } else {
      res.status(500).json({ error: 'Failed to duplicate prompt template' });
    }
  }
});

// DELETE /api/v1/admin/prompts/:id - Delete prompt
router.delete('/prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if prompt exists
    const prompt = await prisma.promptTemplate.findUnique({
      where: { id: id },
      include: {
        usage: true
      }
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }

    // Check if this is the only active prompt of its type
    const activePrompts = await prisma.promptTemplate.findMany({
      where: {
        name: prompt.name,
        isActive: true
      }
    });

    if (activePrompts.length === 1 && activePrompts[0].id === id) {
      return res.status(400).json({ 
        error: 'Cannot delete the only active prompt of this type. Please activate another version first.' 
      });
    }

    // Delete related usage records first (if you want to preserve them, skip this)
    await prisma.promptUsage.deleteMany({
      where: { templateId: id }
    });

    // Delete the prompt template
    await prisma.promptTemplate.delete({
      where: { id: id }
    });

    res.json({ 
      message: 'Prompt template deleted successfully',
      deletedPrompt: prompt.name
    });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Prompt template not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete prompt template' });
    }
  }
});

// GET /api/v1/admin/prompts/analytics - Get prompt analytics
router.get('/prompts/analytics', async (req, res) => {
  try {
    const { timeframe = '7d', promptId } = req.query;
    
    // Calculate date range
    const now = new Date();
    const daysBack = timeframe === '30d' ? 30 : timeframe === '1d' ? 1 : 7;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    const whereClause = {
      createdAt: {
        gte: startDate
      }
    };
    
    if (promptId) {
      whereClause.templateId = promptId;
    }

    // Get usage statistics
    const [totalUsage, successfulUsage, avgResponseTime, tokenUsage] = await Promise.all([
      prisma.promptUsage.count({ where: whereClause }),
      prisma.promptUsage.count({ 
        where: { ...whereClause, success: true } 
      }),
      prisma.promptUsage.aggregate({
        where: whereClause,
        _avg: { responseTime: true }
      }),
      prisma.promptUsage.aggregate({
        where: whereClause,
        _sum: { tokenUsage: true }
      })
    ]);

    // Get usage by day for charts
    const dailyUsage = await prisma.promptUsage.groupBy({
      by: ['createdAt'],
      where: whereClause,
      _count: { id: true },
      _sum: { tokenUsage: true },
      orderBy: { createdAt: 'asc' }
    });

    // Get top performing prompts
    const topPrompts = await prisma.promptTemplate.findMany({
      where: {
        usage: {
          some: {
            createdAt: {
              gte: startDate
            }
          }
        }
      },
      include: {
        usage: {
          where: {
            createdAt: {
              gte: startDate
            }
          }
        }
      },
      orderBy: {
        successRate: 'desc'
      },
      take: 10
    });

    const analytics = {
      summary: {
        totalUsage,
        successRate: totalUsage > 0 ? (successfulUsage / totalUsage) : 0,
        avgResponseTime: avgResponseTime._avg.responseTime || 0,
        totalTokens: tokenUsage._sum.tokenUsage || 0
      },
      dailyUsage: dailyUsage.map(day => ({
        date: day.createdAt.toISOString().split('T')[0],
        usage: day._count.id,
        tokens: day._sum.tokenUsage || 0
      })),
      topPrompts: topPrompts.map(prompt => ({
        id: prompt.id,
        name: prompt.name,
        usageCount: prompt.usage.length,
        successRate: prompt.successRate || 0,
        avgResponseTime: prompt.usage.length > 0 
          ? prompt.usage.reduce((sum, u) => sum + u.responseTime, 0) / prompt.usage.length 
          : 0
      }))
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching prompt analytics:', error);
    res.status(500).json({ error: 'Failed to fetch prompt analytics' });
  }
});

// PUT /api/v1/admin/prompts/:id/activate - Activate specific prompt version
router.put('/prompts/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const prompt = await prisma.promptTemplate.findUnique({
      where: { id: id }
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }

    // Deactivate all other versions of this prompt
    await prisma.promptTemplate.updateMany({
      where: { 
        name: prompt.name,
        id: { not: id }
      },
      data: { isActive: false }
    });

    // Activate this version
    const updatedPrompt = await prisma.promptTemplate.update({
      where: { id: id },
      data: { isActive: true }
    });

    res.json({ 
      message: `Prompt "${prompt.name}" v${prompt.version} activated successfully`,
      promptTemplate: updatedPrompt
    });
  } catch (error) {
    console.error('Error activating prompt:', error);
    res.status(500).json({ error: 'Failed to activate prompt template' });
  }
});

// POST /api/v1/admin/prompts/test - Test prompt with sample data
router.post('/prompts/test', async (req, res) => {
  try {
    const { promptId, testData } = req.body;
    
    if (!promptId || !testData) {
      return res.status(400).json({ 
        error: 'Missing required fields: promptId and testData' 
      });
    }

    const prompt = await prisma.promptTemplate.findUnique({
      where: { id: promptId }
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }

    // Import your AI service
    const { parseEmailWithOpenAI } = require('../services/openaiService');
    
    // Replace variables in prompt
    let filledPrompt = prompt.prompt;
    Object.keys(testData).forEach(key => {
      const placeholder = `{{${key}}}`;
      filledPrompt = filledPrompt.replace(new RegExp(placeholder, 'g'), testData[key]);
    });

    const startTime = Date.now();
    
    try {
      // Test the prompt with OpenAI
      const result = await parseEmailWithOpenAI(filledPrompt);
      const responseTime = Date.now() - startTime;
      
      // Record test usage
      await prisma.promptUsage.create({
        data: {
          templateId: promptId,
          emailType: 'test',
          success: true,
          responseTime,
          tokenUsage: null // OpenAI doesn't always return token count
        }
      });

      res.json({
        success: true,
        result,
        metadata: {
          responseTime,
          promptLength: filledPrompt.length,
          promptPreview: filledPrompt.substring(0, 200) + (filledPrompt.length > 200 ? '...' : '')
        }
      });
      
    } catch (aiError) {
      const responseTime = Date.now() - startTime;
      
      // Record failed test
      await prisma.promptUsage.create({
        data: {
          templateId: promptId,
          emailType: 'test',
          success: false,
          errorMessage: aiError.message,
          responseTime
        }
      });

      res.status(400).json({
        success: false,
        error: aiError.message,
        metadata: {
          responseTime,
          promptLength: filledPrompt.length
        }
      });
    }
    
  } catch (error) {
    console.error('Error testing prompt:', error);
    res.status(500).json({ error: 'Failed to test prompt' });
  }
});

// GET /api/v1/admin/prompts/categories - Get available prompt categories
router.get('/prompts/categories', async (req, res) => {
  try {
    const categories = await prisma.promptTemplate.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { category: 'asc' }
    });

    const result = categories.map(cat => ({
      name: cat.category,
      count: cat._count.category
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching prompt categories:', error);
    res.status(500).json({ error: 'Failed to fetch prompt categories' });
  }
});

// GET /api/v1/admin/prompts/types - Get available prompt types
router.get('/prompts/types', async (req, res) => {
  try {
    const types = await prisma.promptTemplate.groupBy({
      by: ['type'],
      _count: { type: true },
      orderBy: { type: 'asc' }
    });

    const result = types.map(type => ({
      name: type.type,
      count: type._count.type
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching prompt types:', error);
    res.status(500).json({ error: 'Failed to fetch prompt types' });
  }
});

// POST /api/v1/admin/prompts/bulk-update - Bulk update prompts
router.post('/prompts/bulk-update', async (req, res) => {
  try {
    const { promptIds, updates } = req.body;
    
    if (!Array.isArray(promptIds) || promptIds.length === 0) {
      return res.status(400).json({ error: 'promptIds must be a non-empty array' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'updates object cannot be empty' });
    }

    // Validate that only allowed fields are being updated
    const allowedFields = ['isActive', 'testGroup', 'metadata'];
    const updateFields = Object.keys(updates);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({ 
        error: `Invalid update fields: ${invalidFields.join(', ')}. Allowed: ${allowedFields.join(', ')}` 
      });
    }

    const result = await prisma.promptTemplate.updateMany({
      where: {
        id: { in: promptIds }
      },
      data: updates
    });

    res.json({ 
      message: `Successfully updated ${result.count} prompt templates`,
      updatedCount: result.count
    });
    
  } catch (error) {
    console.error('Error bulk updating prompts:', error);
    res.status(500).json({ error: 'Failed to bulk update prompts' });
  }
});

// =====================================================================
// PROMPT TEMPLATE IMPORT/EXPORT
// =====================================================================

// GET /api/v1/admin/prompts/export - Export prompts
router.get('/prompts/export', async (req, res) => {
  try {
    const { category, type, activeOnly } = req.query;
    
    const whereClause = {};
    if (category) whereClause.category = category;
    if (type) whereClause.type = type;
    if (activeOnly === 'true') whereClause.isActive = true;

    const prompts = await prisma.promptTemplate.findMany({
      where: whereClause,
      orderBy: [
        { category: 'asc' },
        { type: 'asc' },
        { name: 'asc' },
        { version: 'desc' }
      ]
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      prompts: prompts.map(prompt => ({
        name: prompt.name,
        category: prompt.category,
        type: prompt.type,
        version: prompt.version,
        prompt: prompt.prompt,
        variables: prompt.variables,
        isActive: prompt.isActive,
        testGroup: prompt.testGroup,
        metadata: prompt.metadata
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="prompts-export.json"');
    res.json(exportData);
    
  } catch (error) {
    console.error('Error exporting prompts:', error);
    res.status(500).json({ error: 'Failed to export prompts' });
  }
});

// POST /api/v1/admin/prompts/import - Import prompts
router.post('/prompts/import', async (req, res) => {
  try {
    const { prompts, overwriteExisting = false } = req.body;
    
    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: 'prompts must be a non-empty array' });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const promptData of prompts) {
      try {
        // Check if prompt already exists
        const existing = await prisma.promptTemplate.findFirst({
          where: {
            name: promptData.name,
            version: promptData.version
          }
        });

        if (existing && !overwriteExisting) {
          results.skipped++;
          continue;
        }

        if (existing && overwriteExisting) {
          // Update existing prompt
          await prisma.promptTemplate.update({
            where: { id: existing.id },
            data: {
              prompt: promptData.prompt,
              variables: promptData.variables,
              isActive: promptData.isActive,
              testGroup: promptData.testGroup,
              metadata: promptData.metadata
            }
          });
        } else {
          // Create new prompt
          await prisma.promptTemplate.create({
            data: {
              name: promptData.name,
              category: promptData.category,
              type: promptData.type,
              version: promptData.version,
              prompt: promptData.prompt,
              variables: promptData.variables,
              isActive: promptData.isActive || false,
              testGroup: promptData.testGroup,
              metadata: promptData.metadata
            }
          });
        }

        results.imported++;
        
      } catch (error) {
        results.errors.push({
          prompt: promptData.name,
          error: error.message
        });
      }
    }

    res.json({
      message: `Import completed: ${results.imported} imported, ${results.skipped} skipped`,
      results
    });
    
  } catch (error) {
    console.error('Error importing prompts:', error);
    res.status(500).json({ error: 'Failed to import prompts' });
  }
});

module.exports = router;