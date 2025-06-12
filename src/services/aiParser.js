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

  createParsingPrompt(emailContent, emailType) {
    const basePrompt = `
    You are an expert travel email parser. Extract ALL relevant information from this confirmation email.
    You MUST respond with valid JSON only. Do not include any explanatory text outside the JSON.
    
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
      case 'flight':
        specificPrompt = `
        For flights, also extract in the details object:
        {
          "airline": "airline name",
          "flight_number": "flight number",
          "aircraft": "aircraft type",
          "seat": "seat number",
          "gate": "gate number",
          "terminal": "terminal",
          "baggage_allowance": "baggage info",
          "frequent_flyer_number": "FF number",
          "class": "economy/business/first"
        }
        `;
        break;

      case 'hotel':
        specificPrompt = `
        For hotels, also extract in the details object:
        {
          "hotel_name": "hotel name",
          "hotel_address": "full address",
          "room_type": "room type",
          "number_of_guests": number,
          "check_in_time": "HH:MM",
          "check_out_time": "HH:MM",
          "cancellation_policy": "policy details",
          "amenities": ["wifi", "breakfast", etc],
          "loyalty_number": "loyalty program number"
        }
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
          "pickup_time": "HH:MM",
          "return_time": "HH:MM",
          "driver_name": "primary driver",
          "fuel_policy": "fuel policy",
          "insurance": "insurance details"
        }
        `;
        break;

      default:
        specificPrompt = `
        Extract any relevant details in the details object based on the email type.
        `;
        break;
    }

    return `${basePrompt}\n${specificPrompt}\n\nEmail content to parse:\n${emailContent}`;
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
