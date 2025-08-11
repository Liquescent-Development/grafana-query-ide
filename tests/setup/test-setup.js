// Global test configuration and setup
// This file configures the testing environment and provides utilities

(function() {
    'use strict';
    
    // Global test configuration
    window.TestConfig = {
        timeout: 5000, // Default test timeout in ms
        mockDelayMs: 10, // Simulated network delay for mocks
        verbose: false // Enable verbose logging
    };

    // Test state management
    window.TestState = {
        originalFetch: null,
        originalElectronAPI: null,
        originalGrafanaConfig: null,
        mocks: new Map(),
        cleanup: []
    };

    // Setup function called before each test
    window.setupTest = function() {
        // Store original implementations
        TestState.originalFetch = window.fetch;
        TestState.originalElectronAPI = window.electronAPI;
        TestState.originalGrafanaConfig = Object.assign({}, window.GrafanaConfig);
        
        // Reset GrafanaConfig to test state
        Object.assign(window.GrafanaConfig, {
            url: 'http://localhost:3000',
            username: 'test',
            password: 'test',
            authToken: 'test-token',
            currentConnectionId: 'test-connection',
            currentDatasourceId: 'test-ds-123',
            selectedDatasourceType: 'influxdb',
            selectedDatasourceUid: 'test-datasource-123',
            selectedDatasourceName: 'Test InfluxDB',
            orgId: '1'
        });

        // Setup default mocks
        setupDefaultMocks();
        
        if (TestConfig.verbose) {
            console.log('🔧 Test setup completed');
        }
    };

    // Cleanup function called after each test
    window.cleanupTest = function() {
        // Restore original implementations
        if (TestState.originalFetch) {
            window.fetch = TestState.originalFetch;
        }
        if (TestState.originalElectronAPI !== undefined) {
            window.electronAPI = TestState.originalElectronAPI;
        }
        if (TestState.originalGrafanaConfig) {
            Object.assign(window.GrafanaConfig, TestState.originalGrafanaConfig);
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
        // Mock fetch for HTTP requests
        window.fetch = jest.fn().mockImplementation(mockFetch);
        
        // Mock electron API
        window.electronAPI = {
            makeApiRequest: jest.fn().mockImplementation(mockElectronApiRequest)
        };
        
        // Mock window.isElectron
        window.isElectron = false; // Default to web mode
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
        if (MockResponses[mockKey]) {
            const mockResponse = MockResponses[mockKey];
            
            if (mockResponse.shouldFail) {
                throw new Error(mockResponse.error || 'Mock network error');
            }
            
            return {
                ok: mockResponse.status >= 200 && mockResponse.status < 300,
                status: mockResponse.status || 200,
                statusText: mockResponse.statusText || 'OK',
                json: async () => mockResponse.data,
                headers: new Map(Object.entries(mockResponse.headers || {}))
            };
        }

        // Default successful response
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({ data: [], message: 'Mock response' }),
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
        if (MockResponses[mockKey]) {
            const mockResponse = MockResponses[mockKey];
            
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
    window.addTestCleanup = function(cleanupFn) {
        TestState.cleanup.push(cleanupFn);
    };

    // Utility to mock specific URLs
    window.mockUrl = function(method, url, response) {
        const mockKey = `${method.toUpperCase()} ${url}`;
        MockResponses[mockKey] = response;
        
        if (TestConfig.verbose) {
            console.log('📝 Mock registered:', mockKey);
        }
    };

    // Utility to mock electron-specific URLs
    window.mockElectronUrl = function(method, url, response) {
        const mockKey = `ELECTRON ${method.toUpperCase()} ${url}`;
        MockResponses[mockKey] = response;
        
        if (TestConfig.verbose) {
            console.log('📝 Electron mock registered:', mockKey);
        }
    };

    // Simple Jest-like mock function implementation
    window.jest = {
        fn: function(implementation) {
            const mockFn = function(...args) {
                mockFn.calls.push(args);
                mockFn.results.push({
                    type: 'return',
                    value: implementation ? implementation.apply(this, args) : undefined
                });
                return mockFn.results[mockFn.results.length - 1].value;
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
            
            // Helper properties
            Object.defineProperty(mockFn, 'toHaveBeenCalled', {
                get: () => mockFn.calls.length > 0
            });
            
            Object.defineProperty(mockFn, 'toHaveBeenCalledTimes', {
                value: (times) => mockFn.calls.length === times
            });
            
            Object.defineProperty(mockFn, 'toHaveBeenCalledWith', {
                value: (...args) => {
                    return mockFn.calls.some(call => 
                        call.length === args.length && 
                        call.every((arg, index) => JSON.stringify(arg) === JSON.stringify(args[index]))
                    );
                }
            });
            
            return mockFn;
        }
    };

    // Initialize test environment
    console.log('✅ Test setup initialized');
})();