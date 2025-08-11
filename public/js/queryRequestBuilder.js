// queryRequestBuilder.js - Centralized query request construction for Time Buddy
// This module provides a single interface for building query requests across all datasource types

const QueryRequestBuilder = {
    // Main method to build a query request
    buildRequest(datasourceId, query, options = {}) {
        const {
            timeRange = this._getDefaultTimeRange(),
            maxDataPoints = 300,
            datasourceType,
            interval,
            scopedVars = {},
            format = 'time_series',
            instant,
            database
        } = options;

        // Base request structure
        const request = {
            from: timeRange.from,
            to: timeRange.to,
            queries: []
        };
        
        // Add database at top level for InfluxDB queries
        if (database && datasourceType === 'influxdb') {
            request.database = database;
        }

        // Build query based on datasource type
        if (datasourceType === 'prometheus' || this._isPrometheusQuery(query)) {
            request.queries.push(this._buildPrometheusQuery(query, {
                refId: 'A',
                datasourceId,
                maxDataPoints,
                interval,
                scopedVars,
                format,
                instant,
                intervalMs: options.intervalMs || 15000
            }));
        } else {
            // InfluxDB or SQL-like query
            request.queries.push(this._buildInfluxQuery(query, {
                refId: 'A',
                datasourceId,
                maxDataPoints,
                interval,
                scopedVars,
                format,
                database,
                intervalMs: options.intervalMs || 15000
            }));
        }

        return request;
    },

    // Build Prometheus query object
    _buildPrometheusQuery(expr, options) {
        const query = {
            refId: options.refId,
            datasource: { 
                uid: options.datasourceId
            },
            expr: expr,
            maxDataPoints: options.maxDataPoints,
            format: options.format || 'time_series',
            intervalMs: options.intervalMs || 15000,
            instant: options.instant !== undefined ? options.instant : false,
            range: options.instant ? false : true,
            legendFormat: options.legendFormat || ''
        };

        // Add interval if specified
        if (options.interval) {
            query.interval = options.interval;
            query.intervalMs = this._parseInterval(options.interval);
        }

        // Add scoped variables
        if (options.scopedVars && Object.keys(options.scopedVars).length > 0) {
            query.scopedVars = options.scopedVars;
        }

        return query;
    },

    // Build InfluxDB query object
    _buildInfluxQuery(query, options) {
        const queryObj = {
            refId: options.refId,
            datasource: { 
                uid: options.datasourceId
            },
            query: query,
            rawQuery: true,
            maxDataPoints: options.maxDataPoints,
            format: options.format || 'time_series',
            intervalMs: options.intervalMs || 15000
        };
        
        // Add database field if provided
        if (options.database) {
            queryObj.database = options.database;
        }
        
        // Add alias if provided
        if (options.alias) {
            queryObj.alias = options.alias;
        }
        
        return queryObj;
    },

    // Helper to detect Prometheus queries
    _isPrometheusQuery(query) {
        // Common Prometheus query patterns
        const prometheusPatterns = [
            /^\s*\w+\{.*\}/, // metric{labels}
            /^\s*\w+\[.*\]/, // metric[range]
            /^\s*(sum|avg|max|min|count|rate|irate|increase|histogram_quantile|predict_linear)\s*\(/i,
            /\sby\s*\(/i, // aggregation by
            /\swithout\s*\(/i, // aggregation without
            /\soffset\s+\d+[smhd]/i, // offset modifier
            /^\s*[a-zA-Z_:][a-zA-Z0-9_:]*\s*$/ // simple metric names like 'up'
        ];

        return prometheusPatterns.some(pattern => pattern.test(query));
    },

    // Get default time range
    _getDefaultTimeRange() {
        const now = Date.now();
        return {
            from: (now - 3600000).toString(), // 1 hour ago
            to: now.toString()
        };
    },

    // Parse interval string to milliseconds
    _parseInterval(interval) {
        if (!interval || typeof interval !== 'string') {
            return 10000; // Default 10s
        }

        const match = interval.match(/^(\d+)([smhd])$/);
        if (!match) {
            return 10000; // Default 10s
        }

        const value = parseInt(match[1]);
        const unit = match[2];
        
        // Treat zero or negative values as invalid
        if (value <= 0) {
            return 10000;
        }

        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 10000;
        }
    },

    // Build batch request for multiple queries
    buildBatchRequest(queries, options = {}) {
        const timeRange = options.timeRange || this._getDefaultTimeRange();
        
        const request = {
            from: timeRange.from,
            to: timeRange.to,
            queries: []
        };

        queries.forEach((queryConfig, index) => {
            const { datasourceId, query, datasourceType } = queryConfig;
            
            // Skip invalid queries - must have both datasourceId and query
            if (!datasourceId || !query) {
                return;
            }
            
            const refId = String.fromCharCode(65 + index); // A, B, C, etc.

            if (datasourceType === 'prometheus' || this._isPrometheusQuery(query)) {
                request.queries.push(this._buildPrometheusQuery(query, {
                    refId,
                    datasourceId,
                    ...options
                }));
            } else {
                request.queries.push(this._buildInfluxQuery(query, {
                    refId,
                    datasourceId,
                    ...options
                }));
            }
        });

        return request;
    },

    // Build variable query request
    buildVariableRequest(datasourceId, query, options = {}) {
        // Variables often need different handling
        if (this._isPrometheusQuery(query)) {
            // Prometheus label values query
            if (query.startsWith('label_values')) {
                return this._buildPrometheusLabelValuesRequest(query, datasourceId);
            }
            // Standard Prometheus query
            return this.buildRequest(datasourceId, query, {
                ...options,
                format: 'time_series',
                instant: true
            });
        } else {
            // InfluxDB query
            return this.buildRequest(datasourceId, query, options);
        }
    },

    // Build Prometheus label values request
    _buildPrometheusLabelValuesRequest(query, datasourceId) {
        // Parse label_values query
        const match = query.match(/label_values\s*\(\s*(?:(.+?)\s*,\s*)?(\w+)\s*\)/);
        if (!match) {
            throw new Error('Invalid label_values query format');
        }

        const [, metric, label] = match;
        
        if (metric) {
            // label_values(metric, label)
            return {
                url: `/api/datasources/proxy/${datasourceId}/api/v1/series`,
                params: { 'match[]': metric },
                extractLabel: label
            };
        } else {
            // label_values(label)
            return {
                url: `/api/datasources/proxy/${datasourceId}/api/v1/label/${label}/values`,
                params: {}
            };
        }
    },

    // Build dashboard panel query request
    buildPanelRequest(panel, datasourceId, options = {}) {
        const timeRange = options.timeRange || this._getDefaultTimeRange();
        const maxDataPoints = options.maxDataPoints || panel.maxDataPoints || 300;

        const request = {
            from: timeRange.from,
            to: timeRange.to,
            queries: []
        };

        // Handle multiple targets in a panel
        if (panel.targets && Array.isArray(panel.targets)) {
            panel.targets.forEach((target, index) => {
                if (target.hide) return; // Skip hidden targets

                const query = target.expr || target.query || target.rawSql;
                if (!query) return;

                const refId = target.refId || String.fromCharCode(65 + index);
                const targetDatasourceId = target.datasource?.uid || datasourceId;

                if (target.queryType === 'prometheus' || target.expr) {
                    request.queries.push(this._buildPrometheusQuery(query, {
                        refId,
                        datasourceId: targetDatasourceId,
                        maxDataPoints,
                        interval: target.interval,
                        legendFormat: target.legendFormat,
                        ...options
                    }));
                } else {
                    request.queries.push(this._buildInfluxQuery(query, {
                        refId,
                        datasourceId: targetDatasourceId,
                        maxDataPoints,
                        alias: target.alias,
                        ...options
                    }));
                }
            });
        }

        return request;
    },

    // Utility to merge time ranges
    mergeTimeRanges(range1, range2) {
        if (!range1) return range2;
        if (!range2) return range1;

        return {
            from: Math.min(parseInt(range1.from), parseInt(range2.from)).toString(),
            to: Math.max(parseInt(range1.to), parseInt(range2.to)).toString()
        };
    },

    // Validate query request
    validateRequest(request) {
        if (!request) {
            throw new Error('Request is required');
        }

        if (!request.from || !request.to) {
            throw new Error('Time range (from/to) is required');
        }

        if (!request.queries || !Array.isArray(request.queries) || request.queries.length === 0) {
            throw new Error('At least one query is required');
        }

        request.queries.forEach((query, index) => {
            if (!query.refId) {
                throw new Error(`Query ${index} is missing refId`);
            }
            if (!query.datasource || !query.datasource.uid) {
                throw new Error(`Query ${index} is missing datasource`);
            }
            if (!query.expr && !query.query) {
                throw new Error(`Query ${index} is missing expression`);
            }
        });

        return true;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QueryRequestBuilder;
}