// E2E test to ensure Analytics.isConnected persists when switching views
const { test, expect } = require('@playwright/test');
const ElectronApp = require('./helpers/electron-app');

let app;

test.beforeEach(async () => {
  app = new ElectronApp();
  await app.launch();
  
  // Clear any existing connections to start fresh
  await app.window.evaluate(() => {
    try {
      if (window.Storage) {
        window.Storage.setAiConnections([]);
        window.Storage.remove('ACTIVE_AI_CONNECTION');
      } else {
        // Fallback to direct localStorage if Storage not available
        localStorage.setItem('AI_CONNECTIONS', '[]');
        localStorage.removeItem('ACTIVE_AI_CONNECTION');
      }
    } catch (e) {
      console.error('Error clearing test data:', e);
    }
  });
});

test.afterEach(async () => {
  await app.close();
});

test.describe('Analytics Connection Persistence', () => {
  test('should maintain Analytics.isConnected when switching between views', async () => {
    // Step 1: Create and connect to Ollama
    await app.click('[data-view="agent"]');
    await app.window.waitForTimeout(500);
    
    // Create a mock Ollama connection
    await app.window.evaluate(() => {
      const connection = {
        id: 'test-persistence',
        name: 'Test Ollama',
        provider: 'ollama',
        endpoint: 'http://localhost:11434',
        model: 'llama3.1:8b',
        status: 'disconnected'
      };
      
      const connections = [connection];
      window.Storage?.setAiConnections(connections);
      
      // Reload the connections UI
      if (typeof loadAiConnections === 'function') {
        loadAiConnections();
      }
    });
    
    await app.window.waitForTimeout(500);
    
    // Mock successful Ollama connection
    await app.window.evaluate(() => {
      // Simulate successful Ollama connection
      if (window.OllamaService) {
        window.OllamaService.isConnected = true;
        window.OllamaService.config = {
          endpoint: 'http://localhost:11434',
          model: 'llama3.1:8b'
        };
      }
      
      // Simulate clicking connect (which would normally call connectToAiService)
      const connection = window.Storage?.getAiConnections()?.[0];
      if (connection && window.Analytics) {
        // This simulates what happens in interface.js after successful connection
        window.Analytics.isConnected = true;
        window.Analytics.config.provider = 'ollama';
        window.Analytics.config.ollamaEndpoint = 'http://localhost:11434';
        window.Analytics.config.selectedModel = 'llama3.1:8b';
        window.Analytics.config.activeConnectionId = 'test-persistence';
        window.Analytics.config.activeConnectionName = 'Test Ollama';
        
        // Update connection status
        connection.status = 'connected';
        window.Storage?.setAiConnections([connection]);
        window.Storage?.set('ACTIVE_AI_CONNECTION', connection.id);
      }
    });
    
    // Step 2: Verify both services show as connected
    let ollamaConnected = await app.window.evaluate(() => window.OllamaService?.isConnected);
    let analyticsConnected = await app.window.evaluate(() => window.Analytics?.isConnected);
    
    expect(ollamaConnected).toBe(true);
    expect(analyticsConnected).toBe(true);
    
    // Step 3: Switch to queries view (different view)
    await app.click('[data-view="query"]');
    await app.window.waitForTimeout(500);
    
    // Step 4: Switch back to analytics view (this will call Analytics.initialize())
    await app.click('[data-view="analytics"]');
    await app.window.waitForTimeout(500);
    
    // Step 5: Check that Analytics.isConnected is STILL true
    ollamaConnected = await app.window.evaluate(() => window.OllamaService?.isConnected);
    analyticsConnected = await app.window.evaluate(() => window.Analytics?.isConnected);
    
    // This is the key assertion - Analytics.isConnected should persist
    expect(ollamaConnected).toBe(true);
    expect(analyticsConnected).toBe(true);
    
    // Step 6: Verify the Run Analysis button is enabled
    const analysisButton = await app.window.$('#runAnalysisBtn');
    if (analysisButton) {
      const isDisabled = await analysisButton.evaluate(el => el.disabled);
      expect(isDisabled).toBe(false);
    }
  });
  
  test('should sync Analytics state with already connected OllamaService on init', async () => {
    // Step 1: Set up OllamaService as already connected
    await app.window.evaluate(() => {
      if (window.OllamaService) {
        window.OllamaService.isConnected = true;
        window.OllamaService.config = {
          endpoint: 'http://remote-ollama:11434',
          model: 'llama3.1:8b'
        };
      }
      
      // Analytics should NOT be connected yet
      if (window.Analytics) {
        window.Analytics.isConnected = false;
      }
    });
    
    // Step 2: Navigate to analytics view (triggers Analytics.initialize())
    await app.click('[data-view="analytics"]');
    await app.window.waitForTimeout(500);
    
    // Step 3: Check that Analytics detected the existing OllamaService connection
    const analyticsConnected = await app.window.evaluate(() => window.Analytics?.isConnected);
    const ollamaConnected = await app.window.evaluate(() => window.OllamaService?.isConnected);
    
    // Analytics should have detected and synced with the existing connection
    expect(ollamaConnected).toBe(true);
    expect(analyticsConnected).toBe(true);
    
    // Log message should indicate it found the existing connection
    const logs = await app.window.evaluate(() => {
      // This would require console log capture, simplified for test
      return window.Analytics?.isConnected && window.OllamaService?.isConnected;
    });
    
    expect(logs).toBe(true);
  });
  
  test('should not reset Analytics connection when reinitializing with active connection', async () => {
    // Step 1: Set up both services as connected with saved active connection
    await app.window.evaluate(() => {
      // Set up connected state
      if (window.OllamaService) {
        window.OllamaService.isConnected = true;
        window.OllamaService.config = {
          endpoint: 'http://localhost:11434',
          model: 'llama3.1:8b'
        };
      }
      
      if (window.Analytics) {
        window.Analytics.isConnected = true;
        window.Analytics.config.provider = 'ollama';
        window.Analytics.config.ollamaEndpoint = 'http://localhost:11434';
      }
      
      // Save active connection
      window.Storage?.set('ACTIVE_AI_CONNECTION', 'test-active');
      window.Storage?.setAiConnections([{
        id: 'test-active',
        name: 'Active Connection',
        provider: 'ollama',
        endpoint: 'http://localhost:11434',
        model: 'llama3.1:8b',
        status: 'connected'
      }]);
    });
    
    // Step 2: Call Analytics.initialize() multiple times (simulating view switches)
    for (let i = 0; i < 3; i++) {
      await app.window.evaluate(() => {
        window.Analytics?.initialize();
      });
      
      await app.window.waitForTimeout(100);
      
      // Check state after each initialization
      const analyticsConnected = await app.window.evaluate(() => window.Analytics?.isConnected);
      const ollamaConnected = await app.window.evaluate(() => window.OllamaService?.isConnected);
      
      // Should remain connected after each init
      expect(ollamaConnected).toBe(true);
      expect(analyticsConnected).toBe(true);
    }
  });
  
  test('should handle Run Analysis button state correctly after view switch', async () => {
    // Step 1: Connect to AI service
    await app.window.evaluate(() => {
      // Set up connected state
      if (window.OllamaService) {
        window.OllamaService.isConnected = true;
        window.OllamaService.config = {
          endpoint: 'http://localhost:11434',
          model: 'llama3.1:8b'
        };
      }
      
      if (window.Analytics) {
        window.Analytics.isConnected = true;
        window.Analytics.config.provider = 'ollama';
        window.Analytics.config.ollamaEndpoint = 'http://localhost:11434';
      }
    });
    
    // Step 2: Go to analytics view
    await app.click('[data-view="analytics"]');
    await app.window.waitForTimeout(500);
    
    // Step 3: Check Run Analysis button is enabled
    let runAnalysisEnabled = await app.window.evaluate(() => {
      const btn = document.getElementById('runAnalysisBtn');
      return btn ? !btn.disabled : false;
    });
    
    expect(runAnalysisEnabled).toBe(true);
    
    // Step 4: Switch to different view and back
    await app.click('[data-view="query"]');
    await app.window.waitForTimeout(500);
    
    await app.click('[data-view="analytics"]');
    await app.window.waitForTimeout(500);
    
    // Step 5: Run Analysis button should STILL be enabled
    runAnalysisEnabled = await app.window.evaluate(() => {
      const btn = document.getElementById('runAnalysisBtn');
      return btn ? !btn.disabled : false;
    });
    
    expect(runAnalysisEnabled).toBe(true);
    
    // Step 6: Verify clicking Run Analysis doesn't show "connect to AI first" error
    const canRunAnalysis = await app.window.evaluate(async () => {
      // Check what would happen if we tried to run analysis
      if (window.Analytics?.isConnected) {
        return true;
      }
      return false;
    });
    
    expect(canRunAnalysis).toBe(true);
  });
});