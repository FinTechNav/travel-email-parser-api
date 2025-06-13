// src/services/promptService.js
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

class PromptService {
  constructor() {
    this.prisma = new PrismaClient();
    this.cache = new Map(); // Cache for active prompts
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get active prompt template
  async getPromptTemplate(category, type = 'base') {
    const cacheKey = `${category}_${type}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.template;
      }
    }

    try {
      const template = await this.prisma.promptTemplate.findFirst({
        where: {
          category,
          type,
          isActive: true,
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (template) {
        // Cache the result
        this.cache.set(cacheKey, {
          template,
          timestamp: Date.now(),
        });

        // Track usage
        await this.trackUsage(template.id, 'retrieved');
      }

      return template;
    } catch (error) {
      logger.error('Error fetching prompt template:', error);
      throw error;
    }
  }

  // Create classification prompt
  async getClassificationPrompt(emailContent) {
    const template = await this.getPromptTemplate('classification', 'base');

    if (!template) {
      // Fallback to hardcoded prompt if none in database
      return this.getDefaultClassificationPrompt(emailContent);
    }

    return this.interpolatePrompt(template.prompt, {
      emailContent: emailContent.substring(0, 500),
    });
  }

  // Create parsing prompt with dynamic email type

  async getParsingPrompt(emailContent, emailType, extractedTimes = []) {
  // Get base parsing template
  const baseTemplate = await this.getPromptTemplate('parsing', 'base');
  const typeTemplate = await this.getPromptTemplate('parsing', emailType);

  if (!baseTemplate) {
    return this.getDefaultParsingPrompt(emailContent, emailType, extractedTimes);
  }

  // Special handling for private_terminal - use specialized prompt
  if (emailType === 'private_terminal' && typeTemplate) {
    console.log('Using specialized private_terminal prompt');
    return this.interpolatePrompt(typeTemplate.prompt, {
      emailContent,
      extractedTimes: this.formatExtractedTimes(extractedTimes),
      emailType
    });
  }

  // Handle special flight case (different structure)
  if (emailType === 'flight' && typeTemplate) {
    const timeParsingInstructions = `
CRITICAL TIME PARSING RULES:
- Convert ALL times to 24-hour format (HH:MM) 
- Examples: 4:00 PM → 16:00, 11:00 AM → 11:00, 2:00 PM → 14:00
- Look for exact phrases: "pickup at", "check-in", "check-out", "departure", "arrival"
- Pay close attention to AM/PM indicators

EXTRACTED TIMES FROM EMAIL:
${this.formatExtractedTimes(extractedTimes)}`;

    return this.interpolatePrompt(typeTemplate.prompt, {
      emailContent,
      timeParsingInstructions,
      extractedTimes: this.formatExtractedTimes(extractedTimes)
    });
  }

  // For other types, combine base + type-specific prompts
  let fullPrompt = baseTemplate.prompt;
  if (typeTemplate) {
    fullPrompt = fullPrompt.replace('Return a JSON object with this exact structure:', 
      typeTemplate.prompt + '\n\nReturn a JSON object with this exact structure:');
  }

  const formattedTimes = this.formatExtractedTimes(extractedTimes);
  return this.interpolatePrompt(fullPrompt, {
    emailContent,
    emailType,
    extractedTimes: formattedTimes
  });
}

// Add this new method if it doesn't exist
formatExtractedTimes(extractedTimes) {
  if (!extractedTimes || extractedTimes.length === 0) {
    return 'No specific times found in email.';
  }
  return extractedTimes
    .map((timeInfo, index) => 
      `${index + 1}. "${timeInfo.time}" in context: "${timeInfo.context}"`
    )
    .join('\n');
}

// Make sure your interpolatePrompt method handles all the variables
interpolatePrompt(template, variables) {
  let result = template;
  
  // Replace all variables
  Object.keys(variables).forEach(key => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), variables[key] || '');
  });
  
  return result;
}

  // Format extracted times for prompt
  formatExtractedTimes(extractedTimes) {
    if (!extractedTimes || extractedTimes.length === 0) {
      return 'No specific times extracted from email.';
    }

    return extractedTimes.map((t) => `"${t.time}" found in context: "${t.context}"`).join('\n');
  }

  // Create or update prompt template
  async createPromptTemplate(data) {
    try {
      // Check if template with same name exists
      const existing = await this.prisma.promptTemplate.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        // Create new version
        const newVersion = await this.prisma.promptTemplate.create({
          data: {
            ...data,
            version: existing.version + 1,
            isActive: false, // New versions start inactive
          },
        });

        logger.info(`Created new version ${newVersion.version} of prompt: ${data.name}`);
        return newVersion;
      } else {
        // Create first version
        const template = await this.prisma.promptTemplate.create({
          data,
        });

        logger.info(`Created new prompt template: ${data.name}`);
        return template;
      }
    } catch (error) {
      logger.error('Error creating prompt template:', error);
      throw error;
    }
  }

  // Activate a prompt template version
  async activatePromptTemplate(id) {
    try {
      const template = await this.prisma.promptTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Deactivate other versions of the same prompt
      await this.prisma.promptTemplate.updateMany({
        where: {
          name: template.name,
          id: { not: id },
        },
        data: {
          isActive: false,
        },
      });

      // Activate this version
      await this.prisma.promptTemplate.update({
        where: { id },
        data: {
          isActive: true,
        },
      });

      // Clear cache
      this.clearCache();

      logger.info(`Activated prompt template: ${template.name} v${template.version}`);
    } catch (error) {
      logger.error('Error activating prompt template:', error);
      throw error;
    }
  }

  // Track prompt usage for analytics

  // REPLACE the trackUsage method in src/services/promptService.js

  // Track prompt usage for analytics
  async trackUsage(
    templateId,
    result,
    errorMessage = null,
    responseTime = null,
    tokenUsage = null
  ) {
    try {
      // Skip tracking if templateId is missing (fallback prompts)
      if (!templateId) {
        return;
      }

      await this.prisma.promptUsage.create({
        data: {
          templateId,
          emailType: 'unknown', // Add default email type
          success: result === 'success',
          errorMessage,
          responseTime,
          tokenUsage,
        },
      });

      // Update template usage count
      await this.prisma.promptTemplate.update({
        where: { id: templateId },
        data: {
          usageCount: { increment: 1 },
        },
      });
    } catch (error) {
      // Don't log usage tracking errors to avoid spam
      // Usage tracking shouldn't break the main flow
    }
  }

  // Get AI configuration
  async getAIConfiguration() {
    try {
      const config = await this.prisma.aIConfiguration.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      });

      return (
        config || {
          model: 'gpt-4o-mini',
          temperature: 0.1,
          maxTokens: 2000,
        }
      );
    } catch (error) {
      logger.error('Error fetching AI configuration:', error);
      // Return default configuration
      return {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 2000,
      };
    }
  }

  // Clear prompt cache
  clearCache() {
    this.cache.clear();
    logger.info('Prompt cache cleared');
  }

  // Fallback methods for when database is not available

  getDefaultClassificationPrompt(emailContent) {
    return `
  Classify this email as one of: flight, hotel, car_rental, train, cruise, restaurant, event, other
  
  Email content: ${emailContent.substring(0, 500)}...
  
  Respond with only the classification word.
  `;
  }

  getDefaultParsingPrompt(emailContent, emailType, extractedTimes) {
    // This would contain your current hardcoded prompts as fallback
    return `Your existing hardcoded prompt for ${emailType}`;
  }
}

module.exports = PromptService;
