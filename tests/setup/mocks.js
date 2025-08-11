// Mock implementations for external dependencies
// This file provides mocks for APIs, modules, and global objects used in tests

(function() {
    'use strict';

    // Mock Utils module (if not available in test environment)
    if (typeof window.Utils === 'undefined') {
        window.Utils = {
            escapeHtml: function(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            },
            
            showResults: function(message, type) {
                console.log(`[${type}] ${message}`);
            },
            
            formatTimeValue: function(value) {
                if (typeof value === 'number') {
                    return new Date(value).toISOString();
                }
                return value;
            },
            
            formatNumberValue: function(value) {
                if (typeof value === 'number' && !Number.isInteger(value)) {
                    return value.toFixed(2);
                }
                return value;
            },
            
            extractSeriesName: function(frame, index) {
                if (frame && frame.schema && frame.schema.name) {
                    return frame.schema.name;
                }
                return `Series ${index + 1}`;
            }
        };
    }

    // Mock Editor module (if not available in test environment)
    if (typeof window.Editor === 'undefined') {
        window.Editor = {
            getQueryValue: function() {
                return 'SELECT * FROM test_measurement WHERE time > now() - 1h';
            },
            
            setQueryValue: function(value) {
                console.log('Mock Editor: Setting query value:', value);
            }
        };
    }

    // Mock Variables module (if not available in test environment)
    if (typeof window.Variables === 'undefined') {
        window.Variables = {
            substituteVariables: function(query) {
                // Simple variable substitution for testing
                return query.replace(/\$\{(\w+)\}/g, (match, varName) => {
                    const mockVarValues = {
                        'hostname': 'test-host',
                        'measurement': 'cpu',
                        'field': 'usage_idle'
                    };
                    return mockVarValues[varName] || match;
                });
            }
        };
    }

    // Mock Storage module (if not available in test environment)
    if (typeof window.Storage === 'undefined') {
        window.Storage = {
            saveToHistory: function(query, datasourceId, datasourceName) {
                console.log('Mock Storage: Saving to history:', query, datasourceId, datasourceName);
            },
            
            getSchemaFromStorage: function(datasourceId, maxAge) {
                console.log('Mock Storage: Getting schema from storage:', datasourceId, maxAge);
                return null; // Simulate no cached schema
            },
            
            saveSchemaToStorage: function(datasourceId, schemaData) {
                console.log('Mock Storage: Saving schema to storage:', datasourceId, schemaData);
            },
            
            clearSchemaFromStorage: function(datasourceId) {
                console.log('Mock Storage: Clearing schema from storage:', datasourceId);
            }
        };
    }

    // Mock History module (if not available in test environment)
    if (typeof window.History === 'undefined') {
        window.History = {
            loadHistory: function() {
                console.log('Mock History: Loading history');
            }
        };
    }

    // Mock Charts module (if not available in test environment)
    if (typeof window.Charts === 'undefined') {
        window.Charts = {
            initializeChart: function(frames) {
                console.log('Mock Charts: Initializing chart with frames:', frames.length);
            }
        };
    }

    // Enhanced mock for localStorage
    const mockLocalStorage = {
        data: {},
        
        getItem: function(key) {
            return this.data[key] || null;
        },
        
        setItem: function(key, value) {
            this.data[key] = String(value);
        },
        
        removeItem: function(key) {
            delete this.data[key];
        },
        
        clear: function() {
            this.data = {};
        },
        
        key: function(index) {
            const keys = Object.keys(this.data);
            return keys[index] || null;
        },
        
        get length() {
            return Object.keys(this.data).length;
        }
    };

    // Replace localStorage if not available or in test mode
    if (typeof window.localStorage === 'undefined' || window.location.protocol === 'file:') {
        Object.defineProperty(window, 'localStorage', {
            value: mockLocalStorage,
            writable: true
        });
    }

    // Mock CodeMirror for editor functionality
    if (typeof window.CodeMirror === 'undefined') {
        window.CodeMirror = {
            fromTextArea: function(textarea, options) {
                return {
                    getValue: function() {
                        return textarea.value;
                    },
                    setValue: function(value) {
                        textarea.value = value;
                    },
                    getDoc: function() {
                        return {
                            getCursor: function() {
                                return { line: 0, ch: 0 };
                            },
                            replaceRange: function(text, from, to) {
                                console.log('Mock CodeMirror: Replacing range with:', text);
                            }
                        };
                    },
                    focus: function() {
                        console.log('Mock CodeMirror: Focus called');
                    },
                    refresh: function() {
                        console.log('Mock CodeMirror: Refresh called');
                    }
                };
            }
        };
    }

    // Mock for performance.now() if not available
    if (typeof window.performance === 'undefined') {
        window.performance = {
            now: function() {
                return Date.now();
            }
        };
    }

    // Mock for requestAnimationFrame if not available
    if (typeof window.requestAnimationFrame === 'undefined') {
        window.requestAnimationFrame = function(callback) {
            return setTimeout(callback, 16); // ~60fps
        };
    }

    // Mock global functions that might be used in tests
    window.setViewMode = window.setViewMode || function(mode) {
        console.log('Mock setViewMode called with:', mode);
    };

    window.selectSeries = window.selectSeries || function(index) {
        console.log('Mock selectSeries called with:', index);
    };

    window.goToPage = window.goToPage || function(page) {
        console.log('Mock goToPage called with:', page);
    };

    window.changePageSize = window.changePageSize || function(size) {
        console.log('Mock changePageSize called with:', size);
    };

    window.updateChart = window.updateChart || function() {
        console.log('Mock updateChart called');
    };

    // Mock DOM elements that might be referenced in tests
    function createMockElement(id, tagName = 'div') {
        const element = document.createElement(tagName);
        element.id = id;
        
        // Add common properties
        element.value = '';
        element.checked = false;
        element.selectedOptions = [];
        element.innerHTML = '';
        element.style = {};
        
        return element;
    }

    // Ensure common DOM elements exist for tests
    document.addEventListener('DOMContentLoaded', function() {
        const commonElements = [
            'timeFrom', 'timeTo', 'maxDataPoints', 'intervalMs', 'instantQuery',
            'results', 'datasource', 'schemaContainer', 'fieldsList', 'tagsList', 
            'tagValuesList', 'measurementsSearch', 'fieldsSearch', 'tagsSearch',
            'tagValuesSearch'
        ];

        commonElements.forEach(id => {
            if (!document.getElementById(id)) {
                const element = createMockElement(id);
                document.body.appendChild(element);
            }
        });
    });

    console.log('✅ Mocks initialized');
})();