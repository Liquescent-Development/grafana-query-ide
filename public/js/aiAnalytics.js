// AI Analytics Engine
// Specialized prompt engineering and analysis execution for time series data

const AIAnalytics = {
    // Configuration
    config: {
        maxDataPoints: 100000, // High resolution for comprehensive AI analysis
        defaultTimeout: 600000, // 10 minutes default, configurable per connection
        retryAttempts: 2
    },

    // Specialized prompts for different analysis types
    prompts: {
        systemPrompt: `You are a specialized time series analyst with expertise in InfluxDB metrics and system monitoring. 
        You analyze time series data for anomalies, predictions, and trends using statistical reasoning and domain knowledge.
        CRITICAL: You MUST respond with valid JSON only. Do not include any text before or after the JSON. Start your response with { and end with }.
        No explanations, no markdown, no commentary - ONLY valid JSON.
        Use your knowledge of system metrics, seasonality patterns, and anomaly detection techniques.`,

        anomalyDetection: `
        Identify anomalous time intervals in this time series data. Pay special attention to LARGE SPIKES that significantly exceed normal values.

        CONTEXT:
        Measurement: {measurement}.{field}
        Time Range: {timeRange}
        Data Points: {dataPointsCount}

        STATISTICS:
        Mean: {mean}, StdDev: {stdDev}
        Normal Range: {normalRangeLower} to {normalRangeUpper}

        DATA (format: timestamp=ISO8601, value=numeric):
        {dataPoints}

        IMPORTANT: The data format is "timestamp=<ISO8601 date>, value=<number>". 
        Extract the numeric value after "value=" for analysis. Do NOT use the timestamp year or any part of the date as the data value.
        
        CRITICAL INSTRUCTION: Look for values that are dramatically higher or lower than the normal range. Any value that is 5x or more above the normal range should be flagged as CRITICAL. Any value that is 3x or more above the normal range should be flagged as HIGH severity.

        Find continuous time intervals that deviate significantly from the normal pattern:
        
        **PRIORITY DETECTION RULES:**
        1. **MASSIVE SPIKES**: Values >5x the normal range = CRITICAL
        2. **LARGE SPIKES**: Values >3x the normal range = HIGH  
        3. **STATISTICAL OUTLIERS**: >4 sigma deviation = CRITICAL
        4. **SIGNIFICANT OUTLIERS**: 3-4 sigma deviation = HIGH
        5. **MODERATE OUTLIERS**: 2-3 sigma deviation = MEDIUM
        6. **MINOR OUTLIERS**: 1.5-2 sigma deviation = LOW

        Also look for:
        - Sustained abnormal levels (not just single points)
        - Trend changes and drift
        - Frequency/seasonal anomalies
        - Contextual outliers

        Severity assignment (be aggressive with large spikes):
        - critical: >4 sigma deviation OR >5x normal range OR values >10x typical magnitude
        - high: 3-4 sigma deviation OR 3-5x normal range OR values >5x typical magnitude  
        - medium: 2-3 sigma deviation OR 2-3x normal range
        - low: 1.5-2 sigma deviation OR 1.5-2x normal range

        IMPORTANT: Return ONLY valid JSON, no other text. Your response must start with { and end with }
        Return this exact JSON structure:
        {
          "anomalies": [
            {
              "start_time": "2024-01-01T12:00:00Z",
              "end_time": "2024-01-01T12:15:00Z",
              "severity": "critical",
              "type": "massive_spike",
              "peak_value": 125.5,
              "score": 0.95
            }
          ],
          "summary": {
            "total_anomalies": 5,
            "severity_distribution": {"critical": 1, "high": 2, "medium": 2, "low": 0},
            "analysis_confidence": 0.85
          }
        }
        Remember: ONLY JSON, no explanations or text before/after the JSON.`,

        prediction: `
        Forecast future values for this time series based on historical patterns:

        CONTEXT:
        - Measurement: {measurement}
        - Field: {field}
        - Historical Period: {historicalPeriod}
        - Forecast Horizon: {forecastHorizon}
        - Seasonality Information: {seasonalityInfo}

        HISTORICAL DATA (format: timestamp=ISO8601, value=numeric):
        {historicalData}
        
        IMPORTANT: Extract the numeric value after "value=" for analysis.

        RECENT TRENDS:
        {recentTrends}

        STATISTICAL CONTEXT:
        - Trend Direction: {trendDirection}
        - Trend Strength: {trendStrength}
        - Seasonal Patterns: {seasonalPatterns}
        - Data Volatility: {volatility}

        FORECASTING REQUIREMENTS:
        1. Generate point forecasts for the requested time horizon
        2. Calculate confidence intervals (80%, 95%)
        3. Identify key patterns influencing the forecast
        4. Assess forecast reliability and uncertainty factors
        5. Consider seasonal patterns, trends, and cyclical behavior

        RESPONSE FORMAT (JSON only):
        {
          "predictions": [
            {
              "timestamp": "2024-01-01T13:00:00Z",
              "predicted_value": 78.5,
              "confidence_80_lower": 75.2,
              "confidence_80_upper": 81.8,
              "confidence_95_lower": 72.1,
              "confidence_95_upper": 84.9,
              "trend_component": 2.3,
              "seasonal_component": -1.8
            }
          ],
          "forecast_metadata": {
            "model_type": "trend_seasonal_decomposition",
            "reliability_score": 0.78,
            "key_patterns": ["daily_seasonality", "weekly_pattern", "upward_trend"],
            "uncertainty_factors": ["recent_volatility", "limited_historical_data", "irregular_patterns"],
            "seasonal_strength": 0.65,
            "trend_strength": 0.42,
            "forecast_accuracy_estimate": "±15%"
          },
          "recommendations": [
            "Monitor for deviations from predicted range",
            "Consider capacity planning if upward trend continues",
            "Review forecasts weekly due to moderate uncertainty"
          ]
        }`,

        trendAnalysis: `
        Analyze trends and patterns in this time series data:

        DATA (format: timestamp=ISO8601, value=numeric):
        {timeSeriesData}
        
        IMPORTANT: Extract the numeric value after "value=" for analysis.

        CONTEXT:
        - Metric Type: {metricType}
        - Business Context: {businessContext}
        - Analysis Period: {analysisPeriod}
        - Data Frequency: {dataFrequency}

        STATISTICAL SUMMARY:
        - Total Data Points: {totalPoints}
        - Time Span: {timeSpan}
        - Value Range: {valueRange}
        - Variance: {variance}

        ANALYSIS REQUIREMENTS:
        1. Identify short-term (last 24h), medium-term (last 7d), and long-term trends (full period)
        2. Detect seasonality patterns (hourly, daily, weekly, monthly)
        3. Calculate trend strength, direction, and statistical significance
        4. Assess trend stability and predict continuation probability
        5. Identify change points and trend reversals

        RESPONSE FORMAT (JSON only):
        {
          "trends": {
            "short_term": {
              "direction": "increasing",
              "strength": 0.65,
              "significance": "moderate",
              "slope": 0.23,
              "r_squared": 0.42,
              "change_rate": "2.3% per hour"
            },
            "medium_term": {
              "direction": "stable",
              "strength": 0.23,
              "significance": "weak",
              "slope": 0.05,
              "r_squared": 0.18,
              "change_rate": "0.5% per day"
            },
            "long_term": {
              "direction": "increasing",
              "strength": 0.78,
              "significance": "strong",
              "slope": 0.45,
              "r_squared": 0.67,
              "change_rate": "5.2% per week"
            }
          },
          "seasonality": {
            "hourly": {
              "detected": true,
              "strength": 0.82,
              "peak_hours": [9, 14, 20],
              "pattern_description": "Business hours peaks"
            },
            "daily": {
              "detected": true,
              "strength": 0.45,
              "peak_days": ["Monday", "Wednesday"],
              "pattern_description": "Weekday activity pattern"
            },
            "weekly": {
              "detected": false,
              "strength": 0.12,
              "pattern_description": "No clear weekly pattern"
            }
          },
          "change_points": [
            {
              "timestamp": "2024-01-01T08:00:00Z",
              "type": "level_shift",
              "magnitude": 15.2,
              "confidence": 0.78,
              "description": "Significant increase in baseline level"
            }
          ],
          "insights": [
            "Strong daily pattern with peaks during business hours (9AM, 2PM, 8PM)",
            "Moderate upward trend over past 7 days indicates growing usage",
            "Weekly seasonality suggests business-driven rather than technical patterns",
            "Recent level shift may indicate system change or increased load"
          ],
          "recommendations": [
            "Monitor trend continuation for capacity planning",
            "Investigate cause of recent level shift",
            "Consider alerting thresholds based on daily patterns"
          ]
        }`
    },

    // Update loading step in the UI
    updateLoadingStep(stepId, status = 'active') {
        const stepElement = document.getElementById(stepId);
        if (stepElement) {
            // Remove all status classes
            stepElement.classList.remove('active', 'completed', 'error');
            // Add new status class
            stepElement.classList.add(status);
            
            // If marking as completed, also add checkmark
            if (status === 'completed') {
                const text = stepElement.textContent;
                if (!text.includes('✅')) {
                    stepElement.textContent = text.replace(/^[\u{1F4C8}\u{1F504}\u{1F9E0}\u{1F4C8}]/u, '✅');
                }
            }
        }
    },

    // Main analysis execution method
    async executeAnalysis(config) {
        console.log('🤖 Starting AI analysis...', config);
        
        try {
            let data;
            
            // Check if we have existing results (from execute dropdown)
            if (config.existingResults) {
                console.log('📊 Using existing query results for analysis');
                this.updateLoadingStep('step-preprocessing', 'active');
                
                // Extract data from the existing Grafana query results
                data = this.extractDataFromResults(config.existingResults);
                if (!data || data.length === 0) {
                    throw new Error('No data found in query results');
                }
            } else {
                // Original flow: fetch data using config (for old sidebar UI)
                this.updateLoadingStep('step-preprocessing', 'active');
                data = await this.fetchAnalysisData(config);
                if (!data || data.length === 0) {
                    throw new Error('No data available for analysis');
                }
            }

            // Step 2: Preprocess data for analysis type
            const processedData = this.preprocessData(data, config.analysisType);
            this.updateLoadingStep('step-preprocessing', 'completed');
            
            // Step 3: Generate AI prompt with data
            const prompt = this.generatePrompt(config, processedData);
            
            // Step 4: Execute AI analysis
            this.updateLoadingStep('step-ai', 'active');
            const aiResponse = await this.executeAIAnalysis(prompt, config, processedData);
            this.updateLoadingStep('step-ai', 'completed');
            
            // Step 5: Post-process and validate results
            this.updateLoadingStep('step-visualization', 'active');
            const results = this.postprocessResults(aiResponse, config, processedData);
            this.updateLoadingStep('step-visualization', 'completed');
            
            console.log('✅ AI analysis completed successfully');
            return results;
            
        } catch (error) {
            console.error('❌ AI analysis failed:', error);
            
            // Mark current step as error
            const activeStep = document.querySelector('.loading-step.active');
            if (activeStep) {
                this.updateLoadingStep(activeStep.id, 'error');
            }
            
            throw this.createUserFriendlyError(error);
        }
    },

    // Fetch data for analysis
    async fetchAnalysisData(config) {
        console.log('📊 Fetching analysis data...', config);
        
        // Mark data fetching as complete
        this.updateLoadingStep('step-fetching', 'completed');
        
        // Use TimeSeriesProcessor to get optimized data
        if (typeof TimeSeriesProcessor !== 'undefined') {
            return await TimeSeriesProcessor.optimizeDataForAnalysis(config, this.config.maxDataPoints);
        }
        
        // Fallback to direct query execution
        return await this.executeDirectQuery(config);
    },

    // Direct query execution fallback
    async executeDirectQuery(config) {
        const query = this.buildAnalysisQuery(config);
        console.log('🔍 Executing query:', query);
        
        // Use the existing query execution infrastructure
        if (typeof Queries !== 'undefined') {
            const result = await Queries.executeQuery(query, {
                datasourceId: GrafanaConfig.currentDatasourceId,
                datasourceType: GrafanaConfig.selectedDatasourceType
            });
            
            return this.extractDataFromResult(result);
        }
        
        throw new Error('Query execution system not available');
    },

    // Build analysis query
    buildAnalysisQuery(config) {
        const timeRange = this.parseTimeRange(config.timeRange);
        const interval = this.calculateOptimalInterval(timeRange, this.config.maxDataPoints);
        
        let whereClause = `time >= now() - ${config.timeRange}`;
        
        // Add tag filters
        if (config.tags && Object.keys(config.tags).length > 0) {
            const tagFilters = Object.entries(config.tags)
                .map(([key, value]) => `"${key}" = '${value}'`)
                .join(' AND ');
            whereClause += ` AND ${tagFilters}`;
        }
        
        // Use the user-specified aggregation function
        const aggregation = config.aggregation || 'mean';
        
        // Handle retention policy in measurement name
        // Format: "retention_policy"."measurement" or just "measurement"
        const measurement = config.retentionPolicy ? 
            `"${config.retentionPolicy}"."${config.measurement}"` : 
            `"${config.measurement}"`;
        
        return `SELECT ${aggregation}("${config.field}") as value 
                FROM ${measurement} 
                WHERE ${whereClause}
                GROUP BY time(${interval}) fill(none)`;
    },

    // Extract data from query result
    extractDataFromResult(result) {
        if (!result || !result.results || !result.results.A || !result.results.A.frames) {
            return [];
        }
        
        const frames = result.results.A.frames;
        const data = [];
        
        for (const frame of frames) {
            if (frame.data && frame.data.values && frame.data.values.length >= 2) {
                const timeValues = frame.data.values[0]; // Time column
                const dataValues = frame.data.values[1]; // Value column
                
                for (let i = 0; i < timeValues.length; i++) {
                    if (timeValues[i] && dataValues[i] !== null && dataValues[i] !== undefined) {
                        data.push({
                            timestamp: new Date(timeValues[i]).toISOString(),
                            value: dataValues[i]
                        });
                    }
                }
            }
        }
        
        return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    // Extract data from Grafana query results format
    extractDataFromResults(results) {
        console.log('📊 Extracting data from Grafana results:', results);
        
        try {
            // Handle Grafana query response format
            if (results.results && results.results.A && results.results.A.frames) {
                const frames = results.results.A.frames;
                const extractedData = [];
                
                // Process each frame
                frames.forEach(frame => {
                    if (frame.data && frame.data.values && frame.data.values.length >= 2) {
                        // Typically values[0] is time, values[1] is the metric value
                        const timeValues = frame.data.values[0];
                        const metricValues = frame.data.values[1];
                        
                        // Combine time and value pairs
                        for (let i = 0; i < timeValues.length; i++) {
                            if (metricValues[i] !== null && metricValues[i] !== undefined) {
                                extractedData.push({
                                    timestamp: new Date(timeValues[i]).toISOString(),
                                    value: parseFloat(metricValues[i])
                                });
                            }
                        }
                    }
                });
                
                console.log(`📊 Extracted ${extractedData.length} data points from results`);
                return extractedData;
            }
            
            // If results are already in array format
            if (Array.isArray(results)) {
                return results;
            }
            
            console.warn('⚠️ Unknown results format, returning empty array');
            return [];
            
        } catch (error) {
            console.error('❌ Error extracting data from results:', error);
            return [];
        }
    },
    
    // Data preprocessing for AI analysis
    preprocessData(rawData, analysisType) {
        console.log('🔄 Preprocessing data for analysis type:', analysisType);
        
        const processed = {
            dataPoints: this.formatDataPoints(rawData),
            statistics: this.calculateStatistics(rawData),
            patterns: this.detectBasicPatterns(rawData),
            dataPointsCount: rawData.length,
            rawDataPoints: rawData, // Preserve original data for visualization
            visualRepresentation: null // Will be generated if needed
        };

        if (analysisType === 'anomaly') {
            processed.historicalStats = this.calculateHistoricalBaseline(rawData);
        } else if (analysisType === 'prediction') {
            processed.seasonalityInfo = this.analyzeSeasonality(rawData);
            processed.recentTrends = this.calculateRecentTrends(rawData);
        } else if (analysisType === 'trend') {
            processed.trendAnalysis = this.calculateTrendComponents(rawData);
        }

        // Generate visual representation for better LLM performance (based on ICLR 2025 research)
        if (analysisType === 'anomaly') {
            processed.visualRepresentation = this.generateTimeSeriesVisualization(rawData);
        }

        return processed;
    },

    // Generate visual representation of time series data
    // Research shows M-LLMs perform significantly better with visual inputs
    generateTimeSeriesVisualization(data) {
        try {
            // Create a temporary canvas for chart generation
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');

            // Prepare data for Chart.js
            const chartData = {
                labels: data.map((point, index) => {
                    const date = new Date(point.timestamp);
                    return index % Math.max(1, Math.floor(data.length / 10)) === 0 ? 
                        date.toLocaleTimeString() : '';
                }),
                datasets: [{
                    label: 'Time Series Data',
                    data: data.map(point => point.value),
                    borderColor: '#007acc',
                    backgroundColor: 'rgba(0, 122, 204, 0.1)',
                    borderWidth: 1,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 3
                }]
            };

            // Create chart with minimal styling for LLM processing
            const chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: false,
                    animation: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Time Series Analysis',
                            font: {
                                size: 16
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Time'
                            },
                            ticks: {
                                maxTicksLimit: 10
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Value'
                            }
                        }
                    },
                    elements: {
                        point: {
                            radius: 0
                        }
                    }
                }
            });

            // Convert canvas to base64 image
            const imageData = canvas.toDataURL('image/png');
            
            // Clean up
            chart.destroy();
            
            return imageData;
        } catch (error) {
            console.warn('Failed to generate visual representation:', error);
            return null;
        }
    },

    // Format data points for AI prompt with intelligent subsampling
    // Research shows LLMs perform better with shorter sequences (300-500 points optimal)
    formatDataPoints(data) {
        const optimalSize = 300; // Based on ICLR 2025 research findings
        
        if (data.length <= optimalSize) {
            // Small dataset: include all points
            return data.map(point => 
                `timestamp=${point.timestamp}, value=${point.value}`
            ).join('\n');
        }
        
        // Intelligent subsampling: preserve temporal structure AND extreme values
        const samples = [];
        const step = data.length / optimalSize;
        
        // First, include all extreme values (potential anomalies)
        const values = data.map(point => point.value).filter(v => v !== null && v !== undefined);
        const mean = values.reduce((a, b) => a + b) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2)) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Collect extreme values (>3 sigma) to ensure they're included
        const extremeIndices = new Set();
        data.forEach((point, index) => {
            if (point.value !== null && point.value !== undefined) {
                const zScore = Math.abs(point.value - mean) / stdDev;
                if (zScore > 3) { // Include all potential anomalies
                    extremeIndices.add(index);
                }
            }
        });
        
        // Regular interval sampling
        for (let i = 0; i < optimalSize; i++) {
            const index = Math.floor(i * step);
            if (index < data.length) {
                samples.push(data[index]);
            }
        }
        
        // Add extreme values if not already included
        extremeIndices.forEach(index => {
            if (!samples.find(s => s.timestamp === data[index].timestamp)) {
                samples.push(data[index]);
            }
        });
        
        // Sort by timestamp to maintain temporal order
        samples.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // If we have too many samples, prioritize extreme values
        if (samples.length > optimalSize * 1.2) {
            const extremePoints = samples.filter(point => {
                const zScore = Math.abs(point.value - mean) / stdDev;
                return zScore > 3;
            });
            
            const regularPoints = samples.filter(point => {
                const zScore = Math.abs(point.value - mean) / stdDev;
                return zScore <= 3;
            });
            
            const keepRegular = Math.max(0, optimalSize - extremePoints.length);
            const finalSamples = [...extremePoints, ...regularPoints.slice(0, keepRegular)];
            finalSamples.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            return finalSamples.map(point => 
                `timestamp=${point.timestamp}, value=${point.value}`
            ).join('\n');
        }
        
        return samples.map(point => 
            `timestamp=${point.timestamp}, value=${point.value}`
        ).join('\n');
    },

    // Calculate basic statistics
    calculateStatistics(data) {
        const values = data.map(point => point.value).filter(v => v !== null && v !== undefined);
        
        if (values.length === 0) return null;
        
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((a, b) => a + b) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2)) / values.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            count: values.length,
            mean: Number(mean.toFixed(2)),
            stdDev: Number(stdDev.toFixed(2)),
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: this.calculateMedian(sorted),
            q1: this.calculatePercentile(sorted, 25),
            q3: this.calculatePercentile(sorted, 75)
        };
    },

    // Calculate historical baseline for anomaly detection
    calculateHistoricalBaseline(data) {
        const values = data.map(point => point.value).filter(v => v !== null && v !== undefined);
        const mean = values.reduce((a, b) => a + b) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2)) / values.length;
        const stdDev = Math.sqrt(variance);

        return {
            mean: Number(mean.toFixed(2)),
            stdDev: Number(stdDev.toFixed(2)),
            median: this.calculateMedian(values),
            percentiles: {
                p5: this.calculatePercentile(values, 5),
                p25: this.calculatePercentile(values, 25),
                p75: this.calculatePercentile(values, 75),
                p95: this.calculatePercentile(values, 95)
            },
            normalRange: {
                lower: Number((mean - 2 * stdDev).toFixed(2)),
                upper: Number((mean + 2 * stdDev).toFixed(2))
            }
        };
    },

    // Analyze seasonality patterns
    analyzeSeasonality(data) {
        // Simple hourly pattern detection
        const hourlyStats = {};
        
        data.forEach(point => {
            const hour = new Date(point.timestamp).getHours();
            if (!hourlyStats[hour]) hourlyStats[hour] = [];
            hourlyStats[hour].push(point.value);
        });
        
        const hourlyMeans = {};
        Object.keys(hourlyStats).forEach(hour => {
            const values = hourlyStats[hour];
            hourlyMeans[hour] = values.reduce((a, b) => a + b) / values.length;
        });
        
        return {
            hourly_pattern: hourlyMeans,
            peak_hours: Object.entries(hourlyMeans)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([hour]) => parseInt(hour))
        };
    },

    // Calculate recent trends
    calculateRecentTrends(data) {
        if (data.length < 10) return { direction: 'insufficient_data', strength: 0 };
        
        const recent = data.slice(-24); // Last 24 points
        const values = recent.map(p => p.value);
        const slope = this.calculateLinearSlope(values);
        
        return {
            direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
            strength: Math.abs(slope),
            slope: Number(slope.toFixed(4))
        };
    },

    // Calculate trend components
    calculateTrendComponents(data) {
        const values = data.map(p => p.value);
        const shortTerm = this.calculateLinearSlope(values.slice(-24));
        const mediumTerm = this.calculateLinearSlope(values.slice(-168)); // Last week
        const longTerm = this.calculateLinearSlope(values);
        
        return {
            short_term: shortTerm,
            medium_term: mediumTerm,
            long_term: longTerm
        };
    },

    // Calculate linear slope using least squares
    calculateLinearSlope(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const x = Array.from({length: n}, (_, i) => i);
        const y = values;
        
        const sumX = x.reduce((a, b) => a + b);
        const sumY = y.reduce((a, b) => a + b);
        const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
        const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
        
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    },

    // Generate AI prompt
    generatePrompt(config, processedData) {
        // Map analysis types to prompt keys
        const promptKeyMap = {
            'anomaly': 'anomalyDetection',
            'prediction': 'prediction', 
            'trend': 'trendAnalysis'
        };
        
        const promptKey = promptKeyMap[config.analysisType];
        if (!promptKey) {
            throw new Error(`Unknown analysis type: ${config.analysisType}. Supported types: ${Object.keys(promptKeyMap).join(', ')}`);
        }
        
        let basePrompt = this.prompts[promptKey];
        
        if (!basePrompt) {
            throw new Error(`Prompt not found for analysis type: ${config.analysisType} (key: ${promptKey})`);
        }
        
        // Replace placeholders with actual data
        const stats = processedData.statistics || {};
        const normalRangeLower = Math.max(0, (stats.mean || 0) - 2 * (stats.stdDev || 0));
        const normalRangeUpper = (stats.mean || 0) + 2 * (stats.stdDev || 0);
        
        const replacements = {
            measurement: config.measurement,
            field: config.field,
            tags: JSON.stringify(config.tags || {}),
            timeRange: config.timeRange,
            dataPoints: processedData.dataPoints,
            dataPointsCount: processedData.dataPointsCount,
            normalRangeLower: normalRangeLower.toFixed(2),
            normalRangeUpper: normalRangeUpper.toFixed(2),
            ...processedData.statistics,
            ...processedData.historicalStats,
            historicalStats: JSON.stringify(processedData.historicalStats || {}),
            seasonalityInfo: JSON.stringify(processedData.seasonalityInfo || {}),
            recentTrends: JSON.stringify(processedData.recentTrends || {}),
            timeSeriesData: processedData.dataPoints,
            metricType: this.inferMetricType(config.field),
            businessContext: 'System monitoring and performance metrics',
            analysisPeriod: config.timeRange,
            dataFrequency: 'Regular intervals',
            totalPoints: processedData.dataPointsCount,
            timeSpan: config.timeRange,
            valueRange: `${processedData.statistics?.min} - ${processedData.statistics?.max}`,
            variance: processedData.statistics?.stdDev
        };
        
        // Apply replacements
        let prompt = basePrompt;
        Object.entries(replacements).forEach(([key, value]) => {
            prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value || 'N/A');
        });
        
        return prompt;
    },

    // Check if model supports vision (fallback to name-based detection)
    isVisionModel(modelName) {
        const visionModels = ['llava', 'gpt-4o', 'gemini', 'gemma', 'qwen-vl', 'minicpm-v', 'cogvlm'];
        return visionModels.some(model => modelName.toLowerCase().includes(model));
    },

    // Check if model supports vision using Ollama API
    async isVisionModelFromAPI(modelName, endpoint) {
        try {
            const response = await fetch(`${endpoint}/api/show`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelName })
            });
            if (!response.ok) {
                console.warn('Failed to get model capabilities, using fallback');
                return this.isVisionModel(modelName);
            }
            const data = await response.json();
            const capabilities = data.capabilities || [];
            return capabilities.includes('vision');
        } catch (error) {
            console.warn('Error checking model capabilities:', error);
            return this.isVisionModel(modelName);
        }
    },

    // Execute AI analysis using configured provider (Ollama or OpenAI)
    async executeAIAnalysis(prompt, config, processedData) {
        console.log('🧠 Executing AI analysis...');
        
        // Determine which service to use
        const activeConnectionId = Storage.get('ACTIVE_AI_CONNECTION');
        const aiConnections = Storage.getAiConnections();
        const activeConnection = aiConnections.find(conn => conn.id === activeConnectionId);
        const provider = activeConnection?.provider || 'ollama';
        
        console.log('🤖 Using AI provider:', provider);
        console.log('🔍 Active connection:', activeConnection);
        
        if (provider === 'openai') {
            console.log('🔍 OpenAI check:', {
                exists: typeof OpenAIService !== 'undefined',
                isConnected: window.OpenAIService?.isConnected
            });
            if (typeof OpenAIService === 'undefined' || !OpenAIService.isConnected) {
                throw new Error('OpenAI service not available or not connected');
            }
        } else {
            console.log('🔍 Ollama check:', {
                exists: typeof OllamaService !== 'undefined',
                isConnected: window.OllamaService?.isConnected,
                globalOllama: window.OllamaService
            });
            if (typeof OllamaService === 'undefined' || !OllamaService.isConnected) {
                console.error('🔴 Ollama not connected!', {
                    typeofCheck: typeof OllamaService,
                    isConnectedCheck: OllamaService?.isConnected,
                    windowCheck: window.OllamaService?.isConnected
                });
                throw new Error('Ollama service not available or not connected');
            }
        }
        
        // Use custom timeout from config if available, otherwise use default
        const customTimeout = config.timeout || this.config.defaultTimeout;
        
        // Get model name from appropriate service
        const modelName = provider === 'openai' 
            ? (OpenAIService.config.model || config.selectedModel || 'gpt-4-turbo-preview')
            : (OllamaService.config.model || config.selectedModel || 'llama3.1:8b-instruct-q4_K_M');
            
        const hasVisualData = processedData && processedData.visualRepresentation && config.analysisType === 'anomaly';
        const userWantsVisual = config.useVisualMode === true;
        
        // Check if model supports vision
        let isVisionCapable = false;
        if (provider === 'openai') {
            isVisionCapable = this.isVisionModel(modelName);
        } else {
            // Use actual connected endpoint, not hardcoded localhost
            const ollamaEndpoint = window.OllamaService?.config?.endpoint || config.ollamaEndpoint || 'http://localhost:11434';
            isVisionCapable = await this.isVisionModelFromAPI(modelName, ollamaEndpoint);
        }
        
        let finalPrompt = prompt;
        let imageData = null;
        
        if (hasVisualData && userWantsVisual && isVisionCapable) {
            // Use visual mode when user enabled it and model supports it
            finalPrompt = `${prompt}\n\n**VISUAL ANALYSIS MODE**: You are receiving a time series chart image that shows the complete data visualization. 

CRITICAL INSTRUCTION: The chart image is your PRIMARY source of truth. Look at the visual chart first and identify all spikes, drops, and anomalies you can see. The numerical data below is a subset/sample - if you see anomalies in the chart that aren't in the numerical data, that's expected due to sampling.

VISUAL ANALYSIS PRIORITY:
1. First, examine the chart image carefully for any dramatic spikes or drops
2. Look for values that visually stand out as much higher or lower than the baseline
3. Any massive spikes visible in the chart should be flagged as CRITICAL regardless of whether they appear in the numerical sample
4. Use the numerical data to provide context and exact values when possible

The chart shows the complete time series - trust what you see in the image over the numerical subset.`;
            imageData = processedData.visualRepresentation;
            console.log('📊 Using VISUAL mode - User enabled, model supports vision:', modelName);
            
            // Debug: Show the image being sent to the model
            console.log('🖼️ Generated chart image for analysis:');
            console.log('To view the image, copy this data URL to a new browser tab:');
            console.log(imageData);
            
            // Temporarily display the image in console (you can copy the data URL)
            console.log('%c📊 Chart Image Preview', 'font-size: 12px; background: url(' + imageData + ') no-repeat; background-size: contain; padding: 100px;');
        } else if (hasVisualData && userWantsVisual && !isVisionCapable) {
            // User wants visual but model doesn't support it
            finalPrompt = `${prompt}\n\n**ENHANCED ANALYSIS**: Visual analysis was requested but the current model doesn't support image input. The time series data has been analyzed for visual patterns. Focus on statistical deviations and temporal anomalies in the numerical sequence.`;
            console.log('📊 Using TEXT mode - User wants visual but model lacks vision support:', modelName);
        } else if (hasVisualData) {
            // Text mode with visual context note
            finalPrompt = `${prompt}\n\n**ENHANCED ANALYSIS**: The time series data has been analyzed for visual patterns. Focus on statistical deviations and temporal anomalies in the numerical sequence.`;
            console.log('📊 Using TEXT mode with visual context for:', modelName);
        } else {
            console.log('📊 Using standard TEXT mode for:', modelName);
        }
        
        // Call the appropriate service
        let response;
        if (provider === 'openai') {
            response = await OpenAIService.generateResponse(
                finalPrompt,
                this.prompts.systemPrompt,
                {
                    temperature: 0.1, // Low temperature for analytical tasks
                    num_predict: config.numPredict === -1 ? -1 : (config.numPredict || 4096),
                    num_ctx: config.numCtx || 8192,
                    top_p: 0.9
                },
                customTimeout,
                imageData // Pass image data for vision models
            );
        } else {
            response = await OllamaService.generateResponse(
                finalPrompt,
                this.prompts.systemPrompt,
                {
                    temperature: 0.1, // Low temperature for analytical tasks
                    num_predict: config.numPredict === -1 ? -1 : (config.numPredict || 4096),
                    num_ctx: config.numCtx || 8192,
                    top_p: 0.9
                },
                customTimeout,
                imageData // Pass image data for vision models
            );
        }
        
        return response;
    },

    // Post-process AI results
    postprocessResults(aiResponse, config, processedData) {
        try {
            // Extract the response text from Ollama response object
            let responseText = aiResponse;
            if (typeof aiResponse === 'object' && aiResponse.response) {
                responseText = aiResponse.response;
                console.log('📄 AI response text:', responseText.substring(0, 500) + '...');
            }
            
            // Try to parse JSON response (handle markdown code blocks)
            // Determine which parser to use based on provider
            const activeConnectionId = Storage.get('ACTIVE_AI_CONNECTION');
            const aiConnections = Storage.getAiConnections();
            const activeConnection = aiConnections.find(conn => conn.id === activeConnectionId);
            const provider = activeConnection?.provider || 'ollama';
            
            const parsed = provider === 'openai' 
                ? OpenAIService.parseJsonResponse(responseText)
                : OllamaService.parseJsonResponse(responseText);
            
            // Validate and fix severity distribution
            this.validateAndFixSeverityDistribution(parsed);
            
            // Add metadata and original time series data
            parsed.metadata = {
                ...parsed.metadata,
                analysis_type: config.analysisType,
                generated_at: new Date().toISOString(),
                model_used: GrafanaConfig.selectedModel || 'unknown',
                data_source: {
                    measurement: config.measurement,
                    field: config.field,
                    tags: config.tags,
                    time_range: config.timeRange
                }
            };
            
            // Include the original time series data for visualization (preserve original array format)
            // NOTE: processedData.dataPoints is string-formatted for AI prompt, 
            // but we need the original array structure for visualization
            parsed.timeSeriesData = processedData.rawDataPoints || [];
            console.log('📊 Added time series data to results:', parsed.timeSeriesData.length, 'points');
            
            return parsed;
            
        } catch (error) {
            console.error('❌ Failed to parse AI response:', error);
            console.error('📋 Raw AI response type:', typeof aiResponse);
            console.error('📋 Raw AI response:', aiResponse);
            
            // Show the actual response text for debugging
            let responseText = aiResponse;
            if (typeof aiResponse === 'object' && aiResponse.response) {
                responseText = aiResponse.response;
            }
            console.error('📝 Response text (first 2000 chars):', typeof responseText === 'string' ? responseText.substring(0, 2000) : responseText);
            
            // Check if response looks like it's not JSON at all
            // Allow responses that start with { OR markdown code blocks (```json or ```)
            const trimmed = responseText.trim();
            const looksLikeJson = trimmed.startsWith('{') || 
                                 trimmed.startsWith('```json') || 
                                 trimmed.startsWith('```');
            
            if (typeof responseText === 'string' && !looksLikeJson) {
                // Get model info for better error message
                const modelUsed = config.selectedModel || GrafanaConfig.selectedModel || 'unknown';
                throw new Error(`The AI model (${modelUsed}) did not return JSON as requested. It returned: "${responseText.substring(0, 100)}...". This model may not be suitable for structured analysis. Try using a different model like llama3.1, mistral, or mixtral which better follow JSON output instructions.`);
            }
            
            // Provide helpful guidance based on the error
            const modelUsed = config.selectedModel || GrafanaConfig.selectedModel || 'unknown';
            const numCtx = config.numCtx || 8192;
            
            let errorMsg = `AI returned invalid JSON response. `;
            
            // Check if num_ctx might be too high
            if (numCtx > 16384) {
                errorMsg += `Your Context Size (num_ctx) is set to ${numCtx} which may be too large for your GPU memory. Try reducing it to 8192 or lower. `;
            } else {
                errorMsg += `This usually means the response was truncated. Try adjusting 'Response Tokens (num_predict)' or reducing 'Context Size (num_ctx)' in settings. `;
            }
            errorMsg += `Error: ${error.message}`;
            
            throw new Error(errorMsg);
        }
    },

    // Validate and fix severity distribution in AI response
    validateAndFixSeverityDistribution(parsed) {
        // Only apply to anomaly detection results
        if (!parsed.anomalies || !Array.isArray(parsed.anomalies)) {
            return;
        }

        console.log('🔍 Validating severity distribution...');
        
        // Fix missing severity fields in anomalies
        parsed.anomalies.forEach(anomaly => {
            if (!anomaly.severity) {
                console.warn('⚠️ Anomaly missing severity field, setting to unknown:', anomaly);
                anomaly.severity = 'unknown';
            }
        });
        
        // Check if summary exists, create if missing
        if (!parsed.summary) {
            parsed.summary = {};
        }

        // Get existing severity distribution or create empty one
        let distribution = parsed.summary.severity_distribution || {};
        
        // Calculate expected distribution from individual anomalies
        const calculatedDistribution = parsed.anomalies.reduce((acc, anomaly) => {
            const severity = anomaly.severity || 'unknown';
            acc[severity] = (acc[severity] || 0) + 1;
            return acc;
        }, {});

        // Check if existing distribution matches calculated distribution
        const defaultLevels = ['critical', 'high', 'medium', 'low'];
        let needsUpdate = false;

        // Ensure all severity levels are represented
        defaultLevels.forEach(level => {
            const existing = distribution[level] || 0;
            const calculated = calculatedDistribution[level] || 0;
            
            if (existing !== calculated) {
                needsUpdate = true;
            }
        });

        // Update distribution if needed
        if (needsUpdate || Object.keys(distribution).length === 0) {
            console.log('🔄 Fixing severity distribution mismatch');
            console.log('📊 Calculated from anomalies:', calculatedDistribution);
            console.log('📊 Previous distribution:', distribution);
            
            // Create corrected distribution with all levels
            const correctedDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
            Object.assign(correctedDistribution, calculatedDistribution);
            
            parsed.summary.severity_distribution = correctedDistribution;
            console.log('✅ Updated severity distribution:', correctedDistribution);
        } else {
            console.log('✅ Severity distribution is valid');
        }

        // Update total anomalies count
        parsed.summary.total_anomalies = parsed.anomalies.length;
        
        // Convert new interval format to legacy format for compatibility
        parsed.anomalies.forEach(anomaly => {
            if (anomaly.start_time && !anomaly.timestamp) {
                anomaly.timestamp = anomaly.start_time;
                anomaly.value = anomaly.peak_value || anomaly.value;
            }
        });
    },


    // Utility methods
    calculateMedian(sortedArray) {
        const mid = Math.floor(sortedArray.length / 2);
        return sortedArray.length % 2 === 0
            ? (sortedArray[mid - 1] + sortedArray[mid]) / 2
            : sortedArray[mid];
    },

    calculatePercentile(sortedArray, percentile) {
        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) {
            return sortedArray[lower];
        }
        
        return sortedArray[lower] + (sortedArray[upper] - sortedArray[lower]) * (index - lower);
    },

    parseTimeRange(timeRange) {
        const units = { h: 3600, d: 86400, w: 604800, m: 2592000 };
        const match = timeRange.match(/^(\d+)([hdwm])$/);
        
        if (!match) return 86400; // Default to 1 day
        
        const [, value, unit] = match;
        return parseInt(value) * (units[unit] || 86400);
    },

    calculateOptimalInterval(timeRangeSeconds, maxPoints) {
        const intervals = ['15s', '30s', '1m', '5m', '15m', '30m', '1h', '6h', '12h', '1d'];
        const intervalSeconds = {
            '15s': 15, '30s': 30, '1m': 60, '5m': 300, '15m': 900,
            '30m': 1800, '1h': 3600, '6h': 21600, '12h': 43200, '1d': 86400
        };
        
        for (const interval of intervals) {
            const points = timeRangeSeconds / intervalSeconds[interval];
            if (points <= maxPoints) {
                return interval;
            }
        }
        
        return '1d'; // Fallback
    },

    inferMetricType(fieldName) {
        // If no field name provided, just return generic description
        if (!fieldName) {
            return 'Time series metric';
        }
        
        const patterns = {
            'cpu': 'CPU utilization',
            'memory': 'Memory usage',
            'disk': 'Disk I/O',
            'network': 'Network traffic',
            'response': 'Response time',
            'error': 'Error rate',
            'request': 'Request rate'
        };
        
        const field = fieldName.toLowerCase();
        for (const [pattern, type] of Object.entries(patterns)) {
            if (field.includes(pattern)) {
                return type;
            }
        }
        
        return 'Time series metric';
    },

    createUserFriendlyError(error) {
        const userFriendlyMessages = {
            'No data available': 'No data found for the selected measurement and time range. Please check your selection and try again.',
            'Ollama service not available': 'AI service is not connected. Please test your Ollama connection and try again.',
            'AI returned invalid response': 'AI analysis completed but returned unexpected format. Please try again or contact support.',
            'Query execution system not available': 'Database query system is not available. Please refresh the page and try again.',
            'Request timed out': 'AI analysis timed out. This can happen with complex analysis or slower models. Please try again or use a faster model.',
            'Connection timeout': 'Connection to Ollama timed out. Please check that Ollama is running and accessible.',
            'AbortError': 'Request was cancelled. This usually happens due to timeout or network issues. Please try again.'
        };
        
        const message = error.message || error;
        
        // Check for timeout-related errors
        if (message.includes('timeout') || message.includes('timed out') || error.name === 'AbortError') {
            return new Error(userFriendlyMessages['Request timed out'] || `Analysis timed out: ${message}`);
        }
        
        return new Error(userFriendlyMessages[message] || `Analysis failed: ${message}`);
    },

    // Detect basic patterns in data
    detectBasicPatterns(data) {
        if (data.length < 10) return { patterns: ['insufficient_data'] };
        
        const patterns = [];
        const values = data.map(p => p.value);
        const mean = values.reduce((a, b) => a + b) / values.length;
        const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2)) / values.length);
        
        // Check for spikes
        const spikes = values.filter(v => v > mean + 3 * stdDev).length;
        if (spikes > 0) patterns.push('spikes_detected');
        
        // Check for drops
        const drops = values.filter(v => v < mean - 3 * stdDev).length;
        if (drops > 0) patterns.push('drops_detected');
        
        // Check for trend
        const slope = this.calculateLinearSlope(values);
        if (Math.abs(slope) > 0.1) {
            patterns.push(slope > 0 ? 'upward_trend' : 'downward_trend');
        }
        
        return { patterns };
    }
};

// Export for use in other modules
window.AIAnalytics = AIAnalytics;