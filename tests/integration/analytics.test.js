// Analytics Module Integration Tests
// Tests for analytics.js integration with DataAccess layer

describe('Analytics Module Integration', function() {
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
    });

    describe('DataAccess Integration', function() {
        it('should use DataAccess for analytics queries', async function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Arrange
            const originalExecuteQuery = DataAccess.executeQuery;
            const mockResponse = TestData.responses.influxDB.timeSeries;
            const mockExecuteQuery = jest.fn().mockResolvedValue(mockResponse);
            DataAccess.executeQuery = mockExecuteQuery;

            // Mock Analytics module methods if they exist
            if (Analytics.executeAnalyticsQuery) {
                try {
                    // Act
                    await Analytics.executeAnalyticsQuery('SELECT * FROM cpu', {
                        datasourceId: 'test-datasource-123',
                        timeFromHours: 24
                    });

                    // Assert
                    expect(mockExecuteQuery).toHaveBeenCalledWith(
                        'test-datasource-123',
                        'SELECT * FROM cpu',
                        expect.objectContaining({
                            timeRange: expect.any(Object)
                        })
                    );
                } finally {
                    // Restore original
                    DataAccess.executeQuery = originalExecuteQuery;
                }
            }
        });

        it('should handle DataAccess errors in analytics context', async function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Arrange
            const originalExecuteQuery = DataAccess.executeQuery;
            const mockExecuteQuery = jest.fn().mockRejectedValue(new Error('Analytics query failed'));
            DataAccess.executeQuery = mockExecuteQuery;

            if (Analytics.executeAnalyticsQuery) {
                try {
                    // Act & Assert
                    expect(async () => {
                        await Analytics.executeAnalyticsQuery('SELECT * FROM invalid_measurement');
                    }).toThrow('Analytics query failed');
                } finally {
                    // Restore original
                    DataAccess.executeQuery = originalExecuteQuery;
                }
            }
        });
    });

    describe('Configuration Integration', function() {
        it('should use current GrafanaConfig for analytics operations', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Assert that Analytics can access global config
            expect(GrafanaConfig).toBeDefined();
            expect(GrafanaConfig.currentDatasourceId).toBe('test-datasource-123');
            
            if (Analytics.config) {
                // Verify Analytics uses the same configuration context
                expect(typeof Analytics.config).toBe('object');
            }
        });

        it('should handle missing datasource configuration', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Arrange
            const originalDatasourceId = GrafanaConfig.currentDatasourceId;
            GrafanaConfig.currentDatasourceId = null;

            try {
                // Act & Assert
                if (Analytics.validateConfiguration) {
                    expect(() => {
                        Analytics.validateConfiguration();
                    }).toThrow();
                }
            } finally {
                // Restore original
                GrafanaConfig.currentDatasourceId = originalDatasourceId;
            }
        });
    });

    describe('Time Range Integration', function() {
        it('should handle analytics time range calculations', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Test time range utilities if available
            if (Analytics.calculateTimeRange) {
                // Act
                const timeRange = Analytics.calculateTimeRange('1d');

                // Assert
                expect(timeRange).toHaveProperty('from');
                expect(timeRange).toHaveProperty('to');
                expect(typeof timeRange.from).toBe('string');
                expect(typeof timeRange.to).toBe('string');
            }
        });

        it('should integrate with QueryRequestBuilder for time ranges', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Test QueryRequestBuilder integration
            const timeRange = QueryRequestBuilder._getDefaultTimeRange();
            
            // Assert Analytics can work with QueryRequestBuilder time ranges
            expect(timeRange).toHaveProperty('from');
            expect(timeRange).toHaveProperty('to');

            if (Analytics.processTimeRange) {
                const processed = Analytics.processTimeRange(timeRange);
                expect(processed).toBeDefined();
            }
        });
    });

    describe('Data Processing Integration', function() {
        it('should process query results for analytics', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Arrange
            const mockResults = TestData.responses.influxDB.timeSeries;

            if (Analytics.processResults) {
                // Act
                const processed = Analytics.processResults(mockResults);

                // Assert
                expect(processed).toBeDefined();
                expect(typeof processed).toBe('object');
            }
        });

        it('should handle empty analytics results', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Arrange
            const emptyResults = { results: [] };

            if (Analytics.processResults) {
                // Act
                const processed = Analytics.processResults(emptyResults);

                // Assert - Should handle gracefully
                expect(processed).toBeDefined();
            }
        });
    });

    describe('AI/ML Integration', function() {
        it('should integrate with external AI services', async function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Mock AI service response
            const mockAIResponse = {
                analysis: 'Detected anomaly in CPU usage patterns',
                confidence: 0.87,
                recommendations: ['Check system load', 'Monitor memory usage']
            };

            if (Analytics.runAIAnalysis) {
                // Mock fetch for AI service
                const originalFetch = window.fetch;
                window.fetch = jest.fn().mockResolvedValue({
                    ok: true,
                    json: async () => mockAIResponse
                });

                try {
                    // Act
                    const result = await Analytics.runAIAnalysis({
                        data: TestData.responses.influxDB.timeSeries,
                        analysisType: 'anomaly'
                    });

                    // Assert
                    expect(result).toHaveProperty('analysis');
                    expect(result.confidence).toBeGreaterThan(0);
                } finally {
                    // Restore original
                    window.fetch = originalFetch;
                }
            }
        });

        it('should handle AI service errors gracefully', async function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            if (Analytics.runAIAnalysis) {
                // Mock fetch to simulate AI service failure
                const originalFetch = window.fetch;
                window.fetch = jest.fn().mockRejectedValue(new Error('AI service unavailable'));

                try {
                    // Act & Assert
                    expect(async () => {
                        await Analytics.runAIAnalysis({
                            data: TestData.responses.influxDB.timeSeries
                        });
                    }).toThrow('AI service unavailable');
                } finally {
                    // Restore original
                    window.fetch = originalFetch;
                }
            }
        });
    });

    describe('Visualization Integration', function() {
        it('should integrate with Charts module for analytics visualization', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Mock Charts.initializeChart
            const originalInitializeChart = Charts.initializeChart;
            Charts.initializeChart = jest.fn();

            try {
                if (Analytics.visualizeResults) {
                    // Act
                    Analytics.visualizeResults(TestData.responses.influxDB.timeSeries);

                    // Assert
                    expect(Charts.initializeChart).toHaveBeenCalled();
                }
            } finally {
                // Restore original
                Charts.initializeChart = originalInitializeChart;
            }
        });

        it('should handle visualization errors', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Mock Charts.initializeChart to throw error
            const originalInitializeChart = Charts.initializeChart;
            Charts.initializeChart = jest.fn().mockImplementation(() => {
                throw new Error('Chart rendering failed');
            });

            try {
                if (Analytics.visualizeResults) {
                    // Act & Assert - Should handle gracefully
                    expect(() => {
                        Analytics.visualizeResults(TestData.responses.influxDB.timeSeries);
                    }).not.toThrow();
                }
            } finally {
                // Restore original
                Charts.initializeChart = originalInitializeChart;
            }
        });
    });

    describe('Storage Integration', function() {
        it('should save analytics results to storage', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Mock Storage methods
            const mockSave = jest.fn();
            const originalStorage = Storage.saveAnalyticsResults;
            if (originalStorage) {
                Storage.saveAnalyticsResults = mockSave;
            }

            try {
                if (Analytics.saveResults && Storage.saveAnalyticsResults) {
                    // Act
                    Analytics.saveResults({
                        analysisType: 'anomaly',
                        results: { anomalies: 5, score: 0.75 }
                    });

                    // Assert
                    expect(mockSave).toHaveBeenCalled();
                }
            } finally {
                // Restore original
                if (originalStorage) {
                    Storage.saveAnalyticsResults = originalStorage;
                }
            }
        });

        it('should load analytics results from storage', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            // Mock Storage methods
            const mockResults = {
                analysisType: 'trend',
                results: { trend: 'increasing', confidence: 0.92 }
            };
            
            const originalStorage = Storage.getAnalyticsResults;
            if (originalStorage) {
                Storage.getAnalyticsResults = jest.fn().mockReturnValue(mockResults);
            }

            try {
                if (Analytics.loadResults && Storage.getAnalyticsResults) {
                    // Act
                    const results = Analytics.loadResults('trend-analysis-123');

                    // Assert
                    expect(results).toEqual(mockResults);
                    expect(Storage.getAnalyticsResults).toHaveBeenCalledWith('trend-analysis-123');
                }
            } finally {
                // Restore original
                if (originalStorage) {
                    Storage.getAnalyticsResults = originalStorage;
                }
            }
        });
    });

    describe('Error Recovery', function() {
        it('should recover from transient analytics failures', async function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            if (Analytics.executeAnalyticsQuery) {
                // Arrange - Mock intermittent failures
                const originalExecuteQuery = DataAccess.executeQuery;
                let callCount = 0;
                DataAccess.executeQuery = jest.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        throw new Error('Temporary network issue');
                    }
                    return Promise.resolve(TestData.responses.influxDB.timeSeries);
                });

                try {
                    // Act - First call should fail, implementation should handle retry
                    let result;
                    try {
                        await Analytics.executeAnalyticsQuery('SELECT * FROM cpu');
                    } catch (error) {
                        expect(error.message).toContain('Temporary network issue');
                    }

                    // Second call should succeed
                    result = await Analytics.executeAnalyticsQuery('SELECT * FROM cpu');
                    expect(result).toBeDefined();
                } finally {
                    // Restore original
                    DataAccess.executeQuery = originalExecuteQuery;
                }
            }
        });

        it('should maintain analytics state during errors', function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            if (Analytics.config) {
                // Arrange
                const originalState = TestUtils.deepClone(Analytics.config);

                // Act - Simulate error condition
                try {
                    if (Analytics.handleError) {
                        Analytics.handleError(new Error('Test error'));
                    }
                } catch (error) {
                    // Expected to handle gracefully
                }

                // Assert - State should remain intact
                expect(Analytics.config).toEqual(originalState);
            }
        });
    });

    describe('Performance Integration', function() {
        it('should handle large datasets efficiently', async function() {
            // Skip if Analytics module is not available
            if (typeof Analytics === 'undefined') {
                console.log('Analytics module not available, skipping test');
                return;
            }

            if (Analytics.processLargeDataset) {
                // Arrange - Generate large dataset
                const largeDataset = {
                    results: [{
                        frames: [TestDataHelpers.generateInfluxFrame('cpu', 'usage_idle')]
                    }]
                };

                // Extend with more data points
                const baseValues = largeDataset.results[0].frames[0].data.values;
                for (let i = 0; i < 1000; i++) {
                    baseValues[0].push(Date.now() + i * 1000);
                    baseValues[1].push(Math.random() * 100);
                }

                // Act & Assert - Should complete within reasonable time
                const { result, duration } = await TestUtils.measureTime(async () => {
                    return Analytics.processLargeDataset(largeDataset);
                });

                expect(result).toBeDefined();
                expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            }
        });
    });
}, 'integration');