// scripts/setup-admin-system.js
// Complete setup script for the new admin system

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

    // Step 2: Insert PS Private Terminal configuration
    console.log('🏢 Step 2: Setting up PS Private Terminal configuration...');
    await setupPSPrivateTerminal();

    // Step 3: Update server routes
    console.log('🔧 Step 3: Updating server configuration...');
    await updateServerRoutes();

    // Step 4: Replace dashboard
    console.log('📱 Step 4: Updating dashboard...');
    await updateDashboard();

    // Step 5: Update email processor
    console.log('⚡ Step 5: Updating email processor...');
    await updateEmailProcessor();

    console.log('\n✅ Admin System Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Restart your application server');
    console.log('2. Navigate to the dashboard and click the "Admin Panel" tab');
    console.log('3. Use "Fix PS Timezone Issues" to fix existing PS segments');
    console.log('4. Test creating new segment types via the admin interface');
    console.log('\n🎯 Key Features Now Available:');
    console.log('✅ Dynamic segment type management');
    console.log('✅ Classification rule configuration via UI');
    console.log('✅ AI prompt template management');
    console.log('✅ Timezone rule configuration');
    console.log('✅ One-click fixes for common issues');
    console.log('✅ Segment reprocessing capabilities');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createDatabaseSchema() {
  console.log('  Creating admin tables...');

  // Create the database schema
  await prisma.$executeRawUnsafe(`
    -- Segment Type Configuration Table
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

  await prisma.$executeRawUnsafe(`
    -- Classification Rules Table
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

  await prisma.$executeRawUnsafe(`
    -- Timezone Rules Table
    CREATE TABLE IF NOT EXISTS timezone_rules (
        id SERIAL PRIMARY KEY,
        segment_type_name VARCHAR(50) REFERENCES segment_type_configs(name) ON DELETE CASCADE,
        location_pattern VARCHAR(100) NOT NULL,
        timezone VARCHAR(50) NOT NULL,
        priority INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    -- Display Rules Table  
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

  // Add foreign key to existing prompt_templates table
  await prisma.$executeRawUnsafe(`
    ALTER TABLE prompt_templates 
    ADD COLUMN IF NOT EXISTS segment_type_name VARCHAR(50);
  `);

  console.log('  ✅ Database schema created');
}

async function setupPSPrivateTerminal() {
  // Insert default segment types
  await prisma.$executeRawUnsafe(`
    INSERT INTO segment_type_configs (name, display_name, description, default_timezone) VALUES
    ('flight', 'Flight', 'Commercial airline flights', 'America/New_York'),
    ('hotel', 'Hotel', 'Hotel reservations and accommodations', 'America/New_York'),
    ('car_rental', 'Car Rental', 'Vehicle rental services', 'America/New_York'),
    ('train', 'Train', 'Rail transportation', 'America/New_York'),
    ('cruise', 'Cruise', 'Cruise ship reservations', 'America/New_York'),
    ('restaurant', 'Restaurant', 'Restaurant reservations', 'America/New_York'),
    ('event', 'Event', 'Entertainment and event tickets', 'America/New_York'),
    ('private_terminal', 'Private Terminal', 'Premium airport terminal services', 'America/New_York'),
    ('other', 'Other', 'Miscellaneous travel services', 'America/New_York')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Insert PS classification rules
  await prisma.$executeRawUnsafe(`
    INSERT INTO classification_rules (name, segment_type_name, pattern, type, priority, is_active) VALUES
    ('ps_sender_reserveps', 'private_terminal', '@reserveps.com', 'sender', 25, true),
    ('ps_subject_upcoming_ps', 'private_terminal', 'UPCOMING: PS', 'subject', 24, true),
    ('ps_keyword_ps_reservations', 'private_terminal', 'PS reservations', 'keyword', 23, true),
    ('ps_keyword_the_salon', 'private_terminal', 'The Salon', 'keyword', 22, true),
    ('ps_keyword_plan_to_be_at_ps', 'private_terminal', 'Plan to be at PS', 'keyword', 21, true)
    ON CONFLICT DO NOTHING;
  `);

  // Insert PS timezone rules
  await prisma.$executeRawUnsafe(`
    INSERT INTO timezone_rules (segment_type_name, location_pattern, timezone, priority) VALUES
    ('private_terminal', 'PS ATL', 'America/New_York', 20),
    ('private_terminal', 'PS LAX', 'America/Los_Angeles', 20),
    ('private_terminal', 'PS JFK', 'America/New_York', 20),
    ('private_terminal', 'PS ORD', 'America/Chicago', 20),
    ('private_terminal', 'PS DFW', 'America/Chicago', 20),
    ('private_terminal', 'PS MIA', 'America/New_York', 20),
    ('private_terminal', 'PS SEA', 'America/Los_Angeles', 20)
    ON CONFLICT DO NOTHING;
  `);

  // Insert display rules
  await prisma.$executeRawUnsafe(`
    INSERT INTO display_rules (segment_type_name, primary_time_field, timezone_source, route_format) VALUES
    ('private_terminal', 'departure', 'origin', '{origin} → {destination}'),
    ('flight', 'departure', 'origin', '{origin} → {destination}'),
    ('hotel', 'departure', 'destination', '{destination}'),
    ('car_rental', 'departure', 'origin', '{origin}')
    ON CONFLICT DO NOTHING;
  `);

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
    "arrival_note": "Plan to arrive at PS no later than [TIME]",
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
      version: 1,
      isActive: true,
      segmentTypeName: 'private_terminal'
    },
    create: {
      name: 'email_parsing_private_terminal',
      category: 'parsing',
      type: 'private_terminal',
      version: 1,
      isActive: true,
      prompt: psPrompt,
      segmentTypeName: 'private_terminal'
    }
  });

  console.log('  ✅ PS Private Terminal configuration complete');
}

