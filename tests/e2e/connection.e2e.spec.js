// End-to-end tests for connection management
const { test, expect } = require('@playwright/test');
const ElectronApp = require('./helpers/electron-app');

let app;

test.beforeEach(async () => {
  app = new ElectronApp();
  await app.launch();
});

test.afterEach(async () => {
  await app.close();
});

test.describe('Connection Management', () => {
  test('should start with disconnected state', async () => {
    // Check title bar shows not connected
    const grafanaStatus = await app.getText('#titleBarConnectionStatus');
    expect(grafanaStatus).toBe('Not Connected');
    
    const aiStatus = await app.getText('#titleBarAiStatus');
    expect(aiStatus).toBe('AI: Not Connected');
    
    // Check connection panel shows empty state
    const connectionPanel = await app.exists('.connection-list .empty-state');
    expect(connectionPanel).toBe(true);
  });

  test('should open new connection dialog', async () => {
    // Click new connection button
    await app.click('button[onclick*="showNewConnectionDialog"]');
    
    // Check dialog is visible
    const dialog = await app.waitForElement('#connectionDialog');
    expect(dialog).toBeTruthy();
    
    // Check form fields are present
    const nameField = await app.exists('#connectionName');
    const urlField = await app.exists('#connectionUrl');
    const usernameField = await app.exists('#connectionUsername');
    const passwordField = await app.exists('#connectionPassword');
    
    expect(nameField).toBe(true);
    expect(urlField).toBe(true);
    expect(usernameField).toBe(true);
    expect(passwordField).toBe(true);
  });

  test('should validate connection form', async () => {
    // Open dialog
    await app.click('button[onclick*="showNewConnectionDialog"]');
    
    // Try to save without filling fields
    await app.click('.modal-footer .primary-button');
    
    // Should show validation error (check if form prevents submission)
    const dialog = await app.exists('#connectionDialog');
    expect(dialog).toBe(true); // Dialog should still be open
  });

  test('should save a new connection', async () => {
    // Open dialog
    await app.click('button[onclick*="showNewConnectionDialog"]');
    
    // Fill in connection details
    await app.type('#connectionName', 'Test Grafana');
    await app.type('#connectionUrl', 'http://localhost:3000');
    await app.type('#connectionUsername', 'admin');
    await app.type('#connectionPassword', 'admin');
    
    // Save connection
    await app.click('#saveConnectionBtn');
    
    // Wait for connection to appear in list
    await app.waitForElement('.connection-item');
    
    // Check connection appears in list
    const connectionName = await app.getText('.connection-item div[style*="font-weight: 500"]');
    expect(connectionName).toContain('Test Grafana');
  });

  test('should delete a connection', async () => {
    // First create a connection
    await app.click('button[onclick*="showNewConnectionDialog"]');
    await app.type('#connectionName', 'Test Delete');
    await app.type('#connectionUrl', 'http://localhost:3000');
    await app.type('#connectionUsername', 'admin');
    await app.type('#connectionPassword', 'admin');
    await app.click('#saveConnectionBtn');
    
    // Wait for connection to appear
    await app.waitForElement('.connection-item');
    
    // Click delete button
    await app.click('.delete-connection-btn');
    
    // Confirm deletion in dialog
    const window = app.getWindow();
    window.on('dialog', dialog => dialog.accept());
    
    // Check connection is removed
    const connectionExists = await app.exists('.connection-item');
    expect(connectionExists).toBe(false);
  });
});

test.describe('AI Connection Management', () => {
  test('should show AI connections panel', async () => {
    // Switch to agent view
    await app.click('[data-view="agent"]');
    
    // Check AI connections section exists
    const aiPanel = await app.waitForElement('#aiConnectionList');
    expect(aiPanel).toBeTruthy();
  });

  test('should open new AI connection dialog', async () => {
    // Switch to agent view
    await app.click('[data-view="agent"]');
    
    // Click new AI connection button
    await app.click('button[onclick*="showNewAiConnectionDialog"]');
    
    // Check dialog is visible
    const dialog = await app.waitForElement('#aiConnectionDialog');
    expect(dialog).toBeTruthy();
    
    // Check provider selector
    const providerSelect = await app.exists('#aiProvider');
    expect(providerSelect).toBe(true);
  });

  test('should switch between AI providers', async () => {
    // Switch to agent view
    await app.click('[data-view="agent"]');
    
    // Open dialog
    await app.click('button[onclick*="showNewAiConnectionDialog"]');
    
    // Select OpenAI
    const window = app.getWindow();
    await window.selectOption('#aiProvider', 'openai');
    
    // Check OpenAI fields are visible
    const apiKeyField = await app.exists('#openaiApiKey');
    expect(apiKeyField).toBe(true);
    
    // Switch to Ollama
    await window.selectOption('#aiProvider', 'ollama');
    
    // Check Ollama fields are visible
    const endpointField = await app.exists('#ollamaEndpoint');
    expect(endpointField).toBe(true);
  });

  test('should not auto-connect to AI on startup', async () => {
    // AI status should remain disconnected
    const aiStatus = await app.getText('#titleBarAiStatus');
    expect(aiStatus).toBe('AI: Not Connected');
    
    // Switch to agent view
    await app.click('[data-view="agent"]');
    
    // Check no connections are marked as connected
    const window = app.getWindow();
    const connectedItems = await window.$$('.ai-connection-item.connected');
    expect(connectedItems.length).toBe(0);
  });
});