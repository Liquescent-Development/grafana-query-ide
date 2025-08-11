// Test Runner Implementation for Time Buddy
// Provides a simple but powerful test framework

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            pending: 0,
            total: 0
        };
        this.currentSuite = null;
        this.running = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('runAllTests').addEventListener('click', () => this.runAllTests());
        document.getElementById('runUnitTests').addEventListener('click', () => this.runTestsByType('unit'));
        document.getElementById('runIntegrationTests').addEventListener('click', () => this.runTestsByType('integration'));
        document.getElementById('clearOutput').addEventListener('click', () => this.clearOutput());
        
        // Filter controls
        document.getElementById('showPassed').addEventListener('change', () => this.applyFilters());
        document.getElementById('showFailed').addEventListener('change', () => this.applyFilters());
        document.getElementById('showPending').addEventListener('change', () => this.applyFilters());
    }

    // Register a test suite
    describe(suiteName, testFunction, type = 'unit') {
        const suite = {
            name: suiteName,
            type: type,
            tests: [],
            beforeEach: null,
            afterEach: null,
            beforeAll: null,
            afterAll: null
        };

        this.currentSuite = suite;
        
        try {
            testFunction();
        } catch (error) {
            console.error(`Error in test suite ${suiteName}:`, error);
        }
        
        this.tests.push(suite);
        this.currentSuite = null;
    }

    // Register a test case
    it(testName, testFunction) {
        if (!this.currentSuite) {
            throw new Error('Test case must be inside a describe block');
        }

        this.currentSuite.tests.push({
            name: testName,
            testFunction: testFunction,
            status: 'pending',
            error: null,
            duration: 0
        });
    }

    // Setup hooks
    beforeEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = fn;
        }
    }

    afterEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = fn;
        }
    }

    beforeAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll = fn;
        }
    }

    afterAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterAll = fn;
        }
    }

    // Run all tests
    async runAllTests() {
        if (this.running) return;
        this.running = true;
        this.resetResults();
        this.updateControls(true);
        
        try {
            await this.runTests(this.tests);
        } finally {
            this.running = false;
            this.updateControls(false);
        }
    }

    // Run tests by type
    async runTestsByType(type) {
        if (this.running) return;
        this.running = true;
        this.resetResults();
        this.updateControls(true);
        
        try {
            const filteredTests = this.tests.filter(suite => suite.type === type);
            await this.runTests(filteredTests);
        } finally {
            this.running = false;
            this.updateControls(false);
        }
    }

    // Run a collection of test suites
    async runTests(testSuites) {
        this.clearOutput();
        
        // Calculate total tests for progress
        const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
        this.results.total = totalTests;
        this.updateSummary();
        
        let completedTests = 0;
        
        for (const suite of testSuites) {
            await this.runSuite(suite);
            completedTests += suite.tests.length;
            this.updateProgress((completedTests / totalTests) * 100);
        }
        
        this.displayFinalSummary();
    }

    // Run a single test suite
    async runSuite(suite) {
        this.displaySuiteHeader(suite.name);
        
        try {
            // Run beforeAll hook
            if (suite.beforeAll) {
                await suite.beforeAll();
            }

            for (const test of suite.tests) {
                await this.runTest(suite, test);
            }

            // Run afterAll hook
            if (suite.afterAll) {
                await suite.afterAll();
            }
        } catch (error) {
            this.displayError(`Suite setup/teardown error: ${error.message}`);
        }
    }

    // Run a single test
    async runTest(suite, test) {
        const startTime = performance.now();
        
        try {
            // Run beforeEach hook
            if (suite.beforeEach) {
                await suite.beforeEach();
            }

            // Run the actual test
            await test.testFunction();
            
            test.status = 'passed';
            this.results.passed++;
            
            // Run afterEach hook
            if (suite.afterEach) {
                await suite.afterEach();
            }
            
        } catch (error) {
            test.status = 'failed';
            test.error = error;
            this.results.failed++;
        } finally {
            test.duration = performance.now() - startTime;
            this.displayTestResult(test);
            this.updateSummary();
        }
    }

    // Display functions
    displaySuiteHeader(suiteName) {
        const output = document.getElementById('testOutput');
        const suiteDiv = document.createElement('div');
        suiteDiv.className = 'test-group';
        suiteDiv.innerHTML = `<div class="test-group-title">${this.escapeHtml(suiteName)}</div>`;
        output.appendChild(suiteDiv);
    }

    displayTestResult(test) {
        const output = document.getElementById('testOutput');
        const lastGroup = output.lastElementChild;
        
        const testDiv = document.createElement('div');
        testDiv.className = `test-item ${test.status}`;
        testDiv.dataset.status = test.status;
        
        const icon = test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '○';
        const duration = test.duration ? ` (${test.duration.toFixed(2)}ms)` : '';
        
        testDiv.innerHTML = `${icon} ${this.escapeHtml(test.name)}${duration}`;
        
        if (test.error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'test-error';
            errorDiv.textContent = this.formatError(test.error);
            testDiv.appendChild(errorDiv);
        }
        
        lastGroup.appendChild(testDiv);
    }

    displayError(message) {
        const output = document.getElementById('testOutput');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'test-error';
        errorDiv.textContent = message;
        output.appendChild(errorDiv);
    }

    displayFinalSummary() {
        const output = document.getElementById('testOutput');
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'test-group';
        
        const passRate = this.results.total > 0 ? 
            ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;
        
        summaryDiv.innerHTML = `
            <div class="test-group-title">Test Run Complete</div>
            <div class="test-item" style="background: rgba(33, 150, 243, 0.1); color: #2196F3;">
                📊 ${this.results.passed}/${this.results.total} tests passed (${passRate}%)
            </div>
        `;
        
        output.appendChild(summaryDiv);
    }

    // Update UI functions
    updateSummary() {
        document.getElementById('totalTests').textContent = this.results.total;
        document.getElementById('passedTests').textContent = this.results.passed;
        document.getElementById('failedTests').textContent = this.results.failed;
        document.getElementById('pendingTests').textContent = this.results.pending;
    }

    updateProgress(percentage) {
        document.getElementById('progressFill').style.width = `${percentage}%`;
    }

    updateControls(disabled) {
        const buttons = document.querySelectorAll('.controls button');
        buttons.forEach(button => {
            button.disabled = disabled;
        });
    }

    resetResults() {
        this.results = { passed: 0, failed: 0, pending: 0, total: 0 };
        this.updateSummary();
        this.updateProgress(0);
    }

    clearOutput() {
        document.getElementById('testOutput').innerHTML = '';
    }

    applyFilters() {
        const showPassed = document.getElementById('showPassed').checked;
        const showFailed = document.getElementById('showFailed').checked;
        const showPending = document.getElementById('showPending').checked;
        
        const testItems = document.querySelectorAll('.test-item');
        testItems.forEach(item => {
            const status = item.dataset.status;
            let show = false;
            
            if (status === 'passed' && showPassed) show = true;
            if (status === 'failed' && showFailed) show = true;
            if (status === 'pending' && showPending) show = true;
            
            item.style.display = show ? 'block' : 'none';
        });
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatError(error) {
        if (error.stack) {
            return error.stack;
        }
        if (error.message) {
            return error.message;
        }
        return String(error);
    }
}

