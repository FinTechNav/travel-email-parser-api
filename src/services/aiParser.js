// src/services/aiParser.js - UPDATED VERSION
const OpenAI = require('openai');
const PromptService = require('./promptService');
const logger = require('../utils/logger');

class AIParser {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.promptService = new PromptService();

    // These will be loaded from database
    this.model = null;
    this.temperature = null;
    this.maxTokens = null;

    // Load configuration on startup
    this.loadConfiguration();
  }

  async loadConfiguration() {
    try {
      const config = await this.promptService.getAIConfiguration();
      this.model = config.model || 'gpt-4o-mini';
      this.temperature = config.temperature || 0.1;
      this.maxTokens = config.maxTokens || 2000;
      this.responseFormat = config.metadata?.response_format || { type: 'json_object' };

      logger.info(`AI Configuration loaded: ${this.model}, temp=${this.temperature}`);
    } catch (error) {
      logger.error('Failed to load AI configuration, using defaults:', error);
      // Fallback to defaults
      this.model = 'gpt-4o-mini';
      this.temperature = 0.1;
      this.maxTokens = 2000;
      this.responseFormat = { type: 'json_object' };
    }
  }

  // Your existing time extraction method (unchanged)
  extractTimesFromEmail(emailContent) {
    const timePatterns = [
      /(\d{1,2}:\d{2}\s*(?:AM|PM))/gi,
      /(?:at|@)\s*(\d{1,2}:\d{2})/gi,
      /(\d{1,2}:\d{2})/g,
    ];

    const extractedTimes = [];
    const lines = emailContent.split('\n');

    lines.forEach((line, index) => {
      timePatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          extractedTimes.push({
            time: match[1] || match[0],
            context: line.trim(),
            lineNumber: index,
          });
        }
      });
    });

    return extractedTimes.slice(0, 10); // Limit to 10 to avoid prompt bloat
  }

  // Your existing time validation method (unchanged)
  validateTimes(parsedData) {
    const warnings = [];

    if (parsedData.type === 'hotel' && parsedData.details) {
      if (parsedData.details.check_in_time) {
        const checkInHour = parseInt(parsedData.details.check_in_time.split(':')[0] || 0);
        if (checkInHour < 14 || checkInHour > 18) {
          warnings.push(
            `Unusual check-in time: ${parsedData.details.check_in_time} (expected 14:00-18:00)`
          );
        }
      }

      if (parsedData.details.check_out_time) {
        const checkOutHour = parseInt(parsedData.details.check_out_time.split(':')[0] || 0);
        if (checkOutHour < 10 || checkOutHour > 12) {
          warnings.push(
            `Unusual check-out time: ${parsedData.details.check_out_time} (expected 10:00-12:00)`
          );
        }
      }
    }

    if (parsedData.type === 'car_rental' && parsedData.details) {
      if (parsedData.details.pickup_time) {
        const pickupHour = parseInt(parsedData.details.pickup_time.split(':')[0] || 0);
        if (pickupHour < 6 || pickupHour > 22) {
          warnings.push(
            `Unusual pickup time: ${parsedData.details.pickup_time} (expected 06:00-22:00)`
          );
        }
      }
    }

    if (warnings.length > 0) {
      logger.warn('Time validation warnings:', warnings);
    }

    return warnings;
  }

  // UPDATED: Use database-driven classification
  async classifyEmail(emailContent) {
    try {
      const prompt = await this.promptService.getClassificationPrompt(emailContent);
      const startTime = Date.now();

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 10,
      });

      const classification = response.choices[0].message.content.trim().toLowerCase();
      const responseTime = Date.now() - startTime;

      logger.info(`Email classified as: ${classification} (${responseTime}ms)`);

      // Track usage
      const template = await this.promptService.getPromptTemplate('classification', 'base');
      if (template) {
        await this.promptService.trackUsage(
          template.id,
          'success',
          null,
          responseTime,
          response.usage?.total_tokens
        );
      }

      return classification;
    } catch (error) {
      logger.error('Email classification failed:', error);

      // Track error
      const template = await this.promptService.getPromptTemplate('classification', 'base');
      if (template) {
        await this.promptService.trackUsage(template.id, 'error', error.message);
      }

      throw new Error(`Classification failed: ${error.message}`);
    }
  }

  // UPDATED: Use database-driven parsing prompts
  async parseEmail(emailContent, emailType = 'auto') {
    try {
      // Extract times before AI parsing for better context
      const extractedTimes = this.extractTimesFromEmail(emailContent);

      // Get prompt from database
      const prompt = await this.promptService.getParsingPrompt(
        emailContent,
        emailType,
        extractedTimes
      );

      const startTime = Date.now();

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: this.responseFormat,
      });

      const content = response.choices[0].message.content.trim();
      const responseTime = Date.now() - startTime;

      logger.debug(`AI response length: ${content.length} characters (${responseTime}ms)`);

      let parsedData;
      try {
        parsedData = this.parseJsonResponse(content);
      } catch (jsonError) {
        logger.error('Failed to parse AI response as JSON:', jsonError.message);
        logger.error('Raw AI response:', content);

        const extractedJson = this.extractJsonFromResponse(content);
        if (extractedJson) {
          parsedData = extractedJson;
          logger.info('Successfully extracted JSON from mixed response');
        } else {
          // Track parsing error
          const template = await this.promptService.getPromptTemplate('parsing', emailType);
          if (template) {
            await this.promptService.trackUsage(template.id, 'error', 'Invalid JSON response');
          }
          throw new Error('Invalid JSON response from AI service');
        }
      }

      // Validate times after parsing
      const timeWarnings = this.validateTimes(parsedData);
      if (timeWarnings.length > 0) {
        logger.warn(`Time validation warnings for ${emailType}:`, timeWarnings);
      }

      // Track successful usage
      const template = await this.promptService.getPromptTemplate('parsing', emailType);
      if (template) {
        await this.promptService.trackUsage(
          template.id,
          'success',
          null,
          responseTime,
          response.usage?.total_tokens
        );
      }

      logger.info(`Successfully parsed ${emailType} email`);
      return parsedData;
    } catch (error) {
      logger.error('Email parsing failed:', error);

      // Track error
      const template = await this.promptService.getPromptTemplate('parsing', emailType);
      if (template) {
        await this.promptService.trackUsage(template.id, 'error', error.message);
      }

      throw new Error(`Parsing failed: ${error.message}`);
    }
  }

  // Your existing JSON parsing methods (unchanged)
  parseJsonResponse(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      const cleaned = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*/, '')
        .replace(/\s*$/, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      return JSON.parse(cleaned);
    }
  }

  extractJsonFromResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return this.parseJsonResponse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Method to refresh configuration (for when prompts are updated)
  async refreshConfiguration() {
    await this.loadConfiguration();
    this.promptService.clearCache();
    logger.info('AI Parser configuration refreshed');
  }
}

module.exports = AIParser;
