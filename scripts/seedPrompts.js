// scripts/seedPrompts.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedPrompts() {
  console.log('Seeding AI prompts...');

  // 1. Classification prompt
  await prisma.promptTemplate.create({
    data: {
      name: 'email_classification_base',
      category: 'classification',
      type: 'base',
      version: 1,
      isActive: true,
      prompt: `Classify this email as one of: flight, hotel, car_rental, train, cruise, restaurant, event, other

Look for keywords like:
- Flight: airline, flight, boarding, gate, departure, arrival
- Hotel: hotel, reservation, check-in, check-out, room
- Car rental: rental, car, pickup, return, vehicle
- Train: train, rail, platform, coach, seat
- Cruise: cruise, ship, cabin, sailing
- Restaurant: restaurant, reservation, table, dining
- Event: ticket, event, concert, show, venue

Email content: {{emailContent}}...

Respond with only the classification word.`,
    },
  });

  // 2. Base parsing prompt
  await prisma.promptTemplate.create({
    data: {
      name: 'email_parsing_base',
      category: 'parsing',
      type: 'base',
      version: 1,
      isActive: true,
      prompt: `You are an expert travel email parser. Extract ALL relevant information from this confirmation email.
You MUST respond with valid JSON only. Do not include any explanatory text outside the JSON.

CRITICAL TIME PARSING RULES:
- Convert ALL times to 24-hour format (HH:MM)
- Examples: 4:00 PM → 16:00, 11:00 AM → 11:00, 2:00 PM → 14:00
- Look for exact phrases: "pickup at", "check-in", "check-out", "departure", "arrival"
- Pay close attention to AM/PM indicators
- If time seems wrong, double-check the original email text
- Common hotel times: check-in 15:00-16:00, check-out 10:00-11:00
- Common car rental: pickup/return during business hours 08:00-18:00

EXTRACTED TIMES FROM EMAIL:
{{extractedTimes}}

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
{{emailContent}}`,
    },
  });

  // 3. Flight-specific parsing prompt
  await prisma.promptTemplate.create({
    data: {
      name: 'email_parsing_flight',
      category: 'parsing',
      type: 'flight',
      version: 1,
      isActive: true,
      prompt: `CRITICAL FLIGHT PARSING RULES:
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

Each flight should have different departure_datetime and arrival_datetime values.`,
    },
  });

  // 4. Hotel-specific parsing prompt
  await prisma.promptTemplate.create({
    data: {
      name: 'email_parsing_hotel',
      category: 'parsing',
      type: 'hotel',
      version: 1,
      isActive: true,
      prompt: `For hotels, also extract in the details object:
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
IMPORTANT: check_in_time and check_out_time must be in 24-hour format!`,
    },
  });

  // 5. Car rental-specific parsing prompt
  await prisma.promptTemplate.create({
    data: {
      name: 'email_parsing_car_rental',
      category: 'parsing',
      type: 'car_rental',
      version: 1,
      isActive: true,
      prompt: `For car rentals, also extract in the details object:
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
IMPORTANT: pickup_time and return_time must be in 24-hour format!`,
    },
  });

  // 6. AI Configuration
  await prisma.aIConfiguration.create({
    data: {
      name: 'production_config',
      model: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
      isActive: true,
      costPerToken: 0.000000075, // $0.075 per 1K tokens for gpt-4o-mini
      metadata: {
        response_format: { type: 'json_object' },
        description: 'Primary production configuration',
      },
    },
  });

  console.log('✅ AI prompts seeded successfully');
}

async function main() {
  try {
    await seedPrompts();
  } catch (error) {
    console.error('Error seeding prompts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedPrompts };
