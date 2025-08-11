// Test utility functions
// This file provides helper functions for writing and running tests

(function() {
    'use strict';

    // Test utilities registry
    const TestUtils = {
        // Async helper for testing promises
        async expectAsync(asyncFn) {
            try {
                const result = await asyncFn();
                return {
                    result,
                    error: null,
                    resolved: true,
                    rejected: false
                };
            } catch (error) {
                return {
                    result: null,
                    error,
                    resolved: false,
                    rejected: true
                };
            }
        },

        // Wait for a condition to be true (with timeout)
        async waitFor(conditionFn, timeoutMs = 1000, intervalMs = 10) {
            const startTime = Date.now();
            
            while (Date.now() - startTime < timeoutMs) {
                if (conditionFn()) {
                    return true;
                }
                await this.delay(intervalMs);
            }
            
            throw new Error(`Condition not met within ${timeoutMs}ms`);
        },

        // Simple delay utility
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        // Deep clone an object for test isolation
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }
            
            if (obj instanceof Array) {
                return obj.map(item => this.deepClone(item));
            }
            
            if (typeof obj === 'object') {
                const cloned = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        cloned[key] = this.deepClone(obj[key]);
                    }
                }
                return cloned;
            }
            
            return obj;
        },

        // Create a spy function that tracks calls
        createSpy(name = 'spy', implementation = null) {
            const spy = function(...args) {
                spy.calls.push({
                    args: args,
                    timestamp: Date.now()
                });
                
                if (implementation) {
                    return implementation.apply(this, args);
                }
            };
            
            spy.calls = [];
            spy.name = name;
            spy.callCount = function() {
                return spy.calls.length;
            };
            spy.wasCalledWith = function(...expectedArgs) {
                return spy.calls.some(call => 
                    call.args.length === expectedArgs.length &&
                    call.args.every((arg, index) => 
                        JSON.stringify(arg) === JSON.stringify(expectedArgs[index])
                    )
                );
            };
            spy.wasCalledTimes = function(times) {
                return spy.calls.length === times;
            };
            spy.reset = function() {
                spy.calls = [];
            };
            
            return spy;
        },

        // Mock fetch with custom responses
        mockFetch(responses) {
            const global_scope = (typeof window !== 'undefined' ? window : global);
            const originalFetch = global_scope.fetch;
            
            const mockFetchFn = (global.jest || global_scope.jest).fn().mockImplementation(async (url, options = {}) => {
                const method = options.method || 'GET';
                const key = `${method} ${url}`;
                
                // Special handling for schema queries to /api/ds/query endpoint
                if (method === 'POST' && url.endsWith('/api/ds/query') && options.body) {
                    try {
                        const requestBody = JSON.parse(options.body);
                        if (requestBody.queries && requestBody.queries.length > 0) {
                            const query = requestBody.queries[0];
                            const queryText = query.rawQuery || query.query || query.expr || '';
                            
                            if (queryText && typeof queryText === 'string') {
                                const lowerQuery = queryText.toLowerCase();
                                if (lowerQuery.includes('show ')) {
                                    // This is a schema query, use dynamic response
                                    console.log('🔍 Mock detected schema query:', queryText);
                                    const dynamicResponse = (global_scope.createMockResponse || global.createMockResponse)?.(queryText, 'influxdb');
                                    if (dynamicResponse) {
                                        console.log('📊 Mock returning dynamic response for schema query');
                                        return {
                                            ok: true,
                                            status: dynamicResponse.status || 200,
                                            statusText: 'OK',
                                            json: async () => dynamicResponse.data,
                                            headers: new Map()
                                        };
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Mock fetch: Error parsing request body for schema detection:', e);
                    }
                }
                
                if (responses && responses[key]) {
                    const response = responses[key];
                    
                    if (response.shouldFail) {
                        throw new Error(response.error || 'Mock fetch error');
                    }
                    
                    return {
                        ok: response.status >= 200 && response.status < 300,
                        status: response.status || 200,
                        statusText: response.statusText || 'OK',
                        json: async () => response.data,
                        headers: new Map(Object.entries(response.headers || {}))
                    };
                }
                
                // Default success response
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({ data: [], message: 'Mock response' }),
                    headers: new Map()
                };
            });
            
            global_scope.fetch = mockFetchFn;
            
            // Return cleanup function
            return function cleanup() {
                global_scope.fetch = originalFetch;
            };
        },

        // Mock electron API
        mockElectronAPI(responses) {
            const global_scope = (typeof window !== 'undefined' ? window : global);
            const originalAPI = global_scope.electronAPI;
            
            const mockApiRequestFn = (global.jest || global_scope.jest).fn().mockImplementation(async (urlOrOptions, options = {}) => {
                // Handle both old format (url, options) and new format (options)
                let url, method;
                if (typeof urlOrOptions === 'string') {
                    // Old format: makeApiRequest(url, options)
                    url = urlOrOptions;
                    method = options.method || 'GET';
                } else {
                    // New format: grafanaRequest(options)
                    url = (urlOrOptions.grafanaUrl || '') + (urlOrOptions.path || '');
                    method = urlOrOptions.method || 'GET';
                }
                
                const key = `ELECTRON ${method} ${url}`;
                
                if (responses && responses[key]) {
                    const response = responses[key];
                    
                    if (response.shouldFail) {
                        return {
                            ok: false,
                            status: response.status || 500,
                            statusText: response.statusText || 'Internal Server Error',
                            error: response.error || 'Mock electron API error'
                        };
                    }
                    
                    return {
                        ok: true,
                        status: response.status || 200,
                        statusText: response.statusText || 'OK',
                        data: response.data
                    };
                }
                
                // Default success response
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    data: { results: [], message: 'Mock electron response' }
                };
            });
            
            global_scope.electronAPI = {
                makeApiRequest: mockApiRequestFn,
                grafanaRequest: mockApiRequestFn  // Support both old and new API names
            };
            
            // Return cleanup function
            return function cleanup() {
                global_scope.electronAPI = originalAPI;
            };
        },

        // Mock global configuration
        mockGrafanaConfig(overrides = {}) {
            const global_scope = (typeof window !== 'undefined' ? window : global);
            
            // Initialize GrafanaConfig if it doesn't exist
            if (!global_scope.GrafanaConfig) {
                global_scope.GrafanaConfig = {};
            }
            
            const globalGrafanaConfig = global_scope.GrafanaConfig;
            const originalConfig = this.deepClone(globalGrafanaConfig);
            
            // Set required configuration with sensible defaults
            const defaultConfig = {
                url: 'http://localhost:3000',
                authToken: 'test-token',
                currentDatasourceId: 'test-ds-123',
                datasourceId: 'test-ds-123', // Critical: DataAccess requires this
                selectedDatasourceType: 'influxdb',
                selectedDatasourceUid: 'test-ds-123',
                selectedDatasourceName: 'Test InfluxDB',
                currentConnectionId: 'test-connection',
                orgId: '1',
                ...overrides
            };
            
            Object.assign(globalGrafanaConfig, defaultConfig);
            
            // Debug config after setting
            if (typeof process !== 'undefined' && process.argv && (process.argv.includes('-v') || process.argv.includes('--verbose'))) {
                console.log('🔧 MockGrafanaConfig set:', {
                    url: globalGrafanaConfig.url,
                    datasourceId: globalGrafanaConfig.datasourceId,
                    authToken: globalGrafanaConfig.authToken ? 'present' : 'missing'
                });
            }
            
            // Return cleanup function
            return function cleanup() {
                if (originalConfig && Object.keys(originalConfig).length > 0) {
                    // Clear existing config first, then restore original
                    Object.keys(globalGrafanaConfig).forEach(key => {
                        delete globalGrafanaConfig[key];
                    });
                    Object.assign(globalGrafanaConfig, originalConfig);
                } else {
                    // If no original config, restore to test defaults rather than clearing everything
                    Object.keys(globalGrafanaConfig).forEach(key => {
                        delete globalGrafanaConfig[key];
                    });
                    Object.assign(globalGrafanaConfig, {
                        url: 'http://localhost:3000',
                        authToken: 'test-token',
                        datasourceId: 'test-ds-123',
                        currentDatasourceId: 'test-ds-123',
                        selectedDatasourceType: 'influxdb',
                        orgId: '1'
                    });
                }
            };
        },

        // Create test DOM elements
        createTestElement(tagName = 'div', attributes = {}) {
            const element = document.createElement(tagName);
            
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            return element;
        },

        // Setup DOM elements required for tests
        setupTestDOM() {
            const testContainer = document.createElement('div');
            testContainer.id = 'test-container';
            testContainer.style.display = 'none'; // Hide from view
            
            // Create common elements used by the application
            const commonElements = [
                { id: 'results', tagName: 'div' },
                { id: 'timeFrom', tagName: 'input', type: 'number', value: '1' },
                { id: 'timeTo', tagName: 'input', type: 'number', value: '0' },
                { id: 'maxDataPoints', tagName: 'input', type: 'number', value: '1000' },
                { id: 'intervalMs', tagName: 'input', type: 'number', value: '15000' },
                { id: 'instantQuery', tagName: 'input', type: 'checkbox' },
                { id: 'datasource', tagName: 'select' },
                { id: 'schemaContainer', tagName: 'div' }
            ];
            
            commonElements.forEach(({ id, tagName, ...attrs }) => {
                const element = this.createTestElement(tagName, { id, ...attrs });
                testContainer.appendChild(element);
            });
            
            document.body.appendChild(testContainer);
            
            // Return cleanup function
            return function cleanup() {
                const container = document.getElementById('test-container');
                if (container) {
                    container.remove();
                }
            };
        },

        // Validate object structure matches expected schema
        validateSchema(obj, schema, path = '') {
            const errors = [];
            
            Object.entries(schema).forEach(([key, expectedType]) => {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (!(key in obj)) {
                    errors.push(`Missing property: ${currentPath}`);
                    return;
                }
                
                const actualValue = obj[key];
                const actualType = Array.isArray(actualValue) ? 'array' : typeof actualValue;
                
                if (typeof expectedType === 'string') {
                    if (actualType !== expectedType) {
                        errors.push(`Type mismatch at ${currentPath}: expected ${expectedType}, got ${actualType}`);
                    }
                } else if (typeof expectedType === 'object' && expectedType !== null) {
                    if (actualType === 'object' && !Array.isArray(actualValue)) {
                        errors.push(...this.validateSchema(actualValue, expectedType, currentPath));
                    } else {
                        errors.push(`Type mismatch at ${currentPath}: expected object, got ${actualType}`);
                    }
                }
            });
            
            return errors;
        },

        // Compare two objects for deep equality
        deepEqual(obj1, obj2) {
            if (obj1 === obj2) return true;
            
            if (obj1 === null || obj2 === null) return obj1 === obj2;
            if (typeof obj1 !== typeof obj2) return false;
            
            if (typeof obj1 !== 'object') return obj1 === obj2;
            
            if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
            
            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);
            
            if (keys1.length !== keys2.length) return false;
            
            for (const key of keys1) {
                if (!keys2.includes(key)) return false;
                if (!this.deepEqual(obj1[key], obj2[key])) return false;
            }
            
            return true;
        },

        // Generate test ID for unique identification
        generateTestId() {
            return 'test-' + Math.random().toString(36).substr(2, 9);
        },

        // Measure execution time of a function
        async measureTime(fn) {
            const start = performance.now();
            const result = await fn();
            const end = performance.now();
            
            return {
                result,
                duration: end - start
            };
        },

        // Create a timeout promise for testing timeouts
        timeout(ms, message = 'Operation timed out') {
            return new Promise((_, reject) => {
                setTimeout(() => reject(new Error(message)), ms);
            });
        },

        // Race a promise against a timeout
        async withTimeout(promise, timeoutMs, timeoutMessage) {
            return Promise.race([
                promise,
                this.timeout(timeoutMs, timeoutMessage)
            ]);
        },

        // Suppress console output during tests (useful for testing error paths)
        suppressConsole() {
            const originalConsole = {
                log: console.log,
                warn: console.warn,
                error: console.error
            };
            
            console.log = () => {};
            console.warn = () => {};
            console.error = () => {};
            
            return function restore() {
                Object.assign(console, originalConsole);
            };
        }
    };

    // Extended expect functions for common test patterns
    const originalExpect = window.expect;
    
    window.expect = function(actual) {
        const expectation = originalExpect(actual);
        
        // Add custom matchers
        expectation.toBeAsync = async function() {
            if (typeof actual !== 'function') {
                throw new Error('toBeAsync can only be used with functions');
            }
            
            try {
                const result = actual();
                if (result && typeof result.then === 'function') {
                    return result; // It's a promise
                } else {
                    throw new Error('Expected function to return a promise');
                }
            } catch (error) {
                throw new Error('Expected function to return a promise');
            }
        };
        
        expectation.toMatchSchema = function(schema) {
            const errors = TestUtils.validateSchema(actual, schema);
            if (errors.length > 0) {
                throw new Error(`Schema validation failed:\n${errors.join('\n')}`);
            }
        };
        
        expectation.toBeDeepEqual = function(expected) {
            if (!TestUtils.deepEqual(actual, expected)) {
                throw new Error(`Expected deep equality.\nActual: ${JSON.stringify(actual, null, 2)}\nExpected: ${JSON.stringify(expected, null, 2)}`);
            }
        };
        
        expectation.toHaveBeenCalledWithMatch = function(matcher) {
            if (!actual || !actual.calls) {
                throw new Error('toHaveBeenCalledWithMatch can only be used with spy functions');
            }
            
            const matchingCall = actual.calls.find(call => 
                call.args.some(arg => matcher(arg))
            );
            
            if (!matchingCall) {
                throw new Error('Expected function to have been called with matching arguments');
            }
        };
        
        return expectation;
    };

    // Export to global scope for both browser and Node.js
    if (typeof window !== 'undefined') {
        window.TestUtils = TestUtils;
    } else if (typeof global !== 'undefined') {
        global.TestUtils = TestUtils;
    }

    console.log('✅ Test utilities initialized');
})();