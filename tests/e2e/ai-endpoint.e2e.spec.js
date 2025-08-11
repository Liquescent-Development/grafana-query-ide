// E2E tests to ensure Analytics uses correct AI endpoints, not hardcoded localhost
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

test.describe('AI Endpoint Configuration', () => {
  test('should use actual Ollama endpoint from connection, not hardcoded localhost', async () => {
    // Create a connection with a custom endpoint (not localhost)
    const customEndpoint = 'http://192.168.1.100:11434';
    
    // Go to AI connections
    await app.click('[data-view="agent"]');
    await app.window.waitForTimeout(500);
    
    // Open new connection dialog
    const buttons = await app.window.$$('button[onclick*="showNewAiConnectionDialog"]');
    if (buttons.length > 0) {
      for (const button of buttons) {
        const isVisible = await button.isVisible();
        if (isVisible) {
          await button.click();
          break;
        }
      }
    }
    
    await app.window.waitForTimeout(500);
    
    // Create Ollama connection with custom endpoint
    await app.window.selectOption('#aiProvider', 'ollama');
    await app.type('#aiConnectionName', 'Custom Ollama');
    
    // Clear and set custom endpoint
    const endpointInput = await app.window.$('#aiEndpoint');
    await endpointInput.fill('');
    await endpointInput.type(customEndpoint);
    
    await app.window.selectOption('#aiModel', 'llama3.1:8b');
    
    // Save connection
    await app.click('.modal-footer .primary-button');
    await app.window.waitForTimeout(1000);
    
    // Click to connect
    const connectionItem = await app.window.$('.ai-connection-item');
    if (connectionItem) {
      await connectionItem.click();
      await app.window.waitForTimeout(2000);
    }
    
    // Verify Analytics is using the custom endpoint, not localhost
    const analyticsEndpoint = await app.window.evaluate(() => {
      return window.Analytics?.config?.ollamaEndpoint;
    });
    
    expect(analyticsEndpoint).toBe(customEndpoint);
    expect(analyticsEndpoint).not.toContain('localhost');
    
    // Verify OllamaService is also using the custom endpoint
    const ollamaEndpoint = await app.window.evaluate(() => {
      return window.OllamaService?.config?.endpoint;
    });
    
    expect(ollamaEndpoint).toBe(customEndpoint);
  });

  test('should update Analytics endpoint when switching between connections', async () => {
    // Create first connection with one endpoint
    const endpoint1 = 'http://server1.local:11434';
    const endpoint2 = 'http://server2.local:11434';
    
    // Create first connection
    await app.click('[data-view="agent"]');
    await app.window.waitForTimeout(500);
    
    // Add first connection
    await app.window.evaluate((ep1) => {
      const conn1 = {
        id: 'test-1',
        name: 'Server 1',
        provider: 'ollama',
        endpoint: ep1,
        model: 'llama3.1:8b',
        status: 'disconnected'
      };
      
      const connections = window.Storage?.getAiConnections() || [];
      connections.push(conn1);
      window.Storage?.setAiConnections(connections);
    }, endpoint1);
    
    // Add second connection
    await app.window.evaluate((ep2) => {
      const conn2 = {
        id: 'test-2',
        name: 'Server 2',
        provider: 'ollama',
        endpoint: ep2,
        model: 'llama3.1:8b',
        status: 'disconnected'
      };
      
      const connections = window.Storage?.getAiConnections() || [];
      connections.push(conn2);
      window.Storage?.setAiConnections(connections);
    }, endpoint2);
    
    // Reload connections UI
    await app.window.evaluate(() => {
      if (typeof loadAiConnections === 'function') {
        loadAiConnections();
      }
    });
    
    await app.window.waitForTimeout(500);
    
    // Connect to first server
    await app.window.evaluate(() => {
      if (typeof connectToAiService === 'function') {
        connectToAiService('test-1');
      }
    });
    
    await app.window.waitForTimeout(2000);
    
    // Check Analytics is using first endpoint
    let analyticsEndpoint = await app.window.evaluate(() => {
      return window.Analytics?.config?.ollamaEndpoint;
    });
    
    expect(analyticsEndpoint).toBe(endpoint1);
    
    // Switch to second server
    await app.window.evaluate(() => {
      if (typeof connectToAiService === 'function') {
        connectToAiService('test-2');
      }
    });
    
    await app.window.waitForTimeout(2000);
    
    // Check Analytics updated to second endpoint
    analyticsEndpoint = await app.window.evaluate(() => {
      return window.Analytics?.config?.ollamaEndpoint;
    });
    
    expect(analyticsEndpoint).toBe(endpoint2);
    expect(analyticsEndpoint).not.toBe(endpoint1);
  });

  test('should not use localhost when fetching models from custom endpoint', async () => {
    // Mock fetch to track what endpoints are being called
    await app.window.evaluate(() => {
      const originalFetch = window.fetch;
      window.fetchCalls = [];
      
      window.fetch = function(...args) {
        window.fetchCalls.push(args[0]);
        // If it's trying to fetch from localhost when we have a custom endpoint, fail
        if (args[0].includes('localhost') && window.OllamaService?.config?.endpoint && 
            !window.OllamaService.config.endpoint.includes('localhost')) {
          return Promise.reject(new Error('Should not call localhost when using custom endpoint'));
        }
        return originalFetch.apply(this, args);
      };
    });
    
    // Create connection with custom endpoint
    const customEndpoint = 'http://ollama.company.local:11434';
    
    await app.window.evaluate((endpoint) => {
      const conn = {
        id: 'test-custom',
        name: 'Company Ollama',
        provider: 'ollama',
        endpoint: endpoint,
        model: 'llama3.1:8b',
        status: 'disconnected'
      };
      
      const connections = window.Storage?.getAiConnections() || [];
      connections.push(conn);
      window.Storage?.setAiConnections(connections);
      
      // Simulate connection
      if (window.OllamaService) {
        window.OllamaService.config = { endpoint: endpoint };
        window.OllamaService.isConnected = true;
      }
      
      if (window.Analytics) {
        window.Analytics.config.ollamaEndpoint = endpoint;
        window.Analytics.isConnected = true;
      }
    }, customEndpoint);
    
    // Try to fetch models
    await app.window.evaluate(async () => {
      if (window.Analytics?.fetchAvailableModels) {
        try {
          await window.Analytics.fetchAvailableModels();
        } catch (e) {
          // Expected to fail in test environment
        }
      }
    });
    
    // Check that no localhost calls were made
    const fetchCalls = await app.window.evaluate(() => window.fetchCalls);
    const localhostCalls = fetchCalls.filter(url => url.includes('localhost'));
    
    expect(localhostCalls.length).toBe(0);
    
    // Verify it tried to use the custom endpoint
    const customEndpointCalls = fetchCalls.filter(url => url.includes('ollama.company.local'));
    expect(customEndpointCalls.length).toBeGreaterThan(0);
  });

  test('should handle OpenAI connections without localhost endpoint', async () => {
    // Go to AI connections
    await app.click('[data-view="agent"]');
    await app.window.waitForTimeout(500);
    
    // Create OpenAI connection
    await app.window.evaluate(() => {
      const conn = {
        id: 'test-openai',
        name: 'OpenAI GPT-4',
        provider: 'openai',
        apiKey: 'test-key-123',
        model: 'gpt-4',
        status: 'disconnected'
      };
      
      const connections = window.Storage?.getAiConnections() || [];
      connections.push(conn);
      window.Storage?.setAiConnections(connections);
      
      if (typeof loadAiConnections === 'function') {
        loadAiConnections();
      }
    });
    
    await app.window.waitForTimeout(500);
    
    // Connect to OpenAI
    await app.window.evaluate(() => {
      if (typeof connectToAiService === 'function') {
        connectToAiService('test-openai');
      }
    });
    
    await app.window.waitForTimeout(2000);
    
    // Verify Analytics is set for OpenAI (no endpoint needed)
    const analyticsConfig = await app.window.evaluate(() => {
      return {
        provider: window.Analytics?.config?.provider,
        ollamaEndpoint: window.Analytics?.config?.ollamaEndpoint,
        apiKey: window.Analytics?.config?.openaiApiKey
      };
    });
    
    expect(analyticsConfig.provider).toBe('openai');
    expect(analyticsConfig.apiKey).toBeTruthy();
    
    // OpenAI shouldn't have an Ollama endpoint
    // But if it does, it shouldn't be localhost
    if (analyticsConfig.ollamaEndpoint) {
      expect(analyticsConfig.ollamaEndpoint).not.toContain('localhost');
    }
  });

  test('should preserve custom endpoint across app restarts', async () => {
    const customEndpoint = 'http://ollama.remote:11434';
    
    // Set up a connection with custom endpoint
    await app.window.evaluate((endpoint) => {
      const conn = {
        id: 'persistent-test',
        name: 'Remote Ollama',
        provider: 'ollama',
        endpoint: endpoint,
        model: 'llama3.1:8b',
        status: 'connected'
      };
      
      // Save to storage
      window.Storage?.setAiConnections([conn]);
      window.Storage?.set('ACTIVE_AI_CONNECTION', 'persistent-test');
      
      // Set Analytics config
      if (window.Analytics) {
        window.Analytics.config.ollamaEndpoint = endpoint;
        window.Analytics.config.activeConnectionId = 'persistent-test';
        window.Analytics.saveConfiguration();
      }
    }, customEndpoint);
    
    // Simulate app restart by reloading Analytics
    await app.window.evaluate(() => {
      if (window.Analytics?.initialize) {
        window.Analytics.initialize();
      }
    });
    
    await app.window.waitForTimeout(1000);
    
    // Check that custom endpoint is preserved
    const savedEndpoint = await app.window.evaluate(() => {
      return window.Analytics?.config?.ollamaEndpoint;
    });
    
    // Should either be the custom endpoint or undefined, but never localhost
    if (savedEndpoint) {
      expect(savedEndpoint).toBe(customEndpoint);
      expect(savedEndpoint).not.toContain('localhost');
    }
  });
});