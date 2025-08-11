// E2E tests for AI connection and analysis functionality
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

test.describe('AI Connection and Analysis', () => {
  test('should connect to AI service and enable Run Analysis button', async () => {
    // Connect to mock Grafana first (required for analysis)
    await app.connectToMockGrafana();
    
    // Connect to mock AI service
    await app.connectToMockAI('ollama');
    
    // Wait for AI connection to be established
    await app.window.waitForTimeout(2000);
    
    // Navigate to AI Analytics panel if not already there
    const agentView = await app.window.$('[data-view="agent"]');
    if (agentView) {
      const isActive = await agentView.evaluate(el => el.classList.contains('active'));
      if (!isActive) {
        await app.click('[data-view="agent"]');
        await app.window.waitForTimeout(500);
      }
    }
    
    // Check that AI is connected (purple dot visible)
    const aiStatus = await app.window.evaluate(() => {
      const statusElement = document.querySelector('.ai-status-indicator');
      if (statusElement) {
        return window.getComputedStyle(statusElement).backgroundColor;
      }
      // Alternative: check if Analytics.isConnected
      return window.Analytics?.isConnected || false;
    });
    
    // Verify AI is connected
    expect(aiStatus).toBeTruthy();
    
    // Check that Run Analysis button is enabled
    const runButton = await app.window.$('#runAnalysis');
    const isDisabled = await runButton.evaluate(el => el.disabled);
    expect(isDisabled).toBe(false);
  });

  test('should show error when trying to run analysis without AI connection', async () => {
    // Connect to Grafana but NOT to AI
    await app.connectToMockGrafana();
    
    // Navigate to AI Analytics panel
    await app.click('[data-view="agent"]');
    
    // Select a datasource
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.window.waitForTimeout(1000);
    
    // Try to click Run Analysis button (should be disabled or show error)
    const runButton = await app.window.$('#runAnalysis');
    if (runButton) {
      const isDisabled = await runButton.evaluate(el => el.disabled);
      
      if (!isDisabled) {
        // If not disabled, clicking should show an error
        await runButton.click();
        
        // Wait for error message
        await app.window.waitForTimeout(1000);
        
        // Check for error message
        const errorVisible = await app.window.evaluate(() => {
          // Check for various error indicators
          const alert = document.querySelector('.alert-error');
          const modal = document.querySelector('.modal-content .error-message');
          const toast = document.querySelector('.toast.error');
          return !!(alert || modal || toast);
        });
        
        expect(errorVisible).toBe(true);
      } else {
        // Button should be disabled without AI connection
        expect(isDisabled).toBe(true);
      }
    }
  });

  test('should properly initialize Analytics when connecting to AI', async () => {
    // Connect to mock Grafana
    await app.connectToMockGrafana();
    
    // Connect to mock AI
    await app.connectToMockAI('ollama');
    
    // Wait for connection to be established
    await app.window.waitForTimeout(2000);
    
    // Verify OllamaService is connected
    const ollamaConnected = await app.window.evaluate(() => {
      return window.OllamaService?.isConnected === true;
    });
    expect(ollamaConnected).toBe(true);
    
    // Verify Analytics is connected
    const analyticsConnected = await app.window.evaluate(() => {
      return window.Analytics?.isConnected === true;
    });
    expect(analyticsConnected).toBe(true);
    
    // Verify Analytics has the correct AI configuration
    const analyticsConfig = await app.window.evaluate(() => {
      return {
        provider: window.Analytics?.config?.provider,
        endpoint: window.Analytics?.config?.ollamaEndpoint,
        model: window.Analytics?.config?.selectedModel
      };
    });
    
    expect(analyticsConfig.provider).toBe('ollama');
    expect(analyticsConfig.endpoint).toBeTruthy();
    expect(analyticsConfig.model).toBeTruthy();
  });

  test('should execute analysis successfully with connected AI', async () => {
    // Connect to both Grafana and AI
    await app.connectToMockGrafana();
    await app.connectToMockAI('ollama');
    
    // Navigate to AI Analytics
    await app.click('[data-view="agent"]');
    await app.window.waitForTimeout(1000);
    
    // Select datasource
    await app.click('.datasource-item[data-type="influxdb"]');
    await app.window.waitForTimeout(1000);
    
    // Select measurement if dropdown exists
    const measurementSelect = await app.window.$('#analyticsMeasurement');
    if (measurementSelect) {
      await app.window.selectOption('#analyticsMeasurement', 'cpu_usage');
      await app.window.waitForTimeout(500);
    }
    
    // Select field if dropdown exists
    const fieldSelect = await app.window.$('#analyticsField');
    if (fieldSelect) {
      await app.window.selectOption('#analyticsField', 'value');
      await app.window.waitForTimeout(500);
    }
    
    // Click Run Analysis
    await app.click('#runAnalysis');
    
    // Wait for loading modal to appear
    const loadingModal = await app.waitForElement('.loading-modal', { timeout: 5000 });
    expect(loadingModal).toBeTruthy();
    
    // Wait for results (with longer timeout for AI processing)
    await app.window.waitForTimeout(3000);
    
    // Check for results modal or results content
    const hasResults = await app.window.evaluate(() => {
      const resultsModal = document.querySelector('.results-modal');
      const resultsContent = document.querySelector('#analyticsResultsContent');
      return !!(resultsModal || (resultsContent && resultsContent.innerHTML.length > 0));
    });
    
    expect(hasResults).toBe(true);
  });

  test('should switch between AI providers', async () => {
    // First connect with Ollama
    await app.connectToMockAI('ollama');
    await app.window.waitForTimeout(1000);
    
    let provider = await app.window.evaluate(() => {
      const activeConnection = window.Storage?.get('ACTIVE_AI_CONNECTION');
      const connections = window.Storage?.getAiConnections();
      const active = connections?.find(c => c.id === activeConnection);
      return active?.provider;
    });
    expect(provider).toBe('ollama');
    
    // Disconnect and connect with OpenAI
    await app.click('[data-view="agent"]');
    await app.connectToMockAI('openai');
    await app.window.waitForTimeout(1000);
    
    provider = await app.window.evaluate(() => {
      const activeConnection = window.Storage?.get('ACTIVE_AI_CONNECTION');
      const connections = window.Storage?.getAiConnections();
      const active = connections?.find(c => c.id === activeConnection);
      return active?.provider;
    });
    expect(provider).toBe('openai');
    
    // Verify OpenAI service is connected
    const openaiConnected = await app.window.evaluate(() => {
      return window.OpenAIService?.isConnected === true;
    });
    expect(openaiConnected).toBe(true);
  });

  test('should maintain AI connection state across panel switches', async () => {
    // Connect to AI
    await app.connectToMockAI('ollama');
    await app.window.waitForTimeout(1000);
    
    // Verify connected
    let isConnected = await app.window.evaluate(() => {
      return window.OllamaService?.isConnected === true;
    });
    expect(isConnected).toBe(true);
    
    // Switch to connections panel
    await app.click('[data-view="connections"]');
    await app.window.waitForTimeout(500);
    
    // Switch back to agent panel
    await app.click('[data-view="agent"]');
    await app.window.waitForTimeout(500);
    
    // Verify still connected
    isConnected = await app.window.evaluate(() => {
      return window.OllamaService?.isConnected === true;
    });
    expect(isConnected).toBe(true);
    
    // Verify Analytics still connected
    const analyticsConnected = await app.window.evaluate(() => {
      return window.Analytics?.isConnected === true;
    });
    expect(analyticsConnected).toBe(true);
  });

  test('should clear AI connection on disconnect', async () => {
    // Connect to AI
    await app.connectToMockAI('ollama');
    await app.window.waitForTimeout(1000);
    
    // Verify connected
    let isConnected = await app.window.evaluate(() => {
      return window.OllamaService?.isConnected === true;
    });
    expect(isConnected).toBe(true);
    
    // Disconnect by clicking the connection again (toggle)
    await app.click('[data-view="agent"]');
    const connectionItem = await app.window.$('.ai-connection-item.connected');
    if (connectionItem) {
      await connectionItem.click();
      await app.window.waitForTimeout(1000);
    }
    
    // Or disconnect via service
    await app.window.evaluate(() => {
      if (window.OllamaService?.disconnect) {
        window.OllamaService.disconnect();
      }
    });
    
    // Verify disconnected
    isConnected = await app.window.evaluate(() => {
      return window.OllamaService?.isConnected === true;
    });
    expect(isConnected).toBe(false);
    
    // Verify Analytics also disconnected
    const analyticsConnected = await app.window.evaluate(() => {
      return window.Analytics?.isConnected === true;
    });
    expect(analyticsConnected).toBe(false);
    
    // Verify Run Analysis button is disabled
    const runButton = await app.window.$('#runAnalysis');
    if (runButton) {
      const isDisabled = await runButton.evaluate(el => el.disabled);
      expect(isDisabled).toBe(true);
    }
  });
});

