// scripts/fix-ps-parsing.js
// Fix the PS parsing to use the specialized prompt and extract proper data

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPSParsing() {
  console.log('🔧 Fixing PS private terminal parsing...');

  try {
    // Step 1: Update the private_terminal parsing prompt to better extract PS data
    await updatePSParsingPrompt();

    // Step 2: Update the prompt service logic to handle private_terminal correctly
    await updatePromptServiceLogic();

    // Step 3: Reprocess any existing private_terminal segments that are missing data
    await reprocessPSSegments();

    console.log('✅ PS parsing fixes completed!');
    console.log('\n💡 Next steps:');
    console.log('1. Restart your application');
    console.log('2. Send the PS email again to test parsing');
    console.log('3. Check that it extracts: facility name, arrival time, and associated flight');

  } catch (error) {
    console.error('❌ Fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Step 1: Update PS parsing prompt for better data extraction
async function updatePSParsingPrompt() {
  console.log('📝 Updating PS parsing prompt...');

  const improvedPrompt = `You are an expert private terminal service email parser. Extract information about the PRIVATE TERMINAL BOOKING, not the flight details mentioned.

CRITICAL: This email is for a PRIVATE TERMINAL SERVICE that provides premium airport access before a flight. Focus on the terminal service details, NOT the flight information.

IMPORTANT PARSING RULES:
1. Extract the PS facility information (PS ATL, PS LAX, etc.)
2. Find when customer should arrive at PS facility ("Plan to be at PS no later than X")
3. Extract the experience type (The Salon, The Studio, etc.)
4. The flight info is ASSOCIATED FLIGHT, not the main booking
5. Convert times to 24-hour format and include date
6. Use the format: YYYY-MM-DD HH:MM for all datetime fields

LOOK FOR THESE SPECIFIC PATTERNS:
- "Plan to be at PS no later than [TIME]" → This is the PS arrival time
- "PS [LOCATION]" (e.g., "PS ATL") → This is the facility name
- "Experience: [NAME]" → This is the experience type
- "Reservation #: [NUMBER]" → This is the PS confirmation number
- Flight details → Goes in associated_flight section

Return this EXACT JSON structure:
{
  "type": "private_terminal",
  "confirmation_number": "PS reservation number (not flight confirmation)",
  "passenger_name": "primary passenger name",
  "travel_dates": {
    "departure": "PS arrival time (YYYY-MM-DD HH:MM)",
    "return": null
  },
  "locations": {
    "origin": "PS facility location (e.g., PS ATL)",
    "destination": "destination city from flight"
  },
  "service_details": {
    "facility_name": "PS ATL, PS LAX, etc.",
    "experience_type": "The Salon, The Studio, etc.",
    "arrival_time": "when to arrive at PS facility (YYYY-MM-DD HH:MM)",
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
    "ground_transportation": "arrival method info"
  },
  "price": {
    "amount": null,
    "currency": null
  }
}

EXAMPLE EXTRACTION FROM PS EMAIL:
- "Plan to be at PS no later than 1:00 pm" + "June 13" → travel_dates.departure: "2025-06-13 13:00"
- "PS ATL" → locations.origin: "PS ATL" AND service_details.facility_name: "PS ATL"
- "Experience: The Salon" → service_details.experience_type: "The Salon"
- "Reservation #: 211626" → confirmation_number: "211626"
- "Delta Air Lines #1397" → associated_flight.flight_number: "DL1397"

Parse this private terminal service confirmation email:
{{emailContent}}`;

  try {
    const updated = await prisma.promptTemplate.updateMany({
      where: {
        name: 'email_parsing_private_terminal'
      },
      data: {
        prompt: improvedPrompt,
        version: 2,
        updatedAt: new Date()
      }
    });

    if (updated.count > 0) {
      console.log('  ✅ Updated PS parsing prompt to version 2');
    } else {
      console.log('  ⚠️  PS parsing prompt not found, creating new one...');
      await prisma.promptTemplate.create({
        data: {
          name: 'email_parsing_private_terminal',
          category: 'parsing',
          type: 'private_terminal',
          version: 2,
          isActive: true,
          prompt: improvedPrompt
        }
      });
      console.log('  ✅ Created new PS parsing prompt');
    }
  } catch (error) {
    console.error('  ❌ Failed to update PS parsing prompt:', error.message);
  }
}

// Step 2: Instructions for updating prompt service logic
async function updatePromptServiceLogic() {
  console.log('📝 Checking prompt service logic...');
  
  console.log(`
  ⚠️  MANUAL UPDATE REQUIRED:
  
  You need to update your src/services/promptService.js file to ensure
  private_terminal emails use the specialized prompt.
  
  In the getParsingPrompt method, make sure this logic exists:
  
  // Special handling for private_terminal
  if (emailType === 'private_terminal' && typeTemplate) {
    return this.interpolatePrompt(typeTemplate.prompt, {
      emailContent,
      extractedTimes: this.formatExtractedTimes(extractedTimes),
      emailType
    });
  }
  
  This ensures PS emails use the specialized prompt instead of the base prompt.
  `);
}

// Step 3: Find and reprocess PS segments with missing data
async function reprocessPSSegments() {
  console.log('🔍 Finding PS segments that need reprocessing...');

  try {
    // Find private_terminal segments that might be missing proper data
    const psSegments = await prisma.segment.findMany({
      where: {
        type: 'private_terminal',
        OR: [
          // Missing start/end dates
          { startDateTime: null },
          { endDateTime: null },
          // Missing essential details
          {
            details: {
              path: ['service_details'],
              equals: null
            }
          }
        ]
      },
      include: {
        itinerary: true
      }
    });

    console.log(`  📊 Found ${psSegments.length} PS segments that may need reprocessing`);

    if (psSegments.length > 0) {
      console.log('  💡 To reprocess these segments:');
      console.log('     1. Delete the segments from the dashboard');
      console.log('     2. The original emails will be reprocessed with the improved prompt');
      console.log('     3. New segments will be created with proper PS data structure');
      
      // List the segments
      psSegments.forEach(segment => {
        console.log(`     - Segment ${segment.id}: ${segment.details?.passenger_name || 'Unknown'}`);
      });
    } else {
      console.log('  ✅ No PS segments found that need reprocessing');
    }

  } catch (error) {
    console.error('  ❌ Error checking PS segments:', error.message);
  }
}

// Export for use in other scripts
module.exports = {
  fixPSParsing,
  updatePSParsingPrompt,
  reprocessPSSegments
};

// Run fix if called directly
if (require.main === module) {
  fixPSParsing()
    .then(() => {
      console.log('\n🎉 PS parsing fixes completed!');
      console.log('\n🔄 Next steps:');
      console.log('1. Update src/services/promptService.js with private_terminal handling');
      console.log('2. Restart your application');  
      console.log('3. Delete the current PS segment from your dashboard');
      console.log('4. Send the PS email again to test the improved parsing');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fix failed:', error);
      process.exit(1);
    });
}