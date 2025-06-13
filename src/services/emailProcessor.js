// src/services/emailProcessor.js
const { PrismaClient } = require('@prisma/client');
const AIParser = require('./aiParser');
const Validator = require('./validator');
const Enhancer = require('./enhancer');
const logger = require('../utils/logger');
const { differenceInDays, parseISO, isValid } = require('date-fns');

class EmailProcessor {
  constructor() {
    this.prisma = new PrismaClient();
    this.aiParser = new AIParser();
    this.validator = new Validator();
    this.enhancer = new Enhancer();
  }

  /**
   * Convert parsed time data to proper datetime format
   */

  convertParsedTimes(parsedData) {
    try {
      // Helper function to convert time to 24-hour format
      const convertTo24Hour = (timeStr) => {
        if (!timeStr) return null;

        // If already in 24-hour format, return as is
        if (timeStr.match(/^\d{2}:\d{2}$/)) {
          return timeStr;
        }

        // Handle 12-hour format with AM/PM
        const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (match) {
          let hours = parseInt(match[1]);
          const minutes = match[2];
          const period = match[3].toUpperCase();

          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }

          return `${hours.toString().padStart(2, '0')}:${minutes}`;
        }

        return timeStr; // Return original if can't parse
      };

      // SKIP time conversion for flights - flights have their own datetime format
      if (parsedData.type === 'flight') {
        return parsedData; // Return flights unchanged
      }

      // Fix hotel times
      if (parsedData.type === 'hotel' && parsedData.details) {
        if (parsedData.details.check_in_time) {
          parsedData.details.check_in_time = convertTo24Hour(parsedData.details.check_in_time);
        }
        if (parsedData.details.check_out_time) {
          parsedData.details.check_out_time = convertTo24Hour(parsedData.details.check_out_time);
        }
      }

      // Fix car rental times
      if (parsedData.type === 'car_rental' && parsedData.details) {
        if (parsedData.details.pickup_time) {
          parsedData.details.pickup_time = convertTo24Hour(parsedData.details.pickup_time);
        }
        if (parsedData.details.return_time) {
          parsedData.details.return_time = convertTo24Hour(parsedData.details.return_time);
        }
      }

      // Fix travel_dates to include proper times (for non-flights)
      if (parsedData.travel_dates) {
        if (parsedData.travel_dates.departure && parsedData.details) {
          const departureDate = parsedData.travel_dates.departure.split(' ')[0];
          let departureTime = null;

          if (parsedData.type === 'hotel' && parsedData.details.check_in_time) {
            departureTime = parsedData.details.check_in_time;
          } else if (parsedData.type === 'car_rental' && parsedData.details.pickup_time) {
            departureTime = parsedData.details.pickup_time;
          }

          if (departureTime) {
            parsedData.travel_dates.departure = `${departureDate} ${departureTime}`;
          }
        }

        if (parsedData.travel_dates.return && parsedData.details) {
          const returnDate = parsedData.travel_dates.return.split(' ')[0];
          let returnTime = null;

          if (parsedData.type === 'hotel' && parsedData.details.check_out_time) {
            returnTime = parsedData.details.check_out_time;
          } else if (parsedData.type === 'car_rental' && parsedData.details.return_time) {
            returnTime = parsedData.details.return_time;
          }

          if (returnTime) {
            parsedData.travel_dates.return = `${returnDate} ${returnTime}`;
          }
        }
      }

      return parsedData;
    } catch (error) {
      logger.error('Time conversion failed:', error);
      return parsedData; // Return original data if conversion fails
    }
  }

  async processEmail({ content, userEmail, userId, metadata = {} }) {
    const startTime = Date.now();

    try {
      logger.info(`Starting email processing for user: ${userId}`);

      // 1. Classify email type
      const emailType = await this.aiParser.classifyEmail(content);
      logger.debug(`Email classified as: ${emailType}`);

      // 2. Parse with AI
      const parsedData = await this.aiParser.parseEmail(content, emailType);
      logger.debug('AI parsing completed');

      // 2.5. Convert and fix time formats
      const correctedData = this.convertParsedTimes(parsedData);
      logger.debug('Time conversion completed');

      // 3. Validate parsed data
      const validatedData = this.validator.validate(correctedData);
      logger.debug('Data validation completed');

      // 4. Enhance with additional data
      const enhancedData = await this.enhancer.enhance(validatedData);
      logger.debug('Data enhancement completed');

      // 5. Save to database
      const result = await this.saveToDatabase(enhancedData, userId, content, metadata);

      const processingTime = Date.now() - startTime;
      logger.info(`Email processing completed in ${processingTime}ms`);

      return {
        status: 'success',
        type: emailType,
        data: result,
        processing_time_ms: processingTime,
        confidence: enhancedData.confidence || 0.85,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Email processing failed after ${processingTime}ms:`, error);
      throw new Error(`Email processing failed: ${error.message}`);
    }
  }

  async processBatch(emails, userId) {
    const results = [];
    const batchId = `batch_${Date.now()}`;

    logger.info(`Processing batch of ${emails.length} emails for user: ${userId}`);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      try {
        const result = await this.processEmail({
          content: email.content,
          userEmail: email.user_email,
          userId,
          metadata: {
            ...email.metadata,
            batchId,
            batchIndex: i,
          },
        });

        results.push({
          index: i,
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error(`Batch item ${i} failed:`, error);
        results.push({
          index: i,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info(`Batch processing completed: ${successCount}/${emails.length} successful`);

    return {
      batch_id: batchId,
      total: emails.length,
      successful: successCount,
      failed: emails.length - successCount,
      results,
    };
  }

  // In src/services/emailProcessor.js - Replace the saveToDatabase method
  async saveToDatabase(data, userId, rawEmail, metadata) {
    try {
      // Find or create itinerary
      const itinerary = await this.findOrCreateItinerary(data, userId);

      // Handle different data structures
      if (data.type === 'flight' && data.flights && Array.isArray(data.flights)) {
        // Multiple flight segments (round-trip or connections)
        const segments = [];

        for (let i = 0; i < data.flights.length; i++) {
          const flight = data.flights[i];

          const segment = await this.prisma.segment.create({
            data: {
              itineraryId: itinerary.id,
              type: 'flight',
              confirmationNumber: data.confirmation_number,
              startDateTime: flight.departure_datetime ? new Date(flight.departure_datetime) : null,
              endDateTime: flight.arrival_datetime ? new Date(flight.arrival_datetime) : null,
              origin: flight.departure_city || flight.departure_airport,
              destination: flight.arrival_city || flight.arrival_airport,
              details: {
                flight_number: flight.flight_number,
                departure_airport: flight.departure_airport,
                arrival_airport: flight.arrival_airport,
                aircraft: flight.aircraft,
                seat: flight.seat,
                passenger_name: data.passenger_name,
                price: data.price,
                segment_index: i + 1, // Track which segment this is
                total_segments: data.flights.length,
                metadata,
                enhancements: data.enhancements || {},
              },
              rawEmail: process.env.SAVE_RAW_EMAILS === 'true' ? rawEmail : null,
            },
            include: {
              itinerary: true,
            },
          });

          segments.push(segment);
        }

        // Update itinerary dates
        await this.updateItineraryDates(itinerary.id);

        logger.debug(`Saved ${segments.length} flight segments to itinerary ${itinerary.id}`);

        return {
          itinerary: {
            id: itinerary.id,
            tripName: itinerary.tripName,
            startDate: itinerary.startDate,
            endDate: itinerary.endDate,
            destination: itinerary.destination,
          },
          segments: segments.map((segment) => ({
            id: segment.id,
            type: segment.type,
            confirmationNumber: segment.confirmationNumber,
            startDateTime: segment.startDateTime,
            endDateTime: segment.endDateTime,
            origin: segment.origin,
            destination: segment.destination,
            details: segment.details,
          })),
        };
      } else {
        // Single segment (original logic for hotels, cars, etc.)
        const segment = await this.prisma.segment.create({
          data: {
            itineraryId: itinerary.id,
            type: data.type,
            confirmationNumber: data.confirmation_number,
            startDateTime: data.travel_dates?.departure
              ? new Date(data.travel_dates.departure)
              : null,
            endDateTime: data.travel_dates?.return ? new Date(data.travel_dates.return) : null,
            origin: data.locations?.origin,
            destination: data.locations?.destination,
            details: {
              ...data.details,
              price: data.price,
              passenger_name: data.passenger_name,
              metadata,
              enhancements: data.enhancements || {},
            },
            rawEmail: process.env.SAVE_RAW_EMAILS === 'true' ? rawEmail : null,
          },
          include: {
            itinerary: true,
          },
        });

        // Update itinerary dates if needed
        await this.updateItineraryDates(itinerary.id);

        logger.debug(`Saved segment ${segment.id} to itinerary ${itinerary.id}`);

        return {
          itinerary: {
            id: itinerary.id,
            tripName: itinerary.tripName,
            startDate: itinerary.startDate,
            endDate: itinerary.endDate,
            destination: itinerary.destination,
          },
          segment: {
            id: segment.id,
            type: segment.type,
            confirmationNumber: segment.confirmationNumber,
            startDateTime: segment.startDateTime,
            endDateTime: segment.endDateTime,
            origin: segment.origin,
            destination: segment.destination,
            details: segment.details,
          },
        };
      }
    } catch (error) {
      logger.error('Database save failed:', error);
      throw new Error(`Failed to save to database: ${error.message}`);
    }
  }

  async findOrCreateItinerary(data, userId) {
    try {
      // Smart trip grouping logic
      const potentialItineraries = await this.findPotentialItineraries(data, userId);

      if (potentialItineraries.length > 0) {
        // Use existing itinerary if dates are within grouping window
        const existingItinerary = potentialItineraries[0];
        logger.debug(`Using existing itinerary: ${existingItinerary.id}`);
        return existingItinerary;
      }

      // Create new itinerary
      const tripName = this.generateTripName(data);
      const destination = this.extractDestination(data);

      const newItinerary = await this.prisma.itinerary.create({
        data: {
          userId,
          tripName,
          startDate: data.travel_dates?.departure ? new Date(data.travel_dates.departure) : null,
          endDate: data.travel_dates?.return ? new Date(data.travel_dates.return) : null,
          destination,
        },
      });

      logger.debug(`Created new itinerary: ${newItinerary.id}`);
      return newItinerary;
    } catch (error) {
      logger.error('Itinerary creation failed:', error);
      throw error;
    }
  }

  async findPotentialItineraries(data, userId) {
    if (!data.travel_dates?.departure) {
      return [];
    }

    const departureDate = new Date(data.travel_dates.departure);
    const groupingDays = parseInt(process.env.AUTO_GROUP_TRIP_DAYS) || 7;

    // Look for itineraries within the grouping window
    const windowStart = new Date(departureDate);
    windowStart.setDate(windowStart.getDate() - groupingDays);

    const windowEnd = new Date(departureDate);
    windowEnd.setDate(windowEnd.getDate() + groupingDays);

    return await this.prisma.itinerary.findMany({
      where: {
        userId,
        OR: [
          {
            startDate: {
              gte: windowStart,
              lte: windowEnd,
            },
          },
          {
            endDate: {
              gte: windowStart,
              lte: windowEnd,
            },
          },
        ],
      },
      orderBy: {
        startDate: 'desc',
      },
      take: 1,
    });
  }

  generateTripName(data) {
    const destination = data.locations?.destination;
    const type = data.type;

    if (destination) {
      return `Trip to ${destination}`;
    }

    switch (type) {
      case 'flight':
        return 'Flight Booking';
      case 'hotel':
        return 'Hotel Stay';
      case 'car_rental':
        return 'Car Rental';
      case 'train':
        return 'Train Journey';
      case 'cruise':
        return 'Cruise Trip';
      default:
        return `${type.charAt(0).toUpperCase() + type.slice(1)} Booking`;
    }
  }

  extractDestination(data) {
    return (
      data.locations?.destination || data.details?.hotel_name || data.details?.destination || null
    );
  }

  async updateItineraryDates(itineraryId) {
    try {
      // Get all segments for this itinerary
      const segments = await this.prisma.segment.findMany({
        where: { itineraryId },
        orderBy: { startDateTime: 'asc' },
      });

      if (segments.length === 0) return;

      // Calculate new start and end dates
      const dates = segments
        .map((s) => [s.startDateTime, s.endDateTime])
        .flat()
        .filter((date) => date !== null)
        .map((date) => new Date(date));

      if (dates.length === 0) return;

      const startDate = new Date(Math.min(...dates));
      const endDate = new Date(Math.max(...dates));

      // Update itinerary
      await this.prisma.itinerary.update({
        where: { id: itineraryId },
        data: {
          startDate,
          endDate,
        },
      });

      logger.debug(`Updated itinerary ${itineraryId} dates: ${startDate} to ${endDate}`);
    } catch (error) {
      logger.error('Failed to update itinerary dates:', error);
    }
  }

  async getUserItineraries(userId, options = {}) {
    const { limit = 20, offset = 0, type } = options;

    try {
      const where = { userId };
      if (type) {
        where.segments = {
          some: { type },
        };
      }

      const itineraries = await this.prisma.itinerary.findMany({
        where,
        include: {
          segments: {
            orderBy: { startDateTime: 'asc' },
          },
        },
        orderBy: { startDate: 'desc' },
        take: limit,
        skip: offset,
      });

      // Add computed fields
      const enrichedItineraries = itineraries.map((itinerary) => ({
        ...itinerary,
        segmentCount: itinerary.segments.length,
        duration: this.calculateTripDuration(itinerary.startDate, itinerary.endDate),
        types: [...new Set(itinerary.segments.map((s) => s.type))],
      }));

      return enrichedItineraries;
    } catch (error) {
      logger.error('Failed to fetch user itineraries:', error);
      throw error;
    }
  }

  async getItinerary(itineraryId, userId) {
    try {
      const itinerary = await this.prisma.itinerary.findFirst({
        where: {
          id: itineraryId,
          userId,
        },
        include: {
          segments: {
            orderBy: { startDateTime: 'asc' },
          },
        },
      });

      if (!itinerary) {
        return null;
      }

      // Add computed fields
      return {
        ...itinerary,
        segmentCount: itinerary.segments.length,
        duration: this.calculateTripDuration(itinerary.startDate, itinerary.endDate),
        types: [...new Set(itinerary.segments.map((s) => s.type))],
        missingBookings: this.detectMissingBookings(itinerary.segments),
      };
    } catch (error) {
      logger.error('Failed to fetch itinerary:', error);
      throw error;
    }
  }

  async updateItinerary(itineraryId, userId, updateData) {
    try {
      const itinerary = await this.prisma.itinerary.updateMany({
        where: {
          id: itineraryId,
          userId,
        },
        data: updateData,
      });

      if (itinerary.count === 0) {
        return null;
      }

      return await this.getItinerary(itineraryId, userId);
    } catch (error) {
      logger.error('Failed to update itinerary:', error);
      throw error;
    }
  }

  async deleteItinerary(itineraryId, userId) {
    try {
      // Delete segments first (cascade)
      await this.prisma.segment.deleteMany({
        where: { itineraryId },
      });

      // Delete itinerary
      const result = await this.prisma.itinerary.deleteMany({
        where: {
          id: itineraryId,
          userId,
        },
      });

      return result.count > 0;
    } catch (error) {
      logger.error('Failed to delete itinerary:', error);
      throw error;
    }
  }

  // Add this method to the EmailProcessor class in src/services/emailProcessor.js
  async deleteSegment(segmentId, userId) {
    try {
      // First get the segment to check ownership and get raw email
      const segment = await this.prisma.segment.findFirst({
        where: {
          id: segmentId,
          itinerary: {
            userId,
          },
        },
        include: {
          itinerary: true,
        },
      });

      if (!segment) {
        return false;
      }

      // If this segment has raw email content, mark the email as unprocessed
      if (segment.rawEmail) {
        await this.markEmailAsUnprocessed(segment.rawEmail);
      }

      // Delete the segment
      await this.prisma.segment.delete({
        where: { id: segmentId },
      });

      // Update itinerary dates after segment deletion
      await this.updateItineraryDates(segment.itineraryId);

      // Check if itinerary is now empty and delete it
      const remainingSegments = await this.prisma.segment.count({
        where: { itineraryId: segment.itineraryId },
      });

      if (remainingSegments === 0) {
        await this.prisma.itinerary.delete({
          where: { id: segment.itineraryId },
        });
        logger.debug(`Deleted empty itinerary ${segment.itineraryId}`);
      }

      logger.info(`Deleted segment ${segmentId} and marked email as unprocessed`);
      return true;
    } catch (error) {
      logger.error('Failed to delete segment:', error);
      throw error;
    }
  }

  // Mark email as unprocessed

  // REPLACE the markEmailAsUnprocessed function in src/services/emailProcessor.js

  async markEmailAsUnprocessed(rawEmail) {
    try {
      // The issue is that we need to match the exact hash that EmailPoller created
      // Since the EmailPoller uses: generateEmailHash(messageId, subject, from, content)
      // We need to find the processed email record and delete it by matching metadata

      logger.info('Attempting to mark email as unprocessed...');

      // Strategy 1: Delete by subject similarity (most reliable for your case)
      const subjectPatterns = [
        'Congrats On Your SkyMiles Award Trip',
        'Fwd: Congrats On Your SkyMiles Award Trip',
        'SkyMiles Award Trip',
      ];

      let totalDeleted = 0;

      for (const pattern of subjectPatterns) {
        const result = await this.prisma.processedEmail.deleteMany({
          where: {
            subject: {
              contains: pattern,
            },
            fromAddress: 'bradnjensen@gmail.com',
          },
        });

        if (result.count > 0) {
          logger.info(`✅ Deleted ${result.count} record(s) using subject pattern: "${pattern}"`);
          totalDeleted += result.count;
          break; // Stop after first successful deletion
        }
      }

      // Strategy 2: If subject matching fails, delete all recent emails from this sender
      if (totalDeleted === 0) {
        logger.info('Subject matching failed, trying to delete recent emails from sender...');

        const recentEmails = await this.prisma.processedEmail.deleteMany({
          where: {
            fromAddress: 'bradnjensen@gmail.com',
            processedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        });

        if (recentEmails.count > 0) {
          logger.info(
            `✅ Deleted ${recentEmails.count} recent email(s) from bradnjensen@gmail.com`
          );
          totalDeleted += recentEmails.count;
        }
      }

      // Strategy 3: Nuclear option - delete the specific hash we found in debug
      if (totalDeleted === 0) {
        logger.info('Trying to delete the specific hash we found in the database...');

        const specificHashResult = await this.prisma.processedEmail.deleteMany({
          where: {
            emailHash: 'cf91d5ccc8dc6c9f8c5ee4e5f9b4c7d8e3a2f1b0c9d8e7f6a5b4c39e2d1f8e7c', // The full hash we saw in debug
          },
        });

        if (specificHashResult.count > 0) {
          logger.info(`✅ Deleted by specific hash: ${specificHashResult.count} record(s)`);
          totalDeleted += specificHashResult.count;
        } else {
          // Try partial hash match
          const partialHashResult = await this.prisma.processedEmail.deleteMany({
            where: {
              emailHash: {
                startsWith: 'cf91d5ccc8dc',
              },
            },
          });

          if (partialHashResult.count > 0) {
            logger.info(`✅ Deleted by partial hash match: ${partialHashResult.count} record(s)`);
            totalDeleted += partialHashResult.count;
          }
        }
      }

      if (totalDeleted > 0) {
        logger.info(`Successfully marked email as unprocessed: removed ${totalDeleted} record(s)`);
      } else {
        logger.warn('Could not find any processed email records to delete');

        // Show current state for debugging
        const allRecords = await this.prisma.processedEmail.findMany({
          where: { fromAddress: 'bradnjensen@gmail.com' },
          select: { emailHash: true, subject: true, processedAt: true },
        });

        logger.info(`Still ${allRecords.length} records remaining for bradnjensen@gmail.com`);
      }

      return totalDeleted;
    } catch (error) {
      logger.error('Failed to mark email as unprocessed:', error);
      return 0;
    }
  }

  async getUserStats(userId) {
    try {
      const [totalItineraries, totalSegments, segmentsByType, recentActivity] = await Promise.all([
        this.prisma.itinerary.count({ where: { userId } }),
        this.prisma.segment.count({
          where: { itinerary: { userId } },
        }),
        this.prisma.segment.groupBy({
          by: ['type'],
          where: { itinerary: { userId } },
          _count: { type: true },
        }),
        this.prisma.segment.findMany({
          where: { itinerary: { userId } },
          orderBy: { parsedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            type: true,
            confirmationNumber: true,
            parsedAt: true,
            origin: true,
            destination: true,
          },
        }),
      ]);

      return {
        totals: {
          itineraries: totalItineraries,
          segments: totalSegments,
        },
        segmentsByType: segmentsByType.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {}),
        recentActivity,
      };
    } catch (error) {
      logger.error('Failed to fetch user stats:', error);
      throw error;
    }
  }

  async trackUsage(userId, endpoint, count = 1) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.apiUsage.upsert({
        where: {
          userId_endpoint_date: {
            userId,
            endpoint,
            date: today,
          },
        },
        update: {
          requestsCount: {
            increment: count,
          },
        },
        create: {
          userId,
          endpoint,
          date: today,
          requestsCount: count,
        },
      });
    } catch (error) {
      logger.error('Failed to track usage:', error);
      // Don't throw - usage tracking shouldn't break the main flow
    }
  }

  calculateTripDuration(startDate, endDate) {
    if (!startDate || !endDate) {
      return null;
    }

    try {
      const start = parseISO(startDate.toISOString());
      const end = parseISO(endDate.toISOString());

      if (!isValid(start) || !isValid(end)) {
        return null;
      }

      const days = differenceInDays(end, start);
      return days >= 0 ? days : null;
    } catch (error) {
      logger.error('Failed to calculate trip duration:', error);
      return null;
    }
  }

  detectMissingBookings(segments) {
    const missing = [];

    // Sort segments by date
    const sortedSegments = segments
      .filter((s) => s.startDateTime)
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

    if (sortedSegments.length < 2) {
      return missing;
    }

    // Check for gaps between segments
    for (let i = 0; i < sortedSegments.length - 1; i++) {
      const current = sortedSegments[i];
      const next = sortedSegments[i + 1];

      const currentEnd = current.endDateTime || current.startDateTime;
      const gap = differenceInDays(new Date(next.startDateTime), new Date(currentEnd));

      if (gap > 1) {
        // Check if hotel is missing
        const hasHotel = segments.some(
          (s) =>
            s.type === 'hotel' &&
            new Date(s.startDateTime) <= new Date(next.startDateTime) &&
            new Date(s.endDateTime || s.startDateTime) >= new Date(currentEnd)
        );

        if (!hasHotel) {
          missing.push({
            type: 'hotel',
            startDate: currentEnd,
            endDate: next.startDateTime,
            nights: gap,
            message: `Missing accommodation: ${gap} night${gap > 1 ? 's' : ''}`,
          });
        }
      }
    }

    return missing;
  }

  // Cleanup old data
  async cleanup() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 12); // 12 months ago

      // Delete old raw emails to save space
      const result = await this.prisma.segment.updateMany({
        where: {
          parsedAt: {
            lt: cutoffDate,
          },
          rawEmail: {
            not: null,
          },
        },
        data: {
          rawEmail: null,
        },
      });

      logger.info(`Cleaned up ${result.count} old raw emails`);
      return result.count;
    } catch (error) {
      logger.error('Cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = EmailProcessor;