// Global test runner instance
const testRunner = new TestRunner();

// Export test functions to global scope
window.describe = (name, fn, type) => testRunner.describe(name, fn, type);
window.it = (name, fn) => testRunner.it(name, fn);
window.beforeEach = (fn) => testRunner.beforeEach(fn);
window.afterEach = (fn) => testRunner.afterEach(fn);
window.beforeAll = (fn) => testRunner.beforeAll(fn);
window.afterAll = (fn) => testRunner.afterAll(fn);

// Simple assertion library
window.expect = function(actual) {
    return {
        toBe: function(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
            }
        },
        toEqual: function(expected) {
            // Handle Jest matchers
            if (expected && expected._isJestMatcher) {
                if (!expected.asymmetricMatch(actual)) {
                    throw new Error(`Expected value to match ${expected._matcherType}`);
                }
                return;
            }
            
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
            }
        },
        toBeNull: function() {
            if (actual !== null) {
                throw new Error(`Expected null, but got ${JSON.stringify(actual)}`);
            }
        },
        toBeUndefined: function() {
            if (actual !== undefined) {
                throw new Error(`Expected undefined, but got ${JSON.stringify(actual)}`);
            }
        },
        toBeTruthy: function() {
            if (!actual) {
                throw new Error(`Expected truthy value, but got ${JSON.stringify(actual)}`);
            }
        },
        toBeFalsy: function() {
            if (actual) {
                throw new Error(`Expected falsy value, but got ${JSON.stringify(actual)}`);
            }
        },
        toContain: function(expected) {
            if (Array.isArray(actual)) {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
                }
            } else if (typeof actual === 'string') {
                if (actual.indexOf(expected) === -1) {
                    throw new Error(`Expected string to contain "${expected}"`);
                }
            } else {
                throw new Error('toContain can only be used with arrays or strings');
            }
        },
        toThrow: function(expectedError) {
            if (typeof actual !== 'function') {
                throw new Error('toThrow can only be used with functions');
            }
            
            let threw = false;
            let actualError = null;
            
            try {
                actual();
            } catch (error) {
                threw = true;
                actualError = error;
            }
            
            if (!threw) {
                throw new Error('Expected function to throw an error');
            }
            
            if (expectedError && actualError.message !== expectedError) {
                throw new Error(`Expected error message "${expectedError}", but got "${actualError.message}"`);
            }
        },
        toHaveProperty: function(propertyName) {
            if (typeof actual !== 'object' || actual === null) {
                throw new Error('toHaveProperty can only be used with objects');
            }
            
            if (!(propertyName in actual)) {
                throw new Error(`Expected object to have property "${propertyName}"`);
            }
        },
        toBeInstanceOf: function(constructor) {
            if (!(actual instanceof constructor)) {
                throw new Error(`Expected instance of ${constructor.name}`);
            }
        }
    };
};

