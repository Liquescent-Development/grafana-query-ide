#!/usr/bin/env node

// Command-line Test Runner for Time Buddy
// Provides comprehensive testing without browser dependencies

const fs = require('fs');
const path = require('path');
const util = require('util');
const { execSync } = require('child_process');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

class CLITestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0
        };
        this.currentSuite = null;
        this.startTime = null;
        this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
        this.testType = this.getTestType();
        this.currentTestType = 'unit'; // Default test type for describe blocks
        this.setupGlobals();
    }

    createJestMock(implementation) {
        const mockFn = function(...args) {
            mockFn.calls.push(args);
            let result;
            if (implementation) {
                result = implementation.apply(this, args);
                // Handle both sync and async implementations
                if (result && typeof result.then === 'function') {
                    return result.then(res => {
                        mockFn.results.push({
                            type: 'return',
                            value: res
                        });
                        return res;
                    });
                }
            }
            mockFn.results.push({
                type: 'return',
                value: result
            });
            return result;
        };
        
        mockFn.calls = [];
        mockFn.results = [];
        mockFn.mockImplementation = function(newImplementation) {
            implementation = newImplementation;
            return mockFn;
        };
        mockFn.mockReturnValue = function(value) {
            implementation = () => value;
            return mockFn;
        };
        mockFn.mockResolvedValue = function(value) {
            implementation = () => Promise.resolve(value);
            return mockFn;
        };
        mockFn.mockRejectedValue = function(error) {
            implementation = () => Promise.reject(error);
            return mockFn;
        };
        mockFn.mockClear = function() {
            mockFn.calls = [];
            mockFn.results = [];
            return mockFn;
        };
        
        return mockFn;
    }

    getTestType() {
        const args = process.argv.slice(2);
        if (args.includes('--unit')) return 'unit';
        if (args.includes('--integration')) return 'integration';
        return 'all';
    }

    setupGlobals() {
        // Setup global test environment
        const runner = this; // Capture the runner context
        global.describe = (name, fn, type) => runner.describe(name, fn, type);
        global.it = (name, fn) => this.it(name, fn);
        global.beforeEach = (fn) => this.beforeEach(fn);
        global.afterEach = (fn) => this.afterEach(fn);
        global.beforeAll = (fn) => this.beforeAll(fn);
        global.afterAll = (fn) => this.afterAll(fn);
        // Create the expect function with helper methods
        const expectFunction = (actual) => this.expect(actual);
        
        // Add Jest-style global helper functions
        expectFunction.any = (constructor) => {
            return {
                asymmetricMatch: (actual) => {
                    if (constructor === Object) {
                        return typeof actual === 'object' && actual !== null;
                    }
                    if (constructor === Array) {
                        return Array.isArray(actual);
                    }
                    if (constructor === String) {
                        return typeof actual === 'string';
                    }
                    if (constructor === Number) {
                        return typeof actual === 'number';
                    }
                    if (constructor === Boolean) {
                        return typeof actual === 'boolean';
                    }
                    if (constructor === Function) {
                        return typeof actual === 'function';
                    }
                    return actual instanceof constructor;
                },
                toString: () => `Any<${constructor.name}>`
            };
        };
        
        expectFunction.objectContaining = (expected) => {
            return {
                asymmetricMatch: (actual) => {
                    if (typeof actual !== 'object' || actual === null) return false;
                    return Object.keys(expected).every(key => {
                        if (!(key in actual)) return false;
                        const expectedValue = expected[key];
                        const actualValue = actual[key];
                        
                        // Handle asymmetric matchers recursively
                        if (expectedValue && typeof expectedValue === 'object' && expectedValue.asymmetricMatch) {
                            return expectedValue.asymmetricMatch(actualValue);
                        }
                        
                        // Handle regular values
                        try {
                            return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
                        } catch (e) {
                            // For circular references or functions, use simple equality
                            return actualValue === expectedValue;
                        }
                    });
                },
                toString: () => `ObjectContaining(${JSON.stringify(expected)})`
            };
        };
        
        expectFunction.stringContaining = (expected) => {
            return {
                asymmetricMatch: (actual) => {
                    return typeof actual === 'string' && actual.includes(expected);
                },
                toString: () => `StringContaining("${expected}")`
            };
        };
        
        expectFunction.arrayContaining = (expected) => {
            return {
                asymmetricMatch: (actual) => {
                    if (!Array.isArray(actual)) return false;
                    return expected.every(item => actual.some(actualItem => 
                        JSON.stringify(actualItem) === JSON.stringify(item)
                    ));
                },
                toString: () => `ArrayContaining(${JSON.stringify(expected)})`
            };
        };
        
        global.expect = expectFunction;
        // Make sure the helper functions are accessible as properties
        global.expect.any = expectFunction.any;
        global.expect.objectContaining = expectFunction.objectContaining;
        global.expect.stringContaining = expectFunction.stringContaining;
        global.expect.arrayContaining = expectFunction.arrayContaining;

        // Setup jest mock before loading any modules
        global.jest = {
            fn: function(implementation) {
                const mockFn = function(...args) {
                    mockFn.calls.push(args);
                    const result = implementation ? implementation.apply(this, args) : undefined;
                    mockFn.results.push({
                        type: 'return',
                        value: result
                    });
                    return result;
                };
                
                mockFn.calls = [];
                mockFn.results = [];
                mockFn.mockImplementation = function(newImplementation) {
                    implementation = newImplementation;
                    return mockFn;
                };
                mockFn.mockReturnValue = function(value) {
                    implementation = () => value;
                    return mockFn;
                };
                mockFn.mockResolvedValue = function(value) {
                    implementation = () => Promise.resolve(value);
                    return mockFn;
                };
                mockFn.mockRejectedValue = function(error) {
                    implementation = () => Promise.reject(error);
                    return mockFn;
                };
                mockFn.mockClear = function() {
                    mockFn.calls = [];
                    mockFn.results = [];
                    return mockFn;
                };
                
                return mockFn;
            }
        };
        
        // Setup Node.js environment mocks
        this.setupNodeMocks();
        this.setupModuleMocks();
    }

    setupNodeMocks() {
        // Load and execute the node-mocks.js file first
        const nodeMocksPath = path.join(__dirname, 'setup/node-mocks.js');
        if (fs.existsSync(nodeMocksPath)) {
            this.loadModule(nodeMocksPath);
        }
        
        // Ensure window and document are available
        if (!global.window) {
            global.window = global;
        }
        
        // Create jest-style mock for fetch
        const mockFetch = this.createJestMock(this.mockFetch.bind(this));
        global.fetch = mockFetch;
        global.window.fetch = mockFetch;
        
        global.isElectron = false;
        global.window.isElectron = false;
        
        // Create jest-style mock for electron API  
        const mockElectronApiRequest = this.createJestMock(this.mockElectronApiRequest.bind(this));
        global.electronAPI = {
            makeApiRequest: mockElectronApiRequest
        };
        global.window.electronAPI = global.electronAPI;
    }

    setupModuleMocks() {
        // Load application modules with path resolution
        const publicPath = path.join(__dirname, '../public/js');
        
        try {
            // Load test infrastructure first
            this.loadModule(path.join(__dirname, 'fixtures/mock-responses.js'));
            this.loadModule(path.join(__dirname, 'fixtures/test-data.js'));
            this.loadModule(path.join(__dirname, 'setup/node-test-setup.js'));
            this.loadModule(path.join(__dirname, 'unit/utils/test-utils.js'));
            
            // Load config first as other modules depend on it
            this.loadModule(path.join(publicPath, 'config.js'));
            
            // Initialize test configuration AFTER loading app modules
            if (typeof global.setupTest === 'function') {
                global.setupTest();
            } else {
                // Fallback configuration if setupTest is not available
                global.GrafanaConfig = {
                    url: 'http://localhost:3000',
                    authToken: 'test-token',
                    datasourceId: 'test-datasource-123',
                    currentDatasourceId: 'test-datasource-123',
                    selectedDatasourceType: 'influxdb',
                    orgId: '1'
                };
            }
            
            // Debug configuration after setup
            if (this.verbose) {
                this.logInfo(`GrafanaConfig after setupTest: url=${global.GrafanaConfig?.url}, datasourceId=${global.GrafanaConfig?.datasourceId}`);
            }
            
            // Load core modules
            this.loadModule(path.join(publicPath, 'utils.js'));
            this.loadModule(path.join(publicPath, 'dataAccess.js'));
            this.loadModule(path.join(publicPath, 'queryRequestBuilder.js'));
            
            // Load additional modules needed by integration tests
            this.loadModule(path.join(publicPath, 'storage.js'));
            this.loadModule(path.join(publicPath, 'variables.js'));
            this.loadModule(path.join(publicPath, 'schema.js'));
            this.loadModule(path.join(publicPath, 'queries.js'));
            this.loadModule(path.join(publicPath, 'editor.js'));
            this.loadModule(path.join(publicPath, 'history.js'));
            
        } catch (error) {
            this.logError(`Failed to load modules: ${error.message}`);
            process.exit(1);
        }
    }

    loadModule(filePath) {
        if (!fs.existsSync(filePath)) {
            if (this.verbose) {
                this.logWarning(`Module not found: ${filePath}`);
            }
            return;
        }

        try {
            const moduleContent = fs.readFileSync(filePath, 'utf8');
            
            // Check if this is a Node.js module with require statements
            if (moduleContent.includes('require(') && !moduleContent.includes('window.')) {
                // Use regular require for Node.js modules
                delete require.cache[require.resolve(filePath)];
                require(filePath);
            } else {
                // Use eval for browser-style modules and handle const declarations
                // Convert const declarations to global assignments for test environment
                let processedContent = moduleContent
                    .replace(/^const\s+(\w+)\s*=/gm, 'global.$1 =')
                    .replace(/^let\s+(\w+)\s*=/gm, 'global.$1 =')
                    .replace(/^var\s+(\w+)\s*=/gm, 'global.$1 =');
                
                // Create a custom execution context with access to all globals
                const moduleGlobals = {
                    ...global,
                    expect: global.expect,
                    describe: global.describe,
                    it: global.it,
                    beforeEach: global.beforeEach,
                    afterEach: global.afterEach,
                    beforeAll: global.beforeAll,
                    afterAll: global.afterAll,
                    jest: global.jest,
                    mockUrl: global.mockUrl,
                    mockElectronUrl: global.mockElectronUrl,
                    window: global.window,
                    document: global.document,
                    console: console,
                    require: require,
                    module: { exports: {} },
                    exports: {},
                    __filename: filePath,
                    __dirname: path.dirname(filePath),
                    // Ensure GrafanaConfig is properly shared
                    GrafanaConfig: global.GrafanaConfig
                };
                
                // Ensure expect helper functions are available
                if (global.expect) {
                    moduleGlobals.expect = global.expect;
                    // Explicitly pass the helper functions
                    moduleGlobals.expectAny = global.expect.any;
                    moduleGlobals.expectObjectContaining = global.expect.objectContaining;
                    moduleGlobals.expectStringContaining = global.expect.stringContaining;
                    moduleGlobals.expectArrayContaining = global.expect.arrayContaining;
                }
                
                // Use Function constructor for better scope control
                const wrappedCode = `
                    // Import all globals
                    const { ${Object.keys(moduleGlobals).join(', ')} } = arguments[0];
                    
                    // Recreate expect function with helpers in the test execution context
                    if (typeof expect !== 'undefined') {
                        // Recreate the helper functions directly in this context
                        expect.any = function(constructor) {
                            return {
                                asymmetricMatch: function(actual) {
                                    if (constructor === Object) {
                                        return typeof actual === 'object' && actual !== null;
                                    }
                                    if (constructor === Array) {
                                        return Array.isArray(actual);
                                    }
                                    if (constructor === String) {
                                        return typeof actual === 'string';
                                    }
                                    if (constructor === Number) {
                                        return typeof actual === 'number';
                                    }
                                    if (constructor === Boolean) {
                                        return typeof actual === 'boolean';
                                    }
                                    if (constructor === Function) {
                                        return typeof actual === 'function';
                                    }
                                    return actual instanceof constructor;
                                },
                                toString: function() { return 'Any<' + constructor.name + '>'; }
                            };
                        };
                        
                        expect.objectContaining = function(expected) {
                            return {
                                asymmetricMatch: function(actual) {
                                    if (typeof actual !== 'object' || actual === null) return false;
                                    return Object.keys(expected).every(function(key) {
                                        return key in actual && JSON.stringify(actual[key]) === JSON.stringify(expected[key]);
                                    });
                                },
                                toString: function() { return 'ObjectContaining(' + JSON.stringify(expected) + ')'; }
                            };
                        };
                        
                        expect.stringContaining = function(expected) {
                            return {
                                asymmetricMatch: function(actual) {
                                    return typeof actual === 'string' && actual.includes(expected);
                                },
                                toString: function() { return 'StringContaining("' + expected + '")'; }
                            };
                        };
                        
                        expect.arrayContaining = function(expected) {
                            return {
                                asymmetricMatch: function(actual) {
                                    if (!Array.isArray(actual)) return false;
                                    return expected.every(function(item) {
                                        return actual.some(function(actualItem) {
                                            return JSON.stringify(actualItem) === JSON.stringify(item);
                                        });
                                    });
                                },
                                toString: function() { return 'ArrayContaining(' + JSON.stringify(expected) + ')'; }
                            };
                        };
                    }
                    
                    ${processedContent}
                `;
                
                // Execute with proper context binding
                const moduleFunction = new Function('moduleGlobals', wrappedCode);
                moduleFunction.call(global, moduleGlobals);
            }
            
            if (this.verbose) {
                this.logInfo(`Loaded module: ${path.basename(filePath)}`);
            }
        } catch (error) {
            this.logError(`Error loading ${filePath}: ${error.message}`);
            throw error;
        }
    }

    async mockFetch(url, options = {}) {
        if (this.verbose) {
            this.logInfo(`Mock fetch: ${options.method || 'GET'} ${url}`);
        }

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 10));

        // Check if there's a specific mock for this URL
        const mockKey = `${options.method || 'GET'} ${url}`;
        if (this.verbose) {
            console.log('Looking for mock:', mockKey, 'Found:', !!global.MockResponses?.[mockKey]);
        }
        if (global.MockResponses && global.MockResponses[mockKey]) {
            const mockResponse = global.MockResponses[mockKey];
            
            if (mockResponse.shouldFail) {
                const error = new Error(mockResponse.error || 'Mock network error');
                // Attach response info to the error for status code extraction
                error.response = {
                    status: mockResponse.status || 500,
                    statusText: mockResponse.statusText || 'Internal Server Error',
                };
                throw error;
            }
            
            return {
                ok: mockResponse.status >= 200 && mockResponse.status < 300,
                status: mockResponse.status || 200,
                statusText: mockResponse.statusText || 'OK',
                json: async () => mockResponse.data || {},
                headers: new Map(Object.entries(mockResponse.headers || {}))
            };
        }

        // Default mock response
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({ data: [], message: 'Mock response' }),
            headers: new Map()
        };
    }

    async mockElectronApiRequest(url, options = {}) {
        if (this.verbose) {
            this.logInfo(`Mock electron API: ${options.method || 'GET'} ${url}`);
        }

        await new Promise(resolve => setTimeout(resolve, 10));

        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            data: { results: [], message: 'Mock electron response' }
        };
    }

    describe(suiteName, testFunction, type = null) {
        const suiteType = type || this.currentTestType || 'unit';
        const suite = {
            name: suiteName,
            type: suiteType,
            tests: [],
            beforeEach: null,
            afterEach: null,
            beforeAll: null,
            afterAll: null
        };

        this.currentSuite = suite;
        
        try {
            testFunction();
        } catch (error) {
            this.logError(`Error in test suite ${suiteName}: ${error.message}`);
        }
        
        this.tests.push(suite);
        this.currentSuite = null;
    }

    it(testName, testFunction) {
        if (!this.currentSuite) {
            throw new Error('Test case must be inside a describe block');
        }

        this.currentSuite.tests.push({
            name: testName,
            testFunction: testFunction,
            status: 'pending',
            error: null,
            duration: 0
        });
    }

    beforeEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = fn;
        }
    }

    afterEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = fn;
        }
    }

    beforeAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll = fn;
        }
    }

    afterAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterAll = fn;
        }
    }

    expect(actual) {
        // Helper function to check asymmetric matchers
        const checkAsymmetricMatcher = (expected, actual) => {
            if (expected && typeof expected === 'object' && expected.asymmetricMatch) {
                return expected.asymmetricMatch(actual);
            }
            return null; // Not an asymmetric matcher
        };
        
        // Helper function to check if an object contains the expected properties
        const objectContaining = (expected) => {
            return {
                asymmetricMatch: (actual) => {
                    if (!actual || typeof actual !== 'object') {
                        return false;
                    }
                    
                    for (const key in expected) {
                        if (!(key in actual)) {
                            return false;
                        }
                        
                        const expectedValue = expected[key];
                        const actualValue = actual[key];
                        
                        // Check for nested objectContaining
                        const asymmetricResult = checkAsymmetricMatcher(expectedValue, actualValue);
                        if (asymmetricResult !== null) {
                            if (!asymmetricResult) {
                                return false;
                            }
                        } else {
                            // Deep equality check
                            if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
                                return false;
                            }
                        }
                    }
                    
                    return true;
                },
                toString: () => `objectContaining(${JSON.stringify(expected)})`
            };
        };
        
        // Helper function for expect.any
        const any = (constructor) => {
            return {
                asymmetricMatch: (actual) => {
                    if (constructor === String) {
                        return typeof actual === 'string';
                    } else if (constructor === Number) {
                        return typeof actual === 'number';
                    } else if (constructor === Boolean) {
                        return typeof actual === 'boolean';
                    } else if (constructor === Object) {
                        return actual !== null && typeof actual === 'object';
                    } else if (constructor === Array) {
                        return Array.isArray(actual);
                    } else {
                        return actual instanceof constructor;
                    }
                },
                toString: () => `any(${constructor.name})`
            };
        };
        
        // Helper functions are already defined in setupGlobals, no need to redefine
        
        const expectationObject = {
            toBe: (expected) => {
                const asymmetricResult = checkAsymmetricMatcher(expected, actual);
                if (asymmetricResult !== null) {
                    if (!asymmetricResult) {
                        throw new Error(`Expected ${JSON.stringify(actual)} to match ${expected.toString()}`);
                    }
                    return;
                }
                if (actual !== expected) {
                    throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
                }
            },
            toEqual: (expected) => {
                const asymmetricResult = checkAsymmetricMatcher(expected, actual);
                if (asymmetricResult !== null) {
                    if (!asymmetricResult) {
                        throw new Error(`Expected ${JSON.stringify(actual)} to match ${expected.toString()}`);
                    }
                    return;
                }
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
                }
            },
            toBeNull: () => {
                if (actual !== null) {
                    throw new Error(`Expected null, but got ${JSON.stringify(actual)}`);
                }
            },
            toBeUndefined: () => {
                if (actual !== undefined) {
                    throw new Error(`Expected undefined, but got ${JSON.stringify(actual)}`);
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected truthy value, but got ${JSON.stringify(actual)}`);
                }
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected falsy value, but got ${JSON.stringify(actual)}`);
                }
            },
            toContain: (expected) => {
                if (Array.isArray(actual)) {
                    if (!actual.includes(expected)) {
                        throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
                    }
                } else if (typeof actual === 'string') {
                    if (actual.indexOf(expected) === -1) {
                        throw new Error(`Expected string to contain "${expected}"`);
                    }
                } else {
                    throw new Error('toContain can only be used with arrays or strings');
                }
            },
            toThrow: async (expectedError) => {
                if (typeof actual !== 'function') {
                    throw new Error('toThrow can only be used with functions');
                }
                
                let threw = false;
                let actualError = null;
                
                try {
                    const result = actual();
                    // Handle async functions
                    if (result && typeof result.then === 'function') {
                        // This is a promise, need to await and check for rejection
                        try {
                            await result;
                            // If we get here, the promise resolved instead of rejecting
                            throw new Error('Expected function to throw an error, but it resolved');
                        } catch (error) {
                            // Promise was rejected as expected
                            if (expectedError && !error.message.includes(expectedError)) {
                                throw new Error(`Expected error message to contain "${expectedError}", but got "${error.message}"`);
                            }
                            return; // Expected behavior
                        }
                    }
                } catch (error) {
                    threw = true;
                    actualError = error;
                }
                
                if (!threw) {
                    throw new Error('Expected function to throw an error');
                }
                
                if (expectedError && !actualError.message.includes(expectedError)) {
                    throw new Error(`Expected error message to contain "${expectedError}", but got "${actualError.message}"`);
                }
            },
            toHaveProperty: (propertyName) => {
                if (typeof actual !== 'object' || actual === null) {
                    throw new Error('toHaveProperty can only be used with objects');
                }
                
                if (!(propertyName in actual)) {
                    throw new Error(`Expected object to have property "${propertyName}"`);
                }
            },
            toBeInstanceOf: (constructor) => {
                if (!(actual instanceof constructor)) {
                    throw new Error(`Expected instance of ${constructor.name}`);
                }
            },
            
            // Jest-style mock function assertions
            toHaveBeenCalled: () => {
                if (!actual || typeof actual.calls === 'undefined') {
                    throw new Error('Expected a mock function');
                }
                if (actual.calls.length === 0) {
                    throw new Error('Expected function to have been called');
                }
            },
            
            toHaveBeenCalledTimes: (times) => {
                if (!actual || typeof actual.calls === 'undefined') {
                    throw new Error('Expected a mock function');
                }
                if (actual.calls.length !== times) {
                    throw new Error(`Expected function to have been called ${times} times, but was called ${actual.calls.length} times`);
                }
            },
            
            toHaveBeenCalledWith: (...expectedArgs) => {
                if (!actual || typeof actual.calls === 'undefined') {
                    throw new Error('Expected a mock function');
                }
                const matchingCall = actual.calls.find(call => {
                    if (call.length !== expectedArgs.length) return false;
                    return call.every((arg, index) => {
                        const expected = expectedArgs[index];
                        const asymmetricResult = checkAsymmetricMatcher(expected, arg);
                        if (asymmetricResult !== null) {
                            return asymmetricResult;
                        }
                        return JSON.stringify(arg) === JSON.stringify(expected);
                    });
                });
                if (!matchingCall) {
                    const actualCalls = actual.calls.map(call => JSON.stringify(call)).join('\n  ');
                    // Properly serialize expected args including asymmetric matchers
                    const expectedArgsStr = expectedArgs.map(arg => {
                        if (arg && typeof arg === 'object' && arg.toString) {
                            return arg.toString();
                        }
                        return JSON.stringify(arg);
                    });
                    throw new Error(`Expected function to have been called with [${expectedArgsStr.join(',')}]\nActual calls:\n  ${actualCalls}`);
                }
            },
            
            // Additional Jest-style matchers
            toBeDefined: () => {
                if (actual === undefined) {
                    throw new Error('Expected value to be defined');
                }
            },
            
            toBeGreaterThan: (expected) => {
                if (typeof actual !== 'number' || typeof expected !== 'number') {
                    throw new Error('toBeGreaterThan can only be used with numbers');
                }
                if (actual <= expected) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
            },
            
            toBeCloseTo: (expected, precision = 2) => {
                if (typeof actual !== 'number' || typeof expected !== 'number') {
                    throw new Error('toBeCloseTo can only be used with numbers');
                }
                const diff = Math.abs(expected - actual);
                const bound = Math.pow(10, -precision) / 2;
                if (diff >= bound) {
                    throw new Error(`Expected ${actual} to be close to ${expected}`);
                }
            },
            
            toHaveLength: (expectedLength) => {
                if (!actual || typeof actual.length === 'undefined') {
                    throw new Error('toHaveLength requires an object with a length property');
                }
                if (actual.length !== expectedLength) {
                    throw new Error(`Expected length ${expectedLength}, but got ${actual.length}`);
                }
            },
            
            toMatch: (expected) => {
                if (typeof actual !== 'string') {
                    throw new Error('toMatch requires the actual value to be a string');
                }
                
                let regex;
                if (expected instanceof RegExp) {
                    regex = expected;
                } else if (typeof expected === 'string') {
                    regex = new RegExp(expected);
                } else {
                    throw new Error('toMatch requires a string or RegExp');
                }
                
                if (!regex.test(actual)) {
                    throw new Error(`Expected "${actual}" to match ${regex.toString()}`);
                }
            },
            
            toContainEqual: (expected) => {
                if (!Array.isArray(actual)) {
                    throw new Error('toContainEqual can only be used with arrays');
                }
                
                const found = actual.some(item => {
                    try {
                        return JSON.stringify(item) === JSON.stringify(expected);
                    } catch {
                        return item === expected;
                    }
                });
                
                if (!found) {
                    throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
                }
            },
            
            toBeNull: () => {
                if (actual !== null) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to be null`);
                }
            },
            
            toBeUndefined: () => {
                if (actual !== undefined) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to be undefined`);
                }
            },
            
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`);
                }
            },
            
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`);
                }
            }
        };
        
        // Add .not property for negated assertions
        expectationObject.not = {
            toThrow: (expectedError) => {
                if (typeof actual !== 'function') {
                    throw new Error('toThrow can only be used with functions');
                }
                
                let threw = false;
                let actualError = null;
                
                try {
                    const result = actual();
                    // Handle async functions
                    if (result && typeof result.then === 'function') {
                        // For promises, we need to return a promise
                        return result.then(
                            () => {
                                // Promise resolved - good for .not.toThrow()
                                return;
                            },
                            (error) => {
                                // Promise rejected - bad for .not.toThrow()
                                throw new Error(`Expected function not to throw an error, but it threw: ${error.message}`);
                            }
                        );
                    }
                } catch (error) {
                    threw = true;
                    actualError = error;
                }
                
                if (threw) {
                    throw new Error(`Expected function not to throw an error, but it threw: ${actualError.message}`);
                }
            },
            
            toBe: (expected) => {
                if (actual === expected) {
                    throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`);
                }
            },
            
            toEqual: (expected) => {
                if (JSON.stringify(actual) === JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`);
                }
            },
            
            toContain: (expected) => {
                if (typeof actual === 'string' && actual.includes(expected)) {
                    throw new Error(`Expected "${actual}" not to contain "${expected}"`);
                } else if (Array.isArray(actual) && actual.includes(expected)) {
                    throw new Error(`Expected array not to contain ${JSON.stringify(expected)}`);
                }
            }
        };
        
        return expectationObject;
    }

    async run() {
        this.startTime = Date.now();
        this.logHeader('Time Buddy Test Suite');
        
        try {
            await this.loadTestFiles();
            await this.runTests();
            this.displayResults();
            
            // Exit with appropriate code
            process.exit(this.results.failed > 0 ? 1 : 0);
        } catch (error) {
            this.logError(`Test runner error: ${error.message}`);
            if (this.verbose) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    }

    async loadTestFiles() {
        const testFiles = this.getTestFiles();
        
        for (const testFile of testFiles) {
            try {
                // Set currentTestType based on file path for proper test categorization
                if (testFile.includes('/integration/')) {
                    this.currentTestType = 'integration';
                } else if (testFile.includes('/unit/')) {
                    this.currentTestType = 'unit';
                } else {
                    this.currentTestType = 'unit'; // default
                }
                
                this.loadModule(testFile);
                
                if (this.verbose) {
                    this.logSuccess(`Loaded test file: ${path.basename(testFile)}`);
                }
            } catch (error) {
                this.logError(`Failed to load test file ${testFile}: ${error.message}`);
                throw error;
            }
        }
    }

    getTestFiles() {
        const testFiles = [];
        const testDir = __dirname;

        if (this.testType === 'unit' || this.testType === 'all') {
            const unitDir = path.join(testDir, 'unit');
            if (fs.existsSync(unitDir)) {
                const unitFiles = this.findTestFiles(unitDir);
                testFiles.push(...unitFiles);
            }
        }

        if (this.testType === 'integration' || this.testType === 'all') {
            const integrationDir = path.join(testDir, 'integration');
            if (fs.existsSync(integrationDir)) {
                const integrationFiles = this.findTestFiles(integrationDir);
                testFiles.push(...integrationFiles);
            }
        }

        return testFiles;
    }

    findTestFiles(dir) {
        const files = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...this.findTestFiles(fullPath));
            } else if (entry.name.endsWith('.test.js')) {
                files.push(fullPath);
            }
        }

        return files;
    }

    async runTests() {
        const filteredTests = this.testType === 'all' ? 
            this.tests : 
            this.tests.filter(suite => suite.type === this.testType);

        if (filteredTests.length === 0) {
            this.logWarning('No tests found to run');
            return;
        }

        // Calculate total tests
        this.results.total = filteredTests.reduce((sum, suite) => sum + suite.tests.length, 0);
        
        this.logInfo(`Running ${this.results.total} tests across ${filteredTests.length} suites...`);
        console.log('');

        for (const suite of filteredTests) {
            await this.runSuite(suite);
        }
    }

    async runSuite(suite) {
        this.logSuite(suite.name);
        
        try {
            // Run beforeAll hook
            if (suite.beforeAll) {
                await suite.beforeAll();
            }

            for (const test of suite.tests) {
                await this.runTest(suite, test);
            }

            // Run afterAll hook
            if (suite.afterAll) {
                await suite.afterAll();
            }
        } catch (error) {
            this.logError(`Suite setup/teardown error in "${suite.name}": ${error.message}`);
        }
        
        console.log('');
    }

    async runTest(suite, test) {
        const startTime = Date.now();
        
        try {
            // Store original configuration before test
            const originalConfig = global.GrafanaConfig ? 
                JSON.parse(JSON.stringify(global.GrafanaConfig)) : null;
            
            // Run beforeEach hook
            if (suite.beforeEach) {
                await suite.beforeEach();
            }

            // Ensure test configuration is available with required fields
            if (!global.GrafanaConfig) {
                global.GrafanaConfig = {};
            }
            
            // Merge with default configuration to ensure required fields are present
            const defaultConfig = {
                url: 'http://localhost:3000',
                authToken: 'test-token',
                datasourceId: 'test-datasource-123',
                currentDatasourceId: 'test-datasource-123',
                selectedDatasourceType: 'influxdb',
                orgId: '1'
            };
            
            // Only set missing or empty fields, preserve valid existing ones
            Object.keys(defaultConfig).forEach(key => {
                if (global.GrafanaConfig[key] === undefined || 
                    global.GrafanaConfig[key] === null || 
                    global.GrafanaConfig[key] === '') {
                    global.GrafanaConfig[key] = defaultConfig[key];
                }
            });

            // Debug configuration before test
            if (this.verbose) {
                this.logInfo(`GrafanaConfig before test: url=${global.GrafanaConfig?.url}, datasourceId=${global.GrafanaConfig?.datasourceId}`);
            }

            // Run the actual test
            await test.testFunction();
            
            test.status = 'passed';
            this.results.passed++;
            
            // Run afterEach hook
            if (suite.afterEach) {
                await suite.afterEach();
            }
            
            // Restore original configuration after test
            if (originalConfig) {
                global.GrafanaConfig = originalConfig;
            }
            
        } catch (error) {
            test.status = 'failed';
            test.error = error;
            this.results.failed++;
        } finally {
            test.duration = Date.now() - startTime;
            this.displayTestResult(test);
        }
    }

    displayTestResult(test) {
        const icon = test.status === 'passed' ? '✓' : '✗';
        const color = test.status === 'passed' ? colors.green : colors.red;
        const duration = test.duration ? ` ${colors.dim}(${test.duration}ms)${colors.reset}` : '';
        
        console.log(`  ${color}${icon} ${test.name}${colors.reset}${duration}`);
        
        if (test.error && (this.verbose || test.status === 'failed')) {
            const errorLines = this.formatError(test.error).split('\n');
            errorLines.forEach(line => {
                if (line.trim()) {
                    console.log(`    ${colors.red}${line}${colors.reset}`);
                }
            });
        }
    }

    displayResults() {
        const duration = Date.now() - this.startTime;
        const passRate = this.results.total > 0 ? 
            ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;

        console.log('');
        this.logHeader('Test Results');
        
        console.log(`${colors.blue}Total:${colors.reset}  ${this.results.total}`);
        console.log(`${colors.green}Passed:${colors.reset} ${this.results.passed}`);
        console.log(`${colors.red}Failed:${colors.reset} ${this.results.failed}`);
        console.log(`${colors.yellow}Pass Rate:${colors.reset} ${passRate}%`);
        console.log(`${colors.cyan}Duration:${colors.reset} ${duration}ms`);
        
        console.log('');
        
        if (this.results.failed === 0) {
            this.logSuccess(`All tests passed! 🎉`);
        } else {
            this.logError(`${this.results.failed} test(s) failed`);
        }
    }

    formatError(error) {
        if (error.stack) {
            // Clean up stack trace for better readability
            return error.stack
                .split('\n')
                .filter(line => !line.includes('node_modules'))
                .slice(0, 5)
                .join('\n');
        }
        return error.message || String(error);
    }

    // Logging utilities
    logHeader(message) {
        console.log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
        console.log(`${colors.cyan}${'='.repeat(message.length)}${colors.reset}`);
    }

    logSuite(message) {
        console.log(`${colors.bright}${colors.blue}${message}${colors.reset}`);
    }

    logSuccess(message) {
        console.log(`${colors.green}✓ ${message}${colors.reset}`);
    }

    logError(message) {
        console.log(`${colors.red}✗ ${message}${colors.reset}`);
    }

    logWarning(message) {
        console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
    }

    logInfo(message) {
        if (this.verbose) {
            console.log(`${colors.cyan}ℹ ${message}${colors.reset}`);
        }
    }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
    const runner = new CLITestRunner();
    runner.run().catch(error => {
        console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

module.exports = CLITestRunner;