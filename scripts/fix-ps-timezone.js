// scripts/fix-ps-timezone.js
// Fix timezone logic for private terminal services

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPSTimezone() {
  console.log('🌎 Fixing PS private terminal timezone logic...');

  try {
    // Step 1: Update the PS parsing prompt to include timezone awareness
    await updatePSTimezoneInstructions();

    // Step 2: Create updated timezone inference logic
    await createTimezoneLogicUpdates();

    // Step 3: Reprocess PS segments with correct timezone
    await reprocessPSTimezone();

    console.log('✅ PS timezone fixes completed!');

  } catch (error) {
    console.error('❌ Timezone fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Step 1: Update PS parsing prompt with timezone awareness
async function updatePSTimezoneInstructions() {
  console.log('📝 Adding timezone awareness to PS parsing prompt...');

  const timezoneAwarePrompt = `You are an expert private terminal service email parser. Extract information about the PRIVATE TERMINAL BOOKING, not the flight details mentioned.

CRITICAL: This email is for a PRIVATE TERMINAL SERVICE that provides premium airport access before a flight. Focus on the terminal service details, NOT the flight information.

TIMEZONE RULES FOR PRIVATE TERMINALS:
- PS ATL (Atlanta) → Use Eastern Time (EDT/EST)
- PS LAX (Los Angeles) → Use Pacific Time (PDT/PST)  
- PS JFK (New York) → Use Eastern Time (EDT/EST)
- Private terminal is ALWAYS in the same timezone as the departure airport
- "Plan to be at PS no later than 1:00 pm" in Atlanta = 1:00 PM EDT

IMPORTANT PARSING RULES:
1. Extract the PS facility information (PS ATL, PS LAX, etc.)
2. Find when customer should arrive at PS facility ("Plan to be at PS no later than X")
3. The PS arrival time should be in the SAME TIMEZONE as the departure airport
4. Extract the experience type (The Salon, The Studio, etc.)
5. The flight info is ASSOCIATED FLIGHT, not the main booking
6. Convert times to 24-hour format and include date
7. Use the format: YYYY-MM-DD HH:MM for all datetime fields

LOOK FOR THESE SPECIFIC PATTERNS:
- "Plan to be at PS no later than [TIME]" → This is the PS arrival time (use departure airport timezone)
- "PS [LOCATION]" (e.g., "PS ATL") → This is the facility name (determines timezone)
- "Experience: [NAME]" → This is the experience type
- "Reservation #: [NUMBER]" → This is the PS confirmation number
- Flight details → Goes in associated_flight section

Return this EXACT JSON structure:
{
  "type": "private_terminal",
  "confirmation_number": "PS reservation number (not flight confirmation)",
  "passenger_name": "primary passenger name",
  "travel_dates": {
    "departure": "PS arrival time in departure airport timezone (YYYY-MM-DD HH:MM)",
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

TIMEZONE EXAMPLES:
- PS ATL + "1:00 pm" → "2025-06-13 13:00" (Eastern Time)
- PS LAX + "1:00 pm" → "2025-06-13 13:00" (Pacific Time)  
- PS JFK + "1:00 pm" → "2025-06-13 13:00" (Eastern Time)

Parse this private terminal service confirmation email:
{{emailContent}}`;

  try {
    const updated = await prisma.promptTemplate.updateMany({
      where: {
        name: 'email_parsing_private_terminal'
      },
      data: {
        prompt: timezoneAwarePrompt,
        version: 3,
        updatedAt: new Date()
      }
    });

    if (updated.count > 0) {
      console.log('  ✅ Updated PS parsing prompt to version 3 with timezone awareness');
    } else {
      console.log('  ⚠️  Creating new timezone-aware PS parsing prompt...');
      await prisma.promptTemplate.create({
        data: {
          name: 'email_parsing_private_terminal',
          category: 'parsing',
          type: 'private_terminal',
          version: 3,
          isActive: true,
          prompt: timezoneAwarePrompt
        }
      });
      console.log('  ✅ Created new timezone-aware PS parsing prompt');
    }
  } catch (error) {
    console.error('  ❌ Failed to update PS parsing prompt:', error.message);
  }
}

// Step 2: Create timezone logic updates
async function createTimezoneLogicUpdates() {
  console.log('📝 Creating timezone logic updates...');

  console.log(`
📋 REQUIRED CODE UPDATES:

1. UPDATE src/services/emailProcessor.js - inferTimezoneFromLocation method:

Add PS facility timezone mapping:
\`\`\`javascript
inferTimezoneFromLocation(data) {
  const locationTimezones = {
    // PS Private Terminal Facilities (use facility timezone, not destination)
    'ps atl': 'America/New_York',
    'ps lax': 'America/Los_Angeles',
    'ps jfk': 'America/New_York',
    'ps ord': 'America/Chicago',
    
    // Regular airports and cities
    atlanta: 'America/New_York',
    atl: 'America/New_York',
    austin: 'America/Chicago',
    aus: 'America/Chicago',
    // ... rest of your existing mapping
  };

  // Special handling for private terminals
  if (data?.type === 'private_terminal') {
    // For PS, use facility location timezone (not destination)
    const facilityName = data?.service_details?.facility_name || data?.locations?.origin;
    if (facilityName) {
      const normalizedFacility = facilityName.toLowerCase().trim();
      if (locationTimezones[normalizedFacility]) {
        console.log(\`Using PS facility timezone: \${facilityName} → \${locationTimezones[normalizedFacility]}\`);
        return locationTimezones[normalizedFacility];
      }
    }
  }

  // Rest of existing logic for other types...
}
\`\`\`

2. UPDATE public/dashboard.js - inferTimezoneFromLocation function:

Add the same PS facility mapping to the frontend:
\`\`\`javascript
function inferTimezoneFromLocation(location) {
  const locationTimezones = {
    // PS Private Terminal Facilities
    'ps atl': 'America/New_York',
    'ps lax': 'America/Los_Angeles', 
    'ps jfk': 'America/New_York',
    'ps ord': 'America/Chicago',
    
    // Regular locations
    atlanta: 'America/New_York',
    atl: 'America/New_York',
    // ... rest of existing mapping
  };
  
  // Rest of existing logic...
}
\`\`\`

3. UPDATE the formatDateTime function in dashboard.js:

Add special handling for private_terminal segments:
\`\`\`javascript
function formatDateTime(dateStr, segment) {
  // ... existing code ...
  
  // Special timezone handling for private terminals
  if (segment.type === 'private_terminal') {
    // Use facility timezone (origin), not destination
    timeZone = inferTimezoneFromLocation(segment.origin) || timeZone;
  } else if (segment.type === 'flight') {
    // Existing flight logic
  } else {
    // Existing hotel/car logic
  }
  
  // ... rest of function
}
\`\`\`
  `);
}

// Step 3: Identify PS segments that need timezone correction
async function reprocessPSTimezone() {
  console.log('🔍 Checking PS segments for timezone issues...');

  try {
    const psSegments = await prisma.segment.findMany({
      where: {
        type: 'private_terminal'
      },
      include: {
        itinerary: true
      }
    });

    console.log(`  📊 Found ${psSegments.length} PS segments to check`);

    if (psSegments.length > 0) {
      console.log('  💡 PS segments found:');
      psSegments.forEach(segment => {
        const origin = segment.origin || 'Unknown';
        const date = segment.startDateTime ? segment.startDateTime.toISOString() : 'No date';
        console.log(`     - ${segment.id}: ${origin} at ${date}`);
      });

      console.log('\n  🔄 To fix timezone issues:');
      console.log('     1. Apply the code updates shown above');
      console.log('     2. Delete the PS segment from dashboard (marks email for reprocessing)');
      console.log('     3. Email will be reprocessed with correct timezone logic');
    } else {
      console.log('  ✅ No PS segments found that need timezone correction');
    }

  } catch (error) {
    console.error('  ❌ Error checking PS segments:', error.message);
  }
}

// Export for use in other scripts
module.exports = {
  fixPSTimezone,
  updatePSTimezoneInstructions,
  reprocessPSTimezone
};

// Run fix if called directly
if (require.main === module) {
  fixPSTimezone()
    .then(() => {
      console.log('\n🎉 PS timezone fixes completed!');
      console.log('\n🔄 Required Actions:');
      console.log('1. Apply the code updates shown above to:');
      console.log('   - src/services/emailProcessor.js (inferTimezoneFromLocation)');
      console.log('   - public/dashboard.js (inferTimezoneFromLocation & formatDateTime)');
      console.log('2. Restart your application');
      console.log('3. Delete the current PS segment to trigger reprocessing');
      console.log('4. Verify PS ATL shows as Eastern Time (EDT), not Central Time (CDT)');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Timezone fix failed:', error);
      process.exit(1);
    });
}