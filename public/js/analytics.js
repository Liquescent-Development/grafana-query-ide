// AI Analytics Controller
// Main controller for AI/ML analytics functionality
// WARNING: This module is being refactored to use DataAccess
// Use DataAccess for new code - see dataAccess.js

const Analytics = {
    // State management
    config: {
        ollamaEndpoint: 'http://localhost:11434',
        selectedModel: 'llama3.1:8b-instruct-q4_K_M',
        numPredict: -1, // -1 means infinite (Ollama default)
        numCtx: 8192,
        timeout: 600000, // 10 minutes default timeout in milliseconds
        useVisualMode: false, // User-controlled visual analysis mode
        analysisType: 'anomaly',
        retentionPolicy: 'raw',
        measurement: '',
        field: '',
        aggregation: 'sum', // Default aggregation function
        tags: {},
        tagFilters: [], // Array of {tagKey: '', tagValue: ''} objects
        groupByTime: false,
        timeGroupInterval: '1h',
        groupByTags: false,
        groupByTagsList: [], // Array of tag keys to group by
        timeRange: '1d',
        sensitivity: 'medium',
        alertThreshold: 0.8,
        forecastHorizon: '1d',
        confidenceLevel: 0.95,
        trendDepth: 'seasonal'
    },

    // UI state
    isConnected: false,
    isAnalysisRunning: false,
    currentResults: null,

    // Initialize the analytics system
    initialize() {
        console.log('🤖 Initializing Analytics system...');
        // Only reset connection state if we're not already connected
        // This prevents losing connection state when switching views
        if (!this.isConnected) {
            // Check if services are already connected
            if (window.OllamaService?.isConnected || window.OpenAIService?.isConnected) {
                console.log('🔍 Found existing service connection during Analytics init');
                this.isConnected = true;
            } else {
                this.isConnected = false;
            }
        }
        this.setupEventListeners();
        this.loadConfiguration();
        this.updateUI();
        console.log('✅ Analytics system initialized, isConnected:', this.isConnected);
    },

    // Setup all event listeners
    setupEventListeners() {
        console.log('🔗 Setting up Analytics event listeners...');

        // Connection testing
        const testButton = document.getElementById('testAiConnection');
        if (testButton) {
            testButton.addEventListener('click', () => this.testOllamaConnection());
        }

        // AI connection settings dialog
        const aiSettingsBtn = document.getElementById('aiSettingsBtn');
        if (aiSettingsBtn) {
            aiSettingsBtn.addEventListener('click', () => this.showAiConnectionDialog());
        }

        // AI connection card click to open settings
        const aiConnectionCard = document.getElementById('aiConnectionCard');
        if (aiConnectionCard) {
            aiConnectionCard.addEventListener('click', () => this.showAiConnectionDialog());
        }

        // Configuration changes in modal dialog
        const aiEndpoint = document.getElementById('aiEndpoint');
        if (aiEndpoint) {
            aiEndpoint.addEventListener('change', (e) => {
                this.config.ollamaEndpoint = e.target.value;
                this.saveConfiguration();
            });
        }

        const aiModel = document.getElementById('aiModel');
        if (aiModel) {
            aiModel.addEventListener('change', (e) => {
                this.config.selectedModel = e.target.value;
                this.saveConfiguration();
                this.updateModelInfo();
                this.toggleCustomModelField();
            });
        }

        const aiResponseTokens = document.getElementById('aiResponseTokens');
        if (aiResponseTokens) {
            aiResponseTokens.addEventListener('change', (e) => {
                this.config.numPredict = parseInt(e.target.value);
                this.saveConfiguration();
                console.log('🎛️ Response tokens (num_predict) updated:', this.config.numPredict);
            });
        }

        const aiContextSize = document.getElementById('aiContextSize');
        if (aiContextSize) {
            aiContextSize.addEventListener('change', (e) => {
                this.config.numCtx = parseInt(e.target.value);
                this.saveConfiguration();
                console.log('🎛️ Context size (num_ctx) updated:', this.config.numCtx);
            });
        }

        const aiTimeout = document.getElementById('aiTimeout');
        if (aiTimeout) {
            aiTimeout.addEventListener('change', (e) => {
                this.config.timeout = parseInt(e.target.value) * 1000; // Convert to milliseconds
                this.saveConfiguration();
                console.log('🎛️ Analysis timeout updated:', this.config.timeout);
            });
        }

        const useVisualMode = document.getElementById('useVisualMode');
        if (useVisualMode) {
            useVisualMode.addEventListener('change', (e) => {
                this.config.useVisualMode = e.target.checked;
                this.saveConfiguration();
                console.log('🎛️ Visual analysis mode:', this.config.useVisualMode ? 'enabled' : 'disabled');
            });
        }

        // Analysis type tabs
        const analysisButtons = document.querySelectorAll('.tab-button[data-analysis]');
        analysisButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.setAnalysisType(e.target.dataset.analysis);
            });
        });

        // Data configuration
        const retentionPolicy = document.getElementById('analyticsRetentionPolicy');
        if (retentionPolicy) {
            retentionPolicy.addEventListener('change', (e) => {
                this.config.retentionPolicy = e.target.value;
                this.saveConfiguration();
            });
        }

        const measurement = document.getElementById('analyticsMeasurement');
        if (measurement) {
            measurement.addEventListener('change', (e) => {
                this.config.measurement = e.target.value;
                this.saveConfiguration();
                // Load fields for the selected measurement
                if (e.target.value) {
                    this.loadFieldsForMeasurement(e.target.value);
                } else {
                    // Clear field dropdown if no measurement selected
                    const fieldSelect = document.getElementById('analyticsField');
                    if (fieldSelect) {
                        fieldSelect.innerHTML = '<option value="">Select measurement first</option>';
                    }
                    // Clear tag dropdowns
                    this.updateTagFilterDropdowns([]);
                    this.updateGroupByTagsDropdown([]);
                }
            });
        }

        const field = document.getElementById('analyticsField');
        if (field) {
            field.addEventListener('change', (e) => {
                this.config.field = e.target.value;
                this.saveConfiguration();
            });
        }

        const aggregation = document.getElementById('analyticsAggregation');
        if (aggregation) {
            aggregation.addEventListener('change', (e) => {
                this.config.aggregation = e.target.value;
                this.saveConfiguration();
            });
        }

        const timeRange = document.getElementById('analyticsTimeRange');
        if (timeRange) {
            timeRange.addEventListener('change', (e) => {
                this.config.timeRange = e.target.value;
                this.saveConfiguration();
            });
        }

        // Alert threshold slider
        const alertThreshold = document.getElementById('alertThreshold');
        const thresholdValue = document.getElementById('thresholdValue');
        if (alertThreshold && thresholdValue) {
            alertThreshold.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.config.alertThreshold = value;
                thresholdValue.textContent = value.toFixed(1);
                this.saveConfiguration();
            });
        }

        // Run analysis button
        const runButton = document.getElementById('runAnalysis');
        if (runButton) {
            runButton.addEventListener('click', () => this.runAnalysis());
        }

        // Measurement and field selectors
        const measurementSelect = document.getElementById('analyticsMeasurement');
        if (measurementSelect) {
            measurementSelect.addEventListener('change', (e) => {
                this.config.measurement = e.target.value;
                this.loadFieldsForMeasurement(e.target.value);
                this.saveConfiguration();
                this.updateAnalysisButton();
            });
        }

        const fieldSelect = document.getElementById('analyticsField');
        if (fieldSelect) {
            fieldSelect.addEventListener('change', (e) => {
                this.config.field = e.target.value;
                this.saveConfiguration();
                this.updateAnalysisButton();
                // Load tags when field changes
                if (e.target.value && this.config.measurement) {
                    console.log('🏷️ Loading tags for field change:', this.config.measurement, e.target.value);
                    this.loadTagsForField(this.config.measurement, e.target.value);
                }
            });
        }

        // Grouping options
        const groupByTime = document.getElementById('groupByTime');
        if (groupByTime) {
            groupByTime.addEventListener('change', (e) => {
                this.config.groupByTime = e.target.checked;
                document.getElementById('timeGroupInterval').disabled = !e.target.checked;
                this.saveConfiguration();
            });
        }

        const timeGroupInterval = document.getElementById('timeGroupInterval');
        if (timeGroupInterval) {
            timeGroupInterval.addEventListener('change', (e) => {
                this.config.timeGroupInterval = e.target.value;
                this.saveConfiguration();
            });
        }

        const groupByTags = document.getElementById('groupByTags');
        if (groupByTags) {
            groupByTags.addEventListener('change', (e) => {
                this.config.groupByTags = e.target.checked;
                document.getElementById('groupByTagsSelect').disabled = !e.target.checked;
                this.saveConfiguration();
            });
        }

        const groupByTagsSelect = document.getElementById('groupByTagsSelect');
        if (groupByTagsSelect) {
            groupByTagsSelect.addEventListener('change', (e) => {
                this.config.groupByTagsList = Array.from(e.target.selectedOptions).map(option => option.value);
                this.saveConfiguration();
            });
        }
    },

    // Load saved configuration using centralized cache
    loadConfiguration() {
        try {
            const savedConfig = Storage.getAnalyticsConfig();
            this.config = { ...this.config, ...savedConfig };
            console.log('📋 Loaded analytics configuration');
        } catch (error) {
            console.warn('Failed to load analytics config:', error);
        }
    },

    // Save configuration using centralized cache
    saveConfiguration() {
        Storage.setAnalyticsConfig(this.config);
    },

    // Fetch available models from Ollama
    async fetchAvailableModels() {
        try {
            // Use the actual endpoint from OllamaService if it's connected
            let endpoint = this.config.ollamaEndpoint;
            if (window.OllamaService?.isConnected && window.OllamaService?.config?.endpoint) {
                endpoint = window.OllamaService.config.endpoint;
            }
            
            const response = await fetch(`${endpoint}/api/tags`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Failed to fetch models from Ollama:', error);
            return [];
        }
    },

    // Get model capabilities
    async getModelCapabilities(modelName) {
        try {
            // Use the actual endpoint from OllamaService if it's connected
            let endpoint = this.config.ollamaEndpoint;
            if (window.OllamaService?.isConnected && window.OllamaService?.config?.endpoint) {
                endpoint = window.OllamaService.config.endpoint;
            }
            
            const response = await fetch(`${endpoint}/api/show`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelName })
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data.capabilities || [];
        } catch (error) {
            console.error('Failed to get model capabilities:', error);
            return [];
        }
    },

    // Update model selection dropdown
    async updateModelSelection() {
        const modelSelect = document.getElementById('aiModel');
        if (!modelSelect) return;

        const models = await this.fetchAvailableModels();
        
        if (models.length === 0) {
            // Fallback to default options if API fails
            modelSelect.innerHTML = `
                <option value="llama3.1:8b-instruct-q4_K_M">Llama 3.1 8B (Default)</option>
                <option value="custom">Custom Model...</option>
            `;
            return;
        }

        // Clear existing options
        modelSelect.innerHTML = '';

        // Add fetched models
        for (const model of models) {
            const option = document.createElement('option');
            option.value = model.name;
            
            // Format display name
            let displayName = model.name;
            if (model.details) {
                const size = model.details.parameter_size || '';
                const family = model.details.family || '';
                displayName = `${model.name} (${size}${family ? ' - ' + family : ''})`;
            }
            
            option.textContent = displayName;
            
            // Check if this is the currently selected model
            if (model.name === this.config.selectedModel) {
                option.selected = true;
            }
            
            modelSelect.appendChild(option);
        }

        // Add custom option
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = 'Custom Model...';
        modelSelect.appendChild(customOption);

        console.log(`📋 Loaded ${models.length} models from Ollama`);
    },

    // Update UI elements with current state
    updateUI() {
        // Update AI connection card display
        this.updateAiConnectionCard();

        // Update form values in modal
        const aiEndpoint = document.getElementById('aiEndpoint');
        if (aiEndpoint) aiEndpoint.value = this.config.ollamaEndpoint;

        // Update model selection dynamically
        this.updateModelSelection();

        const aiResponseTokens = document.getElementById('aiResponseTokens');
        if (aiResponseTokens) aiResponseTokens.value = this.config.numPredict;

        const aiContextSize = document.getElementById('aiContextSize');
        if (aiContextSize) aiContextSize.value = this.config.numCtx;

        const aiTimeout = document.getElementById('aiTimeout');
        if (aiTimeout) aiTimeout.value = Math.floor((this.config.timeout || 600000) / 1000); // Convert from ms to seconds

        const useVisualMode = document.getElementById('useVisualMode');
        if (useVisualMode) useVisualMode.checked = this.config.useVisualMode;

        const retentionPolicy = document.getElementById('analyticsRetentionPolicy');
        if (retentionPolicy) retentionPolicy.value = this.config.retentionPolicy;

        const timeRange = document.getElementById('analyticsTimeRange');
        if (timeRange) timeRange.value = this.config.timeRange;

        const alertThreshold = document.getElementById('alertThreshold');
        const thresholdValue = document.getElementById('thresholdValue');
        if (alertThreshold) alertThreshold.value = this.config.alertThreshold;
        if (thresholdValue) thresholdValue.textContent = this.config.alertThreshold.toFixed(1);

        // Update analysis type
        this.setAnalysisType(this.config.analysisType);

        // Update connection status in title bar and card
        this.updateConnectionStatus();
        this.updateTitleBarStatus();

        // Update model info
        this.updateModelInfo();

        // Populate datasource selector
        this.populateAnalyticsDatasourceSelect();

        // Load measurements from current datasource
        this.loadMeasurements();
        
        // Load retention policies from current datasource
        this.loadRetentionPolicies();
        
        // Load tags if measurement and field are already selected
        if (this.config.measurement && this.config.field) {
            console.log('🏷️ Loading tags from updateUI for existing measurement/field');
            this.loadTagsForField(this.config.measurement, this.config.field);
        }
        
        // Don't automatically check for AI connections on startup
        // AI connections should only happen when user explicitly connects
        console.log('💡 AI connections ready - user can connect via AI Connections panel');
        
        // Force load AI connections UI
        setTimeout(() => {
            if (typeof loadAiConnections === 'function') {
                console.log('🔗 Force loading AI connections from Analytics.updateUI');
                loadAiConnections();
            }
        }, 100);
    },

    // Check if we have any connected AI services and initialize them
    async checkAiConnection() {
        let aiConnections = Storage.getAiConnections();
        const activeConnectionId = Storage.get('ACTIVE_AI_CONNECTION');
        
        // First, clean up any invalid connection states
        // Only the active connection should be marked as connected
        let hasChanges = false;
        aiConnections = aiConnections.map(conn => {
            if (conn.status === 'connected' && conn.id !== activeConnectionId) {
                console.log(`🔧 Cleaning up stale connected status for ${conn.name}`);
                hasChanges = true;
                return { ...conn, status: 'disconnected' };
            }
            return conn;
        });
        
        if (hasChanges) {
            Storage.setAiConnections(aiConnections);
        }
        
        // Check if we have an active connection
        if (activeConnectionId) {
            const activeConnection = aiConnections.find(conn => conn.id === activeConnectionId);
            if (activeConnection) {
                // Try to initialize it
                const success = await this.initializeAiConnection(activeConnection);
                if (success) {
                    // Update status to connected if initialization succeeded
                    const updatedConnections = Storage.getAiConnections();
                    const index = updatedConnections.findIndex(conn => conn.id === activeConnectionId);
                    if (index !== -1) {
                        updatedConnections[index].status = 'connected';
                        Storage.setAiConnections(updatedConnections);
                    }
                    return true;
                } else {
                    // Clear active connection if initialization failed
                    Storage.remove('ACTIVE_AI_CONNECTION');
                }
            }
        }
        
        // No active connection
        this.isConnected = false;
        this.updateTitleBarStatus();
        this.updateAnalysisButton();
        return false;
    },

    // Initialize AI connection and appropriate service (Ollama or OpenAI)
    async initializeAiConnection(connection) {
        console.log('🔍 Analytics.initializeAiConnection called with:', connection);
        try {
            // Update all relevant config with connection info
            this.config.selectedModel = connection.model;
            this.config.provider = connection.provider || 'ollama'; // Default to ollama
            this.config.activeConnectionName = connection.name;
            this.config.activeConnectionId = connection.id;
            
            // Check current service state before initialization
            if (connection.provider === 'openai') {
                console.log('🔍 OpenAI state before init:', {
                    exists: typeof OpenAIService !== 'undefined',
                    isConnected: window.OpenAIService?.isConnected
                });
            } else {
                console.log('🔍 Ollama state before init:', {
                    exists: typeof OllamaService !== 'undefined', 
                    isConnected: window.OllamaService?.isConnected
                });
            }
            
            // Initialize the appropriate service and check result
            let initResult = false;
            if (connection.provider === 'openai') {
                this.config.openaiApiKey = connection.apiKey;
                // Check if already connected before re-initializing
                if (window.OpenAIService?.isConnected) {
                    console.log('🔍 OpenAI already connected, skipping re-initialization');
                    initResult = true;
                } else {
                    initResult = await OpenAIService.initialize(connection.apiKey, connection.model);
                    console.log('🔍 OpenAI init result in Analytics:', initResult, 'isConnected now:', window.OpenAIService?.isConnected);
                }
            } else {
                this.config.ollamaEndpoint = connection.endpoint;
                // Check if already connected before re-initializing
                if (window.OllamaService?.isConnected) {
                    console.log('🔍 Ollama already connected, skipping re-initialization');
                    initResult = true;
                } else {
                    initResult = await OllamaService.initialize(connection.endpoint, connection.model);
                    console.log('🔍 Ollama init result in Analytics:', initResult, 'isConnected now:', window.OllamaService?.isConnected);
                }
            }
            
            // Only set connected if initialization actually succeeded
            if (initResult === true) {
                this.isConnected = true;
                console.log('✅ AI service initialized:', connection.name, connection.provider === 'openai' ? '(OpenAI)' : `at ${connection.endpoint}`);
            } else {
                this.isConnected = false;
                console.warn('⚠️ AI service initialization returned false for:', connection.name);
            }
            
            this.updateTitleBarStatus();
            this.updateAnalysisButton();
            return initResult;
            
        } catch (error) {
            console.warn('⚠️ Failed to initialize AI connection:', connection.name, error.message);
            
            // Ensure Analytics is marked as disconnected
            this.isConnected = false;
            
            // Update connection status to disconnected since it failed
            const aiConnections = Storage.getAiConnections();
            const connectionIndex = aiConnections.findIndex(conn => conn.id === connection.id);
            if (connectionIndex !== -1) {
                aiConnections[connectionIndex].status = 'disconnected';
                Storage.setAiConnections(aiConnections);
                
                // Reload AI connections UI if it exists
                setTimeout(() => {
                    if (typeof loadAiConnections === 'function') {
                        loadAiConnections();
                    }
                }, 100);
            }
            
            this.updateTitleBarStatus();
            this.updateAnalysisButton();
            return false;
        }
    },

    // Test Ollama connection
    async testOllamaConnection() {
        console.log('🔍 Testing Ollama connection...');
        
        const statusIndicator = document.querySelector('#aiConnectionStatus .status-indicator');
        const statusText = document.getElementById('aiStatusText');
        const testButton = document.getElementById('testAiConnection');

        // Update UI to show testing state
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator connecting';
        }
        if (statusText) {
            statusText.textContent = 'Testing...';
        }
        if (testButton) {
            testButton.disabled = true;
            testButton.title = 'Testing...';
        }

        try {
            // Get the active connection to determine provider
            const activeConnectionId = Storage.get('ACTIVE_AI_CONNECTION');
            const aiConnections = Storage.getAiConnections();
            const activeConnection = aiConnections.find(conn => conn.id === activeConnectionId);
            
            if (activeConnection && activeConnection.provider === 'openai') {
                await OpenAIService.initialize(activeConnection.apiKey, this.config.selectedModel);
            } else {
                await OllamaService.initialize(this.config.ollamaEndpoint, this.config.selectedModel);
            }
            this.isConnected = true;
            
            // Update UI for success
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator connected';
            }
            if (statusText) {
                if (activeConnection && activeConnection.provider === 'openai') {
                    const modelInfo = OpenAIService.getStatus();
                    statusText.textContent = `Connected to OpenAI (${modelInfo.model})`;
                } else {
                    const modelInfo = OllamaService.getStatus();
                    statusText.textContent = `Connected to Ollama (${modelInfo.model})`;
                }
            }
            
            this.updateTitleBarStatus();
            this.updateAnalysisButton();
            console.log('✅ Ollama connection successful');
            
        } catch (error) {
            this.isConnected = false;
            
            // Update UI for failure
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator offline';
            }
            if (statusText) {
                statusText.textContent = error.message;
            }
            
            this.updateTitleBarStatus();
            console.error('❌ Ollama connection failed:', error);
        } finally {
            // Reset test button
            if (testButton) {
                testButton.disabled = false;
                testButton.title = 'Test Connection';
            }
        }
    },

    // Update connection status display in AI connection card
    updateConnectionStatus() {
        const statusIndicator = document.querySelector('#aiConnectionStatus .status-indicator');
        const statusText = document.getElementById('aiStatusText');

        if (this.isConnected) {
            if (statusIndicator) statusIndicator.className = 'status-indicator connected';
            if (statusText) statusText.textContent = 'Connected';
        } else {
            if (statusIndicator) statusIndicator.className = 'status-indicator offline';
            if (statusText) statusText.textContent = 'Not Connected';
        }
    },

    // Update AI connection status in title bar
    updateTitleBarStatus() {
        const titleBarStatus = document.getElementById('titleBarAiStatus');
        if (titleBarStatus) {
            // Check for any AI service connection (not just Analytics)
            const isAnalyticsConnected = this.isConnected;
            const isOllamaConnected = window.OllamaService && window.OllamaService.isConnected;
            const isOpenAIConnected = window.OpenAIService && window.OpenAIService.isConnected;
            const isAnyAIConnected = isAnalyticsConnected || isOllamaConnected || isOpenAIConnected;
            
            console.log('🔄 Updating AI title bar status:', {
                isAnalyticsConnected,
                isOllamaConnected,
                isOpenAIConnected,
                isAnyAIConnected
            });
            
            if (isAnyAIConnected) {
                titleBarStatus.className = 'connection-status ai-connected';
                titleBarStatus.textContent = 'AI: Connected';
            } else {
                titleBarStatus.className = 'connection-status ai-disconnected';
                titleBarStatus.textContent = 'AI: Not Connected';
            }
        } else {
            console.warn('⚠️ AI title bar status element not found');
        }
    },

    // Update AI connection card display
    updateAiConnectionCard() {
        const connectionName = document.getElementById('aiConnectionName');
        const connectionUrl = document.getElementById('aiConnectionUrl');
        const currentModel = document.getElementById('currentAiModel');

        if (connectionName) connectionName.textContent = 'Ollama AI Service';
        if (connectionUrl) connectionUrl.textContent = this.config.ollamaEndpoint;
        if (currentModel) currentModel.textContent = this.config.selectedModel;
    },

    // Show AI connection settings dialog
    showAiConnectionDialog() {
        const dialog = document.getElementById('aiConnectionDialog');
        if (dialog) {
            // Update dialog values with current config
            const aiEndpoint = document.getElementById('aiEndpoint');
            const aiResponseTokens = document.getElementById('aiResponseTokens');
            const aiContextSize = document.getElementById('aiContextSize');
            const aiTimeout = document.getElementById('aiTimeout');

            if (aiEndpoint) aiEndpoint.value = this.config.ollamaEndpoint;
            if (aiResponseTokens) aiResponseTokens.value = this.config.numPredict;
            if (aiContextSize) aiContextSize.value = this.config.numCtx;
            if (aiTimeout) aiTimeout.value = Math.floor((this.config.timeout || 600000) / 1000); // Convert from ms to seconds

            // Update model selection dynamically when dialog opens
            this.updateModelSelection();

            this.toggleCustomModelField();
            dialog.style.display = 'block';
        }
    },

    // Hide AI connection settings dialog
    hideAiConnectionDialog() {
        const dialog = document.getElementById('aiConnectionDialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    },

    // Toggle custom model field visibility
    toggleCustomModelField() {
        const aiModel = document.getElementById('aiModel');
        const customModelGroup = document.getElementById('customModelGroup');
        
        if (aiModel && customModelGroup) {
            if (aiModel.value === 'custom') {
                customModelGroup.style.display = 'block';
            } else {
                customModelGroup.style.display = 'none';
            }
        }
    },

    // Save AI connection settings from dialog
    async saveAiConnection() {
        const aiEndpoint = document.getElementById('aiEndpoint');
        const aiModel = document.getElementById('aiModel');
        const customModelName = document.getElementById('customModelName');
        const aiResponseTokens = document.getElementById('aiResponseTokens');
        const aiContextSize = document.getElementById('aiContextSize');
        const aiTimeout = document.getElementById('aiTimeout');

        if (aiEndpoint) this.config.ollamaEndpoint = aiEndpoint.value;
        
        if (aiModel) {
            if (aiModel.value === 'custom' && customModelName && customModelName.value) {
                this.config.selectedModel = customModelName.value;
            } else {
                this.config.selectedModel = aiModel.value;
            }
        }
        
        if (aiResponseTokens) this.config.numPredict = parseInt(aiResponseTokens.value);
        if (aiContextSize) this.config.numCtx = parseInt(aiContextSize.value);
        if (aiTimeout) this.config.timeout = parseInt(aiTimeout.value) * 1000; // Convert to milliseconds

        this.saveConfiguration();
        this.updateAiConnectionCard();
        this.hideAiConnectionDialog();

        // Test the connection
        await this.testOllamaConnection();
    },

    // Set analysis type and update UI
    setAnalysisType(type) {
        this.config.analysisType = type;
        this.saveConfiguration();

        // Update tab buttons
        document.querySelectorAll('.tab-button[data-analysis]').forEach(button => {
            button.classList.remove('active');
            if (button.dataset.analysis === type) {
                button.classList.add('active');
            }
        });

        // Update options panels
        document.querySelectorAll('.analysis-options').forEach(panel => {
            panel.classList.remove('active');
        });

        const activePanel = document.getElementById(`${type}Options`);
        if (activePanel) {
            activePanel.classList.add('active');
        }

        this.updateAnalysisButton();
    },

    // Update model information display
    updateModelInfo() {
        const modelInfo = ModelManager.supportedModels[this.config.selectedModel];
        if (modelInfo) {
            console.log('📋 Model info:', {
                name: modelInfo.name,
                capabilities: modelInfo.capabilities,
                requirements: modelInfo.ramRequired
            });
        }
    },

    // Load measurements from current datasource
    async loadMeasurements() {
        const measurementSelect = document.getElementById('analyticsMeasurement');
        if (!measurementSelect) return;

        if (!GrafanaConfig.connected || !GrafanaConfig.currentDatasourceId) {
            measurementSelect.innerHTML = '<option value="">Connect to datasource first</option>';
            return;
        }

        console.log('📊 Loading measurements for analytics...', {
            connected: GrafanaConfig.connected,
            datasourceId: GrafanaConfig.currentDatasourceId,
            schemaLoaded: typeof Schema !== 'undefined' && !!Schema.loadedSchema
        });

        try {
            // Ensure Schema is available
            if (typeof Schema === 'undefined') {
                console.error('❌ Schema module not available');
                measurementSelect.innerHTML = '<option value="">Schema module unavailable</option>';
                return;
            }

            // Show loading state
            measurementSelect.innerHTML = '<option value="">Loading measurements...</option>';

            // Use the proper Schema loading mechanism
            await Schema.loadSchemaIfNeeded();

            // Check if we have measurements loaded
            if (GrafanaConfig.selectedDatasourceType === 'influxdb' && Schema.influxMeasurements.length > 0) {
                const measurements = Schema.influxMeasurements;
                console.log('📋 Found measurements:', measurements);
                
                measurementSelect.innerHTML = '<option value="">Select measurement...</option>';
                measurements.forEach(measurement => {
                    const option = document.createElement('option');
                    option.value = measurement;
                    option.textContent = measurement;
                    if (measurement === this.config.measurement) {
                        option.selected = true;
                    }
                    measurementSelect.appendChild(option);
                });

                // Load fields if measurement is already selected
                if (this.config.measurement) {
                    this.loadFieldsForMeasurement(this.config.measurement);
                }
            } else if (GrafanaConfig.selectedDatasourceType === 'prometheus' && Schema.prometheusMetrics.length > 0) {
                // For Prometheus, use metrics as "measurements"
                const metrics = Schema.prometheusMetrics;
                console.log('📋 Found Prometheus metrics:', metrics.slice(0, 10));
                
                measurementSelect.innerHTML = '<option value="">Select metric...</option>';
                metrics.slice(0, 100).forEach(metric => { // Limit to first 100 for performance
                    const option = document.createElement('option');
                    option.value = metric;
                    option.textContent = metric;
                    if (metric === this.config.measurement) {
                        option.selected = true;
                    }
                    measurementSelect.appendChild(option);
                });
            } else {
                console.warn('⚠️ No measurements/metrics found for datasource type:', GrafanaConfig.selectedDatasourceType);
                measurementSelect.innerHTML = '<option value="">No measurements found</option>';
            }
        } catch (error) {
            console.error('❌ Failed to load measurements:', error);
            measurementSelect.innerHTML = '<option value="">Error loading measurements</option>';
        }
    },

    // Load retention policies from current datasource
    async loadRetentionPolicies() {
        const retentionPolicySelect = document.getElementById('analyticsRetentionPolicy');
        if (!retentionPolicySelect) return;

        // Only show retention policies for InfluxDB
        if (GrafanaConfig.selectedDatasourceType !== 'influxdb') {
            retentionPolicySelect.innerHTML = '<option value="">N/A for this datasource type</option>';
            return;
        }

        if (!GrafanaConfig.connected || !GrafanaConfig.currentDatasourceId) {
            retentionPolicySelect.innerHTML = '<option value="">Connect to InfluxDB first</option>';
            return;
        }

        try {
            // Ensure Schema is available and properly initialized
            if (typeof Schema === 'undefined') {
                console.error('❌ Schema module not available');
                retentionPolicySelect.innerHTML = '<option value="">Schema module unavailable</option>';
                return;
            }

            // Show loading state
            retentionPolicySelect.innerHTML = '<option value="">Loading retention policies...</option>';

            // Use the proper Schema loading mechanism
            await Schema.loadSchemaIfNeeded();

            // Check if we have retention policies loaded
            if (Schema.influxRetentionPolicies && Schema.influxRetentionPolicies.length > 0) {
                const retentionPolicies = Schema.influxRetentionPolicies;
                console.log('📋 Found retention policies:', retentionPolicies);
                
                // Clear loading state and populate with real data
                retentionPolicySelect.innerHTML = '';
                
                // Add each retention policy as an option
                retentionPolicies.forEach(policy => {
                    const option = document.createElement('option');
                    option.value = policy;
                    option.textContent = policy;
                    if (policy === this.config.retentionPolicy) {
                        option.selected = true;
                    }
                    retentionPolicySelect.appendChild(option);
                });

                // If no policy is selected but we have policies, select the first one
                if (!this.config.retentionPolicy && retentionPolicies.length > 0) {
                    this.config.retentionPolicy = retentionPolicies[0];
                    retentionPolicySelect.value = retentionPolicies[0];
                    this.saveConfiguration();
                }
            } else {
                console.warn('⚠️ No retention policies found in schema');
                retentionPolicySelect.innerHTML = '<option value="">No retention policies found</option>';
            }
        } catch (error) {
            console.error('❌ Failed to load retention policies:', error);
            retentionPolicySelect.innerHTML = '<option value="">Error loading retention policies</option>';
        }
    },

    // Load fields for selected measurement using centralized Schema
    async loadFieldsForMeasurement(measurement) {
        const fieldSelect = document.getElementById('analyticsField');
        if (!fieldSelect || !measurement) {
            if (fieldSelect) fieldSelect.innerHTML = '<option value="">Select measurement first</option>';
            return;
        }

        console.log('📋 Loading fields for measurement using centralized Schema:', measurement);

        try {
            if (typeof Schema === 'undefined') {
                console.error('Schema module not available');
                fieldSelect.innerHTML = '<option value="">Schema unavailable</option>';
                return;
            }

            fieldSelect.innerHTML = '<option value="">Loading fields...</option>';
            
            let fields = [];
            
            if (GrafanaConfig.selectedDatasourceType === 'influxdb') {
                // Use centralized Schema method to get fields with retry logic
                const retentionPolicy = this.config.retentionPolicy || 'autogen';
                fields = await Schema.getFieldsForMeasurement(measurement, retentionPolicy);
                console.log('📊 Got fields from centralized Schema for', measurement, ':', fields);
            } else if (GrafanaConfig.selectedDatasourceType === 'prometheus') {
                // For Prometheus, metrics don't have traditional "fields" - they have labels
                // For analytics purposes, we'll treat the metric itself as the "field"
                fields = [measurement]; // The metric name itself is the "field"
                console.log('📊 Using Prometheus metric as field:', measurement);
            }
            
            fieldSelect.innerHTML = '<option value="">Select field...</option>';
            
            // Add fields with data availability checking
            if (fields.length > 0) {
                // Check if we can validate data availability for fields
                const fieldsWithData = await this.checkFieldsForData(measurement, fields);
                
                fields.forEach(field => {
                    const option = document.createElement('option');
                    option.value = field;
                    
                    // Indicate if field has recent data
                    const hasData = fieldsWithData.includes(field);
                    option.textContent = hasData ? `${field} ✓` : field;
                    if (!hasData) {
                        option.style.color = '#888888';
                        option.title = 'No recent data found for this field';
                    }
                    
                    if (field === this.config.field) {
                        option.selected = true;
                    }
                    fieldSelect.appendChild(option);
                });
                
                // Add helper text
                if (fieldsWithData.length > 0) {
                    const helperOption = document.createElement('option');
                    helperOption.disabled = true;
                    helperOption.textContent = `─── ${fieldsWithData.length} fields with recent data ✓ ───`;
                    helperOption.style.fontStyle = 'italic';
                    fieldSelect.insertBefore(helperOption, fieldSelect.children[1]);
                }
            } else {
                console.log(`❌ No fields found for measurement: ${measurement} after centralized loading`);
                fieldSelect.innerHTML = '<option value="">No fields found</option>';
            }
        } catch (error) {
            console.error('❌ Failed to load fields using centralized Schema:', error);
            fieldSelect.innerHTML = '<option value="">Error loading fields</option>';
        }

        // Load tags at the end of this process
        console.log('🏷️ Loading tags at end of loadFieldsForMeasurement for:', measurement);
        this.loadTagsForField(measurement, 'any');
    },

    // Check which fields have recent data
    async checkFieldsForData(measurement, fields) {
        if (!fields || fields.length === 0) return [];
        
        console.log('🔍 Checking fields for recent data...', { measurement, fieldCount: fields.length });
        
        const fieldsWithData = [];
        const maxFieldsToCheck = 10; // Limit to avoid too many API calls
        const fieldsToCheck = fields.slice(0, maxFieldsToCheck);
        
        try {
            // Check fields in parallel for better performance
            const dataChecks = fieldsToCheck.map(async (field) => {
                try {
                    // Quick query to check if field has data in last 24h
                    const testQuery = this.buildQuickDataCheckQuery(measurement, field);
                    
                    if (typeof Queries !== 'undefined') {
                        const result = await Queries.executeQuery(testQuery, {
                            datasourceId: GrafanaConfig.currentDatasourceId,
                            datasourceType: GrafanaConfig.selectedDatasourceType,
                            timeout: 5000 // Short timeout for quick check
                        });
                        
                        // Check if we got any data points
                        const dataPoints = this.extractTimeSeriesData(result);
                        if (dataPoints && dataPoints.length > 0) {
                            return field;
                        }
                    }
                } catch (error) {
                    console.warn(`Data check failed for field ${field}:`, error.message);
                }
                return null;
            });
            
            const results = await Promise.all(dataChecks);
            fieldsWithData.push(...results.filter(field => field !== null));
            
            console.log('📊 Fields with recent data:', fieldsWithData);
            
        } catch (error) {
            console.warn('Failed to check field data availability:', error);
        }
        
        return fieldsWithData;
    },

    // Build a quick query to check if a field has recent data
    buildQuickDataCheckQuery(measurement, field) {
        if (GrafanaConfig.selectedDatasourceType === 'influxdb') {
            const retentionPolicy = this.config.retentionPolicy || 'raw';
            let query = `SELECT mean("${field}") as "value" FROM "${retentionPolicy}"."${measurement}" WHERE time >= now() - 24h`;
            
            // Add tag filters if any
            query += this.generateWhereClause();
            
            // Add grouping
            const groupBy = this.generateGroupByClause();
            if (groupBy) {
                query += groupBy;
            } else {
                query += ' GROUP BY time(1h)';
            }
            
            query += ' fill(none) LIMIT 5';
            return query;
        } else if (GrafanaConfig.selectedDatasourceType === 'prometheus') {
            return `${measurement}[1h]`;
        }
        return '';
    },

    // Extract time series data from query result
    extractTimeSeriesData(result) {
        if (!result || !result.results || !result.results.A) {
            return [];
        }
        
        const frames = result.results.A.frames || [];
        const data = [];
        
        for (const frame of frames) {
            if (!frame.data || !frame.data.values || frame.data.values.length < 2) {
                continue;
            }
            
            const timeColumn = frame.data.values[0];
            const valueColumn = frame.data.values[1];
            
            for (let i = 0; i < timeColumn.length; i++) {
                if (timeColumn[i] && valueColumn[i] !== null && valueColumn[i] !== undefined) {
                    data.push({
                        timestamp: new Date(timeColumn[i]).toISOString(),
                        value: Number(valueColumn[i])
                    });
                }
            }
        }
        
        return data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    // Update analysis button state
    updateAnalysisButton() {
        const runButton = document.getElementById('runAnalysis');
        if (!runButton) return;

        const canRun = this.isConnected && 
                      this.config.measurement && 
                      this.config.field && 
                      !this.isAnalysisRunning &&
                      GrafanaConfig.connected;

        runButton.disabled = !canRun;
        
        if (!this.isConnected) {
            runButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>Connect to AI Service First';
            runButton.onclick = () => {
                if (typeof showNewAiConnectionDialog === 'function') {
                    showNewAiConnectionDialog();
                } else {
                    alert('Please add an AI connection first');
                }
            };
        } else if (!GrafanaConfig.connected) {
            runButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>Connect to Grafana First';
            runButton.onclick = null;
        } else if (!this.config.measurement || !this.config.field) {
            runButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>Select Measurement & Field';
            runButton.onclick = null;
        } else if (this.isAnalysisRunning) {
            runButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>Analyzing...';
            runButton.onclick = null;
        } else {
            runButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Run Analysis';
            runButton.onclick = () => this.runAnalysis();
        }
    },

    // Main analysis execution
    async runAnalysis() {
        if (this.isAnalysisRunning) return;

        console.log('🚀 Starting AI analysis...', {
            type: this.config.analysisType,
            measurement: this.config.measurement,
            field: this.config.field,
            timeRange: this.config.timeRange
        });

        this.isAnalysisRunning = true;
        this.updateAnalysisButton();

        const resultsContainer = document.getElementById('analyticsResults');
        const resultsContent = document.getElementById('analyticsResultsContent');

        try {
            // Show loading in modal
            this.showLoadingModal();

            // Validate configuration
            this.validateAnalysisConfig();

            // Convert tagFilters to tags object format
            console.log('🏷️ Analytics.config.tagFilters:', this.config.tagFilters);
            const tags = {};
            this.config.tagFilters.forEach(filter => {
                if (filter.tagKey && filter.tagValue) {
                    tags[filter.tagKey] = filter.tagValue;
                }
            });
            console.log('🏷️ Analytics converted tags object:', tags);

            // Execute AI analysis using the AI Analytics engine
            const results = await AIAnalytics.executeAnalysis({
                analysisType: this.config.analysisType,
                retentionPolicy: this.config.retentionPolicy,
                measurement: this.config.measurement,
                field: this.config.field,
                aggregation: this.config.aggregation,
                timeRange: this.config.timeRange,
                tags: tags,
                sensitivity: this.config.sensitivity,
                alertThreshold: this.config.alertThreshold,
                forecastHorizon: this.config.forecastHorizon,
                confidenceLevel: this.config.confidenceLevel,
                trendDepth: this.config.trendDepth,
                numPredict: this.config.numPredict,
                numCtx: this.config.numCtx,
                timeout: this.config.timeout, // Pass configurable timeout
                useVisualMode: this.config.useVisualMode, // Pass user's visual mode preference
                ollamaEndpoint: this.config.ollamaEndpoint // Pass Ollama endpoint for API calls
            });

            // Store results for export
            this.currentResults = results;

            // Show results in modal
            this.showResultsModal(results);

            console.log('✅ Analysis completed successfully');
            
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            this.showError(error.message);
        } finally {
            this.isAnalysisRunning = false;
            this.updateAnalysisButton();
        }
    },

    // Validate analysis configuration
    validateAnalysisConfig() {
        if (!this.config.measurement) {
            throw new Error('Please select a measurement');
        }
        
        if (!this.config.field) {
            throw new Error('Please select a field');
        }
        
        if (!GrafanaConfig.connected) {
            throw new Error('Please connect to a Grafana datasource');
        }
        
        if (!this.isConnected) {
            throw new Error('Please test your Ollama connection first');
        }
    },

    // Get loading HTML
    getLoadingHTML() {
        // Get active connection info
        const activeConnectionId = Storage.get('ACTIVE_AI_CONNECTION');
        const aiConnections = Storage.getAiConnections();
        const activeConnection = aiConnections.find(conn => conn.id === activeConnectionId);
        
        const connectionName = activeConnection ? activeConnection.name : 'Unknown';
        const provider = activeConnection ? (activeConnection.provider || 'ollama') : 'unknown';
        const model = activeConnection ? activeConnection.model : this.config.selectedModel;
        
        return `
            <div class="analysis-loading">
                <div class="loading-spinner"></div>
                <h4>🤖 AI Analysis in Progress</h4>
                <div class="loading-steps">
                    <div class="loading-step active" id="step-fetching">📊 Fetching time series data...</div>
                    <div class="loading-step" id="step-preprocessing">🔄 Preprocessing data...</div>
                    <div class="loading-step" id="step-ai">🧠 Running AI analysis...</div>
                    <div class="loading-step" id="step-visualization">📈 Generating visualizations...</div>
                </div>
                <div class="loading-config" style="margin-top: 20px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 12px;">
                    <strong style="display: block; margin-bottom: 8px;">Analysis Configuration:</strong>
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; line-height: 1.4;">
                        <span style="opacity: 0.7;">Type:</span><span>${this.config.analysisType}</span>
                        <span style="opacity: 0.7;">Connection:</span><span>${connectionName} (${provider.toUpperCase()})</span>
                        <span style="opacity: 0.7;">Model:</span><span>${model}</span>
                        <span style="opacity: 0.7;">Data:</span><span>${this.config.measurement}.${this.config.field}</span>
                        <span style="opacity: 0.7;">Range:</span><span>${this.config.timeRange}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Show loading modal
    showLoadingModal() {
        const modalHtml = `
            <div class="modal-overlay active" id="analyticsLoadingModal">
                <div class="modal analytics-loading-modal">
                    <div class="modal-content">
                        ${this.getLoadingHTML()}
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);
    },

    // Close loading modal
    closeLoadingModal() {
        const modal = document.getElementById('analyticsLoadingModal');
        if (modal) {
            modal.remove();
        }
    },

    // Show raw results fallback
    showRawResults(results) {
        const resultsContent = document.getElementById('analyticsResultsContent');
        if (!resultsContent) return;

        resultsContent.innerHTML = `
            <div class="raw-results">
                <div class="results-header">
                    <h4>📊 ${this.config.analysisType.charAt(0).toUpperCase() + this.config.analysisType.slice(1)} Analysis Results</h4>
                    <div class="results-meta">
                        Generated: ${new Date().toLocaleString()}<br>
                        Model: ${this.config.selectedModel}<br>
                        Data: ${this.config.measurement}.${this.config.field}
                    </div>
                </div>
                <div class="results-content">
                    <pre>${JSON.stringify(results, null, 2)}</pre>
                </div>
                <div class="results-actions">
                    <button onclick="Analytics.exportResults('json')" class="secondary-button">📄 Export JSON</button>
                    <button onclick="Analytics.copyResults()" class="secondary-button">📋 Copy to Clipboard</button>
                </div>
            </div>
        `;
    },

    // Save analysis to local storage
    saveAnalysis() {
        if (!this.currentResults) {
            this.showError('No analysis results to save');
            return;
        }

        // Create a unique ID for this analysis
        const analysisId = Date.now().toString();
        
        // Create the saved analysis object
        const savedAnalysis = {
            id: analysisId,
            timestamp: new Date().toISOString(),
            config: {
                analysisType: this.config.analysisType,
                measurement: this.config.measurement,
                field: this.config.field,
                timeRange: this.config.timeRange,
                tags: this.config.tags,
                model: this.config.selectedModel
            },
            results: this.currentResults,
            metadata: {
                datasource: GrafanaConfig.currentDatasourceName || 'Unknown',
                connection: GrafanaConfig.currentConnectionName || 'Unknown'
            }
        };

        // Get existing saved analyses
        const savedAnalyses = Storage.getSavedAiAnalyses();
        
        // Add the new analysis
        savedAnalyses.unshift(savedAnalysis); // Add to beginning
        
        // Limit to 50 saved analyses
        if (savedAnalyses.length > 50) {
            savedAnalyses.pop();
        }
        
        // Save using centralized cache
        try {
            Storage.setSavedAiAnalyses(savedAnalyses);
            
            // Show success message
            this.showSuccessMessage('Analysis saved successfully!');
            
            // Update saved analyses UI if it's open
            if (document.getElementById('savedAnalysesPanel')) {
                this.loadSavedAnalyses();
            }
        } catch (error) {
            console.error('Failed to save analysis:', error);
            this.showError('Failed to save analysis. Storage may be full.');
        }
    },

    // Show success message
    showSuccessMessage(message) {
        // Create a temporary success notification
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    },

    // Export results
    exportResults(format) {
        if (!this.currentResults) {
            console.warn('No results to export');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `analytics-${this.config.analysisType}-${timestamp}`;

        if (format === 'json') {
            const data = JSON.stringify(this.currentResults, null, 2);
            this.downloadFile(data, `${filename}.json`, 'application/json');
        } else if (format === 'csv') {
            const csv = this.convertResultsToCSV(this.currentResults);
            this.downloadFile(csv, `${filename}.csv`, 'text/csv');
        }
    },

    // Copy results to clipboard
    async copyResults() {
        if (!this.currentResults) {
            console.warn('No results to copy');
            return;
        }

        try {
            const text = JSON.stringify(this.currentResults, null, 2);
            await navigator.clipboard.writeText(text);
            
            // Show feedback
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    },

    // Convert results to CSV format
    convertResultsToCSV(results) {
        const rows = [];
        
        if (results.anomalies) {
            rows.push(['Type', 'Timestamp', 'Value', 'Score', 'Severity', 'Explanation']);
            results.anomalies.forEach(anomaly => {
                rows.push([
                    'anomaly',
                    anomaly.timestamp,
                    anomaly.value,
                    anomaly.score,
                    anomaly.severity,
                    anomaly.explanation
                ]);
            });
        } else if (results.predictions) {
            rows.push(['Type', 'Timestamp', 'Predicted Value', '80% Lower', '80% Upper', '95% Lower', '95% Upper']);
            results.predictions.forEach(pred => {
                rows.push([
                    'prediction',
                    pred.timestamp,
                    pred.predicted_value,
                    pred.confidence_80_lower,
                    pred.confidence_80_upper,
                    pred.confidence_95_lower,
                    pred.confidence_95_upper
                ]);
            });
        }
        
        return rows.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    },

    // Download file helper
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Show loading indicator for saved analysis
    showSavedAnalysisLoading() {
        const loadingHtml = `
            <div class="modal-overlay active" id="savedAnalysisLoadingModal">
                <div class="modal analytics-loading-modal">
                    <div class="modal-content">
                        <div class="analysis-loading">
                            <div class="loading-spinner"></div>
                            <h4>📊 Loading Saved Analysis</h4>
                            <p>Preparing charts and visualizations...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = loadingHtml;
        document.body.appendChild(modalContainer.firstElementChild);
    },

    // Close saved analysis loading modal
    closeSavedAnalysisLoading() {
        const modal = document.getElementById('savedAnalysisLoadingModal');
        if (modal) {
            modal.remove();
        }
    },

    // Show results in modal (similar to Dashboard panel viewer)
    showResultsModal(results) {
        console.log('📊 Showing analytics results in modal');
        
        // Close loading modal first
        this.closeLoadingModal();
        
        // Create modal HTML with initial loading state
        const modalHtml = `
            <div class="modal-overlay active" id="analyticsResultsModal">
                <div class="modal analytics-results-modal">
                    <div class="modal-header">
                        <h3>${this.config.analysisType.charAt(0).toUpperCase() + this.config.analysisType.slice(1)} Analysis Results</h3>
                        <button class="modal-close" onclick="Analytics.closeResultsModal()">×</button>
                    </div>
                    <div class="modal-content analytics-modal-content">
                        <div class="analytics-results-info">
                            <div class="info-item">
                                <strong>Data:</strong> ${this.config.measurement}.${this.config.field}
                            </div>
                            <div class="info-item">
                                <strong>Time Range:</strong> ${this.config.timeRange}
                            </div>
                            <div class="info-item">
                                <strong>Model:</strong> ${this.config.selectedModel}
                            </div>
                        </div>
                        <div class="analytics-results-body" id="analyticsModalResults">
                            <div class="analysis-loading">
                                <div class="loading-spinner"></div>
                                <h4>📊 Rendering Charts</h4>
                                <p>Creating visualizations...</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary-button" onclick="Analytics.saveAnalysis()">💾 Save Analysis</button>
                        <button class="secondary-button" onclick="Analytics.exportResults('json')">📄 Export JSON</button>
                        <button class="secondary-button" onclick="Analytics.exportResults('csv')">📊 Export CSV</button>
                        <button class="primary-button" onclick="Analytics.closeResultsModal()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // Close the saved analysis loading modal now that results modal is shown
        this.closeSavedAnalysisLoading();
        
        // Render results with proper loading handling
        // Execute a query to get the raw data for charting
        this.executeQueryForChart(results).then(() => {
            // Chart initialization is handled in executeQueryForChart
        }).catch(error => {
            console.error('Error creating chart:', error);
            // Fall back to the custom visualizer if available
            if (typeof AnalyticsVisualizer !== 'undefined') {
                setTimeout(() => {
                    try {
                        AnalyticsVisualizer.visualizeResults(results, 'analyticsModalResults');
                    } catch (error) {
                        console.error('Error rendering charts:', error);
                        this.showRawResultsInModal(results);
                    }
                }, 100);
            } else {
                this.showRawResultsInModal(results);
            }
        });
    },

    // Execute query to get chart data
    async executeQueryForChart(aiResults) {
        console.log('📊 Executing query for chart visualization');
        
        // Build the query with user's aggregation
        const aggregation = this.config.aggregation || 'sum';
        const measurement = this.config.retentionPolicy ? 
            `"${this.config.retentionPolicy}"."${this.config.measurement}"` : 
            `"${this.config.measurement}"`;
        
        let whereClause = `time >= now() - ${this.config.timeRange}`;
        
        // Add tag filters
        if (this.config.tags && Object.keys(this.config.tags).length > 0) {
            const tagFilters = Object.entries(this.config.tags)
                .map(([key, value]) => `"${key}" = '${value}'`)
                .join(' AND ');
            whereClause += ` AND ${tagFilters}`;
        }
        
        // Calculate appropriate time interval for grouping
        const interval = this.calculateTimeInterval(this.config.timeRange);
        
        const query = `SELECT ${aggregation}("${this.config.field}") as value 
                      FROM ${measurement} 
                      WHERE ${whereClause}
                      GROUP BY time(${interval}) fill(none)`;
        
        console.log('📝 Chart query:', query);
        
        // Execute the query
        const queryResult = await Queries.executeQuery(query, {
            datasourceId: GrafanaConfig.currentDatasourceId,
            datasourceType: GrafanaConfig.selectedDatasourceType
        });
        
        if (!queryResult || !queryResult.results || !queryResult.results.A) {
            throw new Error('No data returned from query');
        }
        
        // Update the modal content with chart HTML
        const modalResults = document.getElementById('analyticsModalResults');
        if (modalResults) {
            // Create the chart HTML structure that Charts.js expects
            modalResults.innerHTML = `
                <div class="chart-container">
                    <div class="chart-header">
                        <h4>Time Series Data</h4>
                        <div class="chart-controls">
                            <div class="chart-option">
                                <input type="checkbox" id="showAllSeries" checked>
                                <label for="showAllSeries">Show All Groups</label>
                            </div>
                            <div class="chart-option">
                                <label for="chartType">Chart Type:</label>
                                <select id="chartType">
                                    <option value="line" selected>Line</option>
                                    <option value="bar">Bar</option>
                                    <option value="scatter">Scatter</option>
                                </select>
                            </div>
                            <div class="chart-option">
                                <input type="checkbox" id="smoothLines" checked>
                                <label for="smoothLines">Smooth Lines</label>
                            </div>
                        </div>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="timeSeriesChart"></canvas>
                    </div>
                </div>
                <div class="ai-analysis-section">
                    <h4>AI Analysis Results</h4>
                    <div id="aiAnalysisContent"></div>
                </div>
            `;
            
            // Initialize the chart using the existing Charts code
            if (typeof Charts !== 'undefined') {
                Charts.initializeChart(queryResult.results.A.frames || []);
            }
            
            // Add the AI analysis results below the chart
            const aiContent = document.getElementById('aiAnalysisContent');
            if (aiContent && typeof AnalyticsVisualizer !== 'undefined') {
                AnalyticsVisualizer.visualizeResults(aiResults, 'aiAnalysisContent');
            }
        }
    },
    
    // Calculate appropriate time interval based on time range
    calculateTimeInterval(timeRange) {
        const intervals = {
            '1h': '1m',
            '6h': '1m',
            '1d': '1m',
            '7d': '1m',
            '30d': '1m',  // Use 1m like Grafana does
            '90d': '5m'
        };
        return intervals[timeRange] || '1m';
    },

    // Close results modal
    closeResultsModal() {
        const modal = document.getElementById('analyticsResultsModal');
        if (modal) {
            modal.remove();
        }
        
        // Also close saved analysis loading modal if it's still open
        this.closeSavedAnalysisLoading();
    },

    // Show raw results in modal
    showRawResultsInModal(results) {
        const resultsContent = document.getElementById('analyticsModalResults');
        if (!resultsContent) return;

        resultsContent.innerHTML = `
            <div class="raw-results">
                <div class="results-content">
                    <pre>${JSON.stringify(results, null, 2)}</pre>
                </div>
            </div>
        `;
    },

    // Show error message with suggestions
    showError(message) {
        // Show error in modal
        const errorHtml = `
            <div class="modal-overlay active" id="analyticsErrorModal">
                <div class="modal analytics-error-modal">
                    <div class="modal-header">
                        <h3>❌ Analysis Error</h3>
                        <button class="modal-close" onclick="Analytics.closeErrorModal()">×</button>
                    </div>
                    <div class="modal-content">
                        <div class="analysis-error">
                            <p>${message}</p>
                            ${this.getErrorSuggestions(message)}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="primary-button" onclick="Analytics.closeErrorModal()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        // Close loading modal if open
        this.closeLoadingModal();
        
        // Add error modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = errorHtml;
        document.body.appendChild(modalContainer.firstElementChild);
    },

    // Show saved analyses modal
    showSavedAnalyses() {
        const modal = document.getElementById('savedAnalysesModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadSavedAnalyses();
        }
    },

    // Close saved analyses modal
    closeSavedAnalyses() {
        const modal = document.getElementById('savedAnalysesModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Load saved analyses from localStorage
    loadSavedAnalyses() {
        const panel = document.getElementById('savedAnalysesPanel');
        if (!panel) return;

        let savedAnalyses = Storage.getSavedAiAnalyses();
        
        // Ensure savedAnalyses is an array (fix for legacy data)
        if (!Array.isArray(savedAnalyses)) {
            console.warn('Saved analyses was not an array, converting...', savedAnalyses);
            savedAnalyses = [];
        }

        if (savedAnalyses.length === 0) {
            panel.innerHTML = '<div class="no-saved-analyses">No saved analyses yet. Run an analysis and save it to see it here.</div>';
            return;
        }

        let html = '<div class="saved-analyses-list">';
        
        savedAnalyses.forEach(analysis => {
            const date = new Date(analysis.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            html += `
                <div class="saved-analysis-item" data-id="${analysis.id}">
                    <div class="saved-analysis-header">
                        <div class="saved-analysis-title">
                            ${analysis.config.analysisType.charAt(0).toUpperCase() + analysis.config.analysisType.slice(1)} Analysis
                        </div>
                        <div class="saved-analysis-timestamp">${formattedDate}</div>
                    </div>
                    <div class="saved-analysis-info">
                        <strong>Data:</strong> ${analysis.config.measurement}.${analysis.config.field} | 
                        <strong>Time:</strong> ${analysis.config.timeRange} | 
                        <strong>Model:</strong> ${analysis.config.model}
                    </div>
                    <div class="saved-analysis-actions">
                        <button class="secondary-button" onclick="Analytics.viewSavedAnalysis('${analysis.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                            View
                        </button>
                        <button class="secondary-button" onclick="Analytics.deleteSavedAnalysis('${analysis.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        panel.innerHTML = html;
    },

    // View a saved analysis
    viewSavedAnalysis(analysisId) {
        let savedAnalyses = Storage.getSavedAiAnalyses();
        
        // Ensure savedAnalyses is an array (fix for legacy data)
        if (!Array.isArray(savedAnalyses)) {
            console.warn('Saved analyses was not an array, converting...', savedAnalyses);
            savedAnalyses = [];
        }
        const analysis = savedAnalyses.find(a => a.id === analysisId);
        
        if (!analysis) {
            this.showError('Analysis not found');
            return;
        }

        // Show loading indicator immediately
        this.showSavedAnalysisLoading();

        // Close saved analyses modal
        this.closeSavedAnalyses();
        
        // Update current results
        this.currentResults = analysis.results;
        
        // Update config to match saved analysis
        this.config.analysisType = analysis.config.analysisType;
        this.config.measurement = analysis.config.measurement;
        this.config.field = analysis.config.field;
        this.config.timeRange = analysis.config.timeRange;
        this.config.tags = analysis.config.tags || {};
        
        // Show results modal with loading handled
        this.showResultsModal(analysis.results);
    },

    // Delete a saved analysis
    deleteSavedAnalysis(analysisId) {
        if (!confirm('Are you sure you want to delete this analysis?')) {
            return;
        }

        let savedAnalyses = Storage.getSavedAiAnalyses();
        
        // Ensure savedAnalyses is an array (fix for legacy data)
        if (!Array.isArray(savedAnalyses)) {
            console.warn('Saved analyses was not an array, converting...', savedAnalyses);
            savedAnalyses = [];
        }
        
        savedAnalyses = savedAnalyses.filter(a => a.id !== analysisId);
        
        Storage.setSavedAiAnalyses(savedAnalyses);
        
        // Reload the list
        this.loadSavedAnalyses();
        
        // Show success message
        this.showSuccessMessage('Analysis deleted successfully');
    },

    // Close error modal
    closeErrorModal() {
        const modal = document.getElementById('analyticsErrorModal');
        if (modal) {
            modal.remove();
        }
    },

    // Get error suggestions
    getErrorSuggestions(message) {
        let suggestions = '';
        
        // If it's a "no data found" error, provide helpful suggestions
        if (message.includes('No data found')) {
            suggestions = `
                <div class="error-suggestions">
                    <h5>💡 Suggestions:</h5>
                    <ul>
                        <li>Try selecting a different field - look for fields marked with ✓ in the dropdown</li>
                        <li>Reduce the time range to 1 hour or 1 day to find recent data</li>
                        <li>Check if the measurement actually contains data in the selected time period</li>
                        <li>Verify that the datasource is properly connected and accessible</li>
                    </ul>
                    <button onclick="Analytics.suggestWorkingFields()" class="secondary-button" style="margin-top: 10px;">
                        🔍 Find Fields with Data
                    </button>
                </div>
            `;
        }
        
        return suggestions;
    },

    // Suggest working fields for analysis
    async suggestWorkingFields() {
        console.log('🔍 Looking for fields with data...');
        
        const measurementSelect = document.getElementById('analyticsMeasurement');
        const fieldSelect = document.getElementById('analyticsField');
        
        if (!measurementSelect || !fieldSelect || !GrafanaConfig.connected) {
            console.warn('Cannot suggest fields - connection or elements missing');
            return;
        }
        
        try {
            // Show loading state
            fieldSelect.innerHTML = '<option value="">🔍 Searching for fields with data...</option>';
            
            // Get current measurement or try a few popular ones
            const currentMeasurement = measurementSelect.value;
            const measurementsToTry = currentMeasurement ? 
                [currentMeasurement] : 
                this.getPopularMeasurements();
            
            let foundFields = [];
            
            for (const measurement of measurementsToTry) {
                console.log(`Checking measurement: ${measurement}`);
                
                // Load fields for this measurement if not already loaded
                if (typeof Schema !== 'undefined') {
                    const fields = Schema.influxFields[measurement] || [];
                    
                    if (fields.length > 0) {
                        const fieldsWithData = await this.checkFieldsForData(measurement, fields);
                        
                        if (fieldsWithData.length > 0) {
                            foundFields = foundFields.concat(
                                fieldsWithData.map(field => ({ measurement, field }))
                            );
                        }
                    }
                }
                
                // Stop after finding some fields or checking max measurements
                if (foundFields.length >= 5 || measurementsToTry.indexOf(measurement) >= 2) {
                    break;
                }
            }
            
            if (foundFields.length > 0) {
                // Update measurement and field selects with found data
                const firstFound = foundFields[0];
                
                if (!currentMeasurement) {
                    measurementSelect.value = firstFound.measurement;
                    this.config.measurement = firstFound.measurement;
                }
                
                // Reload fields for the measurement
                await this.loadFieldsForMeasurement(firstFound.measurement);
                
                // Select the first field with data
                fieldSelect.value = firstFound.field;
                this.config.field = firstFound.field;
                
                this.saveConfiguration();
                this.updateAnalysisButton();
                
                console.log(`✅ Found ${foundFields.length} fields with data. Selected: ${firstFound.measurement}.${firstFound.field}`);
                
                // Show success message
                if (typeof Interface !== 'undefined' && Interface.showToast) {
                    Interface.showToast(`Found ${foundFields.length} fields with data. Selected: ${firstFound.measurement}.${firstFound.field}`, 'success');
                } else {
                    console.log(`✅ Selected field with data: ${firstFound.measurement}.${firstFound.field}`);
                }
                
            } else {
                console.warn('❌ No fields with recent data found');
                fieldSelect.innerHTML = '<option value="">No fields with recent data found</option>';
                
                // Show warning message
                if (typeof Interface !== 'undefined' && Interface.showToast) {
                    Interface.showToast('No fields with recent data found. Try a longer time range or different measurement.', 'warning');
                } else {
                    console.warn('❌ No fields with recent data found');
                }
            }
            
        } catch (error) {
            console.error('Failed to suggest working fields:', error);
            fieldSelect.innerHTML = '<option value="">Error searching for fields</option>';
        }
    },

    // Get list of commonly used measurement names to try
    getPopularMeasurements() {
        if (typeof Schema !== 'undefined' && Schema.influxMeasurements.length > 0) {
            // Return first few measurements from schema
            return Schema.influxMeasurements.slice(0, 5);
        }
        
        // Fallback list of common measurement names
        return [
            'prometheus',
            'cpu',
            'memory', 
            'disk',
            'network',
            'system',
            'application',
            'metrics'
        ];
    },

    // Populate the analytics datasource selector
    populateAnalyticsDatasourceSelect() {
        const datasourceSelect = document.getElementById('analyticsDatasource');
        if (!datasourceSelect) return;
        
        // Clear existing options
        datasourceSelect.innerHTML = '<option value="">Select data source</option>';
        
        // Add datasources from the datasource list (only from the sidebar)
        const datasourceList = document.getElementById('datasourceList');
        if (datasourceList) {
            const datasourceItems = datasourceList.querySelectorAll('.datasource-item');
            console.log('📊 Found datasource items for Analytics:', datasourceItems.length);
            datasourceItems.forEach(item => {
                if (item.dataset.uid && item.dataset.name) {
                    const option = document.createElement('option');
                    option.value = item.dataset.uid;
                    option.textContent = item.dataset.name;
                    datasourceSelect.appendChild(option);
                    console.log('📊 Added datasource option to Analytics:', item.dataset.name);
                }
            });
            
            // Set current selection based on global config
            if (GrafanaConfig.currentDatasourceId) {
                datasourceSelect.value = GrafanaConfig.currentDatasourceId;
                console.log('📊 Set Analytics datasource to:', GrafanaConfig.currentDatasourceId);
            }
        }
    },

    // Handle datasource change for Analytics
    setDatasource(datasourceUid) {
        if (!datasourceUid) {
            console.log('❌ No datasource UID provided to Analytics.setDatasource');
            return;
        }

        console.log('📊 Analytics changing datasource to:', datasourceUid);
        
        // Find the datasource item and get its info
        const datasourceItem = document.querySelector(`[data-uid="${datasourceUid}"]`);
        if (!datasourceItem) {
            console.warn('❌ Datasource item not found for UID:', datasourceUid);
            return;
        }

        const datasourceName = datasourceItem.dataset.name;
        const datasourceType = datasourceItem.dataset.type;
        
        console.log('📊 Analytics datasource info:', {
            uid: datasourceUid,
            name: datasourceName,
            type: datasourceType
        });

        // Update global config (this updates Schema context)
        GrafanaConfig.currentDatasourceId = datasourceUid;
        GrafanaConfig.selectedDatasourceUid = datasourceUid;
        GrafanaConfig.selectedDatasourceType = datasourceType;
        GrafanaConfig.selectedDatasourceName = datasourceName;

        // Update Schema context
        if (typeof Schema !== 'undefined') {
            Schema.currentDatasourceId = datasourceUid;
            Schema.currentDatasourceType = datasourceType;
        }

        // Clear existing data and reload for new datasource
        this.config.measurement = '';
        this.config.field = '';
        this.config.retentionPolicy = '';
        this.saveConfiguration();

        // Reload all dependent dropdowns
        this.loadRetentionPolicies();
        this.loadMeasurements();
        
        // Clear field dropdown
        const fieldSelect = document.getElementById('analyticsField');
        if (fieldSelect) {
            fieldSelect.innerHTML = '<option value="">Select measurement first</option>';
        }

        console.log('✅ Analytics datasource changed successfully');
    },

    // Load tags for the selected measurement and field
    async loadTagsForField(measurement, field) {
        if (!measurement) {
            console.log('🏷️ Skipping tag loading - missing measurement');
            return;
        }
        
        console.log('🏷️ Loading tags for measurement:', measurement, 'field:', field);
        console.log('🏷️ Schema available:', typeof Schema !== 'undefined');
        
        try {
            // Wait a moment for Schema to be updated if needed
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get tags from Schema if available
            if (typeof Schema !== 'undefined' && Schema.influxTags) {
                console.log('🏷️ All Schema measurements:', Object.keys(Schema.influxTags));
                
                if (Schema.influxTags[measurement]) {
                    const tags = Schema.influxTags[measurement];
                    console.log('🏷️ Found tags for', measurement, ':', tags);
                    
                    // Update tag filter dropdowns
                    this.updateTagFilterDropdowns(tags);
                    
                    // Update group by tags dropdown
                    this.updateGroupByTagsDropdown(tags);
                } else {
                    console.warn('⚠️ No tags found for measurement:', measurement);
                    console.log('🏷️ Available measurements in Schema:', Object.keys(Schema.influxTags));
                    this.updateTagFilterDropdowns([]);
                    this.updateGroupByTagsDropdown([]);
                }
            } else {
                console.warn('⚠️ Schema or Schema.influxTags not available');
                this.updateTagFilterDropdowns([]);
                this.updateGroupByTagsDropdown([]);
            }
        } catch (error) {
            console.error('❌ Failed to load tags:', error);
            this.updateTagFilterDropdowns([]);
            this.updateGroupByTagsDropdown([]);
        }
    },

    // Update tag filter dropdowns with available tags
    updateTagFilterDropdowns(tags) {
        const tagKeySelects = document.querySelectorAll('.tag-key-select');
        console.log('🏷️ Updating tag filter dropdowns, found', tagKeySelects.length, 'selects with', tags.length, 'tags');
        
        tagKeySelects.forEach((select, index) => {
            console.log('🏷️ Updating tag select', index, 'with tags:', tags);
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select tag...</option>';
            
            tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                if (tag === currentValue) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    },

    // Update group by tags dropdown
    updateGroupByTagsDropdown(tags) {
        const groupByTagsSelect = document.getElementById('groupByTagsSelect');
        if (!groupByTagsSelect) return;
        
        const selectedValues = Array.from(groupByTagsSelect.selectedOptions).map(option => option.value);
        groupByTagsSelect.innerHTML = '';
        
        if (tags.length === 0) {
            groupByTagsSelect.innerHTML = '<option value="">No tags available</option>';
            return;
        }
        
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            if (selectedValues.includes(tag)) {
                option.selected = true;
            }
            groupByTagsSelect.appendChild(option);
        });
    },

    // Load tag values for a specific tag key
    async loadTagValues(tagKey, targetSelect) {
        console.log('🏷️ loadTagValues called with:', { tagKey, measurement: this.config.measurement, targetSelect: !!targetSelect });
        
        if (!tagKey || !this.config.measurement) {
            console.log('🏷️ Missing tagKey or measurement, returning early');
            targetSelect.innerHTML = '<option value="">Select value...</option>';
            targetSelect.disabled = true;
            return;
        }
        
        targetSelect.innerHTML = '<option value="">Loading values...</option>';
        targetSelect.disabled = false;
        
        try {
            // Check if Queries module is available
            console.log('🏷️ Checking Queries module availability:', typeof Queries, !!window.Queries);
            
            // Query InfluxDB for tag values
            const retentionPolicy = this.config.retentionPolicy || 'raw';
            const query = `SHOW TAG VALUES FROM "${retentionPolicy}"."${this.config.measurement}" WITH KEY = "${tagKey}"`;
            
            console.log('🏷️ Loading tag values with query:', query);
            console.log('🏷️ Current config:', {
                datasourceId: GrafanaConfig.currentDatasourceId,
                datasourceType: GrafanaConfig.selectedDatasourceType,
                retentionPolicy,
                measurement: this.config.measurement
            });
            
            // Use DataAccess for tag values query
            console.log('🏷️ Executing query via DataAccess...');
            const result = await DataAccess.executeQuery(
                GrafanaConfig.currentDatasourceId,
                query,
                {
                    datasourceType: GrafanaConfig.selectedDatasourceType || 'influxdb',
                    maxDataPoints: 1000,
                    raw: true
                }
            );
            
            console.log('🏷️ Tag values query result:', result);
                console.log('🏷️ Result structure check:', {
                    hasResult: !!result,
                    hasResults: !!(result && result.results),
                    hasA: !!(result && result.results && result.results.A),
                    hasSeries: !!(result && result.results && result.results.A && result.results.A.series)
                });
                
                // Handle both Grafana wrapped results (results.A) and direct InfluxDB results
                let values = null;
                
                if (result && result.results) {
                    // Check for Grafana frames format (results.A.frames)
                    if (result.results.A && result.results.A.frames && result.results.A.frames[0]) {
                        const frame = result.results.A.frames[0];
                        if (frame.data && frame.data.values && frame.data.values[0]) {
                            values = frame.data.values[0]; // Values are in the first (and only) column
                            console.log('🏷️ Found values in Grafana frames format');
                        }
                    }
                    // Check for Grafana series format (results.A.series)
                    else if (result.results.A && result.results.A.series) {
                        const series = result.results.A.series[0];
                        if (series && series.values) {
                            values = series.values.map(row => row[1]); // Tag values are in second column
                            console.log('🏷️ Found values in results.A series format');
                        }
                    } 
                    // Check for direct InfluxDB format (results[0].series)
                    else if (Array.isArray(result.results) && result.results[0] && result.results[0].series) {
                        const series = result.results[0].series[0];
                        if (series && series.values) {
                            values = series.values.map(row => row[1]); // Tag values are in second column
                            console.log('🏷️ Found values in direct InfluxDB format');
                        }
                    }
                }
                
                console.log('🏷️ Extracted values:', values);
                
                if (values && values.length > 0) {
                    targetSelect.innerHTML = '<option value="">Select value...</option>';
                    values.forEach(value => {
                        const option = document.createElement('option');
                        option.value = value;
                        option.textContent = value;
                        targetSelect.appendChild(option);
                    });
                    
                    // Add event listener to ensure updateTagFiltersConfig is called when value changes
                    targetSelect.removeEventListener('change', updateTagFiltersConfig);
                    targetSelect.addEventListener('change', updateTagFiltersConfig);
                    console.log('🏷️ Added change event listener to tag value select');
                    
                    console.log('🏷️ Successfully loaded', values.length, 'values for tag:', tagKey);
                } else {
                    console.log('🏷️ No values found');
                    console.log('🏷️ Full result structure:', JSON.stringify(result, null, 2));
                    targetSelect.innerHTML = '<option value="">No values found</option>';
                }
        } catch (error) {
            console.error('❌ Failed to load tag values for', tagKey, ':', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            targetSelect.innerHTML = '<option value="">Error loading values</option>';
        }
    },

    // Generate WHERE clause from tag filters
    generateWhereClause() {
        let whereConditions = [];
        
        // Add tag filters
        this.config.tagFilters.forEach(filter => {
            if (filter.tagKey && filter.tagValue) {
                whereConditions.push(`"${filter.tagKey}" = '${filter.tagValue}'`);
            }
        });
        
        if (whereConditions.length > 0) {
            return ' AND ' + whereConditions.join(' AND ');
        }
        
        return '';
    },

    // Generate GROUP BY clause
    generateGroupByClause() {
        let groupByParts = [];
        
        // Add time grouping
        if (this.config.groupByTime) {
            groupByParts.push(`time(${this.config.timeGroupInterval})`);
        }
        
        // Add tag grouping
        if (this.config.groupByTags && this.config.groupByTagsList.length > 0) {
            this.config.groupByTagsList.forEach(tag => {
                groupByParts.push(`"${tag}"`);
            });
        }
        
        if (groupByParts.length > 0) {
            return ' GROUP BY ' + groupByParts.join(', ');
        }
        
        return '';
    }
};

// Global functions for HTML event handlers

// Tag filtering functions
function onTagKeyChange(selectElement) {
    const tagKey = selectElement.value;
    const tagFilterItem = selectElement.closest('.tag-filter-item');
    const tagValueSelect = tagFilterItem.querySelector('.tag-value-select');
    
    if (tagKey) {
        Analytics.loadTagValues(tagKey, tagValueSelect);
    } else {
        tagValueSelect.innerHTML = '<option value="">Select value...</option>';
        tagValueSelect.disabled = true;
    }
    
    // Update the Analytics config
    updateTagFiltersConfig();
}

function addTagFilter() {
    const container = document.getElementById('tagFiltersContainer');
    const newFilter = document.createElement('div');
    newFilter.className = 'tag-filter-item';
    newFilter.innerHTML = `
        <select class="tag-key-select select-input" onchange="onTagKeyChange(this)">
            <option value="">Select tag...</option>
        </select>
        <select class="tag-value-select select-input" disabled onchange="updateTagFiltersConfig()">
            <option value="">Select value...</option>
        </select>
        <button type="button" class="icon-button tag-filter-remove" onclick="removeTagFilter(this)" title="Remove filter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
        </button>
    `;
    
    container.appendChild(newFilter);
    
    // Update the new tag key select with available tags
    if (Analytics.config.measurement && Analytics.config.field) {
        Analytics.loadTagsForField(Analytics.config.measurement, Analytics.config.field);
    }
}

function removeTagFilter(buttonElement) {
    const tagFilterItem = buttonElement.closest('.tag-filter-item');
    const container = document.getElementById('tagFiltersContainer');
    
    // Don't remove the last filter item
    if (container.children.length > 1) {
        tagFilterItem.remove();
        updateTagFiltersConfig();
    } else {
        // Reset the last remaining filter
        const tagKeySelect = tagFilterItem.querySelector('.tag-key-select');
        const tagValueSelect = tagFilterItem.querySelector('.tag-value-select');
        tagKeySelect.value = '';
        tagValueSelect.innerHTML = '<option value="">Select value...</option>';
        tagValueSelect.disabled = true;
        updateTagFiltersConfig();
    }
}

function updateTagFiltersConfig() {
    console.log('🏷️ updateTagFiltersConfig called');
    const tagFilterItems = document.querySelectorAll('.tag-filter-item');
    const tagFilters = [];
    
    tagFilterItems.forEach(item => {
        const tagKey = item.querySelector('.tag-key-select').value;
        const tagValue = item.querySelector('.tag-value-select').value;
        console.log('🏷️ Found tag filter item:', { tagKey, tagValue });
        
        if (tagKey && tagValue) {
            tagFilters.push({ tagKey, tagValue });
        }
    });
    
    console.log('🏷️ Final tagFilters array:', tagFilters);
    Analytics.config.tagFilters = tagFilters;
    Analytics.saveConfiguration();
}

function onGroupByChange() {
    const groupByTime = document.getElementById('groupByTime').checked;
    const groupByTags = document.getElementById('groupByTags').checked;
    
    document.getElementById('timeGroupInterval').disabled = !groupByTime;
    document.getElementById('groupByTagsSelect').disabled = !groupByTags;
    
    Analytics.config.groupByTime = groupByTime;
    Analytics.config.groupByTags = groupByTags;
    Analytics.saveConfiguration();
}

function exportAnalysisResults() {
    if (Analytics.currentResults) {
        const data = JSON.stringify(Analytics.currentResults, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-results-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

function shareAnalysisResults() {
    if (Analytics.currentResults) {
        const url = `data:application/json,${encodeURIComponent(JSON.stringify(Analytics.currentResults, null, 2))}`;
        navigator.clipboard.writeText(url).then(() => {
            console.log('Results copied to clipboard');
        });
    }
}

// AI Connection Dialog Functions
function showAiConnectionDialog() {
    Analytics.showAiConnectionDialog();
}

function hideAiConnectionDialog() {
    Analytics.hideAiConnectionDialog();
}

function saveAiConnection() {
    Analytics.saveAiConnection();
}

// Export for use in other modules
window.Analytics = Analytics;

