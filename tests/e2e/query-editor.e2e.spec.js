// End-to-end tests for query editor functionality
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

test.describe('Query Editor', () => {
  test('should initialize with default tab', async () => {
    // Check default tab exists
    const tab = await app.waitForElement('.tab[data-tab-id="untitled-1"]');
    expect(tab).toBeTruthy();
    
    // Check tab is active
    const window = app.getWindow();
    const isActive = await window.$eval('.tab[data-tab-id="untitled-1"]', el => 
      el.classList.contains('active')
    );
    expect(isActive).toBe(true);
    
    // Check editor is visible
    const editor = await app.exists('.editor-container[data-tab-id="untitled-1"]');
    expect(editor).toBe(true);
  });

  test('should create new tab', async () => {
    // Click new tab button
    await app.click('.new-tab-button');
    
    // Check new tab is created
    const newTab = await app.waitForElement('.tab[data-tab-id="untitled-2"]');
    expect(newTab).toBeTruthy();
    
    // Check new tab is active
    const window = app.getWindow();
    const isActive = await window.$eval('.tab[data-tab-id="untitled-2"]', el => 
      el.classList.contains('active')
    );
    expect(isActive).toBe(true);
  });

  test('should close tab', async () => {
    // Create a new tab first
    await app.click('.new-tab-button');
    await app.waitForElement('.tab[data-tab-id="untitled-2"]');
    
    // Close the new tab
    await app.click('.tab[data-tab-id="untitled-2"] .tab-close');
    
    // Check tab is removed
    const tabExists = await app.exists('.tab[data-tab-id="untitled-2"]');
    expect(tabExists).toBe(false);
    
    // Check first tab is still there
    const firstTab = await app.exists('.tab[data-tab-id="untitled-1"]');
    expect(firstTab).toBe(true);
  });

  test('should switch between tabs', async () => {
    // Create a new tab
    await app.click('.new-tab-button');
    await app.waitForElement('.tab[data-tab-id="untitled-2"]');
    
    // Click on first tab
    await app.click('.tab[data-tab-id="untitled-1"]');
    
    // Check first tab is active
    const window = app.getWindow();
    const isFirstActive = await window.$eval('.tab[data-tab-id="untitled-1"]', el => 
      el.classList.contains('active')
    );
    expect(isFirstActive).toBe(true);
    
    // Check first editor is visible
    const firstEditorVisible = await window.$eval('.editor-container[data-tab-id="untitled-1"]', el => 
      el.classList.contains('active')
    );
    expect(firstEditorVisible).toBe(true);
  });

  test('should type in CodeMirror editor', async () => {
    // Wait for CodeMirror to initialize
    await app.waitForElement('.CodeMirror');
    
    // Click on CodeMirror to focus
    await app.click('.CodeMirror');
    
    // Type a query
    const window = app.getWindow();
    await window.keyboard.type('SELECT * FROM cpu_usage WHERE time > now() - 1h');
    
    // Check content was typed (CodeMirror stores content in hidden textarea)
    const content = await window.evaluate(() => {
      const editor = document.querySelector('.editor-container.active .CodeMirror').CodeMirror;
      return editor.getValue();
    });
    
    expect(content).toContain('SELECT * FROM cpu_usage');
  });

  test('should switch query types', async () => {
    // Click on query type selector
    const window = app.getWindow();
    
    // Check initial query type
    const initialType = await window.$eval('.query-type-selector .active', el => 
      el.getAttribute('data-type')
    );
    expect(initialType).toBe('influxql');
    
    // Switch to PromQL
    await app.click('.query-type-selector [data-type="promql"]');
    
    // Check PromQL is now active
    const activeType = await window.$eval('.query-type-selector .active', el => 
      el.getAttribute('data-type')
    );
    expect(activeType).toBe('promql');
  });

  test('should disable execute button when not connected', async () => {
    // Check execute button is disabled
    const window = app.getWindow();
    const isDisabled = await window.$eval('.execute-button', el => 
      el.disabled
    );
    expect(isDisabled).toBe(true);
    
    // Check button shows correct tooltip
    const tooltip = await window.$eval('.execute-button', el => 
      el.title
    );
    expect(tooltip).toContain('Connect to Grafana');
  });

  test('should show results panel', async () => {
    // Check results panel exists
    const resultsPanel = await app.exists('#resultsPanel');
    expect(resultsPanel).toBe(true);
    
    // Switch to results tab if not visible
    await app.click('[data-panel="results"]');
    
    // Check panel is active
    const window = app.getWindow();
    const isActive = await window.$eval('#resultsPanel', el => 
      el.classList.contains('active')
    );
    expect(isActive).toBe(true);
  });

  test('should show query history panel', async () => {
    // Switch to history panel
    await app.click('[data-panel="history"]');
    
    // Check history panel is visible
    const historyPanel = await app.waitForElement('#historyPanel.active');
    expect(historyPanel).toBeTruthy();
    
    // Check for empty state or history items
    const hasContent = await app.exists('.history-list') || await app.exists('.empty-state');
    expect(hasContent).toBe(true);
  });
});

test.describe('Query Type Detection', () => {
  test('should auto-detect query type from datasource', async () => {
    // This would require a mock connection
    // For now, we'll test the UI elements exist
    
    // Check datasource selector exists in tab
    const datasourceSelect = await app.exists('.tab-datasource-select');
    expect(datasourceSelect).toBe(true);
  });

  test('should show appropriate syntax highlighting', async () => {
    // Wait for CodeMirror
    await app.waitForElement('.CodeMirror');
    
    // Check InfluxQL mode is loaded
    const window = app.getWindow();
    const mode = await window.evaluate(() => {
      const editor = document.querySelector('.editor-container.active .CodeMirror').CodeMirror;
      return editor.getMode().name;
    });
    
    expect(['influxql', 'sql']).toContain(mode);
    
    // Switch to PromQL
    await app.click('.query-type-selector [data-type="promql"]');
    
    // Check mode changed
    const newMode = await window.evaluate(() => {
      const editor = document.querySelector('.editor-container.active .CodeMirror').CodeMirror;
      return editor.getMode().name;
    });
    
    expect(newMode).toBe('promql');
  });
});