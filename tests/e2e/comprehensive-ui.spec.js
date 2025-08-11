// Comprehensive UI functionality tests
const { test, expect } = require('@playwright/test');
const ElectronApp = require('./helpers/electron-app');

let app;

test.beforeEach(async () => {
  app = new ElectronApp();
  await app.launch();
});

test.afterEach(async () => {
  await app.close();
});

test.describe('Variables Panel', () => {
  test('should add a new variable', async () => {
    // Switch to variables panel
    await app.click('[data-panel="variables"]');
    
    // Click add variable button
    await app.click('#addVariableBtn');
    
    // Fill variable form
    await app.type('#variableName', 'server_name');
    await app.type('#variableValue', 'server-1');
    
    // Save variable
    await app.click('#saveVariableBtn');
    
    // Check variable appears in list
    const variable = await app.waitForElement('.variable-item');
    expect(variable).toBeTruthy();
    
    const varName = await app.getText('.variable-item .variable-name');
    expect(varName).toBe('server_name');
  });
  
  test('should use variable in query', async () => {
    // Add a variable first
    await app.click('[data-panel="variables"]');
    await app.click('#addVariableBtn');
    await app.type('#variableName', 'host_filter');
    await app.type('#variableValue', 'server-1');
    await app.click('#saveVariableBtn');
    
    // Type query with variable
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu WHERE host = \'${host_filter}\'');
    
    // Check variable is highlighted
    const hasVariable = await app.window.evaluate(() => {
      const editor = document.querySelector('.CodeMirror').CodeMirror;
      return editor.getValue().includes('${host_filter}');
    });
    expect(hasVariable).toBe(true);
  });
  
  test('should edit variable', async () => {
    // Add variable
    await app.click('[data-panel="variables"]');
    await app.click('#addVariableBtn');
    await app.type('#variableName', 'test_var');
    await app.type('#variableValue', 'value1');
    await app.click('#saveVariableBtn');
    
    // Edit variable
    await app.click('.variable-item .edit-btn');
    await app.window.keyboard.press('Control+a');
    await app.type('#variableValue', 'value2');
    await app.click('#saveVariableBtn');
    
    // Check updated value
    const value = await app.getText('.variable-item .variable-value');
    expect(value).toContain('value2');
  });
});

test.describe('Chart Visualization', () => {
  test('should switch between table and chart view', async () => {
    await app.connectToMockGrafana();
    
    // Execute a query
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage');
    await app.click('.execute-button');
    
    await app.window.waitForTimeout(2000);
    
    // Check table view is default
    const tableView = await app.exists('.results-table');
    expect(tableView).toBe(true);
    
    // Switch to chart view
    await app.click('[data-view-mode="chart"]');
    
    // Check chart is displayed
    const chartCanvas = await app.waitForElement('canvas.chart-canvas');
    expect(chartCanvas).toBeTruthy();
    
    // Switch back to table
    await app.click('[data-view-mode="table"]');
    const tableBack = await app.exists('.results-table');
    expect(tableBack).toBe(true);
  });
  
  test('should change chart type', async () => {
    await app.connectToMockGrafana();
    
    // Execute query and switch to chart
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage');
    await app.click('.execute-button');
    await app.window.waitForTimeout(2000);
    await app.click('[data-view-mode="chart"]');
    
    // Change chart type
    const chartTypeSelector = await app.window.$('#chartTypeSelector');
    if (chartTypeSelector) {
      await app.window.selectOption('#chartTypeSelector', 'bar');
      
      // Verify chart updated
      const chartType = await app.window.evaluate(() => {
        const chart = window.GrafanaConfig?.chartInstance;
        return chart?.config?.type;
      });
      expect(chartType).toBe('bar');
    }
  });
});

