// AI Agent Chat Interface
// Interactive conversational interface for time series analysis

const AIAgent = {
    // State management
    state: {
        conversations: [],
        currentConversationId: null,
        isProcessing: false,
        hasActivePopOut: false,
        context: {
            datasource: null,
            measurement: null,
            field: null,
            timeRange: '1h',
            recentMetrics: [],
            discoveries: []
        }
    },

    // AI Assistant avatar management
    avatarDataUrl: null,

    // UI references for embedded chat
    ui: {
        messageList: null,
        input: null,
        sendButton: null,
        contextBar: null,
        statusIndicator: null
    },

    // Initialize the AI Agent
    initialize() {
        console.log('⏰ Initializing Time Buddy AI Agent...');
        this.loadAvatarImage(); // Load avatar image first
        this.loadConversations();
        this.setupConversationListUI(); // Set up new conversation list UI
        this.setupModalUI(); // Set up pop-out modal UI
        this.setupEventListeners();
        this.updateContext();
        this.setupElectronChatCommunication(); // Set up Electron chat window communication
        this.addEnhancedUIStyles(); // Add enhanced UI styles for new features
        this.renderConversationList(); // Initial render of conversation list
        
        console.log('✅ AI Agent initialized');
    },

    // Load AI Assistant avatar image
    async loadAvatarImage() {
        try {
            if (window.electronAPI && typeof window.electronAPI.getAIAvatar === 'function') {
                const result = await window.electronAPI.getAIAvatar();
                if (result && result.success && result.dataUrl && typeof result.dataUrl === 'string') {
                    // Validate data URL format
                    if (result.dataUrl.startsWith('data:image/')) {
                        this.avatarDataUrl = result.dataUrl;
                        console.log('✅ AI avatar loaded via NativeImage');
                    } else {
                        console.warn('⚠️ Invalid data URL format, using fallback');
                        this.avatarDataUrl = null;
                    }
                } else {
                    console.log('ℹ️ Using fallback avatar path:', result?.fallbackPath || 'images/logo.png');
                    this.avatarDataUrl = null; // Will use fallback in getAvatarHTML
                }
            } else {
                console.log('ℹ️ Not in Electron environment or missing getAIAvatar function, using relative path for avatar');
                this.avatarDataUrl = null;
            }
        } catch (error) {
            console.warn('⚠️ Failed to load avatar via IPC, using fallback:', error);
            this.avatarDataUrl = null;
        }
    },

    // Add enhanced UI styles for new features
    addEnhancedUIStyles() {
        const style = document.createElement('style');
        style.id = 'aiEnhancedUIStyles';
        style.textContent = `
            /* Message metadata container */
            .message-metadata {
                margin-top: 8px;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.02);
                border-radius: 6px;
                border-left: 2px solid rgba(107, 70, 193, 0.3);
                font-size: 12px;
            }
            
            /* Confidence indicator */
            .confidence-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;
            }
            
            .confidence-label {
                color: #888;
                min-width: 70px;
            }
            
            .confidence-bar {
                flex: 1;
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                overflow: hidden;
                max-width: 100px;
            }
            
            .confidence-fill {
                height: 100%;
                transition: width 0.3s ease;
            }
            
            .confidence-percentage {
                color: #ccc;
                font-weight: 500;
                min-width: 35px;
                text-align: right;
            }
            
            /* Data source badges */
            .data-source-badges {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 6px;
                flex-wrap: wrap;
            }
            
            .badges-label {
                color: #888;
            }
            
            .data-source-badge {
                background: rgba(107, 70, 193, 0.2);
                color: #b39ddb;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 500;
            }
            
            /* Query preview */
            .query-preview {
                margin-bottom: 8px;
            }
            
            .query-toggle-btn {
                background: rgba(76, 175, 80, 0.2);
                border: 1px solid rgba(76, 175, 80, 0.3);
                color: #81c784;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .query-toggle-btn:hover {
                background: rgba(76, 175, 80, 0.3);
                border-color: rgba(76, 175, 80, 0.4);
            }
            
            .query-content {
                margin-top: 6px;
                background: rgba(30, 30, 30, 0.8);
                border-radius: 4px;
                overflow: hidden;
            }
            
            .query-content.hidden {
                display: none;
            }
            
            .query-content pre {
                margin: 0;
                padding: 8px;
                font-size: 11px;
                line-height: 1.4;
                overflow-x: auto;
            }
            
            .query-content code {
                color: #81c784;
                font-family: 'Courier New', monospace;
            }
            
            /* Feedback buttons */
            .feedback-buttons {
                display: flex;
                gap: 6px;
                align-items: center;
            }
            
            .feedback-btn {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #888;
                padding: 4px 6px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
                min-width: 30px;
                text-align: center;
            }
            
            .feedback-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
            }
            
            .feedback-btn.selected {
                background: rgba(107, 70, 193, 0.3);
                border-color: rgba(107, 70, 193, 0.5);
                color: #b39ddb;
            }
            
            .feedback-confirmation {
                color: #4CAF50;
                font-size: 10px;
                margin-left: 8px;
                opacity: 0.8;
            }
            
            /* Message timestamp */
            .message-timestamp {
                color: #666;
                font-size: 10px;
                text-align: right;
                margin-top: 4px;
                opacity: 0.7;
            }
            
            /* Enhanced message styling */
            .message.assistant {
                position: relative;
            }
            
            .message.assistant:hover .message-metadata {
                background: rgba(255, 255, 255, 0.04);
            }
            
            /* Responsive adjustments */
            @media (max-width: 600px) {
                .confidence-indicator {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 4px;
                }
                
                .confidence-bar {
                    width: 100%;
                    max-width: none;
                }
                
                .data-source-badges {
                    flex-direction: column;
                    align-items: flex-start;
                }
            }
        `;
        document.head.appendChild(style);
    },

    // Get avatar HTML element
    getAvatarHTML() {
        if (this.avatarDataUrl) {
            return `<img src="${this.avatarDataUrl}" alt="Time Buddy" class="ai-avatar-logo" style="width: 32px; height: 32px; border-radius: 50%; background-color: rgba(107, 70, 193, 0.1); padding: 2px; box-sizing: border-box;">`;
        } else {
            // Fallback to relative path
            return `<img src="images/logo.png" alt="Time Buddy" class="ai-avatar-logo" style="width: 32px; height: 32px; border-radius: 50%; background-color: rgba(107, 70, 193, 0.1); padding: 2px; box-sizing: border-box;">`;
        }
    },

    // Setup embedded UI references
    // Set up conversation list UI in sidebar
    setupConversationListUI() {
        this.ui.conversationList = document.getElementById('conversationList');
        this.ui.conversationSearch = document.getElementById('conversationSearch');
        this.ui.newConversationBtn = document.getElementById('newConversationBtn');
        this.ui.statusIndicator = document.getElementById('aiAssistantStatus');
        
        if (!this.ui.conversationList) {
            console.error('AI Agent: Conversation list element not found');
            return;
        }
        
        console.log('🎨 AI Agent conversation list UI setup complete');
    },

    // Set up modal UI for pop-out chat
    setupModalUI() {
        this.ui.modal = document.getElementById('aiChatModal');
        this.ui.modalMessages = document.getElementById('aiChatModalMessages');
        this.ui.modalInput = document.getElementById('aiChatModalInput');
        this.ui.modalSend = document.getElementById('aiChatModalSend');
        this.ui.modalTitle = document.getElementById('aiChatModalTitle');
        this.ui.modalContext = document.getElementById('aiChatModalContext');
        this.ui.modalClose = document.getElementById('aiChatClose');
        this.ui.modalMinimize = document.getElementById('aiChatMinimize');
        this.ui.modalSettings = document.getElementById('aiChatSettings');
        
        if (!this.ui.modal || !this.ui.modalMessages || !this.ui.modalInput) {
            console.error('AI Agent: Modal UI elements not found');
            return;
        }
        
        // Debug log for button elements
        console.log('🔍 Modal button elements found:');
        console.log('  Close button:', !!this.ui.modalClose);
        console.log('  Minimize button:', !!this.ui.modalMinimize);
        console.log('  Settings button:', !!this.ui.modalSettings);

        console.log('🎨 AI Agent modal UI setup complete');
    },



    // Setup event listeners for embedded UI
    setupEventListeners() {
        // Conversation list event listeners
        if (this.ui.newConversationBtn) {
            this.ui.newConversationBtn.addEventListener('click', () => this.createNewConversation());
        }

        if (this.ui.conversationSearch) {
            this.ui.conversationSearch.addEventListener('input', (e) => this.handleConversationSearch(e.target.value));
        }

        console.log('🎧 AI Agent event listeners setup complete');
    },

    // Set up modal-specific event listeners
    setupModalEventListeners() {
        if (!this.ui.modalInput || !this.ui.modalSend) {
            console.error('AI Agent: Modal UI elements not found for event listeners');
            return;
        }

        // Modal input handling
        this.ui.modalInput.addEventListener('input', () => this.handleModalInputChange());
        this.ui.modalInput.addEventListener('keydown', (e) => this.handleModalKeyDown(e));
        this.ui.modalSend.addEventListener('click', () => this.sendModalMessage());

        // Modal control buttons
        if (this.ui.modalClose) {
            this.ui.modalClose.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🔴 Modal close button clicked');
                this.closeModal();
            });
        }

        if (this.ui.modalMinimize) {
            this.ui.modalMinimize.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🔽 Modal minimize button clicked');
                this.minimizeModal();
            });
        }

        if (this.ui.modalSettings) {
            this.ui.modalSettings.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('⚙️ Modal settings button clicked');
                this.showConversationSettings();
            });
        }

        // Click outside to close
        this.ui.modal.addEventListener('click', (e) => {
            if (e.target === this.ui.modal) {
                this.closeModal();
            }
        });

        // Auto-resize textarea
        this.ui.modalInput.addEventListener('input', () => {
            this.ui.modalInput.style.height = 'auto';
            this.ui.modalInput.style.height = Math.min(this.ui.modalInput.scrollHeight, 120) + 'px';
        });

        console.log('🎧 AI Agent modal event listeners setup complete');
    },



    // Focus the embedded chat input
    focus() {
        if (this.ui.input) {
            this.ui.input.focus();
        }
        this.updateContext();
    },

    // Check if all prerequisites are met
    checkPrerequisites() {
        const issues = [];
        
        // Check Grafana connection
        if (!GrafanaConfig.connected) {
            issues.push('Please connect to a Grafana datasource first.');
        }
        
        // Check AI service (if Analytics is available)
        if (window.Analytics && !Analytics.isConnected) {
            issues.push('Please connect to an AI service first.');
        }
        
        if (issues.length > 0) {
            // Add a helpful message to chat instead of alert
            this.addMessage('assistant', `To get started, I need you to:\n\n${issues.join('\n')}`
                + '\n\nOnce you\'re connected, I can help you analyze your time series data!', 
                { type: 'prerequisites' });
            return false;
        }
        
        return true;
    },


    // Handle input change
    handleInputChange() {
        const value = this.ui.input.value.trim();
        this.ui.sendButton.disabled = !value || this.state.isProcessing;
        
        // Auto-resize textarea
        this.ui.input.style.height = 'auto';
        this.ui.input.style.height = Math.min(this.ui.input.scrollHeight, 120) + 'px';
        
        // Show suggestions
        if (value.length > 2) {
            this.showSuggestions(value);
        } else {
            this.hideSuggestions();
        }
    },

    // Handle key down events
    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!this.ui.sendButton.disabled) {
                this.sendMessage();
            }
        }
    },

    // Update context from current state
    updateContext() {
        const context = this.state.context;
        
        // Update datasource
        if (GrafanaConfig.connected && GrafanaConfig.currentDatasourceName) {
            context.datasource = GrafanaConfig.currentDatasourceName;
        }
        
        // Update metric if available from Analytics
        if (window.Analytics && Analytics.config.measurement && Analytics.config.field) {
            context.measurement = Analytics.config.measurement;
            context.field = Analytics.config.field;
        }
        
        // Update context bar if it exists
        if (this.ui.contextBar) {
            this.updateContextBar(context);
        }
    },
    
    // Update context bar display
    updateContextBar(context) {
        let contextHTML = '';
        
        if (context.datasource) {
            contextHTML += `
                <span class="ai-context-item">
                    <span class="ai-context-icon">🔗</span>
                    <span class="ai-context-label">${context.datasource}</span>
                </span>
            `;
        }
        
        if (context.measurement && context.field) {
            contextHTML += `
                <span class="ai-context-item">
                    <span class="ai-context-icon">📊</span>
                    <span class="ai-context-label">${context.measurement}.${context.field}</span>
                </span>
            `;
        }
        
        this.ui.contextBar.innerHTML = contextHTML;
    },

    // Show suggestions based on input (placeholder for embedded UI)
    showSuggestions(input) {
        // Note: Suggestions feature could be implemented in embedded UI if needed
        // For now, just log the suggestions that would be shown
        const suggestions = this.generateSuggestions(input);
        if (suggestions.length > 0) {
            console.log('💡 AI suggestions:', suggestions);
        }
    },

    // Generate suggestions based on input
    generateSuggestions(input) {
        const lower = input.toLowerCase();
        const suggestions = [];

        // Common patterns
        const patterns = [
            { trigger: 'show', suggestions: ['Show me anomalies', 'Show current metrics', 'Show trends'] },
            { trigger: 'what', suggestions: ['What anomalies occurred today?', "What's the current status?", 'What trends are emerging?'] },
            { trigger: 'find', suggestions: ['Find spikes', 'Find anomalies', 'Find patterns'] },
            { trigger: 'compare', suggestions: ['Compare to yesterday', 'Compare to last week', 'Compare metrics'] },
            { trigger: 'alert', suggestions: ['Alert me when', 'Alert on threshold', 'Alert on anomaly'] }
        ];

        for (const pattern of patterns) {
            if (lower.includes(pattern.trigger)) {
                suggestions.push(...pattern.suggestions.filter(s => 
                    s.toLowerCase().includes(lower)
                ));
            }
        }

        // Add metric-specific suggestions if context is available
        if (this.state.context.measurement) {
            suggestions.push(`Analyze ${this.state.context.measurement}`);
            suggestions.push(`Show ${this.state.context.measurement} anomalies`);
        }

        return [...new Set(suggestions)].slice(0, 5);
    },

    // Hide suggestions (placeholder for embedded UI)
    hideSuggestions() {
        // Note: No suggestions container in embedded UI
    },

    // Send quick message (for buttons)
    async sendQuickMessage(message) {
        return this.sendMessage(message);
    },

    // Send message
    async sendMessage(text = null) {
        const message = text || this.ui.input.value.trim();
        if (!message) {
            console.log('🔇 No message to send');
            return;
        }
        
        // CRITICAL: Prevent ALL processing if already busy
        if (this.state.isProcessing) {
            console.log('🚫 Already processing a message, rejecting new request:', message.substring(0, 50) + '...');
            return;
        }
        
        // Create unique request ID to prevent duplicate processing
        const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        console.log('🔄 Processing message request:', requestId, message.substring(0, 50) + '...');
        
        // Check if this exact message was just processed (within last 3 seconds)
        const now = Date.now();
        if (this.lastProcessedMessage && 
            this.lastProcessedMessage.text === message && 
            (now - this.lastProcessedMessage.timestamp) < 3000) {
            console.log('🚫 Duplicate message detected, ignoring:', requestId);
            return;
        }
        
        // Check for rapid-fire requests (ANY message within 1 second)
        if (this.lastSendTimestamp && (now - this.lastSendTimestamp) < 1000) {
            console.log('🚫 Rapid-fire request blocked:', requestId);
            return;
        }
        
        // Lock processing IMMEDIATELY to prevent concurrent calls
        this.state.isProcessing = true;
        this.lastSendTimestamp = now;
        this.lastProcessedMessage = { text: message, timestamp: now, requestId };

        // Clear input (only if sidebar is active)
        if (!this.state.hasActivePopOut && this.ui.input) {
            this.ui.input.value = '';
            this.handleInputChange();
            this.hideSuggestions();
        }

        // Add user message (only to the active interface)
        this.addMessage('user', message);

        // Set processing state
        this.state.isProcessing = true;
        if (!this.state.hasActivePopOut && this.ui.sendButton) {
            this.ui.sendButton.disabled = true;
        }

        // Show loading indicator in the active interface only
        if (!this.state.hasActivePopOut) {
            this.showLoading();
        }

        try {
            // Process the message
            const response = await this.processMessage(message);
            
            // Add assistant response (will auto-sync to pop-out via addMessage)
            this.addMessage('assistant', response.text, response.data);

        } catch (error) {
            console.error('Error processing message:', error);
            
            const errorMessage = 'I encountered an error processing your request. Please try again.';
            this.addMessage('assistant', errorMessage, { error: error.message });
            
        } finally {
            // Hide loading indicator in the active interface only
            if (!this.state.hasActivePopOut) {
                this.hideLoading();
            }
            
            this.state.isProcessing = false;
            if (!this.state.hasActivePopOut && this.ui.sendButton) {
                this.ui.sendButton.disabled = false;
            }
        }
    },

    // Process user message using Advanced AI System
    async processMessage(message) {
        // Prevent duplicate processing at the Advanced AI level
        const processId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        console.log('🧠 Processing AI message:', processId, message.substring(0, 50) + '...');
        
        // Check if this exact message is already being processed
        if (this.currentProcessing && this.currentProcessing.message === message) {
            console.log('🚫 Message already being processed, ignoring duplicate:', processId);
            return this.currentProcessing.promise;
        }
        
        // Also check recent processing to catch rapid-fire duplicates
        const now = Date.now();
        if (this.recentProcessing && 
            this.recentProcessing.message === message && 
            (now - this.recentProcessing.timestamp) < 5000) {
            console.log('🚫 Recent duplicate message detected, ignoring:', processId);
            return { text: 'Duplicate request ignored', data: {} };
        }
        
        // Create processing promise to handle duplicates
        const processingPromise = this.doProcessMessage(message, processId);
        this.currentProcessing = { message, promise: processingPromise, processId };
        
        try {
            const result = await processingPromise;
            // Store in recent processing for duplicate detection
            this.recentProcessing = { message, timestamp: Date.now() };
            return result;
        } finally {
            // Clear processing state
            this.currentProcessing = null;
        }
    },
    
    // Actual message processing implementation
    async doProcessMessage(message, processId) {
        try {
            // Use Advanced AI System for all processing
            if (window.AdvancedAI && window.AdvancedAI.isInitialized) {
                console.log('🧠 Using Advanced AI System for:', message);
                
                // Get current context with proper metrics retrieval
                const context = {
                    datasource: this.state.context.datasource,
                    measurement: this.state.context.measurement,
                    field: this.state.context.field,
                    timeRange: this.state.context.timeRange,
                    connected: window.GrafanaConfig?.connected || false,
                    availableMetrics: await this.getAvailableMetrics(),
                    conversationId: this.state.currentConversationId || 'default'
                };
                
                // Process with Advanced AI
                const response = await this.processWithAdvancedAI(message, context);
                
                // Add inspiring sample sentences after AI responses
                if (response.text && response.text.trim()) {
                    response.text += this.renderSampleSentences();
                }
                
                return response;
            }
            
            // Show initialization status instead of fallback
            return this.getInitializationStatus();
            
        } catch (error) {
            console.error('Error processing message:', error);
            return {
                text: "I encountered an error processing your request. Please try again.",
                data: { type: 'error', error: error.message }
            };
        }
    },

    // Get available metrics using the proper centralized Schema access
    async getAvailableMetrics() {
        try {
            console.log('🔍 Getting available metrics from centralized Schema...');
            
            if (!window.Schema) {
                console.log('⚠️ Schema object not available');
                return [];
            }
            
            const datasourceType = window.GrafanaConfig?.selectedDatasourceType || Schema.currentDatasourceType;
            console.log('📊 Current datasource type:', datasourceType);
            
            let metrics = [];
            
            // Use proper centralized access based on datasource type
            if (datasourceType === 'influxdb') {
                metrics = Schema.influxMeasurements || [];
                console.log('📊 Using Schema.influxMeasurements:', metrics.length, 'measurements');
            } else if (datasourceType === 'prometheus') {
                metrics = Schema.prometheusMetrics || [];
                console.log('📊 Using Schema.prometheusMetrics:', metrics.length, 'metrics');
            } else {
                // Try both if datasource type is unclear
                const influxMetrics = Schema.influxMeasurements || [];
                const promMetrics = Schema.prometheusMetrics || [];
                
                if (influxMetrics.length > 0) {
                    metrics = influxMetrics;
                    console.log('📊 Using Schema.influxMeasurements (fallback):', metrics.length, 'measurements');
                } else if (promMetrics.length > 0) {
                    metrics = promMetrics;
                    console.log('📊 Using Schema.prometheusMetrics (fallback):', metrics.length, 'metrics');
                }
            }
            
            if (metrics.length === 0) {
                console.log('⚠️ No metrics found in Schema. Current state:', {
                    datasourceType,
                    influxMeasurements: Schema.influxMeasurements?.length || 0,
                    prometheusMetrics: Schema.prometheusMetrics?.length || 0,
                    connected: window.GrafanaConfig?.connected
                });
            }
            
            // Normalize metric names and return ALL metrics (not limited to 20)
            return metrics.map(m => {
                const name = typeof m === 'string' ? m : (m.name || m.measurement || m);
                return name;
            }).filter(Boolean); // Return all metrics, don't limit to 20
            
        } catch (error) {
            console.error('Error getting available metrics:', error);
            return [];
        }
    },

    // Process message with Advanced AI System
    async processWithAdvancedAI(message, context) {
        try {
            // Check multiple ways to access Advanced AI
            let advancedAgent = null;
            
            if (window.AdvancedAI && window.AdvancedAI.components && window.AdvancedAI.components.advancedAgent) {
                advancedAgent = window.AdvancedAI.components.advancedAgent;
            } else if (window.AdvancedAIAgent) {
                // Try to create instance if class is available
                try {
                    advancedAgent = new window.AdvancedAIAgent();
                    await advancedAgent.initialize();
                } catch (initError) {
                    console.warn('Could not initialize AdvancedAIAgent:', initError);
                }
            }
            
            if (advancedAgent && advancedAgent.processAdvancedQuery) {
                console.log('🧠 Using Advanced AI processing');
                const response = await advancedAgent.processAdvancedQuery(message, context);
                
                // Enhance response with metadata for UI
                return this.enhanceResponseWithMetadata(response, context, 'advanced');
            }
            
            console.log('⚠️ Advanced AI not available, using enhanced basic processing');
            const response = await this.processEnhancedBasicMessage(message, context);
            return this.enhanceResponseWithMetadata(response, context, 'basic');
            
        } catch (error) {
            console.error('Advanced AI processing failed:', error);
            const response = await this.processEnhancedBasicMessage(message, context);
            return this.enhanceResponseWithMetadata(response, context, 'fallback');
        }
    },

    // Enhance response with metadata for UI features
    enhanceResponseWithMetadata(response, context, processingType) {
        console.log('🔧 Enhancing response with metadata, type:', processingType);
        
        if (!response || !response.data) {
            response = response || {};
            response.data = {};
        }
        
        // Add confidence based on processing type
        const confidence = this.calculateResponseConfidence(response, processingType);
        response.data.confidence = confidence;
        
        // Add data sources information
        const dataSources = this.extractDataSources(context);
        if (dataSources.length > 0) {
            response.data.dataSources = dataSources;
        }
        
        // Add generated query if available
        if (response.query || response.data.query) {
            response.data.generatedQuery = response.query || response.data.query;
        }
        
        // Add processing metadata
        response.data.processingType = processingType;
        response.data.timestamp = new Date().toISOString();
        
        return response;
    },

    // Calculate confidence score based on response quality and processing type
    calculateResponseConfidence(response, processingType) {
        let baseConfidence = 0.5; // Default confidence
        
        // Adjust base confidence by processing type
        switch (processingType) {
            case 'advanced':
                baseConfidence = 0.85; // High confidence for advanced AI
                break;
            case 'basic':
                baseConfidence = 0.65; // Medium confidence for enhanced basic
                break;
            case 'fallback':
                baseConfidence = 0.45; // Lower confidence for fallback
                break;
        }
        
        // Adjust based on response characteristics
        if (response.text) {
            const text = response.text.toLowerCase();
            
            // Increase confidence for specific, actionable responses
            if (text.includes('query') || text.includes('select') || text.includes('from')) {
                baseConfidence += 0.1;
            }
            
            // Increase confidence for data-driven responses
            if (text.includes('found') || text.includes('detected') || text.includes('analyzed')) {
                baseConfidence += 0.1;
            }
            
            // Decrease confidence for uncertain language
            if (text.includes('might') || text.includes('possibly') || text.includes('unsure')) {
                baseConfidence -= 0.1;
            }
            
            // Decrease confidence for error responses
            if (text.includes('error') || text.includes('failed') || text.includes('unable')) {
                baseConfidence -= 0.2;
            }
        }
        
        // Ensure confidence stays in valid range
        return Math.max(0.1, Math.min(0.95, baseConfidence));
    },

    // Extract data sources from context
    extractDataSources(context) {
        const sources = [];
        
        if (context.datasource) {
            sources.push(context.datasource);
        }
        
        if (context.measurement) {
            sources.push(context.measurement);
        }
        
        // Add datasource type if available
        const datasourceType = window.GrafanaConfig?.selectedDatasourceType || 
                              window.Schema?.currentDatasourceType;
        if (datasourceType && !sources.includes(datasourceType)) {
            sources.push(datasourceType.charAt(0).toUpperCase() + datasourceType.slice(1));
        }
        
        return sources.filter(Boolean); // Remove any null/undefined values
    },

    // Toggle proactive monitoring on/off
    async toggleProactiveMonitoring(enable = null) {
        const currentState = this.isProactiveMonitoringEnabled();
        const newState = enable !== null ? enable : !currentState;
        
        if (newState === currentState) {
            console.log(`🔄 Proactive monitoring already ${newState ? 'enabled' : 'disabled'}`);
            return {
                text: `Proactive monitoring is already ${newState ? 'enabled' : 'disabled'}.`,
                data: { type: 'status', proactiveEnabled: newState }
            };
        }
        
        if (newState) {
            return await this.enableProactiveMonitoring();
        } else {
            return await this.disableProactiveMonitoring();
        }
    },

    // Enable proactive monitoring
    async enableProactiveMonitoring() {
        try {
            console.log('🚀 Enabling proactive monitoring...');
            
            // Check if Advanced AI system and proactive monitoring are available
            if (!window.AdvancedAI || !window.AdvancedAI.components || !window.AdvancedAI.components.proactiveMonitoring) {
                return {
                    text: "⚠️ **Proactive Monitoring Unavailable**\n\nProactive monitoring requires:\n\n• AI service connection (OpenAI or Ollama)\n• Advanced AI system initialization\n• Proactive Monitoring component loaded\n• Data source connection\n\n💡 **Note**: The ProactiveMonitoringSystem component may not be loaded if it's not needed for basic AI functionality.",
                    data: { type: 'error', proactiveEnabled: false }
                };
            }
            
            // Enable proactive monitoring
            await window.AdvancedAI.startProactiveSystemsSafely();
            window.AdvancedAI.capabilities.proactiveInsights = true;
            
            // Store user preference
            this.setProactiveMonitoringPreference(true);
            
            return {
                text: "🚀 **Proactive Monitoring Enabled**\n\nI'm now actively monitoring your metrics and will send you:\n\n• 🔍 **Anomaly alerts** when unusual patterns are detected\n• 📊 **Health reports** every 30 minutes\n• 💡 **Predictive insights** about trends and issues\n• ⚡ **Smart recommendations** for optimization\n\n**Rate Limits:** Maximum 20 alerts per day with 30-second intervals to prevent overwhelm.\n\nYou can disable this anytime by saying *\"disable proactive monitoring\"*.",
                data: { 
                    type: 'proactive_enabled', 
                    proactiveEnabled: true,
                    confidence: 0.9,
                    dataSources: ['Proactive Monitoring System'],
                    processingType: 'system'
                }
            };
            
        } catch (error) {
            console.error('Failed to enable proactive monitoring:', error);
            return {
                text: "❌ **Failed to Enable Proactive Monitoring**\n\nThere was an error starting the proactive monitoring system. Please try again or check the console for details.",
                data: { type: 'error', proactiveEnabled: false, error: error.message }
            };
        }
    },

    // Disable proactive monitoring
    async disableProactiveMonitoring() {
        try {
            console.log('🛑 Disabling proactive monitoring...');
            
            // Disable proactive monitoring
            if (window.AdvancedAI && window.AdvancedAI.components.proactiveMonitoring) {
                await window.AdvancedAI.components.proactiveMonitoring.stopMonitoring();
                window.AdvancedAI.capabilities.proactiveInsights = false;
            }
            
            // Store user preference
            this.setProactiveMonitoringPreference(false);
            
            return {
                text: "🛑 **Proactive Monitoring Disabled**\n\nI've stopped sending proactive alerts and health reports. I'll still respond to your direct questions and analyze data when you ask.\n\nYou can re-enable proactive monitoring anytime by saying *\"enable proactive monitoring\"*.",
                data: { 
                    type: 'proactive_disabled', 
                    proactiveEnabled: false,
                    confidence: 0.95,
                    dataSources: ['System Settings'],
                    processingType: 'system'
                }
            };
            
        } catch (error) {
            console.error('Failed to disable proactive monitoring:', error);
            return {
                text: "❌ **Error Disabling Proactive Monitoring**\n\nThere was an error stopping the proactive monitoring system. Please check the console for details.",
                data: { type: 'error', proactiveEnabled: true, error: error.message }
            };
        }
    },

    // Check if proactive monitoring is enabled
    isProactiveMonitoringEnabled() {
        return window.AdvancedAI && 
               window.AdvancedAI.capabilities && 
               window.AdvancedAI.capabilities.proactiveInsights === true;
    },

    // Get proactive monitoring status
    getProactiveMonitoringStatus() {
        const isEnabled = this.isProactiveMonitoringEnabled();
        const isAvailable = window.AdvancedAI && window.AdvancedAI.components && window.AdvancedAI.components.proactiveMonitoring;
        
        let statusText = "📊 **Proactive Monitoring Status**\n\n";
        
        if (!isAvailable) {
            statusText += "⚠️ **Status:** Unavailable\n\n";
            statusText += "Proactive monitoring requires:\n";
            statusText += "• AI service connection (OpenAI or Ollama)\n";
            statusText += "• Advanced AI system initialization\n";
            statusText += "• Data source connection\n\n";
            statusText += "Please ensure these requirements are met to enable proactive monitoring.";
        } else if (isEnabled) {
            statusText += "✅ **Status:** Active\n\n";
            statusText += "**Features Enabled:**\n";
            statusText += "• 🔍 Anomaly detection\n";
            statusText += "• 📊 Health reports (every 30 min)\n";
            statusText += "• 💡 Predictive insights\n";
            statusText += "• ⚡ Smart recommendations\n\n";
            statusText += "**Rate Limits:** 20 alerts/day, 30s intervals\n\n";
            statusText += "Say *\"disable proactive monitoring\"* to turn off.";
        } else {
            statusText += "💤 **Status:** Disabled\n\n";
            statusText += "Proactive monitoring is available but currently disabled.\n\n";
            statusText += "Say *\"enable proactive monitoring\"* to activate:\n";
            statusText += "• Automatic anomaly alerts\n";
            statusText += "• Periodic health reports\n";
            statusText += "• Predictive trend analysis\n";
            statusText += "• Intelligent recommendations";
        }
        
        return {
            text: statusText,
            data: { 
                type: 'proactive_status',
                proactiveEnabled: isEnabled,
                proactiveAvailable: isAvailable,
                confidence: 0.95,
                dataSources: ['System Status'],
                processingType: 'system'
            }
        };
    },

    // Store user preference for proactive monitoring  
    setProactiveMonitoringPreference(enabled) {
        try {
            localStorage.setItem('aiAgent.proactiveMonitoring.enabled', JSON.stringify(enabled));
        } catch (error) {
            console.warn('Failed to store proactive monitoring preference:', error);
        }
    },

    // Get stored user preference for proactive monitoring
    getProactiveMonitoringPreference() {
        try {
            const stored = localStorage.getItem('aiAgent.proactiveMonitoring.enabled');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Failed to get proactive monitoring preference:', error);
            return null;
        }
    },

    // Enhanced basic message processing with intelligent pattern recognition
    async processEnhancedBasicMessage(message, context) {
        const lowerMessage = message.toLowerCase();
        const availableMetrics = context.availableMetrics || [];
        
        console.log('🔍 Enhanced basic processing for:', message);
        console.log('📊 Available metrics count:', availableMetrics.length);
        
        // Handle "show 10 more" or "show more" requests
        if (lowerMessage.includes('show') && (lowerMessage.includes('more') || lowerMessage.includes('10'))) {
            return await this.handleShowMoreMetrics(availableMetrics);
        }
        
        // Handle IOPS and I/O queries with better pattern matching
        if (lowerMessage.includes('iops') || lowerMessage.includes('prometheus measurement') || 
            (lowerMessage.includes('anomal') && (lowerMessage.includes('iops') || lowerMessage.includes('ops')))) {
            return await this.handleIOPSQuery(message, availableMetrics);
        }
        
        // Handle proactive monitoring commands
        if (lowerMessage.includes('proactive') && lowerMessage.includes('monitor')) {
            if (lowerMessage.includes('enable') || lowerMessage.includes('turn on') || lowerMessage.includes('start')) {
                return await this.enableProactiveMonitoring();
            } else if (lowerMessage.includes('disable') || lowerMessage.includes('turn off') || lowerMessage.includes('stop')) {
                return await this.disableProactiveMonitoring();
            } else if (lowerMessage.includes('status') || lowerMessage.includes('check')) {
                return this.getProactiveMonitoringStatus();
            }
        }
        
        // Handle general monitoring/alert commands
        if ((lowerMessage.includes('enable') || lowerMessage.includes('turn on')) && 
            (lowerMessage.includes('alert') || lowerMessage.includes('monitor') || lowerMessage.includes('notification'))) {
            return await this.enableProactiveMonitoring();
        }
        
        if ((lowerMessage.includes('disable') || lowerMessage.includes('turn off')) && 
            (lowerMessage.includes('alert') || lowerMessage.includes('monitor') || lowerMessage.includes('notification'))) {
            return await this.disableProactiveMonitoring();
        }
        
        // Handle status queries
        if (lowerMessage.includes('monitoring status') || lowerMessage.includes('alert status')) {
            return this.getProactiveMonitoringStatus();
        }
        
        // Handle general anomaly queries
        if (lowerMessage.includes('anomal') || lowerMessage.includes('spike') || lowerMessage.includes('unusual')) {
            return await this.handleAnomalyQuery(message, availableMetrics);
        }
        
        // Handle metric queries
        if (lowerMessage.includes('metric') || lowerMessage.includes('measurement')) {
            return await this.handleMetricQuery(message);
        }
        
        if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
            const proactiveStatus = this.isProactiveMonitoringEnabled() ? '✅ Active' : '💤 Disabled';
            
            return {
                text: `I'm your AI assistant for time series analysis! I can help you:\n\n**Core Features:**\n• Find and explore available metrics\n• Detect anomalies and patterns\n• Generate optimized queries\n• Analyze your data trends\n• Answer questions about your metrics\n\n**Proactive Monitoring:** ${proactiveStatus}\n• Enable: *"enable proactive monitoring"*\n• Disable: *"disable proactive monitoring"*\n• Status: *"monitoring status"*\n\nWhat would you like to explore?`,
                data: { 
                    type: 'help',
                    confidence: 0.95,
                    dataSources: ['AI Assistant'],
                    processingType: 'system'
                },
                actions: [
                    { label: 'Show Metrics', action: 'showMeasurements' },
                    { label: 'Find Anomalies', action: 'findAnomalies' },
                    { label: 'Monitoring Status', action: 'proactiveStatus' }
                ]
            };
        }
        
        // Default response
        return {
            text: "I'm here to help with your time series data analysis. What would you like to know about your metrics?",
            data: { type: 'default' },
            actions: [
                { label: 'Show Available Metrics', action: 'showMeasurements' },
                { label: 'Get Help', action: 'showHelp' }
            ]
        };
    },
    
    // Handle "show more" requests
    async handleShowMoreMetrics(availableMetrics) {
        if (availableMetrics.length === 0) {
            return {
                text: "I don't see any metrics available. Please ensure you're connected to a datasource.",
                data: { type: 'no_metrics' }
            };
        }
        
        // Show all metrics grouped by category
        const categorizedMetrics = this.categorizeMetrics(availableMetrics);
        let responseText = `📊 **All Available Metrics** (${availableMetrics.length} total)\n\n`;
        
        Object.entries(categorizedMetrics).forEach(([category, metrics]) => {
            if (metrics.length > 0) {
                const icon = {
                    iops: '⚡',
                    volume: '💾',
                    storage: '📦',
                    object: '🗃️',
                    test: '🧪',
                    other: '📊'
                }[category] || '📊';
                
                responseText += `${icon} **${category.toUpperCase()} Metrics:**\n`;
                metrics.forEach(metric => {
                    responseText += `• \`${metric}\`\n`;
                });
                responseText += `\n`;
            }
        });
        
        return {
            text: responseText,
            data: { type: 'all_metrics', metrics: availableMetrics, categories: categorizedMetrics },
            actions: [
                { label: 'Analyze IOPS Metrics', action: 'analyzeIOPS' },
                { label: 'Find Volume Anomalies', action: 'findVolumeAnomalies' },
                { label: 'Generate Query', action: 'generateQuery' }
            ]
        };
    },
    
    // Categorize metrics intelligently
    categorizeMetrics(metrics) {
        const categories = {
            iops: [],
            volume: [],
            storage: [],
            object: [],
            test: [],
            other: []
        };
        
        metrics.forEach(metric => {
            const lower = metric.toLowerCase();
            if (lower.includes('ops') || lower.includes('read') || lower.includes('write')) {
                categories.iops.push(metric);
            } else if (lower.includes('volume')) {
                categories.volume.push(metric);
            } else if (lower.includes('storage') || lower.includes('bytes')) {
                categories.storage.push(metric);
            } else if (lower.includes('object')) {
                categories.object.push(metric);
            } else if (lower.includes('test') || lower.includes('smoke')) {
                categories.test.push(metric);
            } else {
                categories.other.push(metric);
            }
        });
        
        return categories;
    },
    
    // Handle IOPS-specific queries
    async handleIOPSQuery(message, availableMetrics) {
        const iopsTelated = availableMetrics.filter(metric => {
            const lower = metric.toLowerCase();
            return lower.includes('ops') || lower.includes('read') || lower.includes('write') || 
                   lower.includes('volume') || lower.includes('iops');
        });
        
        if (iopsTelated.length === 0) {
            return {
                text: `I don't see specific IOPS metrics like "prometheus.measurement" in your available data. However, I found these I/O related metrics:\n\n${availableMetrics.filter(m => m.toLowerCase().includes('volume')).map(m => `• ${m}`).join('\n')}\n\nWould you like me to analyze any of these for anomalies?`,
                data: { type: 'no_iops_metrics', availableMetrics: availableMetrics.slice(0, 10) },
                actions: [
                    { label: 'Analyze Volume Metrics', action: 'analyzeVolumeMetrics' },
                    { label: 'Show All Metrics', action: 'showMeasurements' }
                ]
            };
        }
        
        const responseText = `⚡ **IOPS & I/O Related Metrics Found:**\n\n${iopsTelated.map(m => `• \`${m}\``).join('\n')}\n\nI can analyze these for anomalies. Which specific metric would you like me to focus on?`;
        
        return {
            text: responseText,
            data: { type: 'iops_metrics', metrics: iopsTelated },
            actions: [
                { label: 'Analyze Read Operations', action: 'analyzeReadOps' },
                { label: 'Analyze Write Operations', action: 'analyzeWriteOps' },
                { label: 'Find All IOPS Anomalies', action: 'findIOPSAnomalies' }
            ]
        };
    },
    
    // Handle general anomaly queries
    async handleAnomalyQuery(message, availableMetrics) {
        if (availableMetrics.length === 0) {
            return {
                text: "I don't see any metrics available for anomaly analysis. Please ensure you're connected to a datasource first.",
                data: { type: 'no_metrics' }
            };
        }
        
        // Try to identify specific metrics mentioned in the query
        const mentionedMetrics = availableMetrics.filter(metric => 
            message.toLowerCase().includes(metric.toLowerCase())
        );
        
        if (mentionedMetrics.length > 0) {
            const metricList = mentionedMetrics.map(m => `• \`${m}\``).join('\n');
            return {
                text: `🔍 **Anomaly Detection for Mentioned Metrics:**\n\n${metricList}\n\nI can analyze these metrics for unusual patterns, spikes, and anomalies. Which would you like me to start with?`,
                data: { type: 'specific_anomaly_request', metrics: mentionedMetrics },
                actions: [
                    { label: 'Analyze All Mentioned', action: 'analyzeSpecificMetrics' },
                    { label: 'Choose One to Start', action: 'chooseMetric' }
                ]
            };
        }
        
        // General anomaly help with top metrics
        const topMetrics = availableMetrics.slice(0, 5);
        return {
            text: `🔍 **Anomaly Detection Ready**\n\nI can analyze your metrics for unusual patterns. Here are some metrics I can check:\n\n${topMetrics.map(m => `• \`${m}\``).join('\n')}\n\n${availableMetrics.length > 5 ? `...and ${availableMetrics.length - 5} more metrics.` : ''}\n\nWhich metrics would you like me to analyze for anomalies?`,
            data: { type: 'anomaly_help', availableMetrics: topMetrics },
            actions: [
                { label: 'Show All Metrics', action: 'showMeasurements' },
                { label: 'Analyze Top 5 Metrics', action: 'analyzeTopMetrics' },
                { label: 'Help Choose Metrics', action: 'helpChooseMetrics' }
            ]
        };
    },
    
    // Basic message processing (keep for compatibility)
    async processBasicMessage(message) {
        return await this.processEnhancedBasicMessage(message, { availableMetrics: await this.getAvailableMetrics() });
    },

    // Handle metric-related queries  
    async handleMetricQuery(message) {
        const availableMetrics = await this.getAvailableMetrics();
        
        if (availableMetrics.length === 0) {
            return {
                text: "I don't see any metrics available yet. Please make sure you're connected to a datasource first.",
                data: { type: 'no_metrics' },
                actions: [
                    { label: 'Check Connection', action: 'checkConnection' }
                ]
            };
        }
        
        // Categorize metrics for better display
        const categorizedMetrics = this.categorizeMetrics(availableMetrics);
        let responseText = `📊 **Available Metrics** (${availableMetrics.length} total)\n\n`;
        
        // Show first few from each category
        Object.entries(categorizedMetrics).forEach(([category, metrics]) => {
            if (metrics.length > 0) {
                const icon = {
                    iops: '⚡',
                    volume: '💾', 
                    storage: '📦',
                    object: '🗃️',
                    test: '🧪',
                    other: '📊'
                }[category] || '📊';
                
                responseText += `${icon} **${category.toUpperCase()}** (${metrics.length}): `;
                responseText += metrics.slice(0, 3).map(m => `\`${m}\``).join(', ');
                if (metrics.length > 3) {
                    responseText += ` and ${metrics.length - 3} more`;
                }
                responseText += `\n`;
            }
        });
        
        responseText += `\n💡 **Ask me to:**\n• "Show 10 more" to see all metrics\n• "Find anomalies in IOPS" for specific analysis\n• "Analyze [metric name]" for detailed insights`;
        
        return {
            text: responseText,
            data: { 
                type: 'metrics_list', 
                metrics: availableMetrics,
                categories: categorizedMetrics
            },
            actions: [
                { label: 'Show All Metrics', action: 'showAllMetrics' },
                { label: 'Analyze IOPS', action: 'analyzeIOPS' },
                { label: 'Find Anomalies', action: 'findAnomalies' }
            ]
        };
    },

    // Render inspiring sample sentences for follow-up questions
    renderSampleSentences() {
        const sampleSentences = [
            "Show me metrics for the last 24 hours",
            "What anomalies can you detect in my data?",
            "Help me create a query for CPU utilization",
            "Explain this metric pattern to me",
            "What's the trend for memory usage?",
            "Find correlations between these metrics",
            "Show me system performance insights",
            "Help me optimize this query",
            "Enable proactive monitoring",
            "What's my monitoring status?",
            "Turn on alerts for anomalies",
            "Disable automatic notifications"
        ];
        
        // Randomly select 2 sample sentences
        const selectedSentences = sampleSentences
            .sort(() => 0.5 - Math.random())
            .slice(0, 2);
        
        let html = '<div class="sample-prompts" style="margin-top: 16px; padding: 12px; border-radius: 6px; background-color: rgba(255, 255, 255, 0.03);">';
        html += '<div style="font-size: 11px; color: #888; margin-bottom: 8px;">💡 Try asking:</div>';
        
        selectedSentences.forEach(sentence => {
            html += `<div class="sample-prompt" onclick="AIAgent.sendMessage('${sentence}')" style="
                padding: 6px 10px; 
                margin: 4px 0; 
                background-color: rgba(107, 70, 193, 0.1); 
                border: 1px solid rgba(107, 70, 193, 0.2); 
                border-radius: 12px; 
                cursor: pointer; 
                font-size: 12px; 
                color: #cccccc;
                transition: all 0.2s;
            " onmouseover="this.style.backgroundColor='rgba(107, 70, 193, 0.2)'" onmouseout="this.style.backgroundColor='rgba(107, 70, 193, 0.1)'">"${sentence}"</div>`;
        });
        
        html += '</div>';
        return html;
    },

    // Send a message (used by sample prompts)
    sendMessage(messageText) {
        if (!messageText || !messageText.trim()) return;
        
        // Get the input field and send button from the DOM
        const input = document.getElementById('aiChatInput');
        const sendButton = document.getElementById('aiChatSend');
        
        if (input && sendButton) {
            // Set the input value
            input.value = messageText.trim();
            
            // Trigger the send button click
            sendButton.click();
        }
    },

    // Helper function to serialize data objects safely
    serializeData(data) {
        if (!data) {
            return null;
        }
        
        if (typeof data !== 'object') {
            return data;
        }
        
        // Handle arrays
        if (Array.isArray(data)) {
            return data.map(item => this.serializeData(item));
        }
        
        try {
            // Use JSON parse/stringify for deep cloning and filtering out non-serializable values
            const jsonString = JSON.stringify(data, (key, value) => {
                // Filter out functions, undefined, symbols, etc.
                if (typeof value === 'function' || typeof value === 'undefined' || typeof value === 'symbol') {
                    return undefined;
                }
                
                // Convert dates to ISO strings
                if (value instanceof Date) {
                    return value.toISOString();
                }
                
                // Handle DOM elements and other non-serializable objects
                if (value && typeof value === 'object' && value.nodeType) {
                    return '[DOM Element]';
                }
                
                return value;
            });
            
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Error serializing data object:', error, data);
            return { 
                error: 'Failed to serialize data',
                type: typeof data,
                keys: data && typeof data === 'object' ? Object.keys(data) : []
            };
        }
    },

    // Execute action from message
    async executeAction(action) {
        console.log('🎯 Executing action:', action);
        
        // Show loading
        this.showLoading();
        
        try {
            let result;
            
            // Handle actions directly without old AIAgentEngine
            switch (action) {
                case 'showMeasurements':
                    result = await this.handleMetricQuery('show metrics');
                    break;
                    
                case 'analyzeIOPS':
                case 'analyzeVolumeMetrics':
                    const availableMetrics = await this.getAvailableMetrics();
                    result = await this.handleIOPSQuery('analyze IOPS metrics', availableMetrics);
                    break;
                    
                case 'findVolumeAnomalies':
                case 'findIOPSAnomalies':
                    const metrics = await this.getAvailableMetrics();
                    const volumeMetrics = metrics.filter(m => m.toLowerCase().includes('volume') || m.toLowerCase().includes('ops'));
                    result = {
                        text: `🔍 **Analyzing Volume/IOPS Metrics for Anomalies:**\n\n${volumeMetrics.map(m => `• \`${m}\``).join('\n')}\n\nI would analyze these metrics for unusual patterns, but I need to connect to an AI service to perform the actual anomaly detection. Please connect to an AI service first.`,
                        data: { type: 'anomaly_analysis_needed', metrics: volumeMetrics }
                    };
                    break;
                    
                case 'findAnomalies':
                    result = {
                        text: "I'm ready to help you find anomalies! Which metrics would you like me to analyze for unusual patterns?",
                        data: { type: 'anomaly_search' },
                        actions: [
                            { label: 'Show Available Metrics', action: 'showMeasurements' }
                        ]
                    };
                    break;
                    
                case 'showHelp':
                    result = await this.processBasicMessage('help');
                    break;
                    
                case 'checkConnection':
                    const connected = window.GrafanaConfig?.connected || false;
                    result = {
                        text: connected 
                            ? "✅ You're connected to a datasource. Try refreshing the schema to load metrics."
                            : "❌ No datasource connection detected. Please connect to Grafana first.",
                        data: { type: 'connection_status', connected }
                    };
                    break;
                    
                case 'showAllMetrics':
                    const allMetrics = await this.getAvailableMetrics();
                    result = await this.handleShowMoreMetrics(allMetrics);
                    break;
                    
                case 'analyzeTopMetrics':
                    const topMetrics = await this.getAvailableMetrics();
                    result = {
                        text: `📊 **Top Metrics Analysis:**\n\n${topMetrics.slice(0, 5).map(m => `• \`${m}\``).join('\n')}\n\nI would analyze these metrics for patterns and anomalies, but I need an AI service connection to perform the actual analysis. Please connect to an AI service first.`,
                        data: { type: 'analysis_needs_ai', metrics: topMetrics.slice(0, 5) }
                    };
                    break;
                    
                case 'checkInitStatus':
                    result = this.getInitializationStatus();
                    break;
                    
                case 'refreshPage':
                    result = {
                        text: "🔄 **Refreshing Page**\n\nI'll refresh the page to reinitialize all systems. Please wait...",
                        data: { type: 'refreshing' }
                    };
                    // Actually refresh after a short delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                    break;
                    
                case 'checkAIConnection':
                case 'reconnectAI':
                    const aiConnected = (window.OpenAIService && window.OpenAIService.isConnected) || 
                                       (window.OllamaService && window.OllamaService.isConnected);
                    result = {
                        text: aiConnected 
                            ? "✅ **AI Service Connected**\n\nYour AI service appears to be connected. The issue might be with the advanced AI system initialization. Try refreshing the page."
                            : "❌ **No AI Service Connected**\n\nPlease connect to an AI service (OpenAI or Ollama) first. Go to the AI Connections section and set up your connection.",
                        data: { type: 'ai_connection_check', connected: aiConnected }
                    };
                    break;
                    
                default:
                    result = {
                        text: `🔄 **Processing Action: ${action}**\n\nI'm working on your request. If my advanced AI system is still initializing, this might take a moment...`,
                        data: { type: 'action_processing' }
                    };
            }
            
            // Remove loading
            this.hideLoading();
            
            // Add response
            this.addMessage('assistant', result.text, result.data);
            
        } catch (error) {
            console.error('Error executing action:', error);
            this.hideLoading();
            this.addMessage('assistant', 'Failed to execute action: ' + error.message, { error: true });
        }
    },

    // Add message to chat
    addMessage(sender, text, data = null) {
        // Prevent duplicate messages from being added to UI
        const textStr = typeof text === 'string' ? text : String(text || '');
        const messageKey = sender + ':' + textStr.substring(0, 100);
        const now = Date.now();
        
        // Check for recent duplicate messages (within 2 seconds)
        if (this.recentMessages && this.recentMessages[messageKey]) {
            const timeDiff = now - this.recentMessages[messageKey];
            if (timeDiff < 2000) {
                console.log('🚫 Duplicate UI message blocked:', messageKey.substring(0, 50) + '...');
                return;
            }
        }
        
        // Initialize recent messages tracking
        if (!this.recentMessages) {
            this.recentMessages = {};
        }
        
        // Store this message
        this.recentMessages[messageKey] = now;
        
        // Clean up old entries (older than 5 seconds)
        Object.keys(this.recentMessages).forEach(key => {
            if (now - this.recentMessages[key] > 5000) {
                delete this.recentMessages[key];
            }
        });
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;
        
        const avatar = sender === 'user' ? '👤' : null; // Will use logo image for assistant
        const hasSamplePrompts = textStr.includes('<div class="sample-prompts">');
        
        // Process content based on sender and content type
        let processedContent;
        if (hasSamplePrompts) {
            // Split text into main content and sample prompts
            const parts = textStr.split('<div class="sample-prompts">');
            const mainContent = parts[0];
            const promptsHtml = '<div class="sample-prompts">' + parts[1];
            
            // Process main content for markdown if it's an assistant message
            let processedMainContent;
            if (sender === 'assistant' && this.containsMarkdown(mainContent)) {
                console.log('🎨 Rendering markdown for assistant message with actions');
                processedMainContent = this.renderMarkdown(mainContent);
            } else {
                processedMainContent = this.escapeHtml(mainContent);
            }
            
            // Combine processed content with sample prompts
            processedContent = processedMainContent + promptsHtml;
        } else if (sender === 'assistant' && this.containsMarkdown(textStr)) {
            console.log('🎨 Rendering markdown for assistant message');
            processedContent = this.renderMarkdown(textStr);
        } else {
            processedContent = this.escapeHtml(textStr);
        }
        
        // SECURITY FIX: Create elements safely to prevent HTML injection
        const avatarEl = document.createElement('div');
        avatarEl.className = 'message-avatar';
        
        if (sender === 'assistant') {
            // Use Time Buddy logo for assistant messages (NativeImage or fallback)
            avatarEl.innerHTML = this.getAvatarHTML();
        } else {
            // Use emoji for user messages
            avatarEl.textContent = avatar;
        }
        
        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        
        // Use innerHTML only for processed content (already escaped or from trusted AI source)
        contentEl.innerHTML = processedContent;
        
        // SECURITY FIX: Handle error messages safely - never use innerHTML for error data
        if (data && data.error) {
            const errorEl = document.createElement('div');
            errorEl.className = 'message-error';
            errorEl.textContent = typeof data.error === 'string' ? data.error : 'An error occurred';
            contentEl.appendChild(errorEl);
        }
        
        // Add enhanced UI features for assistant messages
        if (sender === 'assistant') {
            this.addMessageEnhancements(messageEl, contentEl, data);
        }
        
        messageEl.appendChild(avatarEl);
        messageEl.appendChild(contentEl);

        // Check if we need to remove any welcome messages
        const welcomeMessages = this.ui.messageList.querySelectorAll('.ai-welcome-message');
        welcomeMessages.forEach(msg => msg.remove());

        // Handle display based on active interface
        if (!this.state.hasActivePopOut) {
            // Sidebar is active - show message there
            this.ui.messageList.appendChild(messageEl);
            this.scrollToBottom();
        } else if (sender === 'assistant') {
            // Pop-out is active and this is an assistant response - send to pop-out
            if (window.electronAPI) {
                window.electronAPI.sendChatResponse(textStr);
            }
        }
        // Note: User messages from pop-out are already displayed in the pop-out window

        // Store in conversation history (store plain text version)
        if (!this.state.currentConversationId) {
            this.startNewConversation();
        }

        // Always store messages in conversation history regardless of active interface
        const conversation = this.state.conversations.find(c => c.id === this.state.currentConversationId);
        if (conversation) {
            conversation.messages.push({ 
                sender, 
                text: typeof text === 'string' ? text : String(text), 
                data, 
                timestamp: new Date() 
            });
            
            console.log(`💾 Stored ${sender} message in conversation history. Total messages: ${conversation.messages.length}`);
        }
        
        this.saveConversations();
    },

    // Escape HTML for security
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Add enhanced UI features for assistant messages
    addMessageEnhancements(messageEl, contentEl, data) {
        console.log('🎨 Adding enhanced UI features, data:', data);
        
        try {
        
        // Create metadata container
        const metadataEl = document.createElement('div');
        metadataEl.className = 'message-metadata';
        
        // Add confidence indicator if available
        if (data && data.confidence) {
            const confidenceEl = this.createConfidenceIndicator(data.confidence);
            metadataEl.appendChild(confidenceEl);
        }
        
        // Add data source badges if available
        if (data && data.dataSources) {
            const sourcesEl = this.createDataSourceBadges(data.dataSources);
            metadataEl.appendChild(sourcesEl);
        }
        
        // Add query preview if available
        if (data && data.generatedQuery) {
            const queryPreviewEl = this.createQueryPreview(data.generatedQuery);
            metadataEl.appendChild(queryPreviewEl);
        }
        
        // Add feedback buttons
        const feedbackEl = this.createFeedbackButtons(messageEl);
        metadataEl.appendChild(feedbackEl);
        
        // Add timestamp
        const timestampEl = document.createElement('div');
        timestampEl.className = 'message-timestamp';
        timestampEl.textContent = new Date().toLocaleTimeString();
        metadataEl.appendChild(timestampEl);
        
        // Insert metadata after content (with null check)
        if (contentEl && contentEl.parentNode) {
            contentEl.parentNode.insertBefore(metadataEl, contentEl.nextSibling);
        } else {
            console.warn('⚠️ Cannot insert metadata - contentEl or parentNode is null');
            // Fallback: try to append to messageEl if possible
            if (messageEl) {
                messageEl.appendChild(metadataEl);
            }
        }
        
        } catch (error) {
            console.error('❌ Error adding message enhancements:', error);
        }
    },

    // Create confidence indicator
    createConfidenceIndicator(confidence) {
        const container = document.createElement('div');
        container.className = 'confidence-indicator';
        
        const level = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low';
        const color = level === 'high' ? '#4CAF50' : level === 'medium' ? '#FF9800' : '#f44336';
        const percentage = Math.round(confidence * 100);
        
        container.innerHTML = `
            <span class="confidence-label">Confidence:</span>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${percentage}%; background: ${color}"></div>
            </div>
            <span class="confidence-percentage">${percentage}%</span>
        `;
        
        return container;
    },

    // Create data source badges
    createDataSourceBadges(dataSources) {
        const container = document.createElement('div');
        container.className = 'data-source-badges';
        
        const label = document.createElement('span');
        label.className = 'badges-label';
        label.textContent = 'Data Sources: ';
        container.appendChild(label);
        
        dataSources.forEach(source => {
            const badge = document.createElement('span');
            badge.className = 'data-source-badge';
            badge.textContent = source;
            container.appendChild(badge);
        });
        
        return container;
    },

    // Create query preview with run in editor button
    createQueryPreview(query, datasourceInfo = null) {
        const container = document.createElement('div');
        container.className = 'query-preview';
        
        // Action buttons container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'query-preview-actions';
        actionsContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        
        // Toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'query-toggle-btn';
        toggleBtn.textContent = '📋 View Generated Query';
        
        // Run in editor button
        const runBtn = this.createRunInEditorButton(query, datasourceInfo);
        
        actionsContainer.appendChild(toggleBtn);
        actionsContainer.appendChild(runBtn);
        
        // Query content
        const queryContent = document.createElement('div');
        queryContent.className = 'query-content hidden';
        queryContent.innerHTML = `<pre><code>${this.escapeHtml(query)}</code></pre>`;
        
        // Toggle functionality
        toggleBtn.addEventListener('click', () => {
            queryContent.classList.toggle('hidden');
            toggleBtn.textContent = queryContent.classList.contains('hidden') 
                ? '📋 View Generated Query' 
                : '📋 Hide Query';
        });
        
        container.appendChild(actionsContainer);
        container.appendChild(queryContent);
        
        return container;
    },
    
    // Create run in editor button
    createRunInEditorButton(query, datasourceInfo) {
        const runBtn = document.createElement('button');
        runBtn.className = 'query-run-btn';
        runBtn.innerHTML = '▶️ Run in Editor';
        
        // Style the button
        runBtn.style.cssText = `
            background: rgba(0, 122, 204, 0.2);
            border: 1px solid rgba(0, 122, 204, 0.3);
            color: #4fc3f7;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        // Set datasource class for styling
        const currentDatasourceType = datasourceInfo?.type || GrafanaConfig.selectedDatasourceType || 'influxdb';
        if (currentDatasourceType === 'prometheus') {
            runBtn.style.borderColor = 'rgba(255, 152, 0, 0.3)';
            runBtn.style.color = '#ffb74d';
        }
        
        // Set accessibility attributes
        const datasourceText = currentDatasourceType ? ` (${currentDatasourceType})` : '';
        runBtn.setAttribute('aria-label', `Run query in main editor in new tab${datasourceText}`);
        runBtn.setAttribute('title', `Open this query in the main editor${datasourceText}`);
        
        // Hover effect
        runBtn.addEventListener('mouseenter', () => {
            runBtn.style.background = 'rgba(0, 122, 204, 0.3)';
            runBtn.style.borderColor = 'rgba(0, 122, 204, 0.4)';
            runBtn.style.color = '#81d4fa';
        });
        
        runBtn.addEventListener('mouseleave', () => {
            runBtn.style.background = 'rgba(0, 122, 204, 0.2)';
            runBtn.style.borderColor = 'rgba(0, 122, 204, 0.3)';
            runBtn.style.color = '#4fc3f7';
        });
        
        // Click handler
        runBtn.addEventListener('click', () => {
            this.runQueryInEditor(query, datasourceInfo, runBtn);
        });
        
        return runBtn;
    },
    
    // Handle running query in editor
    async runQueryInEditor(query, datasourceInfo, buttonEl) {
        // Set loading state
        const originalContent = buttonEl.innerHTML;
        buttonEl.innerHTML = '⏳ Opening...';
        buttonEl.disabled = true;
        
        try {
            // Get current datasource info if not provided
            const currentDatasourceType = datasourceInfo?.type || GrafanaConfig.selectedDatasourceType || 'influxdb';
            const currentDatasourceName = datasourceInfo?.name || GrafanaConfig.currentDatasourceName || '';
            
            // Prepare data for main window
            const queryData = {
                query: query,
                datasourceName: currentDatasourceName,
                datasourceType: currentDatasourceType,
                queryType: currentDatasourceType === 'prometheus' ? 'promql' : 'influxql'
            };
            
            console.log('🚀 Running query in editor:', queryData);
            
            // Check if we're in the main window or pop-out
            if (this.isActivePopout && window.electronAPI && typeof window.electronAPI.runQueryInEditor === 'function') {
                // Pop-out window - use IPC
                await window.electronAPI.runQueryInEditor(queryData);
            } else if (typeof Interface !== 'undefined' && Interface.openAIGeneratedQuery) {
                // Main window - call directly (we'll implement this method)
                Interface.openAIGeneratedQuery(queryData);
            } else {
                // Fallback - copy to clipboard
                await navigator.clipboard.writeText(query);
                throw new Error('Editor not available - query copied to clipboard');
            }
            
            // Success state
            buttonEl.innerHTML = '✅ Opened';
            setTimeout(() => {
                buttonEl.innerHTML = originalContent;
                buttonEl.disabled = false;
            }, 1500);
            
        } catch (error) {
            console.error('Failed to run query in editor:', error);
            
            // Error state with message
            buttonEl.innerHTML = error.message.includes('clipboard') ? '📋 Copied' : '❌ Failed';
            setTimeout(() => {
                buttonEl.innerHTML = originalContent;
                buttonEl.disabled = false;
            }, 2000);
        }
    },

    // Create feedback buttons
    createFeedbackButtons(messageEl) {
        const container = document.createElement('div');
        container.className = 'feedback-buttons';
        
        const thumbsUp = document.createElement('button');
        thumbsUp.className = 'feedback-btn thumbs-up';
        thumbsUp.innerHTML = '👍';
        thumbsUp.title = 'This response was helpful';
        
        const thumbsDown = document.createElement('button');
        thumbsDown.className = 'feedback-btn thumbs-down';
        thumbsDown.innerHTML = '👎';
        thumbsDown.title = 'This response needs improvement';
        
        thumbsUp.addEventListener('click', () => {
            this.submitFeedback('positive', messageEl);
            thumbsUp.classList.add('selected');
            thumbsDown.classList.remove('selected');
        });
        
        thumbsDown.addEventListener('click', () => {
            this.submitFeedback('negative', messageEl);
            thumbsDown.classList.add('selected');
            thumbsUp.classList.remove('selected');
        });
        
        container.appendChild(thumbsUp);
        container.appendChild(thumbsDown);
        
        return container;
    },

    // Submit feedback to improve RAG system
    submitFeedback(type, messageEl) {
        console.log(`📝 User feedback: ${type}`);
        
        // Send feedback to Advanced AI system for learning
        if (window.AdvancedAI && window.AdvancedAI.components.ragSystem) {
            try {
                window.AdvancedAI.components.ragSystem.recordUserFeedback({
                    type: type,
                    messageContent: messageEl.querySelector('.message-content').textContent,
                    timestamp: new Date().toISOString()
                });
                
                // Show brief confirmation
                const feedbackContainer = messageEl.querySelector('.feedback-buttons');
                const confirmation = document.createElement('span');
                confirmation.className = 'feedback-confirmation';
                confirmation.textContent = 'Thanks for your feedback!';
                feedbackContainer.appendChild(confirmation);
                
                setTimeout(() => {
                    if (confirmation.parentNode) {
                        confirmation.remove();
                    }
                }, 2000);
                
            } catch (error) {
                console.error('Failed to record feedback:', error);
            }
        }
    },

    // Check if text contains markdown formatting
    containsMarkdown(text) {
        const markdownPatterns = [
            /#{1,6}\s+.+/,           // Headers (# ## ###)
            /\*\*.+?\*\*/,           // Bold (**text**)
            /\*.+?\*/,               // Italic (*text*)
            /`{1,3}.+?`{1,3}/,       // Code (`code` or ```code```)
            /^\s*[\*\-\+]\s+/m,      // Unordered lists (* - +)
            /^\s*\d+\.\s+/m,         // Ordered lists (1. 2.)
            /\[.+?\]\(.+?\)/,        // Links [text](url)
        ];
        
        const hasMarkdown = markdownPatterns.some(pattern => pattern.test(text));
        console.log(`🔍 Markdown detection for text (${text.substring(0, 50)}...): ${hasMarkdown}`);
        return hasMarkdown;
    },

    // Simple markdown to HTML converter
    renderMarkdown(text) {
        console.log('🎨 renderMarkdown called with:', text.substring(0, 200) + '...');
        console.log('🔍 marked available:', typeof marked !== 'undefined');
        console.log('🔍 hljs available:', typeof hljs !== 'undefined');
        
        // Check for code blocks in the input
        const codeBlockMatches = text.match(/```[\s\S]*?```/g);
        console.log('🔍 Code blocks found:', codeBlockMatches ? codeBlockMatches.length : 0);
        if (codeBlockMatches) {
            codeBlockMatches.forEach((block, i) => {
                console.log(`📝 Code block ${i + 1}:`, block.substring(0, 100) + '...');
            });
        }
        
        // Configure marked.js with highlight.js for syntax highlighting
        if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
            console.log('✅ Using marked.js with highlight.js');
            
            // Test if highlight.js is working
            console.log('🧪 Testing hljs.highlight with SQL:', hljs.getLanguage('sql') ? 'available' : 'not available');
            
            const renderer = new marked.Renderer();
            const originalCode = renderer.code;
            renderer.code = function(code, lang, escaped) {
                console.log('🌈 Custom renderer code function called, lang:', lang);
                
                // Map custom query languages to appropriate highlighters
                const languageMap = {
                    'influxql': 'sql',
                    'promql': 'javascript',
                    'prometheus': 'javascript'
                };
                
                const mappedLang = languageMap[lang] || lang;
                console.log('🎯 Mapped language:', mappedLang);
                
                if (mappedLang && hljs.getLanguage(mappedLang)) {
                    try {
                        const result = hljs.highlight(code, { language: mappedLang }).value;
                        console.log('✨ Syntax highlighting successful');
                        // Add inline styles as fallback in case CSS doesn't load
                        return `<pre style="background: #1e1e1e; padding: 12px; border-radius: 4px; overflow-x: auto;"><code class="hljs language-${mappedLang}" style="color: #d4d4d4; font-family: 'Courier New', Consolas, monospace;">${result}</code></pre>`;
                    } catch (err) {
                        console.warn('Syntax highlighting failed for language:', mappedLang, err);
                    }
                }
                
                const autoResult = hljs.highlightAuto(code).value;
                console.log('🔄 Using auto-detection');
                return `<pre style="background: #1e1e1e; padding: 12px; border-radius: 4px; overflow-x: auto;"><code class="hljs" style="color: #d4d4d4; font-family: 'Courier New', Consolas, monospace;">${autoResult}</code></pre>`;
            };
            
            marked.setOptions({
                renderer: renderer,
                breaks: true,
                gfm: true
            });
            
            try {
                const result = marked.parse(text);
                console.log('✅ Marked.js parsing successful');
                
                // Debug: log a snippet of the generated HTML to see if classes are present
                const codeMatch = result.match(/<pre><code[^>]*>[\s\S]*?<\/code><\/pre>/);
                if (codeMatch) {
                    console.log('🔍 Generated HTML sample:', codeMatch[0].substring(0, 200) + '...');
                }
                
                return result;
            } catch (err) {
                console.error('Markdown parsing failed, falling back to simple HTML:', err);
                return this.fallbackMarkdown(text);
            }
        } else {
            console.warn('❌ marked.js or highlight.js not available, using fallback');
            return this.fallbackMarkdown(text);
        }
    },
    
    // Fallback markdown renderer for when libraries aren't available
    fallbackMarkdown(text) {
        let html = text;
        
        // Headers
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        // Bold and italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code blocks
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const languageClass = lang ? ` class="language-${lang}"` : '';
            const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre><code${languageClass}>${escapedCode.trim()}</code></pre>`;
        });
        
        // Inline code
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');
        
        return html;
    },

    // Convert markdown lists to HTML lists
    convertMarkdownLists(text) {
        // Handle unordered lists
        text = text.replace(/^(\s*[\*\-\+]\s+.+(?:\n\s*[\*\-\+]\s+.+)*)/gm, (match) => {
            const items = match.split('\n').map(line => {
                const cleaned = line.replace(/^\s*[\*\-\+]\s+/, '').trim();
                return cleaned ? `<li>${cleaned}</li>` : '';
            }).filter(Boolean).join('');
            return `<ul>${items}</ul>`;
        });
        
        // Handle ordered lists
        text = text.replace(/^(\s*\d+\.\s+.+(?:\n\s*\d+\.\s+.+)*)/gm, (match) => {
            const items = match.split('\n').map(line => {
                const cleaned = line.replace(/^\s*\d+\.\s+/, '').trim();
                return cleaned ? `<li>${cleaned}</li>` : '';
            }).filter(Boolean).join('');
            return `<ol>${items}</ol>`;
        });
        
        return text;
    },

    // Pop out chat into floating window using Electron IPC
    async popOutChat() {
        // Ensure we have a current conversation
        if (!this.state.currentConversationId) {
            this.startNewConversation();
        }
        
        // Mark that we have an active pop-out FIRST
        this.state.hasActivePopOut = true;
        
        // Hide sidebar chat and show "bring back" button
        this.hideSidebarChat();
        
        // Open pop-out window with current conversation (serialized)
        try {
            const currentConversation = this.state.conversations.find(c => c.id === this.state.currentConversationId);
            
            // Create a simple conversation object for IPC
            const simpleConversation = currentConversation ? {
                messages: (currentConversation.messages || []).map(msg => ({
                    sender: msg.sender || msg.role || 'user',
                    text: msg.text || msg.content || '',
                    data: null // Skip data to avoid serialization issues
                }))
            } : { messages: [] };
            
            await window.electronAPI.openChatWindow({
                conversation: simpleConversation
            });
            console.log('✅ AI Assistant chat window opened - sidebar hidden');
            
        } catch (error) {
            console.error('❌ Failed to open chat window:', error);
            // If failed to open, restore sidebar and reset state
            this.state.hasActivePopOut = false;
            this.showSidebarChat();
        }
    },
    

    // Setup Electron IPC communication with chat window
    setupElectronChatCommunication() {
        if (!window.electronAPI) {
            console.log('⚠️ Electron API not available, skipping chat window communication setup');
            return;
        }
        
        // Listen for messages from the chat window
        window.electronAPI.onChatMessageFromPopup((message) => {
            console.log('📨 Received message from chat window:', message);
            this.handleChatWindowMessage(message);
        });
        
        // Listen for chat window close events
        window.electronAPI.onChatWindowClosed(() => {
            console.log('🪟 Chat window closed - restoring sidebar');
            this.bringBackToSidebar();
        });
        
        console.log('✅ Electron chat window communication setup complete');
    },

    // Hide sidebar chat and show "bring back" button
    hideSidebarChat() {
        console.log('🫥 Hiding sidebar chat, UI elements:', {
            messageList: !!this.ui.messageList,
            input: !!this.ui.input,
            inputParent: this.ui.input ? !!this.ui.input.parentElement : false
        });
        
        if (!this.ui.messageList) {
            console.warn('⚠️ No messageList found, cannot hide sidebar');
            return;
        }
        
        // Hide the chat messages and input
        this.ui.messageList.style.display = 'none';
        if (this.ui.input && this.ui.input.parentElement) {
            console.log('🫥 Hiding input container');
            this.ui.input.parentElement.style.display = 'none';
        }
        
        // Create and show "bring back" button
        this.showBringBackButton();
    },

    // Show sidebar chat and hide "bring back" button
    showSidebarChat() {
        console.log('👁️ Showing sidebar chat');
        
        if (!this.ui.messageList) {
            console.log('ℹ️ No embedded messageList found - using conversation list only (new architecture)');
            return;
        }
        
        // Hide "bring back" button first
        this.hideBringBackButton();
        
        // Show the chat messages and input with proper styling
        this.ui.messageList.style.display = 'block';
        if (this.ui.input && this.ui.input.parentElement) {
            console.log('👁️ Showing input container');
            const inputContainer = this.ui.input.parentElement;
            inputContainer.style.display = 'flex';
            inputContainer.style.width = '100%';
            inputContainer.style.minHeight = 'auto'; // Reset any height constraints
            
            // Ensure input styling is correct
            this.ui.input.style.width = '';
            this.ui.input.style.height = '';
            this.ui.input.style.fontSize = '';
            
            // Ensure send button styling is correct
            if (this.ui.sendButton) {
                this.ui.sendButton.style.width = '';
                this.ui.sendButton.style.height = '';
                this.ui.sendButton.style.fontSize = '';
            }
        }
        
        this.state.hasActivePopOut = false;
        console.log('✅ Sidebar chat restored');
    },

    // Show the "bring back to sidebar" button
    showBringBackButton() {
        // Remove existing button if any
        this.hideBringBackButton();
        
        const bringBackButton = document.createElement('div');
        bringBackButton.id = 'aiChatBringBack';
        bringBackButton.className = 'ai-bring-back-container';
        bringBackButton.innerHTML = `
            <div class="ai-bring-back-message">
                <div class="ai-bring-back-icon">🪟</div>
                <div class="ai-bring-back-text">
                    <h4>AI Assistant opened in separate window</h4>
                    <p>Chat is now available in the pop-out window</p>
                </div>
            </div>
            <button class="ai-bring-back-button" onclick="AIAgent.bringBackToSidebar()">
                📥 Bring Back to Sidebar
            </button>
        `;
        
        // Add styles with ID for cleanup
        const style = document.createElement('style');
        style.id = 'aiChatBringBackStyles';
        style.textContent = `
            .ai-bring-back-container {
                padding: 20px;
                text-align: center;
                background: #2d2d30;
                border-radius: 8px;
                margin: 10px;
                border: 1px solid #454545;
            }
            .ai-bring-back-message {
                margin-bottom: 15px;
            }
            .ai-bring-back-icon {
                font-size: 48px;
                margin-bottom: 10px;
            }
            .ai-bring-back-text h4 {
                color: #ffffff;
                margin: 0 0 5px 0;
                font-size: 16px;
            }
            .ai-bring-back-text p {
                color: #cccccc;
                margin: 0;
                font-size: 14px;
            }
            .ai-bring-back-button {
                background: #007acc;
                border: none;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: background 0.2s;
            }
            .ai-bring-back-button:hover {
                background: #005a9e;
            }
        `;
        document.head.appendChild(style);
        
        // Insert the button where the chat messages were
        if (this.ui.messageList && this.ui.messageList.parentElement) {
            this.ui.messageList.parentElement.insertBefore(bringBackButton, this.ui.messageList);
        }
    },

    // Hide the "bring back to sidebar" button
    hideBringBackButton() {
        const existingButton = document.getElementById('aiChatBringBack');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Also remove any injected styles for the bring back button
        const existingStyle = document.getElementById('aiChatBringBackStyles');
        if (existingStyle) {
            existingStyle.remove();
        }
    },

    // Bring chat back from pop-out to sidebar
    async bringBackToSidebar() {
        console.log('📥 Bringing AI Assistant back to sidebar');
        
        // Reset the active pop-out state first
        this.state.hasActivePopOut = false;
        
        // First, try to close the chat window
        try {
            if (window.electronAPI) {
                await window.electronAPI.closeChatWindow();
                console.log('✅ Chat window close requested');
            }
        } catch (error) {
            console.warn('⚠️ Could not close chat window via IPC:', error);
        }
        
        // Show sidebar chat
        this.showSidebarChat();
        
        // Ensure we have a current conversation
        if (!this.state.currentConversationId) {
            console.log('🔄 No current conversation, creating new one');
            this.startNewConversation();
        }
        
        // Debug: Log current conversation state
        const currentConversation = this.state.conversations.find(c => c.id === this.state.currentConversationId);
        console.log('🔍 Current conversation state:', {
            id: this.state.currentConversationId,
            hasConversation: !!currentConversation,
            messageCount: currentConversation ? currentConversation.messages.length : 0,
            messages: currentConversation ? currentConversation.messages.map(m => ({
                sender: m.sender || m.role,
                textPreview: (m.text || m.content || '').substring(0, 30) + '...'
            })) : []
        });
        
        // Force update the conversation display
        this.updateConversationDisplay();
        
        // Focus the sidebar input
        if (this.ui.input) {
            this.ui.input.focus();
        }
        
        console.log('✅ AI Assistant brought back to sidebar');
    },

    // Handle messages from the chat window
    async handleChatWindowMessage(message) {
        // Don't process if we don't have an active pop-out
        if (!this.state.hasActivePopOut) {
            console.warn('Received chat window message but no active pop-out');
            return;
        }
        
        console.log('📨 Processing chat window message:', message);
        
        // Show loading in chat window
        window.electronAPI.showChatLoading();
        
        try {
            // Ensure we have a current conversation
            if (!this.state.currentConversationId) {
                console.log('Creating new conversation for pop-out message');
                this.startNewConversation();
            }
            
            // Add the user message to the current conversation first
            const currentConversation = this.state.conversations.find(c => c.id === this.state.currentConversationId);
            if (currentConversation) {
                currentConversation.messages.push({
                    sender: 'user',
                    text: message,
                    timestamp: new Date().toISOString(),
                    data: null
                });
                console.log('✅ User message added to conversation');
            }
            
            // Process the message using the main AI Agent
            const response = await this.processMessage(message);
            
            // Add the AI response to the conversation
            if (response && response.text && currentConversation) {
                currentConversation.messages.push({
                    sender: 'assistant',
                    text: response.text,
                    timestamp: new Date().toISOString(),
                    data: response.data || null
                });
                console.log('✅ AI response added to conversation');
                
                // Save the updated conversation
                this.saveConversations();
            }
            
            // Send the response back to the chat window with enhanced data
            if (response && response.text) {
                // Send full response object to support enhanced UI features in pop-out
                const enhancedResponse = {
                    text: response.text,
                    data: response.data || {},
                    actions: response.actions || [],
                    timestamp: new Date().toISOString()
                };
                window.electronAPI.sendChatResponse(enhancedResponse);
                console.log('✅ Enhanced response sent to chat window with data:', enhancedResponse.data);
            }
            
        } catch (error) {
            console.error('Error processing chat window message:', error);
            // Send error response to chat window
            const errorResponse = {
                text: 'I encountered an error processing your request. Please try again.',
                data: { type: 'error', error: error.message },
                actions: [],
                timestamp: new Date().toISOString()
            };
            window.electronAPI.sendChatResponse(errorResponse);
        } finally {
            // Hide loading in chat window
            window.electronAPI.hideChatLoading();
        }
    },




    // Show loading indicator
    showLoading() {
        const loadingEl = document.createElement('div');
        loadingEl.className = 'message assistant';
        loadingEl.id = 'aiAgentLoading';
        // Create loading element with Time Buddy logo
        const avatarEl = document.createElement('div');
        avatarEl.className = 'message-avatar';
        
        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        contentEl.innerHTML = `
                <div class="message-loading">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
        
        loadingEl.appendChild(avatarEl);
        loadingEl.appendChild(contentEl);
        this.ui.messageList.appendChild(loadingEl);
        this.scrollToBottom();
    },

    // Hide loading indicator
    hideLoading() {
        const loading = document.getElementById('aiAgentLoading');
        if (loading) {
            loading.remove();
        }
    },

    // Scroll to bottom of messages
    scrollToBottom() {
        this.ui.messageList.scrollTop = this.ui.messageList.scrollHeight;
    },

    // Start new conversation
    startNewConversation() {
        const conversation = {
            id: Date.now().toString(),
            messages: [],
            createdAt: new Date(),
            context: { ...this.state.context }
        };
        
        this.state.conversations.push(conversation);
        this.state.currentConversationId = conversation.id;
        
        // Limit to last 10 conversations
        if (this.state.conversations.length > 10) {
            this.state.conversations.shift();
        }
        
        this.saveConversations();
    },

    // Create new conversation (alias for compatibility)
    createNewConversation() {
        return this.startNewConversation();
    },

    // Update conversation display with current messages
    updateConversationDisplay() {
        if (!this.ui.messageList) {
            console.log('ℹ️ No embedded messageList found - using conversation list only (new architecture)');
            return;
        }

        // Clear existing messages
        this.ui.messageList.innerHTML = '';

        // Find current conversation
        const currentConversation = this.state.conversations.find(
            c => c.id === this.state.currentConversationId
        );

        if (!currentConversation || !currentConversation.messages) {
            return;
        }

        // Display all messages in the conversation by directly adding to sidebar
        console.log(`🔄 Rebuilding sidebar with ${currentConversation.messages.length} messages`);
        for (const message of currentConversation.messages) {
            // Handle different message formats (content/text, role/sender)
            const text = message.text || message.content || '';
            const sender = message.sender || (message.role === 'user' ? 'user' : 'assistant');
            const data = message.data || null;
            
            console.log(`📝 Adding ${sender} message to sidebar: ${text.substring(0, 50)}...`);
            this.addMessageDirectlyToSidebar(sender, text, data);
        }

        // Scroll to bottom
        this.scrollToBottom();
    },

    // Add message directly to sidebar (bypasses active interface logic)
    addMessageDirectlyToSidebar(sender, text, data = null) {
        if (!this.ui.messageList) {
            console.warn('Cannot add message to sidebar - messageList not found');
            return;
        }

        // Create message element (same logic as addMessage but forced to sidebar)
        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;
        
        const avatar = sender === 'user' ? '👤' : null; // Will use logo image for assistant
        const textStr = typeof text === 'string' ? text : String(text || '');
        const hasSamplePrompts = textStr.includes('<div class="sample-prompts">');
        
        // Process content based on sender and content type
        let processedContent;
        if (hasSamplePrompts) {
            // Split text into main content and sample prompts
            const parts = textStr.split('<div class="sample-prompts">');
            const mainContent = parts[0];
            const promptsHtml = '<div class="sample-prompts">' + parts[1];
            
            // Process main content for markdown if it's an assistant message
            let processedMainContent;
            if (sender === 'assistant' && this.containsMarkdown(mainContent)) {
                processedMainContent = this.renderMarkdown(mainContent);
            } else {
                processedMainContent = this.escapeHtml(mainContent);
            }
            
            // Combine processed content with sample prompts
            processedContent = processedMainContent + promptsHtml;
        } else if (sender === 'assistant' && this.containsMarkdown(textStr)) {
            processedContent = this.renderMarkdown(textStr);
        } else {
            processedContent = this.escapeHtml(textStr);
        }
        
        // SECURITY FIX: Create elements safely to prevent HTML injection
        const avatarEl = document.createElement('div');
        avatarEl.className = 'message-avatar';
        
        if (sender === 'assistant') {
            // Use Time Buddy logo for assistant messages (NativeImage or fallback)
            avatarEl.innerHTML = this.getAvatarHTML();
        } else {
            // Use emoji for user messages
            avatarEl.textContent = avatar;
        }
        
        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        
        // Use innerHTML only for processed content (already escaped or from trusted AI source)
        contentEl.innerHTML = processedContent;
        
        // SECURITY FIX: Handle error messages safely - never use innerHTML for error data
        if (data && data.error) {
            const errorEl = document.createElement('div');
            errorEl.className = 'message-error';
            errorEl.textContent = typeof data.error === 'string' ? data.error : 'An error occurred';
            contentEl.appendChild(errorEl);
        }
        
        // Add enhanced UI features for assistant messages (same as main addMessage method)
        if (sender === 'assistant') {
            console.log('🚀 About to call addMessageEnhancements from addMessageDirectlyToSidebar');
            this.addMessageEnhancements(messageEl, contentEl, data);
        }
        
        messageEl.appendChild(avatarEl);
        messageEl.appendChild(contentEl);

        // Always add to sidebar messageList
        this.ui.messageList.appendChild(messageEl);
    },

    // Display message (alias for addMessage with different parameter order)
    displayMessage(text, role, type = 'normal') {
        // Convert role to sender format and call addMessage
        const sender = role === 'user' ? 'user' : 'assistant';
        const data = type !== 'normal' ? { type } : null;
        this.addMessage(sender, text, data);
    },

    // Load conversations from storage using new Storage system
    loadConversations() {
        try {
            // Migrate old conversations if they exist
            this.migrateOldConversations();
            
            // Load conversations using new Storage system
            this.state.conversations = Storage.getAiConversations();
            
            console.log(`📚 Loaded ${this.state.conversations.length} conversations from storage`);
        } catch (error) {
            console.error('Failed to load conversations:', error);
            this.state.conversations = [];
        }
    },

    // Save conversations using new Storage system
    saveConversations() {
        try {
            // The Storage system already handles limits and security
            // Just update the conversations array in storage
            if (this.state.currentConversationId) {
                const currentConversation = this.getCurrentConversation();
                if (currentConversation) {
                    this.saveCurrentConversation();
                }
            }
            
            console.log(`💾 Saved ${this.state.conversations.length} conversations`);
        } catch (error) {
            console.error('Failed to save conversations:', error);
        }
    },

    // Get current conversation object
    getCurrentConversation() {
        if (!this.state.currentConversationId) return null;
        return this.state.conversations.find(c => c.id === this.state.currentConversationId);
    },

    // ===== NEW CONVERSATION MANAGEMENT METHODS =====

    // Save current conversation to persistent storage
    saveCurrentConversation() {
        if (!this.state.currentConversationId) return;
        
        const conversation = this.getCurrentConversation();
        if (!conversation) return;
        
        // Update conversation metadata
        const conversationData = {
            ...conversation,
            updatedAt: new Date().toISOString(),
            datasourceContext: this.getDatasourceContext(),
            messageCount: conversation.messages.length,
            lastMessagePreview: conversation.messages.length > 0 ? 
                Storage.getLastMessagePreview(conversation.messages) : ''
        };
        
        // Save to persistent storage
        Storage.saveAiConversation(conversationData);
        
        // Update local state
        const index = this.state.conversations.findIndex(c => c.id === conversation.id);
        if (index !== -1) {
            this.state.conversations[index] = conversationData;
        }
        
        // Refresh conversation list UI
        this.renderConversationList();
    },

    // Create new conversation with enhanced metadata
    createNewConversationWithMetadata(title = null) {
        const conversationId = Storage.generateConversationId();
        const conversation = {
            id: conversationId,
            title: title || 'New Conversation',
            messages: [],
            tags: [],
            starred: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            datasourceContext: this.getDatasourceContext(),
            messageCount: 0,
            lastMessagePreview: ''
        };
        
        // Save to persistent storage
        Storage.saveAiConversation(conversation);
        
        // Add to local state
        this.state.conversations.unshift(conversation);
        this.state.currentConversationId = conversationId;
        
        // Refresh UI
        this.renderConversationList();
        
        return conversation;
    },

    // Delete conversation
    deleteConversation(conversationId) {
        if (!conversationId) return;
        
        // Remove from persistent storage
        Storage.deleteAiConversation(conversationId);
        
        // Remove from local state
        this.state.conversations = this.state.conversations.filter(c => c.id !== conversationId);
        
        // If we deleted the current conversation, clear it
        if (this.state.currentConversationId === conversationId) {
            this.state.currentConversationId = null;
        }
        
        // Refresh UI
        this.renderConversationList();
    },

    // Toggle conversation star
    toggleConversationStar(conversationId) {
        const result = Storage.toggleConversationStar(conversationId);
        if (result) {
            // Update local state
            const index = this.state.conversations.findIndex(c => c.id === conversationId);
            if (index !== -1) {
                this.state.conversations[index] = result;
            }
            
            // Refresh UI
            this.renderConversationList();
        }
    },

    // Add tags to conversation
    addConversationTags(conversationId, tags) {
        const result = Storage.addConversationTags(conversationId, tags);
        if (result) {
            // Update local state
            const index = this.state.conversations.findIndex(c => c.id === conversationId);
            if (index !== -1) {
                this.state.conversations[index] = result;
            }
            
            // Refresh UI
            this.renderConversationList();
        }
    },

    // Search conversations
    searchConversations(searchTerm, options = {}) {
        return Storage.searchAiConversations(searchTerm, options);
    },

    // Get all available tags
    getAllConversationTags() {
        return Storage.getAllConversationTags();
    },

    // Migrate old conversations to new format
    migrateOldConversations() {
        try {
            const oldConversations = localStorage.getItem('aiAgentConversations');
            if (oldConversations) {
                const parsed = JSON.parse(oldConversations);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`🔄 Migrating ${parsed.length} old conversations...`);
                    
                    // Convert old format to new format
                    parsed.forEach(oldConv => {
                        const newConversation = {
                            id: oldConv.id || Storage.generateConversationId(),
                            title: oldConv.title || Storage.generateConversationTitle(oldConv.messages),
                            messages: oldConv.messages || [],
                            tags: oldConv.tags || [],
                            starred: oldConv.starred || false,
                            createdAt: oldConv.timestamp || new Date().toISOString(),
                            updatedAt: oldConv.timestamp || new Date().toISOString(),
                            datasourceContext: null,
                            messageCount: (oldConv.messages || []).length,
                            lastMessagePreview: Storage.getLastMessagePreview(oldConv.messages || [])
                        };
                        
                        Storage.saveAiConversation(newConversation);
                    });
                    
                    // Remove old storage key
                    localStorage.removeItem('aiAgentConversations');
                    
                    console.log('✅ Migration completed successfully');
                }
            }
        } catch (error) {
            console.error('Error migrating old conversations:', error);
        }
    },

    // Get current datasource context
    getDatasourceContext() {
        return {
            datasourceId: GrafanaConfig.currentDatasourceId,
            datasourceName: GrafanaConfig.selectedDatasourceName,
            datasourceType: GrafanaConfig.selectedDatasourceType,
            timestamp: new Date().toISOString()
        };
    },

    // Receive proactive messages from the advanced AI system
    receiveProactiveMessage(message, retryCount = 0) {
        try {
            console.log('💡 Received proactive message:', message);
            
            // Prevent infinite recursion
            if (retryCount > 3) {
                console.warn('⚠️ Maximum retries reached for proactive message, skipping');
                return;
            }
            
            // Prevent processing if UI elements are missing (indicates crash/reload scenario)
            if (!this.ui.messageList) {
                console.warn('⚠️ UI elements missing, skipping proactive message');
                return;
            }
            
            // Add the proactive message to the current conversation
            if (this.state.currentConversationId) {
                const conversation = this.state.conversations.find(c => c.id === this.state.currentConversationId);
                if (conversation) {
                    // Check for duplicate messages to prevent loops
                    const isDuplicate = conversation.messages.some(msg => 
                        msg.type === 'proactive' && 
                        (msg.content === (message.text || message)) &&
                        (Date.now() - new Date(msg.timestamp).getTime()) < 5000 // Within 5 seconds
                    );
                    
                    if (isDuplicate) {
                        console.log('⚠️ Duplicate proactive message detected, skipping');
                        return;
                    }
                    
                    conversation.messages.push({
                        role: 'assistant',
                        content: message.text || message,
                        timestamp: new Date(),
                        type: 'proactive',
                        data: message.data || {},
                        actions: message.actions || []
                    });
                    
                    // Update the UI safely with timeout to prevent blocking
                    setTimeout(() => {
                        try {
                            this.updateConversationDisplay();
                            this.saveConversations();
                            
                            // Auto-scroll to new message
                            const chatContainer = document.querySelector('.ai-chat-messages');
                            if (chatContainer) {
                                setTimeout(() => {
                                    chatContainer.scrollTop = chatContainer.scrollHeight;
                                }, 50);
                            }
                        } catch (error) {
                            console.error('Error updating conversation display:', error);
                        }
                    }, 10);
                }
            } else {
                // Create a new conversation for the proactive message
                try {
                    this.createNewConversation();
                    
                    // Verify conversation was created before retrying
                    if (this.state.currentConversationId) {
                        // Retry with small delay to allow conversation to be fully created
                        setTimeout(() => this.receiveProactiveMessage(message, retryCount + 1), 50);
                    } else {
                        console.warn('⚠️ Failed to create conversation for proactive message');
                    }
                } catch (error) {
                    console.error('Error creating new conversation:', error);
                }
            }
        } catch (error) {
            console.error('Critical error in receiveProactiveMessage:', error);
            // Don't throw the error to prevent crashing the entire app
        }
    },

    // Receive proactive notifications (alternative method name for compatibility)
    receiveProactiveNotification(notification) {
        console.log('🔔 Received proactive notification:', notification);
        
        // Convert notification to message format
        const message = {
            text: `**${notification.title}**\n\n${notification.message}`,
            data: { 
                type: 'notification', 
                priority: notification.priority,
                tags: notification.tags 
            },
            actions: notification.actions || []
        };
        
        this.receiveProactiveMessage(message);
    },

    // Get initialization status instead of fallback processing
    getInitializationStatus() {
        // Check what's initializing
        const status = {
            advancedAI: !!window.AdvancedAI,
            components: !!(window.AdvancedAI && window.AdvancedAI.components),
            agent: !!(window.AdvancedAI && window.AdvancedAI.components && window.AdvancedAI.components.advancedAgent),
            initialized: !!(window.AdvancedAI && window.AdvancedAI.isInitialized)
        };
        
        console.log('🔍 AI Initialization Status:', status);
        
        if (!status.advancedAI) {
            return {
                text: "🚀 **AI System Starting Up**\n\nI'm currently initializing my advanced AI capabilities. This includes:\n\n• 🧠 Natural Language Processing\n• 📊 Intelligent Query Generation\n• 🔍 Advanced Anomaly Detection\n• 📈 Smart Data Analysis\n\nPlease wait a moment while I finish setting up...",
                data: { type: 'initializing', stage: 'starting' },
                actions: [
                    { label: 'Check Status', action: 'checkInitStatus' }
                ]
            };
        }
        
        if (!status.components) {
            return {
                text: "⚙️ **Loading AI Components**\n\nI'm currently loading my advanced components:\n\n• 🔄 RAG System\n• 🔄 Query Generator\n• 🔄 Advanced Agent\n• 🔄 Monitoring System\n\nThis should only take a few more seconds...",
                data: { type: 'initializing', stage: 'components' },
                actions: [
                    { label: 'Check Status', action: 'checkInitStatus' }
                ]
            };
        }
        
        if (!status.agent) {
            return {
                text: "🧠 **Initializing AI Agent**\n\nI'm setting up my intelligent agent capabilities:\n\n• 🔄 Knowledge Base Loading\n• 🔄 Query Pattern Recognition\n• 🔄 Context Management\n• 🔄 Response Generation\n\nAlmost ready...",
                data: { type: 'initializing', stage: 'agent' },
                actions: [
                    { label: 'Check Status', action: 'checkInitStatus' }
                ]
            };
        }
        
        if (!status.initialized) {
            return {
                text: "🔧 **Finalizing AI Setup**\n\nI'm completing the final initialization steps:\n\n• ✅ Components Loaded\n• 🔄 System Integration\n• 🔄 Capability Testing\n• 🔄 Ready Check\n\nJust a moment more...",
                data: { type: 'initializing', stage: 'finalizing' },
                actions: [
                    { label: 'Check Status', action: 'checkInitStatus' }
                ]
            };
        }
        
        // Should not reach here if properly initialized
        return {
            text: "❓ **Initialization Status Unknown**\n\nThere seems to be an issue with my initialization process. Please try refreshing the page or reconnecting to your AI service.",
            data: { type: 'init_error', status },
            actions: [
                { label: 'Refresh Page', action: 'refreshPage' },
                { label: 'Reconnect AI', action: 'reconnectAI' }
            ]
        };
    },

    // ======================================
    // CONVERSATION LIST UI METHODS
    // ======================================

    // Render the conversation list in the sidebar
    renderConversationList() {
        if (!this.ui.conversationList) return;

        const conversations = this.state.conversations || [];
        
        if (conversations.length === 0) {
            this.ui.conversationList.innerHTML = `
                <div class="empty-state">
                    <div style="margin-bottom: 12px; color: #858585;">No conversations yet</div>
                    <button class="primary-button" onclick="AIAgent.createNewConversation()" style="font-size: 12px; padding: 6px 12px;">
                        Start Your First Conversation
                    </button>
                </div>
            `;
            return;
        }

        // Sort conversations by date (most recent first)
        const sortedConversations = [...conversations].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        const conversationItems = sortedConversations.map(conv => this.createConversationListItem(conv)).join('');
        this.ui.conversationList.innerHTML = conversationItems;
    },

    // Create a single conversation list item
    createConversationListItem(conversation) {
        const title = this.getConversationTitle(conversation);
        const preview = this.getConversationPreview(conversation);
        const date = this.formatConversationDate(conversation.timestamp);
        const messageCount = conversation.messages ? conversation.messages.length : 0;
        const isActive = conversation.id === this.state.currentConversationId;
        const isStarred = conversation.starred;
        const tags = conversation.tags || [];

        return `
            <div class="conversation-item ${isActive ? 'active' : ''} ${isStarred ? 'starred' : ''}" 
                 data-conversation-id="${conversation.id}" 
                 onclick="AIAgent.openConversation('${conversation.id}')">
                <div class="conversation-header">
                    <h4 class="conversation-title">${title}</h4>
                    <div class="conversation-actions">
                        <button class="conversation-action-btn ${isStarred ? 'starred' : ''}" 
                                onclick="event.stopPropagation(); AIAgent.toggleConversationStar('${conversation.id}')" 
                                title="${isStarred ? 'Remove from favorites' : 'Add to favorites'}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                        </button>
                        <button class="conversation-action-btn" 
                                onclick="event.stopPropagation(); AIAgent.showConversationMenu('${conversation.id}')" 
                                title="More options">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                ${preview ? `<div class="conversation-preview">${preview}</div>` : ''}
                <div class="conversation-metadata">
                    <div class="conversation-date">${date}</div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${tags.length > 0 ? `
                            <div class="conversation-tags">
                                ${tags.slice(0, 2).map(tag => `<span class="conversation-tag">${tag}</span>`).join('')}
                                ${tags.length > 2 ? `<span class="conversation-tag">+${tags.length - 2}</span>` : ''}
                            </div>
                        ` : ''}
                        <div class="conversation-message-count">${messageCount}</div>
                    </div>
                </div>
            </div>
        `;
    },

    // Get conversation title (first user message or default)
    getConversationTitle(conversation) {
        if (conversation.title) return conversation.title;
        
        const firstUserMessage = conversation.messages?.find(msg => msg.sender === 'user');
        if (firstUserMessage) {
            const title = firstUserMessage.text.slice(0, 50);
            return title.length < firstUserMessage.text.length ? title + '...' : title;
        }
        
        return 'New Conversation';
    },

    // Get conversation preview (last message)
    getConversationPreview(conversation) {
        if (!conversation.messages || conversation.messages.length === 0) return '';
        
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        const text = typeof lastMessage.text === 'string' ? lastMessage.text : '';
        
        // Strip markdown and HTML for preview
        const plainText = text.replace(/[*_`#\[\]]/g, '').replace(/<[^>]*>/g, '');
        return plainText.slice(0, 100) + (plainText.length > 100 ? '...' : '');
    },

    // Format conversation date
    formatConversationDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    },

    // Handle conversation search
    handleConversationSearch(query) {
        if (!this.ui.conversationList) return;
        
        const items = this.ui.conversationList.querySelectorAll('.conversation-item');
        const searchTerm = query.toLowerCase().trim();
        
        items.forEach(item => {
            const title = item.querySelector('.conversation-title')?.textContent?.toLowerCase() || '';
            const preview = item.querySelector('.conversation-preview')?.textContent?.toLowerCase() || '';
            const isVisible = !searchTerm || title.includes(searchTerm) || preview.includes(searchTerm);
            
            item.style.display = isVisible ? 'block' : 'none';
        });
    },

    // ======================================
    // MODAL UI METHODS
    // ======================================

    // Open conversation in pop-out window
    async openConversation(conversationId) {
        this.state.currentConversationId = conversationId;
        
        // Check if we're in Electron and can use pop-out
        if (window.electronAPI && window.electronAPI.openChatWindow) {
            try {
                // Get the conversation to open
                const conversation = this.state.conversations.find(c => c.id === conversationId);
                if (!conversation) {
                    console.error('Conversation not found:', conversationId);
                    return;
                }

                // Prepare conversation data for pop-out (simplified for IPC)
                const simpleConversation = {
                    id: conversation.id,
                    title: conversation.title,
                    messages: conversation.messages ? conversation.messages.map(msg => ({
                        sender: msg.sender,
                        text: msg.text || msg.content || '',
                        timestamp: msg.timestamp,
                        data: null // Skip complex data to avoid serialization issues
                    })) : []
                };

                // Mark that we have an active pop-out
                this.state.hasActivePopOut = true;
                
                console.log('🚀 Opening pop-out window with conversation:', {
                    id: simpleConversation.id,
                    title: simpleConversation.title,
                    messageCount: simpleConversation.messages.length
                });
                
                // Open the pop-out window
                await window.electronAPI.openChatWindow({
                    conversation: simpleConversation
                });
                
                console.log('✅ Conversation opened in pop-out window:', conversationId);
                this.renderConversationList(); // Update active state
                
            } catch (error) {
                console.error('❌ Failed to open conversation in pop-out:', error);
                this.state.hasActivePopOut = false;
                
                // Show user-friendly error instead of modal
                this.showPopOutError('Failed to open conversation window. Please try again or restart the application.');
            }
        } else {
            // Show error if not in Electron instead of modal fallback
            this.showPopOutError('Pop-out conversations are only available in the desktop application. Please use the desktop version of Time Buddy.');
        }
    },

    // Show pop-out error in sidebar instead of modal
    showPopOutError(message) {
        console.error('🚫 Pop-out error:', message);
        
        // Find conversation container and show error there
        const conversationContainer = document.querySelector('.ai-agent-container');
        if (conversationContainer) {
            const errorHtml = `
                <div class="pop-out-error" style="
                    padding: 16px;
                    margin: 16px;
                    background-color: rgba(244, 67, 54, 0.1);
                    border: 1px solid rgba(244, 67, 54, 0.3);
                    border-radius: 8px;
                    color: #ffcdd2;
                ">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: #f44336;">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <strong>Failed to Open Conversation</strong>
                    </div>
                    <div style="font-size: 13px; line-height: 1.4; margin-bottom: 12px;">
                        ${message}
                    </div>
                    <button onclick="this.parentElement.remove()" style="
                        background: rgba(244, 67, 54, 0.2);
                        border: 1px solid rgba(244, 67, 54, 0.4);
                        color: #ffcdd2;
                        padding: 6px 12px;
                        border-radius: 4px;
                        font-size: 12px;
                        cursor: pointer;
                    ">Dismiss</button>
                </div>
            `;
            
            // Remove any existing error
            const existingError = conversationContainer.querySelector('.pop-out-error');
            if (existingError) {
                existingError.remove();
            }
            
            // Add error at the top
            conversationContainer.insertAdjacentHTML('afterbegin', errorHtml);
            
            // Auto-dismiss after 10 seconds
            setTimeout(() => {
                const errorElement = conversationContainer.querySelector('.pop-out-error');
                if (errorElement) {
                    errorElement.remove();
                }
            }, 10000);
        }
    },

    // Open modal with current conversation
    openModal() {
        if (!this.ui.modal) return;
        
        this.ui.modal.classList.remove('hidden');
        this.updateModalTitle();
        this.updateModalContext();
        
        // Focus the input
        setTimeout(() => {
            if (this.ui.modalInput) {
                this.ui.modalInput.focus();
            }
        }, 300);
    },

    // Close modal
    closeModal() {
        if (!this.ui.modal) return;
        
        this.ui.modal.classList.add('hidden');
    },

    // Minimize modal (same as close for now)
    minimizeModal() {
        this.closeModal();
    },

    // Update modal title
    updateModalTitle() {
        if (!this.ui.modalTitle || !this.state.currentConversationId) return;
        
        const conversation = this.state.conversations.find(c => c.id === this.state.currentConversationId);
        const title = conversation ? this.getConversationTitle(conversation) : 'AI Conversation';
        
        this.ui.modalTitle.innerHTML = `
            <img src="images/logo.png" alt="AI" style="width: 20px; height: 20px; border-radius: 4px;">
            ${title}
        `;
    },

    // Update modal context info
    updateModalContext() {
        if (!this.ui.modalContext) return;
        
        const context = this.buildContextInfo();
        if (context.trim()) {
            this.ui.modalContext.textContent = context;
            this.ui.modalContext.style.display = 'block';
        } else {
            this.ui.modalContext.style.display = 'none';
        }
    },

    // Render messages in modal
    renderModalMessages() {
        if (!this.ui.modalMessages || !this.state.currentConversationId) return;
        
        const conversation = this.state.conversations.find(c => c.id === this.state.currentConversationId);
        if (!conversation || !conversation.messages) {
            this.ui.modalMessages.innerHTML = `
                <div class="ai-welcome-message">
                    <div class="welcome-icon">
                        <img src="images/logo.png" alt="Time Buddy AI Assistant" style="width: 48px; height: 48px; border-radius: 8px;">
                    </div>
                    <h4>Hi! I'm your AI Assistant</h4>
                    <p>I can help you analyze time series data, find anomalies, and answer questions about your metrics.</p>
                </div>
            `;
            return;
        }

        const messagesHtml = conversation.messages.map(msg => this.createModalMessageHTML(msg)).join('');
        this.ui.modalMessages.innerHTML = messagesHtml;
        
        // Scroll to bottom
        setTimeout(() => {
            this.ui.modalMessages.scrollTop = this.ui.modalMessages.scrollHeight;
        }, 100);
    },

    // Create message HTML for modal
    createModalMessageHTML(message) {
        const isUser = message.sender === 'user';
        const avatarHtml = isUser ? 
            '<div class="message-avatar">👤</div>' : 
            this.getAvatarHTML();
        
        return `
            <div class="${isUser ? 'user-message' : 'ai-message'}">
                ${avatarHtml}
                <div class="message-content">
                    ${this.formatMessageContent(message.text)}
                    ${message.timestamp ? `<div style="font-size: 10px; color: #666; margin-top: 8px;">${this.formatMessageTime(message.timestamp)}</div>` : ''}
                </div>
            </div>
        `;
    },

    // Format message time
    formatMessageTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    },

    // Handle modal input changes
    handleModalInputChange() {
        if (!this.ui.modalInput || !this.ui.modalSend) return;
        
        const hasText = this.ui.modalInput.value.trim().length > 0;
        this.ui.modalSend.disabled = !hasText;
    },

    // Handle modal key down
    handleModalKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendModalMessage();
        }
    },

    // Send message from modal
    async sendModalMessage() {
        if (!this.ui.modalInput || !this.ui.modalSend) return;
        
        const message = this.ui.modalInput.value.trim();
        if (!message) return;

        // Ensure we have a current conversation
        if (!this.state.currentConversationId) {
            this.createNewConversation();
        }

        // Clear input and disable send button
        this.ui.modalInput.value = '';
        this.ui.modalSend.disabled = true;
        
        // Add user message to conversation and modal
        this.addMessageToConversation('user', message);
        this.renderModalMessages();

        try {
            // Process message with AI
            const response = await this.processMessage(message);
            
            // Add AI response to conversation and modal
            this.addMessageToConversation('assistant', response.text);
            this.renderModalMessages();
            
        } catch (error) {
            console.error('Error processing modal message:', error);
            this.addMessageToConversation('assistant', 'Sorry, I encountered an error processing your message. Please try again.');
            this.renderModalMessages();
        }
        
        // Update conversation list
        this.renderConversationList();
    },

    // ======================================
    // CONVERSATION MANAGEMENT METHODS
    // ======================================

    // Add message to current conversation
    addMessageToConversation(sender, text) {
        if (!this.state.currentConversationId) return;
        
        const conversation = this.state.conversations.find(c => c.id === this.state.currentConversationId);
        if (!conversation) return;
        
        const message = {
            sender,
            text,
            timestamp: new Date().toISOString()
        };
        
        conversation.messages.push(message);
        conversation.timestamp = message.timestamp; // Update conversation timestamp
        this.saveConversations();
    },

    // Toggle conversation star status
    toggleConversationStar(conversationId) {
        const conversation = this.state.conversations.find(c => c.id === conversationId);
        if (conversation) {
            conversation.starred = !conversation.starred;
            this.saveConversations();
            this.renderConversationList();
        }
    },

    // Show conversation menu
    showConversationMenu(conversationId) {
        const conversation = this.state.conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        // Remove any existing menu
        const existingMenu = document.querySelector('.conversation-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create menu
        const menu = document.createElement('div');
        menu.className = 'conversation-menu';
        menu.innerHTML = `
            <div class="conversation-menu-item" onclick="AIAgent.renameConversation('${conversationId}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                Rename
            </div>
            <div class="conversation-menu-item" onclick="AIAgent.addTagsToConversation('${conversationId}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
                </svg>
                Add Tags
            </div>
            <div class="conversation-menu-item" onclick="AIAgent.exportConversation('${conversationId}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                Export
            </div>
            <div class="conversation-menu-divider"></div>
            <div class="conversation-menu-item danger" onclick="AIAgent.deleteConversation('${conversationId}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                Delete
            </div>
        `;

        // Position menu near the clicked button
        const button = event.target.closest('.conversation-action-btn');
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = rect.bottom + 4 + 'px';
        menu.style.left = rect.left - 120 + 'px';
        menu.style.zIndex = '10000';

        document.body.appendChild(menu);

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    },

    // Rename conversation
    renameConversation(conversationId) {
        const conversation = this.state.conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        ListManager.showInlineEdit(conversationId, conversation.title, (newTitle) => {
            conversation.title = newTitle;
            Storage.updateAiConversation(conversationId, { title: newTitle });
            this.renderConversationList();
        });
    },

    // Add tags to conversation
    addTagsToConversation(conversationId) {
        const conversation = this.state.conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        ListManager.showTagsInput('Add Tags', conversation.tags || [], (tags) => {
            Storage.addConversationTags(conversationId, tags);
            
            // Update local state
            conversation.tags = tags;
            this.renderConversationList();
        });
    },

    // Export conversation
    exportConversation(conversationId) {
        const conversation = this.state.conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        const exportData = {
            title: conversation.title,
            id: conversationId,
            messages: conversation.messages,
            createdAt: conversation.createdAt,
            tags: conversation.tags || []
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `time-buddy-conversation-${conversation.title.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Show conversation settings
    showConversationSettings() {
        if (!this.state.currentConversationId) return;
        
        // Use the same rename function as the context menu
        this.renameConversation(this.state.currentConversationId);
    },

    // Override createNewConversation to work with new UI
    async createNewConversation() {      
        this.startNewConversation();
        this.renderConversationList();
        
        // Only open in pop-out - no terrible modal fallback!
        if (this.state.currentConversationId) {
            await this.openConversation(this.state.currentConversationId);
        } else {
            this.showPopOutError('Failed to create new conversation. This is embarrassing - we are terrible at software and deeply apologize for this failure. 🙏');
        }
    },

    // ======================================
    // UTILITY METHODS
    // ======================================

    // Build context information string
    buildContextInfo() {
        const context = this.state.context;
        const parts = [];
        
        if (context.datasource) {
            parts.push(`Data Source: ${context.datasource}`);
        }
        
        if (context.measurement) {
            parts.push(`Measurement: ${context.measurement}`);
        }
        
        if (context.field) {
            parts.push(`Field: ${context.field}`);
        }
        
        if (context.timeRange) {
            parts.push(`Time Range: ${context.timeRange}`);
        }
        
        return parts.join(' • ');
    },

    // Format message content for display
    formatMessageContent(text) {
        if (!text) return '';
        
        const textStr = typeof text === 'string' ? text : JSON.stringify(text);
        
        // Process markdown if detected
        if (this.containsMarkdown(textStr)) {
            return this.renderMarkdown(textStr);
        } else {
            return this.escapeHtml(textStr);
        }
    }
};

// Export for global access
window.AIAgent = AIAgent;