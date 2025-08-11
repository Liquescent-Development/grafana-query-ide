# Time Buddy End-to-End Tests

This directory contains end-to-end tests for the Time Buddy Electron application using Playwright.

## Setup

The tests are already configured. Just run:

```bash
npm install
```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests with visible browser (headed mode)
```bash
npm run test:e2e:headed
```

### Debug tests interactively
```bash
npm run test:e2e:debug
```

### Use Playwright Test UI
```bash
npm run test:e2e:ui
```

### View test report
```bash
npm run test:e2e:report
```

## Test Structure

```
tests/e2e/
├── helpers/
│   └── electron-app.js              # Helper class for Electron app control
├── mocks/
│   └── mock-server.js               # Mock Grafana/AI server for testing
├── connection.e2e.spec.js           # Connection management tests (UI only)
├── query-editor.e2e.spec.js         # Query editor functionality tests (UI only)
├── navigation.e2e.spec.js           # Navigation and UI tests (UI only)
├── query-execution.integration.spec.js # Integration tests with mock server
├── reports/                         # Test reports (generated)
├── screenshots/                     # Test screenshots (generated)
└── test-results/                    # Test artifacts (generated)
```

## Mock Server

The E2E tests use a mock server that simulates Grafana and AI services. This allows tests to:
- Run without real Grafana or AI services
- Work consistently in CI/CD pipelines
- Test full query execution flow
- Validate data visualization

### Mock Server Features

The mock server (`mocks/mock-server.js`) provides:

**Grafana API Endpoints:**
- `/api/user` - Authentication with test credentials (admin/admin)
- `/api/datasources` - Returns mock InfluxDB and Prometheus datasources
- `/api/ds/query` - Simulates query execution with mock data
- `/api/datasources/proxy/:id/query` - Schema queries (SHOW DATABASES, etc.)
- `/api/search` - Dashboard search results

**AI Service Endpoints:**
- `/api/tags` - Ollama model list
- `/api/generate` - Ollama text generation
- `/v1/chat/completions` - OpenAI-compatible chat API

### Using the Mock Server

The mock server starts automatically when running E2E tests. To disable it:

```javascript
test('my test without mock', async () => {
  const app = new ElectronApp();
  await app.launch({ skipMockServer: true });
  // Test code
});
```

### Helper Methods for Mock Connections

```javascript
// Connect to mock Grafana
await app.connectToMockGrafana();

// Connect to mock AI service
await app.connectToMockAI('ollama'); // or 'openai'
```

## Test Categories

### Connection Tests (`connection.e2e.spec.js`)
- Verifies disconnected state on startup
- Tests Grafana connection creation/deletion
- Tests AI connection management
- Ensures no auto-connection behavior

### Query Editor Tests (`query-editor.e2e.spec.js`)
- Tab management (create, close, switch)
- CodeMirror editor functionality
- Query type switching (InfluxQL/PromQL)
- Execute button state management

### Navigation Tests (`navigation.e2e.spec.js`)
- Activity bar navigation
- Sidebar view switching
- Panel management
- Keyboard shortcuts
- Resizable panels

## Writing New Tests

1. Create a new `*.e2e.spec.js` file in the `tests/e2e` directory
2. Import the ElectronApp helper:
   ```javascript
   const { test, expect } = require('@playwright/test');
   const ElectronApp = require('./helpers/electron-app');
   ```
3. Use the helper methods for common operations:
   ```javascript
   test('my test', async () => {
     const app = new ElectronApp();
     await app.launch();
     
     // Your test code
     await app.click('#myButton');
     const text = await app.getText('#myElement');
     expect(text).toBe('Expected Text');
     
     await app.close();
   });
   ```

## Helper Methods

The `ElectronApp` class provides these convenience methods:

- `launch()` - Start the Electron app
- `close()` - Close the app
- `click(selector)` - Click an element
- `type(selector, text)` - Type text into an input
- `getText(selector)` - Get element text content
- `exists(selector)` - Check if element exists
- `waitForElement(selector)` - Wait for element to appear
- `screenshot(name)` - Take a screenshot
- `getWindow()` - Get the Playwright page object for advanced operations

## Debugging Tips

1. Use `test:e2e:debug` to step through tests
2. Add `await app.screenshot('debug-step-1')` to capture state
3. Check `tests/e2e/test-results/` for failure artifacts
4. Enable console logging with `DEBUG_TESTS=1 npm run test:e2e`

## CI/CD Integration

The tests are configured to:
- Retry failed tests 2 times on CI
- Generate HTML reports
- Capture screenshots on failure
- Record videos on failure
- Save trace files for debugging

## Known Limitations

- Tests require the Electron app to build successfully
- Some tests may need mock data or services
- File system operations may vary by platform
- Native dialogs cannot be easily automated

## Troubleshooting

### Tests fail to launch app
- Ensure `npm install` has been run
- Check that `main.js` exists in the project root
- Verify Electron is properly installed

### Tests are flaky
- Increase timeout values in `playwright.config.js`
- Add more explicit waits using `waitForElement()`
- Check for race conditions in async operations

### Cannot find elements
- Use the Playwright Inspector: `npx playwright test --debug`
- Verify selectors using browser DevTools
- Check if elements are in shadow DOM or iframes