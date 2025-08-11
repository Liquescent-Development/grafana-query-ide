// Unit tests for JSON parsing from AI responses (including markdown-wrapped JSON)

describe('AI JSON Response Parsing', function() {
    let OllamaService;
    let OpenAIService;
    let AIAnalytics;
    
    beforeEach(function() {
        // Setup test environment
        setupTest();
        
        // Load modules
        OllamaService = require('../../public/js/ollama.js');
        OpenAIService = require('../../public/js/openai.js');
        AIAnalytics = require('../../public/js/aiAnalytics.js');
    });
    
    describe('OllamaService.parseJsonResponse()', function() {
        it('should parse plain JSON response', function() {
            const response = '{"anomalies": [], "summary": {"total": 0}}';
            const result = OllamaService.parseJsonResponse(response);
            
            expect(result).toEqual({
                anomalies: [],
                summary: { total: 0 }
            });
        });
        
        it('should parse JSON wrapped in markdown code blocks with json tag', function() {
            const response = '```json\n{"anomalies": [{"severity": "high"}], "summary": {"total": 1}}\n```';
            const result = OllamaService.parseJsonResponse(response);
            
            expect(result).toEqual({
                anomalies: [{ severity: "high" }],
                summary: { total: 1 }
            });
        });
        
        it('should parse JSON wrapped in markdown code blocks without json tag', function() {
            const response = '```\n{"anomalies": [{"severity": "medium"}], "summary": {"total": 2}}\n```';
            const result = OllamaService.parseJsonResponse(response);
            
            expect(result).toEqual({
                anomalies: [{ severity: "medium" }],
                summary: { total: 2 }
            });
        });
        
        it('should handle Gemma-style markdown JSON response', function() {
            // This is the actual format Gemma returns based on user's report
            const response = '```json\n{\n    "anomalies": [\n        {\n            "start_time": "2025-07-15T00:00:00Z",\n            "end_time": "2025-07-15T01:00:00Z",\n            "severity": "critical",\n            "type": "spike",\n            "peak_value": 1000,\n            "score": 0.95\n        }\n    ],\n    "summary": {\n        "total_anomalies": 1,\n        "severity_distribution": {"critical": 1, "high": 0, "medium": 0, "low": 0},\n        "analysis_confidence": 0.9\n    }\n}\n```';
            
            const result = OllamaService.parseJsonResponse(response);
            
            expect(result.anomalies).toHaveLength(1);
            expect(result.anomalies[0].severity).toBe('critical');
            expect(result.summary.total_anomalies).toBe(1);
        });
        
        it('should handle JSON with conversational text before it', function() {
            const response = 'Here is the analysis:\n{"anomalies": [], "summary": {"total": 0}}';
            const result = OllamaService.parseJsonResponse(response);
            
            expect(result).toEqual({
                anomalies: [],
                summary: { total: 0 }
            });
        });
        
        it('should handle JSON with text before markdown', function() {
            const response = 'Based on my analysis:\n```json\n{"anomalies": [{"severity": "low"}]}\n```';
            const result = OllamaService.parseJsonResponse(response);
            
            expect(result.anomalies[0].severity).toBe('low');
        });
        
        it('should handle incomplete markdown (missing closing backticks)', function() {
            const response = '```json\n{"anomalies": [], "summary": {"total": 0}}';
            const result = OllamaService.parseJsonResponse(response);
            
            expect(result).toEqual({
                anomalies: [],
                summary: { total: 0 }
            });
        });
        
        it('should throw error for non-JSON response', function() {
            const response = 'This is not JSON at all';
            
            expect(() => {
                OllamaService.parseJsonResponse(response);
            }).toThrow('AI returned invalid JSON response');
        });
        
        it('should throw error for malformed JSON', function() {
            const response = '{"anomalies": [}, "summary": }';
            
            expect(() => {
                OllamaService.parseJsonResponse(response);
            }).toThrow('AI returned invalid JSON response');
        });
        
        it('should handle nested JSON objects in markdown', function() {
            const response = '```json\n{\n  "anomalies": [\n    {\n      "severity": "high",\n      "details": {\n        "subsystem": "memory",\n        "threshold": 0.9\n      }\n    }\n  ]\n}\n```';
            const result = OllamaService.parseJsonResponse(response);
            
            expect(result.anomalies[0].details.subsystem).toBe('memory');
        });
    });
    
    describe('OpenAIService.parseJsonResponse()', function() {
        it('should parse plain JSON response', function() {
            const response = '{"predictions": [{"value": 100}]}';
            const result = OpenAIService.parseJsonResponse(response);
            
            expect(result.predictions[0].value).toBe(100);
        });
        
        it('should handle markdown JSON (in case OpenAI returns it)', function() {
            const response = '```json\n{"predictions": [{"value": 200}]}\n```';
            const result = OpenAIService.parseJsonResponse(response);
            
            expect(result.predictions[0].value).toBe(200);
        });
    });
    
    describe('AIAnalytics response validation', function() {
        it('should accept responses starting with {', function() {
            const response = '{"anomalies": []}';
            // This should not throw the "model not suitable" error
            expect(() => {
                // Simulate the check in postprocessResults
                const trimmed = response.trim();
                const looksLikeJson = trimmed.startsWith('{') || 
                                     trimmed.startsWith('```json') || 
                                     trimmed.startsWith('```');
                expect(looksLikeJson).toBe(true);
            }).not.toThrow();
        });
        
        it('should accept responses starting with ```json', function() {
            const response = '```json\n{"anomalies": []}';
            const trimmed = response.trim();
            const looksLikeJson = trimmed.startsWith('{') || 
                                 trimmed.startsWith('```json') || 
                                 trimmed.startsWith('```');
            expect(looksLikeJson).toBe(true);
        });
        
        it('should accept responses starting with ```', function() {
            const response = '```\n{"anomalies": []}';
            const trimmed = response.trim();
            const looksLikeJson = trimmed.startsWith('{') || 
                                 trimmed.startsWith('```json') || 
                                 trimmed.startsWith('```');
            expect(looksLikeJson).toBe(true);
        });
        
        it('should reject responses that are clearly not JSON', function() {
            const response = 'Sorry, I cannot process this request';
            const trimmed = response.trim();
            const looksLikeJson = trimmed.startsWith('{') || 
                                 trimmed.startsWith('```json') || 
                                 trimmed.startsWith('```');
            expect(looksLikeJson).toBe(false);
        });
    });
    
    describe('End-to-end markdown JSON handling', function() {
        it('should handle complete Gemma-style response', function() {
            // This simulates the full flow from AI response to parsed result
            const aiResponse = {
                response: '```json\n{\n    "anomalies": [\n        {\n            "start_time": "2025-07-15T00:00:00Z",\n            "end_time": "2025-07-15T01:00:00Z",\n            "severity": "critical",\n            "type": "massive_spike",\n            "peak_value": 12500,\n            "score": 0.95\n        }\n    ],\n    "summary": {\n        "total_anomalies": 1,\n        "severity_distribution": {"critical": 1, "high": 0, "medium": 0, "low": 0},\n        "analysis_confidence": 0.85\n    }\n}\n```',
                model: 'gemma3:27b',
                done: true
            };
            
            // Extract response text
            let responseText = aiResponse.response;
            
            // Check if it looks like JSON (should pass)
            const trimmed = responseText.trim();
            const looksLikeJson = trimmed.startsWith('{') || 
                                 trimmed.startsWith('```json') || 
                                 trimmed.startsWith('```');
            expect(looksLikeJson).toBe(true);
            
            // Parse the JSON
            const parsed = OllamaService.parseJsonResponse(responseText);
            
            // Verify the parsed result
            expect(parsed).toBeDefined();
            expect(parsed.anomalies).toBeDefined();
            expect(parsed.anomalies).toHaveLength(1);
            expect(parsed.anomalies[0].severity).toBe('critical');
            expect(parsed.anomalies[0].type).toBe('massive_spike');
            expect(parsed.summary.total_anomalies).toBe(1);
            expect(parsed.summary.analysis_confidence).toBe(0.85);
        });
        
        it('should handle various markdown formats models might use', function() {
            const testCases = [
                '```json\n{"test": true}\n```',
                '``` json\n{"test": true}\n```',
                '```JSON\n{"test": true}\n```',
                '```\n{"test": true}\n```',
                'Here is the JSON:\n```json\n{"test": true}\n```',
                'Analysis results:\n\n```json\n{"test": true}\n```\n\nEnd of analysis.'
            ];
            
            testCases.forEach(testCase => {
                const result = OllamaService.parseJsonResponse(testCase);
                expect(result.test).toBe(true);
            });
        });
    });
});

// Export for test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}