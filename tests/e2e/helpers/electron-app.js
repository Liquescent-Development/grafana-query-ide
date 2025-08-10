// Helper to launch and control the Electron app for testing
const { _electron: electron } = require('playwright');
const path = require('path');
const EnhancedMockServer = require('../mocks/enhanced-mock-server');

class ElectronApp {
  constructor() {
    this.app = null;
    this.window = null;
    this.mockServer = null;
  }

  async launch(options = {}) {
    // Start mock server if enabled
    if (!options.skipMockServer) {
      this.mockServer = new EnhancedMockServer(3001);
      await this.mockServer.start();
    }
    
    // Launch Electron app
    this.app = await electron.launch({
      args: [
        path.join(__dirname, '../../../main.js'),
        '--no-sandbox', // Required for CI environments
        '--disable-dev-shm-usage', // Overcome limited resource problems
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
        // Point to mock server for testing
        TEST_MOCK_SERVER: options.skipMockServer ? '' : 'http://localhost:3001',
      },
      ...options
    });

    // Get the first window that opens
    this.window = await this.app.firstWindow();
    
    // Wait for app to be ready
    await this.window.waitForLoadState('domcontentloaded');
    
    // Enable console logging in tests
    this.window.on('console', msg => {
      if (process.env.DEBUG_TESTS) {
        console.log(`[App Console]: ${msg.text()}`);
      }
    });

    return this;
  }

  async close() {
    if (this.app) {
      await this.app.close();
      this.app = null;
      this.window = null;
    }
    
    // Stop mock server if running
    if (this.mockServer) {
      await this.mockServer.stop();
      this.mockServer = null;
    }
  }
  
  // Helper to connect to mock Grafana
  async connectToMockGrafana() {
    // Check if there's already a connection dialog open and handle password input
    const passwordDialog = await this.window.$('input[placeholder="Enter password..."]');
    if (passwordDialog) {
      await passwordDialog.fill('admin');
      await this.click('button:has-text("Connect")');
      await this.window.waitForTimeout(2000);
      return;
    }
    
    // Otherwise create new connection if needed
    const newConnectionBtn = await this.window.$('button[onclick*="showNewConnectionDialog"]');
    if (newConnectionBtn && await newConnectionBtn.isVisible()) {
      await newConnectionBtn.click();
      
      // Fill in mock server credentials
      await this.type('#connectionName', 'Test Grafana');
      await this.type('#connectionUrl', 'http://localhost:3001');
      await this.type('#connectionUsername', 'admin');
      await this.type('#connectionPassword', 'admin');
      
      // Save and connect
      await this.click('#connectionDialog .modal-footer .primary-button'); // "Save & Connect" button
      
      // Wait for connection to complete
      await this.window.waitForTimeout(2000);
    }
  }
  
  // Helper to connect to mock AI service
  async connectToMockAI(provider = 'ollama') {
    // Switch to agent view
    await this.click('[data-view="agent"]');
    
    // Open AI connection dialog
    await this.click('button[onclick*="showNewAiConnectionDialog"]');
    
    if (provider === 'ollama') {
      await this.window.selectOption('#aiProvider', 'ollama');
      await this.type('#aiConnectionName', 'Test Ollama');
      await this.type('#aiEndpoint', 'http://localhost:3001');
      await this.window.selectOption('#aiModel', 'llama3.1:8b');
    } else {
      await this.window.selectOption('#aiProvider', 'openai');
      await this.type('#aiConnectionName', 'Test OpenAI');
      await this.type('#aiApiKey', 'test-api-key-123');
    }
    
    // Save connection
    await this.click('.modal-footer .primary-button'); // "Save & Connect" button
    
    // Wait and connect
    await this.window.waitForTimeout(1000);
    const aiConnectionItem = await this.window.$('.ai-connection-item');
    if (aiConnectionItem) {
      await aiConnectionItem.click();
    }
  }

  // Helper to take screenshots
  async screenshot(name) {
    if (this.window) {
      await this.window.screenshot({ 
        path: `tests/e2e/screenshots/${name}.png`,
        fullPage: true 
      });
    }
  }

  // Helper to get window/page for direct Playwright operations
  getWindow() {
    return this.window;
  }

  // Helper to evaluate code in the Electron main process
  async evaluate(fn, ...args) {
    return await this.app.evaluate(fn, ...args);
  }

  // Helper to evaluate code in the renderer process
  async evaluateInRenderer(fn, ...args) {
    return await this.window.evaluate(fn, ...args);
  }

  // Wait for a specific element to be visible
  async waitForElement(selector, options = {}) {
    return await this.window.waitForSelector(selector, {
      state: 'visible',
      timeout: 10000,
      ...options
    });
  }

  // Click an element
  async click(selector) {
    await this.waitForElement(selector);
    await this.window.click(selector);
  }

  // Type text into an input
  async type(selector, text) {
    await this.waitForElement(selector);
    await this.window.fill(selector, text);
  }

  // Get element text
  async getText(selector) {
    await this.waitForElement(selector);
    return await this.window.textContent(selector);
  }

  // Check if element exists
  async exists(selector) {
    const element = await this.window.$(selector);
    return element !== null;
  }

  // Wait for navigation
  async waitForNavigation(options = {}) {
    return await this.window.waitForLoadState('networkidle', options);
  }
}

module.exports = ElectronApp;