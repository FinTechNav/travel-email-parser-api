// scripts/setup-admin-system-fixed.js
// Complete setup script for the admin system that works with existing database

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function setupAdminSystem() {
  console.log('🚀 Setting up Admin System for Travel Email Parser...\n');

  try {
    // Step 1: Create database tables
    console.log('📊 Step 1: Creating database schema...');
    await createDatabaseSchema();

    // Step 2: Insert default segment type configurations
    console.log('🏢 Step 2: Setting up default segment types...');
    await setupDefaultSegmentTypes();

    // Step 3: Insert PS Private Terminal configuration
    console.log('🏢 Step 3: Setting up PS Private Terminal configuration...');
    await setupPSPrivateTerminal();

    // Step 4: Provide setup instructions
    console.log('📝 Step 4: Providing setup instructions...');
    await showSetupInstructions();

    console.log('\n✅ Admin System Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Add admin routes to your server.js (see instructions above)');
    console.log('2. Replace your dashboard files with the new versions');
    console.log('3. Restart your application server');
    console.log('4. Navigate to the dashboard and click the "Admin Panel" tab');
    console.log('5. Use "Fix PS Timezone Issues" to fix existing PS segments');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createDatabaseSchema() {
  console.log('  Creating admin tables...');

  // Create the segment_type_configs table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS segment_type_configs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        default_timezone VARCHAR(50) DEFAULT 'America/New_York',
        display_config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create the classification_rules table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS classification_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        segment_type_name VARCHAR(50) REFERENCES segment_type_configs(name) ON DELETE CASCADE,
        pattern TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'keyword',
        priority INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create the timezone_rules table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS timezone_rules (
        id SERIAL PRIMARY KEY,
        segment_type_name VARCHAR(50) REFERENCES segment_type_configs(name) ON DELETE CASCADE,
        location_pattern VARCHAR(100) NOT NULL,
        timezone VARCHAR(50) NOT NULL,
        priority INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create the display_rules table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS display_rules (
        id SERIAL PRIMARY KEY,
        segment_type_name VARCHAR(50) REFERENCES segment_type_configs(name) ON DELETE CASCADE,
        primary_time_field VARCHAR(30) DEFAULT 'departure',
        timezone_source VARCHAR(20) DEFAULT 'origin',
        route_format VARCHAR(100) DEFAULT '{origin} → {destination}',
        custom_fields JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for performance
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_classification_rules_segment_type ON classification_rules(segment_type_name);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_classification_rules_priority ON classification_rules(priority DESC);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_timezone_rules_segment_type ON timezone_rules(segment_type_name);
  `);

  console.log('  ✅ Database schema created');
}

async function setupDefaultSegmentTypes() {
  console.log('  Adding default segment types...');

  // Define segment types
  const segmentTypes = [
    { name: 'flight', displayName: 'Flight', description: 'Commercial airline flights' },
    { name: 'hotel', displayName: 'Hotel', description: 'Hotel reservations and accommodations' },
    { name: 'car_rental', displayName: 'Car Rental', description: 'Vehicle rental services' },
    { name: 'train', displayName: 'Train', description: 'Rail transportation' },
    { name: 'cruise', displayName: 'Cruise', description: 'Cruise ship reservations' },
    { name: 'restaurant', displayName: 'Restaurant', description: 'Restaurant reservations' },
    { name: 'event', displayName: 'Event', description: 'Entertainment and event tickets' },
    { name: 'private_terminal', displayName: 'Private Terminal', description: 'Premium airport terminal services' },
    { name: 'other', displayName: 'Other', description: 'Miscellaneous travel services' }
  ];

  for (const type of segmentTypes) {
    try {
      await prisma.$executeRaw`
        INSERT INTO segment_type_configs (name, display_name, description, default_timezone) 
        VALUES (${type.name}, ${type.displayName}, ${type.description}, 'America/New_York')
      `;
      console.log(`    ✅ Added segment type: ${type.name}`);
    } catch (error) {
      if (error.code === 'P2002' || error.meta?.code === '23505') {
        console.log(`    ⚠️  Segment type already exists: ${type.name}`);
      } else {
        console.error(`    ❌ Failed to add ${type.name}:`, error.message);
      }
    }
  }

  // Define display rules
  const displayRules = [
    { segmentType: 'flight', primaryTime: 'departure', timezoneSource: 'origin', routeFormat: '{origin} → {destination}' },
    { segmentType: 'hotel', primaryTime: 'departure', timezoneSource: 'destination', routeFormat: '{destination}' },
    { segmentType: 'car_rental', primaryTime: 'departure', timezoneSource: 'origin', routeFormat: '{origin}' },
    { segmentType: 'train', primaryTime: 'departure', timezoneSource: 'origin', routeFormat: '{origin} → {destination}' },
    { segmentType: 'cruise', primaryTime: 'departure', timezoneSource: 'origin', routeFormat: '{origin} → {destination}' },
    { segmentType: 'restaurant', primaryTime: 'departure', timezoneSource: 'destination', routeFormat: '{destination}' },
    { segmentType: 'event', primaryTime: 'departure', timezoneSource: 'destination', routeFormat: '{destination}' },
    { segmentType: 'private_terminal', primaryTime: 'departure', timezoneSource: 'origin', routeFormat: '{origin} → {destination}' },
    { segmentType: 'other', primaryTime: 'departure', timezoneSource: 'origin', routeFormat: '{origin} → {destination}' }
  ];

  for (const rule of displayRules) {
    try {
      await prisma.$executeRaw`
        INSERT INTO display_rules (segment_type_name, primary_time_field, timezone_source, route_format) 
        VALUES (${rule.segmentType}, ${rule.primaryTime}, ${rule.timezoneSource}, ${rule.routeFormat})
      `;
      console.log(`    ✅ Added display rule: ${rule.segmentType}`);
    } catch (error) {
      if (error.code === 'P2002' || error.meta?.code === '23505') {
        console.log(`    ⚠️  Display rule already exists: ${rule.segmentType}`);
      } else {
        console.error(`    ❌ Failed to add display rule for ${rule.segmentType}:`, error.message);
      }
    }
  }

  console.log('  ✅ Default segment types configured');
}

async function setupPSPrivateTerminal() {
  console.log('  Configuring PS Private Terminal...');

  try {
    // Insert PS classification rules
    const psRules = [
      { name: 'ps_sender_reserveps', pattern: '@reserveps.com', type: 'sender', priority: 25 },
      { name: 'ps_subject_upcoming_ps', pattern: 'UPCOMING: PS', type: 'subject', priority: 24 },
      { name: 'ps_keyword_ps_reservations', pattern: 'PS reservations', type: 'keyword', priority: 23 },
      { name: 'ps_keyword_the_salon', pattern: 'The Salon', type: 'keyword', priority: 22 },
      { name: 'ps_keyword_plan_to_be_at_ps', pattern: 'Plan to be at PS', type: 'keyword', priority: 21 }
    ];

    for (const rule of psRules) {
      try {
        await prisma.$executeRaw`
          INSERT INTO classification_rules (name, segment_type_name, pattern, type, priority, is_active) 
          VALUES (${rule.name}, 'private_terminal', ${rule.pattern}, ${rule.type}, ${rule.priority}, true)
        `;
        console.log(`    ✅ Added rule: ${rule.name}`);
      } catch (error) {
        if (error.code === 'P2002' || error.meta?.code === '23505') {
          console.log(`    ⚠️  Rule already exists: ${rule.name}`);
        } else {
          console.error(`    ❌ Failed to add rule ${rule.name}:`, error.message);
        }
      }
    }

    // Insert PS timezone rules
    const timezoneRules = [
      { pattern: 'PS ATL', timezone: 'America/New_York' },
      { pattern: 'PS LAX', timezone: 'America/Los_Angeles' },
      { pattern: 'PS JFK', timezone: 'America/New_York' },
      { pattern: 'PS ORD', timezone: 'America/Chicago' },
      { pattern: 'PS DFW', timezone: 'America/Chicago' },
      { pattern: 'PS MIA', timezone: 'America/New_York' },
      { pattern: 'PS SEA', timezone: 'America/Los_Angeles' }
    ];

    for (const tzRule of timezoneRules) {
      try {
        await prisma.$executeRaw`
          INSERT INTO timezone_rules (segment_type_name, location_pattern, timezone, priority) 
          VALUES ('private_terminal', ${tzRule.pattern}, ${tzRule.timezone}, 20)
        `;
        console.log(`    ✅ Added timezone rule: ${tzRule.pattern}`);
      } catch (error) {
        if (error.code === 'P2002' || error.meta?.code === '23505') {
          console.log(`    ⚠️  Timezone rule already exists: ${tzRule.pattern}`);
        } else {
          console.error(`    ❌ Failed to add timezone rule ${tzRule.pattern}:`, error.message);
        }
      }
    }

    // Create PS-specific prompt template
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
    "contact_info": "phone number or contact details"
  },
  "price": {
    "amount": null,
    "currency": null
  }
}

Parse this private terminal service confirmation email:
{{emailContent}}`;

    // Insert PS prompt template
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

    console.log('  ✅ PS Private Terminal configuration complete');
  } catch (error) {
    console.error('  ❌ Error configuring PS Private Terminal:', error);
    throw error;
  }
}

async function showSetupInstructions() {
  console.log(`
📋 MANUAL SETUP INSTRUCTIONS:

1. 🔧 UPDATE YOUR SERVER.JS:
   Add these lines to your src/server.js file:

   const adminRoutes = require('./routes/admin');
   app.use('/api/admin', adminRoutes);

2. 📱 UPDATE YOUR DASHBOARD FILES:
   Replace your public/ files with the new versions:
   - dashboard.html (with tabs)
   - dashboard.css (with admin styling)
   - admin.js (new admin functionality)
   - modals.html (admin forms)

3. 🎨 ADD NEW ROUTES FILE:
   Create src/routes/admin.js with the admin API endpoints
   (Use the admin.js file provided in the artifacts)

4. ⚡ RESTART YOUR APPLICATION:
   npm start (or your start command)

5. 🧪 TEST THE ADMIN PANEL:
   - Go to your dashboard
   - Click "Admin Panel" tab
   - Click "Refresh List" to load segment types
   - Click "Fix PS Timezone Issues" to fix existing PS segments

6. 🎯 ADD NEW SEGMENT TYPES:
   Use the admin interface to add new segment types like:
   - Rideshare (Uber, Lyft)
   - Food Delivery (DoorDash, UberEats)
   - Alternative Lodging (Airbnb, VRBO)

The admin system is now ready for use!
  `);
}

// Run setup if called directly
if (require.main === module) {
  setupAdminSystem()
    .then(() => {
      console.log('\n🎉 Setup completed successfully!');
      console.log('\nThe admin system is now ready. Follow the instructions above to complete the setup.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupAdminSystem };