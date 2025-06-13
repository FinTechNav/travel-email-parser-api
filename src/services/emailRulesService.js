// src/services/emailRulesService.js
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

class EmailRulesService {
  constructor() {
    this.prisma = new PrismaClient();
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  // Get classification rules for email content
  async getClassificationRules() {
    const cacheKey = 'classification_rules';

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const rules = await this.prisma.emailClassificationRule.findMany({
        where: { isActive: true },
        orderBy: { priority: 'desc' }, // Higher priority first
      });

      // Cache the result
      this.cache.set(cacheKey, {
        data: rules,
        timestamp: Date.now(),
      });

      return rules;
    } catch (error) {
      logger.error('Error fetching classification rules:', error);
      return [];
    }
  }

  // Classify email based on database rules
  async classifyEmailByRules(emailContent, subject, fromAddress) {
    try {
      const rules = await this.getClassificationRules();
      const content = emailContent.toLowerCase();
      const subjectLower = subject ? subject.toLowerCase() : '';
      const fromLower = fromAddress ? fromAddress.toLowerCase() : '';

      for (const rule of rules) {
        const pattern = rule.caseInsensitive ? rule.pattern.toLowerCase() : rule.pattern;
        let matches = false;

        switch (rule.ruleType) {
          case 'keyword':
            matches = content.includes(pattern);
            break;

          case 'subject_pattern':
            matches = subjectLower.includes(pattern);
            break;

          case 'sender_domain':
            matches = fromLower.includes(pattern);
            break;

          case 'content_pattern':
            // Support regex patterns for advanced matching
            try {
              const regex = new RegExp(pattern, rule.caseInsensitive ? 'i' : '');
              matches = regex.test(content);
            } catch (regexError) {
              // Fallback to simple string matching if regex is invalid
              matches = content.includes(pattern);
            }
            break;
        }

        if (matches) {
          logger.info(`Email classified as ${rule.emailType} using rule: ${rule.name}`);
          return rule.emailType;
        }
      }

      return null; // No rule matched
    } catch (error) {
      logger.error('Error classifying email by rules:', error);
      return null;
    }
  }

  // Get subject patterns for email unmarking
  async getSubjectPatterns(emailType) {
    try {
      const patterns = await this.prisma.emailSubjectPattern.findMany({
        where: {
          emailType,
          isActive: true,
        },
      });

      return patterns;
    } catch (error) {
      logger.error('Error fetching subject patterns:', error);
      return [];
    }
  }

  // Get subject variations for unmarking emails
  async getSubjectVariations(emailType, originalSubject) {
    try {
      const patterns = await this.getSubjectPatterns(emailType);
      const variations = [];

      // Add original subject and common variations
      variations.push(originalSubject);
      variations.push(originalSubject.replace('Fwd: ', ''));
      variations.push(originalSubject.replace('Re: ', ''));

      // Add database-defined variations
      for (const pattern of patterns) {
        if (originalSubject.toLowerCase().includes(pattern.pattern.toLowerCase())) {
          variations.push(pattern.pattern);

          // Add variations from database
          if (pattern.variations && Array.isArray(pattern.variations)) {
            variations.push(...pattern.variations);
          }
        }
      }

      return [...new Set(variations)]; // Remove duplicates
    } catch (error) {
      logger.error('Error getting subject variations:', error);
      return [originalSubject];
    }
  }

  // Get email processing configuration
  async getProcessingConfig(category, key) {
    try {
      const config = await this.prisma.emailProcessingConfig.findUnique({
        where: {
          category_key: {
            category,
            key,
          },
          isActive: true,
        },
      });

      return config ? config.value : null;
    } catch (error) {
      logger.error('Error fetching processing config:', error);
      return null;
    }
  }

  // Get time validation rules
  async getTimeValidationRules() {
    try {
      const rules = await this.getProcessingConfig('validation', 'time_ranges');

      return (
        rules || {
          hotel: {
            check_in: { min: 14, max: 18 },
            check_out: { min: 10, max: 12 },
          },
          car_rental: {
            pickup: { min: 6, max: 22 },
            return: { min: 6, max: 22 },
          },
        }
      );
    } catch (error) {
      logger.error('Error fetching time validation rules:', error);
      return null;
    }
  }

  // Get sender rules
  async getSenderRules(fromAddress) {
    try {
      const rules = await this.prisma.emailSenderRule.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      const fromLower = fromAddress.toLowerCase();

      for (const rule of rules) {
        if (fromLower.includes(rule.senderPattern.toLowerCase())) {
          return rule;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error fetching sender rules:', error);
      return null;
    }
  }

  // Create new classification rule
  async createClassificationRule(data) {
    try {
      const rule = await this.prisma.emailClassificationRule.create({
        data,
      });

      this.clearCache();
      logger.info(`Created classification rule: ${rule.name}`);
      return rule;
    } catch (error) {
      logger.error('Error creating classification rule:', error);
      throw error;
    }
  }

  // Create new subject pattern
  async createSubjectPattern(data) {
    try {
      const pattern = await this.prisma.emailSubjectPattern.create({
        data,
      });

      logger.info(`Created subject pattern: ${pattern.name}`);
      return pattern;
    } catch (error) {
      logger.error('Error creating subject pattern:', error);
      throw error;
    }
  }

  // Create processing configuration
  async setProcessingConfig(category, key, value, description = null) {
    try {
      const config = await this.prisma.emailProcessingConfig.upsert({
        where: {
          category_key: {
            category,
            key,
          },
        },
        update: {
          value,
          description,
          updatedAt: new Date(),
        },
        create: {
          category,
          key,
          value,
          description,
        },
      });

      logger.info(`Set processing config: ${category}.${key}`);
      return config;
    } catch (error) {
      logger.error('Error setting processing config:', error);
      throw error;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    logger.info('Email rules cache cleared');
  }
}

module.exports = EmailRulesService;
