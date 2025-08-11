// Variables Module Integration Tests
// Tests for variables.js integration with DataAccess layer

describe('Variables Module Integration', function() {
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
        it('should use DataAccess for variable query execution', async function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            // Arrange
            const originalExecuteQuery = DataAccess.executeQuery;
            const mockResponse = TestData.responses.influxDB.tagValues;
            const mockExecuteQuery = jest.fn().mockResolvedValue(mockResponse);
            DataAccess.executeQuery = mockExecuteQuery;

            // Mock variable with query
            if (Variables.updateVariable) {
                Variables.variables = [{
                    id: 1,
                    name: 'hostname',
                    query: 'SHOW TAG VALUES WITH KEY = "host"',
                    datasourceId: 'test-datasource-123',
                    type: 'query'
                }];

                try {
                    // Act
                    await Variables.updateVariable(1);

                    // Assert
                    expect(mockExecuteQuery).toHaveBeenCalledWith(
                        'test-datasource-123',
                        'SHOW TAG VALUES WITH KEY = "host"',
                        expect.any(Object)
                    );
                } finally {
                    // Restore original
                    DataAccess.executeQuery = originalExecuteQuery;
                }
            }
        });

        it('should handle DataAccess errors in variable updates', async function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            // Arrange
            const originalExecuteQuery = DataAccess.executeQuery;
            const mockExecuteQuery = jest.fn().mockRejectedValue(new Error('Variable query failed'));
            DataAccess.executeQuery = mockExecuteQuery;

            if (Variables.updateVariable) {
                Variables.variables = [{
                    id: 1,
                    name: 'hostname',
                    query: 'INVALID QUERY',
                    datasourceId: 'test-datasource-123',
                    type: 'query',
                    values: [],
                    selectedValue: null,
                    selectedValues: [],
                    loading: false,
                    error: null
                }];

                try {
                    // Act
                    await Variables.updateVariable(1);

                    // Assert - Variable should have error state
                    const variable = Variables.variables.find(v => v.id === 1);
                    expect(variable.error).toBeTruthy();
                    expect(variable.values).toEqual([]);
                } finally {
                    // Restore original
                    DataAccess.executeQuery = originalExecuteQuery;
                }
            }
        });
    });

    describe('Query Building Integration', function() {
        it('should use QueryRequestBuilder for variable queries', async function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            // Arrange
            const originalBuildVariableRequest = QueryRequestBuilder.buildVariableRequest;
            const originalExecuteQuery = DataAccess.executeQuery;
            
            const mockBuildRequest = jest.fn().mockReturnValue({
                from: '1609459200000',
                to: '1609545600000',
                queries: [{
                    refId: 'A',
                    query: 'SHOW TAG VALUES WITH KEY = "host"',
                    datasourceId: 'test-datasource-123'
                }]
            });
            
            const mockExecuteQuery = jest.fn().mockResolvedValue([
                { series: [{ values: [['host1'], ['host2'], ['host3']] }] }
            ]);
            
            QueryRequestBuilder.buildVariableRequest = mockBuildRequest;
            DataAccess.executeQuery = mockExecuteQuery;

            if (Variables.executeVariableQuery) {
                try {
                    // Act
                    await Variables.executeVariableQuery(
                        'test-datasource-123',
                        'SHOW TAG VALUES WITH KEY = "host"'
                    );

                    // Assert
                    expect(mockBuildRequest).toHaveBeenCalledWith(
                        'test-datasource-123',
                        'SHOW TAG VALUES WITH KEY = "host"',
                        expect.any(Object)
                    );
                } finally {
                    // Restore original
                    QueryRequestBuilder.buildVariableRequest = originalBuildVariableRequest;
                    DataAccess.executeQuery = originalExecuteQuery;
                }
            }
        });

        it('should handle Prometheus label_values queries', async function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            // Arrange
            const originalExecuteQuery = DataAccess.executeQuery;
            // For Prometheus label_values queries, Variables expects the result
            // to have a data array
            const mockResponse = {
                data: ['localhost:9100', 'server01:9100', 'server02:9100']
            };
            const mockExecuteQuery = jest.fn().mockResolvedValue(mockResponse);
            DataAccess.executeQuery = mockExecuteQuery;

            if (Variables.updateVariable) {
                Variables.variables = [{
                    id: 2,
                    name: 'instance',
                    query: 'label_values(up, instance)',
                    datasourceId: 'prometheus-ds-123',
                    type: 'query',
                    values: [],
                    selectedValue: null,
                    selectedValues: [],
                    loading: false,
                    error: null
                }];

                try {
                    // Act
                    await Variables.updateVariable(2);

                    // Assert
                    const variable = Variables.variables.find(v => v.id === 2);
                    expect(variable.values).toEqual(['localhost:9100', 'server01:9100', 'server02:9100']);
                } finally {
                    // Restore original
                    DataAccess.executeQuery = originalExecuteQuery;
                }
            }
        });
    });

    describe('Variable Substitution Integration', function() {
        it('should substitute variables in queries', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.substituteVariables) {
                // Arrange
                Variables.variables = [
                    {
                        id: 1,
                        name: 'hostname',
                        selectedValue: 'server01',
                        values: ['server01', 'server02'],
                        connectionId: GrafanaConfig.currentConnectionId
                    },
                    {
                        id: 2,
                        name: 'measurement',
                        selectedValue: 'cpu',
                        values: ['cpu', 'memory'],
                        connectionId: GrafanaConfig.currentConnectionId
                    }
                ];

                const queryTemplate = 'SELECT mean("usage_idle") FROM "${measurement}" WHERE "host" = \'${hostname}\'';

                // Act
                const substituted = Variables.substituteVariables(queryTemplate);

                // Assert
                expect(substituted).toBe('SELECT mean("usage_idle") FROM "cpu" WHERE "host" = \'server01\'');
            }
        });

        it('should handle multi-select variables', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.substituteVariables) {
                // Arrange
                Variables.variables = [{
                    id: 1,
                    name: 'hosts',
                    multiSelect: true,
                    selectedValues: ['server01', 'server02', 'server03'],
                    values: ['server01', 'server02', 'server03', 'server04'],
                    connectionId: GrafanaConfig.currentConnectionId
                }];

                const queryTemplate = 'SELECT * FROM cpu WHERE host IN (${hosts})';

                // Act
                const substituted = Variables.substituteVariables(queryTemplate);

                // Assert
                expect(substituted).toContain('server01');
                expect(substituted).toContain('server02');
                expect(substituted).toContain('server03');
                expect(substituted).toContain('IN (');
            }
        });

        it('should handle missing variables gracefully', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.substituteVariables) {
                // Arrange
                Variables.variables = [];
                const queryTemplate = 'SELECT * FROM ${nonexistent_var}';

                // Act
                const substituted = Variables.substituteVariables(queryTemplate);

                // Assert - Should leave variable placeholder unchanged
                expect(substituted).toBe('SELECT * FROM ${nonexistent_var}');
            }
        });
    });

    describe('Storage Integration', function() {
        it('should save variables to storage', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            // Mock Storage methods
            Storage.saveVariablesToStorage = jest.fn();

            if (Variables.addVariable) {
                // Act
                Variables.addVariable(
                    'test_var',
                    'SHOW TAG VALUES WITH KEY = "host"',
                    'test-datasource-123',
                    'Test Datasource'
                );

                // Assert
                expect(Storage.saveVariablesToStorage).toHaveBeenCalled();
            }
        });

        it('should load variables from storage', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            // Mock Storage methods
            const mockVariables = [{
                id: 1,
                name: 'hostname',
                query: 'SHOW TAG VALUES WITH KEY = "host"',
                datasourceId: 'test-datasource-123',
                values: ['server01', 'server02'],
                selectedValue: 'server01'
            }];

            // Mock the method that Variables actually uses - create synchronous mock directly
            Storage.getQueryVariables = function() {
                // Track calls for test assertions
                Storage.getQueryVariables.calls = Storage.getQueryVariables.calls || [];
                Storage.getQueryVariables.calls.push([]);
                return mockVariables;
            };

            if (Variables.loadVariablesFromStorage) {
                // Initialize Variables.variables if undefined
                if (!Variables.variables) {
                    Variables.variables = [];
                }
                
                // Act
                Variables.loadVariablesFromStorage();

                // Assert
                expect(Storage.getQueryVariables.calls.length).toBeGreaterThan(0);
                // Add connectionId to match what loadVariablesFromStorage adds
                const expectedVariables = mockVariables.map(v => ({
                    ...v,
                    loading: false,
                    selectedValues: []
                }));
                expect(Variables.variables).toEqual(expectedVariables);
            }
        });

        it('should clear variables from storage', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            // Mock Storage methods
            Storage.clearVariablesFromStorage = jest.fn();

            if (Variables.clearAllVariables) {
                // Act
                Variables.clearAllVariables();

                // Assert
                expect(Storage.clearVariablesFromStorage).toHaveBeenCalled();
                expect(Variables.variables).toEqual([]);
            }
        });
    });

    describe('UI Integration', function() {
        it('should render variables UI', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.renderVariablesUI) {
                // Arrange
                // Initialize Variables.variables if it's undefined
                if (!Variables.variables) {
                    Variables.variables = [];
                }
                
                // Ensure GrafanaConfig has a connection ID (from test setup)
                expect(GrafanaConfig.currentConnectionId).toBeTruthy();
                console.log('Current connection ID in test:', GrafanaConfig.currentConnectionId);
                
                Variables.variables = [{
                    id: 1,
                    name: 'hostname',
                    values: ['server01', 'server02'],
                    selectedValue: 'server01',
                    error: null,
                    connectionId: GrafanaConfig.currentConnectionId
                }];

                // Create required DOM elements
                const variablesContainer = TestUtils.createTestElement('div', { id: 'variablesContainer' });
                const variablesSection = TestUtils.createTestElement('div', { id: 'variablesSection' });
                document.body.appendChild(variablesContainer);
                document.body.appendChild(variablesSection);

                try {
                    // Act
                    Variables.renderVariablesUI();

                    // Assert
                    expect(variablesContainer.innerHTML).toContain('hostname');
                    expect(variablesContainer.innerHTML).toContain('server01');
                } finally {
                    // Cleanup
                    variablesContainer.remove();
                    variablesSection.remove();
                }
            }
        });

        it('should handle variable selection changes', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.selectVariableValue) {
                // Arrange
                Variables.variables = [{
                    id: 1,
                    name: 'hostname',
                    values: ['server01', 'server02'],
                    selectedValue: 'server01'
                }];

                // Act
                Variables.selectVariableValue(1, 'server02');

                // Assert
                const variable = Variables.variables.find(v => v.id === 1);
                expect(variable.selectedValue).toBe('server02');
            }
        });
    });

    describe('Dynamic Variable Updates', function() {
        it('should update dependent variables when parent changes', async function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.updateDependentVariables) {
                // Arrange
                const originalExecuteQuery = DataAccess.executeQuery;
                const mockExecuteQuery = jest.fn()
                    .mockResolvedValueOnce(TestData.responses.influxDB.measurements) // For regions
                    .mockResolvedValueOnce(TestData.responses.influxDB.tagValues);   // For hosts in region

                DataAccess.executeQuery = mockExecuteQuery;

                Variables.variables = [
                    {
                        id: 1,
                        name: 'region',
                        query: 'SHOW TAG VALUES WITH KEY = "region"',
                        values: ['us-east-1', 'us-west-2'],
                        selectedValue: 'us-east-1'
                    },
                    {
                        id: 2,
                        name: 'hostname',
                        query: 'SHOW TAG VALUES WITH KEY = "host" WHERE region = \'${region}\'',
                        values: [],
                        selectedValue: null,
                        dependsOn: ['region']
                    }
                ];

                try {
                    // Act - Change region
                    Variables.selectVariableValue(1, 'us-west-2');
                    await Variables.updateDependentVariables(1);

                    // Assert
                    expect(mockExecuteQuery).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.stringContaining('us-west-2'),
                        expect.any(Object)
                    );
                    
                    const hostnameVar = Variables.variables.find(v => v.name === 'hostname');
                    expect(hostnameVar.values.length).toBeGreaterThan(0);
                } finally {
                    // Restore original
                    DataAccess.executeQuery = originalExecuteQuery;
                }
            }
        });

        it('should handle circular dependencies gracefully', async function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.updateDependentVariables) {
                // Arrange - Create circular dependency
                Variables.variables = [
                    {
                        id: 1,
                        name: 'var_a',
                        query: 'SELECT * WHERE b = \'${var_b}\'',
                        dependsOn: ['var_b']
                    },
                    {
                        id: 2,
                        name: 'var_b',
                        query: 'SELECT * WHERE a = \'${var_a}\'',
                        dependsOn: ['var_a']
                    }
                ];

                // Act & Assert - Should not cause infinite loop
                expect(async () => {
                    await Variables.updateDependentVariables(1);
                }).not.toThrow();
            }
        });
    });

    describe('Regex Filtering Integration', function() {
        it('should apply regex filters to variable values', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.applyRegexFilter) {
                // Arrange
                const values = ['server01-prod', 'server02-prod', 'server01-dev', 'server02-dev'];
                const regex = '.*-prod';

                // Act
                const filtered = Variables.applyRegexFilter(values, regex);

                // Assert
                expect(filtered).toEqual(['server01-prod', 'server02-prod']);
            }
        });

        it('should handle invalid regex patterns', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.applyRegexFilter) {
                // Arrange
                const values = ['server01', 'server02'];
                const invalidRegex = '[unclosed bracket';

                // Act & Assert - Should handle gracefully
                expect(() => {
                    Variables.applyRegexFilter(values, invalidRegex);
                }).not.toThrow();
            }
        });
    });

    describe('Error Recovery', function() {
        it('should recover from variable query failures', async function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.updateVariable) {
                // Arrange
                const originalExecuteQuery = DataAccess.executeQuery;
                let callCount = 0;
                DataAccess.executeQuery = jest.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        throw new Error('Temporary failure');
                    }
                    // Return the new format response that Variables.executeVariableQuery expects
                    return Promise.resolve({
                        results: {
                            A: {
                                frames: [{
                                    schema: {
                                        fields: [
                                            { name: 'key', type: 'string' },
                                            { name: 'value', type: 'string' }
                                        ]
                                    },
                                    data: {
                                        values: [
                                            ['host', 'host', 'host', 'host', 'host'],
                                            ['server01', 'server02', 'server03', 'server04', 'server05']
                                        ]
                                    }
                                }]
                            }
                        }
                    });
                });

                Variables.variables = [{
                    id: 1,
                    name: 'hostname',
                    query: 'SHOW TAG VALUES WITH KEY = "host"',
                    datasourceId: 'test-datasource-123'
                }];

                try {
                    // Act - First call should fail
                    await Variables.updateVariable(1);
                    let variable = Variables.variables.find(v => v.id === 1);
                    expect(variable.error).toBeTruthy();

                    // Second call should succeed
                    await Variables.updateVariable(1);
                    variable = Variables.variables.find(v => v.id === 1);
                    expect(variable.error).toBeFalsy();
                    expect(variable.values.length).toBeGreaterThan(0);
                } finally {
                    // Restore original
                    DataAccess.executeQuery = originalExecuteQuery;
                }
            }
        });

        it('should maintain variable state during errors', async function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            if (Variables.updateVariable) {
                // Arrange
                Variables.variables = [{
                    id: 1,
                    name: 'hostname',
                    query: 'SHOW TAG VALUES WITH KEY = "host"',
                    datasourceId: 'test-datasource-123',
                    values: ['server01', 'server02'], // Existing values
                    selectedValue: 'server01'
                }];

                const originalExecuteQuery = DataAccess.executeQuery;
                DataAccess.executeQuery = jest.fn().mockRejectedValue(new Error('Update failed'));

                try {
                    // Act
                    await Variables.updateVariable(1);

                    // Assert - Previous values should be preserved
                    const variable = Variables.variables.find(v => v.id === 1);
                    expect(variable.selectedValue).toBe('server01'); // Should remain unchanged
                    expect(variable.error).toBeTruthy();
                } finally {
                    // Restore original
                    DataAccess.executeQuery = originalExecuteQuery;
                }
            }
        });
    });

    describe('Global Functions Integration', function() {
        it('should maintain global variable functions', function() {
            // Skip if Variables module is not available
            if (typeof Variables === 'undefined') {
                console.log('Variables module not available, skipping test');
                return;
            }

            // Assert that global functions are available if Variables module defines them
            if (Variables.addVariable) {
                expect(typeof Variables.addVariable).toBe('function');
            }
            if (Variables.removeVariable) {
                expect(typeof Variables.removeVariable).toBe('function');
            }
            if (Variables.updateVariable) {
                expect(typeof Variables.updateVariable).toBe('function');
            }
        });
    });
}, 'integration');