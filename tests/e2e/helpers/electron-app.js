// Helper to launch and control the Electron app for testing
const { _electron: electron } = require('playwright');
const path = require('path');

class ElectronApp {
  constructor() {
    this.app = null;
    this.window = null;
  }

  async launch(options = {}) {
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