// AI Analysis Integration Tests
// Tests for AI analysis integration with query execution

describe('AI Analysis - runAnomalyDetection', function() {
    let cleanupConfig, cleanupDOM, cleanupFetch, cleanupElectron;
    let mockResults, mockQuery;
    
    beforeEach(function() {
        // Setup clean test environment
        setupTest();
        cleanupConfig = TestUtils.mockGrafanaConfig();
        cleanupDOM = TestUtils.setupTestDOM();
        cleanupFetch = TestUtils.mockFetch(MockResponses);
        cleanupElectron = TestUtils.mockElectronAPI(MockResponses);
        
        // Set up test data
        mockQuery = 'SELECT mean("value") FROM "cpu" WHERE time > now() - 1h GROUP BY time(1m)';
        mockResults = {
            results: {
                A: {
                    frames: [{
                        schema: {
                            fields: [
                                { name: 'time', type: 'time' },
                                { name: 'value', type: 'number' }
                            ]
                        },
                        data: {
                            values: [
                                [1609459200000, 1609459260000, 1609459320000],
                                [10.5, 12.3, 11.8]
                            ]
                        }
                    }]
                }
            }
        };
        
        // Set up AIAnalytics module
        global.AIAnalytics = {
            executeAnalysis: jest.fn().mockResolvedValue({
                success: true,
                analysisType: 'anomaly',
                results: {
                    anomalies: [
                        { timestamp: '2021-01-01T00:01:00Z', value: 12.3, severity: 'high' }
                    ],
                    statistics: {
                        mean: 11.53,
                        stdDev: 0.9,
                        anomalyCount: 1
                    }
                }
            }),
            extractDataFromResults: jest.fn().mockReturnValue([
                { timestamp: '2021-01-01T00:00:00Z', value: 10.5 },
                { timestamp: '2021-01-01T00:01:00Z', value: 12.3 },
                { timestamp: '2021-01-01T00:02:00Z', value: 11.8 }
            ]),
            inferMetricType: jest.fn().mockReturnValue('Time series metric')
        };
        
        // Set up Interface module
        global.Interface = {
            runAnomalyDetection: async function(results, query) {
                if (typeof AIAnalytics !== 'undefined' && AIAnalytics.executeAnalysis) {
                    const timeFromHours = parseFloat(document.getElementById('timeFrom')?.value) || 1;
                    const timeRange = timeFromHours <= 1 ? '1h' : timeFromHours <= 24 ? `${Math.round(timeFromHours)}h` : `${Math.round(timeFromHours/24)}d`;
                    
                    return await AIAnalytics.executeAnalysis({
                        analysisType: 'anomaly',
                        sensitivity: 'medium',
                        alertThreshold: 0.8,
                        timeRange: timeRange,
                        existingResults: results,
                        query: query
                    });
                }
                throw new Error('AI Analytics not available');
            }
        };
        
        // Add time range input to DOM
        const timeFromInput = document.createElement('input');
        timeFromInput.id = 'timeFrom';
        timeFromInput.value = '1';
        document.body.appendChild(timeFromInput);
    });
    
    afterEach(function() {
        // Cleanup after each test
        if (cleanupConfig) cleanupConfig();
        if (cleanupDOM) cleanupDOM();
        if (cleanupFetch) cleanupFetch();
        if (cleanupElectron) cleanupElectron();
        cleanupTest();
        
        // Clean up global mocks
        delete global.AIAnalytics;
        delete global.Interface;
    });
    
    it('should execute anomaly detection with existing results', async function() {
        // Execute anomaly detection
        const result = await Interface.runAnomalyDetection(mockResults, mockQuery);
        
        // Verify AIAnalytics.executeAnalysis was called correctly
        expect(AIAnalytics.executeAnalysis).toHaveBeenCalledWith({
            analysisType: 'anomaly',
            sensitivity: 'medium',
            alertThreshold: 0.8,
            timeRange: '1h',
            existingResults: mockResults,
            query: mockQuery
        });
        
        // Verify result
        expect(result.success).toBe(true);
        expect(result.analysisType).toBe('anomaly');
        expect(result.results.anomalies).toHaveLength(1);
    });
    
    it('should calculate correct time range from hours', async function() {
        // Test 1 hour
        document.getElementById('timeFrom').value = '1';
        await Interface.runAnomalyDetection(mockResults, mockQuery);
        const call1 = AIAnalytics.executeAnalysis.mock.calls[AIAnalytics.executeAnalysis.mock.calls.length - 1][0];
        expect(call1.timeRange).toBe('1h');
        
        // Reset mock
        AIAnalytics.executeAnalysis.mockClear();
        
        // Test 6 hours
        document.getElementById('timeFrom').value = '6';
        await Interface.runAnomalyDetection(mockResults, mockQuery);
        const call2 = AIAnalytics.executeAnalysis.mock.calls[AIAnalytics.executeAnalysis.mock.calls.length - 1][0];
        expect(call2.timeRange).toBe('6h');
        
        // Reset mock
        AIAnalytics.executeAnalysis.mockClear();
        
        // Test 48 hours (2 days)
        document.getElementById('timeFrom').value = '48';
        await Interface.runAnomalyDetection(mockResults, mockQuery);
        const call3 = AIAnalytics.executeAnalysis.mock.calls[AIAnalytics.executeAnalysis.mock.calls.length - 1][0];
        expect(call3.timeRange).toBe('2d');
    });
    
    it('should pass query and existing results to executeAnalysis', async function() {
        await Interface.runAnomalyDetection(mockResults, mockQuery);
        
        const callArgs = AIAnalytics.executeAnalysis.mock.calls[0][0];
        expect(callArgs.existingResults).toBe(mockResults);
        expect(callArgs.query).toBe(mockQuery);
        expect(callArgs.analysisType).toBe('anomaly');
    });
    
    it('should handle missing AIAnalytics module gracefully', async function() {
        // Remove AIAnalytics
        delete global.AIAnalytics;
        
        // Should throw error
        let errorThrown = false;
        let errorMessage = '';
        try {
            await Interface.runAnomalyDetection(mockResults, mockQuery);
        } catch (error) {
            errorThrown = true;
            errorMessage = error.message;
        }
        
        expect(errorThrown).toBe(true);
        expect(errorMessage).toBe('AI Analytics not available');
    });
});

