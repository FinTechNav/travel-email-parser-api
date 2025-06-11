// src/services/enhancer.js
const logger = require('../utils/logger');
const axios = require('axios');

class Enhancer {
  constructor() {
    this.weatherApiKey = process.env.WEATHER_API_KEY;
    this.timezoneApiKey = process.env.TIMEZONE_API_KEY;
    this.mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  async enhance(parsedData) {
    try {
      const enhancements = {};

      // Add airport codes for cities
      if (parsedData.locations) {
        enhancements.airportCodes = await this.getAirportCodes(parsedData.locations);
      }

      // Add timezone information
      if (parsedData.locations?.destination) {
        enhancements.timezone = await this.getTimezone(parsedData.locations.destination);
      }

      // Add weather forecast (if travel date is in the future)
      if (parsedData.travel_dates?.departure && parsedData.locations?.destination) {
        const departureDate = new Date(parsedData.travel_dates.departure);
        const now = new Date();
        
        if (departureDate > now && this.weatherApiKey) {
          enhancements.weather = await this.getWeatherForecast(
            parsedData.locations.destination,
            departureDate
          );
        }
      }

      // Add travel duration estimates
      if (parsedData.locations?.origin && parsedData.locations?.destination) {
        enhancements.travelInfo = await this.getTravelInfo(
          parsedData.locations.origin,
          parsedData.locations.destination,
          parsedData.type
        );
      }

      // Add confidence score
      enhancements.confidence = this.calculateConfidenceScore(parsedData);

      return {
        ...parsedData,
        enhancements
      };
    } catch (error) {
      logger.warn('Enhancement failed, returning original data:', error);
      return parsedData;
    }
  }

  async getAirportCodes(locations) {
    const codes = {};
    
    try {
      // Simple airport code mapping (you could expand this with a real API)
      const airportMappings = {
        'New York': 'JFK/LGA/EWR',
        'Los Angeles': 'LAX',
        'Chicago': 'ORD/MDW',
        'San Francisco': 'SFO',
        'Miami': 'MIA',
        'London': 'LHR/LGW/STN',
        'Paris': 'CDG/ORY',
        'Tokyo': 'NRT/HND',
        'Sydney': 'SYD'
      };

      if (locations.origin) {
        codes.origin = this.findAirportCode(locations.origin, airportMappings);
      }
      
      if (locations.destination) {
        codes.destination = this.findAirportCode(locations.destination, airportMappings);
      }

      return codes;
    } catch (error) {
      logger.error('Failed to get airport codes:', error);
      return {};
    }
  }

  findAirportCode(location, mappings) {
    const normalizedLocation = location.toLowerCase();
    
    for (const [city, code] of Object.entries(mappings)) {
      if (normalizedLocation.includes(city.toLowerCase())) {
        return code;
      }
    }
    
    return null;
  }

  async getTimezone(location) {
    try {
      if (!this.timezoneApiKey) {
        return null;
      }

      // This would use a real timezone API
      // For now, return a simple mapping
      const timezoneMap = {
        'New York': 'America/New_York',
        'Los Angeles': 'America/Los_Angeles',
        'Chicago': 'America/Chicago',
        'London': 'Europe/London',
        'Paris': 'Europe/Paris',
        'Tokyo': 'Asia/Tokyo',
        'Sydney': 'Australia/Sydney'
      };

      const normalizedLocation = location.toLowerCase();
      
      for (const [city, timezone] of Object.entries(timezoneMap)) {
        if (normalizedLocation.includes(city.toLowerCase())) {
          return timezone;
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to get timezone:', error);
      return null;
    }
  }

  async getWeatherForecast(destination, date) {
    try {
      if (!this.weatherApiKey) {
        return null;
      }

      // Using OpenWeatherMap API as example
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast`,
        {
          params: {
            q: destination,
            appid: this.weatherApiKey,
            units: 'metric'
          },
          timeout: 5000
        }
      );

      // Find forecast closest to travel date
      const targetDate = new Date(date);
      const forecasts = response.data.list;
      
      const closestForecast = forecasts.reduce((prev, curr) => {
        const prevDiff = Math.abs(new Date(prev.dt * 1000) - targetDate);
        const currDiff = Math.abs(new Date(curr.dt * 1000) - targetDate);
        return currDiff < prevDiff ? curr : prev;
      });

      return {
        temperature: Math.round(closestForecast.main.temp),
        description: closestForecast.weather[0].description,
        humidity: closestForecast.main.humidity,
        windSpeed: closestForecast.wind.speed,
        date: new Date(closestForecast.dt * 1000).toISOString()
      };
    } catch (error) {
      logger.error('Failed to get weather forecast:', error);
      return null;
    }
  }

  async getTravelInfo(origin, destination, type) {
    try {
      const info = {};

      // Estimate travel time based on type
      switch (type) {
        case 'flight':
          info.estimatedDuration = 'Varies by route';
          info.tips = ['Arrive 2 hours early for domestic, 3 hours for international'];
          break;
        case 'train':
          info.estimatedDuration = 'Varies by route';
          info.tips = ['Arrive 30 minutes before departure'];
          break;
        case 'car_rental':
          info.tips = ['Check fuel policy', 'Inspect vehicle before leaving'];
          break;
        case 'hotel':
          info.tips = ['Check-in usually after 3 PM', 'Check-out usually before 11 AM'];
          break;
      }

      return info;
    } catch (error) {
      logger.error('Failed to get travel info:', error);
      return {};
    }
  }

  calculateConfidenceScore(parsedData) {
    let score = 0;
    let maxScore = 0;

    // Check for presence of key fields
    const fields = [
      'type',
      'confirmation_number',
      'passenger_name',
      'travel_dates.departure',
      'locations.origin',
      'locations.destination'
    ];

    fields.forEach(field => {
      maxScore += 1;
      const value = this.getNestedValue(parsedData, field);
      if (value !== null && value !== undefined && value !== '') {
        score += 1;
      }
    });

    // Bonus points for detailed information
    if (parsedData.details && Object.keys(parsedData.details).length > 2) {
      score += 0.5;
      maxScore += 0.5;
    }

    if (parsedData.price?.amount) {
      score += 0.5;
      maxScore += 0.5;
    }

    return Math.round((score / maxScore) * 100) / 100;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }
}

module.exports = Enhancer;