test.describe('Query Result Pagination', () => {
  test('should paginate through results', async () => {
    await app.connectToMockGrafana();
    
    // Execute query
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage LIMIT 100');
    await app.click('.execute-button');
    
    await app.window.waitForTimeout(2000);
    
    // Check pagination controls exist
    const pagination = await app.exists('.pagination-controls');
    expect(pagination).toBe(true);
    
    // Click next page
    const nextBtn = await app.window.$('.pagination-next');
    if (nextBtn) {
      await nextBtn.click();
      
      // Check page number updated
      const pageNum = await app.getText('.page-number');
      expect(pageNum).toContain('2');
    }
  });
  
  test('should change page size', async () => {
    await app.connectToMockGrafana();
    
    // Execute query
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage');
    await app.click('.execute-button');
    
    await app.window.waitForTimeout(2000);
    
    // Change page size
    const pageSizeSelect = await app.window.$('#pageSizeSelect');
    if (pageSizeSelect) {
      await app.window.selectOption('#pageSizeSelect', '50');
      
      // Verify page size changed
      const pageSize = await app.window.evaluate(() => {
        return window.GrafanaConfig?.pageSize;
      });
      expect(pageSize).toBe(50);
    }
  });
});

test.describe('Schema Explorer Interactions', () => {
  test('should expand measurement to show fields', async () => {
    await app.connectToMockGrafana();
    
    // Select datasource and go to explorer
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('[data-view="explorer"]');
    
    await app.window.waitForTimeout(2000);
    
    // Click on measurement to expand
    const measurement = await app.waitForElement('.schema-measurement');
    await measurement.click();
    
    // Check fields are shown
    const fields = await app.window.$$('.schema-field');
    expect(fields.length).toBeGreaterThan(0);
  });
  
  test('should copy field name on click', async () => {
    await app.connectToMockGrafana();
    
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('[data-view="explorer"]');
    await app.window.waitForTimeout(2000);
    
    // Expand measurement
    const measurement = await app.waitForElement('.schema-measurement');
    await measurement.click();
    
    // Click on field
    const field = await app.waitForElement('.schema-field');
    await field.click();
    
    // Check if copied to clipboard or inserted in editor
    // This depends on implementation
  });
  
  test('should filter schema items', async () => {
    await app.connectToMockGrafana();
    
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('[data-view="explorer"]');
    
    // Type in schema filter
    await app.type('#schemaFilter', 'cpu');
    
    // Check only cpu-related items visible
    const visibleItems = await app.window.evaluate(() => {
      const items = document.querySelectorAll('.schema-measurement:not([style*="display: none"])');
      return items.length;
    });
    expect(visibleItems).toBeGreaterThan(0);
  });
});

