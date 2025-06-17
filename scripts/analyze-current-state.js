// scripts/analyze-current-state.js
const { PrismaClient } = require('@prisma/client');

async function analyzeCurrentState() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Analyzing Travel Email Parser Current State...\n');
  
  try {
    // 1. Check data volumes
    const dataCounts = await Promise.allSettled([
      prisma.user.count(),
      prisma.itinerary.count(),
      prisma.segment.count(),
      prisma.segmentTypeConfig.count(),
      prisma.classificationRule.count(),
      prisma.promptTemplate.count(),
      prisma.processedEmail.count()
    ]);

    console.log('📊 Data Volume Analysis:');
    const tableNames = ['users', 'itineraries', 'segments', 'segmentTypeConfigs', 'classificationRules', 'promptTemplates', 'processedEmails'];
    dataCounts.forEach((result, index) => {
      const count = result.status === 'fulfilled' ? result.value : 'ERROR';
      console.log(`  ${tableNames[index]}: ${count} records`);
    });

    // 2. Check for naming inconsistencies
    console.log('\n🔤 Naming Convention Analysis:');
    
    // Check users table fields
    const sampleUser = await prisma.user.findFirst();
    if (sampleUser) {
      const userFields = Object.keys(sampleUser);
      console.log(`  User fields: ${userFields.join(', ')}`);
      
      // Check for mixed naming
      const hasCamelCase = userFields.some(f => /[a-z][A-Z]/.test(f));
      const hasSnakeCase = userFields.some(f => f.includes('_'));
      console.log(`  Mixed naming detected: camelCase=${hasCamelCase}, snake_case=${hasSnakeCase}`);
    }

    // 3. Check segment types and rules
    console.log('\n🔧 Configuration Analysis:');
    const segmentTypes = await prisma.segmentTypeConfig.findMany({
      include: {
        classification_rules: true
      }
    });
    
    console.log(`  Active segment types: ${segmentTypes.length}`);
    segmentTypes.forEach(type => {
      console.log(`    ${type.name}: ${type.classification_rules?.length || 0} rules`);
    });

    // 4. Check for recent activity
    console.log('\n📈 Recent Activity:');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentActivity = await Promise.allSettled([
      prisma.segment.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.processedEmail.count({ where: { processedAt: { gte: oneDayAgo } } })
    ]);

    console.log(`  Segments created (24h): ${recentActivity[0].status === 'fulfilled' ? recentActivity[0].value : 'ERROR'}`);
    console.log(`  Emails processed (24h): ${recentActivity[1].status === 'fulfilled' ? recentActivity[1].value : 'ERROR'}`);

    // 5. Check for potential issues
    console.log('\n⚠️  Potential Issues:');
    
    // First, let's check what fields exist in the segment table
    const sampleSegment = await prisma.segment.findFirst();
    console.log('  Sample segment fields:', sampleSegment ? Object.keys(sampleSegment) : 'No segments found');
    
    // Try different possible field names for the itinerary relationship
    let orphanedSegments = 0;
    try {
      // Try itineraryId (camelCase)
      orphanedSegments = await prisma.segment.count({
        where: { itineraryId: null }
      });
      console.log(`✅ Checked for orphaned segments using 'itineraryId'`);
    } catch (error1) {
      try {
        // Try itinerary_id (snake_case)
        orphanedSegments = await prisma.segment.count({
          where: { itinerary_id: null }
        });
        console.log(`✅ Checked for orphaned segments using 'itinerary_id'`);
      } catch (error2) {
        console.log(`❌ Could not check orphaned segments - field name unclear`);
        console.log(`   Error 1 (itineraryId): ${error1.message.split('\n')[0]}`);
        console.log(`   Error 2 (itinerary_id): ${error2.message.split('\n')[0]}`);
      }
    }
    
    if (orphanedSegments > 0) {
      console.log(`❌ Found ${orphanedSegments} orphaned segments (no itinerary)`);
    } else {
      console.log(`✅ No orphaned segments found`);
    }

    // Check for missing API keys
    let usersWithoutApiKey = 0;
    try {
      usersWithoutApiKey = await prisma.user.count({
        where: { 
          OR: [
            { apiKey: null },
            { apiKey: '' }
          ]
        }
      });
    } catch (error) {
      console.log(`❌ Could not check API keys: ${error.message.split('\n')[0]}`);
    }
    
    if (usersWithoutApiKey > 0) {
      console.log(`❌ Found ${usersWithoutApiKey} users without API keys`);
    } else {
      console.log(`✅ All users have API keys`);
    }

    // Check for inactive segment types with active rules
    let inactiveTypesWithRules = 0;
    try {
      inactiveTypesWithRules = await prisma.segmentTypeConfig.count({
        where: {
          is_active: false,
          classification_rules: {
            some: { is_active: true }
          }
        }
      });
    } catch (error) {
      console.log(`❌ Could not check inactive types with rules: ${error.message.split('\n')[0]}`);
    }
    
    if (inactiveTypesWithRules > 0) {
      console.log(`❌ Found ${inactiveTypesWithRules} inactive segment types with active rules`);
    } else {
      console.log(`✅ No inactive segment types with active rules`);
    }

    // Check for segments without valid types
    let segmentsWithInvalidTypes = 0;
    try {
      segmentsWithInvalidTypes = await prisma.segment.count({
        where: {
          type: {
            notIn: segmentTypes.map(st => st.name)
          }
        }
      });
    } catch (error) {
      console.log(`❌ Could not check invalid segment types: ${error.message.split('\n')[0]}`);
    }
    
    if (segmentsWithInvalidTypes > 0) {
      console.log(`❌ Found ${segmentsWithInvalidTypes} segments with invalid types`);
    } else {
      console.log(`✅ All segments have valid types`);
    }

    // 6. Migration readiness assessment
    console.log('\n✅ Migration Readiness Assessment:');
    
    const totalRecords = dataCounts
      .filter(result => result.status === 'fulfilled')
      .reduce((sum, result) => sum + result.value, 0);
    
    console.log(`  Total records to migrate: ${totalRecords}`);
    console.log(`  Data complexity: ${totalRecords > 10000 ? 'HIGH' : totalRecords > 1000 ? 'MEDIUM' : 'LOW'}`);
    console.log(`  Estimated migration time: ${totalRecords > 10000 ? '2-4 hours' : totalRecords > 1000 ? '30-60 minutes' : '5-15 minutes'}`);
    
    const hasRecentActivity = recentActivity.some(result => 
      result.status === 'fulfilled' && result.value > 0
    );
    
    console.log(`  Active system: ${hasRecentActivity ? 'YES - Consider maintenance window' : 'NO - Safe to migrate'}`);

    // 7. Schema analysis
    console.log('\n🏗️  Schema Analysis:');
    
    // Check if we have the expected tables
    const expectedTables = [
      'user', 'itinerary', 'segment', 'segmentTypeConfig', 
      'classificationRule', 'promptTemplate', 'processedEmail'
    ];
    
    console.log(`  Expected core tables: ${expectedTables.length}`);
    console.log(`  All tables accessible: ${dataCounts.every(result => result.status === 'fulfilled') ? 'YES' : 'NO'}`);

    // Show actual data from segment to understand structure
    if (sampleSegment) {
      console.log(`  Sample segment structure:`);
      Object.keys(sampleSegment).forEach(key => {
        const value = sampleSegment[key];
        const type = typeof value;
        const preview = type === 'string' ? `"${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"` : value;
        console.log(`    ${key}: ${type} = ${preview}`);
      });
    }

    // 8. Recommended next steps
    console.log('\n🎯 Recommended Next Steps:');
    
    if (totalRecords < 100) {
      console.log('  📊 LOW DATA VOLUME DETECTED (PERFECT FOR SIMPLIFIED APPROACH):');
      console.log('  1. ✅ SKIP complex database migration - data is minimal');
      console.log('  2. 🚀 Focus on frontend refactoring (3,500-line admin.js)');
      console.log('  3. 💾 Simple backup: pg_dump travel_parser_dev > backup.sql');
      console.log('  4. 📤 Manual export if needed: pgAdmin → Export CSV');
      console.log('  5. 🎯 Prioritize: Modular admin panel for faster development');
    } else {
      console.log('  📊 SIGNIFICANT DATA VOLUME:');
      console.log('  1. Create database backup using pgAdmin');
      console.log('  2. Export current schema: npx prisma db pull --print > backup_schema.prisma');
      console.log('  3. Create new schema file with consistent naming');
      console.log('  4. Run migration in test environment first');
      console.log('  5. Validate data integrity after migration');
    }

    return {
      totalRecords,
      hasRecentActivity,
      complexity: totalRecords > 10000 ? 'HIGH' : totalRecords > 1000 ? 'MEDIUM' : 'LOW',
      issues: {
        orphanedSegments,
        usersWithoutApiKey,
        inactiveTypesWithRules,
        segmentsWithInvalidTypes
      },
      sampleSegmentFields: sampleSegment ? Object.keys(sampleSegment) : []
    };

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
if (require.main === module) {
  analyzeCurrentState()
    .then(results => {
      console.log('\n🎉 Analysis complete!');
      console.log('\n📋 Summary:', JSON.stringify(results, null, 2));
      
      // Clear migration recommendation based on data volume
      console.log('\n💡 CLEAR MIGRATION RECOMMENDATION:');
      if (results.totalRecords < 100) {
        console.log('  🚨 RECOMMENDATION: SKIP DATABASE MIGRATION ENTIRELY');
        console.log('  🎯 INSTEAD: Focus on frontend architecture (admin.js refactoring)');
        console.log('  📊 REASON: Only ' + results.totalRecords + ' total records - migration overhead not justified');
        console.log('  ⚡ BENEFIT: Start improving development speed TODAY');
        console.log('  🔧 ACTION: Begin modularizing the 3,500-line admin.js file');
      } else {
        console.log('  → PROCEED WITH PLANNED MIGRATION');
        console.log('  → Significant data volume requires careful migration');
      }
    })
    .catch(error => {
      console.error('Failed to analyze current state:', error);
      process.exit(1);
    });
}

module.exports = analyzeCurrentState;