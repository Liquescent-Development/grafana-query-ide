// Time Series Data Processor
// Optimizes data fetching, preprocessing, and analysis for AI/ML workflows

const TimeSeriesProcessor = {
    // Configuration
    config: {
        maxDataPoints: 100000, // High resolution for comprehensive AI analytics
        minDataPoints: 10,
        defaultAggregation: 'mean',
        timeoutMs: 60000 // 1 minute for data fetching
    },

    // Main method to optimize data for analysis
    async optimizeDataForAnalysis(analysisConfig, maxPoints = this.config.maxDataPoints) {
        console.log('🔄 Optimizing data for analysis...', analysisConfig);
        
        try {
            // Step 1: Build optimal query
            const query = this.buildOptimalQuery(analysisConfig, maxPoints);
            console.log('📝 Generated optimal query:', query);
            
            // Step 2: Execute query
            const rawData = await this.executeQuery(query, analysisConfig);
            console.log('📊 Retrieved data points:', rawData.length);
            
            // Step 3: Post-process data
            const processedData = this.postprocessData(rawData, analysisConfig);
            console.log('✅ Data optimization complete');
            
            return processedData;
            
        } catch (error) {
            console.error('❌ Data optimization failed:', error);
            throw new Error(`Failed to optimize data for analysis: ${error.message}`);
        }
    },

    // Build optimal query for analysis
    buildOptimalQuery(config, maxPoints) {
        console.log('🔍 TimeSeriesProcessor.buildOptimalQuery received config:', config);
        console.log('🏷️ TimeSeriesProcessor tags received:', config.tags);
        
        const timeRange = this.parseTimeRange(config.timeRange);
        const optimalInterval = this.calculateOptimalInterval(timeRange, maxPoints);
        
        // Build base aggregation
        const aggregationFunc = this.getAggregationFunction(config.field, config.analysisType, config.aggregation);
        
        // Build tag filters
        const tagFilters = this.buildTagFilters(config.tags);
        console.log('🏷️ TimeSeriesProcessor built tagFilters:', tagFilters);
        
        const whereClause = this.buildWhereClause(config.timeRange, tagFilters);
        console.log('🏷️ TimeSeriesProcessor built whereClause:', whereClause);
        
        // Construct the query
        let query;
        
        if (GrafanaConfig.selectedDatasourceType === 'influxdb') {
            query = this.buildInfluxDBQuery(config, aggregationFunc, whereClause, optimalInterval);
        } else if (GrafanaConfig.selectedDatasourceType === 'prometheus') {
            query = this.buildPrometheusQuery(config, aggregationFunc, whereClause, optimalInterval);
        } else {
            throw new Error(`Unsupported datasource type: ${GrafanaConfig.selectedDatasourceType}`);
        }
        
        return query;
    },

    // Build InfluxDB query
    buildInfluxDBQuery(config, aggregationFunc, whereClause, interval) {
        const retentionPolicy = config.retentionPolicy || 'raw';
        
        let query = `SELECT ${aggregationFunc}("${config.field}") as "value"`;
        
        // Add additional statistics for analysis
        if (config.analysisType === 'anomaly') {
            query += `, stddev("${config.field}") as "stddev", count("${config.field}") as "count"`;
        }
        
        query += ` FROM "${retentionPolicy}"."${config.measurement}"`;
        query += ` WHERE ${whereClause}`;
        
        // Generate GROUP BY clause with time and tag grouping
        let groupByClause = '';
        if (typeof Analytics !== 'undefined') {
            const analyticsGroupBy = Analytics.generateGroupByClause();
            if (analyticsGroupBy) {
                groupByClause = analyticsGroupBy;
            } else {
                // Default time grouping if no custom grouping
                groupByClause = ` GROUP BY time(${interval})`;
            }
        } else {
            // Default time grouping if Analytics not available
            groupByClause = ` GROUP BY time(${interval})`;
        }
        
        query += groupByClause + ' fill(none)';
        query += ` ORDER BY time ASC`;
        
        return query;
    },

    // Build Prometheus query
    buildPrometheusQuery(config, aggregationFunc, whereClause, interval) {
        const metricName = config.measurement; // In Prometheus, measurement is the metric name
        
        // Build label filters
        let labelFilters = '';
        if (config.tags && Object.keys(config.tags).length > 0) {
            const filters = Object.entries(config.tags)
                .map(([key, value]) => `${key}="${value}"`)
                .join(',');
            labelFilters = `{${filters}}`;
        }
        
        // Prometheus query with time-based aggregation
        const timeRange = config.timeRange.replace(/(\d+)([hdwm])/, (match, num, unit) => {
            const units = { h: 'h', d: 'd', w: 'w', m: 'M' };
            return num + (units[unit] || 'd');
        });
        
        let query;
        
        if (aggregationFunc === 'mean') {
            query = `avg_over_time(${metricName}${labelFilters}[${interval}])`;
        } else if (aggregationFunc === 'max') {
            query = `max_over_time(${metricName}${labelFilters}[${interval}])`;
        } else if (aggregationFunc === 'min') {
            query = `min_over_time(${metricName}${labelFilters}[${interval}])`;
        } else {
            query = `${metricName}${labelFilters}`;
        }
        
        return query;
    },

    // Get appropriate aggregation function
    getAggregationFunction(fieldName, analysisType = 'anomaly', userAggregation = null) {
        // If user specified an aggregation, use it
        if (userAggregation) {
            return userAggregation;
        }
        
        // Otherwise fall back to smart defaults
        const fieldLower = fieldName.toLowerCase();
        
        // Field-specific aggregations
        if (fieldLower.includes('rate') || fieldLower.includes('count')) {
            return 'sum'; // Rates and counts should be summed
        } else if (fieldLower.includes('response_time') || fieldLower.includes('latency')) {
            return analysisType === 'anomaly' ? 'percentile(95)' : 'mean'; // P95 for anomaly detection
        } else if (fieldLower.includes('cpu') || fieldLower.includes('memory') || fieldLower.includes('usage')) {
            return 'mean'; // Resource utilization metrics
        } else if (fieldLower.includes('error') || fieldLower.includes('failure')) {
            return 'sum'; // Error counts
        }
        
        // Default aggregation based on analysis type
        switch (analysisType) {
            case 'anomaly':
                return 'mean'; // Mean is good for anomaly detection
            case 'prediction':
                return 'mean'; // Mean for trend prediction
            case 'trend':
                return 'mean'; // Mean for trend analysis
            default:
                return 'mean';
        }
    },

    // Build tag filters for WHERE clause
    buildTagFilters(tags) {
        if (!tags || Object.keys(tags).length === 0) {
            return [];
        }
        
        return Object.entries(tags).map(([key, value]) => `"${key}" = '${value}'`);
    },

    // Build complete WHERE clause
    buildWhereClause(timeRange, tagFilters = []) {
        const timeFilter = `time >= now() - ${timeRange}`;
        
        if (tagFilters.length > 0) {
            return `${timeFilter} AND ${tagFilters.join(' AND ')}`;
        }
        
        return timeFilter;
    },

    // Execute the optimized query
    async executeQuery(query, config) {
        console.log('🔍 Executing optimized query:', query);
        console.log('📋 Query config:', {
            datasourceId: GrafanaConfig.currentDatasourceId,
            datasourceType: GrafanaConfig.selectedDatasourceType,
            measurement: config.measurement,
            field: config.field,
            timeRange: config.timeRange
        });
        
        try {
            // Use centralized query execution
            if (typeof Queries !== 'undefined' && Queries.executeQueryDirect) {
                const result = await Queries.executeQueryDirect(query, {
                    datasourceType: GrafanaConfig.selectedDatasourceType,
                    timeFromHours: config.timeRangeHours || 24,
                    maxDataPoints: config.maxDataPoints || 1000
                });
                return this.extractTimeSeriesData(result);
            } else {
                throw new Error('Centralized query system not available');
            }
            
        } catch (error) {
            console.error('Query execution failed:', error);
            throw new Error(`Query execution failed: ${error.message}`);
        }
    },


    // Build query request object
    buildQueryRequest(query, config) {
        const now = Date.now();
        const timeRange = this.parseTimeRange(config.timeRange);
        const fromTime = now - (timeRange * 1000);
        const requestId = Math.random().toString(36).substr(2, 9);
        
        if (GrafanaConfig.selectedDatasourceType === 'influxdb') {
            return {
                queries: [{
                    refId: 'A',
                    datasource: {
                        uid: GrafanaConfig.currentDatasourceId,
                        type: 'influxdb'
                    },
                    query: query,
                    rawQuery: true,
                    resultFormat: 'time_series',
                    requestId: requestId.substr(0, 3).toUpperCase(),
                    utcOffsetSec: new Date().getTimezoneOffset() * -60,
                    datasourceId: parseInt(GrafanaConfig.selectedDatasourceNumericId) || null,
                    intervalMs: 15000,
                    maxDataPoints: 100000
                }],
                from: fromTime.toString(),
                to: now.toString()
            };
        } else if (GrafanaConfig.selectedDatasourceType === 'prometheus') {
            return {
                queries: [{
                    refId: 'A',
                    datasource: {
                        uid: GrafanaConfig.currentDatasourceId,
                        type: 'prometheus'
                    },
                    expr: query,
                    instant: false,
                    interval: '',
                    legendFormat: '',
                    editorMode: 'code',
                    exemplar: false,
                    requestId: requestId.substr(0, 3).toUpperCase(),
                    utcOffsetSec: new Date().getTimezoneOffset() * -60,
                    scopes: [],
                    adhocFilters: [],
                    datasourceId: parseInt(GrafanaConfig.selectedDatasourceNumericId) || null,
                    intervalMs: 15000,
                    maxDataPoints: 100000
                }],
                from: fromTime.toString(),
                to: now.toString()
            };
        }
        
        throw new Error('Unsupported datasource type for direct query');
    },

    // Extract time series data from query result
    extractTimeSeriesData(result) {
        if (!result || !result.results || !result.results.A) {
            return [];
        }
        
        const frames = result.results.A.frames || [];
        const data = [];
        
        for (const frame of frames) {
            if (!frame.data || !frame.data.values || frame.data.values.length < 2) {
                continue;
            }
            
            const timeColumn = frame.data.values[0]; // Time values
            const valueColumn = frame.data.values[1]; // Data values
            
            // Additional columns for statistical data
            const stddevColumn = frame.data.values[2]; // Standard deviation if available
            const countColumn = frame.data.values[3]; // Count if available
            
            for (let i = 0; i < timeColumn.length; i++) {
                if (timeColumn[i] && valueColumn[i] !== null && valueColumn[i] !== undefined) {
                    const dataPoint = {
                        timestamp: new Date(timeColumn[i]).toISOString(),
                        value: Number(valueColumn[i])
                    };
                    
                    // Add additional statistical data if available
                    if (stddevColumn && stddevColumn[i] !== null) {
                        dataPoint.stddev = Number(stddevColumn[i]);
                    }
                    
                    if (countColumn && countColumn[i] !== null) {
                        dataPoint.count = Number(countColumn[i]);
                    }
                    
                    data.push(dataPoint);
                }
            }
        }
        
        // Sort by timestamp
        return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    // Post-process extracted data
    postprocessData(rawData, config) {
        if (!rawData || rawData.length === 0) {
            console.warn('⚠️ Query returned no data. Debugging info:', {
                measurement: config.measurement,
                field: config.field,
                timeRange: config.timeRange,
                tags: config.tags,
                rawDataType: typeof rawData,
                rawDataLength: Array.isArray(rawData) ? rawData.length : 'not array'
            });
            throw new Error(`No data found for ${config.measurement}.${config.field} over ${config.timeRange}. Try a different field or time range.`);
        }
        
        // Remove outliers if requested
        let processedData = rawData;
        if (config.removeOutliers) {
            processedData = this.removeOutliers(processedData);
        }
        
        // Fill gaps if requested
        if (config.fillGaps) {
            processedData = this.fillDataGaps(processedData, config);
        }
        
        // Smooth data if requested
        if (config.smoothing && config.smoothing > 0) {
            processedData = this.applySmoothing(processedData, config.smoothing);
        }
        
        // Validate minimum data points
        if (processedData.length < this.config.minDataPoints) {
            throw new Error(`Insufficient data points for analysis. Found ${processedData.length}, need at least ${this.config.minDataPoints}`);
        }
        
        console.log('📊 Post-processing complete:', {
            original: rawData.length,
            processed: processedData.length,
            timeSpan: this.calculateTimeSpan(processedData)
        });
        
        return processedData;
    },

    // Remove statistical outliers using IQR method
    removeOutliers(data) {
        const values = data.map(p => p.value).sort((a, b) => a - b);
        const q1 = this.calculatePercentile(values, 25);
        const q3 = this.calculatePercentile(values, 75);
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        return data.filter(point => 
            point.value >= lowerBound && point.value <= upperBound
        );
    },

    // Fill gaps in time series data
    fillDataGaps(data, config) {
        if (data.length < 2) return data;
        
        const filled = [data[0]];
        const intervalMs = this.parseIntervalToMs(
            this.calculateOptimalInterval(this.parseTimeRange(config.timeRange), 1000)
        );
        
        for (let i = 1; i < data.length; i++) {
            const prev = data[i - 1];
            const current = data[i];
            const gap = new Date(current.timestamp) - new Date(prev.timestamp);
            
            // If gap is larger than expected interval, fill it
            if (gap > intervalMs * 1.5) {
                const gapPoints = Math.floor(gap / intervalMs) - 1;
                
                for (let j = 1; j <= gapPoints; j++) {
                    const interpolatedTime = new Date(
                        new Date(prev.timestamp).getTime() + (j * intervalMs)
                    );
                    
                    const interpolatedValue = prev.value + 
                        ((current.value - prev.value) * j / (gapPoints + 1));
                    
                    filled.push({
                        timestamp: interpolatedTime.toISOString(),
                        value: interpolatedValue,
                        interpolated: true
                    });
                }
            }
            
            filled.push(current);
        }
        
        return filled;
    },

    // Apply moving average smoothing
    applySmoothing(data, windowSize) {
        if (windowSize <= 1 || data.length < windowSize) return data;
        
        const smoothed = [];
        
        for (let i = 0; i < data.length; i++) {
            if (i < windowSize - 1) {
                smoothed.push(data[i]); // Keep initial points as-is
                continue;
            }
            
            const window = data.slice(i - windowSize + 1, i + 1);
            const avgValue = window.reduce((sum, p) => sum + p.value, 0) / window.length;
            
            smoothed.push({
                ...data[i],
                value: avgValue,
                original_value: data[i].value,
                smoothed: true
            });
        }
        
        return smoothed;
    },

    // Calculate time span of data
    calculateTimeSpan(data) {
        if (data.length < 2) return '0s';
        
        const start = new Date(data[0].timestamp);
        const end = new Date(data[data.length - 1].timestamp);
        const diffMs = end - start;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    },

    // Parse time range string to seconds
    parseTimeRange(timeRange) {
        const units = { h: 3600, d: 86400, w: 604800, m: 2592000 };
        const match = timeRange.match(/^(\d+)([hdwm])$/);
        
        if (!match) {
            console.warn('Invalid time range format:', timeRange);
            return 86400; // Default to 1 day
        }
        
        const [, value, unit] = match;
        return parseInt(value) * (units[unit] || 86400);
    },

    // Parse interval string to milliseconds
    parseIntervalToMs(interval) {
        const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        const match = interval.match(/^(\d+)([smhd])$/);
        
        if (!match) return 60000; // Default to 1 minute
        
        const [, value, unit] = match;
        return parseInt(value) * (units[unit] || 60000);
    },

    // Calculate optimal interval for time range and max points
    calculateOptimalInterval(timeRangeSeconds, maxPoints) {
        const intervals = [
            { interval: '15s', seconds: 15 },
            { interval: '30s', seconds: 30 },
            { interval: '1m', seconds: 60 },
            { interval: '5m', seconds: 300 },
            { interval: '15m', seconds: 900 },
            { interval: '30m', seconds: 1800 },
            { interval: '1h', seconds: 3600 },
            { interval: '6h', seconds: 21600 },
            { interval: '12h', seconds: 43200 },
            { interval: '1d', seconds: 86400 }
        ];
        
        for (const { interval, seconds } of intervals) {
            const estimatedPoints = Math.floor(timeRangeSeconds / seconds);
            if (estimatedPoints <= maxPoints) {
                return interval;
            }
        }
        
        return '1d'; // Fallback to daily if nothing fits
    },

    // Calculate Prometheus step size
    calculatePrometheusStep(timeRangeSeconds) {
        const maxPoints = 100000; // High resolution for AI analytics
        const stepSeconds = Math.max(15, Math.floor(timeRangeSeconds / maxPoints));
        return `${stepSeconds}s`;
    },

    // Calculate percentile
    calculatePercentile(sortedArray, percentile) {
        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) {
            return sortedArray[lower];
        }
        
        return sortedArray[lower] + (sortedArray[upper] - sortedArray[lower]) * (index - lower);
    },

    // Data quality assessment
    assessDataQuality(data) {
        const assessment = {
            total_points: data.length,
            time_span: this.calculateTimeSpan(data),
            completeness: 1.0, // Will be calculated based on expected vs actual points
            consistency: 1.0,  // Will be calculated based on interval regularity
            outliers: 0,
            gaps: 0
        };
        
        if (data.length < 2) {
            assessment.quality_score = 0;
            assessment.issues = ['insufficient_data'];
            return assessment;
        }
        
        // Check for gaps
        const intervals = [];
        for (let i = 1; i < data.length; i++) {
            const interval = new Date(data[i].timestamp) - new Date(data[i-1].timestamp);
            intervals.push(interval);
        }
        
        const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
        assessment.gaps = intervals.filter(interval => interval > medianInterval * 2).length;
        
        // Calculate quality score
        const completenessScore = Math.max(0, 1 - (assessment.gaps / data.length));
        assessment.quality_score = completenessScore;
        
        // Identify issues
        const issues = [];
        if (assessment.quality_score < 0.8) issues.push('data_quality_low');
        if (assessment.gaps > data.length * 0.1) issues.push('significant_gaps');
        if (data.length < 50) issues.push('limited_data_points');
        
        assessment.issues = issues;
        
        return assessment;
    }
};

// Export for use in other modules
window.TimeSeriesProcessor = TimeSeriesProcessor;