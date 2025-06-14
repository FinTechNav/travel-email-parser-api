#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');

const prisma = new PrismaClient();

// Identify tables by their column signatures
const TABLE_SIGNATURES = {
  users: ['id', 'email', 'password', 'api_key'],
  itineraries: ['id', 'user_id', 'trip_name'],
  segments: ['id', 'itinerary_id', 'type', 'confirmation_number'],
  api_usage: ['id', 'user_id', 'endpoint', 'requests_count'],
  processed_emails: ['id', 'email_hash', 'message_id', 'user_id'],
  prompt_templates: ['id', 'name', 'category', 'prompt', 'version'],
  ai_configurations: ['id', 'name', 'model', 'temperature'],
  prompt_usage: ['id', 'template_id', 'user_id', 'email_type', 'success'],
  email_classification_rules: ['id', 'name', 'email_type', 'rule_type', 'pattern'],
  email_subject_patterns: ['id', 'name', 'email_type', 'pattern', 'variations'],
  email_processing_config: ['id', 'category', 'key', 'value'],
  email_sender_rules: ['id', 'name', 'sender_pattern', 'trust_level'],
  segment_type_configs: ['id', 'name', 'display_name'],
  classification_rules: ['id', 'name', 'segment_type_name', 'pattern'],
  timezone_rules: ['id', 'segment_type_name', 'location_pattern', 'timezone'],
  display_rules: ['id', 'segment_type_name', 'primary_time_field']
};

// Map table names to Prisma model names
const PRISMA_MODEL_MAP = {
  users: 'user',
  itineraries: 'itinerary', 
  segments: 'segment',
  api_usage: 'apiUsage',
  processed_emails: 'processedEmail',
  prompt_templates: 'promptTemplate',
  ai_configurations: 'aIConfiguration',
  prompt_usage: 'promptUsage',
  email_classification_rules: 'emailClassificationRule',
  email_subject_patterns: 'emailSubjectPattern',
  email_processing_config: 'emailProcessingConfig',
  email_sender_rules: 'emailSenderRule',
  segment_type_configs: 'segmentTypeConfig',
  classification_rules: 'classificationRule',
  timezone_rules: 'timezoneRule',
  display_rules: 'displayRule'
};

// Order matters for foreign key relationships
const SEEDING_ORDER = [
  'users',
  'segment_type_configs',
  'itineraries',
  'segments',
  'api_usage',
  'processed_emails',
  'prompt_templates',
  'ai_configurations',
  'prompt_usage',
  'email_classification_rules',
  'email_subject_patterns',
  'email_processing_config',
  'email_sender_rules',
  'classification_rules',
  'timezone_rules',
  'display_rules'
];

async function identifyTable(filePath) {
  console.log(`🔍 Analyzing ${path.basename(filePath)}...`);
  
  const csvContent = await fs.readFile(filePath, 'utf8');
  const result = Papa.parse(csvContent, {
    header: true,
    preview: 1 // Just read the header
  });
  
  if (result.errors.length > 0) {
    console.warn(`⚠️  Parsing errors in ${path.basename(filePath)}:`, result.errors);
  }
  
  const headers = result.meta.fields.map(h => h.trim().toLowerCase());
  console.log(`📋 Headers: ${headers.join(', ')}`);
  
  // Special handling for specific patterns
  if (headers.includes('variations') && headers.includes('email_type') && headers.includes('pattern')) {
    console.log(`✅ Identified as: email_subject_patterns (pattern match)`);
    return 'email_subject_patterns';
  }
  
  // Try to match table by signature
  for (const [tableName, signature] of Object.entries(TABLE_SIGNATURES)) {
    const matchingHeaders = signature.filter(col => headers.includes(col));
    const matchPercentage = matchingHeaders.length / signature.length;
    
    if (matchPercentage >= 0.75) { // 75% match threshold
      console.log(`✅ Identified as: ${tableName} (${Math.round(matchPercentage * 100)}% match)`);
      return tableName;
    }
  }
  
  console.log(`❓ Could not identify table type`);
  return null;
}

async function analyzeAllCSVs(csvFolderPath) {
  console.log('🔍 Analyzing CSV files to identify tables...\n');
  
  const files = await fs.readdir(csvFolderPath);
  const csvFiles = files.filter(file => file.endsWith('.csv')).sort((a, b) => {
    // Sort numerically: 1.csv, 2.csv, ..., 11.csv
    const numA = parseInt(a.split('.')[0]);
    const numB = parseInt(b.split('.')[0]);
    return numA - numB;
  });
  
  const fileTableMap = {};
  
  for (const csvFile of csvFiles) {
    const filePath = path.join(csvFolderPath, csvFile);
    const tableName = await identifyTable(filePath);
    if (tableName) {
      fileTableMap[csvFile] = tableName;
    }
    console.log(''); // Add spacing
  }
  
  console.log('📊 File to Table Mapping:');
  for (const [file, table] of Object.entries(fileTableMap)) {
    console.log(`  ${file} → ${table}`);
  }
  console.log('');
  
  return fileTableMap;
}

async function readCSVFile(filePath) {
  console.log(`📄 Reading ${path.basename(filePath)}...`);
  
  const csvContent = await fs.readFile(filePath, 'utf8');
  
  const result = Papa.parse(csvContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      // Clean up headers - remove quotes and whitespace
      return header.trim().replace(/['"]/g, '');
    },
    transform: (value, header) => {
      // Handle empty strings and nulls
      if (value === '' || value === 'NULL' || value === null || value === 'null') {
        return null;
      }
      
      // Handle JSON fields
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }
      
      // Handle boolean strings
      if (value === 'true') return true;
      if (value === 'false') return false;
      
      // Handle numeric strings for specific fields
      if (header && typeof value === 'string') {
        // Convert numeric fields
        if (['success_rate', 'usage_count', 'version', 'priority', 'response_time', 'token_usage'].includes(header)) {
          const num = parseFloat(value);
          return isNaN(num) ? null : num;
        }
      }
      
      return value;
    }
  });

  if (result.errors.length > 0) {
    console.warn(`⚠️  Parsing warnings for ${path.basename(filePath)}:`, result.errors);
  }

  console.log(`✅ Parsed ${result.data.length} records from ${path.basename(filePath)}`);
  return result.data;
}

async function seedTable(csvFile, tableName, data) {
  const modelName = PRISMA_MODEL_MAP[tableName];
  
  if (!modelName) {
    console.warn(`⚠️  No model mapping found for table ${tableName}, skipping...`);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`📭 No data in ${csvFile} (${tableName}), skipping...`);
    return;
  }

  console.log(`🌱 Seeding ${modelName} (${tableName}) with ${data.length} records...`);

  try {
    // Handle different models with their specific requirements
    if (tableName === 'users') {
      // Users table
      for (const record of data) {
        await prisma.user.create({
          data: {
            id: record.id,
            email: record.email,
            name: record.name,
            password: record.password,
            apiKey: record.api_key,
            createdAt: record.created_at ? new Date(record.created_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date()
          }
        });
      }
    } else if (tableName === 'itineraries') {
      // Itineraries table
      for (const record of data) {
        await prisma.itinerary.create({
          data: {
            id: record.id,
            userId: record.user_id,
            tripName: record.trip_name,
            startDate: record.start_date ? new Date(record.start_date) : null,
            endDate: record.end_date ? new Date(record.end_date) : null,
            destination: record.destination,
            createdAt: record.created_at ? new Date(record.created_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date()
          }
        });
      }
    } else if (tableName === 'segments') {
      // Segments table
      for (const record of data) {
        await prisma.segment.create({
          data: {
            id: record.id,
            itineraryId: record.itinerary_id,
            type: record.type,
            confirmationNumber: record.confirmation_number,
            startDateTime: record.start_date_time ? new Date(record.start_date_time) : null,
            endDateTime: record.end_date_time ? new Date(record.end_date_time) : null,
            origin: record.origin,
            destination: record.destination,
            details: record.details,
            rawEmail: record.raw_email,
            parsedAt: record.parsed_at ? new Date(record.parsed_at) : new Date()
          }
        });
      }
    } else if (tableName === 'api_usage') {
      // API Usage table
      for (const record of data) {
        await prisma.apiUsage.create({
          data: {
            id: record.id,
            userId: record.user_id,
            endpoint: record.endpoint,
            requestsCount: record.requests_count || 1,
            date: record.date ? new Date(record.date) : new Date()
          }
        });
      }
    } else if (tableName === 'processed_emails') {
      // Processed Emails table
      for (const record of data) {
        await prisma.processedEmail.create({
          data: {
            id: record.id,
            emailHash: record.email_hash,
            messageId: record.message_id,
            subject: record.subject,
            fromAddress: record.from_address,
            userId: record.user_id,
            processedAt: record.processed_at ? new Date(record.processed_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date(),
            success: record.success || false,
            source: record.source || 'email_polling'
          }
        });
      }
    } else if (tableName === 'segment_type_configs') {
      // Segment Type Configs table - handle field mapping
      for (const record of data) {
        await prisma.segmentTypeConfig.create({
          data: {
            id: record.id,
            name: record.name,
            displayName: record.display_name, // Map snake_case to camelCase
            description: record.description,
            isActive: record.is_active,
            defaultTimezone: record.default_timezone,
            displayConfig: record.display_config,
            createdAt: record.created_at ? new Date(record.created_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date()
          }
        });
      }
    } else if (tableName === 'classification_rules') {
      // Classification Rules table
      for (const record of data) {
        await prisma.classificationRule.create({
          data: {
            id: record.id,
            name: record.name,
            segmentTypeName: record.segment_type_name,
            pattern: record.pattern,
            type: record.type,
            priority: record.priority,
            isActive: record.is_active,
            createdAt: record.created_at ? new Date(record.created_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date()
          }
        });
      }
    } else if (tableName === 'timezone_rules') {
      // Timezone Rules table
      for (const record of data) {
        await prisma.timezoneRule.create({
          data: {
            id: record.id,
            segmentTypeName: record.segment_type_name,
            locationPattern: record.location_pattern,
            timezone: record.timezone,
            priority: record.priority,
            createdAt: record.created_at ? new Date(record.created_at) : new Date()
          }
        });
      }
    } else if (tableName === 'display_rules') {
      // Display Rules table
      for (const record of data) {
        await prisma.displayRule.create({
          data: {
            id: record.id,
            segmentTypeName: record.segment_type_name,
            primaryTimeField: record.primary_time_field,
            timezoneSource: record.timezone_source,
            routeFormat: record.route_format,
            customFields: record.custom_fields,
            createdAt: record.created_at ? new Date(record.created_at) : new Date()
          }
        });
      }
    } else if (tableName === 'prompt_templates') {
      // Prompt Templates table
      for (const record of data) {
        await prisma.promptTemplate.create({
          data: {
            id: record.id,
            name: record.name,
            category: record.category,
            type: record.type,
            version: record.version || 1,
            prompt: record.prompt,
            variables: record.variables,
            isActive: record.is_active !== null ? record.is_active : true,
            metadata: record.metadata,
            createdAt: record.created_at ? new Date(record.created_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date(),
            createdBy: record.created_by,
            testGroup: record.test_group,
            successRate: record.success_rate, // Should be null or Float now
            usageCount: record.usage_count || 0,
            segmentTypeName: record.segment_type_name
          }
        });
      }
    } else if (tableName === 'email_classification_rules') {
      // Email Classification Rules table
      for (const record of data) {
        await prisma.emailClassificationRule.create({
          data: {
            id: record.id,
            name: record.name,
            emailType: record.email_type,
            ruleType: record.rule_type,
            pattern: record.pattern,
            priority: record.priority,
            isActive: record.is_active,
            caseInsensitive: record.case_insensitive,
            metadata: record.metadata,
            createdAt: record.created_at ? new Date(record.created_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date(),
            createdBy: record.created_by
          }
        });
      }
    } else if (tableName === 'email_subject_patterns') {
      // Email Subject Patterns table
      for (const record of data) {
        await prisma.emailSubjectPattern.create({
          data: {
            id: record.id,
            name: record.name,
            emailType: record.email_type,
            pattern: record.pattern,
            variations: record.variations,
            isActive: record.is_active,
            createdAt: record.created_at ? new Date(record.created_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date()
          }
        });
      }
    } else if (tableName === 'email_processing_config') {
      // Email Processing Config table
      for (const record of data) {
        await prisma.emailProcessingConfig.create({
          data: {
            id: record.id,
            category: record.category,
            key: record.key,
            value: record.value,
            description: record.description,
            isActive: record.is_active,
            createdAt: record.created_at ? new Date(record.created_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date()
          }
        });
      }
    } else if (tableName === 'email_sender_rules') {
      // Email Sender Rules table  
      for (const record of data) {
        await prisma.emailSenderRule.create({
          data: {
            id: record.id,
            name: record.name,
            senderPattern: record.sender_pattern,
            emailType: record.email_type,
            trustLevel: record.trust_level,
            isActive: record.is_active,
            metadata: record.metadata,
            createdAt: record.created_at ? new Date(record.created_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date()
          }
        });
      }
    } else if (tableName === 'prompt_usage') {
      // Prompt Usage table
      for (const record of data) {
        await prisma.promptUsage.create({
          data: {
            id: record.id,
            templateId: record.template_id,
            userId: record.user_id,
            emailType: record.email_type,
            success: record.success,
            errorMessage: record.error_message,
            responseTime: record.response_time,
            tokenUsage: record.token_usage,
            createdAt: record.created_at ? new Date(record.created_at) : new Date()
          }
        });
      }
    } else {
      // For other tables, use createMany for bulk insert
      const modelMethod = prisma[modelName];
      if (modelMethod && modelMethod.createMany) {
        await modelMethod.createMany({
          data: data,
          skipDuplicates: true
        });
      } else {
        console.warn(`⚠️  Model ${modelName} not found in Prisma client`);
        return;
      }
    }

    console.log(`✅ Successfully seeded ${modelName} with ${data.length} records`);
    
  } catch (error) {
    console.error(`❌ Error seeding ${modelName}:`, error.message);
    
    // Show first few characters of problematic data for debugging
    if (data.length > 0) {
      console.log(`🔍 Sample data:`, JSON.stringify(data[0], null, 2));
    }
    
    throw error;
  }
}

async function seedDatabase(csvFolderPath) {
  console.log('🚀 Starting database seeding from numbered CSV files...\n');
  
  try {
    // Step 1: Analyze and identify all CSV files
    const fileTableMap = await analyzeAllCSVs(csvFolderPath);
    
    if (Object.keys(fileTableMap).length === 0) {
      throw new Error('No tables could be identified from CSV files');
    }

    // Step 2: Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    
    // Delete in reverse order to handle foreign keys
    const deleteOrder = [...SEEDING_ORDER].reverse();
    for (const tableName of deleteOrder) {
      const modelName = PRISMA_MODEL_MAP[tableName];
      if (modelName && prisma[modelName]) {
        try {
          await prisma[modelName].deleteMany({});
          console.log(`🗑️  Cleared ${modelName}`);
        } catch (error) {
          console.log(`⚠️  Could not clear ${modelName}: ${error.message}`);
        }
      }
    }
    console.log('');

    // Step 3: Seed tables in the correct order
    for (const tableName of SEEDING_ORDER) {
      // Find the CSV file for this table
      const csvFile = Object.keys(fileTableMap).find(file => fileTableMap[file] === tableName);
      
      if (csvFile) {
        const filePath = path.join(csvFolderPath, csvFile);
        const data = await readCSVFile(filePath);
        await seedTable(csvFile, tableName, data);
        console.log(''); // Add spacing between tables
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    
    // Show summary
    console.log('\n📊 Database Summary:');
    for (const tableName of SEEDING_ORDER) {
      const modelName = PRISMA_MODEL_MAP[tableName];
      if (modelName && prisma[modelName] && prisma[modelName].count) {
        try {
          const count = await prisma[modelName].count();
          console.log(`  ${modelName}: ${count} records`);
        } catch (error) {
          console.log(`  ${modelName}: Could not count records`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  const csvFolderPath = process.argv[2];
  
  if (!csvFolderPath) {
    console.error('❌ Please provide the path to your CSV folder');
    console.log('Usage: node scripts/seed-from-csv.js /path/to/csv/folder');
    process.exit(1);
  }

  await seedDatabase(csvFolderPath);
}

// Handle errors
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

module.exports = { seedDatabase };