async function updateServerRoutes() {
  const serverPath = path.join(process.cwd(), 'src', 'server.js');
  
  try {
    const serverContent = await fs.readFile(serverPath, 'utf8');
    
    // Check if admin routes are already added
    if (serverContent.includes('/api/admin')) {
      console.log('  ⚠️  Admin routes already configured');
      return;
    }

    // Add admin routes
    const adminRouteImport = "const adminRoutes = require('./routes/admin');\n";
    const adminRouteUse = "app.use('/api/admin', adminRoutes);\n";

    let updatedContent = serverContent;
    
    // Add import after other route imports
    if (updatedContent.includes("require('./routes/")) {
      const lastRequireIndex = updatedContent.lastIndexOf("require('./routes/");
      const endOfLine = updatedContent.indexOf('\n', lastRequireIndex);
      updatedContent = updatedContent.slice(0, endOfLine + 1) + adminRouteImport + updatedContent.slice(endOfLine + 1);
    }

    // Add route usage
    if (updatedContent.includes("app.use('/api/")) {
      const lastAppUseIndex = updatedContent.lastIndexOf("app.use('/api/");
      const endOfLine = updatedContent.indexOf('\n', lastAppUseIndex);
      updatedContent = updatedContent.slice(0, endOfLine + 1) + adminRouteUse + updatedContent.slice(endOfLine + 1);
    }

    await fs.writeFile(serverPath, updatedContent);
    console.log('  ✅ Server routes updated');
    
  } catch (error) {
    console.log('  ⚠️  Could not automatically update server.js. Please manually add:');
    console.log("    const adminRoutes = require('./routes/admin');");
    console.log("    app.use('/api/admin', adminRoutes);");
  }
}

async function updateDashboard() {
  const dashboardPath = path.join(process.cwd(), 'public', 'dashboard.html');
  
  try {
    // Copy the new dashboard HTML from the artifact
    console.log('  📱 Dashboard will be updated - please replace your dashboard.html with the new version');
    console.log('  📱 The new dashboard includes the Admin Panel tab');
  } catch (error) {
    console.log('  ⚠️  Could not automatically update dashboard. Please use the updated dashboard.html from the artifacts');
  }
}

async function updateEmailProcessor() {
  const processorPath = path.join(process.cwd(), 'src', 'services', 'emailProcessor.js');
  
  try {
    // Create backup
    const backupPath = processorPath + '.backup';
    const content = await fs.readFile(processorPath, 'utf8');
    await fs.writeFile(backupPath, content);
    
    console.log('  ⚠️  Email processor backup created at emailProcessor.js.backup');
    console.log('  ⚠️  Please replace your emailProcessor.js with the new dynamicEmailProcessor.js');
    console.log('  ⚠️  Or update your existing processor to use: const { processEmail } = require("./dynamicEmailProcessor");');
    
  } catch (error) {
    console.log('  ⚠️  Could not backup email processor. Please manually update to use dynamic configuration');
  }
}

// Run setup if called directly
if (require.main === module) {
  setupAdminSystem()
    .then(() => {
      console.log('\n🎉 Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupAdminSystem };