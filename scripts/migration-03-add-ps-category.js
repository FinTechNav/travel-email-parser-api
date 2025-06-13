// scripts/migration-03-add-ps-category.js
// Migration #3: Add PS Private Terminal Category and Fix Misclassified Data

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function runPSCategoryMigration() {
  console.log('🚀 Starting Migration #3: Add PS Private Terminal Category');
  console.log('=====================================');

  try {
    // Step 1: Add PS classification rules with higher priority than flight rules
    console.log('\n📝 Step 1: Adding PS classification rules...');
    await addPSClassificationRules();

    // Step 2: Add PS parsing prompt template
    console.log('\n📝 Step 2: Adding PS parsing prompt template...');
    await addPSParsingPrompt();

    // Step 3: Add PS to valid email types configuration
    console.log('\n📝 Step 3: Updating email processing configuration...');
    await updateEmailProcessingConfig();

    // Step 4: Add PS sender rules
    console.log('\n📝 Step 4: Adding PS sender rules...');
    await addPSSenderRules();

    // Step 5: Migrate existing misclassified PS segments
    console.log('\n📝 Step 5: Migrating existing misclassified PS segments...');
    await migrateMisclassifiedPSSegments();

    // Step 6: Update validation rules for private_terminal type
    console.log('\n📝 Step 6: Updating validation configuration...');
    await updateValidationRules();

    // Step 7: Create PS subject patterns for email reprocessing
    console.log('\n📝 Step 7: Adding PS subject patterns...');
    await addPSSubjectPatterns();

    console.log('\n✅ Migration #3 completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Added private_terminal category with 5 classification rules');
    console.log('- Created PS-specific parsing prompt template');
    console.log('- Updated validation and processing configuration');
    console.log('- Added PS sender rules for reserveps.com');
    console.log('- Migrated existing misclassified PS segments');
    console.log('- Added subject patterns for email reprocessing');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Step 1: Add PS Classification Rules
async function addPSClassificationRules() {
  const psRules = [
    {
      name: 'ps_sender_reserveps',
      emailType: 'private_terminal',
      ruleType: 'sender_domain',
      pattern: '@reserveps.com',
      priority: 25, // Highest priority to catch before flight rules
      metadata: {
        description: 'PS Reservations official sender domain',
        trustLevel: 'high'
      }
    },
    {
      name: 'ps_subject_upcoming_ps',
      emailType: 'private_terminal',
      ruleType: 'subject_pattern',
      pattern: 'UPCOMING: PS',
      priority: 24,
      metadata: {
        description: 'PS booking confirmation subject pattern'
      }
    },
    {
      name: 'ps_keyword_ps_reservations',
      emailType: 'private_terminal',
      ruleType: 'keyword',
      pattern: 'PS Reservations',
      priority: 23,
      metadata: {
        description: 'PS company name in email content'
      }
    },
    {
      name: 'ps_keyword_the_salon',
      emailType: 'private_terminal',
      ruleType: 'keyword',
      pattern: 'The Salon',
      priority: 22,
      metadata: {
        description: 'PS premium experience service name'
      }
    },
    {
      name: 'ps_keyword_plan_to_be_at_ps',
      emailType: 'private_terminal',
      ruleType: 'keyword',
      pattern: 'Plan to be at PS no later than',
      priority: 21,
      metadata: {
        description: 'PS arrival instruction pattern'
      }
    },
    {
      name: 'ps_keyword_private_tsa',
      emailType: 'private_terminal',
      ruleType: 'keyword',
      pattern: 'private TSA screening',
      priority: 20,
      metadata: {
        description: 'PS private security screening reference'
      }
    }
  ];

  let createdCount = 0;
  for (const rule of psRules) {
    try {
      // Check if rule already exists
      const existing = await prisma.emailClassificationRule.findUnique({
        where: { name: rule.name }
      });

      if (!existing) {
        await prisma.emailClassificationRule.create({ data: rule });
        createdCount++;
        console.log(`  ✅ Created classification rule: ${rule.name}`);
      } else {
        console.log(`  ⚠️  Rule already exists: ${rule.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to create rule ${rule.name}:`, error.message);
    }
  }

  console.log(`\n📊 Created ${createdCount} new PS classification rules`);
}

// Step 2: Add PS Parsing Prompt Template
async function addPSParsingPrompt() {
  const psPrompt = {
    name: 'email_parsing_private_terminal',
    category: 'parsing',
    type: 'private_terminal',
    version: 1,
    isActive: true,
    prompt: `You are an expert private terminal service email parser. Extract information about the PRIVATE TERMINAL BOOKING, not the flight details mentioned.

CRITICAL: This email is for a PRIVATE TERMINAL SERVICE that provides premium airport access before a flight. Extract the terminal service details, NOT the flight information.

IMPORTANT RULES:
1. Focus on the private terminal service booking (PS, private terminal, premium lounge access)
2. Extract arrival time at the terminal facility (when customer should arrive at PS)
3. The flight information mentioned is the ASSOCIATED FLIGHT, not the primary booking
4. Convert times to 24-hour format (HH:MM)
5. Look for terminal facility addresses and instructions

Return this EXACT JSON structure:
{
  "type": "private_terminal",
  "confirmation_number": "PS reservation number (not flight confirmation)",
  "passenger_name": "primary passenger name",
  "service_details": {
    "facility_name": "PS ATL, PS LAX, etc.",
    "experience_type": "The Salon, The Studio, etc.",
    "arrival_time": "when to arrive at PS facility (YYYY-MM-DD HH:MM)",
    "service_type": "departure or arrival service",
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
  "location": {
    "facility_address": "physical address of PS facility",
    "arrival_instructions": "how to arrive at facility",
    "contact_info": "phone number or contact details"
  },
  "additional_services": {
    "luggage_handling": "description of luggage service",
    "ground_transportation": "arrival method (Uber, taxi, etc.)",
    "special_instructions": "any special notes or requirements"
  }
}

TIMING VALIDATION:
- Private terminal arrival should be 30 minutes to 3 hours before flight departure
- If timing seems wrong, double-check the email for arrival instructions

Parse this private terminal service confirmation email:
{{emailContent}}`
  };

  try {
    // Check if prompt already exists
    const existing = await prisma.promptTemplate.findUnique({
      where: { name: psPrompt.name }
    });

    if (!existing) {
      await prisma.promptTemplate.create({ data: psPrompt });
      console.log('  ✅ Created PS parsing prompt template');
    } else {
      console.log('  ⚠️  PS parsing prompt already exists');
    }
  } catch (error) {
    console.error('  ❌ Failed to create PS parsing prompt:', error.message);
  }
}

// Step 3: Update Email Processing Configuration
async function updateEmailProcessingConfig() {
  const configs = [
    {
      category: 'validation',
      key: 'valid_email_types',
      value: [
        'flight',
        'hotel', 
        'car_rental',
        'train',
        'cruise',
        'restaurant',
        'event',
        'private_terminal', // ADD THIS
        'other'
      ],
      description: 'List of valid email types including private terminal services'
    },
    {
      category: 'validation',
      key: 'private_terminal_timing',
      value: {
        min_arrival_minutes_before_flight: 30,
        max_arrival_minutes_before_flight: 180,
        default_service_duration_minutes: 90
      },
      description: 'Timing validation rules for private terminal services'
    },
    {
      category: 'parsing',
      key: 'private_terminal_keywords',
      value: [
        'PS Reservations',
        'private terminal',
        'The Salon',
        'The Studio', 
        'private TSA',
        'Plan to be at PS',
        'reserveps.com',
        'premium terminal',
        'private departure'
      ],
      description: 'Keywords that indicate private terminal services'
    }
  ];

  for (const config of configs) {
    try {
      await prisma.emailProcessingConfig.upsert({
        where: {
          category_key: {
            category: config.category,
            key: config.key
          }
        },
        update: {
          value: config.value,
          description: config.description,
          updatedAt: new Date()
        },
        create: config
      });
      console.log(`  ✅ Updated config: ${config.category}.${config.key}`);
    } catch (error) {
      console.error(`  ❌ Failed to update config ${config.category}.${config.key}:`, error.message);
    }
  }
}

// Step 4: Add PS Sender Rules
async function addPSSenderRules() {
  const senderRules = [
    {
      name: 'ps_reservations_official',
      senderPattern: '@reserveps.com',
      emailType: 'private_terminal',
      trustLevel: 'trusted',
      metadata: {
        description: 'Official PS Reservations email domain',
        processingPreferences: {
          skipSpamCheck: true,
          priorityProcessing: true,
          autoClassify: true
        }
      }
    },
    {
      name: 'ps_member_services',
      senderPattern: 'memberservices@reserveps.com',
      emailType: 'private_terminal', 
      trustLevel: 'trusted',
      metadata: {
        description: 'PS member services specific address',
        processingPreferences: {
          skipSpamCheck: true,
          priorityProcessing: true,
          autoClassify: true
        }
      }
    }
  ];

  for (const rule of senderRules) {
    try {
      const existing = await prisma.emailSenderRule.findUnique({
        where: { name: rule.name }
      });

      if (!existing) {
        await prisma.emailSenderRule.create({ data: rule });
        console.log(`  ✅ Created sender rule: ${rule.name}`);
      } else {
        console.log(`  ⚠️  Sender rule already exists: ${rule.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to create sender rule ${rule.name}:`, error.message);
    }
  }
}

// Step 5: Migrate Existing Misclassified PS Segments
async function migrateMisclassifiedPSSegments() {
  console.log('  🔍 Searching for misclassified PS segments...');

  // Find segments that should be private_terminal but are classified as flight
  const misclassifiedSegments = await prisma.segment.findMany({
    where: {
      type: 'flight',
      OR: [
        // Look for segments with PS-related content in rawEmail
        {
          rawEmail: {
            contains: 'PS Reservations'
          }
        },
        {
          rawEmail: {
            contains: '@reserveps.com'
          }
        },
        {
          rawEmail: {
            contains: 'UPCOMING: PS'
          }
        },
        {
          rawEmail: {
            contains: 'The Salon'
          }
        },
        {
          rawEmail: {
            contains: 'Plan to be at PS no later than'
          }
        }
      ]
    },
    include: {
      itinerary: true
    }
  });

  console.log(`  📊 Found ${misclassifiedSegments.length} potentially misclassified segments`);

  let migratedCount = 0;
  let emailsMarkedForReprocessing = 0;

  for (const segment of misclassifiedSegments) {
    try {
      console.log(`  🔄 Processing segment ${segment.id}...`);

      // Mark the email as unprocessed for reprocessing
      if (segment.rawEmail) {
        await markEmailAsUnprocessed(segment.rawEmail);
        emailsMarkedForReprocessing++;
        console.log(`    ✅ Marked email for reprocessing`);
      }

      // Delete the misclassified segment - it will be recreated when email is reprocessed
      await prisma.segment.delete({
        where: { id: segment.id }
      });

      migratedCount++;
      console.log(`    ✅ Deleted misclassified segment for reprocessing`);

    } catch (error) {
      console.error(`    ❌ Failed to migrate segment ${segment.id}:`, error.message);
    }
  }

  console.log(`\n📊 Migration summary:`);
  console.log(`  - Segments deleted for reprocessing: ${migratedCount}`);
  console.log(`  - Emails marked for reprocessing: ${emailsMarkedForReprocessing}`);
  console.log(`  - These emails will be automatically reclassified as private_terminal when reprocessed`);
}

// Helper function to mark email as unprocessed
async function markEmailAsUnprocessed(rawEmail) {
  try {
    // Extract subject from raw email
    let specificSubject = null;
    const subjectMatch = rawEmail.match(/Subject:\s*(.+?)(?:\r?\n|\r)/);
    if (subjectMatch) {
      specificSubject = subjectMatch[1].trim();
    }

    if (!specificSubject) {
      console.log('    ⚠️  No subject found in email, skipping unmark');
      return;
    }

    // Create hash of email content for matching
    const emailHash = crypto
      .createHash('sha256')
      .update(rawEmail.trim())
      .digest('hex');

    // Find and delete the processed email record
    const deletedEmail = await prisma.processedEmail.deleteMany({
      where: { emailHash }
    });

    if (deletedEmail.count > 0) {
      console.log(`    ✅ Unmarked email: "${specificSubject.substring(0, 50)}..."`);
    } else {
      console.log(`    ⚠️  Email not found in processed emails: "${specificSubject.substring(0, 50)}..."`);
    }

  } catch (error) {
    console.error('    ❌ Error unmarking email:', error.message);
  }
}

// Step 6: Update Validation Rules
async function updateValidationRules() {
  const validationConfig = {
    category: 'validation',
    key: 'time_ranges',
    value: {
      hotel: {
        check_in: { min: 14, max: 18 },
        check_out: { min: 10, max: 12 }
      },
      car_rental: {
        pickup: { min: 6, max: 22 },
        return: { min: 6, max: 22 }
      },
      private_terminal: { // ADD NEW VALIDATION
        arrival: { min: 6, max: 22 }, // Can arrive 6 AM to 10 PM
        service_duration: { min: 30, max: 180 } // 30 min to 3 hours before flight
      }
    },
    description: 'Time validation ranges for different travel service types'
  };

  try {
    await prisma.emailProcessingConfig.upsert({
      where: {
        category_key: {
          category: validationConfig.category,
          key: validationConfig.key
        }
      },
      update: {
        value: validationConfig.value,
        description: validationConfig.description,
        updatedAt: new Date()
      },
      create: validationConfig
    });
    console.log('  ✅ Updated time validation rules for private_terminal');
  } catch (error) {
    console.error('  ❌ Failed to update validation rules:', error.message);
  }
}

// Step 7: Add PS Subject Patterns
async function addPSSubjectPatterns() {
  const subjectPatterns = [
    {
      name: 'ps_upcoming_pattern',
      emailType: 'private_terminal',
      pattern: 'UPCOMING: PS',
      variations: [
        'UPCOMING: PS |',
        'PS | Zita Dione Jensen',
        'ATL to AUS',
        'UPCOMING: PS | [Name] -'
      ]
    },
    {
      name: 'ps_confirmation_pattern', 
      emailType: 'private_terminal',
      pattern: 'PS Reservation Confirmation',
      variations: [
        'PS Reservation',
        'Reservation Confirmation',
        'PS Confirmation'
      ]
    },
    {
      name: 'ps_welcome_pattern',
      emailType: 'private_terminal', 
      pattern: 'Welcome to PS',
      variations: [
        'We look forward to welcoming you to PS',
        'Welcome to PS ATL',
        'Welcome to PS LAX'
      ]
    }
  ];

  for (const pattern of subjectPatterns) {
    try {
      const existing = await prisma.emailSubjectPattern.findUnique({
        where: { name: pattern.name }
      });

      if (!existing) {
        await prisma.emailSubjectPattern.create({ data: pattern });
        console.log(`  ✅ Created subject pattern: ${pattern.name}`);
      } else {
        console.log(`  ⚠️  Subject pattern already exists: ${pattern.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to create subject pattern ${pattern.name}:`, error.message);
    }
  }
}

// Export for use in other scripts
module.exports = {
  runPSCategoryMigration,
  addPSClassificationRules,
  addPSParsingPrompt,
  updateEmailProcessingConfig,
  addPSSenderRules,
  migrateMisclassifiedPSSegments
};

// Run migration if called directly
if (require.main === module) {
  runPSCategoryMigration()
    .then(() => {
      console.log('\n🎉 PS Category Migration completed successfully!');
      console.log('\n💡 Next steps:');
      console.log('1. Restart your application to pick up new validation rules');
      console.log('2. Monitor email processing to see PS emails correctly classified');
      console.log('3. Check that existing PS emails are reprocessed correctly');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}