// Debug script to check AI connection state
// Run in browser console to diagnose connection issues

function debugAIConnection() {
    console.group('🔍 AI Connection Debug Info');
    
    // Check Ollama Service
    console.group('Ollama Service:');
    console.log('Exists:', typeof window.OllamaService !== 'undefined');
    if (window.OllamaService) {
        console.log('isConnected:', window.OllamaService.isConnected);
        console.log('config:', window.OllamaService.config);
        console.log('lastError:', window.OllamaService.lastError);
    }
    console.groupEnd();
    
    // Check OpenAI Service
    console.group('OpenAI Service:');
    console.log('Exists:', typeof window.OpenAIService !== 'undefined');
    if (window.OpenAIService) {
        console.log('isConnected:', window.OpenAIService.isConnected);
        console.log('config:', window.OpenAIService.config);
    }
    console.groupEnd();
    
    // Check Analytics
    console.group('Analytics:');
    console.log('Exists:', typeof window.Analytics !== 'undefined');
    if (window.Analytics) {
        console.log('isConnected:', window.Analytics.isConnected);
        console.log('config.provider:', window.Analytics.config?.provider);
        console.log('config.ollamaEndpoint:', window.Analytics.config?.ollamaEndpoint);
        console.log('config.selectedModel:', window.Analytics.config?.selectedModel);
    }
    console.groupEnd();
    
    // Check Storage
    console.group('Storage:');
    const activeConnectionId = window.Storage?.get('ACTIVE_AI_CONNECTION');
    console.log('Active Connection ID:', activeConnectionId);
    
    const aiConnections = window.Storage?.getAiConnections();
    console.log('AI Connections:', aiConnections);
    
    if (activeConnectionId && aiConnections) {
        const activeConn = aiConnections.find(c => c.id === activeConnectionId);
        console.log('Active Connection Details:', activeConn);
    }
    console.groupEnd();
    
    // Check AIAnalytics
    console.group('AIAnalytics:');
    console.log('Exists:', typeof window.AIAnalytics !== 'undefined');
    if (window.AIAnalytics) {
        console.log('config:', window.AIAnalytics.config);
    }
    console.groupEnd();
    
    console.groupEnd();
    
    // Test connection
    console.log('\n📝 To test Ollama connection manually, run:');
    console.log('await OllamaService.initialize("http://localhost:11434", "llama3.1:8b")');
    console.log('// Then check: OllamaService.isConnected');
}

// Auto-run
debugAIConnection();

// Export for reuse
window.debugAIConnection = debugAIConnection;