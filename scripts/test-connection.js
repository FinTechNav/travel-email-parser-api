#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('🔍 Testing database connections...\n');
  
  // Test 1: Regular connection (DATABASE_URL)
  console.log('1️⃣ Testing DATABASE_URL (port 6543)...');
  const prismaRegular = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  try {
    await prismaRegular.$connect();
    const result = await prismaRegular.$queryRaw`SELECT NOW() as current_time, version() as postgres_version`;
    console.log('✅ DATABASE_URL connection successful!');
    console.log('📊 Server time:', result[0].current_time);
    console.log('🐘 PostgreSQL version:', result[0].postgres_version.split(' ')[0]);
    await prismaRegular.$disconnect();
  } catch (error) {
    console.log('❌ DATABASE_URL connection failed:');
    console.log('Error:', error.message);
    if (error.code) console.log('Error code:', error.code);
  }
  
  console.log('\n' + '─'.repeat(50) + '\n');
  
  // Test 2: Direct URL connection (DIRECT_URL)
  console.log('2️⃣ Testing DIRECT_URL (port 5432)...');
  const prismaDirect = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL
      }
    }
  });
  
  try {
    await prismaDirect.$connect();
    const result = await prismaDirect.$queryRaw`SELECT NOW() as current_time, version() as postgres_version`;
    console.log('✅ DIRECT_URL connection successful!');
    console.log('📊 Server time:', result[0].current_time);
    console.log('🐘 PostgreSQL version:', result[0].postgres_version.split(' ')[0]);
    await prismaDirect.$disconnect();
  } catch (error) {
    console.log('❌ DIRECT_URL connection failed:');
    console.log('Error:', error.message);
    if (error.code) console.log('Error code:', error.code);
  }
  
  console.log('\n🎯 Connection test complete!');
}

testConnection().catch(console.error);