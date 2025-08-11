// Unit test for Analytics.isConnected persistence across initializations

describe('Analytics Connection Persistence', function() {
    let Analytics;
    let originalOllamaService;
    let originalOpenAIService;
    
    beforeEach(function() {
        // Setup test environment
        require('../setup/test-setup');
        
        // Mock services
        originalOllamaService = global.OllamaService;
        originalOpenAIService = global.OpenAIService;
        
        global.OllamaService = {
            isConnected: false,
            config: {
                endpoint: null,
                model: null
            }
        };
        
        global.OpenAIService = {
            isConnected: false,
            config: {}
        };
        
        // Mock Storage
        global.Storage = {
            getAnalyticsConfig: jest.fn().mockReturnValue({}),
            setAnalyticsConfig: jest.fn(),
            getAiConnections: jest.fn().mockReturnValue([]),
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn()
        };
        
        // Load Analytics module fresh
        delete require.cache[require.resolve('../../public/js/analytics.js')];
        Analytics = require('../../public/js/analytics.js');
    });
    
    afterEach(function() {
        global.OllamaService = originalOllamaService;
        global.OpenAIService = originalOpenAIService;
    });
    
    it('should not reset isConnected when already connected during initialize', function() {
        // Set Analytics as connected
        Analytics.isConnected = true;
        Analytics.config.provider = 'ollama';
        Analytics.config.ollamaEndpoint = 'http://localhost:11434';
        
        // Set OllamaService as connected
        global.OllamaService.isConnected = true;
        global.OllamaService.config.endpoint = 'http://localhost:11434';
        
        // Call initialize (simulating view switch)
        Analytics.initialize();
        
        // Analytics.isConnected should still be true
        expect(Analytics.isConnected).toBe(true);
    });
    
    it('should detect existing OllamaService connection on first initialize', function() {
        // OllamaService already connected
        global.OllamaService.isConnected = true;
        global.OllamaService.config.endpoint = 'http://remote:11434';
        
        // Analytics not yet connected
        Analytics.isConnected = false;
        
        // Initialize Analytics
        Analytics.initialize();
        
        // Should detect and sync with OllamaService
        expect(Analytics.isConnected).toBe(true);
    });
    
    it('should detect existing OpenAIService connection on first initialize', function() {
        // OpenAIService already connected
        global.OpenAIService.isConnected = true;
        
        // Analytics not yet connected
        Analytics.isConnected = false;
        
        // Initialize Analytics
        Analytics.initialize();
        
        // Should detect and sync with OpenAIService
        expect(Analytics.isConnected).toBe(true);
    });
    
    it('should remain disconnected if no services are connected', function() {
        // Both services disconnected
        global.OllamaService.isConnected = false;
        global.OpenAIService.isConnected = false;
        
        // Analytics disconnected
        Analytics.isConnected = false;
        
        // Initialize Analytics
        Analytics.initialize();
        
        // Should remain disconnected
        expect(Analytics.isConnected).toBe(false);
    });
    
    it('should persist connection state across multiple initializations', function() {
        // Set up connected state
        Analytics.isConnected = true;
        global.OllamaService.isConnected = true;
        
        // Call initialize multiple times (simulating multiple view switches)
        for (let i = 0; i < 5; i++) {
            Analytics.initialize();
            expect(Analytics.isConnected).toBe(true);
        }
    });
    
    it('should handle mixed service states correctly', function() {
        // OllamaService connected, OpenAI not
        global.OllamaService.isConnected = true;
        global.OpenAIService.isConnected = false;
        
        Analytics.isConnected = false;
        
        // Initialize should detect Ollama connection
        Analytics.initialize();
        expect(Analytics.isConnected).toBe(true);
        
        // Disconnect Ollama, connect OpenAI
        global.OllamaService.isConnected = false;
        global.OpenAIService.isConnected = true;
        
        // Re-initialize should maintain connection
        Analytics.initialize();
        expect(Analytics.isConnected).toBe(true);
    });
});

// Export for test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}