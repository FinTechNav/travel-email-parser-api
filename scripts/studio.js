#!/usr/bin/env node
// Force Prisma Studio to use DATABASE_URL (transaction pooler)
// Remove DIRECT_URL from environment for Studio only
const originalDirectUrl = process.env.DIRECT_URL;
delete process.env.DIRECT_URL;

console.log('🎯 Starting Prisma Studio with transaction pooler...');
console.log('📍 Using DATABASE_URL (port 6543)');

const { spawn } = require('child_process');
const studio = spawn('npx', ['prisma', 'studio'], { 
  stdio: 'inherit',
  env: process.env 
});

studio.on('close', (code) => {
  // Restore DIRECT_URL after Studio closes
  if (originalDirectUrl) {
    process.env.DIRECT_URL = originalDirectUrl;
  }
  process.exit(code);
});