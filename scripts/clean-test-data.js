#!/usr/bin/env node

/**
 * Script to clean up test data from localStorage
 * Run this if E2E tests have polluted your development environment
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Suppress IPC errors that aren't relevant for cleanup
process.on('uncaughtException', (err) => {
  if (!err.message.includes('get-ai-avatar')) {
    console.error('Unexpected error:', err);
  }
});

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js')
    }
  });

  await win.loadFile(path.join(__dirname, '../public/index.html'));

  // Clean test data from localStorage
  await win.webContents.executeJavaScript(`
    (() => {
      console.log('Cleaning test data from localStorage...');
      
      // Get current connections
      const connections = JSON.parse(localStorage.getItem('grafanaConnections') || '[]');
      const aiConnections = JSON.parse(localStorage.getItem('AI_CONNECTIONS') || '[]');
      
      // Filter out test connections
      const filteredConnections = connections.filter(conn => 
        !conn.url?.includes('localhost:3001') && 
        !conn.name?.includes('Test ') &&
        !conn.name?.includes('Mock ')
      );
      
      const filteredAiConnections = aiConnections.filter(conn => 
        !conn.endpoint?.includes('localhost:3001') && 
        !conn.name?.includes('Test ') &&
        !conn.name?.includes('Mock ')
      );
      
      // Report what was cleaned
      const removedGrafana = connections.length - filteredConnections.length;
      const removedAI = aiConnections.length - filteredAiConnections.length;
      
      console.log(\`Removed \${removedGrafana} test Grafana connections\`);
      console.log(\`Removed \${removedAI} test AI connections\`);
      
      // Update localStorage
      localStorage.setItem('grafanaConnections', JSON.stringify(filteredConnections));
      localStorage.setItem('AI_CONNECTIONS', JSON.stringify(filteredAiConnections));
      
      // Clear any test-related active connections
      const activeConnection = localStorage.getItem('ACTIVE_AI_CONNECTION');
      if (activeConnection && (activeConnection.includes('test') || activeConnection.includes('mock'))) {
        localStorage.removeItem('ACTIVE_AI_CONNECTION');
        console.log('Cleared test active AI connection');
      }
      
      return {
        removedGrafana,
        removedAI,
        remainingGrafana: filteredConnections.length,
        remainingAI: filteredAiConnections.length
      };
    })()
  `).then(result => {
    console.log('✅ Test data cleaned successfully!');
    console.log(`   Removed ${result.removedGrafana} test Grafana connections`);
    console.log(`   Removed ${result.removedAI} test AI connections`);
    console.log(`   Remaining: ${result.remainingGrafana} Grafana, ${result.remainingAI} AI connections`);
    app.quit();
  }).catch(err => {
    console.error('❌ Error cleaning test data:', err);
    app.quit();
    process.exit(1);
  });
});

app.on('window-all-closed', () => {
  app.quit();
});