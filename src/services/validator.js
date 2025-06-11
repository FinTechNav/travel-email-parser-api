// src/services/validator.js
const logger = require('../utils/logger');

class Validator {
  validate(parsedData) {
    try {
      const validated = { ...parsedData };
      
      // Validate and clean dates
      validated.travel_dates = this.validateDates(parsedData.travel_dates);
      
      // Validate confirmation number
      validated.confirmation_number = this.validateConfirmationNumber(parsedData.confirmation_number);
      
      // Validate locations
      validated.locations = this.validateLocations(parsedData.locations);
      
      // Validate price
      validated.price = this.validatePrice(parsedData.price);
      
      // Validate passenger name
      validated.passenger_name = this.validatePassengerName(parsedData.passenger_name);
      
      // Validate type
      validated.type = this.validateType(parsedData.type);
      
      logger.debug('Data validation completed');
      return validated;
    } catch (error) {
      logger.error('Validation failed:', error);
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  validateDates(dates) {
    if (!dates || typeof dates !== 'object') {
      return { departure: null, return: null };
    }

    const validatedDates = {};
    
    ['departure', 'return'].forEach(key => {
      if (dates[key]) {
        try {
          const date = new Date(dates[key]);
          if (isNaN(date.getTime())) {
            validatedDates[key] = null;
          } else {
            validatedDates[key] = date.toISOString().slice(0, 16); // YYYY-MM-DD HH:MM
          }
        } catch (error) {
          validatedDates[key] = null;
        }
      } else {
        validatedDates[key] = null;
      }
    });

    return validatedDates;
  }

  validateConfirmationNumber(confirmationNumber) {
    if (!confirmationNumber || typeof confirmationNumber !== 'string') {
      return null;
    }
    
    // Remove spaces and special characters, keep alphanumeric
    return confirmationNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || null;
  }

  validateLocations(locations) {
    if (!locations || typeof locations !== 'object') {
      return { origin: null, destination: null };
    }

    return {
      origin: this.validateLocation(locations.origin),
      destination: this.validateLocation(locations.destination)
    };
  }

  validateLocation(location) {
    if (!location || typeof location !== 'string') {
      return null;
    }
    
    // Clean and normalize location
    return location.trim().replace(/\s+/g, ' ') || null;
  }

  validatePrice(price) {
    if (!price || typeof price !== 'object') {
      return { amount: null, currency: null };
    }

    return {
      amount: this.validateAmount(price.amount),
      currency: this.validateCurrency(price.currency)
    };
  }

  validateAmount(amount) {
    if (amount === null || amount === undefined) {
      return null;
    }
    
    const numAmount = parseFloat(amount);
    return isNaN(numAmount) || numAmount < 0 ? null : numAmount;
  }

  validateCurrency(currency) {
    if (!currency || typeof currency !== 'string') {
      return null;
    }
    
    // Validate currency code (3 letters)
    const cleaned = currency.trim().toUpperCase();
    return /^[A-Z]{3}$/.test(cleaned) ? cleaned : null;
  }

  validatePassengerName(name) {
    if (!name || typeof name !== 'string') {
      return null;
    }
    
    // Clean name: remove extra spaces, capitalize properly
    return name.trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || null;
  }

  validateType(type) {
    if (!type || typeof type !== 'string') {
      return 'other';
    }
    
    const validTypes = ['flight', 'hotel', 'car_rental', 'train', 'cruise', 'restaurant', 'event', 'other'];
    const cleanType = type.toLowerCase().trim();
    
    return validTypes.includes(cleanType) ? cleanType : 'other';
  }

  // Comprehensive validation for full segment data
  validateSegment(segmentData) {
    const errors = [];
    
    // Required fields validation
    if (!segmentData.type) {
      errors.push('Type is required');
    }
    
    // Date logic validation
    if (segmentData.travel_dates?.departure && segmentData.travel_dates?.return) {
      const departure = new Date(segmentData.travel_dates.departure);
      const returnDate = new Date(segmentData.travel_dates.return);
      
      if (departure >= returnDate) {
        errors.push('Return date must be after departure date');
      }
    }
    
    // Business logic validation
    if (segmentData.type === 'flight' && !segmentData.details?.airline) {
      errors.push('Airline is required for flight bookings');
    }
    
    if (segmentData.type === 'hotel' && !segmentData.details?.hotel_name) {
      errors.push('Hotel name is required for hotel bookings');
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = Validator;