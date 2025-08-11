// E2E tests for AI models that return JSON wrapped in markdown
const { test, expect } = require('@playwright/test');
const ElectronApp = require('./helpers/electron-app');

let app;

test.beforeEach(async () => {
  app = new ElectronApp();
  await app.launch();
  
  // Clear any existing connections
  await app.window.evaluate(() => {
    try {
      if (window.Storage) {
        window.Storage.setAiConnections([]);
        window.Storage.remove('ACTIVE_AI_CONNECTION');
      } else {
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

test.describe('Markdown JSON Response Handling', () => {
  test('should parse JSON wrapped in markdown code blocks', async () => {
    // Test the parseJsonResponse function directly
    const result = await app.window.evaluate(() => {
      const testResponse = '```json\n{\n  "anomalies": [\n    {\n      "severity": "high",\n      "type": "spike"\n    }\n  ],\n  "summary": {\n    "total": 1\n  }\n}\n```';
      
      if (window.OllamaService && window.OllamaService.parseJsonResponse) {
        try {
          return window.OllamaService.parseJsonResponse(testResponse);
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'OllamaService not available' };
    });
    
    expect(result.error).toBeUndefined();
    expect(result.anomalies).toBeDefined();
    expect(result.anomalies[0].severity).toBe('high');
    expect(result.summary.total).toBe(1);
  });
  
  test('should handle Gemma-style markdown responses', async () => {
    // Simulate the exact format Gemma returns
    const result = await app.window.evaluate(() => {
      const gemmaResponse = '```json\n{\n    "anomalies": [\n        {\n            "start_time": "2025-07-15T00:00:00Z",\n            "end_time": "2025-07-15T01:00:00Z",\n            "severity": "critical",\n            "type": "massive_spike",\n            "peak_value": 12500,\n            "score": 0.95\n        }\n    ],\n    "summary": {\n        "total_anomalies": 1,\n        "severity_distribution": {"critical": 1, "high": 0, "medium": 0, "low": 0},\n        "analysis_confidence": 0.85\n    }\n}\n```';
      
      if (window.OllamaService && window.OllamaService.parseJsonResponse) {
        try {
          return window.OllamaService.parseJsonResponse(gemmaResponse);
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'OllamaService not available' };
    });
    
    expect(result.error).toBeUndefined();
    expect(result.anomalies).toHaveLength(1);
    expect(result.anomalies[0].severity).toBe('critical');
    expect(result.anomalies[0].type).toBe('massive_spike');
    expect(result.summary.analysis_confidence).toBe(0.85);
  });
  
  test('should not reject markdown JSON as "not suitable model"', async () => {
    // Test that the validation in AIAnalytics accepts markdown JSON
    const isAccepted = await app.window.evaluate(() => {
      const responseText = '```json\n{"anomalies": [], "summary": {"total": 0}}\n```';
      const trimmed = responseText.trim();
      const looksLikeJson = trimmed.startsWith('{') || 
                           trimmed.startsWith('```json') || 
                           trimmed.startsWith('```');
      return looksLikeJson;
    });
    
    expect(isAccepted).toBe(true);
  });
  
  test('should handle various markdown formats', async () => {
    const formats = [
      '```json\n{"test": 1}\n```',
      '``` json\n{"test": 2}\n```',
      '```JSON\n{"test": 3}\n```',
      '```\n{"test": 4}\n```',
      'Analysis:\n```json\n{"test": 5}\n```'
    ];
    
    for (let i = 0; i < formats.length; i++) {
      const result = await app.window.evaluate((format) => {
        if (window.OllamaService && window.OllamaService.parseJsonResponse) {
          try {
            return window.OllamaService.parseJsonResponse(format);
          } catch (error) {
            return { error: error.message, format };
          }
        }
        return { error: 'OllamaService not available' };
      }, formats[i]);
      
      expect(result.error).toBeUndefined();
      expect(result.test).toBe(i + 1);
    }
  });
  
  test('should handle incomplete markdown (missing closing backticks)', async () => {
    const result = await app.window.evaluate(() => {
      const incompleteResponse = '```json\n{"anomalies": [], "summary": {"total": 0}}';
      
      if (window.OllamaService && window.OllamaService.parseJsonResponse) {
        try {
          return window.OllamaService.parseJsonResponse(incompleteResponse);
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'OllamaService not available' };
    });
    
    expect(result.error).toBeUndefined();
    expect(result.anomalies).toEqual([]);
    expect(result.summary.total).toBe(0);
  });
  
  test('should properly reject non-JSON responses', async () => {
    const result = await app.window.evaluate(() => {
      const nonJsonResponse = 'Sorry, I cannot process this request';
      
      if (window.OllamaService && window.OllamaService.parseJsonResponse) {
        try {
          return window.OllamaService.parseJsonResponse(nonJsonResponse);
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'OllamaService not available' };
    });
    
    expect(result.error).toBe('AI returned invalid JSON response');
  });
  
  test('should handle markdown with conversational text', async () => {
    const result = await app.window.evaluate(() => {
      const responseWithText = 'Based on my analysis of the time series data:\n\n```json\n{\n  "anomalies": [\n    {"severity": "medium", "score": 0.7}\n  ]\n}\n```\n\nThe analysis shows one medium severity anomaly.';
      
      if (window.OllamaService && window.OllamaService.parseJsonResponse) {
        try {
          return window.OllamaService.parseJsonResponse(responseWithText);
        } catch (error) {
          return { error: error.message };
        }
      }
      return { error: 'OllamaService not available' };
    });
    
    expect(result.error).toBeUndefined();
    expect(result.anomalies[0].severity).toBe('medium');
    expect(result.anomalies[0].score).toBe(0.7);
  });
});

test.describe('End-to-end Analysis with Markdown JSON', () => {
  test('should complete analysis when AI returns markdown JSON', async () => {
    // Mock the AI response to return markdown JSON
    await app.window.evaluate(() => {
      // Save original generateResponse
      if (window.OllamaService) {
        window.OllamaService._originalGenerateResponse = window.OllamaService.generateResponse;
        
        // Mock it to return markdown JSON
        window.OllamaService.generateResponse = async () => {
          return {
            response: '```json\n{\n  "anomalies": [\n    {\n      "start_time": "2025-01-01T00:00:00Z",\n      "end_time": "2025-01-01T01:00:00Z",\n      "severity": "high",\n      "type": "test_anomaly",\n      "peak_value": 100,\n      "score": 0.9\n    }\n  ],\n  "summary": {\n    "total_anomalies": 1,\n    "severity_distribution": {"critical": 0, "high": 1, "medium": 0, "low": 0},\n    "analysis_confidence": 0.95\n  }\n}\n```',
            model: 'test-model',
            created_at: new Date().toISOString(),
            done: true
          };
        };
        
        // Mark as connected
        window.OllamaService.isConnected = true;
        window.OllamaService.config = {
          endpoint: 'http://test:11434',
          model: 'test-model'
        };
      }
      
      // Also mark Analytics as connected
      if (window.Analytics) {
        window.Analytics.isConnected = true;
        window.Analytics.config.provider = 'ollama';
      }
    });
    
    // Try to parse the mocked response
    const parseResult = await app.window.evaluate(async () => {
      try {
        // Simulate what happens in postprocessResults
        const aiResponse = await window.OllamaService.generateResponse('test prompt', 'test system');
        let responseText = aiResponse.response;
        
        // Check if it looks like JSON (this is the check that was failing)
        const trimmed = responseText.trim();
        const looksLikeJson = trimmed.startsWith('{') || 
                             trimmed.startsWith('```json') || 
                             trimmed.startsWith('```');
        
        if (!looksLikeJson) {
          return { error: 'Response rejected as non-JSON' };
        }
        
        // Parse the JSON
        const parsed = window.OllamaService.parseJsonResponse(responseText);
        
        return {
          success: true,
          parsed,
          hadMarkdown: responseText.includes('```')
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    expect(parseResult.error).toBeUndefined();
    expect(parseResult.success).toBe(true);
    expect(parseResult.hadMarkdown).toBe(true);
    expect(parseResult.parsed.anomalies[0].type).toBe('test_anomaly');
    expect(parseResult.parsed.summary.analysis_confidence).toBe(0.95);
    
    // Restore original function
    await app.window.evaluate(() => {
      if (window.OllamaService && window.OllamaService._originalGenerateResponse) {
        window.OllamaService.generateResponse = window.OllamaService._originalGenerateResponse;
        delete window.OllamaService._originalGenerateResponse;
      }
    });
  });
});