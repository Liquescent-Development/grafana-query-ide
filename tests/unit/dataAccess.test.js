// DataAccess Module Unit Tests
// Comprehensive tests for the unified data access layer

describe('DataAccess Module', function() {
    let cleanupConfig, cleanupDOM, cleanupFetch, cleanupElectron;

    beforeEach(function() {
        // Setup clean test environment
        setupTest();
        cleanupConfig = TestUtils.mockGrafanaConfig();
        cleanupDOM = TestUtils.setupTestDOM();
        cleanupFetch = TestUtils.mockFetch(MockResponses);
        cleanupElectron = TestUtils.mockElectronAPI(MockResponses);
    });

    afterEach(function() {
        // Cleanup after each test
        if (cleanupConfig) cleanupConfig();
        if (cleanupDOM) cleanupDOM();
        if (cleanupFetch) cleanupFetch();
        if (cleanupElectron) cleanupElectron();
        cleanupTest();
    });

    describe('request() method', function() {
        it('should handle proxy requests in web mode', async function() {
            // Arrange
            window.isElectron = false;
            const endpoint = '/api/datasources/test-datasource-123';
            const options = {
                method: 'GET',
                headers: { 'Custom-Header': 'test-value' }
            };

            // Mock the specific endpoint
            mockUrl('GET', '/api/api/datasources/test-datasource-123', {
                status: 200,
                data: { id: 123, name: 'Test Datasource', type: 'influxdb' }
            });

            // Act
            const result = await DataAccess.request(endpoint, options);

            // Assert
            expect(result).toHaveProperty('id');
            expect(result.name).toBe('Test Datasource');
            // Check that our specific endpoint was called (not checking exact count due to other possible calls)
            const specificCall = window.fetch.calls.find(call => 
                call[0] === '/api/api/datasources/test-datasource-123' &&
                call[1].method === 'GET'
            );
            expect(specificCall).toBeDefined();
        });

        it('should handle electron requests in electron mode', async function() {
            // Arrange
            window.isElectron = true;
            const endpoint = '/api/datasources/test-datasource-123';
            const options = { method: 'GET' };

            // Ensure electronAPI is properly set up
            if (!window.electronAPI || !window.electronAPI.grafanaRequest) {
                console.log('Test setup issue: window.electronAPI =', window.electronAPI);
                // Re-run the mock setup if needed
                if (cleanupElectron) cleanupElectron();
                cleanupElectron = TestUtils.mockElectronAPI(MockResponses);
            }

            // Mock the electron endpoint
            mockElectronUrl('GET', 'http://localhost:3000/api/datasources/test-datasource-123', {
                status: 200,
                data: { id: 123, name: 'Test Datasource', type: 'influxdb' }
            });

            // Act
            const result = await DataAccess.request(endpoint, options);

            // Assert
            expect(result).toHaveProperty('id');
            expect(result.name).toBe('Test Datasource');
            // Check that grafanaRequest was called (not checking exact count)
            expect(window.electronAPI.grafanaRequest).toHaveBeenCalled();
        });

        it('should throw error when configuration is missing', async function() {
            // Arrange - Save original config and clear it
            const originalUrl = GrafanaConfig.url;
            const originalDatasourceId = GrafanaConfig.datasourceId;
            
            Object.assign(GrafanaConfig, { url: '', datasourceId: '' });

            try {
                // Act & Assert
                expect(async () => {
                    await DataAccess.request('/api/test');
                }).toThrow('Grafana connection not configured');
            } finally {
                // Restore original config
                Object.assign(GrafanaConfig, { 
                    url: originalUrl, 
                    datasourceId: originalDatasourceId 
                });
            }
        });

        it('should include auth token in headers when available', async function() {
            // Arrange - Set to web mode (this was missing, causing inconsistent behavior)
            window.isElectron = false;
            
            // Use the actual datasourceId from config to match what the system expects
            const endpoint = `/api/datasources/${GrafanaConfig.datasourceId}`;
            
            // Make sure we have valid config (should already be set by beforeEach)
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            // Set a specific auth token for this test
            GrafanaConfig.authToken = 'test-bearer-token';

            // Mock the actual URL that will be called
            mockUrl('GET', `/api/api/datasources/${GrafanaConfig.datasourceId}`, {
                status: 200,
                data: { message: 'success' }
            });

            // Track call count before the request
            const beforeCallCount = window.fetch.calls ? window.fetch.calls.length : 0;

            // Act
            await DataAccess.request(endpoint);

            // Assert - Check that the function was called with the correct URL and options
            const afterCallCount = window.fetch.calls ? window.fetch.calls.length : 0;
            expect(afterCallCount).toBeGreaterThan(beforeCallCount);
            
            // Find the call for this specific endpoint with the specific auth token
            const matchingCall = window.fetch.calls.find(call => 
                call[0] === `/api/api/datasources/${GrafanaConfig.datasourceId}` &&
                call[1] && call[1].headers && 
                call[1].headers['Authorization'] === 'Bearer test-bearer-token'
            );
            
            expect(matchingCall).toBeDefined();
            expect(matchingCall[1]).toHaveProperty('headers');
            expect(matchingCall[1].headers['Authorization']).toBe('Bearer test-bearer-token');
        });

        it('should handle JSON body serialization', async function() {
            // Arrange - Set to web mode (this was missing, causing the test to use electron mode)
            window.isElectron = false;
            
            // Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const endpoint = '/api/query';
            const bodyData = { query: 'SELECT * FROM test', database: 'test' };

            mockUrl('POST', '/api/api/query', {
                status: 200,
                data: { results: [] }
            });

            // Act
            await DataAccess.request(endpoint, {
                method: 'POST',
                body: bodyData
            });

            // Assert - Check that a new call was made with the correct arguments
            expect(window.fetch.calls.length).toBeGreaterThan(0);
            
            // Find the most recent call that matches our endpoint
            const matchingCall = window.fetch.calls.find(call => 
                call[0] === '/api/api/query' && 
                call[1] && call[1].method === 'POST'
            );
            
            expect(matchingCall).toBeDefined();
            expect(matchingCall[1]).toHaveProperty('method', 'POST');
            expect(matchingCall[1]).toHaveProperty('body', JSON.stringify(bodyData));
            expect(matchingCall[1].headers['Content-Type']).toBe('application/json');
        });

        it('should handle string body as-is', async function() {
            // Arrange - Set to web mode (this was missing, causing the test to use electron mode)
            window.isElectron = false;
            
            // Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const endpoint = '/api/query';
            const bodyString = 'raw query string';

            mockUrl('POST', '/api/api/query', {
                status: 200,
                data: { results: [] }
            });

            // Act
            await DataAccess.request(endpoint, {
                method: 'POST',
                body: bodyString
            });

            // Assert - Check that a new call was made with the correct arguments  
            expect(window.fetch.calls.length).toBeGreaterThan(0);
            
            // Find the call that matches our endpoint and has a string body
            const matchingCall = window.fetch.calls.find(call => 
                call[0] === '/api/api/query' && 
                call[1] && call[1].method === 'POST' &&
                call[1].body === bodyString
            );
            
            expect(matchingCall).toBeDefined();
            expect(matchingCall[1]).toHaveProperty('method', 'POST');
            expect(matchingCall[1]).toHaveProperty('body', bodyString);
            expect(matchingCall[1].headers['Content-Type']).toBe('application/json');
        });
    });

    describe('executeQuery() method', function() {
        it('should execute InfluxDB query successfully', async function() {
            // Arrange - Set to web mode (this was missing, causing the test to use electron mode)
            window.isElectron = false;
            
            // Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'test-datasource-123';
            const query = 'SELECT mean("usage_idle") FROM "cpu" WHERE time > now() - 1h';
            
            mockUrl('POST', '/api/api/ds/query', {
                status: 200,
                data: {
                    results: {
                        A: {
                            frames: TestData.responses.influxDB.timeSeries.results[0].frames
                        }
                    }
                }
            });

            // Act
            const result = await DataAccess.executeQuery(datasourceId, query, {
                datasourceType: 'influxdb'
            });

            // Assert
            expect(result).toBeDefined();
            expect(result.results).toBeDefined();
            expect(result.results.A).toBeDefined();
            
            // Verify that the correct API endpoint was called
            const matchingCall = window.fetch.calls.find(call => 
                call[0] === '/api/api/ds/query'
            );
            expect(matchingCall).toBeDefined();
        });

        it('should execute Prometheus query successfully', async function() {
            // Arrange - Set to web mode (this was missing, causing environment issues)
            window.isElectron = false;
            
            // Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'prometheus-ds-456';
            const query = 'up';
            
            // Mock the response
            mockUrl('POST', '/api/api/ds/query', {
                status: 200,
                data: {
                    results: {
                        A: {
                            frames: [{
                                schema: {
                                    refId: "A",
                                    fields: [
                                        { name: "time", type: "time" },
                                        { name: "value", type: "number" }
                                    ]
                                },
                                data: {
                                    values: [[1234567890000], [1]]
                                }
                            }]
                        }
                    }
                }
            });

            // Act
            const result = await DataAccess.executeQuery(datasourceId, query, {
                datasourceType: 'prometheus'
            });

            // Assert
            expect(result).toBeDefined();
            expect(result.results).toBeDefined();
            expect(result.results.A).toBeDefined();
            expect(result.results.A.frames).toBeDefined();
            
            // Verify that the correct API endpoint was called (instead of exact call count)
            const matchingCall = window.fetch.calls.find(call => 
                call[0] === '/api/api/ds/query'
            );
            expect(matchingCall).toBeDefined();
        });

        it('should throw error when datasourceId is missing', async function() {
            // Act & Assert
            expect(async () => {
                await DataAccess.executeQuery('', 'SELECT * FROM test');
            }).toThrow('Datasource ID and query are required');
        });

        it('should throw error when query is missing', async function() {
            // Act & Assert
            expect(async () => {
                await DataAccess.executeQuery('test-datasource-123', '');
            }).toThrow('Datasource ID and query are required');
        });

        it('should use QueryRequestBuilder to build request', async function() {
            // Arrange - Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'test-datasource-123';
            const query = 'SELECT * FROM cpu';
            const mockRequestBuilder = {
                buildRequest: jest.fn().mockReturnValue({
                    from: '1609459200000',
                    to: '1609545600000',
                    queries: [{
                        refId: 'A',
                        query: query,
                        datasourceId: datasourceId
                    }]
                })
            };

            mockUrl('POST', '/api/api/datasources/proxy/test-datasource-123/query', {
                status: 200,
                data: { results: [] }
            });

            // Act
            await DataAccess.executeQuery(datasourceId, query, {
                requestBuilder: mockRequestBuilder
            });

            // Assert
            expect(mockRequestBuilder.buildRequest).toHaveBeenCalledWith(
                datasourceId,
                query,
                expect.any(Object)
            );
        });

        it('should handle query execution errors gracefully', async function() {
            // Arrange
            const datasourceId = 'test-datasource-123';
            const query = 'INVALID QUERY SYNTAX';

            mockUrl('POST', '/api/api/ds/query', {
                shouldFail: true,
                status: 400,
                error: 'syntax error at position 10'
            });

            // Act & Assert
            try {
                await DataAccess.executeQuery(datasourceId, query);
                expect(false).toBe(true); // Should not reach here
            } catch (error) {
                expect(error.message).toContain('Query execution failed');
                expect(error.context).toBe('Query execution failed');
            }
        });
    });

    describe('getSchema() method', function() {
        it('should get InfluxDB databases', async function() {
            // Arrange - Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'test-datasource-123';
            
            mockUrl('POST', '/api/api/ds/query', {
                status: 200,
                data: {
                    results: {
                        A: {
                            frames: [{
                                schema: {
                                    fields: [
                                        { name: "name", type: "string" }
                                    ]
                                },
                                data: {
                                    values: [["telegraf", "_internal", "test_db"]]
                                }
                            }]
                        }
                    }
                }
            });

            // Act
            const result = await DataAccess.getSchema(datasourceId, 'databases');

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect(result).toContain('telegraf');
            expect(result).toContain('_internal');
            expect(result).toContain('test_db');
        });

        it('should get InfluxDB measurements', async function() {
            // Arrange - Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'test-datasource-123';
            const database = 'telegraf';
            
            mockUrl('POST', '/api/api/ds/query', {
                status: 200,
                data: {
                    results: {
                        A: {
                            frames: [{
                                schema: {
                                    fields: [
                                        { name: "name", type: "string" }
                                    ]
                                },
                                data: {
                                    values: [["cpu", "memory", "disk"]]
                                }
                            }]
                        }
                    }
                }
            });

            // Act
            const result = await DataAccess.getSchema(datasourceId, 'measurements', { database });

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect(result).toContain('cpu');
            expect(result).toContain('memory');
            expect(result).toContain('disk');
        });

        it('should get InfluxDB fields', async function() {
            // Arrange - Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'test-datasource-123';
            const database = 'telegraf';
            const measurement = 'cpu';
            
            mockUrl('POST', '/api/api/ds/query', {
                status: 200,
                data: {
                    results: {
                        A: {
                            frames: [{
                                schema: {
                                    fields: [
                                        { name: "fieldKey", type: "string" },
                                        { name: "fieldType", type: "string" }
                                    ]
                                },
                                data: {
                                    values: [
                                        ["usage_active", "usage_guest", "usage_idle"],
                                        ["float", "float", "float"]
                                    ]
                                }
                            }]
                        }
                    }
                }
            });

            // Act
            const result = await DataAccess.getSchema(datasourceId, 'fields', { database, measurement });

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain('usage_active');
        });

        it('should get Prometheus metrics', async function() {
            // Arrange - Set to web mode (this was missing, causing environment issues)
            window.isElectron = false;
            
            // Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'prometheus-ds-456';
            
            // Override global mock with test-specific mock data
            mockUrl('GET', '/api/api/datasources/proxy/prometheus-ds-456/api/v1/label/__name__/values', {
                status: 200,
                data: TestData.responses.prometheus.metrics
            });

            // Act
            const result = await DataAccess.getSchema(datasourceId, 'metrics');

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain('up');
        });

        it('should get Prometheus labels', async function() {
            // Arrange - Set to web mode (this was missing, causing environment issues)
            window.isElectron = false;
            
            // Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'prometheus-ds-456';
            const metric = 'cpu_usage_total';
            
            mockUrl('GET', '/api/api/datasources/proxy/prometheus-ds-456/api/v1/series?match%5B%5D=cpu_usage_total', {
                status: 200,
                data: TestData.responses.prometheus.labels
            });

            // Act
            const result = await DataAccess.getSchema(datasourceId, 'labels', { metric });

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should throw error for unknown schema type', async function() {
            // Act & Assert
            expect(async () => {
                await DataAccess.getSchema('test-datasource-123', 'unknown_type');
            }).toThrow('Unknown schema type: unknown_type');
        });

        it('should require datasourceId and schemaType', async function() {
            // Act & Assert
            expect(async () => {
                await DataAccess.getSchema('', 'databases');
            }).toThrow('Datasource ID and schema type are required');

            expect(async () => {
                await DataAccess.getSchema('test-datasource-123', '');
            }).toThrow('Datasource ID and schema type are required');
        });
    });

    describe('getDataSourceType() method', function() {
        it('should return datasource type', async function() {
            // Arrange - Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'test-datasource-123';
            
            mockUrl('GET', '/api/api/datasources/test-datasource-123', {
                status: 200,
                data: { type: 'influxdb' }
            });

            // Act
            const result = await DataAccess.getDataSourceType(datasourceId);

            // Assert
            expect(result).toBe('influxdb');
        });
    });

    describe('_processQueryResult() method', function() {
        it('should return raw result when raw option is true', function() {
            // Arrange
            const result = { test: 'data' };
            const options = { raw: true };

            // Act
            const processed = DataAccess._processQueryResult(result, options);

            // Assert
            expect(processed).toBe(result);
        });

        it('should process InfluxDB result format', function() {
            // Arrange
            const result = {
                results: [{ series: [{ name: 'cpu', values: [[1, 2, 3]] }] }]
            };
            const options = {};

            // Act
            const processed = DataAccess._processQueryResult(result, options);

            // Assert
            // The new implementation returns the result as-is
            expect(processed).toBe(result);
        });

        it('should process Prometheus result format', function() {
            // Arrange
            const result = {
                data: { resultType: 'matrix', result: [] }
            };
            const options = {};

            // Act
            const processed = DataAccess._processQueryResult(result, options);

            // Assert
            // The new implementation returns the result as-is
            expect(processed).toBe(result);
        });
    });

    describe('_extractInfluxValues() method', function() {
        it('should extract values from InfluxDB response', function() {
            // Arrange
            const result = [{
                series: [{
                    values: [['cpu'], ['memory'], ['disk']]
                }]
            }];

            // Act
            const values = DataAccess._extractInfluxValues(result);

            // Assert
            expect(Array.isArray(values)).toBe(true);
            expect(values).toEqual(['cpu', 'memory', 'disk']);
        });

        it('should return empty array for invalid result', function() {
            // Arrange & Act
            const values1 = DataAccess._extractInfluxValues(null);
            const values2 = DataAccess._extractInfluxValues([]);
            const values3 = DataAccess._extractInfluxValues([{ series: [] }]);

            // Assert
            expect(values1).toEqual([]);
            expect(values2).toEqual([]);
            expect(values3).toEqual([]);
        });

        it('should filter out null/undefined values', function() {
            // Arrange
            const result = [{
                series: [{
                    values: [['cpu'], [null], ['memory'], [undefined], ['disk']]
                }]
            }];

            // Act
            const values = DataAccess._extractInfluxValues(result);

            // Assert
            expect(values).toEqual(['cpu', 'memory', 'disk']);
        });
    });

    describe('_standardizeError() method', function() {
        it('should create standardized error with context', function() {
            // Arrange
            const originalError = new Error('Original error message');
            const context = 'Test context';

            // Act
            const standardError = DataAccess._standardizeError(originalError, context);

            // Assert
            expect(standardError.message).toBe('Test context: Original error message');
            expect(standardError.originalError).toBe(originalError);
            expect(standardError.context).toBe(context);
        });

        it('should handle error objects with response data', function() {
            // Arrange
            const originalError = {
                message: 'HTTP error',
                response: {
                    status: 404,
                    statusText: 'Not Found'
                }
            };
            const context = 'Request failed';

            // Act
            const standardError = DataAccess._standardizeError(originalError, context);

            // Assert
            expect(standardError.message).toBe('Request failed: HTTP error');
            expect(standardError.statusCode).toBe(404);
            expect(standardError.statusText).toBe('Not Found');
        });

        it('should handle string errors', function() {
            // Arrange
            const originalError = 'Simple string error';
            const context = 'String error context';

            // Act
            const standardError = DataAccess._standardizeError(originalError, context);

            // Assert
            expect(standardError.message).toBe('String error context: Simple string error');
            expect(standardError.originalError).toBe(originalError);
        });
    });

    describe('Error Handling', function() {
        it('should handle network timeout errors', async function() {
            // Arrange - Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'test-datasource-123';
            const query = 'SELECT * FROM cpu';

            mockUrl('POST', '/api/api/ds/query', {
                shouldFail: true,
                error: 'Request timeout'
            });

            // Act & Assert
            try {
                await DataAccess.executeQuery(datasourceId, query);
                expect(false).toBe(true); // Should not reach here
            } catch (error) {
                expect(error.message).toContain('Query execution failed');
                expect(error.originalError.message).toBe('Request timeout');
            }
        });

        it('should handle malformed response data', async function() {
            // Arrange - Set to web mode (this was missing, causing environment issues)
            window.isElectron = false;
            
            // Ensure we have a valid configuration
            expect(GrafanaConfig.url).toBeTruthy();
            expect(GrafanaConfig.datasourceId).toBeTruthy();
            
            const datasourceId = 'test-datasource-123';

            mockUrl('GET', '/api/api/datasources/proxy/test-datasource-123/api/v1/label/__name__/values', {
                status: 200,
                data: null // Malformed response
            });

            // Act
            const result = await DataAccess.getSchema(datasourceId, 'metrics');

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual([]);
        });
    });

    describe('Configuration Validation', function() {
        it('should validate required configuration properties', async function() {
            // Save original config
            const originalUrl = GrafanaConfig.url;
            const originalDatasourceId = GrafanaConfig.datasourceId;
            
            try {
                // Test missing URL
                Object.assign(GrafanaConfig, { url: '', datasourceId: 'test' });
                
                expect(async () => {
                    await DataAccess.request('/api/test');
                }).toThrow('Grafana connection not configured');

                // Test missing datasourceId
                Object.assign(GrafanaConfig, { url: 'http://localhost:3000', datasourceId: '' });
                
                expect(async () => {
                    await DataAccess.request('/api/test');
                }).toThrow('Grafana connection not configured');
            } finally {
                // Restore original config
                Object.assign(GrafanaConfig, { 
                    url: originalUrl, 
                    datasourceId: originalDatasourceId 
                });
            }
        });
    });
}, 'unit');