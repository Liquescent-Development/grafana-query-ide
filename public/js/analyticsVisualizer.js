// Analytics Results Visualizer
// Creates interactive visualizations for AI/ML analysis results

const AnalyticsVisualizer = {
    // Chart instances for cleanup
    chartInstances: {},

    // Color schemes for different analysis types
    colors: {
        anomaly: {
            normal: '#4CAF50',
            low: '#FFC107',
            medium: '#FF9800',
            high: '#F44336',
            critical: '#9C27B0',
            unknown: '#999999',
            background: 'rgba(76, 175, 80, 0.1)'
        },
        prediction: {
            actual: '#2196F3',
            predicted: '#FF9800',
            confidence80: 'rgba(255, 152, 0, 0.2)',
            confidence95: 'rgba(255, 152, 0, 0.1)',
            background: 'rgba(33, 150, 243, 0.1)'
        },
        trend: {
            data: '#2196F3',
            shortTrend: '#4CAF50',
            mediumTrend: '#FF9800',
            longTrend: '#9C27B0',
            background: 'rgba(33, 150, 243, 0.1)'
        }
    },

    // Main visualization method
    visualizeResults(results, containerId) {
        console.log('📊 Visualizing analysis results...', results.metadata?.analysis_type);
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Visualization container not found:', containerId);
            return;
        }

        try {
            // Clear previous content
            this.clearContainer(container);
            
            // Create visualization based on analysis type
            const analysisType = results.metadata?.analysis_type;
            
            switch (analysisType) {
                case 'anomaly':
                    this.visualizeAnomalyResults(results, container);
                    break;
                case 'prediction':
                    this.visualizePredictionResults(results, container);
                    break;
                case 'trend':
                    this.visualizeTrendResults(results, container);
                    break;
                default:
                    this.visualizeGenericResults(results, container);
            }
            
            // Add export functionality
            this.addExportControls(container, results);
            
        } catch (error) {
            console.error('Visualization failed:', error);
            this.showError(container, 'Failed to visualize results: ' + error.message);
        }
    },

    // Visualize anomaly detection results
    visualizeAnomalyResults(results, container) {
        const html = `
            <div class="analysis-results-header">
                <h4>🚨 Anomaly Detection Results</h4>
                <div class="analysis-summary">
                    <span class="metric-badge">
                        <strong>${results.summary?.total_anomalies || 0}</strong> anomalies found
                    </span>
                    <span class="confidence-badge">
                        Confidence: ${Math.round((results.summary?.analysis_confidence || 0) * 100)}%
                    </span>
                </div>
            </div>
            
            <div class="analysis-charts">
                <div class="chart-controls">
                    <label class="chart-toggle">
                        <input type="checkbox" id="logScaleToggle" onchange="AnalyticsVisualizer.toggleLogScale('anomalyChart')">
                        Log Scale (Y-axis)
                    </label>
                </div>
                <div class="chart-container">
                    <canvas id="anomalyChart" width="800" height="400"></canvas>
                </div>
            </div>
            
            <div class="analysis-insights">
                <div class="severity-distribution">
                    <h5>Severity Distribution</h5>
                    <div id="severityChart" class="mini-chart"></div>
                </div>
                
                <div class="anomaly-list">
                    <h5>Detected Anomalies</h5>
                    <div id="anomaliesList" class="anomalies-list"></div>
                </div>
                
                <div class="insights-panel">
                    <h5>Insights & Recommendations</h5>
                    <div id="insightsList" class="insights-list"></div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Create main anomaly chart
        this.createAnomalyChart(results);
        
        // Create severity distribution
        this.createSeverityDistribution(results);
        
        // Populate anomalies list
        this.populateAnomaliesList(results);
        
        // Populate insights
        this.populateInsights(results);
    },

    // Visualize prediction results
    visualizePredictionResults(results, container) {
        const html = `
            <div class="analysis-results-header">
                <h4>📈 Prediction Results</h4>
                <div class="analysis-summary">
                    <span class="metric-badge">
                        <strong>${results.predictions?.length || 0}</strong> predictions
                    </span>
                    <span class="confidence-badge">
                        Reliability: ${Math.round((results.forecast_metadata?.reliability_score || 0) * 100)}%
                    </span>
                </div>
            </div>
            
            <div class="analysis-charts">
                <div class="chart-container">
                    <canvas id="predictionChart" width="800" height="400"></canvas>
                </div>
            </div>
            
            <div class="analysis-insights">
                <div class="forecast-metadata">
                    <h5>Forecast Information</h5>
                    <div id="forecastInfo" class="forecast-info"></div>
                </div>
                
                <div class="prediction-table">
                    <h5>Predicted Values</h5>
                    <div id="predictionTable" class="prediction-table-container"></div>
                </div>
                
                <div class="insights-panel">
                    <h5>Recommendations</h5>
                    <div id="predictionInsights" class="insights-list"></div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Create prediction chart with confidence intervals
        this.createPredictionChart(results);
        
        // Populate forecast metadata
        this.populateForecastInfo(results);
        
        // Create prediction table
        this.createPredictionTable(results);
        
        // Populate recommendations
        this.populatePredictionInsights(results);
    },

    // Visualize trend analysis results
    visualizeTrendResults(results, container) {
        const html = `
            <div class="analysis-results-header">
                <h4>📊 Trend Analysis Results</h4>
                <div class="analysis-summary">
                    <span class="metric-badge">
                        Short-term: <strong>${results.trends?.short_term?.direction || 'N/A'}</strong>
                    </span>
                    <span class="metric-badge">
                        Long-term: <strong>${results.trends?.long_term?.direction || 'N/A'}</strong>
                    </span>
                </div>
            </div>
            
            <div class="analysis-charts">
                <div class="chart-container">
                    <canvas id="trendChart" width="800" height="400"></canvas>
                </div>
            </div>
            
            <div class="analysis-insights">
                <div class="trend-summary">
                    <h5>Trend Summary</h5>
                    <div id="trendSummary" class="trend-summary-grid"></div>
                </div>
                
                <div class="seasonality-info">
                    <h5>Seasonality Patterns</h5>
                    <div id="seasonalityInfo" class="seasonality-grid"></div>
                </div>
                
                <div class="insights-panel">
                    <h5>Key Insights</h5>
                    <div id="trendInsights" class="insights-list"></div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Create trend chart
        this.createTrendChart(results);
        
        // Populate trend summary
        this.populateTrendSummary(results);
        
        // Populate seasonality information
        this.populateSeasonalityInfo(results);
        
        // Populate insights
        this.populateTrendInsights(results);
    },

    // Create anomaly detection chart
    createAnomalyChart(results) {
        const ctx = document.getElementById('anomalyChart')?.getContext('2d');
        if (!ctx) return;

        // Get actual historical data points from results
        const dataPoints = this.getActualDataPoints(results);
        const anomalies = results.anomalies || [];
        
        console.log('📊 Chart data:', { dataPoints: dataPoints.length, anomalies: anomalies.length });
        
        // Use category scale like the working query results charts
        let { processedDataPoints, timeLabels } = this.convertDataForCategoryScale(dataPoints);
        
        // Store the original data and sample rate for anomaly mapping
        const originalDataPoints = [...processedDataPoints];
        let sampleRate = 1;
        
        // Sample data for better visualization if too dense
        if (processedDataPoints.length > 500) {
            // Use intelligent sampling that preserves min/max values in each window
            const targetPoints = 500;
            const windowSize = Math.ceil(processedDataPoints.length / targetPoints);
            sampleRate = windowSize;
            
            const sampledDataPoints = [];
            const sampledTimeLabels = [];
            
            for (let i = 0; i < processedDataPoints.length; i += windowSize) {
                const window = processedDataPoints.slice(i, Math.min(i + windowSize, processedDataPoints.length));
                const windowLabels = timeLabels.slice(i, Math.min(i + windowSize, timeLabels.length));
                
                if (window.length === 0) continue;
                
                // Find min and max points in this window to preserve variation
                let minPoint = window[0];
                let maxPoint = window[0];
                let minIdx = 0;
                let maxIdx = 0;
                
                window.forEach((point, idx) => {
                    if (point.y < minPoint.y) {
                        minPoint = point;
                        minIdx = idx;
                    }
                    if (point.y > maxPoint.y) {
                        maxPoint = point;
                        maxIdx = idx;
                    }
                });
                
                // Add min first if it comes before max, otherwise add max first
                if (minIdx < maxIdx) {
                    sampledDataPoints.push(minPoint);
                    sampledTimeLabels.push(windowLabels[minIdx]);
                    if (minPoint !== maxPoint) {
                        sampledDataPoints.push(maxPoint);
                        sampledTimeLabels.push(windowLabels[maxIdx]);
                    }
                } else {
                    sampledDataPoints.push(maxPoint);
                    sampledTimeLabels.push(windowLabels[maxIdx]);
                    if (minPoint !== maxPoint) {
                        sampledDataPoints.push(minPoint);
                        sampledTimeLabels.push(windowLabels[minIdx]);
                    }
                }
            }
            
            // Re-index the sampled data points
            processedDataPoints = sampledDataPoints.map((point, index) => ({
                x: index,
                y: point.y,
                originalTimestamp: point.originalTimestamp,
                originalIndex: point.originalIndex || index
            }));
            timeLabels = sampledTimeLabels;
            
            console.log('📊 Data sampling applied:', { 
                original: dataPoints.length, 
                sampled: processedDataPoints.length,
                sampleRate 
            });
        }
        
        console.log('📊 Chart setup:', { dataPointsCount: processedDataPoints.length, labelsCount: timeLabels.length });
        console.log('📊 Sample data range:', {
            firstPoint: processedDataPoints[0] ? new Date(processedDataPoints[0].originalTimestamp).toISOString() : 'none',
            lastPoint: processedDataPoints[processedDataPoints.length - 1] ? new Date(processedDataPoints[processedDataPoints.length - 1].originalTimestamp).toISOString() : 'none',
            firstLabel: timeLabels[0],
            lastLabel: timeLabels[timeLabels.length - 1]
        });
        
        // Debug first and last few points to check ordering
        console.log('📊 First 3 data points:', processedDataPoints.slice(0, 3).map(p => ({
            index: p.x,
            timestamp: new Date(p.originalTimestamp).toISOString(),
            value: p.y
        })));
        console.log('📊 Last 3 data points:', processedDataPoints.slice(-3).map(p => ({
            index: p.x,
            timestamp: new Date(p.originalTimestamp).toISOString(),
            value: p.y
        })));
        console.log('📊 First 3 labels:', timeLabels.slice(0, 3));
        console.log('📊 Last 3 labels:', timeLabels.slice(-3));
        
        // Prepare datasets
        // For the normal line, we want ALL points (not filtered by anomalies)
        // The line should show the complete time series
        const allNormalPoints = processedDataPoints; // Use all points for the line
        
        console.log('📊 Total points for normal line:', allNormalPoints.length);
        console.log('📊 Sample normal data points:', allNormalPoints.slice(0, 5).map(p => ({ x: p.x, y: p.y })));
        console.log('📊 Mid normal data points:', allNormalPoints.slice(Math.floor(allNormalPoints.length/2), Math.floor(allNormalPoints.length/2) + 5).map(p => ({ x: p.x, y: p.y })));
        console.log('📊 Last normal data points:', allNormalPoints.slice(-5).map(p => ({ x: p.x, y: p.y })));
        console.log('📊 Y-value range:', {
            min: Math.min(...allNormalPoints.map(p => p.y)),
            max: Math.max(...allNormalPoints.map(p => p.y)),
            mean: allNormalPoints.reduce((sum, p) => sum + p.y, 0) / allNormalPoints.length
        });

        const datasets = [{
            label: 'Time Series',
            data: allNormalPoints,
            borderColor: this.colors.anomaly.normal,
            backgroundColor: 'transparent', // No fill
            pointRadius: 0, // Hide individual points for large datasets
            pointHoverRadius: 3,
            tension: 0.1, // Less smoothing to show actual variation
            borderWidth: 1.5, // Thinner line to see variation better
            fill: false // Explicitly no fill
        }];
        
        // Add anomaly points by severity (including unknown)
        const severityLevels = ['low', 'medium', 'high', 'critical', 'unknown'];
        severityLevels.forEach(severity => {
            const severityAnomalies = anomalies.filter(a => (a.severity || 'unknown') === severity);
            if (severityAnomalies.length > 0) {
                console.log(`📊 Adding ${severity} anomalies:`, severityAnomalies.length);
                // Create a sparse array for anomalies that matches the label length
                const anomalyDataArray = new Array(timeLabels.length).fill(null);
                
                severityAnomalies.forEach(a => {
                    const timestamp = new Date(a.timestamp).getTime();
                    
                    // Find the anomaly in the original (non-sampled) data first
                    const originalIndex = this.findIndexForTimestamp(timestamp, originalDataPoints);
                    
                    // Then map to the sampled data index
                    let sampledIndex = Math.floor(originalIndex / sampleRate);
                    
                    // Ensure we don't exceed the sampled array bounds
                    sampledIndex = Math.min(sampledIndex, processedDataPoints.length - 1);
                    
                    const actualDataPoint = processedDataPoints[sampledIndex];
                    console.log(`📍 Anomaly mapping:`, {
                        anomalyTimestamp: a.timestamp,
                        anomalyValue: a.value,
                        originalIndex: originalIndex,
                        sampleRate: sampleRate,
                        sampledIndex: sampledIndex,
                        actualTimestamp: actualDataPoint ? new Date(actualDataPoint.originalTimestamp).toISOString() : 'none',
                        actualValue: actualDataPoint ? actualDataPoint.y : 'none',
                        labelAtIndex: timeLabels[sampledIndex],
                        totalSampledPoints: processedDataPoints.length,
                        isNearEnd: sampledIndex > processedDataPoints.length * 0.8,
                        percentagePosition: (sampledIndex / processedDataPoints.length * 100).toFixed(1) + '%'
                    });
                    
                    // Set the anomaly value at the correct index in the sparse array
                    anomalyDataArray[sampledIndex] = a.value;
                });
                
                const anomalyData = anomalyDataArray;
                
                datasets.push({
                    label: `${severity.charAt(0).toUpperCase() + severity.slice(1)} Anomalies`,
                    data: anomalyData,
                    borderColor: this.colors.anomaly[severity],
                    backgroundColor: this.colors.anomaly[severity],
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    showLine: false,
                    pointStyle: 'triangle'
                });
            }
        });

        const chartConfig = {
            type: 'line',
            data: { 
                labels: timeLabels,
                datasets 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Time Series with Anomaly Detection',
                        color: '#cccccc'
                    },
                    legend: {
                        labels: { color: '#cccccc' }
                    },
                    tooltip: {
                        callbacks: {
                            afterBody: (tooltipItems) => {
                                const point = tooltipItems[0];
                                const anomaly = anomalies.find(a => 
                                    new Date(a.timestamp).getTime() === point.parsed.x
                                );
                                
                                if (anomaly) {
                                    return [
                                        `Anomaly Score: ${anomaly.score.toFixed(2)}`,
                                        `Type: ${anomaly.type}`,
                                        `Explanation: ${anomaly.explanation}`
                                    ];
                                }
                                return [];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'category',
                        grid: {
                            color: '#3c3c3c',
                            borderColor: '#3c3c3c'
                        },
                        ticks: {
                            color: '#cccccc',
                            maxRotation: 45,
                            minRotation: 0,
                            font: {
                                size: 11
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#cccccc',
                            font: {
                                size: 12,
                                weight: 'normal'
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#3c3c3c',
                            borderColor: '#3c3c3c'
                        },
                        ticks: {
                            color: '#cccccc',
                            font: {
                                size: 11
                            }
                        },
                        title: {
                            display: true,
                            text: 'Value',
                            color: '#cccccc',
                            font: {
                                size: 12,
                                weight: 'normal'
                            }
                        }
                    }
                }
            }
        };

        try {
            const chart = new Chart(ctx, chartConfig);
            this.chartInstances.anomalyChart = chart;
        } catch (error) {
            console.error('Chart creation failed:', error);
            throw new Error(`Failed to create chart: ${error.message}`);
        }
    },


    // Create prediction chart with confidence intervals
    createPredictionChart(results) {
        const ctx = document.getElementById('predictionChart')?.getContext('2d');
        if (!ctx) return;

        const predictions = results.predictions || [];
        
        // Prepare datasets
        const datasets = [];
        
        // Historical data (actual)
        const historicalData = this.getActualDataPoints(results);
        datasets.push({
            label: 'Historical Data',
            data: historicalData,
            borderColor: this.colors.prediction.actual,
            backgroundColor: this.colors.prediction.background,
            pointRadius: 2,
            tension: 0.1
        });
        
        // Predicted values
        if (predictions.length > 0) {
            datasets.push({
                label: 'Predictions',
                data: predictions.map(p => ({
                    x: p.timestamp,
                    y: p.predicted_value
                })),
                borderColor: this.colors.prediction.predicted,
                backgroundColor: this.colors.prediction.predicted,
                pointRadius: 4,
                borderDash: [5, 5],
                tension: 0.1
            });
            
            // 95% Confidence interval
            datasets.push({
                label: '95% Confidence',
                data: predictions.map(p => p.confidence_95_upper),
                borderColor: 'transparent',
                backgroundColor: this.colors.prediction.confidence95,
                fill: '+1',
                pointRadius: 0,
                tension: 0.1
            });
            
            datasets.push({
                label: '',
                data: predictions.map(p => p.confidence_95_lower),
                borderColor: 'transparent',
                backgroundColor: this.colors.prediction.confidence95,
                pointRadius: 0,
                tension: 0.1
            });
            
            // 80% Confidence interval
            datasets.push({
                label: '80% Confidence',
                data: predictions.map(p => p.confidence_80_upper),
                borderColor: 'transparent',
                backgroundColor: this.colors.prediction.confidence80,
                fill: '+1',
                pointRadius: 0,
                tension: 0.1
            });
            
            datasets.push({
                label: '',
                data: predictions.map(p => p.confidence_80_lower),
                borderColor: 'transparent',
                backgroundColor: this.colors.prediction.confidence80,
                pointRadius: 0,
                tension: 0.1
            });
        }

        const chart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Time Series Prediction with Confidence Intervals',
                        color: '#cccccc'
                    },
                    legend: {
                        labels: { 
                            color: '#cccccc',
                            filter: (item) => item.text !== '' // Hide empty labels
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        ticks: { color: '#cccccc' },
                        grid: { color: '#444444' }
                    },
                    y: {
                        ticks: { color: '#cccccc' },
                        grid: { color: '#444444' }
                    }
                }
            }
        });

        this.chartInstances.predictionChart = chart;
    },

    // Create trend analysis chart
    createTrendChart(results) {
        const ctx = document.getElementById('trendChart')?.getContext('2d');
        if (!ctx) return;

        // Generate actual trend data
        const trendData = this.generateTrendDataForChart(results);
        
        const datasets = [{
            label: 'Time Series Data',
            data: trendData.data,
            borderColor: this.colors.trend.data,
            backgroundColor: this.colors.trend.background,
            pointRadius: 2,
            tension: 0.1
        }];
        
        // Add trend lines if available
        if (trendData.shortTrend) {
            datasets.push({
                label: 'Short-term Trend',
                data: trendData.shortTrend,
                borderColor: this.colors.trend.shortTrend,
                borderWidth: 2,
                pointRadius: 0,
                borderDash: [10, 5],
                tension: 0
            });
        }
        
        if (trendData.longTrend) {
            datasets.push({
                label: 'Long-term Trend',
                data: trendData.longTrend,
                borderColor: this.colors.trend.longTrend,
                borderWidth: 3,
                pointRadius: 0,
                borderDash: [15, 5],
                tension: 0
            });
        }

        const chart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Trend Analysis',
                        color: '#cccccc'
                    },
                    legend: {
                        labels: { color: '#cccccc' }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        ticks: { color: '#cccccc' },
                        grid: { color: '#444444' }
                    },
                    y: {
                        ticks: { color: '#cccccc' },
                        grid: { color: '#444444' }
                    }
                }
            }
        });

        this.chartInstances.trendChart = chart;
    },

    // Create severity distribution visualization
    createSeverityDistribution(results) {
        const container = document.getElementById('severityChart');
        if (!container) return;

        // Get severity distribution from AI summary, or calculate from individual anomalies as fallback
        let distribution = results.summary?.severity_distribution || {};
        
        // If no distribution provided by AI, calculate from individual anomalies
        if (Object.keys(distribution).length === 0 && results.anomalies && results.anomalies.length > 0) {
            console.log('🔄 Calculating severity distribution from individual anomalies as fallback');
            distribution = results.anomalies.reduce((acc, anomaly) => {
                const severity = anomaly.severity || 'unknown';
                acc[severity] = (acc[severity] || 0) + 1;
                return acc;
            }, {});
            console.log('📊 Calculated severity distribution:', distribution);
        }
        
        // Ensure all severity levels are represented (even with 0 counts)
        const defaultDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
        distribution = { ...defaultDistribution, ...distribution };
        
        const total = Object.values(distribution).reduce((a, b) => a + b, 0);
        
        let html = '<div class="severity-bars">';
        
        Object.entries(distribution).forEach(([severity, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const color = this.colors.anomaly[severity] || '#999999';
            
            html += `
                <div class="severity-bar">
                    <div class="severity-label">${severity}</div>
                    <div class="severity-progress">
                        <div class="severity-fill" style="width: ${percentage}%; background-color: ${color}"></div>
                    </div>
                    <div class="severity-count">${count}</div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    },

    // Populate anomalies list
    populateAnomaliesList(results) {
        const container = document.getElementById('anomaliesList');
        if (!container) return;

        const anomalies = results.anomalies || [];
        
        if (anomalies.length === 0) {
            container.innerHTML = '<div class="empty-state">No anomalies detected</div>';
            return;
        }

        let html = '<div class="anomalies-grid">';
        
        anomalies.slice(0, 10).forEach(anomaly => {
            // Handle missing severity field gracefully
            const severity = anomaly.severity || 'unknown';
            const severityColor = this.colors.anomaly[severity] || '#999999';
            const timestamp = new Date(anomaly.timestamp).toLocaleString();
            
            html += `
                <div class="anomaly-item">
                    <div class="anomaly-header">
                        <span class="anomaly-time">${timestamp}</span>
                        <span class="anomaly-severity" style="color: ${severityColor}">
                            ${severity.toUpperCase()}
                        </span>
                    </div>
                    <div class="anomaly-details">
                        <div class="anomaly-value">Value: <strong>${anomaly.value}</strong></div>
                        <div class="anomaly-score">Score: <strong>${anomaly.score ? anomaly.score.toFixed(2) : 'N/A'}</strong></div>
                        <div class="anomaly-type">Type: <strong>${anomaly.type || 'unknown'}</strong></div>
                    </div>
                    <div class="anomaly-explanation">${anomaly.explanation || 'No explanation provided'}</div>
                </div>
            `;
        });
        
        html += '</div>';
        
        if (anomalies.length > 10) {
            html += `<div class="show-more">... and ${anomalies.length - 10} more anomalies</div>`;
        }
        
        container.innerHTML = html;
    },

    // Populate insights and recommendations
    populateInsights(results) {
        const container = document.getElementById('insightsList');
        if (!container) return;

        const patterns = results.summary?.patterns_detected || [];
        const recommendations = results.summary?.recommendations || [];
        
        let html = '';
        
        if (patterns.length > 0) {
            html += '<div class="patterns-section"><h6>Patterns Detected:</h6><ul>';
            patterns.forEach(pattern => {
                html += `<li>${this.formatPattern(pattern)}</li>`;
            });
            html += '</ul></div>';
        }
        
        if (recommendations.length > 0) {
            html += '<div class="recommendations-section"><h6>Recommendations:</h6><ul>';
            recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            html += '</ul></div>';
        }
        
        if (!patterns.length && !recommendations.length) {
            html = '<div class="empty-state">No specific insights available</div>';
        }
        
        container.innerHTML = html;
    },

    // Get actual data points from analysis results
    getActualDataPoints(results) {
        console.log('🔍 Debugging results structure:', Object.keys(results));
        console.log('🔍 Results content:', results);
        
        // Try to get actual time series data from the results
        if (results.timeSeriesData) {
            // Handle array format (preferred)
            if (Array.isArray(results.timeSeriesData) && results.timeSeriesData.length > 0) {
                console.log('📊 Using actual time series data array:', results.timeSeriesData.length, 'points');
                const convertedData = results.timeSeriesData.map(point => ({
                    x: new Date(point.timestamp || point.time).getTime(),
                    y: parseFloat(point.value)
                }));
                console.log('📊 Sample converted data:', convertedData.slice(0, 3));
                console.log('📊 Time range:', {
                    start: new Date(convertedData[0].x).toISOString(),
                    end: new Date(convertedData[convertedData.length - 1].x).toISOString(),
                    totalPoints: convertedData.length
                });
                return convertedData;
            }
            // Handle legacy string format: "timestamp: value\n..." (fallback only)
            else if (typeof results.timeSeriesData === 'string') {
                console.warn('⚠️ Using legacy string format for timeSeriesData - this should be fixed');
                console.log('📊 Parsing time series data string:', results.timeSeriesData.length, 'characters');
                
                const lines = results.timeSeriesData.split('\n').filter(line => line.trim());
                console.log('📊 Found lines:', lines.length);
                
                if (lines.length === 0) {
                    throw new Error('timeSeriesData string contains no valid data lines');
                }
                
                const parsedData = lines.map((line, index) => {
                    const [timestamp, value] = line.split(': ');
                    if (!timestamp || value === undefined) {
                        console.error(`Invalid data line at index ${index}:`, line);
                        throw new Error(`Invalid data format at line ${index}: ${line}`);
                    }
                    const parsedTimestamp = new Date(timestamp).getTime();
                    const parsedValue = parseFloat(value);
                    
                    if (isNaN(parsedTimestamp) || isNaN(parsedValue)) {
                        console.error(`Invalid timestamp or value at index ${index}:`, { timestamp, value, parsedTimestamp, parsedValue });
                        throw new Error(`Invalid timestamp or value at line ${index}: ${line}`);
                    }
                    
                    return {
                        x: parsedTimestamp,
                        y: parsedValue
                    };
                });
                console.log('📊 Parsed data points:', parsedData.length);
                return parsedData;
            }
        }
        
        // Try alternative data structure
        if (results.processed_data && results.processed_data.length > 0) {
            console.log('📊 Using processed data:', results.processed_data.length, 'points');
            return results.processed_data.map(point => ({
                x: new Date(point.time).getTime(),
                y: point.value
            }));
        }
        
        // Try to find data in other possible locations
        if (results.data && results.data.length > 0) {
            console.log('📊 Using results.data:', results.data.length, 'points');
            return results.data.map(point => ({
                x: new Date(point.time || point.timestamp).getTime(),
                y: point.value
            }));
        }
        
        // Try metadata or any array with time/value pairs
        const possibleDataArrays = Object.values(results).filter(val => 
            Array.isArray(val) && val.length > 0 && 
            val[0] && (val[0].time || val[0].timestamp) && val[0].value !== undefined
        );
        
        if (possibleDataArrays.length > 0) {
            const dataArray = possibleDataArrays[0];
            console.log('📊 Using discovered data array:', dataArray.length, 'points');
            return dataArray.map(point => ({
                x: new Date(point.time || point.timestamp).getTime(),
                y: point.value
            }));
        }
        
        console.error('❌ No actual data found in analysis results');
        console.error('📊 Available keys in results:', Object.keys(results));
        throw new Error('No time series data available for visualization. Expected timeSeriesData, processed_data, or data array.');
    },

    // Utility methods

    generateTrendDataForChart(results) {
        const data = this.getActualDataPoints(results);
        
        // Calculate simple trend lines
        const shortTrendStart = data.length - 24; // Last 24 hours
        const shortTrend = this.calculateTrendLine(data.slice(shortTrendStart));
        const longTrend = this.calculateTrendLine(data);
        
        return {
            data,
            shortTrend: shortTrend ? [
                { x: data[shortTrendStart].x, y: shortTrend.start },
                { x: data[data.length - 1].x, y: shortTrend.end }
            ] : null,
            longTrend: longTrend ? [
                { x: data[0].x, y: longTrend.start },
                { x: data[data.length - 1].x, y: longTrend.end }
            ] : null
        };
    },

    calculateTrendLine(points) {
        if (points.length < 2) return null;
        
        const n = points.length;
        const sumX = points.reduce((sum, p, i) => sum + i, 0);
        const sumY = points.reduce((sum, p) => sum + p.y, 0);
        const sumXY = points.reduce((sum, p, i) => sum + i * p.y, 0);
        const sumXX = points.reduce((sum, p, i) => sum + i * i, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return {
            start: intercept,
            end: intercept + slope * (n - 1)
        };
    },

    // Find the index for a timestamp in linear scale mode
    findIndexForTimestamp(timestamp, dataPoints) {
        // Find the closest data point by timestamp
        let closestIndex = 0;
        let minDiff = Infinity;
        
        for (let i = 0; i < dataPoints.length; i++) {
            const dataPointTime = dataPoints[i].originalTimestamp || dataPoints[i].x;
            const diff = Math.abs(timestamp - dataPointTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }
        
        console.log(`📍 Finding index for timestamp ${timestamp}: found index ${closestIndex}`);
        return closestIndex;
    },

    isAnomalyPoint(point, anomalies) {
        const pointTime = point.originalTimestamp || point.x;
        return anomalies.some(a => 
            Math.abs(new Date(a.timestamp).getTime() - pointTime) < 60000 // Within 1 minute
        );
    },

    formatPattern(pattern) {
        return pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    // Additional methods for other analysis types
    populateForecastInfo(results) {
        const container = document.getElementById('forecastInfo');
        if (!container || !results.forecast_metadata) return;

        const metadata = results.forecast_metadata;
        
        const html = `
            <div class="forecast-info-grid">
                <div class="info-item">
                    <label>Model Type:</label>
                    <span>${metadata.model_type || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <label>Reliability:</label>
                    <span>${Math.round((metadata.reliability_score || 0) * 100)}%</span>
                </div>
                <div class="info-item">
                    <label>Accuracy:</label>
                    <span>${metadata.forecast_accuracy_estimate || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <label>Key Patterns:</label>
                    <span>${(metadata.key_patterns || []).join(', ') || 'None detected'}</span>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },

    createPredictionTable(results) {
        const container = document.getElementById('predictionTable');
        if (!container) return;

        const predictions = results.predictions || [];
        
        if (predictions.length === 0) {
            container.innerHTML = '<div class="empty-state">No predictions available</div>';
            return;
        }

        let html = `
            <table class="prediction-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Predicted Value</th>
                        <th>80% Confidence</th>
                        <th>95% Confidence</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        predictions.slice(0, 10).forEach(pred => {
            const time = new Date(pred.timestamp).toLocaleString();
            html += `
                <tr>
                    <td>${time}</td>
                    <td><strong>${pred.predicted_value.toFixed(2)}</strong></td>
                    <td>${pred.confidence_80_lower.toFixed(1)} - ${pred.confidence_80_upper.toFixed(1)}</td>
                    <td>${pred.confidence_95_lower.toFixed(1)} - ${pred.confidence_95_upper.toFixed(1)}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        
        if (predictions.length > 10) {
            html += `<div class="show-more">... and ${predictions.length - 10} more predictions</div>`;
        }
        
        container.innerHTML = html;
    },

    populatePredictionInsights(results) {
        const container = document.getElementById('predictionInsights');
        if (!container) return;

        const recommendations = results.recommendations || [];
        const uncertaintyFactors = results.forecast_metadata?.uncertainty_factors || [];
        
        let html = '';
        
        if (recommendations.length > 0) {
            html += '<div class="recommendations-section"><h6>Recommendations:</h6><ul>';
            recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            html += '</ul></div>';
        }
        
        if (uncertaintyFactors.length > 0) {
            html += '<div class="uncertainty-section"><h6>Uncertainty Factors:</h6><ul>';
            uncertaintyFactors.forEach(factor => {
                html += `<li>${this.formatPattern(factor)}</li>`;
            });
            html += '</ul></div>';
        }
        
        container.innerHTML = html || '<div class="empty-state">No specific recommendations available</div>';
    },

    populateTrendSummary(results) {
        const container = document.getElementById('trendSummary');
        if (!container) return;

        const trends = results.trends || {};
        
        let html = '<div class="trend-grid">';
        
        ['short_term', 'medium_term', 'long_term'].forEach(term => {
            const trend = trends[term];
            if (trend) {
                const termLabel = term.replace('_', '-').replace(/\b\w/g, l => l.toUpperCase());
                html += `
                    <div class="trend-item">
                        <h6>${termLabel}</h6>
                        <div class="trend-direction ${trend.direction}">${trend.direction}</div>
                        <div class="trend-strength">Strength: ${(trend.strength * 100).toFixed(0)}%</div>
                        <div class="trend-significance">Significance: ${trend.significance}</div>
                        ${trend.change_rate ? `<div class="trend-rate">Rate: ${trend.change_rate}</div>` : ''}
                    </div>
                `;
            }
        });
        
        html += '</div>';
        container.innerHTML = html;
    },

    populateSeasonalityInfo(results) {
        const container = document.getElementById('seasonalityInfo');
        if (!container) return;

        const seasonality = results.seasonality || {};
        
        let html = '<div class="seasonality-grid">';
        
        Object.entries(seasonality).forEach(([period, info]) => {
            if (info.detected) {
                html += `
                    <div class="seasonality-item">
                        <h6>${period.charAt(0).toUpperCase() + period.slice(1)} Pattern</h6>
                        <div class="seasonality-strength">Strength: ${(info.strength * 100).toFixed(0)}%</div>
                        <div class="seasonality-description">${info.pattern_description}</div>
                        ${info.peak_hours ? `<div class="seasonality-peaks">Peak hours: ${info.peak_hours.join(', ')}</div>` : ''}
                        ${info.peak_days ? `<div class="seasonality-peaks">Peak days: ${info.peak_days.join(', ')}</div>` : ''}
                    </div>
                `;
            }
        });
        
        html += '</div>';
        
        if (html === '<div class="seasonality-grid"></div>') {
            html = '<div class="empty-state">No significant seasonal patterns detected</div>';
        }
        
        container.innerHTML = html;
    },

    populateTrendInsights(results) {
        const container = document.getElementById('trendInsights');
        if (!container) return;

        const insights = results.insights || [];
        const recommendations = results.recommendations || [];
        
        let html = '';
        
        if (insights.length > 0) {
            html += '<div class="insights-section"><h6>Key Insights:</h6><ul>';
            insights.forEach(insight => {
                html += `<li>${insight}</li>`;
            });
            html += '</ul></div>';
        }
        
        if (recommendations.length > 0) {
            html += '<div class="recommendations-section"><h6>Recommendations:</h6><ul>';
            recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            html += '</ul></div>';
        }
        
        container.innerHTML = html || '<div class="empty-state">No specific insights available</div>';
    },

    // Add export controls
    addExportControls(container, results) {
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-controls';
        exportContainer.innerHTML = `
            <div class="export-buttons">
                <button onclick="AnalyticsVisualizer.exportToJSON('${results.metadata?.analysis_type}')" class="export-btn">
                    📄 Export JSON
                </button>
                <button onclick="AnalyticsVisualizer.exportToCSV('${results.metadata?.analysis_type}')" class="export-btn">
                    📊 Export CSV
                </button>
                <button onclick="AnalyticsVisualizer.exportChart('${results.metadata?.analysis_type}')" class="export-btn">
                    📈 Export Chart
                </button>
            </div>
        `;
        
        container.appendChild(exportContainer);
    },

    // Export methods
    exportToJSON(analysisType) {
        // Implementation would export current results to JSON
        console.log('Exporting to JSON:', analysisType);
    },

    exportToCSV(analysisType) {
        // Implementation would export current results to CSV
        console.log('Exporting to CSV:', analysisType);
    },

    exportChart(analysisType) {
        // Implementation would export current chart as image
        console.log('Exporting chart:', analysisType);
    },

    // Check if Chart.js time adapter is available
    isTimeAdapterAvailable() {
        try {
            // Try multiple ways to detect time scale availability
            const hasTimeInRegistry = !!(Chart.registry && Chart.registry.scales && Chart.registry.scales.time);
            const hasTimeScale = !!(Chart.defaults && Chart.defaults.scales && Chart.defaults.scales.time);
            const hasDateAdapter = !!Chart._adapters;
            
            console.log('📊 Time adapter check:', { 
                hasTimeInRegistry, 
                hasTimeScale, 
                hasDateAdapter,
                registry: !!Chart.registry,
                adapters: !!Chart._adapters
            });
            
            // Force time scale to true for now since we have the adapter loaded
            console.log('📊 Forcing time scale to true - adapter should be available');
            return true;
        } catch (error) {
            console.warn('Time adapter not available, falling back to linear scale:', error);
            return false;
        }
    },

    // Convert data for category scale (like working query results charts)
    convertDataForCategoryScale(data) {
        // Create time labels - for multi-day analysis, always show date + time for clarity
        const timeLabels = data.map(point => {
            const date = new Date(point.x);
            
            // For data spanning multiple days, always include date and time
            const dataSpanDays = (data[data.length - 1].x - data[0].x) / (1000 * 60 * 60 * 24);
            
            if (dataSpanDays > 1) {
                // Multi-day data: show "Jul 15 12:30" format
                // Use UTC methods to avoid timezone issues
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = months[date.getUTCMonth()];
                const day = date.getUTCDate();
                const hours = date.getUTCHours().toString().padStart(2, '0');
                const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                return `${month} ${day} ${hours}:${minutes}`;
            } else {
                // Single day data: show just time
                const hours = date.getUTCHours().toString().padStart(2, '0');
                const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}`;
            }
        });
        
        // Convert data to use index-based positioning
        const processedDataPoints = data.map((point, index) => ({
            x: index,
            y: point.y,
            originalTimestamp: point.x
        }));
        
        return { processedDataPoints, timeLabels };
    },

    // Convert timestamp to numeric value for linear scale fallback
    convertDataForLinearScale(data) {
        return data.map((point, index) => ({
            x: index, // Use index instead of timestamp
            y: point.y,
            originalTimestamp: point.x
        }));
    },

    // Utility methods
    clearContainer(container) {
        // Clean up any existing chart instances
        Object.values(this.chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.chartInstances = {};
        
        container.innerHTML = '';
    },

    showError(container, message) {
        container.innerHTML = `
            <div class="analysis-error">
                <h4>❌ Visualization Error</h4>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">Retry</button>
            </div>
        `;
    },

    visualizeGenericResults(results, container) {
        container.innerHTML = `
            <div class="analysis-results-header">
                <h4>📊 Analysis Results</h4>
            </div>
            <div class="generic-results">
                <pre>${JSON.stringify(results, null, 2)}</pre>
            </div>
        `;
    },

    // Toggle log scale for chart Y-axis
    toggleLogScale(chartId) {
        const chart = this.chartInstances[chartId];
        if (!chart) {
            console.error(`Chart instance not found for ID: ${chartId}`);
            return;
        }

        const isLogScale = chart.options.scales.y.type === 'logarithmic';
        const newScale = isLogScale ? 'linear' : 'logarithmic';
        
        console.log(`🔄 Toggling ${chartId} Y-axis scale: ${isLogScale ? 'log' : 'linear'} → ${newScale}`);
        
        // Store original data if not already stored
        if (!chart.originalData) {
            chart.originalData = chart.data.datasets.map(dataset => ({
                ...dataset,
                data: [...dataset.data]
            }));
        }
        
        // Update the scale type
        chart.options.scales.y.type = newScale;
        
        if (newScale === 'logarithmic') {
            // Transform data to handle zero and negative values
            chart.data.datasets.forEach((dataset, i) => {
                if (dataset.data) {
                    dataset.data = dataset.data.map(point => {
                        if (point !== null && point !== undefined) {
                            // For zero or negative values, use a small positive value (0.1)
                            return point <= 0 ? 0.1 : point;
                        }
                        return point;
                    });
                }
            });
            
            // Set minimum value to avoid log(0) issues
            chart.options.scales.y.min = 0.1;
            chart.options.scales.y.ticks = {
                ...chart.options.scales.y.ticks,
                callback: function(value) {
                    if (value === 0.1) return '0';
                    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                    if (value >= 1) return value.toFixed(0);
                    return value.toFixed(1);
                }
            };
        } else {
            // Restore original data
            chart.originalData.forEach((originalDataset, i) => {
                if (chart.data.datasets[i]) {
                    chart.data.datasets[i].data = [...originalDataset.data];
                }
            });
            
            // Reset to linear scale defaults
            delete chart.options.scales.y.min;
            chart.options.scales.y.ticks = {
                ...chart.options.scales.y.ticks,
                callback: function(value) {
                    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                    return value.toFixed(0);
                }
            };
        }
        
        // Update the chart
        chart.update();
    }
};

// Export for use in other modules
window.AnalyticsVisualizer = AnalyticsVisualizer;