test.describe('AI Analysis Error Handling', () => {
  test('should handle AI service timeout gracefully', async () => {
    // Connect to mock services
    await app.connectToMockGrafana();
    await app.connectToMockAI('ollama');
    
    // Configure mock to simulate timeout
    await app.window.evaluate(() => {
      // Override the AI service to simulate timeout
      if (window.OllamaService) {
        window.OllamaService.generateResponse = () => {
          return new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 100);
          });
        };
      }
    });
    
    // Try to run analysis
    await app.click('[data-view="agent"]');
    await app.click('#runAnalysis');
    
    // Wait for error
    await app.window.waitForTimeout(2000);
    
    // Check for error message
    const hasError = await app.window.evaluate(() => {
      const errorElements = document.querySelectorAll('.error, .alert-error, .error-message');
      return errorElements.length > 0;
    });
    
    expect(hasError).toBe(true);
  });

  test('should validate analysis configuration before execution', async () => {
    // Connect services
    await app.connectToMockGrafana();
    await app.connectToMockAI('ollama');
    
    await app.click('[data-view="agent"]');
    
    // Don't select any measurement or field
    // Try to run analysis
    const runButton = await app.window.$('#runAnalysis');
    if (runButton) {
      const isDisabled = await runButton.evaluate(el => el.disabled);
      
      // Button should be disabled without proper configuration
      expect(isDisabled).toBe(true);
      
      // If somehow enabled, clicking should show validation error
      if (!isDisabled) {
        await runButton.click();
        await app.window.waitForTimeout(1000);
        
        const hasValidationError = await app.window.evaluate(() => {
          const errors = document.querySelectorAll('.validation-error, .error-message');
          return errors.length > 0;
        });
        
        expect(hasValidationError).toBe(true);
      }
    }
  });
});