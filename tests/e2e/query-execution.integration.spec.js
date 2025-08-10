// Integration tests for query execution with mock server
const { test, expect } = require('@playwright/test');
const ElectronApp = require('./helpers/electron-app');

let app;

test.beforeEach(async () => {
  app = new ElectronApp();
  await app.launch(); // Mock server starts automatically
});

test.afterEach(async () => {
  await app.close(); // Mock server stops automatically
});

test.describe('Query Execution with Mock Server', () => {
  test('should connect to mock Grafana server', async () => {
    // Connect to mock server
    await app.connectToMockGrafana();
    
    // Check connection status updated
    await app.window.waitForTimeout(2000);
    const status = await app.getText('#titleBarConnectionStatus');
    expect(status).toContain('Connected');
    
    // Check datasources loaded
    const datasourceList = await app.waitForElement('.datasource-item');
    expect(datasourceList).toBeTruthy();
    
    // Verify mock datasources are shown
    const datasources = await app.window.$$('.datasource-item');
    expect(datasources.length).toBeGreaterThan(0);
  });

  test('should execute InfluxQL query against mock server', async () => {
    // Connect to mock server
    await app.connectToMockGrafana();
    
    // Wait for datasources to load
    await app.window.waitForTimeout(2000);
    
    // Select InfluxDB datasource
    await app.click('.datasource-item[data-type="influxdb"]');
    
    // Type a query
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage WHERE time > now() - 1h');
    
    // Execute query
    await app.click('.execute-button');
    
    // Wait for results
    await app.window.waitForTimeout(2000);
    
    // Check results panel shows data
    const resultsTable = await app.exists('.results-table');
    expect(resultsTable).toBe(true);
    
    // Verify mock data is displayed
    const hasData = await app.window.evaluate(() => {
      const table = document.querySelector('.results-table');
      return table && table.querySelector('tbody tr');
    });
    expect(hasData).toBeTruthy();
  });

  test('should execute PromQL query against mock server', async () => {
    // Connect to mock server
    await app.connectToMockGrafana();
    
    // Wait for datasources
    await app.window.waitForTimeout(2000);
    
    // Select Prometheus datasource
    await app.click('.datasource-item[data-type="prometheus"]');
    
    // Switch to PromQL mode
    await app.click('.query-type-selector [data-type="promql"]');
    
    // Type a PromQL query
    await app.click('.CodeMirror');
    await app.window.keyboard.type('up{job="prometheus"}');
    
    // Execute query
    await app.click('.execute-button');
    
    // Wait for results
    await app.window.waitForTimeout(2000);
    
    // Check results are displayed
    const resultsTable = await app.exists('.results-table');
    expect(resultsTable).toBe(true);
  });

  test('should load schema from mock datasource', async () => {
    // Connect to mock server
    await app.connectToMockGrafana();
    
    // Wait for connection
    await app.window.waitForTimeout(2000);
    
    // Select InfluxDB datasource
    await app.click('.datasource-item[data-type="influxdb"]');
    
    // Switch to schema explorer
    await app.click('[data-view="explorer"]');
    
    // Wait for schema to load
    await app.window.waitForTimeout(2000);
    
    // Check measurements are shown
    const measurements = await app.window.$$('.schema-measurement');
    expect(measurements.length).toBeGreaterThan(0);
    
    // Verify mock measurements
    const measurementNames = await app.window.evaluate(() => {
      const items = document.querySelectorAll('.schema-measurement');
      return Array.from(items).map(item => item.textContent);
    });
    
    expect(measurementNames).toContain('cpu_usage');
    expect(measurementNames).toContain('memory_usage');
  });

  test('should handle query errors from mock server', async () => {
    // Connect to mock server
    await app.connectToMockGrafana();
    
    // Wait for connection
    await app.window.waitForTimeout(2000);
    
    // Type an invalid query
    await app.click('.CodeMirror');
    await app.window.keyboard.type('INVALID QUERY SYNTAX');
    
    // Try to execute
    await app.click('.execute-button');
    
    // Wait for error
    await app.window.waitForTimeout(1000);
    
    // Check error is displayed
    const errorMessage = await app.exists('.error-message') || 
                        await app.exists('.toast.error');
    expect(errorMessage).toBe(true);
  });

  test('should display query history', async () => {
    // Connect to mock server
    await app.connectToMockGrafana();
    
    // Execute a query
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage LIMIT 10');
    await app.click('.execute-button');
    
    // Wait for execution
    await app.window.waitForTimeout(2000);
    
    // Switch to history panel
    await app.click('[data-panel="history"]');
    
    // Check query appears in history
    const historyItems = await app.window.$$('.history-item');
    expect(historyItems.length).toBeGreaterThan(0);
    
    // Verify query text in history
    const historyText = await app.window.evaluate(() => {
      const item = document.querySelector('.history-item');
      return item ? item.textContent : '';
    });
    expect(historyText).toContain('SELECT * FROM cpu_usage');
  });
});

