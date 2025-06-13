// src/services/aiParser.js - Fixed version with robust JSON parsing

const OpenAI = require('openai');
const logger = require('../utils/logger');

class AIParser {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 1500;
    this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.1;
  }

  async classifyEmail(emailContent) {
    try {
      const prompt = `
      Classify this email as one of: flight, hotel, car_rental, train, cruise, restaurant, event, other
      
      Look for keywords like:
      - Flight: airline, flight, boarding, gate, departure, arrival
      - Hotel: hotel, reservation, check-in, check-out, room
      - Car rental: rental, car, pickup, return, vehicle
      - Train: train, rail, platform, coach, seat
      - Cruise: cruise, ship, cabin, sailing
      - Restaurant: restaurant, reservation, table, dining
      - Event: ticket, event, concert, show, venue
      
      Email content: ${emailContent.substring(0, 500)}...
      
      Respond with only the classification word.
      `;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 10,
      });

      const classification = response.choices[0].message.content.trim().toLowerCase();
      logger.info(`Email classified as: ${classification}`);
      return classification;
    } catch (error) {
      logger.error('Email classification failed:', error);
      throw new Error(`Classification failed: ${error.message}`);
    }
  }

  async parseEmail(emailContent, emailType = 'auto') {
    try {
      const prompt = this.createParsingPrompt(emailContent, emailType);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' }, // Force JSON response
      });

      const content = response.choices[0].message.content.trim();
      logger.debug(`AI response length: ${content.length} characters`);

      // Parse JSON response with better error handling
      let parsedData;
      try {
        parsedData = this.parseJsonResponse(content);
      } catch (jsonError) {
        logger.error('Failed to parse AI response as JSON:', jsonError.message);
        logger.error('Raw AI response:', content);

        // Try to extract JSON from the response
        const extractedJson = this.extractJsonFromResponse(content);
        if (extractedJson) {
          parsedData = extractedJson;
          logger.info('Successfully extracted JSON from mixed response');
        } else {
          throw new Error('Invalid JSON response from AI service');
        }
      }

      logger.info(`Successfully parsed ${emailType} email`);
      return parsedData;
    } catch (error) {
      logger.error('Email parsing failed:', error);
      throw new Error(`Parsing failed: ${error.message}`);
    }
  }

  parseJsonResponse(content) {
    // Try direct JSON parsing first
    try {
      return JSON.parse(content);
    } catch (error) {
      // If that fails, try to clean the content
      const cleaned = content
        .replace(/```json\s*/g, '') // Remove JSON code block markers
        .replace(/```\s*/g, '') // Remove closing code block markers
        .replace(/^\s*/, '') // Remove leading whitespace
        .replace(/\s*$/, '') // Remove trailing whitespace
        .replace(/,\s*}/g, '}') // Remove trailing commas
        .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

      return JSON.parse(cleaned);
    }
  }

  extractJsonFromResponse(content) {
    try {
      // Look for JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return this.parseJsonResponse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // In src/services/aiParser.js - Update the createParsingPrompt method
  createParsingPrompt(emailContent, emailType) {
    const basePrompt = `
  You are an expert travel email parser. Extract ALL relevant information from this confirmation email.
  You MUST respond with valid JSON only. Do not include any explanatory text outside the JSON.
  
  IMPORTANT FLIGHT PARSING RULES:
  1. For ROUND-TRIP flights: Create TWO separate flight objects (outbound + return)
  2. For ONE-WAY flights with connections: Create separate flight objects for each flight segment
  3. For DIRECT flights: Create ONE flight object
  4. Each flight object should have DIFFERENT departure/arrival times
  5. Never create identical flight objects with the same times
  
  IMPORTANT RULES:
  1. Extract dates in ISO format (YYYY-MM-DD HH:MM)
  2. Identify confirmation/booking numbers (remove spaces, clean format)
  3. Extract passenger names exactly as shown
  4. Parse prices and currency (numbers only for amount)
  5. Identify locations (cities, airports, addresses)
  6. If information is missing, use null
  7. Always respond with valid JSON only
  8. For flights, create separate entries for each flight segment
  `;

    // Add flight-specific prompt
    if (emailType === 'flight') {
      const flightPrompt =
        basePrompt +
        `
    
    For flight confirmations, return this JSON structure:
    {
      "type": "flight",
      "confirmation_number": "ABC123",
      "passenger_name": "John Doe",
      "flights": [
        {
          "flight_number": "DL1234",
          "departure_airport": "ATL",
          "arrival_airport": "AUS", 
          "departure_city": "Atlanta",
          "arrival_city": "Austin, TX",
          "departure_datetime": "2025-06-13T06:18:00",
          "arrival_datetime": "2025-06-13T08:30:00",
          "aircraft": "Boeing 737",
          "seat": "12A"
        },
        {
          "flight_number": "DL5678",
          "departure_airport": "AUS",
          "arrival_airport": "ATL",
          "departure_city": "Austin, TX", 
          "arrival_city": "Atlanta",
          "departure_datetime": "2025-06-15T20:35:00",
          "arrival_datetime": "2025-06-15T23:45:00",
          "aircraft": "Boeing 737",
          "seat": "12A"
        }
      ],
      "price": {
        "amount": 250.00,
        "currency": "USD"
      }
    }
    
    Parse this email and extract flight information:
    ${emailContent}`;

      return flightPrompt;
    }

    // ... rest of your existing prompt logic for other types
    return basePrompt + `\n\nParse this email:\n${emailContent}`;
  }

  async healthCheck() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Respond with just the word "healthy"' }],
        max_tokens: 10,
        temperature: 0,
      });

      return response.choices[0].message.content.trim().toLowerCase().includes('healthy');
    } catch (error) {
      logger.error('AI health check failed:', error);
      return false;
    }
  }
}

module.exports = AIParser;
