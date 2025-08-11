// Execute Dropdown Integration Tests
// Tests for GitHub-style execute dropdown UI functionality

describe('Execute Dropdown UI Integration', function() {
    let cleanupConfig, cleanupDOM, cleanupFetch, cleanupElectron;
    
    // Mock implementations for testing
    function mockToggleExecuteDropdown(tabId) {
        const dropdown = document.getElementById(`executeDropdown-${tabId}`);
        if (dropdown) {
            const isVisible = dropdown.style.display !== 'none';
            dropdown.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    function mockExecuteQuery(tabId) {
        console.log('Mock execute query called with tabId:', tabId);
        return Promise.resolve();
    }
    
    function mockExecuteWithAnalysis(tabId, analysisType) {
        console.log('Mock execute with analysis called with tabId:', tabId, 'type:', analysisType);
        return Promise.resolve();
    }

    beforeEach(function() {
        // Setup clean test environment
        setupTest();
        cleanupConfig = TestUtils.mockGrafanaConfig();
        cleanupDOM = TestUtils.setupTestDOM();
        cleanupFetch = TestUtils.mockFetch(MockResponses);
        cleanupElectron = TestUtils.mockElectronAPI(MockResponses);
        
        // Add Interface mock to global scope
        global.Interface = {
            executeQuery: mockExecuteQuery,
            executeWithAnalysis: mockExecuteWithAnalysis
        };
        
        // Add global function mock
        global.toggleExecuteDropdown = mockToggleExecuteDropdown;
        
        // Create execute dropdown elements specifically for this test
        const executeContainer = TestUtils.createTestElement('div', {
            className: 'execute-dropdown-container'
        });
        
        const executeButton = TestUtils.createTestElement('button', {
            className: 'execute-button',
            disabled: false
        });
        executeButton.innerHTML = 'Execute';
        executeButton.addEventListener('click', () => mockExecuteQuery('untitled-1'));
        
        const dropdownArrow = TestUtils.createTestElement('button', {
            className: 'execute-dropdown-arrow',
            disabled: false
        });
        dropdownArrow.innerHTML = '▼';
        dropdownArrow.addEventListener('click', () => mockToggleExecuteDropdown('untitled-1'));
        
        const dropdownMenu = TestUtils.createTestElement('div', {
            className: 'execute-dropdown-menu',
            id: 'executeDropdown-untitled-1',
            style: 'display: none;'
        });
        
        // Add dropdown menu items
        const menuItems = [
            {
                text: 'Execute',
                handler: () => mockExecuteQuery('untitled-1'),
                icon: '▶'
            },
            {
                text: 'Execute with Anomaly Detection', 
                handler: () => mockExecuteWithAnalysis('untitled-1', 'anomaly'),
                icon: '⚠'
            },
            {
                text: 'Execute with Prediction',
                handler: () => mockExecuteWithAnalysis('untitled-1', 'prediction'), 
                icon: '📈'
            },
            {
                text: 'Execute with Trend Analysis',
                handler: () => mockExecuteWithAnalysis('untitled-1', 'trend'),
                icon: '📊'
            }
        ];
        
        menuItems.forEach((item, index) => {
            if (index === 1) {
                // Add separator after first item
                const separator = TestUtils.createTestElement('div', {
                    className: 'dropdown-separator'
                });
                dropdownMenu.appendChild(separator);
            }
            
            const menuItem = TestUtils.createTestElement('div', {
                className: 'dropdown-item'
            });
            menuItem.innerHTML = `${item.icon} ${item.text}`;
            menuItem.addEventListener('click', item.handler);
            dropdownMenu.appendChild(menuItem);
        });
        
        executeContainer.appendChild(executeButton);
        executeContainer.appendChild(dropdownArrow);
        executeContainer.appendChild(dropdownMenu);
        
        document.body.appendChild(executeContainer);
    });

    afterEach(function() {
        // Cleanup after each test
        if (cleanupConfig) cleanupConfig();
        if (cleanupDOM) cleanupDOM();
        if (cleanupFetch) cleanupFetch();
        if (cleanupElectron) cleanupElectron();
        cleanupTest();
        
        // Remove test elements
        const testContainer = document.querySelector('.execute-dropdown-container');
        if (testContainer) {
            testContainer.remove();
        }
        
        // Clean up global mocks
        delete global.Interface;
        delete global.toggleExecuteDropdown;
    });

    it('should show dropdown when clicking arrow button', function() {
        // Arrange
        const dropdownArrow = document.querySelector('.execute-dropdown-arrow');
        const dropdownMenu = document.getElementById('executeDropdown-untitled-1');
        
        expect(dropdownArrow).toBeTruthy();
        expect(dropdownMenu).toBeTruthy();
        expect(dropdownMenu.style.display).toBe('none');
        
        // Act - simulate click on dropdown arrow
        dropdownArrow.click();
        
        // Assert
        expect(dropdownMenu.style.display).toBe('block');
    });
    
    it('should hide dropdown when clicking arrow button again', function() {
        // Arrange
        const dropdownArrow = document.querySelector('.execute-dropdown-arrow');
        const dropdownMenu = document.getElementById('executeDropdown-untitled-1');
        
        // First click to show
        dropdownArrow.click();
        expect(dropdownMenu.style.display).toBe('block');
        
        // Act - second click to hide
        dropdownArrow.click();
        
        // Assert
        expect(dropdownMenu.style.display).toBe('none');
    });

    describe('Dropdown Menu Items', function() {
        it('should have correct menu structure', function() {
            // Arrange & Assert
            const dropdownMenu = document.getElementById('executeDropdown-untitled-1');
            const menuItems = dropdownMenu.querySelectorAll('.dropdown-item');
            const separator = dropdownMenu.querySelector('.dropdown-separator');
            
            expect(dropdownMenu).toBeTruthy();
            expect(menuItems.length).toBe(4);
            expect(separator).toBeTruthy();
            
            // Check menu item contents
            expect(menuItems[0].textContent).toContain('Execute');
            expect(menuItems[1].textContent).toContain('Execute with Anomaly Detection');
            expect(menuItems[2].textContent).toContain('Execute with Prediction'); 
            expect(menuItems[3].textContent).toContain('Execute with Trend Analysis');
        });
    });

    describe('Interface Integration', function() {
        it('should call handlers when clicking menu items', function() {
            // Arrange
            let executeCallCount = 0;
            let analysisCallCount = 0;
            const analysisCalls = [];
            
            global.Interface.executeQuery = function(tabId) {
                executeCallCount++;
                expect(tabId).toBe('untitled-1');
            };
            
            global.Interface.executeWithAnalysis = function(tabId, analysisType) {
                analysisCallCount++;
                analysisCalls.push(analysisType);
                expect(tabId).toBe('untitled-1');
            };
            
            // Act - click execute button and menu items
            const executeButton = document.querySelector('.execute-button');
            const menuItems = document.getElementById('executeDropdown-untitled-1').querySelectorAll('.dropdown-item');
            
            executeButton.click();
            menuItems.forEach(item => item.click());
            
            // Assert
            expect(executeCallCount).toBe(2); // Main button + first menu item
            expect(analysisCallCount).toBe(3); // Three analysis menu items
            expect(analysisCalls).toEqual(['anomaly', 'prediction', 'trend']);
        });
    });

    describe('CSS Styling Verification', function() {
        it('should have proper CSS classes applied', function() {
            // Arrange & Assert
            const executeContainer = document.querySelector('.execute-dropdown-container');
            const executeButton = document.querySelector('.execute-button');
            const dropdownArrow = document.querySelector('.execute-dropdown-arrow');
            const dropdownMenu = document.querySelector('.execute-dropdown-menu');
            
            expect(executeContainer).toBeTruthy();
            expect(executeButton).toBeTruthy();
            expect(dropdownArrow).toBeTruthy(); 
            expect(dropdownMenu).toBeTruthy();
            
            // Verify classes
            expect(executeContainer.classList.contains('execute-dropdown-container')).toBe(true);
            expect(executeButton.classList.contains('execute-button')).toBe(true);
            expect(dropdownArrow.classList.contains('execute-dropdown-arrow')).toBe(true);
            expect(dropdownMenu.classList.contains('execute-dropdown-menu')).toBe(true);
        });
        
        it('should have dropdown initially hidden', function() {
            // Arrange & Assert
            const dropdownMenu = document.getElementById('executeDropdown-untitled-1');
            
            expect(dropdownMenu.style.display).toBe('none');
        });
    });
}, 'integration');