// Add Jest-style matchers
window.expect.objectContaining = function(obj) {
    return {
        _isJestMatcher: true,
        _matcherType: 'objectContaining',
        _expectedObj: obj,
        
        asymmetricMatch: function(actual) {
            if (typeof actual !== 'object' || actual === null) {
                return false;
            }
            
            for (const key in obj) {
                if (!(key in actual)) {
                    return false;
                }
                
                const expectedValue = obj[key];
                const actualValue = actual[key];
                
                // Handle nested matchers
                if (expectedValue && expectedValue._isJestMatcher) {
                    if (!expectedValue.asymmetricMatch(actualValue)) {
                        return false;
                    }
                } else if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
                    return false;
                }
            }
            
            return true;
        }
    };
};

window.expect.any = function(constructor) {
    return {
        _isJestMatcher: true,
        _matcherType: 'any',
        _constructor: constructor,
        
        asymmetricMatch: function(actual) {
            if (constructor === Object) {
                return typeof actual === 'object' && actual !== null;
            }
            if (constructor === Array) {
                return Array.isArray(actual);
            }
            if (constructor === String) {
                return typeof actual === 'string';
            }
            if (constructor === Number) {
                return typeof actual === 'number';
            }
            if (constructor === Boolean) {
                return typeof actual === 'boolean';
            }
            if (constructor === Function) {
                return typeof actual === 'function';
            }
            
            return actual instanceof constructor;
        }
    };
};

console.log('✅ Test Runner initialized');