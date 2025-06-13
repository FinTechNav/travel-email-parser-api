// scripts/fix-ps-arrival-window.js
// Fix PS parsing to extract both earliest and latest arrival times

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPSArrivalWindow() {
  console.log('⏰ Fixing PS arrival window parsing...');

  try {
    await updatePSArrivalWindowPrompt();
    console.log('✅ PS arrival window fixes completed!');
  } catch (error) {
    console.error('❌ Fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function updatePSArrivalWindowPrompt() {
  console.log('📝 Updating PS prompt to extract full arrival window...');

  const arrivalWindowPrompt = `You are an expert private terminal service email parser. Extract information about the PRIVATE TERMINAL BOOKING, not the flight details mentioned.

CRITICAL: This email is for a PRIVATE TERMINAL SERVICE that provides premium airport access before a flight. Focus on the terminal service details, NOT the flight information.

PS ARRIVAL WINDOW LOGIC:
- PS allows arrival "up to three hours before your departure"
- Email states "Plan to be at PS no later than [TIME]" 
- Calculate BOTH earliest and latest arrival times
- Most travelers want to know the EARLIEST they can arrive to enjoy amenities

TIMEZONE RULES FOR PRIVATE TERMINALS:
- PS ATL (Atlanta) → Use Eastern Time (EDT/EST)
- PS LAX (Los Angeles) → Use Pacific Time (PDT/PST)  
- PS JFK (New York) → Use Eastern Time (EDT/EST)
- Private terminal is ALWAYS in the same timezone as the departure airport

IMPORTANT PARSING RULES:
1. Extract the PS facility information (PS ATL, PS LAX, etc.)
2. Find flight departure time
3. Calculate earliest arrival (3 hours before flight)
4. Find latest arrival ("Plan to be at PS no later than X")
5. Extract the experience type (The Salon, The Studio, etc.)
6. The flight info is ASSOCIATED FLIGHT, not the main booking
7. Convert times to 24-hour format and include date
8. Use the format: YYYY-MM-DD HH:MM for all datetime fields

LOOK FOR THESE SPECIFIC PATTERNS:
- "Flight departs from [AIRPORT] at [TIME]" → Calculate earliest PS arrival (3 hours before)
- "Plan to be at PS no later than [TIME]" → Latest PS arrival time
- "up to three hours before your departure" → Confirms 3-hour window
- "PS [LOCATION]" (e.g., "PS ATL") → Facility name and timezone
- "Experience: [NAME]" → Experience type
- "Reservation #: [NUMBER]" → PS confirmation number

Return this EXACT JSON structure:
{
  "type": "private_terminal",
  "confirmation_number": "PS reservation number (not flight confirmation)",
  "passenger_name": "primary passenger name",
  "travel_dates": {
    "departure": "EARLIEST PS arrival time (YYYY-MM-DD HH:MM)",
    "return": "LATEST PS arrival time (YYYY-MM-DD HH:MM)"
  },
  "locations": {
    "origin": "PS facility location (e.g., PS ATL)",
    "destination": "destination city from flight"
  },
  "service_details": {
    "facility_name": "PS ATL, PS LAX, etc.",
    "experience_type": "The Salon, The Studio, etc.",
    "earliest_arrival": "earliest you can arrive at PS (YYYY-MM-DD HH:MM)",
    "latest_arrival": "latest you should arrive at PS (YYYY-MM-DD HH:MM)",
    "arrival_window": "time range for PS arrival (e.g., 11:30 AM - 1:00 PM)",
    "service_type": "departure",
    "departure_process": "description of premium departure process"
  },
  "associated_flight": {
    "flight_number": "airline flight this service connects to",
    "airline": "airline name",
    "departure_airport": "3-letter airport code",
    "arrival_airport": "3-letter destination code", 
    "departure_datetime": "flight departure time (YYYY-MM-DD HH:MM)",
    "arrival_datetime": "flight arrival time (YYYY-MM-DD HH:MM)"
  },
  "details": {
    "facility_address": "physical address of PS facility",
    "arrival_instructions": "how to arrive at facility",
    "contact_info": "phone number or contact details",
    "luggage_handling": "description of luggage service",
    "ground_transportation": "arrival method info",
    "amenities_info": "food, beverages, and amenities description"
  },
  "price": {
    "amount": null,
    "currency": null
  }
}

ARRIVAL WINDOW CALCULATION EXAMPLES:
- Flight departs 2:30 PM + "no later than 1:00 PM" → Window: 11:30 AM - 1:00 PM
- Flight departs 6:00 PM + "no later than 4:30 PM" → Window: 3:00 PM - 4:30 PM
- Flight departs 10:00 AM + "no later than 8:30 AM" → Window: 7:00 AM - 8:30 AM

SPECIFIC EXTRACTION FOR YOUR EMAIL:
- "Flight departs from ATL at 2:30 pm" → Flight departure: 2:30 PM
- "Plan to be at PS no later than 1:00 pm" → Latest arrival: 1:00 PM  
- Calculate earliest: 2:30 PM - 3 hours = 11:30 AM
- Window: "11:30 AM - 1:00 PM" 
- travel_dates.departure: "2025-06-13 11:30" (earliest arrival)
- travel_dates.return: "2025-06-13 13:00" (latest arrival)
- service_details.earliest_arrival: "2025-06-13 11:30"
- service_details.latest_arrival: "2025-06-13 13:00"
- service_details.arrival_window: "11:30 AM - 1:00 PM EDT"

Parse this private terminal service confirmation email:
{{emailContent}}`;

  try {
    const updated = await prisma.promptTemplate.updateMany({
      where: {
        name: 'email_parsing_private_terminal'
      },
      data: {
        prompt: arrivalWindowPrompt,
        version: 4,
        updatedAt: new Date()
      }
    });

    if (updated.count > 0) {
      console.log('  ✅ Updated PS parsing prompt to version 4 with arrival window logic');
    } else {
      console.log('  ⚠️  Creating new arrival window PS parsing prompt...');
      await prisma.promptTemplate.create({
        data: {
          name: 'email_parsing_private_terminal',
          category: 'parsing',
          type: 'private_terminal',
          version: 4,
          isActive: true,
          prompt: arrivalWindowPrompt
        }
      });
      console.log('  ✅ Created new arrival window PS parsing prompt');
    }

    console.log('\n💡 Key Changes:');
    console.log('- travel_dates.departure = EARLIEST arrival (11:30 AM)');
    console.log('- travel_dates.return = LATEST arrival (1:00 PM)');
    console.log('- service_details.arrival_window = "11:30 AM - 1:00 PM EDT"');
    console.log('- service_details.earliest_arrival = when you CAN arrive');
    console.log('- service_details.latest_arrival = when you SHOULD arrive');

  } catch (error) {
    console.error('  ❌ Failed to update PS parsing prompt:', error.message);
  }
}

// Export for use in other scripts
module.exports = {
  fixPSArrivalWindow,
  updatePSArrivalWindowPrompt
};

// Run fix if called directly
if (require.main === module) {
  fixPSArrivalWindow()
    .then(() => {
      console.log('\n🎉 PS arrival window fixes completed!');
      console.log('\n📝 What changed:');
      console.log('- Now extracts BOTH earliest (11:30 AM) and latest (1:00 PM) arrival times');
      console.log('- Calculates full PS availability window');
      console.log('- Shows when travelers can start enjoying amenities');
      console.log('\n🔄 Next steps:');
      console.log('1. Restart your application');
      console.log('2. Delete the current PS segment to trigger reprocessing');
      console.log('3. Check that it shows the arrival window: 11:30 AM - 1:00 PM EDT');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Arrival window fix failed:', error);
      process.exit(1);
    });
}