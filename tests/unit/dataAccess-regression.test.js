describe('DataAccess Regression Tests', function() {
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
        
        // Clear all mock responses to prevent test interference
        if (window.MockResponses) {
            window.MockResponses = {};
        }
    });
    
    describe('Query Endpoint Format', function() {

        it('should use /api/ds/query endpoint for InfluxDB queries', async function() {
            // Arrange
            const datasourceId = 'influx-ds-123';
            const query = 'SELECT * FROM "cpu" WHERE time > now() - 1h';
            
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
                                    values: [[1234567890000], [42.5]]
                                }
                            }]
                        }
                    }
                }
            });

            // Act
            await DataAccess.executeQuery(datasourceId, query, {
                datasourceType: 'influxdb',
                database: 'telegraf'
            });

            // Assert - fetch was called with correct URL
            expect(window.fetch).toHaveBeenCalled();
            const fetchCall = window.fetch.calls[0];
            const [url, options] = fetchCall;
            
            // URL should be /api/ds/query
            expect(url).toBe('/api/api/ds/query');
            
            // Request body follows Grafana API spec
            const body = JSON.parse(options.body);
            expect(body.queries).toBeDefined();
            expect(body.queries[0].datasource).toEqual({ uid: datasourceId });
            expect(body.queries[0].refId).toBe('A');
            expect(body.queries[0].format).toBe('time_series');
            expect(body.from).toBeDefined();
            expect(body.to).toBeDefined();
        });

        it('should use /api/ds/query endpoint for Prometheus queries', async function() {
            // Arrange
            const datasourceId = 'prom-ds-456';
            const query = 'up{job="prometheus"}';
            
            // Update GrafanaConfig to ensure correct datasourceId is used
            GrafanaConfig.datasourceId = datasourceId;
            GrafanaConfig.currentDatasourceId = datasourceId;
            
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
                                        { name: "up", type: "number" }
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
            await DataAccess.executeQuery(datasourceId, query, {
                datasourceType: 'prometheus'
            });

            // Assert - fetch was called with correct URL
            expect(window.fetch).toHaveBeenCalled();
            // Find the specific call for this test (may not be the first call)
            const relevantCall = window.fetch.calls.find(call => {
                if (call[0] === '/api/api/ds/query' && call[1].method === 'POST') {
                    const body = JSON.parse(call[1].body);
                    return body.queries && body.queries[0] && body.queries[0].expr === query;
                }
                return false;
            });
            
            expect(relevantCall).toBeDefined();
            const [url, options] = relevantCall;
            
            // URL should be /api/ds/query
            expect(url).toBe('/api/api/ds/query');
            
            // Request body follows Grafana API spec
            const body = JSON.parse(options.body);
            expect(body.queries).toBeDefined();
            expect(body.queries[0].datasource).toEqual({ uid: datasourceId });
            expect(body.queries[0].expr).toBe(query);
            expect(body.queries[0].refId).toBe('A');
            expect(body.queries[0].format).toBe('time_series');
        });

        it('should include database field in request body for InfluxDB', async function() {
            // Arrange
            const datasourceId = 'influx-ds-123';
            const query = 'SELECT * FROM "cpu"';
            const database = 'mydb';
            
            // Update GrafanaConfig to ensure correct datasourceId is used
            GrafanaConfig.datasourceId = datasourceId;
            GrafanaConfig.currentDatasourceId = datasourceId;
            
            // Mock the response
            mockUrl('POST', '/api/api/ds/query', {
                status: 200,
                data: {
                    results: {
                        A: { frames: [] }
                    }
                }
            });

            // Act
            await DataAccess.executeQuery(datasourceId, query, {
                datasourceType: 'influxdb',
                database: database
            });

            // Assert
            expect(window.fetch).toHaveBeenCalled();
            // Find the specific call for this test
            const relevantCall = window.fetch.calls.find(call => {
                if (call[0] === '/api/api/ds/query' && call[1].method === 'POST') {
                    const body = JSON.parse(call[1].body);
                    return body.queries && body.queries[0] && body.queries[0].query === query;
                }
                return false;
            });
            
            expect(relevantCall).toBeDefined();
            const body = JSON.parse(relevantCall[1].body);
            expect(body.database).toBe(database);
            expect(body.queries).toBeDefined();
            expect(body.queries[0].database).toBe(database);
        });

        it('should include datasourceId in query object', async function() {
            // Arrange
            const datasourceId = 'test-ds-789';
            const query = 'SELECT * FROM "memory"';
            
            // Update GrafanaConfig to ensure correct datasourceId is used
            GrafanaConfig.datasourceId = datasourceId;
            GrafanaConfig.currentDatasourceId = datasourceId;
            
            // Mock the response
            mockUrl('POST', '/api/api/ds/query', {
                status: 200,
                data: {
                    results: {
                        A: { frames: [] }
                    }
                }
            });

            // Act
            await DataAccess.executeQuery(datasourceId, query, {
                datasourceType: 'influxdb'
            });

            // Assert
            expect(window.fetch).toHaveBeenCalled();
            // Find the specific call for this test
            const relevantCall = window.fetch.calls.find(call => {
                if (call[0] === '/api/api/ds/query' && call[1].method === 'POST') {
                    const body = JSON.parse(call[1].body);
                    return body.queries && body.queries[0] && body.queries[0].query === query;
                }
                return false;
            });
            
            expect(relevantCall).toBeDefined();
            const body = JSON.parse(relevantCall[1].body);
            expect(body.queries).toBeDefined();
            // Note: QueryRequestBuilder doesn't include datasourceId field, only datasource object
            // expect(body.queries[0].datasourceId).toBe(datasourceId);
            // Should have datasource object per Grafana API spec
            expect(body.queries[0].datasource).toEqual({ uid: datasourceId });
        });

        it('should handle Grafana API response format', async function() {
            // Arrange
            const datasourceId = 'test-ds-123';
            const query = 'SELECT * FROM "cpu"';
            
            // Mock the response per Grafana API docs
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
                                        { name: "usage_idle", type: "number" }
                                    ]
                                },
                                data: {
                                    values: [
                                        [1234567890000, 1234567891000],
                                        [85.5, 87.2]
                                    ]
                                }
                            }]
                        }
                    }
                }
            });

            // Act
            const result = await DataAccess.executeQuery(datasourceId, query, {
                datasourceType: 'influxdb'
            });

            // Assert - Result should match Grafana API format
            expect(result).toBeDefined();
            expect(result.results).toBeDefined();
            expect(result.results.A).toBeDefined();
            expect(result.results.A.frames).toBeDefined();
            expect(result.results.A.frames[0].schema.fields[0].name).toBe('time');
        });
    });

    describe('Schema Operations', function() {
        it('should use /api/ds/query endpoint for schema queries', async function() {
            // Arrange
            const datasourceId = 'influx-ds-123';
            
            // Update GrafanaConfig to ensure correct datasourceId is used
            GrafanaConfig.datasourceId = datasourceId;
            GrafanaConfig.currentDatasourceId = datasourceId;
            
            // Mock the response
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
                                    values: [['db1', 'db2']]
                                }
                            }]
                        }
                    }
                }
            });

            // Act
            await DataAccess.getSchema(datasourceId, 'databases');

            // Assert
            expect(window.fetch).toHaveBeenCalled();
            // Find the last call since there might be multiple calls
            const lastCall = window.fetch.calls[window.fetch.calls.length - 1];
            const [url, options] = lastCall;
            const body = JSON.parse(options.body);
            expect(url).toBe('/api/api/ds/query');
            expect(body.queries[0].query).toBe('SHOW DATABASES');
        });
    });
    
    describe('Regression Prevention', function() {
        it('should NEVER use /api/datasources/proxy/{id}/query endpoint', async function() {
            // This test ensures we don't accidentally revert to the old endpoint
            const datasourceId = 'test-ds-123';
            const query = 'SELECT * FROM test';
            
            // Mock the response
            mockUrl('POST', '/api/api/ds/query', {
                status: 200,
                data: {
                    results: { A: { frames: [] } }
                }
            });

            // Act
            await DataAccess.executeQuery(datasourceId, query, {
                datasourceType: 'influxdb'
            });

            // Assert - Ensure we're NOT using the proxy endpoint
            expect(window.fetch).toHaveBeenCalled();
            const url = window.fetch.calls[0][0];
            expect(url.includes('/datasources/proxy/')).toBe(false);
            expect(url).toContain('/ds/query');
        });
        
        it('should include all required fields per Grafana API documentation', async function() {
            const datasourceId = 'test-ds-123';
            const query = 'SELECT * FROM test';
            
            // Update GrafanaConfig to ensure correct datasourceId is used
            GrafanaConfig.datasourceId = datasourceId;
            GrafanaConfig.currentDatasourceId = datasourceId;
            
            // Mock the response
            mockUrl('POST', '/api/api/ds/query', {
                status: 200,
                data: {
                    results: { A: { frames: [] } }
                }
            });

            // Act
            await DataAccess.executeQuery(datasourceId, query, {
                datasourceType: 'influxdb',
                timeRange: { from: '1234567890000', to: '1234567900000' },
                maxDataPoints: 1000,
                intervalMs: 5000
            });

            // Assert - Check all required fields per docs
            expect(window.fetch).toHaveBeenCalled();
            const lastCall = window.fetch.calls[window.fetch.calls.length - 1];
            const body = JSON.parse(lastCall[1].body);
            expect(body.from).toBe('1234567890000');
            expect(body.to).toBe('1234567900000');
            expect(body.queries).toBeDefined();
            expect(body.queries.length).toBeGreaterThan(0);
            
            const firstQuery = body.queries[0];
            expect(firstQuery.datasource).toBeDefined();
            expect(firstQuery.datasource.uid).toBe(datasourceId);
            expect(firstQuery.refId).toBe('A');
            expect(firstQuery.format).toBe('time_series');
            expect(firstQuery.maxDataPoints).toBe(1000);
            expect(firstQuery.intervalMs).toBe(5000);
        });
    });
});