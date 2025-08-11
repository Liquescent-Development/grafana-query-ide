// dataAccess.js - Unified data access layer for Time Buddy
// This module provides a single, consistent interface for all API interactions

const DataAccess = {
    // Single method for all API requests
    async request(endpoint, options = {}) {
        const config = options.config || GrafanaConfig;
        
        if (!config || !config.url) {
            throw new Error('Grafana connection not configured. Please set up a connection first.');
        }
        
        // Note: datasourceId is not required for all API requests (e.g., getting datasource info)
        // Individual methods should validate datasourceId when needed

        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Grafana-URL': config.url,
                'X-Grafana-Org-Id': config.orgId || '1',
                ...options.headers
            }
        };

        // Add auth header if available
        if (config.authHeader) {
            requestOptions.headers['Authorization'] = config.authHeader;
            console.log('DataAccess: Using authHeader:', config.authHeader.substring(0, 10) + '...');
        } else if (config.authToken) {
            // Fallback to authToken for backward compatibility
            requestOptions.headers['Authorization'] = `Bearer ${config.authToken}`;
            console.log('DataAccess: Using authToken (Bearer)');
        } else {
            console.warn('DataAccess: No authorization header or token available');
        }

        // Add body if provided
        if (options.body) {
            requestOptions.body = typeof options.body === 'string' 
                ? options.body 
                : JSON.stringify(options.body);
        }

        // Handle different runtime environments
        if (window.isElectron) {
            return this._electronRequest(endpoint, requestOptions, config);
        } else {
            return this._proxyRequest(endpoint, requestOptions);
        }
    },

    // Electron-specific request handling
    async _electronRequest(endpoint, requestOptions, config) {
        try {
            const electronOptions = {
                grafanaUrl: config.url,
                path: endpoint,
                method: requestOptions.method || 'GET',
                headers: requestOptions.headers,
                body: requestOptions.body,
                timeout: 30000,
                proxyConfig: config.proxyConfig || null
            };
            
            console.log('DataAccess._electronRequest:', {
                url: config.url,
                endpoint: endpoint,
                hasAuthHeader: !!requestOptions.headers['Authorization'],
                authHeaderPrefix: requestOptions.headers['Authorization'] ? 
                    requestOptions.headers['Authorization'].substring(0, 10) + '...' : 'none',
                hasProxy: !!config.proxyConfig,
                method: requestOptions.method,
                bodyPreview: requestOptions.body ? 
                    (typeof requestOptions.body === 'string' ? 
                        requestOptions.body.substring(0, 200) + '...' : 
                        JSON.stringify(requestOptions.body).substring(0, 200) + '...') : 
                    'no body'
            });
            
            const response = await window.electronAPI.grafanaRequest(electronOptions);
            
            // Check if request was successful based on status code
            if (response.status < 200 || response.status >= 300) {
                const error = new Error(response.error || `Request failed: ${response.status} ${response.statusText}`);
                error.response = response; // Attach response for status code extraction
                throw error;
            }
            
            return response.data;
        } catch (error) {
            throw this._standardizeError(error, 'Electron request failed');
        }
    },

    // Proxy server request handling
    async _proxyRequest(endpoint, requestOptions) {
        try {
            const proxyUrl = `/api${endpoint}`;
            const response = await fetch(proxyUrl, requestOptions);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.error || `Request failed: ${response.status} ${response.statusText}`);
                error.response = response; // Attach response for status code extraction
                throw error;
            }
            
            const data = await response.json();
            if (data && data.error) {
                throw new Error(data.error);
            }
            
            return (data && data.data) || data;
        } catch (error) {
            throw this._standardizeError(error, 'Proxy request failed');
        }
    },

    // Standardized query execution
    async executeQuery(datasourceId, query, options = {}) {
        const config = options.config || GrafanaConfig;
        const requestBuilder = options.requestBuilder || QueryRequestBuilder;
        
        if (!datasourceId || !query) {
            throw new Error('Datasource ID and query are required');
        }

        // Validate that we have a datasource ID available
        if (!datasourceId) {
            throw new Error('Grafana connection not configured. Please set up a connection first.');
        }

        // Build the request
        const request = requestBuilder.buildRequest(datasourceId, query, options);
        
        // Use the standard /api/ds/query endpoint
        const endpoint = '/api/ds/query';
        
        try {
            const result = await this.request(endpoint, {
                method: 'POST',
                body: request,
                config: config,
                headers: options.headers
            });

            return this._processQueryResult(result, options);
        } catch (error) {
            throw this._standardizeError(error, 'Query execution failed');
        }
    },

    // Schema operations
    async getSchema(datasourceId, schemaType, params = {}) {
        const config = params.config || GrafanaConfig;
        
        if (!datasourceId || !schemaType) {
            throw new Error('Datasource ID and schema type are required');
        }

        // Use appropriate schema query based on type
        switch (schemaType) {
            case 'databases':
                return this._getInfluxDatabases(datasourceId, config);
            case 'measurements':
                return this._getInfluxMeasurements(datasourceId, params.database, config);
            case 'tags':
                return this._getInfluxTags(datasourceId, params.database, params.measurement, config);
            case 'fields':
                return this._getInfluxFields(datasourceId, params.database, params.measurement, config);
            case 'metrics':
                return this._getPrometheusMetrics(datasourceId, config);
            case 'labels':
                return this._getPrometheusLabels(datasourceId, params.metric, config);
            default:
                throw new Error(`Unknown schema type: ${schemaType}`);
        }
    },

    // InfluxDB schema helpers
    async _getInfluxDatabases(datasourceId, config) {
        const query = 'SHOW DATABASES';
        const result = await this.executeQuery(datasourceId, query, { config, datasourceType: 'influxdb' });
        return this._extractInfluxValues(result);
    },

    async _getInfluxMeasurements(datasourceId, database, config) {
        if (!database) {
            throw new Error('Database name is required for measurements query');
        }
        const query = `SHOW MEASUREMENTS ON "${database}"`;
        const result = await this.executeQuery(datasourceId, query, { config, datasourceType: 'influxdb', database });
        return this._extractInfluxValues(result);
    },

    async _getInfluxTags(datasourceId, database, measurement, config) {
        if (!database || !measurement) {
            throw new Error('Database and measurement are required for tags query');
        }
        const query = `SHOW TAG KEYS ON "${database}" FROM "${measurement}"`;
        const result = await this.executeQuery(datasourceId, query, { config, datasourceType: 'influxdb', database });
        return this._extractInfluxValues(result);
    },

    async _getInfluxFields(datasourceId, database, measurement, config) {
        if (!database || !measurement) {
            throw new Error('Database and measurement are required for fields query');
        }
        const query = `SHOW FIELD KEYS ON "${database}" FROM "${measurement}"`;
        const result = await this.executeQuery(datasourceId, query, { config, datasourceType: 'influxdb', database });
        return this._extractInfluxValues(result);
    },

    // Prometheus schema helpers
    async _getPrometheusMetrics(datasourceId, config) {
        const endpoint = `/api/datasources/proxy/${datasourceId}/api/v1/label/__name__/values`;
        const result = await this.request(endpoint, { config });
        // The request() method already extracts .data, so result should be the array directly
        // Handle null/undefined results gracefully
        return Array.isArray(result) ? result : (result && result.data) || [];
    },

    async _getPrometheusLabels(datasourceId, metric, config) {
        if (!metric) return [];
        const endpoint = `/api/datasources/proxy/${datasourceId}/api/v1/series`;
        const params = new URLSearchParams({ 'match[]': metric });
        const result = await this.request(`${endpoint}?${params}`, { config });
        
        // Extract unique label keys from series
        const labelSet = new Set();
        // The request() method already extracts .data, so result should be the array directly
        // Handle null/undefined results gracefully
        const seriesData = Array.isArray(result) ? result : (result && result.data) || [];
        if (Array.isArray(seriesData)) {
            seriesData.forEach(series => {
                Object.keys(series).forEach(key => {
                    if (key !== '__name__') {
                        labelSet.add(key);
                    }
                });
            });
        }
        return Array.from(labelSet);
    },

    // Result processing helpers
    _processQueryResult(result, options) {
        if (options.raw) {
            return result;
        }

        // The /api/ds/query endpoint returns results with requestId as key
        // e.g., { "ABC": { frames: [...] } }
        // We need to return this format as-is for compatibility
        return result;
    },

    _extractInfluxValues(result) {
        // Handle new Grafana API format: { results: { A: { frames: [...] } } }
        if (result && result.results && result.results.A && result.results.A.frames) {
            const frame = result.results.A.frames[0];
            if (frame && frame.data && frame.data.values && frame.data.values.length > 0) {
                // Get the first column of values (usually the name column)
                return frame.data.values[0].filter(value => value);
            }
        }
        
        // Fallback for old format (shouldn't be needed anymore)
        if (!result || !result[0] || !result[0].series || !result[0].series[0]) {
            return [];
        }
        
        const series = result[0].series[0];
        if (!series.values || !Array.isArray(series.values)) {
            return [];
        }
        
        return series.values.map(row => row[0]).filter(value => value);
    },

    // Error standardization
    _standardizeError(error, context) {
        const standardError = new Error(`${context}: ${error.message || error}`);
        
        // If the error was already standardized, preserve the original error
        standardError.originalError = error.originalError || error;
        standardError.context = context;
        
        // Add additional error details if available
        if (error.response) {
            standardError.statusCode = error.response.status;
            standardError.statusText = error.response.statusText;
        } else if (error.statusCode) {
            // Preserve existing statusCode if the error was already standardized
            standardError.statusCode = error.statusCode;
            standardError.statusText = error.statusText;
        }
        
        return standardError;
    },

    // Utility method for checking data source type
    async getDataSourceType(datasourceId, config) {
        const endpoint = `/api/datasources/${datasourceId}`;
        const datasource = await this.request(endpoint, { config });
        return datasource.type;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataAccess;
}