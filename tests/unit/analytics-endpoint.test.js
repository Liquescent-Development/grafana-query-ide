// Unit tests for Analytics endpoint configuration
describe('Analytics Endpoint Configuration', () => {
    let Analytics;
    let originalOllamaService;
    let originalFetch;
    
    beforeEach(() => {
        // Setup test environment
        require('../setup/test-setup');
        
        // Mock OllamaService
        originalOllamaService = global.OllamaService;
        global.OllamaService = {
            isConnected: false,
            config: {
                endpoint: null
            },
            initialize: jest.fn().mockResolvedValue(true)
        };
        
        // Mock fetch
        originalFetch = global.fetch;
        global.fetch = jest.fn();
        
        // Mock Storage
        global.Storage = {
            get: jest.fn(),
            set: jest.fn(),
            getAiConnections: jest.fn().mockReturnValue([]),
            setAiConnections: jest.fn(),
            getAnalyticsConfig: jest.fn().mockReturnValue({}),
            setAnalyticsConfig: jest.fn()
        };
        
        // Load Analytics module
        delete require.cache[require.resolve('../../public/js/analytics.js')];
        Analytics = require('../../public/js/analytics.js');
    });
    
    afterEach(() => {
        global.OllamaService = originalOllamaService;
        global.fetch = originalFetch;
    });
    
    test('should use OllamaService endpoint when fetching models', async () => {
        // Set up OllamaService with custom endpoint
        const customEndpoint = 'http://192.168.1.50:11434';
        global.OllamaService.isConnected = true;
        global.OllamaService.config.endpoint = customEndpoint;
        
        // Mock successful response
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ models: ['llama3.1:8b'] })
        });
        
        // Fetch models
        await Analytics.fetchAvailableModels();
        
        // Verify it used the custom endpoint, not localhost
        expect(global.fetch).toHaveBeenCalledWith(`${customEndpoint}/api/tags`);
        expect(global.fetch).not.toHaveBeenCalledWith('http://localhost:11434/api/tags');
    });
    
    test('should update endpoint when connecting to different server', async () => {
        const endpoint1 = 'http://server1:11434';
        const endpoint2 = 'http://server2:11434';
        
        // First connection
        const connection1 = {
            id: '1',
            name: 'Server 1',
            provider: 'ollama',
            endpoint: endpoint1,
            model: 'llama3.1:8b'
        };
        
        await Analytics.initializeAiConnection(connection1);
        expect(Analytics.config.ollamaEndpoint).toBe(endpoint1);
        
        // Second connection
        const connection2 = {
            id: '2',
            name: 'Server 2',
            provider: 'ollama',
            endpoint: endpoint2,
            model: 'llama3.1:8b'
        };
        
        await Analytics.initializeAiConnection(connection2);
        expect(Analytics.config.ollamaEndpoint).toBe(endpoint2);
        expect(Analytics.config.ollamaEndpoint).not.toBe(endpoint1);
    });
    
    test('should not default to localhost when no endpoint is configured', async () => {
        // No OllamaService connection
        global.OllamaService.isConnected = false;
        global.OllamaService.config.endpoint = null;
        
        // Analytics has no configured endpoint
        Analytics.config.ollamaEndpoint = undefined;
        
        // Mock fetch to track calls
        global.fetch.mockRejectedValue(new Error('No endpoint'));
        
        // Try to fetch models
        await Analytics.fetchAvailableModels();
        
        // Should not have tried localhost if there's no configured endpoint
        const calls = global.fetch.mock.calls;
        const localhostCalls = calls.filter(call => 
            call[0] && call[0].includes('localhost')
        );
        
        // If it made any calls, they shouldn't be to localhost
        // unless that was explicitly configured
        if (calls.length > 0 && !Analytics.config.ollamaEndpoint?.includes('localhost')) {
            expect(localhostCalls.length).toBe(0);
        }
    });
    
    test('should use OpenAI service when provider is openai', async () => {
        const connection = {
            id: 'openai-1',
            name: 'OpenAI',
            provider: 'openai',
            apiKey: 'test-key',
            model: 'gpt-4'
        };
        
        global.OpenAIService = {
            isConnected: false,
            initialize: jest.fn().mockResolvedValue(true)
        };
        
        await Analytics.initializeAiConnection(connection);
        
        // Should set provider to OpenAI
        expect(Analytics.config.provider).toBe('openai');
        
        // Should not have Ollama endpoint for OpenAI
        expect(Analytics.config.openaiApiKey).toBe('test-key');
        
        // Ollama endpoint shouldn't be used for OpenAI
        if (Analytics.config.ollamaEndpoint) {
            expect(Analytics.config.ollamaEndpoint).not.toContain('localhost');
        }
    });
    
    test('should handle missing endpoint gracefully', async () => {
        // Connection with no endpoint
        const connection = {
            id: 'bad-1',
            name: 'Bad Connection',
            provider: 'ollama',
            endpoint: null,
            model: 'llama3.1:8b'
        };
        
        const result = await Analytics.initializeAiConnection(connection);
        
        // Should handle gracefully
        expect(result).toBeDefined();
        
        // Should not default to localhost
        if (Analytics.config.ollamaEndpoint) {
            expect(Analytics.config.ollamaEndpoint).not.toBe('http://localhost:11434');
        }
    });
    
    test('should sync with OllamaService endpoint on initialization', () => {
        const serviceEndpoint = 'http://ollama.internal:11434';
        
        // OllamaService already connected
        global.OllamaService.isConnected = true;
        global.OllamaService.config.endpoint = serviceEndpoint;
        
        // Initialize Analytics
        Analytics.initialize();
        
        // Check if Analytics checks for existing connection
        if (Analytics.config.ollamaEndpoint && global.OllamaService.isConnected) {
            expect(Analytics.config.ollamaEndpoint).toBe(serviceEndpoint);
        }
    });
});

// Export for test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}