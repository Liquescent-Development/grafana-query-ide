#!/usr/bin/env node

/**
 * Simple script to check and clean test data from Time Buddy
 * This version doesn't require Electron, just reports what would be cleaned
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Find the Time Buddy user data directory
const appName = 'time-buddy';
let userDataPath;

if (process.platform === 'darwin') {
  userDataPath = path.join(os.homedir(), 'Library', 'Application Support', appName);
} else if (process.platform === 'win32') {
  userDataPath = path.join(process.env.APPDATA, appName);
} else {
  userDataPath = path.join(os.homedir(), '.config', appName);
}

const localStoragePath = path.join(userDataPath, 'Local Storage', 'leveldb');

console.log('📍 Checking Time Buddy data at:', userDataPath);

if (!fs.existsSync(localStoragePath)) {
  console.log('ℹ️  No Time Buddy data found. Your environment is clean!');
  process.exit(0);
}

// Note: Actually reading LevelDB requires special libraries
// This script just informs the user about the cleanup command
console.log(`
🧹 To clean test data from Time Buddy:

1. Close Time Buddy if it's running
2. Run: npm run clean:test-data

This will:
- Remove test connections (localhost:3001)
- Remove connections with "Test" or "Mock" in the name
- Preserve your real Grafana and AI connections

Your data directory: ${userDataPath}
`);

// Also check for .test-data directory
const testDataDir = path.join(__dirname, '../.test-data');
if (fs.existsSync(testDataDir)) {
  console.log('📁 Found E2E test data directory: .test-data/');
  console.log('   This is isolated from your main config and can be safely deleted.');
  
  // Optionally remove it
  if (process.argv.includes('--remove-test-dir')) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
    console.log('   ✅ Removed .test-data directory');
  } else {
    console.log('   Run with --remove-test-dir to delete it');
  }
}