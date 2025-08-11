// Test data fixtures and constants
// This file provides reusable test data for various test scenarios

(function() {
    'use strict';

    // Test data registry
    window.TestData = {
        // Valid configurations for testing
        configs: {
            influxDB: {
                url: 'http://localhost:8086',
                authToken: 'test-token-influx',
                datasourceId: 'influx-ds-123',
                orgId: '1'
            },
            
            prometheus: {
                url: 'http://localhost:9090',
                authToken: 'test-token-prometheus',
                datasourceId: 'prometheus-ds-456',
                orgId: '1'
            },
            
            grafana: {
                url: 'http://localhost:3000',
                username: 'admin',
                password: 'admin',
                authToken: 'grafana-api-key',
                currentConnectionId: 'test-connection-1',
                currentDatasourceId: 'test-datasource-123',
                selectedDatasourceType: 'influxdb',
                selectedDatasourceUid: 'test-datasource-123',
                selectedDatasourceName: 'Test InfluxDB',
                orgId: '1'
            }
        },

        // Sample queries for different datasource types
        queries: {
            influxDB: {
                simple: 'SELECT mean("usage_idle") FROM "cpu" WHERE time > now() - 1h',
                withGroupBy: 'SELECT mean("usage_idle") FROM "cpu" WHERE time > now() - 1h GROUP BY time(1m), "host"',
                showDatabases: 'SHOW DATABASES',
                showMeasurements: 'SHOW MEASUREMENTS',
                showFieldKeys: 'SHOW FIELD KEYS FROM "cpu"',
                showTagKeys: 'SHOW TAG KEYS FROM "cpu"',
                showTagValues: 'SHOW TAG VALUES WITH KEY = "host"',
                complexAggregation: 'SELECT derivative(mean("usage_active"), 1s) FROM "cpu" WHERE time > now() - 1h GROUP BY time(30s), "host" fill(linear)',
                invalidSyntax: 'INVALID QUERY SYNTAX HERE'
            },
            
            prometheus: {
                simple: 'up',
                rateQuery: 'rate(cpu_usage_total[5m])',
                aggregation: 'sum(rate(cpu_usage_total[5m])) by (instance)',
                complexQuery: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job))',
                labelValues: 'label_values(cpu_usage_total, instance)',
                invalidSyntax: 'invalid{prometheus=query'
            }
        },

        // Time ranges for testing
        timeRanges: {
            oneHour: {
                from: (Date.now() - 3600000).toString(),
                to: Date.now().toString()
            },
            
            oneDay: {
                from: (Date.now() - 86400000).toString(),
                to: Date.now().toString()
            },
            
            oneWeek: {
                from: (Date.now() - 604800000).toString(),
                to: Date.now().toString()
            },
            
            custom: {
                from: '1609459200000', // 2021-01-01 00:00:00 UTC
                to: '1609545600000'    // 2021-01-02 00:00:00 UTC
            }
        },

        // Sample response data structures
        responses: {
            influxDB: {
                measurements: {
                    results: [{
                        series: [{
                            name: "measurements",
                            columns: ["name"],
                            values: [
                                ["cpu"],
                                ["memory"],
                                ["disk"],
                                ["network"],
                                ["system"],
                                ["processes"]
                            ]
                        }]
                    }]
                },
                
                fields: {
                    results: [{
                        series: [{
                            name: "cpu",
                            columns: ["fieldKey", "fieldType"],
                            values: [
                                ["usage_active", "float"],
                                ["usage_guest", "float"],
                                ["usage_guest_nice", "float"],
                                ["usage_idle", "float"],
                                ["usage_iowait", "float"],
                                ["usage_irq", "float"],
                                ["usage_nice", "float"],
                                ["usage_softirq", "float"],
                                ["usage_steal", "float"],
                                ["usage_system", "float"],
                                ["usage_user", "float"]
                            ]
                        }]
                    }]
                },
                
                tags: {
                    results: [{
                        series: [{
                            name: "cpu",
                            columns: ["tagKey"],
                            values: [
                                ["cpu"],
                                ["host"],
                                ["region"],
                                ["datacenter"],
                                ["environment"]
                            ]
                        }]
                    }]
                },
                
                tagValues: {
                    results: [{
                        series: [{
                            name: "cpu",
                            columns: ["key", "value"],
                            values: [
                                ["host", "server01"],
                                ["host", "server02"],
                                ["host", "server03"],
                                ["host", "server04"],
                                ["host", "server05"]
                            ]
                        }]
                    }]
                },
                
                timeSeries: {
                    results: [{
                        frames: [{
                            schema: {
                                name: "cpu{host=server01,cpu=cpu-total}",
                                fields: [
                                    {
                                        name: "time",
                                        type: "time",
                                        config: {}
                                    },
                                    {
                                        name: "usage_idle",
                                        type: "number",
                                        config: {
                                            displayNameFromDS: "usage_idle"
                                        },
                                        labels: {
                                            host: "server01",
                                            cpu: "cpu-total"
                                        }
                                    }
                                ]
                            },
                            data: {
                                values: [
                                    [1609459200000, 1609459260000, 1609459320000, 1609459380000, 1609459440000],
                                    [85.5, 87.2, 86.8, 88.1, 85.9]
                                ]
                            }
                        }]
                    }]
                }
            },
            
            prometheus: {
                metrics: {
                    data: [
                        "alertmanager_build_info",
                        "alertmanager_config_hash",
                        "cpu_usage_active",
                        "cpu_usage_idle",
                        "cpu_usage_total",
                        "disk_free",
                        "disk_total",
                        "disk_used",
                        "go_gc_duration_seconds",
                        "go_goroutines",
                        "go_info",
                        "go_memstats_alloc_bytes",
                        "http_request_duration_seconds",
                        "http_requests_total",
                        "memory_available",
                        "memory_total",
                        "memory_used",
                        "network_bytes_recv",
                        "network_bytes_sent",
                        "process_cpu_seconds_total",
                        "process_open_fds",
                        "process_resident_memory_bytes",
                        "process_start_time_seconds",
                        "prometheus_build_info",
                        "prometheus_config_last_reload_successful",
                        "up"
                    ]
                },
                
                labels: {
                    data: [{
                        __name__: "cpu_usage_total",
                        cpu: "cpu0",
                        host: "server01",
                        instance: "localhost:9100",
                        job: "node-exporter",
                        mode: "idle"
                    }, {
                        __name__: "cpu_usage_total",
                        cpu: "cpu0", 
                        host: "server01",
                        instance: "localhost:9100",
                        job: "node-exporter",
                        mode: "system"
                    }]
                },
                
                timeSeries: {
                    data: {
                        resultType: "matrix",
                        result: [{
                            metric: {
                                __name__: "cpu_usage_total",
                                cpu: "cpu0",
                                host: "server01",
                                instance: "localhost:9100",
                                job: "node-exporter",
                                mode: "idle"
                            },
                            values: [
                                [1609459200, "85.5"],
                                [1609459260, "87.2"],
                                [1609459320, "86.8"],
                                [1609459380, "88.1"],
                                [1609459440, "85.9"]
                            ]
                        }]
                    }
                }
            }
        },

        // Error scenarios for testing
        errors: {
            networkError: new Error('Network request failed'),
            
            authError: {
                status: 401,
                message: 'Authentication required',
                data: { error: 'Invalid credentials' }
            },
            
            notFoundError: {
                status: 404,
                message: 'Datasource not found',
                data: { error: 'Datasource with ID "nonexistent" not found' }
            },
            
            queryError: {
                status: 400,
                message: 'Bad request',
                data: { 
                    error: 'syntax error at position 15: unexpected token "INVALID"',
                    errorType: 'bad_data'
                }
            },
            
            serverError: {
                status: 500,
                message: 'Internal server error',
                data: { error: 'Database connection failed' }
            },
            
            timeoutError: {
                status: 408,
                message: 'Request timeout',
                data: { error: 'Query execution timeout after 30 seconds' }
            }
        },

        // Schema data for testing
        schema: {
            influxDB: {
                databases: ["telegraf", "_internal", "test_db", "monitoring"],
                
                measurements: {
                    telegraf: ["cpu", "memory", "disk", "network", "system", "processes"],
                    test_db: ["temperature", "humidity", "pressure"],
                    monitoring: ["alerts", "notifications", "events"]
                },
                
                fields: {
                    cpu: ["usage_active", "usage_idle", "usage_system", "usage_user"],
                    memory: ["available", "total", "used", "free", "cached"],
                    disk: ["free", "total", "used", "inodes_free", "inodes_total"]
                },
                
                tags: {
                    cpu: ["host", "cpu", "region", "datacenter"],
                    memory: ["host", "region", "datacenter"],
                    disk: ["host", "device", "fstype", "path", "region"]
                },
                
                tagValues: {
                    host: ["server01", "server02", "server03", "server04"],
                    cpu: ["cpu-total", "cpu0", "cpu1", "cpu2", "cpu3"],
                    region: ["us-east-1", "us-west-2", "eu-west-1"],
                    datacenter: ["dc1", "dc2", "dc3"]
                }
            },
            
            prometheus: {
                metrics: [
                    "up", "cpu_usage_active", "cpu_usage_idle", "memory_available",
                    "memory_total", "disk_free", "network_bytes_recv", "http_requests_total"
                ],
                
                labels: {
                    up: ["instance", "job"],
                    cpu_usage_active: ["instance", "job", "cpu", "mode"],
                    memory_available: ["instance", "job"],
                    http_requests_total: ["instance", "job", "method", "handler", "code"]
                }
            }
        },

        // Request options for testing
        requestOptions: {
            basic: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            },
            
            withAuth: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                }
            },
            
            influxQuery: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Grafana-URL': 'http://localhost:8086',
                    'X-Grafana-Org-Id': '1'
                },
                body: JSON.stringify({
                    from: "1609459200000",
                    to: "1609545600000",
                    queries: [{
                        refId: "A",
                        query: "SELECT mean(\"usage_idle\") FROM \"cpu\" WHERE time > now() - 1h",
                        rawQuery: true,
                        datasourceId: "test-datasource-123"
                    }]
                })
            }
        },

        // Utility test data
        intervals: {
            valid: ['1s', '30s', '1m', '5m', '15m', '1h', '6h', '12h', '1d'],
            invalid: ['invalid', '0s', '-1m', '1x', 'forever']
        },
        
        datasourceTypes: ['influxdb', 'prometheus', 'elasticsearch', 'mysql', 'postgres'],
        
        queryTypes: ['instant', 'range', 'time_series', 'table', 'logs']
    };

    // Helper functions for generating test data
    window.TestDataHelpers = {
        // Generate a time series with specified points
        generateTimeSeries: function(points = 10, startTime = Date.now() - 3600000, interval = 60000) {
            const times = [];
            const values = [];
            
            for (let i = 0; i < points; i++) {
                times.push(startTime + (i * interval));
                values.push(Math.random() * 100); // Random values between 0-100
            }
            
            return { times, values };
        },
        
        // Generate mock InfluxDB frame
        generateInfluxFrame: function(measurementName, fieldName, tagValues = {}) {
            const { times, values } = this.generateTimeSeries();
            
            return {
                schema: {
                    name: `${measurementName}{${Object.entries(tagValues).map(([k,v]) => `${k}=${v}`).join(',')}}`,
                    fields: [
                        { name: "time", type: "time" },
                        { 
                            name: fieldName, 
                            type: "number",
                            labels: tagValues
                        }
                    ]
                },
                data: {
                    values: [times, values]
                }
            };
        },
        
        // Generate mock Prometheus result
        generatePrometheusResult: function(metricName, labels = {}) {
            const { times, values } = this.generateTimeSeries();
            const prometheusValues = times.map((time, index) => [
                Math.floor(time / 1000), // Prometheus uses seconds, not milliseconds
                values[index].toString()
            ]);
            
            return {
                metric: {
                    __name__: metricName,
                    ...labels
                },
                values: prometheusValues
            };
        },
        
        // Create a configuration object with overrides
        createConfig: function(type = 'grafana', overrides = {}) {
            return Object.assign({}, TestData.configs[type], overrides);
        },
        
        // Create a mock error response
        createError: function(type = 'networkError', customMessage = null) {
            const error = Object.assign({}, TestData.errors[type]);
            if (customMessage) {
                error.message = customMessage;
                if (error.data) {
                    error.data.error = customMessage;
                }
            }
            return error;
        }
    };

    console.log('✅ Test data fixtures initialized');
})();