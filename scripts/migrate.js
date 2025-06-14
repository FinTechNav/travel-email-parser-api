#!/usr/bin/env node
// Force Prisma migrations to use DATABASE_URL (transaction pooler)
// Remove DIRECT_URL from environment for migration commands only
const originalDirectUrl = process.env.DIRECT_URL;
delete process.env.DIRECT_URL;

console.log('🎯 Running Prisma migration with transaction pooler...');
console.log('📍 Using DATABASE_URL (port 6543)');

const { spawn } = require('child_process');
const args = process.argv.slice(2);

// Default to 'migrate status' if no args provided
const command = args.length > 0 ? args : ['migrate', 'status'];

const migrate = spawn('npx', ['prisma', ...command], { 
  stdio: 'inherit',
  env: process.env 
});

migrate.on('close', (code) => {
  // Restore DIRECT_URL after migration closes
  if (originalDirectUrl) {
    process.env.DIRECT_URL = originalDirectUrl;
  }
  process.exit(code);
});

migrate.on('error', (error) => {
  console.error('Migration process error:', error);
  // Restore DIRECT_URL on error
  if (originalDirectUrl) {
    process.env.DIRECT_URL = originalDirectUrl;
  }
  process.exit(1);
});