// src/services/dynamicEmailProcessor.js
// Updated email processor that uses database configuration instead of hardcoded rules

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DynamicEmailProcessor {
  constructor() {
    this.classificationRules = [];
    this.segmentTypeConfigs = new Map();
    this.timezoneRules = new Map();
    this.displayRules = new Map();
    this.promptTemplates = new Map();
    this.lastConfigLoad = null;
    this.configCacheTime = 5 * 60 * 1000; // 5 minutes
  }

  // Load configuration from database
  async loadConfiguration() {
    const now = Date.now();
    if (this.lastConfigLoad && (now - this.lastConfigLoad) < this.configCacheTime) {
      return; // Use cached config
    }

    try {
      console.log('Loading dynamic email processing configuration...');

      // Load segment type configurations
      const segmentTypes = await prisma.segmentTypeConfig.findMany({
        where: { isActive: true },
        include: {
          classificationRules: {
            where: { isActive: true },
            orderBy: { priority: 'desc' }
          },
          timezoneRules: {
            orderBy: { priority: 'desc' }
          },
          displayRules: true,
          promptTemplates: {
            where: { isActive: true }
          }
        }
      });

      // Cache segment type configs
      this.segmentTypeConfigs.clear();
      segmentTypes.forEach(type => {
        this.segmentTypeConfigs.set(type.name, type);
      });

      // Cache classification rules (sorted by priority)
      this.classificationRules = [];
      segmentTypes.forEach(type => {
        type.classificationRules.forEach(rule => {
          this.classificationRules.push({
            ...rule,
            segmentType: type.name
          });
        });
      });
      this.classificationRules.sort((a, b) => b.priority - a.priority);

      // Cache timezone rules
      this.timezoneRules.clear();
      segmentTypes.forEach(type => {
        this.timezoneRules.set(type.name, type.timezoneRules);
      });

      // Cache display rules
      this.displayRules.clear();
      segmentTypes.forEach(type => {
        if (type.displayRules.length > 0) {
          this.displayRules.set(type.name, type.displayRules[0]);
        }
      });

      // Cache prompt templates
      this.promptTemplates.clear();
      segmentTypes.forEach(type => {
        type.promptTemplates.forEach(template => {
          this.promptTemplates.set(template.name, template);
        });
      });

      this.lastConfigLoad = now;
      console.log(`Loaded configuration for ${segmentTypes.length} segment types`);
      console.log(`Classification rules: ${this.classificationRules.length}`);
      
    } catch (error) {
      console.error('Error loading email processing configuration:', error);
      throw error;
    }
  }

  // Classify email using dynamic rules
  async classifyEmail(emailContent, subject, sender) {
    await this.loadConfiguration();

    const searchText = `${subject} ${emailContent} ${sender}`.toLowerCase();

    // Apply classification rules in priority order
    for (const rule of this.classificationRules) {
      if (this.matchesRule(rule, searchText, subject, sender)) {
        console.log(`Email classified as '${rule.segmentType}' using rule '${rule.name}'`);
        return rule.segmentType;
      }
    }

    // Default fallback
    console.log('Email classified as default type: other');
    return 'other';
  }

  // Check if content matches a classification rule
  matchesRule(rule, searchText, subject, sender) {
    const pattern = rule.pattern.toLowerCase();

    switch (rule.type) {
      case 'sender':
        return sender.toLowerCase().includes(pattern);
      
      case 'subject':
        return subject.toLowerCase().includes(pattern);
      
      case 'keyword':
        return searchText.includes(pattern);
      
      case 'regex':
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(searchText);
        } catch (error) {
          console.error(`Invalid regex pattern in rule '${rule.name}':`, pattern);
          return false;
        }
      
      default:
        return searchText.includes(pattern);
    }
  }

  // Get appropriate prompt for email type
  async getParsingPrompt(emailType) {
    await this.loadConfiguration();

    const segmentConfig = this.segmentTypeConfigs.get(emailType);
    if (!segmentConfig) {
      console.warn(`No configuration found for segment type: ${emailType}`);
      return this.getDefaultParsingPrompt();
    }

    // Find active prompt template for this type
    const promptTemplate = segmentConfig.promptTemplates.find(p => p.isActive);
    if (promptTemplate) {
      return promptTemplate.prompt;
    }

    // Fallback to default prompt
    console.warn(`No active prompt template found for type: ${emailType}`);
    return this.getDefaultParsingPrompt();
  }

  // Determine timezone using dynamic rules
  async inferTimezone(segmentType, data, emailContent) {
    await this.loadConfiguration();

    const timezoneRules = this.timezoneRules.get(segmentType) || [];
    const segmentConfig = this.segmentTypeConfigs.get(segmentType);
    const displayRule = this.displayRules.get(segmentType);

    // Special handling for private terminals - use facility timezone
    if (segmentType === 'private_terminal') {
      const facilityName = data?.service_details?.facility_name || 
                          data?.locations?.origin || 
                          this.extractFacilityFromContent(emailContent);

      // Apply timezone rules in priority order
      for (const rule of timezoneRules) {
        if (facilityName && facilityName.toLowerCase().includes(rule.locationPattern.toLowerCase())) {
          console.log(`Using timezone ${rule.timezone} for facility ${facilityName}`);
          return rule.timezone;
        }
      }
    }

    // For other segment types, use display rule configuration
    if (displayRule) {
      const origin = data?.locations?.origin;
      const destination = data?.locations?.destination;

      let locationToCheck = null;
      if (displayRule.timezoneSource === 'origin') {
        locationToCheck = origin;
      } else if (displayRule.timezoneSource === 'destination') {
        locationToCheck = destination;
      }

      if (locationToCheck) {
        // Apply timezone rules for the location
        for (const rule of timezoneRules) {
          if (locationToCheck.toLowerCase().includes(rule.locationPattern.toLowerCase())) {
            console.log(`Using timezone ${rule.timezone} for location ${locationToCheck}`);
            return rule.timezone;
          }
        }

        // Fallback to built-in location inference
        const inferredTimezone = this.inferTimezoneFromLocation(locationToCheck);
        if (inferredTimezone) {
          return inferredTimezone;
        }
      }
    }

    // Use segment type default timezone
    if (segmentConfig?.defaultTimezone) {
      console.log(`Using default timezone ${segmentConfig.defaultTimezone} for type ${segmentType}`);
      return segmentConfig.defaultTimezone;
    }

    // Final fallback
    return 'America/New_York';
  }

  // Extract facility name from email content
  extractFacilityFromContent(emailContent) {
    if (!emailContent) return null;
    
    const facilityPatterns = [
      /PS\s+(ATL|LAX|JFK|ORD|DFW|MIA|SEA)/gi,
      /Private\s+Terminal\s+.*?(ATL|LAX|JFK|ORD|DFW|MIA|SEA)/gi,
      /PS\s+([A-Z]{3})/gi
    ];
    
    for (const pattern of facilityPatterns) {
      const match = emailContent.match(pattern);
      if (match) {
        return `PS ${match[1].toUpperCase()}`;
      }
    }
    
    return null;
  }

  // Built-in timezone inference for common locations
  inferTimezoneFromLocation(location) {
    if (!location) return null;
    
    const locationTimezones = {
      // Airport codes
      'atl': 'America/New_York',
      'lax': 'America/Los_Angeles',
      'jfk': 'America/New_York',
      'ord': 'America/Chicago',
      'aus': 'America/Chicago',
      'dfw': 'America/Chicago',
      'mia': 'America/New_York',
      'sea': 'America/Los_Angeles',
      
      // Cities
      'atlanta': 'America/New_York',
      'austin': 'America/Chicago',
      'los angeles': 'America/Los_Angeles',
      'new york': 'America/New_York',
      'chicago': 'America/Chicago',
      'dallas': 'America/Chicago',
      'miami': 'America/New_York',
      'seattle': 'America/Los_Angeles'
    };

    const normalizedLocation = location.toLowerCase().trim();
    
    // Direct match
    if (locationTimezones[normalizedLocation]) {
      return locationTimezones[normalizedLocation];
    }
    
    // Partial match
    for (const [key, timezone] of Object.entries(locationTimezones)) {
      if (normalizedLocation.includes(key)) {
        return timezone;
      }
    }
    
    return null;
  }

  // Format segment data using display rules
  async formatSegmentData(segmentType, rawData) {
    await this.loadConfiguration();

    const displayRule = this.displayRules.get(segmentType);
    const segmentConfig = this.segmentTypeConfigs.get(segmentType);

    if (!displayRule || !segmentConfig) {
      return rawData; // No special formatting
    }

    // Determine primary time field
    let primaryTime = null;
    if (displayRule.primaryTimeField === 'departure') {
      primaryTime = rawData.travel_dates?.departure;
    } else if (displayRule.primaryTimeField === 'return') {
      primaryTime = rawData.travel_dates?.return;
    } else if (displayRule.primaryTimeField === 'earliest_arrival') {
      primaryTime = rawData.service_details?.earliest_arrival || rawData.travel_dates?.departure;
    }

    // Format route using template
    let formattedRoute = displayRule.routeFormat;
    if (rawData.locations?.origin) {
      formattedRoute = formattedRoute.replace('{origin}', rawData.locations.origin);
    }
    if (rawData.locations?.destination) {
      formattedRoute = formattedRoute.replace('{destination}', rawData.locations.destination);
    }

    return {
      ...rawData,
      _formatted: {
        primaryTime,
        route: formattedRoute,
        displayName: segmentConfig.displayName,
        timezoneSource: displayRule.timezoneSource
      }
    };
  }

  // Process email with dynamic configuration
  async processEmail(emailContent, subject, sender = '') {
    try {
      console.log('Processing email with dynamic configuration...');

      // Step 1: Classify email type
      const emailType = await this.classifyEmail(emailContent, subject, sender);

      // Step 2: Get appropriate parsing prompt
      const prompt = await this.getParsingPrompt(emailType);

      // Step 3: Parse email content using AI
      const rawData = await this.parseEmailWithAI(emailContent, prompt);

      // Step 4: Infer timezone
      const timezone = await this.inferTimezone(emailType, rawData, emailContent);

      // Step 5: Format data using display rules
      const formattedData = await this.formatSegmentData(emailType, rawData);

      // Step 6: Apply timezone to dates
      const finalData = this.applyTimezoneToData(formattedData, timezone);

      console.log(`Email processed successfully as type: ${emailType}`);
      return finalData;

    } catch (error) {
      console.error('Error processing email:', error);
      throw error;
    }
  }

  // Parse email using AI with the selected prompt
  async parseEmailWithAI(emailContent, prompt) {
    // This would integrate with your existing AI service
    // For now, returning a mock structure
    const { parseEmailWithOpenAI } = require('./openaiService');
    
    const filledPrompt = prompt.replace('{{emailContent}}', emailContent);
    const result = await parseEmailWithOpenAI(filledPrompt);
    
    return result;
  }

  // Apply timezone information to date fields
  applyTimezoneToData(data, timezone) {
    const result = { ...data };
    
    // Add timezone metadata
    result._metadata = {
      ...result._metadata,
      inferredTimezone: timezone,
      processedAt: new Date().toISOString()
    };

    return result;
  }

  // Get default parsing prompt as fallback
  getDefaultParsingPrompt() {
    return `You are an expert travel email parser. Extract ALL relevant information from this confirmation email.
You MUST respond with valid JSON only. Do not include any explanatory text outside the JSON.

IMPORTANT RULES:
1. Extract dates in ISO format (YYYY-MM-DD HH:MM)
2. Identify confirmation/booking numbers (remove spaces, clean format)
3. Extract passenger names exactly as shown
4. Parse prices and currency (numbers only for amount)
5. Identify locations (cities, airports, addresses)
6. If information is missing, use null
7. Always respond with valid JSON only

Return a JSON object with this exact structure:
{
  "type": "{{emailType}}",
  "confirmation_number": "string or null",
  "passenger_name": "string or null",
  "travel_dates": {
    "departure": "YYYY-MM-DD HH:MM or null",
    "return": "YYYY-MM-DD HH:MM or null"
  },
  "locations": {
    "origin": "string or null",
    "destination": "string or null"
  },
  "price": {
    "amount": number or null,
    "currency": "string or null"
  },
  "details": {}
}

Email content:
{{emailContent}}`;
  }

  // Get all available segment types
  async getAvailableSegmentTypes() {
    await this.loadConfiguration();
    return Array.from(this.segmentTypeConfigs.values()).map(config => ({
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      isActive: config.isActive
    }));
  }

  // Reload configuration (for admin operations)
  async reloadConfiguration() {
    this.lastConfigLoad = null;
    await this.loadConfiguration();
    console.log('Configuration reloaded successfully');
  }
}

// Export singleton instance
const dynamicEmailProcessor = new DynamicEmailProcessor();

module.exports = {
  DynamicEmailProcessor,
  dynamicEmailProcessor,
  
  // Backward compatibility functions
  async processEmail(emailContent, subject, sender) {
    return dynamicEmailProcessor.processEmail(emailContent, subject, sender);
  },

  async classifyEmail(emailContent, subject, sender) {
    return dynamicEmailProcessor.classifyEmail(emailContent, subject, sender);
  },

  async getParsingPrompt(emailType) {
    return dynamicEmailProcessor.getParsingPrompt(emailType);
  },

  async inferTimezone(segmentType, data, emailContent) {
    return dynamicEmailProcessor.inferTimezone(segmentType, data, emailContent);
  },

  async reloadConfiguration() {
    return dynamicEmailProcessor.reloadConfiguration();
  }
};