test.describe('AI Integration with Mock Server', () => {
  test('should connect to mock AI service', async () => {
    // Connect to mock AI
    await app.connectToMockAI('ollama');
    
    // Check AI status updated
    await app.window.waitForTimeout(2000);
    const aiStatus = await app.getText('#titleBarAiStatus');
    expect(aiStatus).toBe('AI: Connected');
    
    // Verify connection in AI panel
    const connectedItem = await app.window.$('.ai-connection-item.connected');
    expect(connectedItem).toBeTruthy();
  });

  test('should generate query using mock AI', async () => {
    // Connect both services
    await app.connectToMockGrafana();
    await app.connectToMockAI('ollama');
    
    // Wait for connections
    await app.window.waitForTimeout(2000);
    
    // Open AI chat
    await app.click('[data-view="agent"]');
    await app.click('#openAiChatBtn');
    
    // Type AI prompt
    const chatInput = await app.waitForElement('#aiChatInput');
    await app.type('#aiChatInput', 'Generate a query for CPU usage');
    
    // Send message
    await app.click('#sendAiMessage');
    
    // Wait for response
    await app.window.waitForTimeout(2000);
    
    // Check AI response contains query
    const response = await app.window.evaluate(() => {
      const messages = document.querySelectorAll('.ai-message.assistant');
      return messages.length > 0 ? messages[messages.length - 1].textContent : '';
    });
    
    expect(response).toContain('SELECT');
    expect(response).toContain('cpu_usage');
  });

  test('should analyze query results with mock AI', async () => {
    // Connect services
    await app.connectToMockGrafana();
    await app.connectToMockAI('ollama');
    
    // Execute a query first
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.click('.CodeMirror');
    await app.window.keyboard.type('SELECT * FROM cpu_usage');
    await app.click('.execute-button');
    
    // Wait for results
    await app.window.waitForTimeout(2000);
    
    // Click analyze button (if exists)
    const analyzeBtn = await app.window.$('#analyzeResultsBtn');
    if (analyzeBtn) {
      await analyzeBtn.click();
      
      // Wait for AI analysis
      await app.window.waitForTimeout(2000);
      
      // Check analysis appears
      const analysis = await app.window.$('.ai-analysis');
      expect(analysis).toBeTruthy();
    }
  });
});

test.describe('Dashboard Integration with Mock Server', () => {
  test('should load dashboards from mock server', async () => {
    // Connect to mock server
    await app.connectToMockGrafana();
    
    // Switch to dashboards view
    await app.click('[data-view="dashboards"]');
    
    // Wait for dashboards to load
    await app.window.waitForTimeout(2000);
    
    // Check dashboards are displayed
    const dashboardItems = await app.window.$$('.dashboard-item');
    expect(dashboardItems.length).toBeGreaterThan(0);
    
    // Verify mock dashboard names
    const dashboardNames = await app.window.evaluate(() => {
      const items = document.querySelectorAll('.dashboard-item .dashboard-title');
      return Array.from(items).map(item => item.textContent);
    });
    
    expect(dashboardNames).toContain('System Overview');
    expect(dashboardNames).toContain('Application Metrics');
  });

  test('should search dashboards', async () => {
    // Connect to mock server
    await app.connectToMockGrafana();
    
    // Switch to dashboards
    await app.click('[data-view="dashboards"]');
    
    // Search for dashboard
    await app.type('#dashboardSearch', 'System');
    
    // Check filtered results
    await app.window.waitForTimeout(500);
    
    const visibleDashboards = await app.window.evaluate(() => {
      const items = document.querySelectorAll('.dashboard-item:not([style*="display: none"])');
      return items.length;
    });
    
    expect(visibleDashboards).toBe(1);
  });
});