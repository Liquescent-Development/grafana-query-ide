// QueryRequestBuilder Module Unit Tests
// Comprehensive tests for query request building functionality

describe('QueryRequestBuilder Module', function() {
    let cleanupConfig, cleanupDOM;

    beforeEach(function() {
        // Setup clean test environment
        setupTest();
        cleanupConfig = TestUtils.mockGrafanaConfig();
        cleanupDOM = TestUtils.setupTestDOM();
    });

    afterEach(function() {
        // Cleanup after each test
        if (cleanupConfig) cleanupConfig();
        if (cleanupDOM) cleanupDOM();
        cleanupTest();
    });

    describe('buildRequest() method', function() {
        it('should build basic request with defaults', function() {
            // Arrange
            const datasourceId = 'test-datasource-123';
            const query = 'SELECT * FROM cpu';

            // Act
            const request = QueryRequestBuilder.buildRequest(datasourceId, query);

            // Assert
            expect(request).toHaveProperty('from');
            expect(request).toHaveProperty('to');
            expect(request).toHaveProperty('queries');
            expect(Array.isArray(request.queries)).toBe(true);
            expect(request.queries.length).toBe(1);
        });

        it('should build Prometheus query request', function() {
            // Arrange
            const datasourceId = 'prometheus-ds-123';
            const query = 'up';
            const options = {
                datasourceType: 'prometheus',
                maxDataPoints: 500,
                interval: '1m'
            };

            // Act
            const request = QueryRequestBuilder.buildRequest(datasourceId, query, options);

            // Assert
            expect(request.queries[0]).toHaveProperty('expr');
            expect(request.queries[0].expr).toBe('up');
            expect(request.queries[0]).toHaveProperty('refId');
            expect(request.queries[0].refId).toBe('A');
            expect(request.queries[0].maxDataPoints).toBe(500);
            expect(request.queries[0].interval).toBe('1m');
        });

        it('should build InfluxDB query request', function() {
            // Arrange
            const datasourceId = 'influx-ds-123';
            const query = 'SELECT mean("usage_idle") FROM "cpu"';
            const options = {
                datasourceType: 'influxdb',
                maxDataPoints: 1000,
                format: 'time_series'
            };

            // Act
            const request = QueryRequestBuilder.buildRequest(datasourceId, query, options);

            // Assert
            expect(request.queries[0]).toHaveProperty('query');
            expect(request.queries[0].query).toBe(query);
            expect(request.queries[0]).toHaveProperty('rawQuery');
            expect(request.queries[0].rawQuery).toBe(true);
            expect(request.queries[0].maxDataPoints).toBe(1000);
            expect(request.queries[0].format).toBe('time_series');
        });

        it('should auto-detect Prometheus queries', function() {
            // Arrange
            const datasourceId = 'test-datasource-123';
            const prometheusQueries = [
                'up',
                'cpu_usage{instance="localhost"}',
                'rate(http_requests_total[5m])',
                'sum(cpu_usage) by (instance)',
                'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
                'cpu_usage offset 1h'
            ];

            prometheusQueries.forEach(query => {
                // Act
                const request = QueryRequestBuilder.buildRequest(datasourceId, query);

                // Assert
                expect(request.queries[0]).toHaveProperty('expr');
                expect(request.queries[0].expr).toBe(query);
            });
        });

        it('should handle custom time range', function() {
            // Arrange
            const datasourceId = 'test-datasource-123';
            const query = 'SELECT * FROM cpu';
            const timeRange = {
                from: '1609459200000',
                to: '1609545600000'
            };

            // Act
            const request = QueryRequestBuilder.buildRequest(datasourceId, query, { timeRange });

            // Assert
            expect(request.from).toBe('1609459200000');
            expect(request.to).toBe('1609545600000');
        });

        it('should handle scoped variables', function() {
            // Arrange
            const datasourceId = 'test-datasource-123';
            const query = 'up';
            const scopedVars = {
                '__interval': { text: '1m', value: '1m' },
                '__from': { text: 'now-1h', value: '1609459200000' }
            };

            // Act
            const request = QueryRequestBuilder.buildRequest(datasourceId, query, { scopedVars });

            // Assert
            expect(request.queries[0].scopedVars).toEqual(scopedVars);
        });
    });

    describe('_buildPrometheusQuery() method', function() {
        it('should build Prometheus query with all options', function() {
            // Arrange
            const expr = 'rate(cpu_usage_total[5m])';
            const options = {
                refId: 'B',
                datasourceId: 'prometheus-ds-123',
                maxDataPoints: 600,
                interval: '30s',
                format: 'time_series',
                scopedVars: { '__interval': { value: '30s' } }
            };

            // Act
            const query = QueryRequestBuilder._buildPrometheusQuery(expr, options);

            // Assert
            expect(query.refId).toBe('B');
            expect(query.expr).toBe(expr);
            expect(query.datasource).toEqual({ uid: 'prometheus-ds-123' });
            expect(query.maxDataPoints).toBe(600);
            expect(query.interval).toBe('30s');
            expect(query.format).toBe('time_series');
            expect(query.scopedVars).toEqual(options.scopedVars);
            expect(query.range).toBe(true);
            expect(query.instant).toBe(false);
        });

        it('should handle interval parsing', function() {
            // Arrange
            const expr = 'up';
            const options = {
                refId: 'A',
                datasourceId: 'test',
                interval: '2m'
            };

            // Act
            const query = QueryRequestBuilder._buildPrometheusQuery(expr, options);

            // Assert
            expect(query.interval).toBe('2m');
            expect(query.intervalMs).toBe(120000); // 2 minutes in ms
        });
    });

    describe('_buildInfluxQuery() method', function() {
        it('should build InfluxDB query with all options', function() {
            // Arrange
            const queryText = 'SELECT mean("usage_idle") FROM "cpu"';
            const options = {
                refId: 'C',
                datasourceId: 'influx-ds-123',
                maxDataPoints: 800,
                format: 'table',
                alias: 'CPU Idle Usage'
            };

            // Act
            const query = QueryRequestBuilder._buildInfluxQuery(queryText, options);

            // Assert
            expect(query.refId).toBe('C');
            expect(query.query).toBe(queryText);
            expect(query.rawQuery).toBe(true);
            expect(query.datasource).toEqual({ uid: 'influx-ds-123' });
            expect(query.maxDataPoints).toBe(800);
            expect(query.format).toBe('table');
            expect(query.alias).toBe('CPU Idle Usage');
        });
    });

    describe('_isPrometheusQuery() method', function() {
        it('should detect Prometheus metric queries', function() {
            const prometheusQueries = [
                'up',
                'cpu_usage',
                'http_requests_total{method="GET"}',
                'memory_usage[5m]'
            ];

            prometheusQueries.forEach(query => {
                expect(QueryRequestBuilder._isPrometheusQuery(query)).toBe(true);
            });
        });

        it('should detect Prometheus function queries', function() {
            const prometheusFunctions = [
                'rate(cpu_usage[5m])',
                'sum(memory_usage) by (instance)',
                'avg(disk_usage)',
                'max(network_bytes)',
                'min(temperature)',
                'count(up)',
                'irate(requests_total[1m])',
                'increase(counter[1h])',
                'histogram_quantile(0.95, rate(http_durations_bucket[5m]))',
                'predict_linear(cpu_usage[1h], 3600)'
            ];

            prometheusFunctions.forEach(query => {
                expect(QueryRequestBuilder._isPrometheusQuery(query)).toBe(true);
            });
        });

        it('should detect Prometheus aggregation queries', function() {
            const aggregationQueries = [
                'sum(cpu_usage) by (instance)',
                'avg(memory) without (job)',
                'cpu_usage offset 1h'
            ];

            aggregationQueries.forEach(query => {
                expect(QueryRequestBuilder._isPrometheusQuery(query)).toBe(true);
            });
        });

        it('should not detect InfluxDB queries as Prometheus', function() {
            const influxQueries = [
                'SELECT * FROM cpu',
                'SHOW DATABASES',
                'SELECT mean("usage_idle") FROM "cpu" WHERE time > now() - 1h',
                'SELECT derivative(mean("usage_active")) FROM "cpu" GROUP BY time(1m)'
            ];

            influxQueries.forEach(query => {
                expect(QueryRequestBuilder._isPrometheusQuery(query)).toBe(false);
            });
        });
    });

    describe('_getDefaultTimeRange() method', function() {
        it('should return default time range', function() {
            // Act
            const timeRange = QueryRequestBuilder._getDefaultTimeRange();

            // Assert
            expect(timeRange).toHaveProperty('from');
            expect(timeRange).toHaveProperty('to');
            expect(typeof timeRange.from).toBe('string');
            expect(typeof timeRange.to).toBe('string');
            
            const fromTime = parseInt(timeRange.from);
            const toTime = parseInt(timeRange.to);
            expect(toTime - fromTime).toBe(3600000); // 1 hour
        });
    });

    describe('_parseInterval() method', function() {
        it('should parse valid intervals correctly', function() {
            const intervals = [
                { input: '30s', expected: 30000 },
                { input: '5m', expected: 300000 },
                { input: '2h', expected: 7200000 },
                { input: '1d', expected: 86400000 }
            ];

            intervals.forEach(({ input, expected }) => {
                const result = QueryRequestBuilder._parseInterval(input);
                expect(result).toBe(expected);
            });
        });

        it('should return default for invalid intervals', function() {
            const invalidIntervals = [
                null,
                undefined,
                '',
                'invalid',
                '0s',
                'forever',
                '1x'
            ];

            invalidIntervals.forEach(interval => {
                const result = QueryRequestBuilder._parseInterval(interval);
                expect(result).toBe(10000); // Default 10s
            });
        });
    });

    describe('buildBatchRequest() method', function() {
        it('should build request for multiple queries', function() {
            // Arrange
            const queries = [
                { datasourceId: 'ds1', query: 'up', datasourceType: 'prometheus' },
                { datasourceId: 'ds2', query: 'SELECT * FROM cpu', datasourceType: 'influxdb' },
                { datasourceId: 'ds1', query: 'memory_usage', datasourceType: 'prometheus' }
            ];

            // Act
            const request = QueryRequestBuilder.buildBatchRequest(queries);

            // Assert
            expect(request.queries.length).toBe(3);
            expect(request.queries[0].refId).toBe('A');
            expect(request.queries[1].refId).toBe('B');
            expect(request.queries[2].refId).toBe('C');
            
            // First query should be Prometheus
            expect(request.queries[0]).toHaveProperty('expr');
            expect(request.queries[0].expr).toBe('up');
            
            // Second query should be InfluxDB
            expect(request.queries[1]).toHaveProperty('query');
            expect(request.queries[1].query).toBe('SELECT * FROM cpu');
            
            // Third query should be Prometheus
            expect(request.queries[2]).toHaveProperty('expr');
            expect(request.queries[2].expr).toBe('memory_usage');
        });

        it('should handle custom time range for batch requests', function() {
            // Arrange
            const queries = [
                { datasourceId: 'ds1', query: 'up' }
            ];
            const timeRange = {
                from: '1609459200000',
                to: '1609545600000'
            };

            // Act
            const request = QueryRequestBuilder.buildBatchRequest(queries, { timeRange });

            // Assert
            expect(request.from).toBe('1609459200000');
            expect(request.to).toBe('1609545600000');
        });
    });

    describe('buildVariableRequest() method', function() {
        it('should build variable request for Prometheus', function() {
            // Arrange
            const datasourceId = 'prometheus-ds-123';
            const query = 'up';

            // Act
            const request = QueryRequestBuilder.buildVariableRequest(datasourceId, query);

            // Assert
            expect(request.queries[0]).toHaveProperty('expr');
            expect(request.queries[0].format).toBe('time_series');
            expect(request.queries[0].instant).toBe(true);
        });

        it('should build variable request for InfluxDB', function() {
            // Arrange
            const datasourceId = 'influx-ds-123';
            const query = 'SHOW TAG VALUES WITH KEY = "host"';

            // Act
            const request = QueryRequestBuilder.buildVariableRequest(datasourceId, query);

            // Assert
            expect(request.queries[0]).toHaveProperty('query');
            expect(request.queries[0].query).toBe(query);
        });

        it('should handle Prometheus label_values queries', function() {
            // Arrange
            const datasourceId = 'prometheus-ds-123';
            const query = 'label_values(up, instance)';

            // Act
            const request = QueryRequestBuilder._buildPrometheusLabelValuesRequest(query, datasourceId);

            // Assert
            expect(request).toHaveProperty('url');
            expect(request.url).toContain('/api/v1/series');
            expect(request.params['match[]']).toBe('up');
            expect(request.extractLabel).toBe('instance');
        });

        it('should handle simple label_values queries', function() {
            // Arrange
            const datasourceId = 'prometheus-ds-123';
            const query = 'label_values(job)';

            // Act
            const request = QueryRequestBuilder._buildPrometheusLabelValuesRequest(query, datasourceId);

            // Assert
            expect(request).toHaveProperty('url');
            expect(request.url).toContain('/api/v1/label/job/values');
        });

        it('should throw error for invalid label_values query', function() {
            // Arrange
            const datasourceId = 'prometheus-ds-123';
            const query = 'label_values invalid syntax';

            // Act & Assert
            expect(() => {
                QueryRequestBuilder._buildPrometheusLabelValuesRequest(query, datasourceId);
            }).toThrow('Invalid label_values query format');
        });
    });

    describe('buildPanelRequest() method', function() {
        it('should build panel request with multiple targets', function() {
            // Arrange
            const panel = {
                targets: [
                    {
                        refId: 'A',
                        expr: 'up',
                        datasource: { uid: 'prometheus-ds' },
                        legendFormat: '{{instance}}'
                    },
                    {
                        refId: 'B',
                        query: 'SELECT * FROM cpu',
                        datasource: { uid: 'influx-ds' },
                        alias: 'CPU Usage'
                    },
                    {
                        refId: 'C',
                        expr: 'hidden_metric',
                        hide: true // Should be skipped
                    }
                ]
            };
            const datasourceId = 'default-ds';

            // Act
            const request = QueryRequestBuilder.buildPanelRequest(panel, datasourceId);

            // Assert
            expect(request.queries.length).toBe(2); // Third target is hidden
            
            // First target (Prometheus)
            expect(request.queries[0].refId).toBe('A');
            expect(request.queries[0]).toHaveProperty('expr');
            expect(request.queries[0].datasource).toEqual({ uid: 'prometheus-ds' });
            expect(request.queries[0].legendFormat).toBe('{{instance}}');
            
            // Second target (InfluxDB)
            expect(request.queries[1].refId).toBe('B');
            expect(request.queries[1]).toHaveProperty('query');
            expect(request.queries[1].datasource).toEqual({ uid: 'influx-ds' });
            expect(request.queries[1].alias).toBe('CPU Usage');
        });

        it('should handle panel with no targets', function() {
            // Arrange
            const panel = { targets: [] };
            const datasourceId = 'test-ds';

            // Act
            const request = QueryRequestBuilder.buildPanelRequest(panel, datasourceId);

            // Assert
            expect(request.queries.length).toBe(0);
        });

        it('should skip targets without queries', function() {
            // Arrange
            const panel = {
                targets: [
                    { refId: 'A', expr: 'up' },
                    { refId: 'B' }, // No query
                    { refId: 'C', query: '' } // Empty query
                ]
            };
            const datasourceId = 'test-ds';

            // Act
            const request = QueryRequestBuilder.buildPanelRequest(panel, datasourceId);

            // Assert
            expect(request.queries.length).toBe(1);
            expect(request.queries[0].refId).toBe('A');
        });
    });

    describe('mergeTimeRanges() method', function() {
        it('should merge two time ranges correctly', function() {
            // Arrange
            const range1 = { from: '1609459200000', to: '1609462800000' };
            const range2 = { from: '1609460400000', to: '1609464000000' };

            // Act
            const merged = QueryRequestBuilder.mergeTimeRanges(range1, range2);

            // Assert
            expect(merged.from).toBe('1609459200000'); // Earlier start
            expect(merged.to).toBe('1609464000000');   // Later end
        });

        it('should handle null ranges', function() {
            // Arrange
            const range1 = { from: '1609459200000', to: '1609462800000' };

            // Act & Assert
            expect(QueryRequestBuilder.mergeTimeRanges(null, range1)).toEqual(range1);
            expect(QueryRequestBuilder.mergeTimeRanges(range1, null)).toEqual(range1);
            expect(QueryRequestBuilder.mergeTimeRanges(null, null)).toBe(null);
        });
    });

    describe('validateRequest() method', function() {
        it('should validate valid request', function() {
            // Arrange
            const request = {
                from: '1609459200000',
                to: '1609462800000',
                queries: [{
                    refId: 'A',
                    expr: 'up',
                    datasource: { uid: 'test-ds' }
                }]
            };

            // Act & Assert
            expect(QueryRequestBuilder.validateRequest(request)).toBe(true);
        });

        it('should throw error for missing request', function() {
            expect(() => {
                QueryRequestBuilder.validateRequest(null);
            }).toThrow('Request is required');
        });

        it('should throw error for missing time range', function() {
            const request = {
                queries: [{ refId: 'A', expr: 'up', datasourceId: 'test-ds' }]
            };

            expect(() => {
                QueryRequestBuilder.validateRequest(request);
            }).toThrow('Time range (from/to) is required');
        });

        it('should throw error for missing queries', function() {
            const request = {
                from: '1609459200000',
                to: '1609462800000'
            };

            expect(() => {
                QueryRequestBuilder.validateRequest(request);
            }).toThrow('At least one query is required');

            request.queries = [];
            expect(() => {
                QueryRequestBuilder.validateRequest(request);
            }).toThrow('At least one query is required');
        });

        it('should validate individual queries', function() {
            const baseRequest = {
                from: '1609459200000',
                to: '1609462800000',
                queries: []
            };

            // Missing refId
            baseRequest.queries = [{ expr: 'up', datasource: { uid: 'test-ds' } }];
            expect(() => {
                QueryRequestBuilder.validateRequest(baseRequest);
            }).toThrow('Query 0 is missing refId');

            // Missing datasource
            baseRequest.queries = [{ refId: 'A', expr: 'up' }];
            expect(() => {
                QueryRequestBuilder.validateRequest(baseRequest);
            }).toThrow('Query 0 is missing datasource');

            // Missing expression
            baseRequest.queries = [{ refId: 'A', datasource: { uid: 'test-ds' } }];
            expect(() => {
                QueryRequestBuilder.validateRequest(baseRequest);
            }).toThrow('Query 0 is missing expression');
        });
    });

    describe('Edge Cases and Error Handling', function() {
        it('should handle empty query strings', function() {
            // Act
            const request = QueryRequestBuilder.buildRequest('test-ds', '');

            // Assert
            expect(request.queries[0].query).toBe('');
        });

        it('should handle very long queries', function() {
            // Arrange
            const longQuery = 'SELECT ' + 'field,'.repeat(1000) + 'time FROM measurement';

            // Act
            const request = QueryRequestBuilder.buildRequest('test-ds', longQuery);

            // Assert
            expect(request.queries[0].query).toBe(longQuery);
        });

        it('should handle special characters in queries', function() {
            // Arrange
            const specialQuery = 'SELECT "field with spaces" FROM "measurement-with-dashes" WHERE "tag" = \'value with "quotes"\'';

            // Act
            const request = QueryRequestBuilder.buildRequest('test-ds', specialQuery);

            // Assert
            expect(request.queries[0].query).toBe(specialQuery);
        });

        it('should handle extreme time ranges', function() {
            // Arrange
            const extremeRange = {
                from: '0',
                to: '9999999999999'
            };

            // Act
            const request = QueryRequestBuilder.buildRequest('test-ds', 'up', { timeRange: extremeRange });

            // Assert
            expect(request.from).toBe('0');
            expect(request.to).toBe('9999999999999');
        });
    });
}, 'unit');