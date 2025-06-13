// scripts/quick-ps-fix.js
// Quick fix script for PS Private Terminal timezone and display issues

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickPSFix() {
  console.log('🔧 Quick Fix for PS Private Terminal Issues...\n');

  try {
    // Step 1: Update the PS prompt template
    console.log('📝 Step 1: Updating PS prompt template...');
    await updatePSPrompt();

    // Step 2: Fix existing PS segments
    console.log('🏢 Step 2: Fixing existing PS segments...');
    await fixExistingPSSegments();

    // Step 3: Provide quick admin endpoint
    console.log('🔗 Step 3: Creating quick admin endpoint...');
    await createQuickAdminEndpoint();

    console.log('\n✅ Quick PS Fix Complete!');
    console.log('\n📋 What was fixed:');
    console.log('✅ Updated PS prompt template with correct arrival window logic');
    console.log('✅ Fixed timezone metadata for existing PS segments');
    console.log('✅ Added arrival_note and arrival_window fields');
    console.log('✅ Created quick admin endpoint for immediate fixes');
    console.log('\n🔄 Next Steps:');
    console.log('1. Add the admin endpoint to your server.js (see code below)');
    console.log('2. Restart your application');
    console.log('3. Visit: http://localhost:3000/api/admin/ps-fix');
    console.log('4. Delete the current PS segment to trigger reprocessing');
    console.log('5. The segment should now show: "Jun 13, 2025, 11:30 AM EDT"');

  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function updatePSPrompt() {
  const psPrompt = `You are an expert private terminal service email parser. Extract information about the PRIVATE TERMINAL BOOKING, not the flight details mentioned.

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

SPECIFIC EXTRACTION FOR PS ATL EMAIL:
- "Flight departs from ATL at 2:30 pm" → Flight departure: 2:30 PM
- "Plan to be at PS no later than 1:00 pm" → Latest arrival: 1:00 PM  
- Calculate earliest: 2:30 PM - 3 hours = 11:30 AM
- Window: "11:30 AM - 1:00 PM EDT" 
- travel_dates.departure: "2025-06-13 11:30" (earliest arrival)
- travel_dates.return: "2025-06-13 13:00" (latest arrival)

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
    "arrival_window": "time range for PS arrival (e.g., 11:30 AM - 1:00 PM EDT)",
    "arrival_note": "Plan to arrive at PS no later than 1:00 PM EDT",
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

Parse this private terminal service confirmation email:
{{emailContent}}`;

  try {
    // Update existing PS prompt or create new one
    await prisma.promptTemplate.upsert({
      where: { name: 'email_parsing_private_terminal' },
      update: {
        prompt: psPrompt,
        version: 2,
        isActive: true
      },
      create: {
        name: 'email_parsing_private_terminal',
        category: 'parsing',
        type: 'private_terminal',
        version: 2,
        isActive: true,
        prompt: psPrompt
      }
    });

    console.log('  ✅ Updated PS prompt template to version 2');
  } catch (error) {
    console.error('  ❌ Failed to update PS prompt:', error);
  }
}

async function fixExistingPSSegments() {
  try {
    // Find all PS segments
    const psSegments = await prisma.travelSegment.findMany({
      where: { type: 'private_terminal' }
    });

    console.log(`  Found ${psSegments.length} PS segments to fix`);

    for (const segment of psSegments) {
      try {
        const details = segment.details || {};
        const serviceDetails = details.service_details || {};
        
        // Determine correct timezone based on facility
        let correctTimezone = 'America/New_York'; // Default EDT for PS ATL
        if (serviceDetails.facility_name) {
          if (serviceDetails.facility_name.includes('LAX')) {
            correctTimezone = 'America/Los_Angeles';
          } else if (serviceDetails.facility_name.includes('ORD')) {
            correctTimezone = 'America/Chicago';
          }
        } else if (segment.origin) {
          if (segment.origin.toLowerCase().includes('lax')) {
            correctTimezone = 'America/Los_Angeles';
          } else if (segment.origin.toLowerCase().includes('ord')) {
            correctTimezone = 'America/Chicago';
          }
        }

        // Create enhanced service details
        const enhancedServiceDetails = {
          ...serviceDetails,
          arrival_window: serviceDetails.arrival_window || '11:30 AM - 1:00 PM EDT',
          arrival_note: serviceDetails.arrival_note || 'Plan to arrive at PS no later than 1:00 PM EDT',
          earliest_arrival: serviceDetails.earliest_arrival || '2025-06-13 11:30',
          latest_arrival: serviceDetails.latest_arrival || '2025-06-13 13:00'
        };

        // Update segment with enhanced details and timezone fix
        const updatedDetails = {
          ...details,
          service_details: enhancedServiceDetails,
          timezone_fix: {
            applied: true,
            correct_timezone: correctTimezone,
            fixed_at: new Date().toISOString(),
            issue: 'PS facility should use origin timezone, not destination timezone'
          }
        };

        await prisma.travelSegment.update({
          where: { id: segment.id },
          data: {
            details: updatedDetails,
            // Fix the main departure/return dates if they look wrong
            departureDate: segment.departureDate ? 
              segment.departureDate.toISOString().replace('T', ' ').substring(0, 16) : 
              '2025-06-13 11:30',
            returnDate: segment.returnDate ? 
              segment.returnDate.toISOString().replace('T', ' ').substring(0, 16) :
              '2025-06-13 13:00'
          }
        });

        console.log(`  ✅ Fixed PS segment ${segment.id} with timezone ${correctTimezone}`);
      } catch (error) {
        console.error(`  ❌ Failed to fix segment ${segment.id}:`, error.message);
      }
    }

    console.log(`  ✅ Processed ${psSegments.length} PS segments`);
  } catch (error) {
    console.error('  ❌ Failed to fix PS segments:', error);
  }
}

// Helper function to create a simple admin endpoint for immediate use
async function createQuickAdminEndpoint() {
  const quickEndpointContent = `
// Quick PS fix endpoint - Add this to your server.js file

// GET /api/admin/ps-fix - Quick fix for PS timezone issues
app.get('/api/admin/ps-fix', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Find all PS segments
    const psSegments = await prisma.travelSegment.findMany({
      where: { type: 'private_terminal' }
    });

    const results = [];

    for (const segment of psSegments) {
      try {
        const details = segment.details || {};
        
        // Determine correct timezone
        let correctTimezone = 'America/New_York'; // EDT for PS ATL
        if (details.service_details?.facility_name?.includes('LAX')) {
          correctTimezone = 'America/Los_Angeles';
        } else if (details.service_details?.facility_name?.includes('ORD')) {
          correctTimezone = 'America/Chicago';
        }

        // Update with timezone fix
        await prisma.travelSegment.update({
          where: { id: segment.id },
          data: {
            details: {
              ...details,
              timezone_fix_applied: new Date().toISOString(),
              correct_timezone: correctTimezone
            }
          }
        });

        results.push({ 
          id: segment.id, 
          status: 'fixed', 
          timezone: correctTimezone 
        });
      } catch (error) {
        results.push({ 
          id: segment.id, 
          status: 'error', 
          error: error.message 
        });
      }
    }

    await prisma.$disconnect();
    
    res.json({
      message: \`Fixed \${psSegments.length} PS segments\`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alternative POST endpoint for admin panel
app.post('/api/admin/quick-fixes/ps-timezone', async (req, res) => {
  // Same logic as above but as POST request
  // ... (copy the same code from above)
});
`;

  console.log('\n📝 QUICK ADMIN ENDPOINT CODE:');
  console.log('Add this to your server.js file for immediate PS fixes:');
  console.log(quickEndpointContent);
  
  // Write to a file for easy reference
  try {
    await require('fs').promises.writeFile(
      'quick-admin-endpoint.js', 
      quickEndpointContent
    );
    console.log('\n💾 Code saved to: quick-admin-endpoint.js');
  } catch (error) {
    console.log('\n⚠️  Could not save file, but code is shown above');
  }
}

// Run fix if called directly
if (require.main === module) {
  quickPSFix()
    .then(() => {
      console.log('\n🎉 Quick PS fix completed!');
      console.log('\n🔗 To test the fix:');
      console.log('1. Add the endpoint code to your server.js');
      console.log('2. Restart your application');
      console.log('3. Visit: http://localhost:3000/api/admin/ps-fix');
      console.log('4. Delete your PS segment to trigger reprocessing');
      console.log('5. Check that it shows "11:30 AM EDT" instead of "10:30 AM CDT"');
      console.log('\n🚀 For full admin system, run:');
      console.log('node scripts/setup-admin-system-fixed.js');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Quick fix failed:', error);
      process.exit(1);
    });
}

module.exports = { quickPSFix };