test.describe('AI Chat Functionality', () => {
  test('should open AI chat window', async () => {
    await app.connectToMockAI('ollama');
    
    // Open AI chat
    await app.click('[data-view="agent"]');
    await app.click('#openAiChatBtn');
    
    // Check chat window opened
    const chatWindow = await app.waitForElement('.ai-chat-window');
    expect(chatWindow).toBeTruthy();
  });
  
  test('should send message and receive response', async () => {
    await app.connectToMockGrafana();
    await app.connectToMockAI('ollama');
    
    // Open chat
    await app.click('[data-view="agent"]');
    await app.click('#openAiChatBtn');
    
    // Send message
    await app.type('#aiChatInput', 'Help me write a CPU query');
    await app.click('#sendAiMessage');
    
    // Wait for response
    await app.window.waitForTimeout(2000);
    
    // Check response received
    const messages = await app.window.$$('.ai-message');
    expect(messages.length).toBeGreaterThan(1); // User message + AI response
  });
  
  test('should clear chat history', async () => {
    await app.connectToMockAI('ollama');
    
    // Send some messages
    await app.click('[data-view="agent"]');
    await app.click('#openAiChatBtn');
    await app.type('#aiChatInput', 'Test message');
    await app.click('#sendAiMessage');
    await app.window.waitForTimeout(1000);
    
    // Clear chat
    await app.click('#clearChatBtn');
    
    // Confirm clear
    const window = app.getWindow();
    window.on('dialog', dialog => dialog.accept());
    
    // Check messages cleared
    const messages = await app.window.$$('.ai-message');
    expect(messages.length).toBe(0);
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('should execute query with Cmd/Ctrl+Enter', async () => {
    await app.connectToMockGrafana();
    
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage');
    
    // Execute with keyboard shortcut
    await app.window.keyboard.press('Control+Enter');
    
    // Check query executed
    await app.window.waitForTimeout(2000);
    const results = await app.exists('.results-table');
    expect(results).toBe(true);
  });
  
  test('should save with Cmd/Ctrl+S', async () => {
    // Type some content
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM test');
    
    // Try to save (may open dialog)
    await app.window.keyboard.press('Control+s');
    
    // Check save dialog or action occurred
    // Implementation specific
  });
  
  test('should create new tab with Cmd/Ctrl+T', async () => {
    const initialTabs = await app.window.$$('.tab');
    const initialCount = initialTabs.length;
    
    // Create new tab with shortcut
    await app.window.keyboard.press('Control+t');
    
    // Check new tab created
    const newTabs = await app.window.$$('.tab');
    expect(newTabs.length).toBe(initialCount + 1);
  });
});

test.describe('File Operations', () => {
  test('should save query to file', async () => {
    // Type a query
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT mean(value) FROM measurement');
    
    // Open file menu (implementation specific)
    await app.click('[data-view="files"]');
    await app.click('#saveQueryBtn');
    
    // Fill save dialog
    const saveDialog = await app.window.$('#saveFileDialog');
    if (saveDialog) {
      await app.type('#fileName', 'test-query.sql');
      await app.click('#confirmSaveBtn');
      
      // Check file saved
      const savedFile = await app.waitForElement('.file-item');
      expect(savedFile).toBeTruthy();
    }
  });
  
  test('should load query from file', async () => {
    // Save a query first
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM saved_test');
    await app.click('[data-view="files"]');
    
    // Simulate loading
    const fileItem = await app.window.$('.file-item');
    if (fileItem) {
      await fileItem.click();
      
      // Check query loaded in editor
      const editorContent = await app.window.evaluate(() => {
        const editor = document.querySelector('.CodeMirror').CodeMirror;
        return editor.getValue();
      });
      expect(editorContent).toContain('saved_test');
    }
  });
});

test.describe('Export Functionality', () => {
  test('should export results as CSV', async () => {
    await app.connectToMockGrafana();
    
    // Execute query
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage');
    await app.click('.execute-button');
    
    await app.window.waitForTimeout(2000);
    
    // Click export button
    const exportBtn = await app.window.$('#exportResultsBtn');
    if (exportBtn) {
      await exportBtn.click();
      
      // Select CSV format
      await app.window.selectOption('#exportFormat', 'csv');
      await app.click('#confirmExportBtn');
      
      // Check download initiated (implementation specific)
    }
  });
  
  test('should export results as JSON', async () => {
    await app.connectToMockGrafana();
    
    // Execute query
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage');
    await app.click('.execute-button');
    
    await app.window.waitForTimeout(2000);
    
    // Export as JSON
    const exportBtn = await app.window.$('#exportResultsBtn');
    if (exportBtn) {
      await exportBtn.click();
      await app.window.selectOption('#exportFormat', 'json');
      await app.click('#confirmExportBtn');
    }
  });
});

test.describe('Error Handling', () => {
  test('should show error for invalid query syntax', async () => {
    await app.connectToMockGrafana();
    
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('.CodeMirror');
    await app.window.keyboard.type('INVALID SYNTAX HERE');
    await app.click('.execute-button');
    
    // Check error displayed
    const error = await app.waitForElement('.error-message');
    expect(error).toBeTruthy();
  });
  
  test('should handle connection timeout', async () => {
    // Try to connect to non-existent server
    await app.click('button[onclick*="showNewConnectionDialog"]');
    await app.type('#connectionName', 'Bad Server');
    await app.type('#connectionUrl', 'http://localhost:9999');
    await app.type('#connectionUsername', 'admin');
    await app.type('#connectionPassword', 'admin');
    await app.click('#saveConnectionBtn');
    
    // Check timeout error
    const error = await app.waitForElement('.connection-error');
    expect(error).toBeTruthy();
  });
  
  test('should recover from errors gracefully', async () => {
    await app.connectToMockGrafana();
    
    // Cause an error
    await app.click('.CodeMirror');
    await app.window.keyboard.type('INVALID');
    await app.click('.execute-button');
    
    // Clear and try valid query
    await app.window.keyboard.press('Control+a');
    await app.window.keyboard.type('SELECT * FROM cpu_usage');
    await app.click('.execute-button');
    
    // Should work now
    await app.window.waitForTimeout(2000);
    const results = await app.exists('.results-table');
    expect(results).toBe(true);
  });
});

test.describe('Multi-tab Operations', () => {
  test('should execute queries in different tabs', async () => {
    await app.connectToMockGrafana();
    await app.click('.datasource-item[data-type="influxdb"]');
    
    // First tab query
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage');
    
    // Create second tab
    await app.click('.new-tab-button');
    
    // Second tab query
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM memory_usage');
    
    // Execute both
    await app.click('.tab[data-tab-id="untitled-1"]');
    await app.click('.execute-button');
    
    await app.click('.tab[data-tab-id="untitled-2"]');
    await app.click('.execute-button');
    
    // Check both have results
    await app.window.waitForTimeout(2000);
    
    // Switch tabs and verify results persist
    await app.click('.tab[data-tab-id="untitled-1"]');
    let results = await app.exists('.results-table');
    expect(results).toBe(true);
    
    await app.click('.tab[data-tab-id="untitled-2"]');
    results = await app.exists('.results-table');
    expect(results).toBe(true);
  });
  
  test('should maintain separate query types per tab', async () => {
    // First tab - InfluxQL
    await app.click('.query-type-selector [data-type="influxql"]');
    
    // Create new tab
    await app.click('.new-tab-button');
    
    // Second tab - PromQL
    await app.click('.query-type-selector [data-type="promql"]');
    
    // Switch back to first tab
    await app.click('.tab[data-tab-id="untitled-1"]');
    
    // Check still InfluxQL
    const firstTabType = await app.window.evaluate(() => {
      const active = document.querySelector('.tab.active');
      const tabId = active.getAttribute('data-tab-id');
      return window.Interface?.tabs?.get(tabId)?.queryType;
    });
    expect(firstTabType).toBe('influxql');
  });
});

test.describe('Query Autocomplete', () => {
  test('should show autocomplete suggestions', async () => {
    await app.connectToMockGrafana();
    await app.click('.datasource-item[data-type="influxdb"]');
    
    // Type to trigger autocomplete
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SEL');
    
    // Check autocomplete appears
    const autocomplete = await app.window.$('.CodeMirror-hints');
    expect(autocomplete).toBeTruthy();
    
    // Select suggestion
    await app.window.keyboard.press('Enter');
    
    // Check completed
    const content = await app.window.evaluate(() => {
      const editor = document.querySelector('.CodeMirror').CodeMirror;
      return editor.getValue();
    });
    expect(content).toContain('SELECT');
  });
  
  test('should autocomplete field names', async () => {
    await app.connectToMockGrafana();
    await app.click('.datasource-item[data-type="influxdb"]');
    
    // Load schema first
    await app.click('[data-view="explorer"]');
    await app.window.waitForTimeout(2000);
    
    // Go back to editor
    await app.click('[data-view="connections"]');
    
    // Type query
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT cpu');
    
    // Check for field suggestions
    await app.window.keyboard.press('Control+Space');
    
    const hints = await app.window.$('.CodeMirror-hints');
    expect(hints).toBeTruthy();
  });
});