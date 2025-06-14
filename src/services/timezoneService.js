// src/services/timezoneService.js
// Backend timezone service with database caching that integrates with your existing EmailProcessor

const logger = require('../utils/logger');

class TimezoneService {
  constructor(prisma) {
    this.prisma = prisma;
    this.memoryCache = new Map(); // Short-term memory cache
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  async getTimezone(location) {
    if (!location) return null;

    const normalizedLocation = location.toLowerCase().trim();
    
    // 1. Check memory cache first (fastest)
    const memoryCached = this.memoryCache.get(normalizedLocation);
    if (memoryCached && Date.now() - memoryCached.timestamp < 60 * 60 * 1000) { // 1 hour
      return memoryCached.timezone;
    }

    // 2. Check database cache
    try {
      const dbCached = await this.prisma.timezoneCache.findFirst({
        where: {
          location: normalizedLocation,
          updatedAt: {
            gte: new Date(Date.now() - this.cacheExpiry)
          }
        }
      });

      if (dbCached) {
        // Update memory cache
        this.memoryCache.set(normalizedLocation, {
          timezone: dbCached.timezone,
          timestamp: Date.now()
        });
        return dbCached.timezone;
      }
    } catch (error) {
      logger.warn('Database timezone cache lookup failed:', error);
    }

    // 3. Check hardcoded fallbacks for critical locations
    const hardcodedTimezone = this.getHardcodedTimezone(normalizedLocation);
    if (hardcodedTimezone) {
      await this.cacheTimezone(normalizedLocation, hardcodedTimezone);
      return hardcodedTimezone;
    }

    // 4. Fetch from API
    const apiTimezone = await this.fetchFromAPI(normalizedLocation);
    if (apiTimezone) {
      await this.cacheTimezone(normalizedLocation, apiTimezone);
      return apiTimezone;
    }

    // 5. Final fallback
    const fallbackTimezone = 'America/New_York';
    logger.warn(`No timezone found for ${location}, using fallback: ${fallbackTimezone}`);
    return fallbackTimezone;
  }

  getHardcodedTimezone(location) {
    // Your existing timezone mapping - keeping it as fallback
    const hardcodedTimezones = {
      // PS Private Terminal Facilities (CRITICAL: Use facility timezone, not destination)
      'ps atl': 'America/New_York',     // PS Atlanta → Eastern Time
      'ps lax': 'America/Los_Angeles',  // PS Los Angeles → Pacific Time
      'ps jfk': 'America/New_York',     // PS JFK → Eastern Time
      'ps ord': 'America/Chicago',      // PS Chicago → Central Time

      // US Cities and Airports
      'atlanta': 'America/New_York',
      'atl': 'America/New_York',
      'austin': 'America/Chicago',
      'aus': 'America/Chicago',
      'new york': 'America/New_York',
      'nyc': 'America/New_York',
      'los angeles': 'America/Los_Angeles',
      'lax': 'America/Los_Angeles',
      'chicago': 'America/Chicago',
      'ord': 'America/Chicago',
      'denver': 'America/Denver',
      'den': 'America/Denver',
      'phoenix': 'America/Phoenix',
      'phx': 'America/Phoenix',
      'miami': 'America/New_York',
      'mia': 'America/New_York',
      'seattle': 'America/Los_Angeles',
      'sea': 'America/Los_Angeles',

      // European cities/airports - ADDING THESE FOR MADRID FIX
      'madrid': 'Europe/Madrid',
      'mad': 'Europe/Madrid',
      'madrid, spain': 'Europe/Madrid',
      'spain': 'Europe/Madrid',
      'barcelona': 'Europe/Madrid',
      'bcn': 'Europe/Madrid',
      
      'london': 'Europe/London',
      'lhr': 'Europe/London',
      'lgw': 'Europe/London',
      'gatwick': 'Europe/London',
      'heathrow': 'Europe/London',
      
      'paris': 'Europe/Paris',
      'cdg': 'Europe/Paris',
      'orly': 'Europe/Paris',
      
      'amsterdam': 'Europe/Amsterdam',
      'ams': 'Europe/Amsterdam',
      
      'frankfurt': 'Europe/Berlin',
      'fra': 'Europe/Berlin',
      
      'rome': 'Europe/Rome',
      'fco': 'Europe/Rome',
      
      'lisbon': 'Europe/Lisbon',
      'lis': 'Europe/Lisbon',

      'zurich': 'Europe/Zurich',
      'zur': 'Europe/Zurich',
      
      'vienna': 'Europe/Vienna',
      'vie': 'Europe/Vienna'
    };

    // Direct match
    if (hardcodedTimezones[location]) {
      return hardcodedTimezones[location];
    }

    // Partial match
    for (const [key, timezone] of Object.entries(hardcodedTimezones)) {
      if (location.includes(key)) {
        return timezone;
      }
    }

    return null;
  }

  async fetchFromAPI(location) {
    try {
      // Try WorldTimeAPI first (free, no registration)
      let timezone = await this.tryWorldTimeAPI(location);
      if (timezone) return timezone;

      // Try TimeAPI.io as backup  
      timezone = await this.tryTimeAPIio(location);
      if (timezone) return timezone;

      return null;
    } catch (error) {
      logger.warn(`API timezone lookup failed for ${location}:`, error);
      return null;
    }
  }

  async tryWorldTimeAPI(location) {
    try {
      const timezoneGuess = this.guessTimezoneFromLocation(location);
      if (!timezoneGuess) return null;

      const response = await fetch(`http://worldtimeapi.org/api/timezone/${timezoneGuess}`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.timezone;
      }
      return null;
    } catch (error) {
      logger.debug('WorldTimeAPI failed:', error);
      return null;
    }
  }

  async tryTimeAPIio(location) {
    try {
      const response = await fetch(
        `https://timeapi.io/api/TimeZone/zone?timeZone=${encodeURIComponent(location)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.timeZone;
      }
      return null;
    } catch (error) {
      logger.debug('TimeAPI.io failed:', error);
      return null;
    }
  }

  guessTimezoneFromLocation(location) {
    const cityToTimezone = {
      'madrid': 'Europe/Madrid',
      'barcelona': 'Europe/Madrid', 
      'london': 'Europe/London',
      'paris': 'Europe/Paris',
      'amsterdam': 'Europe/Amsterdam',
      'berlin': 'Europe/Berlin',
      'rome': 'Europe/Rome',
      'lisbon': 'Europe/Lisbon',
      'zurich': 'Europe/Zurich',
      'vienna': 'Europe/Vienna',
      'stockholm': 'Europe/Stockholm',
      'oslo': 'Europe/Oslo',
      'copenhagen': 'Europe/Copenhagen'
    };

    for (const [city, timezone] of Object.entries(cityToTimezone)) {
      if (location.includes(city)) {
        return timezone;
      }
    }
    return null;
  }

  async cacheTimezone(location, timezone) {
    try {
      // Update memory cache
      this.memoryCache.set(location, {
        timezone,
        timestamp: Date.now()
      });

      // Update database cache
      await this.prisma.timezoneCache.upsert({
        where: { location },
        update: { 
          timezone,
          updatedAt: new Date()
        },
        create: {
          location,
          timezone,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.warn('Failed to cache timezone:', error);
    }
  }
}

module.exports = TimezoneService;