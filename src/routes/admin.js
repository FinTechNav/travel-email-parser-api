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
    const segmentTypes = await prisma.$queryRaw`
      SELECT 
        stc.*,
        COALESCE(
          json_agg(
            CASE WHEN cr.id IS NOT NULL THEN
              json_build_object(
                'id', cr.id,
                'name', cr.name,
                'pattern', cr.pattern,
                'type', cr.type,
                'priority', cr.priority,
                'isActive', cr.is_active
              )
            END
          ) FILTER (WHERE cr.id IS NOT NULL), 
          '[]'::json
        ) as "classificationRules",
        COALESCE(
          json_agg(
            CASE WHEN tr.id IS NOT NULL THEN
              json_build_object(
                'id', tr.id,
                'locationPattern', tr.location_pattern,
                'timezone', tr.timezone,
                'priority', tr.priority
              )
            END
          ) FILTER (WHERE tr.id IS NOT NULL), 
          '[]'::json
        ) as "timezoneRules"
      FROM segment_type_configs stc
      LEFT JOIN classification_rules cr ON stc.name = cr.segment_type_name AND cr.is_active = true
      LEFT JOIN timezone_rules tr ON stc.name = tr.segment_type_name
      GROUP BY stc.id, stc.name, stc.display_name, stc.description, stc.is_active, stc.default_timezone, stc.display_config, stc.created_at, stc.updated_at
      ORDER BY stc.name
    `;

    res.json(segmentTypes);
  } catch (error) {
    console.error('Error fetching segment types:', error);
    res.status(500).json({ error: 'Failed to fetch segment types. Admin system may not be set up.' });
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

    // Validate name format (lowercase, underscore separated)
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return res.status(400).json({
        error: 'Name must be lowercase and underscore separated (e.g., car_rental)'
      });
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create segment type config
      const segmentType = await tx.$executeRaw`
        INSERT INTO segment_type_configs (name, display_name, description, is_active, default_timezone, display_config)
        VALUES (${name}, ${displayName}, ${description}, ${isActive}, ${defaultTimezone}, ${JSON.stringify(displayConfig)}::jsonb)
        RETURNING *
      `;

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

      // Create default classification rules if provided
      if (classificationRules.length > 0) {
        for (const rule of classificationRules) {
          await tx.$executeRaw`
            INSERT INTO classification_rules (name, segment_type_name, pattern, type, priority, is_active)
            VALUES (${rule.name}, ${name}, ${rule.pattern}, ${rule.type || 'keyword'}, ${rule.priority || 10}, ${rule.isActive !== false})
          `;
        }
      }

      // Create timezone rules if provided
      if (timezoneRules.length > 0) {
        for (const tzRule of timezoneRules) {
          await tx.$executeRaw`
            INSERT INTO timezone_rules (segment_type_name, location_pattern, timezone, priority)
            VALUES (${name}, ${tzRule.locationPattern}, ${tzRule.timezone}, ${tzRule.priority || 10})
          `;
        }
      }

      return segmentType;
    });

    res.status(201).json({ 
      message: 'Segment type created successfully',
      segmentType: { name, displayName, isActive }
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

// PUT /api/admin/segment-types/:name - Update segment type
router.put('/segment-types/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { displayName, description, isActive, defaultTimezone } = req.body;

    const result = await prisma.$executeRaw`
      UPDATE segment_type_configs 
      SET display_name = ${displayName}, 
          description = ${description}, 
          is_active = ${isActive}, 
          default_timezone = ${defaultTimezone},
          updated_at = CURRENT_TIMESTAMP
      WHERE name = ${name}
      RETURNING *
    `;

    if (result === 0) {
      return res.status(404).json({ error: 'Segment type not found' });
    }

    res.json({ message: 'Segment type updated successfully' });
  } catch (error) {
    console.error('Error updating segment type:', error);
    res.status(500).json({ error: 'Failed to update segment type' });
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

    await prisma.$executeRaw`
      INSERT INTO classification_rules (name, segment_type_name, pattern, type, priority, is_active)
      VALUES (${ruleName}, ${name}, ${pattern}, ${type}, ${priority}, ${isActive})
    `;

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

// PUT /api/admin/classification-rules/:id
router.put('/classification-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pattern, type, priority, isActive } = req.body;

    const result = await prisma.$executeRaw`
      UPDATE classification_rules 
      SET pattern = ${pattern}, 
          type = ${type}, 
          priority = ${priority}, 
          is_active = ${isActive},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(id)}
    `;

    if (result === 0) {
      return res.status(404).json({ error: 'Classification rule not found' });
    }

    res.json({ message: 'Classification rule updated successfully' });
  } catch (error) {
    console.error('Error updating classification rule:', error);
    res.status(500).json({ error: 'Failed to update classification rule' });
  }
});

// DELETE /api/admin/classification-rules/:id
router.delete('/classification-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await prisma.$executeRaw`
      DELETE FROM classification_rules WHERE id = ${parseInt(id)}
    `;

    if (result === 0) {
      return res.status(404).json({ error: 'Classification rule not found' });
    }

    res.json({ message: 'Classification rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting classification rule:', error);
    res.status(500).json({ error: 'Failed to delete classification rule' });
  }
});

// =====================================================================
// PROMPT TEMPLATE MANAGEMENT
// =====================================================================

// GET /api/admin/prompts
router.get('/prompts', async (req, res) => {
  try {
    const prompts = await prisma.promptTemplate.findMany({
      orderBy: [
        { category: 'asc' },
        { type: 'asc' },
        { version: 'desc' }
      ]
    });

    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// POST /api/admin/prompts
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

// PUT /api/admin/prompts/:id
router.put('/prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { prompt, isActive, version } = req.body;

    // If setting this prompt as active, deactivate others with same name
    if (isActive) {
      const currentPrompt = await prisma.promptTemplate.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (currentPrompt) {
        await prisma.promptTemplate.updateMany({
          where: { 
            name: currentPrompt.name, 
            isActive: true,
            id: { not: parseInt(id) }
          },
          data: { isActive: false }
        });
      }
    }

    const updatedPrompt = await prisma.promptTemplate.update({
      where: { id: parseInt(id) },
      data: { prompt, isActive, version }
    });

    res.json({ 
      message: 'Prompt template updated successfully',
      promptTemplate: updatedPrompt
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt template' });
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

    await prisma.$executeRaw`
      INSERT INTO timezone_rules (segment_type_name, location_pattern, timezone, priority)
      VALUES (${name}, ${locationPattern}, ${timezone}, ${priority})
    `;

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
    const segments = await prisma.travelSegment.findMany({
      where: whereClause,
      include: { email: true }
    });

    const results = [];

    for (const segment of segments) {
      try {
        // Mark as reprocessed - actual reprocessing would use email processor
        const updated = await prisma.travelSegment.update({
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
    const psSegments = await prisma.travelSegment.findMany({
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
        const updated = await prisma.travelSegment.update({
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

// POST /api/admin/test-classification
router.post('/test-classification', async (req, res) => {
  try {
    const { subject, sender, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Email content is required for testing' });
    }

    // Get all classification rules
    const rules = await prisma.$queryRaw`
      SELECT cr.*, stc.name as segment_type_name
      FROM classification_rules cr
      JOIN segment_type_configs stc ON cr.segment_type_name = stc.name
      WHERE cr.is_active = true AND stc.is_active = true
      ORDER BY cr.priority DESC
    `;

    // Test classification logic
    const searchText = `${subject || ''} ${content} ${sender || ''}`.toLowerCase();
    let matchedRule = null;
    let segmentType = 'other';

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
        segmentType = rule.segment_type_name;
        break;
      }
    }

    res.json({
      segmentType,
      matchedRule,
      confidence: matchedRule ? 'High' : 'Low',
      totalRulesChecked: rules.length
    });
  } catch (error) {
    console.error('Error testing classification:', error);
    res.status(500).json({ error: 'Failed to test classification' });
  }
});

module.exports = router;