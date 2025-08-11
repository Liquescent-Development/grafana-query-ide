// Node.js-compatible test setup
// This file configures the testing environment for Node.js execution

(function() {
    'use strict';
    
    // Load Node.js mocks first
    const path = require('path');
    const fs = require('fs');
    
    const mockPath = path.join(__dirname, 'node-mocks.js');
    if (fs.existsSync(mockPath)) {
        require(mockPath);
    } else {
        console.warn('Node mocks file not found, using inline mocks');
    }
    
    // Global test configuration
    global.TestConfig = {
        timeout: 5000, // Default test timeout in ms
        mockDelayMs: 10, // Simulated network delay for mocks
        verbose: process.env.NODE_ENV === 'test' || process.argv.includes('--verbose')
    };

    // Test state management
    global.TestState = {
        originalFetch: null,
        originalElectronAPI: null,
        originalGrafanaConfig: null,
        mocks: new Map(),
        cleanup: []
    };

    // Setup function called before each test
    global.setupTest = function() {
        // Store original implementations
        TestState.originalFetch = global.fetch;
        TestState.originalElectronAPI = global.electronAPI;
        TestState.originalGrafanaConfig = global.GrafanaConfig ? 
            Object.assign({}, global.GrafanaConfig) : null;
        
        // Initialize GrafanaConfig if it doesn't exist
        if (!global.GrafanaConfig) {
            global.GrafanaConfig = {};
        }
        
        // Reset GrafanaConfig to test state with all required properties
        Object.assign(global.GrafanaConfig, {
            url: 'http://localhost:3000',
            username: 'test',
            password: 'test',
            authToken: 'test-token',
            currentConnectionId: 'test-connection',
            currentDatasourceId: 'test-ds-123',
            datasourceId: 'test-ds-123', // Critical: DataAccess requires this
            selectedDatasourceType: 'influxdb',
            selectedDatasourceUid: 'test-datasource-123',
            selectedDatasourceName: 'Test InfluxDB',
            orgId: '1'
        });
        
        // Also set on window for browser compatibility
        if (global.window) {
            global.window.GrafanaConfig = global.GrafanaConfig;
        }

        // Setup default mocks
        setupDefaultMocks();
        
        if (TestConfig.verbose) {
            console.log('🔧 Test setup completed');
            console.log('🔧 GrafanaConfig after setup:', {
                url: global.GrafanaConfig?.url,
                datasourceId: global.GrafanaConfig?.datasourceId
            });
        }
    };

    // Cleanup function called after each test
    global.cleanupTest = function() {
        // Restore original implementations
        if (TestState.originalFetch) {
            global.fetch = TestState.originalFetch;
        }
        if (TestState.originalElectronAPI !== undefined) {
            global.electronAPI = TestState.originalElectronAPI;
        }
        if (TestState.originalGrafanaConfig) {
            Object.assign(global.GrafanaConfig, TestState.originalGrafanaConfig);
        }

        // Run custom cleanup functions
        TestState.cleanup.forEach(cleanupFn => {
            try {
                cleanupFn();
            } catch (error) {
                console.warn('Cleanup function failed:', error);
            }
        });

        // Clear state
        TestState.mocks.clear();
        TestState.cleanup = [];
        
        if (TestConfig.verbose) {
            console.log('🧹 Test cleanup completed');
        }
    };

    // Setup default mocks
    function setupDefaultMocks() {
        // Clear any existing mock call history
        if (global.fetch && typeof global.fetch.mockClear === 'function') {
            global.fetch.mockClear();
        }
        if (global.electronAPI && global.electronAPI.makeApiRequest && typeof global.electronAPI.makeApiRequest.mockClear === 'function') {
            global.electronAPI.makeApiRequest.mockClear();
        }
        
        // Create jest-style mock functions
        const mockFetchFn = global.jest.fn(mockFetch);
        const mockElectronApiRequestFn = global.jest.fn(mockElectronApiRequest);
        
        // Mock fetch for HTTP requests
        global.fetch = mockFetchFn;
        if (global.window) {
            global.window.fetch = mockFetchFn;
        }
        
        // Mock electron API with jest-style mock
        global.electronAPI = {
            makeApiRequest: mockElectronApiRequestFn
        };
        if (global.window) {
            global.window.electronAPI = global.electronAPI;
        }
        
        // Mock window.isElectron
        global.isElectron = false; // Default to web mode
        if (global.window) {
            global.window.isElectron = false;
        }
    }

    // Default mock fetch implementation
    async function mockFetch(url, options = {}) {
        if (TestConfig.verbose) {
            console.log('🌐 Mock fetch called:', url, options);
        }

        // Simulate network delay
        if (TestConfig.mockDelayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, TestConfig.mockDelayMs));
        }

        // Check if there's a specific mock for this URL
        const mockKey = `${options.method || 'GET'} ${url}`;
        if (global.MockResponses && global.MockResponses[mockKey]) {
            const mockResponse = global.MockResponses[mockKey];
            
            if (mockResponse.shouldFail) {
                const error = new Error(mockResponse.error || 'Mock network error');
                // Attach response info to the error for status code extraction
                error.response = {
                    status: mockResponse.status || 500,
                    statusText: mockResponse.statusText || 'Internal Server Error',
                    ok: false
                };
                throw error;
            }
            
            return {
                ok: mockResponse.status >= 200 && mockResponse.status < 300,
                status: mockResponse.status || 200,
                statusText: mockResponse.statusText || 'OK',
                json: async () => mockResponse.data,
                text: async () => JSON.stringify(mockResponse.data),
                headers: new Map(Object.entries(mockResponse.headers || {}))
            };
        }

        // Dynamic response generation for common patterns
        // Handle new /api/ds/query endpoint (with or without proxy prefix)
        if (url.includes('/ds/query')) {
            // Check the request body to determine datasource type
            let requestBody = {};
            try {
                requestBody = JSON.parse(options.body || '{}');
            } catch (e) {
                // Ignore parse errors
            }
            
            // Determine type from query content or datasource type in the query
            const firstQuery = requestBody.queries?.[0];
            const datasourceType = firstQuery?.datasource?.type;
            const isInflux = datasourceType === 'influxdb' || 
                             (firstQuery?.query && typeof firstQuery.query === 'string') ||
                             firstQuery?.rawQuery === true;
            const isProm = datasourceType === 'prometheus' || 
                          (firstQuery?.expr && typeof firstQuery.expr === 'string');
            
            if (isInflux) {
                // Return InfluxDB style response
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => {
                        // Use test data if available
                        if (global.TestData && global.TestData.responses && global.TestData.responses.influxDB && global.TestData.responses.influxDB.timeSeries) {
                            return global.TestData.responses.influxDB.timeSeries;
                        }
                        // Fallback response
                        return {
                            results: {
                                A: {
                                    frames: [{
                                        schema: {
                                            fields: [
                                                { name: 'time', type: 'time' },
                                                { name: 'value', type: 'number' }
                                            ]
                                        },
                                        data: {
                                            values: [
                                                [1234567890000, 1234567891000],
                                                [42.5, 43.2]
                                            ]
                                        }
                                    }]
                                }
                            }
                        };
                    },
                    text: async () => JSON.stringify({ KAI: { frames: [] } }),
                    headers: new Map()
                };
            } else if (isProm) {
                // Return Prometheus style response
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => {
                        // Use test data if available
                        if (global.TestData && global.TestData.responses && global.TestData.responses.prometheus && global.TestData.responses.prometheus.timeSeries) {
                            return global.TestData.responses.prometheus.timeSeries;
                        }
                        // Fallback response
                        return {
                            A: {
                                data: {
                                    resultType: 'matrix',
                                    result: [{
                                        metric: { __name__: 'up', instance: 'localhost:9090' },
                                        values: [[1234567890, '1']]
                                    }]
                                }
                            }
                        };
                    },
                    text: async () => JSON.stringify({ A: { data: {} } }),
                    headers: new Map()
                };
            }
        }
        
        // Legacy pattern for old tests
        if (url.includes('/api/datasources/proxy/') && url.includes('/query')) {
            // Extract datasource ID from URL
            const match = url.match(/\/api\/api\/datasources\/proxy\/([^\/]+)\/query/);
            if (match) {
                const datasourceId = match[1];
                
                // Default InfluxDB-style response
                return {
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    json: async () => ({
                        results: [{
                            series: [{
                                name: "measurements",
                                columns: ["name"],
                                values: [["cpu"], ["memory"], ["disk"]]
                            }]
                        }]
                    }),
                    text: async () => JSON.stringify({
                        results: [{
                            series: [{
                                name: "measurements", 
                                columns: ["name"],
                                values: [["cpu"], ["memory"], ["disk"]]
                            }]
                        }]
                    }),
                    headers: new Map()
                };
            }
        }

        // Default successful response
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({ data: [], message: 'Mock response' }),
            text: async () => JSON.stringify({ data: [], message: 'Mock response' }),
            headers: new Map()
        };
    }

    // Default mock electron API request implementation
    async function mockElectronApiRequest(url, options = {}) {
        if (TestConfig.verbose) {
            console.log('⚡ Mock electron API called:', url, options);
        }

        // Simulate network delay
        if (TestConfig.mockDelayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, TestConfig.mockDelayMs));
        }

        // Check if there's a specific mock for this URL
        const mockKey = `ELECTRON ${options.method || 'GET'} ${url}`;
        if (global.MockResponses && global.MockResponses[mockKey]) {
            const mockResponse = global.MockResponses[mockKey];
            
            if (mockResponse.shouldFail) {
                return {
                    ok: false,
                    status: mockResponse.status || 500,
                    statusText: mockResponse.statusText || 'Internal Server Error',
                    error: mockResponse.error || 'Mock electron API error'
                };
            }
            
            return {
                ok: true,
                status: mockResponse.status || 200,
                statusText: mockResponse.statusText || 'OK',
                data: mockResponse.data
            };
        }

        // Default successful response
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            data: { results: [], message: 'Mock electron response' }
        };
    }

    // Utility to add custom cleanup
    global.addTestCleanup = function(cleanupFn) {
        TestState.cleanup.push(cleanupFn);
    };

    // Utility to mock specific URLs  
    global.mockUrl = function(method, url, response) {
        if (!global.MockResponses) {
            global.MockResponses = {};
        }
        
        const mockKey = `${method.toUpperCase()} ${url}`;
        global.MockResponses[mockKey] = response;
        
        if (TestConfig.verbose) {
            console.log('📝 Mock registered:', mockKey);
        }
    };

    // Utility to mock electron-specific URLs
    global.mockElectronUrl = function(method, url, response) {
        if (!global.MockResponses) {
            global.MockResponses = {};
        }
        
        const mockKey = `ELECTRON ${method.toUpperCase()} ${url}`;
        global.MockResponses[mockKey] = response;
        
        if (TestConfig.verbose) {
            console.log('📝 Electron mock registered:', mockKey);
        }
    };

    // Enhanced Jest-like mock function implementation for Node.js
    global.jest = {
        fn: function(implementation) {
            const mockFn = async function(...args) {
                mockFn.calls.push(args);
                const result = implementation ? await implementation.apply(this, args) : undefined;
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
            mockFn.mockResolvedValueOnce = function(value) {
                const originalImplementation = implementation;
                let used = false;
                implementation = function(...args) {
                    if (!used) {
                        used = true;
                        implementation = originalImplementation; // Restore after one use
                        return Promise.resolve(value);
                    }
                    return originalImplementation ? originalImplementation.apply(this, args) : undefined;
                };
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

    // Mock common application modules that might not exist in Node.js context
    if (!global.Utils) {
        global.Utils = {
            escapeHtml: function(text) {
                return String(text)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            },
            
            showResults: function(message, type = 'info') {
                if (TestConfig.verbose) {
                    console.log(`[${type.toUpperCase()}] ${message}`);
                }
            },
            
            formatTimeValue: function(value) {
                if (typeof value === 'number') {
                    return new Date(value).toISOString();
                }
                return value;
            },
            
            formatNumberValue: function(value) {
                if (typeof value === 'number' && !Number.isInteger(value)) {
                    return value.toFixed(2);
                }
                return value;
            },
            
            extractSeriesName: function(frame, index) {
                if (frame && frame.schema && frame.schema.name) {
                    return frame.schema.name;
                }
                return `Series ${index + 1}`;
            }
        };
    }

    // Mock Editor module if not available
    if (!global.Editor) {
        global.Editor = {
            getQueryValue: function() {
                return 'SELECT * FROM test_measurement WHERE time > now() - 1h';
            },
            
            setQueryValue: function(value) {
                if (TestConfig.verbose) {
                    console.log('Mock Editor: Setting query value:', value);
                }
            }
        };
    }

    // Mock Variables module if not available - let real Variables module override this
    if (!global.Variables) {
        global.Variables = {
            variables: [],
            substituteVariables: function(query) {
                // Simple variable substitution for testing
                return query.replace(/\$\{(\w+)\}/g, (match, varName) => {
                    const mockVarValues = {
                        'hostname': 'test-host',
                        'measurement': 'cpu',
                        'field': 'usage_idle'
                    };
                    return mockVarValues[varName] || match;
                });
            }
        };
    }

    // Mock Storage module if not available
    if (!global.Storage) {
        global.Storage = {
            saveToHistory: function(query, datasourceId, datasourceName) {
                if (TestConfig.verbose) {
                    console.log('Mock Storage: Saving to history:', query, datasourceId, datasourceName);
                }
            },
            
            getSchemaFromStorage: function(datasourceId, maxAge) {
                if (TestConfig.verbose) {
                    console.log('Mock Storage: Getting schema from storage:', datasourceId, maxAge);
                }
                return null; // Simulate no cached schema
            },
            
            saveSchemaToStorage: function(datasourceId, schemaData) {
                if (TestConfig.verbose) {
                    console.log('Mock Storage: Saving schema to storage:', datasourceId, schemaData);
                }
            },
            
            clearSchemaFromStorage: function(datasourceId) {
                if (TestConfig.verbose) {
                    console.log('Mock Storage: Clearing schema from storage:', datasourceId);
                }
            }
        };
    }

    // Initialize test environment
    console.log('✅ Node.js test setup initialized');
})();