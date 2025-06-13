// src/services/aiParser.js - Enhanced version with better time parsing

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

  // NEW: Add time extraction before AI parsing
  extractTimesFromEmail(emailContent) {
    const timePatterns = [/(\d{1,2}):(\d{2})\s*(AM|PM)/gi, /(\d{1,2}):(\d{2})/g];

    const extractedTimes = [];
    const lines = emailContent.split('\n');

    lines.forEach((line, index) => {
      timePatterns.forEach((pattern) => {
        const matches = [...line.matchAll(pattern)];
        matches.forEach((match) => {
          extractedTimes.push({
            time: match[0],
            context: line.trim(),
            lineNumber: index,
          });
        });
      });
    });

    logger.debug('Extracted times from email:', extractedTimes);
    return extractedTimes;
  }

  // NEW: Add time validation function
  validateTimes(parsedData) {
    const warnings = [];

    if (parsedData.type === 'hotel') {
      if (parsedData.details && parsedData.details.check_in_time) {
        const checkinHour = parseInt(parsedData.details.check_in_time.split(':')[0] || 0);
        if (checkinHour < 12 || checkinHour > 20) {
          warnings.push(
            `Unusual check-in time: ${parsedData.details.check_in_time} (expected 14:00-18:00)`
          );
        }
      }

      if (parsedData.details && parsedData.details.check_out_time) {
        const checkoutHour = parseInt(parsedData.details.check_out_time.split(':')[0] || 0);
        if (checkoutHour < 8 || checkoutHour > 14) {
          warnings.push(
            `Unusual check-out time: ${parsedData.details.check_out_time} (expected 10:00-12:00)`
          );
        }
      }
    }

    if (parsedData.type === 'car_rental') {
      if (parsedData.details && parsedData.details.pickup_time) {
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
      // NEW: Extract times before AI parsing for better context
      const extractedTimes = this.extractTimesFromEmail(emailContent);

      const prompt = this.createParsingPrompt(emailContent, emailType, extractedTimes);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content.trim();
      logger.debug(`AI response length: ${content.length} characters`);

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
          throw new Error('Invalid JSON response from AI service');
        }
      }

      // NEW: Validate times after parsing
      const timeWarnings = this.validateTimes(parsedData);
      if (timeWarnings.length > 0) {
        logger.warn(`Time validation warnings for ${emailType}:`, timeWarnings);
      }

      logger.info(`Successfully parsed ${emailType} email`);
      return parsedData;
    } catch (error) {
      logger.error('Email parsing failed:', error);
      throw new Error(`Parsing failed: ${error.message}`);
    }
  }

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

  // Parse

  // COMPLETELY REPLACE the createParsingPrompt function in src/services/aiParser.js

  createParsingPrompt(emailContent, emailType, extractedTimes = []) {
    const timeParsingInstructions = `
  CRITICAL TIME PARSING RULES:
  - Convert ALL times to 24-hour format (HH:MM)
  - Examples: 4:00 PM → 16:00, 11:00 AM → 11:00, 2:00 PM → 14:00
  - Look for exact phrases: "pickup at", "check-in", "check-out", "departure", "arrival"
  - Pay close attention to AM/PM indicators
  - If time seems wrong, double-check the original email text
  - Common hotel times: check-in 15:00-16:00, check-out 10:00-11:00
  - Common car rental: pickup/return during business hours 08:00-18:00
  
  EXTRACTED TIMES FROM EMAIL:
  ${extractedTimes.map((t) => `"${t.time}" found in context: "${t.context}"`).join('\n')}
  `;

    // ===== SPECIAL HANDLING FOR FLIGHTS =====
    if (emailType === 'flight') {
      return `
You are an expert flight email parser. Extract ALL flight information from this confirmation email.
You MUST respond with valid JSON only. Do not include any explanatory text outside the JSON.

${timeParsingInstructions}

CRITICAL FLIGHT PARSING RULES:
1. For ROUND-TRIP flights: Create TWO separate flight objects in the flights array (outbound + return)
2. For ONE-WAY flights with connections: Create separate flight objects for each flight segment  
3. For DIRECT ONE-WAY flights: Create ONE flight object in the flights array
4. Each flight object must have DIFFERENT departure/arrival times
5. Never create identical flight objects with the same times
6. Look carefully for multiple flight numbers, departure times, arrival times
7. Extract dates in ISO format (YYYY-MM-DD HH:MM)

Return this EXACT JSON structure for flights:
{
  "type": "flight",
  "confirmation_number": "string or null",
  "passenger_name": "string or null", 
  "flights": [
    {
      "flight_number": "flight number like DL1234",
      "departure_airport": "3-letter airport code",
      "arrival_airport": "3-letter airport code",
      "departure_city": "full city name",
      "arrival_city": "full city name", 
      "departure_datetime": "YYYY-MM-DD HH:MM",
      "arrival_datetime": "YYYY-MM-DD HH:MM",
      "aircraft": "aircraft type",
      "seat": "seat number"
    }
  ],
  "price": {
    "amount": number or null,
    "currency": "string or null"
  }
}

IMPORTANT: If this is a round-trip flight, you MUST create TWO objects in the flights array:
- First object: outbound flight (e.g., ATL → AUS on June 13)
- Second object: return flight (e.g., AUS → ATL on June 16)

Each flight should have different departure_datetime and arrival_datetime values.

Parse this flight confirmation email:
${emailContent}`;
    }

    // ===== REGULAR HANDLING FOR OTHER TYPES =====
    const basePrompt = `
  You are an expert travel email parser. Extract ALL relevant information from this confirmation email.
  You MUST respond with valid JSON only. Do not include any explanatory text outside the JSON.
  
  ${timeParsingInstructions}
  
  IMPORTANT RULES:
  1. Extract dates in ISO format (YYYY-MM-DD HH:MM)
  2. Identify confirmation/booking numbers (remove spaces, clean format)
  3. Extract passenger names exactly as shown
  4. Parse prices and currency (numbers only for amount)
  5. Identify locations (cities, airports, addresses)
  6. If information is missing, use null
  7. Always respond with valid JSON only
  8. Do not include any explanatory text outside the JSON
  
  Return a JSON object with this exact structure:
  {
    "type": "flight|hotel|car_rental|train|cruise|restaurant|event",
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
  `;

    let specificPrompt = '';

    switch (emailType) {
      case 'hotel':
        specificPrompt = `
      For hotels, also extract in the details object:
      {
        "hotel_name": "hotel name",
        "hotel_address": "full address",
        "room_type": "room type",
        "number_of_guests": number,
        "check_in_time": "HH:MM (24-hour format)",
        "check_out_time": "HH:MM (24-hour format)",
        "cancellation_policy": "policy details",
        "amenities": ["wifi", "breakfast", etc],
        "loyalty_number": "loyalty program number"
      }
      IMPORTANT: check_in_time and check_out_time must be in 24-hour format!
      `;
        break;

      case 'car_rental':
        specificPrompt = `
      For car rentals, also extract in the details object:
      {
        "rental_company": "company name",
        "car_type": "car category/model",
        "pickup_location": "pickup address",
        "return_location": "return address",
        "pickup_time": "HH:MM (24-hour format)",
        "return_time": "HH:MM (24-hour format)",
        "driver_name": "primary driver",
        "fuel_policy": "fuel policy",
        "insurance": "insurance details"
      }
      IMPORTANT: pickup_time and return_time must be in 24-hour format!
      `;
        break;

      default:
        specificPrompt = `
      Extract any relevant details in the details object based on the email type.
      `;
    }

    return basePrompt + specificPrompt + `\n\nEmail content:\n${emailContent}`;
  }
}

module.exports = AIParser;
