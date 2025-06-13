// scripts/seedEmailRules.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedEmailRules() {
  console.log('Seeding email processing rules...');

  // 1. Classification Rules (extracted from your current code)
  const classificationRules = [
    // Hotel rules
    {
      name: 'hotel_keyword_hotel',
      emailType: 'hotel',
      ruleType: 'keyword',
      pattern: 'hotel',
      priority: 10,
    },
    {
      name: 'hotel_keyword_reservation',
      emailType: 'hotel',
      ruleType: 'keyword',
      pattern: 'reservation',
      priority: 9,
    },
    {
      name: 'hotel_keyword_checkin',
      emailType: 'hotel',
      ruleType: 'keyword',
      pattern: 'check-in',
      priority: 8,
    },
    {
      name: 'hotel_keyword_thompson',
      emailType: 'hotel',
      ruleType: 'keyword',
      pattern: 'thompson',
      priority: 15, // Higher priority for specific hotel
    },
    {
      name: 'hotel_keyword_stay_at',
      emailType: 'hotel',
      ruleType: 'keyword',
      pattern: 'stay at',
      priority: 7,
    },

    // Flight rules
    {
      name: 'flight_keyword_flight',
      emailType: 'flight',
      ruleType: 'keyword',
      pattern: 'flight',
      priority: 10,
    },
    {
      name: 'flight_keyword_delta',
      emailType: 'flight',
      ruleType: 'keyword',
      pattern: 'delta',
      priority: 12,
    },
    {
      name: 'flight_keyword_skymiles',
      emailType: 'flight',
      ruleType: 'keyword',
      pattern: 'skymiles',
      priority: 15,
    },
    {
      name: 'flight_keyword_boarding',
      emailType: 'flight',
      ruleType: 'keyword',
      pattern: 'boarding',
      priority: 11,
    },
    {
      name: 'flight_keyword_award_trip',
      emailType: 'flight',
      ruleType: 'keyword',
      pattern: 'award trip',
      priority: 14,
    },
    {
      name: 'flight_subject_congrats',
      emailType: 'flight',
      ruleType: 'subject_pattern',
      pattern: 'congrats on your',
      priority: 16,
    },

    // Car rental rules
    {
      name: 'car_rental_keyword_car',
      emailType: 'car_rental',
      ruleType: 'keyword',
      pattern: 'car',
      priority: 8,
    },
    {
      name: 'car_rental_keyword_rental',
      emailType: 'car_rental',
      ruleType: 'keyword',
      pattern: 'rental',
      priority: 10,
    },
    {
      name: 'car_rental_keyword_alamo',
      emailType: 'car_rental',
      ruleType: 'keyword',
      pattern: 'alamo',
      priority: 15,
    },
    {
      name: 'car_rental_keyword_pickup',
      emailType: 'car_rental',
      ruleType: 'keyword',
      pattern: 'pickup',
      priority: 9,
    },

    // General travel rules
    {
      name: 'train_keyword_train',
      emailType: 'train',
      ruleType: 'keyword',
      pattern: 'train',
      priority: 10,
    },
    {
      name: 'train_keyword_rail',
      emailType: 'train',
      ruleType: 'keyword',
      pattern: 'rail',
      priority: 9,
    },
    {
      name: 'cruise_keyword_cruise',
      emailType: 'cruise',
      ruleType: 'keyword',
      pattern: 'cruise',
      priority: 10,
    },
    {
      name: 'restaurant_keyword_restaurant',
      emailType: 'restaurant',
      ruleType: 'keyword',
      pattern: 'restaurant',
      priority: 10,
    },
    {
      name: 'restaurant_keyword_dining',
      emailType: 'restaurant',
      ruleType: 'keyword',
      pattern: 'dining',
      priority: 8,
    },
  ];

  for (const rule of classificationRules) {
    await prisma.emailClassificationRule.create({ data: rule });
  }

  console.log(`✅ Created ${classificationRules.length} classification rules`);

  // 2. Subject Patterns (for email unmarking/reprocessing)
  const subjectPatterns = [
    {
      name: 'hotel_thompson_pattern',
      emailType: 'hotel',
      pattern: 'Reservation Details for Your Upcoming Stay at Thompson Austin',
      variations: [
        'Reservation Details for Your Upcoming Stay',
        'Thompson Austin',
        'Upcoming Stay at Thompson',
      ],
    },
    {
      name: 'flight_skymiles_pattern',
      emailType: 'flight',
      pattern: 'Congrats On Your SkyMiles Award Trip',
      variations: ['SkyMiles Award Trip', 'Congrats On Your', 'Award Trip'],
    },
    {
      name: 'car_rental_alamo_pattern',
      emailType: 'car_rental',
      pattern: 'Alamo Reservation Confirmation',
      variations: ['Alamo Reservation', 'Reservation Confirmation', 'AUSTIN BERGSTROM ARPT'],
    },
  ];

  for (const pattern of subjectPatterns) {
    await prisma.emailSubjectPattern.create({ data: pattern });
  }

  console.log(`✅ Created ${subjectPatterns.length} subject patterns`);

  // 3. Processing Configuration
  const processingConfigs = [
    {
      category: 'validation',
      key: 'time_ranges',
      value: {
        hotel: {
          check_in: { min: 14, max: 18, description: 'Hotel check-in hours' },
          check_out: { min: 10, max: 12, description: 'Hotel check-out hours' },
        },
        car_rental: {
          pickup: { min: 6, max: 22, description: 'Car rental pickup hours' },
          return: { min: 6, max: 22, description: 'Car rental return hours' },
        },
        flight: {
          departure: { min: 0, max: 24, description: 'Flight departure hours' },
          arrival: { min: 0, max: 24, description: 'Flight arrival hours' },
        },
      },
      description: 'Time validation ranges for different travel types',
    },
    {
      category: 'detection',
      key: 'confidence_thresholds',
      value: {
        hotel: 0.8,
        flight: 0.85,
        car_rental: 0.8,
        default: 0.75,
      },
      description: 'Minimum confidence scores for email classification',
    },
    {
      category: 'parsing',
      key: 'retry_attempts',
      value: {
        max_retries: 3,
        retry_delay: 1000,
        backoff_multiplier: 2,
      },
      description: 'Retry configuration for failed parsing attempts',
    },
  ];

  for (const config of processingConfigs) {
    await prisma.emailProcessingConfig.create({ data: config });
  }

  console.log(`✅ Created ${processingConfigs.length} processing configurations`);

  // 4. Sender Rules (for trusted sources)
  const senderRules = [
    {
      name: 'delta_airlines',
      senderPattern: '@delta.com',
      emailType: 'flight',
      trustLevel: 'trusted',
      metadata: {
        airline: 'Delta Air Lines',
        priority: 'high',
        auto_process: true,
      },
    },
    {
      name: 'alamo_car_rental',
      senderPattern: '@alamo.com',
      emailType: 'car_rental',
      trustLevel: 'trusted',
      metadata: {
        company: 'Alamo Rent A Car',
        priority: 'high',
        auto_process: true,
      },
    },
    {
      name: 'booking_hotels',
      senderPattern: '@booking.com',
      emailType: 'hotel',
      trustLevel: 'trusted',
      metadata: {
        company: 'Booking.com',
        priority: 'high',
        auto_process: true,
      },
    },
    {
      name: 'expedia_general',
      senderPattern: '@expedia.com',
      emailType: null, // Can be any type
      trustLevel: 'trusted',
      metadata: {
        company: 'Expedia',
        priority: 'high',
        auto_process: true,
      },
    },
  ];

  for (const rule of senderRules) {
    await prisma.emailSenderRule.create({ data: rule });
  }

  console.log(`✅ Created ${senderRules.length} sender rules`);
  console.log('✅ Email processing rules seeded successfully');
}

async function main() {
  try {
    await seedEmailRules();
  } catch (error) {
    console.error('Error seeding email rules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedEmailRules };
