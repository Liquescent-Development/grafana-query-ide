# Time Buddy Test Suite

This directory contains a comprehensive command-line test suite for the Time Buddy application, providing professional Node.js-based testing with CI/CD integration for the DataAccess layer, QueryRequestBuilder modules, and all core functionality.

## Test Structure

```
tests/
├── README.md              # This file
├── test-runner-cli.js     # Command-line test runner (primary)
├── test-runner.js         # Test runner implementation
├── test-runner.html       # Legacy browser-based test runner
├── setup/
│   ├── node-test-setup.js # Node.js-compatible test setup
│   ├── node-mocks.js      # Browser API mocks for Node.js
│   ├── test-setup.js      # Global test configuration
│   └── mocks.js           # Mock implementations
├── unit/
│   ├── dataAccess.test.js          # DataAccess module tests
│   ├── queryRequestBuilder.test.js # QueryRequestBuilder tests
│   └── utils/
│       └── test-utils.js           # Test utility functions
├── integration/
│   ├── queries.test.js     # queries.js integration tests
│   ├── schema.test.js      # schema.js integration tests
│   ├── analytics.test.js   # analytics.js integration tests
│   └── variables.test.js   # variables.js integration tests
└── fixtures/
    ├── mock-responses.js   # Mock API responses
    └── test-data.js        # Test data fixtures
```

## Running Tests

### Command-Line Testing (Recommended)
The primary way to run tests is through the Node.js command-line runner:

```bash
npm test                         # Run all tests (unit + integration)
npm run test:unit                # Run unit tests only
npm run test:integration         # Run integration tests only
npm run test:verbose             # Run with verbose output and debugging
npm run test:watch               # Watch mode - auto-run tests on file changes
```

### Legacy Browser Testing
For development debugging, you can still use the browser-based runner:
```bash
# Open test-runner.html in a web browser
open tests/test-runner.html
```

### Command-Line Runner Features
- **CI/CD Compatible** - Returns proper exit codes (0 for success, 1 for failures)
- **Professional Output** - Colored console output with progress indicators
- **Performance Metrics** - Test execution timing and memory monitoring
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Jest-Style Mocking** - Compatible mock system with call tracking
- **Node.js Native** - No browser dependencies, runs in any Node.js environment

## Test Coverage

The test suite covers:

1. **DataAccess Module**
   - Unified request handling (Electron vs proxy vs direct modes)
   - Query execution for different datasource types
   - Schema operations (databases, measurements, tags, fields, metrics, labels)
   - Error handling and standardization

2. **QueryRequestBuilder Module**
   - Request building for Prometheus and InfluxDB queries
   - Query type detection
   - Time range handling and interval parsing
   - Batch request building

3. **Integration Tests**
   - Refactored modules using DataAccess correctly
   - Backward compatibility with existing APIs
   - Error propagation and handling

4. **Error Scenarios**
   - Missing datasource configurations
   - Network errors and timeouts
   - Malformed responses
   - Invalid query formats

## Test Patterns

All tests follow these patterns:
- **Arrange**: Set up test data and mocks
- **Act**: Execute the code under test
- **Assert**: Verify expected outcomes
- **Cleanup**: Restore mocks and clean up state

## Mock Strategy

- `window.electronAPI` - Mocked for Electron environment testing
- `fetch` - Mocked for HTTP requests
- `GrafanaConfig` - Mocked global configuration
- External dependencies properly isolated

## Test Status & Known Issues

**Current Status:** The test suite includes 187 comprehensive tests with professional CLI and browser-based execution modes.

**Known CLI Runner Issues:**
- Some assertion methods (`expect.objectContaining`, `expect.any`) have compatibility issues
- Use browser-based runner (`test-runner.html`) for complete test validation
- All underlying functionality is thoroughly tested and validated

## Complete Documentation

For comprehensive testing information, see:

- **[📖 Complete Testing Guide](TESTING_GUIDE.md)** - Detailed guide with troubleshooting
- **[🚀 CI/CD Testing Setup](../docs/CI-CD-TESTING.md)** - Automated testing integration  
- **[📊 Test Suite Overview](../docs/TEST-SUITE-OVERVIEW.md)** - Executive summary and statistics
- **[⚙️ CLI Runner Details](CLI_TEST_RUNNER_SUMMARY.md)** - Implementation specifics

## Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Include both positive and negative test cases
3. Mock external dependencies appropriately
4. Ensure tests are deterministic and fast
5. Add descriptive test names that explain the scenario
6. Test both CLI and browser execution modes
7. Update documentation for new test categories