describe('AI Analysis - inferMetricType', function() {
    beforeEach(function() {
        setupTest();
        
        // Set up AIAnalytics with inferMetricType function
        global.AIAnalytics = {
            inferMetricType: function(fieldName) {
                if (!fieldName) {
                    return 'Time series metric';
                }
                const lowerField = fieldName.toLowerCase();
                if (lowerField.includes('cpu')) return 'CPU usage';
                if (lowerField.includes('memory')) return 'Memory usage';
                if (lowerField.includes('disk')) return 'Disk usage';
                return 'Time series metric';
            }
        };
    });
    
    afterEach(function() {
        cleanupTest();
        delete global.AIAnalytics;
    });
    
    it('should handle undefined field names', function() {
        const result = AIAnalytics.inferMetricType(undefined);
        expect(result).toBe('Time series metric');
    });
    
    it('should handle null field names', function() {
        const result = AIAnalytics.inferMetricType(null);
        expect(result).toBe('Time series metric');
    });
    
    it('should handle empty string field names', function() {
        const result = AIAnalytics.inferMetricType('');
        expect(result).toBe('Time series metric');
    });
    
    it('should infer CPU metrics', function() {
        const result = AIAnalytics.inferMetricType('cpu_usage');
        expect(result).toBe('CPU usage');
    });
    
    it('should infer memory metrics', function() {
        const result = AIAnalytics.inferMetricType('memory_free');
        expect(result).toBe('Memory usage');
    });
    
    it('should infer disk metrics', function() {
        const result = AIAnalytics.inferMetricType('disk_io');
        expect(result).toBe('Disk usage');
    });
});

describe('AI Analysis - extractDataFromResults', function() {
    let mockResults;
    
    beforeEach(function() {
        setupTest();
        
        mockResults = {
            results: {
                A: {
                    frames: [{
                        schema: {
                            fields: [
                                { name: 'time', type: 'time' },
                                { name: 'value', type: 'number' }
                            ]
                        },
                        data: {
                            values: [
                                [1609459200000, 1609459260000, 1609459320000],
                                [10.5, 12.3, 11.8]
                            ]
                        }
                    }]
                }
            }
        };
        
        // Set up the actual extractDataFromResults function
        global.AIAnalytics = {
            extractDataFromResults: function(results) {
                const extractedData = [];
                
                if (results.results && results.results.A && results.results.A.frames) {
                    const frames = results.results.A.frames;
                    
                    frames.forEach(frame => {
                        if (frame.data && frame.data.values && frame.data.values.length >= 2) {
                            const timeValues = frame.data.values[0];
                            const metricValues = frame.data.values[1];
                            
                            for (let i = 0; i < timeValues.length; i++) {
                                extractedData.push({
                                    timestamp: new Date(timeValues[i]).toISOString(),
                                    value: parseFloat(metricValues[i])
                                });
                            }
                        }
                    });
                }
                
                return extractedData;
            }
        };
    });
    
    afterEach(function() {
        cleanupTest();
        delete global.AIAnalytics;
    });
    
    it('should extract data from Grafana query results', function() {
        const extractedData = AIAnalytics.extractDataFromResults(mockResults);
        
        expect(extractedData).toHaveLength(3);
        expect(extractedData[0].value).toBe(10.5);
        expect(extractedData[1].value).toBe(12.3);
        expect(extractedData[2].value).toBe(11.8);
    });
    
    it('should handle empty results', function() {
        const emptyResults = { results: { A: { frames: [] } } };
        const extractedData = AIAnalytics.extractDataFromResults(emptyResults);
        
        expect(extractedData).toHaveLength(0);
    });
    
    it('should handle missing frames', function() {
        const noFramesResults = { results: { A: {} } };
        const extractedData = AIAnalytics.extractDataFromResults(noFramesResults);
        
        expect(extractedData).toHaveLength(0);
    });
    
    it('should handle malformed data structure', function() {
        const malformedResults = { results: {} };
        const extractedData = AIAnalytics.extractDataFromResults(malformedResults);
        
        expect(extractedData).toHaveLength(0);
    });
});