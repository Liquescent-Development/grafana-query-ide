// Mock API responses for testing
// This file contains realistic mock responses for various API endpoints

(function() {
    'use strict';

    // Global mock responses registry
    window.MockResponses = {};

    // InfluxDB mock responses
    const influxDBResponses = {
        // Show databases query
        'POST /api/datasources/proxy/test-datasource-123/query': {
            status: 200,
            data: {
                results: [{
                    series: [{
                        name: "databases",
                        columns: ["name"],
                        values: [
                            ["telegraf"],
                            ["_internal"],
                            ["test_db"]
                        ]
                    }]
                }]
            }
        },

        // Show measurements query
        'POST /api/datasources/proxy/test-datasource-123/query_measurements': {
            status: 200,
            data: {
                results: [{
                    series: [{
                        name: "measurements",
                        columns: ["name"],
                        values: [
                            ["cpu"],
                            ["memory"],
                            ["disk"],
                            ["network"],
                            ["system"]
                        ]
                    }]
                }]
            }
        },

        // Generic InfluxDB query endpoint that handles all schema queries
        'POST /api/api/datasources/proxy/test-datasource-123/query': {
            status: 200,
            data: {
                results: [{
                    series: [{
                        name: "measurements",
                        columns: ["name"],
                        values: [
                            ["cpu"],
                            ["memory"],
                            ["disk"],
                            ["network"],
                            ["system"]
                        ]
                    }]
                }]
            }
        },

        // Show field keys query
        'POST /api/datasources/proxy/test-datasource-123/query_fields': {
            status: 200,
            data: {
                results: [{
                    series: [{
                        name: "cpu",
                        columns: ["fieldKey", "fieldType"],
                        values: [
                            ["usage_active", "float"],
                            ["usage_idle", "float"],
                            ["usage_system", "float"],
                            ["usage_user", "float"]
                        ]
                    }]
                }]
            }
        },

        // Show tag keys query
        'POST /api/datasources/proxy/test-datasource-123/query_tags': {
            status: 200,
            data: {
                results: [{
                    series: [{
                        name: "cpu",
                        columns: ["tagKey"],
                        values: [
                            ["host"],
                            ["cpu"],
                            ["region"],
                            ["datacenter"]
                        ]
                    }]
                }]
            }
        },

        // Show tag values query
        'POST /api/datasources/proxy/test-datasource-123/query_tag_values': {
            status: 200,
            data: {
                results: [{
                    series: [{
                        name: "cpu",
                        columns: ["key", "value"],
                        values: [
                            ["host", "server01"],
                            ["host", "server02"],
                            ["host", "server03"]
                        ]
                    }]
                }]
            }
        },

        // Data query response
        'POST /api/datasources/proxy/test-datasource-123/query_data': {
            status: 200,
            data: {
                results: [{
                    frames: [{
                        schema: {
                            name: "cpu",
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
                                [1609459200000, 1609459260000, 1609459320000], // time
                                [85.5, 87.2, 86.8] // usage_idle
                            ]
                        }
                    }]
                }]
            }
        }
    };

    // Prometheus mock responses
    const prometheusResponses = {
        // Get metrics (label values for __name__)
        'GET /api/datasources/proxy/test-datasource-123/api/v1/label/__name__/values': {
            status: 200,
            data: {
                data: [
                    "up",
                    "cpu_usage_total",
                    "memory_usage_bytes",
                    "disk_io_read_bytes",
                    "network_transmit_bytes",
                    "prometheus_build_info"
                ]
            }
        },

        // Prometheus metrics for dynamic datasource IDs
        'GET /api/api/datasources/proxy/prometheus-ds-456/api/v1/label/__name__/values': {
            status: 200,
            data: {
                data: [
                    "up",
                    "cpu_usage_total",
                    "memory_usage_bytes",
                    "disk_io_read_bytes",
                    "network_transmit_bytes",
                    "prometheus_build_info"
                ]
            }
        },

        // Get series for a metric
        'GET /api/datasources/proxy/test-datasource-123/api/v1/series': {
            status: 200,
            data: {
                data: [{
                    __name__: "cpu_usage_total",
                    instance: "localhost:9100",
                    job: "node-exporter",
                    mode: "idle"
                }, {
                    __name__: "cpu_usage_total",
                    instance: "localhost:9100",
                    job: "node-exporter",
                    mode: "system"
                }]
            }
        },

        // Prometheus series for dynamic datasource IDs
        'GET /api/api/datasources/proxy/prometheus-ds-456/api/v1/series': {
            status: 200,
            data: {
                data: [{
                    __name__: "up",
                    instance: "localhost:9100",
                    job: "node-exporter"
                }, {
                    __name__: "up",
                    instance: "localhost:9101",
                    job: "node-exporter"
                }]
            }
        },

        // Query data response - Updated to match expected structure
        'POST /api/datasources/proxy/test-datasource-123/query_prometheus': {
            status: 200,
            data: {
                data: {
                    resultType: "matrix",
                    result: [{
                        metric: {
                            __name__: "cpu_usage_total",
                            instance: "localhost:9100",
                            job: "node-exporter",
                            mode: "idle"
                        },
                        values: [
                            [1609459200, "85.5"],
                            [1609459260, "87.2"],
                            [1609459320, "86.8"]
                        ]
                    }]
                }
            }
        },

        // Default Prometheus query response for dynamic datasource IDs
        'POST /api/api/datasources/proxy/prometheus-ds-456/query': {
            status: 200,
            data: {
                data: {
                    resultType: "matrix",
                    result: [{
                        metric: {
                            __name__: "up",
                            instance: "localhost:9100",
                            job: "node-exporter"
                        },
                        values: [
                            [1609459200, "1"],
                            [1609459260, "1"],
                            [1609459320, "1"]
                        ]
                    }]
                }
            }
        },

        // Alternative URL patterns for Prometheus (in case of URL variations)
        'POST /api/datasources/proxy/prometheus-ds-456/query': {
            status: 200,
            data: {
                data: {
                    resultType: "matrix",
                    result: [{
                        metric: {
                            __name__: "up",
                            instance: "localhost:9100",
                            job: "node-exporter"
                        },
                        values: [
                            [1609459200, "1"],
                            [1609459260, "1"],
                            [1609459320, "1"]
                        ]
                    }]
                }
            }
        }
    };

    // Datasource information responses
    const datasourceResponses = {
        'GET /api/datasources/test-datasource-123': {
            status: 200,
            data: {
                id: 123,
                uid: "test-datasource-123",
                name: "Test InfluxDB",
                type: "influxdb",
                url: "http://localhost:8086",
                database: "telegraf",
                user: "admin",
                access: "proxy"
            }
        }
    };

    // Error responses for testing error handling
    const errorResponses = {
        // Network error simulation
        'POST /api/datasources/proxy/invalid-datasource/query': {
            shouldFail: true,
            status: 404,
            error: 'Datasource not found'
        },

        // Authentication error
        'POST /api/datasources/proxy/unauthorized-datasource/query': {
            shouldFail: true,
            status: 401,
            error: 'Authentication required'
        },

        // InfluxDB query error
        'POST /api/datasources/proxy/test-datasource-123/query_error': {
            status: 200,
            data: {
                results: [{
                    error: "database not found: nonexistent_db"
                }]
            }
        },

        // Prometheus query error
        'POST /api/datasources/proxy/test-datasource-123/query_prometheus_error': {
            status: 400,
            data: {
                error: "invalid query syntax",
                errorType: "bad_data"
            }
        }
    };

    // Electron-specific responses
    const electronResponses = {
        'ELECTRON GET http://localhost:3000/api/datasources/test-datasource-123': {
            status: 200,
            data: {
                id: 123,
                uid: "test-datasource-123",
                name: "Test InfluxDB",
                type: "influxdb"
            }
        },

        'ELECTRON POST http://localhost:3000/api/datasources/proxy/test-datasource-123/query': {
            status: 200,
            data: influxDBResponses['POST /api/datasources/proxy/test-datasource-123/query'].data
        }
    };

    // Modern InfluxDB responses using new /api/ds/query endpoint with Grafana frames format
    const modernInfluxDBResponses = {
        'POST /api/ds/query': {
            status: 200,
            data: {
                results: {
                    A: {
                        frames: [{
                            schema: {
                                refId: 'A',
                                meta: { 
                                    type: 'table',
                                    custom: { query: 'SHOW RETENTION POLICIES' }
                                },
                                fields: [
                                    { name: 'name', type: 'string' }
                                ]
                            },
                            data: {
                                values: [
                                    ['autogen', '7d', '30d', '1y']
                                ]
                            }
                        }]
                    }
                }
            }
        },

        'POST /api/api/ds/query': {
            status: 200,
            data: {
                results: {
                    A: {
                        frames: [{
                            schema: {
                                refId: 'A',
                                meta: { 
                                    type: 'table',
                                    custom: { query: 'SHOW MEASUREMENTS' }
                                },
                                fields: [
                                    { name: 'name', type: 'string' }
                                ]
                            },
                            data: {
                                values: [
                                    ['cpu_usage', 'memory_usage', 'disk_io', 'network_traffic', 'http_requests', 'response_time', 'error_rate']
                                ]
                            }
                        }]
                    }
                }
            }
        }
    };

    // Combine all responses into the global registry
    Object.assign(MockResponses, 
        influxDBResponses,
        prometheusResponses,
        datasourceResponses,
        errorResponses,
        electronResponses,
        modernInfluxDBResponses
    );

    // Helper function to create dynamic responses based on query content
    window.createMockResponse = function(queryContent, datasourceType = 'influxdb') {
        if (datasourceType === 'influxdb') {
            return createInfluxDBMockResponse(queryContent);
        } else if (datasourceType === 'prometheus') {
            return createPrometheusMockResponse(queryContent);
        }
        
        return {
            status: 200,
            data: { results: [] }
        };
    };

    function createInfluxDBMockResponse(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('show retention policies')) {
            return {
                status: 200,
                data: {
                    results: {
                        A: {
                            frames: [{
                                schema: {
                                    refId: 'A',
                                    meta: { 
                                        type: 'table',
                                        custom: { query: query }
                                    },
                                    fields: [
                                        { name: 'name', type: 'string' }
                                    ]
                                },
                                data: {
                                    values: [
                                        ['autogen', '7d', '30d', '1y']
                                    ]
                                }
                            }]
                        }
                    }
                }
            };
        }
        
        if (lowerQuery.includes('show databases')) {
            return {
                status: 200,
                data: {
                    results: {
                        A: {
                            frames: [{
                                schema: {
                                    refId: 'A',
                                    meta: { 
                                        type: 'table',
                                        custom: { query: query }
                                    },
                                    fields: [
                                        { name: 'name', type: 'string' }
                                    ]
                                },
                                data: {
                                    values: [
                                        ['telegraf', '_internal', 'test_db']
                                    ]
                                }
                            }]
                        }
                    }
                }
            };
        }
        
        if (lowerQuery.includes('show measurements')) {
            return {
                status: 200,
                data: {
                    results: {
                        A: {
                            frames: [{
                                schema: {
                                    refId: 'A',
                                    meta: { 
                                        type: 'table',
                                        custom: { query: query }
                                    },
                                    fields: [
                                        { name: 'name', type: 'string' }
                                    ]
                                },
                                data: {
                                    values: [
                                        ['cpu_usage', 'memory_usage', 'disk_io', 'network_traffic', 'http_requests', 'response_time', 'error_rate']
                                    ]
                                }
                            }]
                        }
                    }
                }
            };
        }
        
        if (lowerQuery.includes('show field keys')) {
            const measurement = query.match(/from\s+"?(\w+)"?/i)?.[1] || 'cpu_usage';
            const fieldKeys = {
                cpu_usage: ['usage_idle', 'usage_system', 'usage_user', 'usage_iowait'],
                memory_usage: ['used', 'free', 'cached', 'available'],
                disk_io: ['read_bytes', 'write_bytes', 'read_time', 'write_time'],
                network_traffic: ['bytes_sent', 'bytes_recv', 'packets_sent', 'packets_recv']
            };
            
            return {
                status: 200,
                data: {
                    results: {
                        A: {
                            frames: [{
                                schema: {
                                    refId: 'A',
                                    meta: { 
                                        type: 'table',
                                        custom: { query: query }
                                    },
                                    fields: [
                                        { name: 'fieldKey', type: 'string' }
                                    ]
                                },
                                data: {
                                    values: [
                                        fieldKeys[measurement] || ['value']
                                    ]
                                }
                            }]
                        }
                    }
                }
            };
        }
        
        if (lowerQuery.includes('show tag keys')) {
            return {
                status: 200,
                data: {
                    results: [{
                        series: [{
                            name: "cpu",
                            columns: ["tagKey"],
                            values: [["host"], ["cpu"]]
                        }]
                    }]
                }
            };
        }
        
        // Default data query response
        return {
            status: 200,
            data: {
                results: [{
                    frames: [{
                        schema: {
                            fields: [
                                { name: "time", type: "time" },
                                { name: "value", type: "number" }
                            ]
                        },
                        data: {
                            values: [
                                [1609459200000, 1609459260000],
                                [85.5, 87.2]
                            ]
                        }
                    }]
                }]
            }
        };
    }

    function createPrometheusMockResponse(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('up')) {
            return {
                status: 200,
                data: {
                    data: {
                        resultType: "matrix",
                        result: [{
                            metric: {
                                __name__: "up",
                                instance: "localhost:9100",
                                job: "node-exporter"
                            },
                            values: [
                                [1609459200, "1"],
                                [1609459260, "1"]
                            ]
                        }]
                    }
                }
            };
        }
        
        // Default Prometheus response
        return {
            status: 200,
            data: {
                data: {
                    resultType: "matrix",
                    result: []
                }
            }
        };
    }

    // Test data fixtures for specific test scenarios
    window.TestFixtures = {
        // Valid InfluxDB response with multiple series
        influxMultiSeries: {
            results: [{
                frames: [
                    {
                        schema: {
                            name: "cpu{host=server01}",
                            fields: [
                                { name: "time", type: "time" },
                                { name: "usage_idle", type: "number" }
                            ]
                        },
                        data: {
                            values: [
                                [1609459200000, 1609459260000],
                                [85.5, 87.2]
                            ]
                        }
                    },
                    {
                        schema: {
                            name: "cpu{host=server02}",
                            fields: [
                                { name: "time", type: "time" },
                                { name: "usage_idle", type: "number" }
                            ]
                        },
                        data: {
                            values: [
                                [1609459200000, 1609459260000],
                                [92.1, 91.8]
                            ]
                        }
                    }
                ]
            }]
        },

        // Empty response
        emptyResponse: {
            results: [{
                frames: []
            }]
        },

        // Error response
        errorResponse: {
            results: [{
                error: "syntax error at position 10"
            }]
        }
    };

    console.log('✅ Mock responses initialized');
})();