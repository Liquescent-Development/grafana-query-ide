// Ollama Service Client
// Handles communication with Ollama endpoints for AI/ML analytics

const OllamaService = {
    // Configuration and connection management
    config: {
        endpoint: null, // User-provided endpoint
        model: 'llama3.1:8b-instruct-q4_K_M', // Default recommended model
        timeout: 600000, // 10 minute default timeout for AI analysis (configurable per connection)
        connectionTimeout: 5000, // 5 second timeout for connection tests
        maxRetries: 3,
        retryDelay: 1000 // 1 second initial retry delay
    },

    // Connection status
    isConnected: false,
    lastError: null,

    // Initialize and validate Ollama connection
    async initialize(endpoint, model = null) {
        console.log('🤖 Initializing Ollama service...', { endpoint, model });
        
        this.config.endpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash
        if (model) this.config.model = model;
        
        try {
            // Test basic connection
            const isConnected = await this.testConnection();
            if (!isConnected) {
                throw new Error('Cannot connect to Ollama endpoint. Please verify the URL and that Ollama is running.');
            }
            
            // Check if required model is available
            const modelExists = await this.checkModelAvailability();
            if (!modelExists) {
                throw new Error(`Model "${this.config.model}" not found. Please run: ollama pull ${this.config.model}`);
            }
            
            this.isConnected = true;
            this.lastError = null;
            console.log('✅ Ollama service initialized successfully');
            
            // Update title bar status when connected
            if (window.Analytics && typeof window.Analytics.updateTitleBarStatus === 'function') {
                window.Analytics.updateTitleBarStatus();
            }
            
            return true;
            
        } catch (error) {
            this.isConnected = false;
            this.lastError = error.message;
            console.error('❌ Ollama initialization failed:', error);
            
            // Update title bar status when disconnected
            if (window.Analytics && typeof window.Analytics.updateTitleBarStatus === 'function') {
                window.Analytics.updateTitleBarStatus();
            }
            
            throw error;
        }
    },

    // Test Ollama connection
    async testConnection() {
        try {
            console.log('🔍 Testing Ollama connection to:', this.config.endpoint);
            
            // Create abort controller with compatibility check
            const abortController = this.createAbortController();
            const timeoutId = setTimeout(() => abortController.abort(), this.config.connectionTimeout);
            
            const response = await fetch(`${this.config.endpoint}/api/tags`, {
                method: 'GET',
                signal: abortController.signal
            });
            
            clearTimeout(timeoutId);
            
            const isOk = response.ok;
            console.log('🔗 Connection test result:', isOk ? 'SUCCESS' : 'FAILED');
            return isOk;
            
        } catch (error) {
            console.error('🔗 Connection test failed:', error.message);
            return false;
        }
    },

    // Check if required model is available
    async checkModelAvailability() {
        try {
            console.log('🔍 Checking model availability:', this.config.model);
            const response = await fetch(`${this.config.endpoint}/api/tags`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }
            
            const data = await response.json();
            const models = data.models || [];
            const modelExists = models.some(model => model.name === this.config.model);
            
            console.log('📋 Available models:', models.map(m => m.name));
            console.log('✓ Model availability check:', modelExists ? 'FOUND' : 'NOT FOUND');
            
            return modelExists;
            
        } catch (error) {
            console.error('📋 Model availability check failed:', error);
            return false;
        }
    },

    // Get list of available models
    async getAvailableModels() {
        try {
            const response = await fetch(`${this.config.endpoint}/api/tags`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }
            
            const data = await response.json();
            return data.models || [];
            
        } catch (error) {
            console.error('Failed to get available models:', error);
            return [];
        }
    },

    // Core inference method with retry logic
    async generateResponse(prompt, systemPrompt = null, options = {}, customTimeout = null, imageData = null) {
        if (!this.isConnected) {
            throw new Error('Ollama service not connected. Please initialize first.');
        }

        const requestBody = {
            model: this.config.model,
            prompt: prompt,
            system: systemPrompt,
            stream: false,
            options: {
                temperature: options.temperature || 0.1, // Low temperature for analytical tasks
                ...(options.num_predict !== -1 && { num_predict: options.num_predict || 4096 }), // -1 means infinite (omit parameter)
                top_p: options.top_p || 0.9,
                num_ctx: options.num_ctx || 8192, // Default 8192 tokens for context
                ...options
            }
        };

        // Add image data for vision models
        if (imageData) {
            // Convert base64 image to the format expected by Ollama
            const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
            requestBody.images = [base64Data];
            console.log('📸 Adding image data for vision model analysis');
            console.log('🖼️ Image data preview (first 100 chars):', imageData.substring(0, 100) + '...');
            console.log('📏 Image data length:', imageData.length);
        }

        console.log('🧠 Generating AI response...', {
            model: this.config.model,
            promptLength: prompt.length,
            hasSystem: !!systemPrompt,
            hasImages: !!imageData,
            options: requestBody.options
        });
        
        // Debug: Log the full prompt being sent
        console.log('📝 Full prompt being sent to model:');
        console.log('===== PROMPT START =====');
        console.log(prompt);
        console.log('===== PROMPT END =====');
        if (systemPrompt) {
            console.log('🎯 System prompt:');
            console.log('===== SYSTEM PROMPT START =====');
            console.log(systemPrompt);
            console.log('===== SYSTEM PROMPT END =====');
        }

        let lastError;
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const abortController = this.createAbortController();
                const timeoutMs = customTimeout || this.config.timeout;
                const timeoutId = setTimeout(() => {
                    console.log(`⏰ Request timeout after ${timeoutMs}ms on attempt ${attempt}`);
                    abortController.abort();
                }, timeoutMs);
                
                const response = await fetch(`${this.config.endpoint}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    signal: abortController.signal
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (!data.response) {
                    throw new Error('Empty response from Ollama');
                }
                
                // Check if response is complete
                if (data.done === false) {
                    console.warn('⚠️ Received incomplete response from Ollama (done: false)');
                    throw new Error('Incomplete response from model - the response was truncated. Try reducing the request size or increasing num_predict.');
                }

                console.log('✅ AI response generated successfully', {
                    responseLength: data.response.length,
                    attempt: attempt,
                    done: data.done
                });

                return {
                    response: data.response,
                    model: data.model,
                    created_at: data.created_at,
                    done: data.done,
                    total_duration: data.total_duration,
                    load_duration: data.load_duration,
                    prompt_eval_count: data.prompt_eval_count,
                    eval_count: data.eval_count
                };

            } catch (error) {
                lastError = error;
                
                // Handle different error types
                if (error.name === 'AbortError') {
                    const timeoutMs = customTimeout || this.config.timeout;
                    console.warn(`⏰ Request timed out on attempt ${attempt} after ${timeoutMs}ms`);
                    lastError = new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
                } else {
                    console.warn(`🔄 Generation attempt ${attempt} failed:`, error.message);
                }
                
                if (attempt < this.config.maxRetries) {
                    const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('❌ All generation attempts failed');
                }
            }
        }

        // If we get here, all retries failed
        this.lastError = lastError.message;
        throw new Error(`AI generation failed after ${this.config.maxRetries} attempts: ${lastError.message}`);
    },

    // Validate and parse JSON response from AI
    parseJsonResponse(response) {
        let cleanResponse;  // Declare at function scope
        
        try {
            cleanResponse = response;
            
            // Method 1: Check if response contains markdown code blocks with JSON
            // Pattern: ```json { ... } ``` or ```json\n{ ... }\n```
            const markdownJsonMatch = cleanResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (markdownJsonMatch) {
                console.log('📋 Found JSON in markdown code block');
                return JSON.parse(markdownJsonMatch[1]);
            }
            
            // Method 2: Remove all markdown code block markers and try to extract JSON
            // This handles cases where the closing ``` might be missing
            cleanResponse = cleanResponse.replace(/```(?:json)?\s*/g, '').replace(/```/g, '');
            
            
            // Method 3: Try to extract JSON object from the cleaned response
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log('📋 Found JSON after cleaning markdown');
                return JSON.parse(jsonMatch[0]);
            }
            
            // Method 4: Check if response starts with conversational text before JSON
            // Some models might say something like "Here's the analysis:" before the JSON
            const lines = cleanResponse.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('{')) {
                    // Found potential JSON start, take from here to end
                    const jsonText = lines.slice(i).join('\n');
                    const extractedJson = jsonText.match(/\{[\s\S]*\}/);
                    if (extractedJson) {
                        console.log('📋 Found JSON after conversational text');
                        return JSON.parse(extractedJson[0]);
                    }
                }
            }
            
            // Method 5: Last resort - try parsing the entire cleaned response
            console.log('📋 Attempting to parse entire response as JSON');
            return JSON.parse(cleanResponse);
            
        } catch (error) {
            console.error('Failed to parse JSON response:', error);
            console.log('Raw response:', response);
            if (typeof cleanResponse !== 'undefined') {
                console.log('Cleaned response attempt:', cleanResponse);
            }
            throw new Error('AI returned invalid JSON response');
        }
    },

    // Get service status for UI display
    getStatus() {
        return {
            connected: this.isConnected,
            endpoint: this.config.endpoint,
            model: this.config.model,
            lastError: this.lastError
        };
    },

    // Disconnect and cleanup
    disconnect() {
        this.isConnected = false;
        this.lastError = null;
        console.log('🔌 Ollama service disconnected');
        
        // Update title bar status when disconnected
        if (window.Analytics && typeof window.Analytics.updateTitleBarStatus === 'function') {
            window.Analytics.updateTitleBarStatus();
        }
    },

    // Create AbortController with compatibility check
    createAbortController() {
        if (typeof AbortController === 'undefined') {
            console.warn('AbortController not supported in this browser');
            // Return a mock controller for older browsers
            return {
                signal: null,
                abort: () => console.warn('AbortController.abort() not supported')
            };
        }
        return new AbortController();
    },

    // Compatibility method for advanced AI system
    async generateCompletion(prompt, options = {}) {
        // Map the advanced AI system's call to our existing generateResponse method
        const response = await this.generateResponse(prompt, null, options);
        // Return just the response text for compatibility
        return response.response;
    }
};

// Export for use in other modules
window.OllamaService = OllamaService;