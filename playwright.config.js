// Playwright configuration for Time Buddy E2E tests
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Parallel execution
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports' }],
    ['list']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL for testing
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for Electron app testing
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.e2e\.spec\.js/,
      use: {
        // We'll configure this to launch Electron
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Output folder for test artifacts
  outputDir: 'tests/e2e/test-results/',
});