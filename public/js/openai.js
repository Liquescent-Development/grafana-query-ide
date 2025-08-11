// OpenAI Service Client
// Handles communication with OpenAI API for AI/ML analytics

const OpenAIService = {
    // Configuration and connection management
    config: {
        apiKey: null, // User-provided API key
        endpoint: 'https://api.openai.com/v1', // OpenAI API endpoint
        model: 'gpt-4-turbo-preview', // Default model
        timeout: 600000, // 10 minute default timeout for AI analysis
        connectionTimeout: 5000, // 5 second timeout for connection tests
        maxRetries: 3,
        retryDelay: 1000 // 1 second initial retry delay
    },

    // Connection status
    isConnected: false,
    lastError: null,

    // Initialize and validate OpenAI connection
    async initialize(apiKey, model = null) {
        console.log('🤖 Initializing OpenAI service...', { model });
        
        this.config.apiKey = apiKey;
        if (model) this.config.model = model;
        
        try {
            // Test basic connection
            const isConnected = await this.testConnection();
            if (!isConnected) {
                throw new Error('Cannot connect to OpenAI API. Please verify your API key.');
            }
            
            this.isConnected = true;
            this.lastError = null;
            console.log('✅ OpenAI service initialized successfully');
            
            // Update title bar status when connected
            if (window.Analytics && typeof window.Analytics.updateTitleBarStatus === 'function') {
                window.Analytics.updateTitleBarStatus();
            }
            
            return true;
            
        } catch (error) {
            this.isConnected = false;
            this.lastError = error.message;
            console.error('❌ OpenAI initialization failed:', error);
            
            // Update title bar status when disconnected
            if (window.Analytics && typeof window.Analytics.updateTitleBarStatus === 'function') {
                window.Analytics.updateTitleBarStatus();
            }
            
            throw error;
        }
    },

    // Test OpenAI connection
    async testConnection() {
        try {
            console.log('🔍 Testing OpenAI connection...');
            
            // Create abort controller with compatibility check
            const abortController = this.createAbortController();
            const timeoutId = setTimeout(() => abortController.abort(), this.config.connectionTimeout);
            
            const response = await fetch(`${this.config.endpoint}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                signal: abortController.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.status === 401) {
                throw new Error('Invalid API key');
            }
            
            const isOk = response.ok;
            console.log('🔗 Connection test result:', isOk ? 'SUCCESS' : 'FAILED');
            return isOk;
            
        } catch (error) {
            console.error('🔗 Connection test failed:', error.message);
            return false;
        }
    },

    // Get list of available models
    async getAvailableModels() {
        try {
            const response = await fetch(`${this.config.endpoint}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }
            
            const data = await response.json();
            // Filter for models that support chat completions
            // This includes GPT-3.5, GPT-4, and their variants
            const chatModels = data.data.filter(model => {
                const id = model.id.toLowerCase();
                return (
                    // GPT-4 models
                    id.includes('gpt-4') ||
                    // GPT-3.5 models
                    id.includes('gpt-3.5') ||
                    // Include any model with 'turbo' which indicates chat support
                    id.includes('turbo')
                ) && 
                // Exclude embeddings, audio, and other non-chat models
                !id.includes('embedding') &&
                !id.includes('whisper') &&
                !id.includes('tts') &&
                !id.includes('dall-e') &&
                !id.includes('davinci') &&
                !id.includes('curie') &&
                !id.includes('babbage') &&
                !id.includes('ada');
            });
            
            return chatModels.map(model => ({
                name: model.id,
                modified_at: model.created
            }));
            
        } catch (error) {
            console.error('Failed to get available models:', error);
            return [];
        }
    },

    // Core inference method with retry logic
    async generateResponse(prompt, systemPrompt = null, options = {}, customTimeout = null, imageData = null) {
        if (!this.isConnected) {
            throw new Error('OpenAI service not connected. Please initialize first.');
        }

        const messages = [];
        
        // Add system prompt if provided
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        // Build user message content
        const userContent = [];
        
        // Add text prompt
        userContent.push({ type: 'text', text: prompt });
        
        // Add image if provided and using a vision-capable model
        if (imageData && this.isVisionModel(this.config.model)) {
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: imageData,
                    detail: 'high'
                }
            });
            console.log('📸 Adding image data for vision model analysis');
        }

        messages.push({
            role: 'user',
            content: userContent.length === 1 ? userContent[0].text : userContent
        });

        const requestBody = {
            model: this.config.model,
            messages: messages,
            temperature: options.temperature || 0.1, // Low temperature for analytical tasks
            max_tokens: options.num_predict === -1 ? null : (options.num_predict || 4096),
            top_p: options.top_p || 0.9,
            response_format: { type: "json_object" } // Request JSON response
        };

        console.log('🧠 Generating AI response...', {
            model: this.config.model,
            promptLength: prompt.length,
            hasSystem: !!systemPrompt,
            hasImages: !!imageData,
            temperature: requestBody.temperature
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
                
                const response = await fetch(`${this.config.endpoint}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody),
                    signal: abortController.signal
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
                }

                const data = await response.json();
                
                if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                    throw new Error('Empty response from OpenAI');
                }

                const responseContent = data.choices[0].message.content;
                console.log('✅ AI response generated successfully', {
                    responseLength: responseContent.length,
                    attempt: attempt
                });

                return {
                    response: responseContent,
                    model: data.model,
                    created_at: new Date(data.created * 1000).toISOString(),
                    done: true,
                    total_duration: null, // OpenAI doesn't provide timing info
                    usage: data.usage
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

    // Check if model supports vision
    isVisionModel(modelName) {
        const visionModels = ['gpt-4-vision', 'gpt-4-turbo', 'gpt-4o'];
        return visionModels.some(model => modelName.toLowerCase().includes(model));
    },

    // Validate and parse JSON response from AI
    parseJsonResponse(response) {
        try {
            // OpenAI with JSON response format should return valid JSON directly
            return JSON.parse(response);
        } catch (error) {
            console.error('Failed to parse JSON response:', error);
            console.log('Raw response:', response);
            
            // Check if response contains markdown code blocks (unlikely for OpenAI but possible)
            const markdownJsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (markdownJsonMatch) {
                console.log('📋 Found JSON in markdown code block');
                return JSON.parse(markdownJsonMatch[1]);
            }
            
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log('📋 Found JSON object in response');
                return JSON.parse(jsonMatch[0]);
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
        this.config.apiKey = null; // Clear API key for security
        this.lastError = null;
        console.log('🔌 OpenAI service disconnected');
        
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
    }
};

// Export for use in other modules
window.OpenAIService = OpenAIService;