/**
 * VS Code-like Interface Manager
 * Handles tabs, panels, activity bar, and layout management
 */

const Interface = {
    // State management
    activeTab: 'untitled-1',
    tabCounter: 1,
    tabs: new Map(),
    activePanel: 'results',
    activeSidebarView: 'connections',
    panelVisible: true,
    
    // Initialize the interface
    initialize() {
        this.initializeActivityBar();
        this.initializeTabs();
        this.initializePanels();
        this.initializeKeyboardShortcuts();
        this.initializeResizers();
        this.createInitialTab();
        
        // Set initial state
        this.switchSidebarView('connections');
        this.switchPanel('results');
        
        // Force initial content load
        setTimeout(() => {
            this.updateSidebarContent('connections');
            
            // Ensure CodeMirror is initialized for the active tab
            this.ensureCodeMirrorInitialized();
        }, 100);
    },

    // Activity Bar Management
    initializeActivityBar() {
        const activityItems = document.querySelectorAll('.activity-item');
        activityItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const view = item.dataset.view;
                this.switchSidebarView(view);
            });
        });
    },

    switchSidebarView(view) {
        // Update active activity item
        document.querySelectorAll('.activity-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Update active sidebar panel
        document.querySelectorAll('.sidebar-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        const panel = document.getElementById(`${view}Panel`);
        if (panel) {
            panel.classList.add('active');
        } else {
            console.warn(`Panel not found for view: ${view}`);
            return;
        }
        
        // Deactivate all panel sections first (except results panel)
        document.querySelectorAll('.panel-section:not(#resultsPanel)').forEach(section => {
            section.classList.remove('active');
        });

        this.activeSidebarView = view;

        // Update panel content based on view
        this.updateSidebarContent(view);
    },

    updateSidebarContent(view) {
        console.log('Updating sidebar content for view:', view);
        switch (view) {
            case 'connections':
                console.log('Processing connections view - about to call loadConnections and loadDataSources');
                // Activate connection panel sections
                document.querySelectorAll('#connectionsPanel .panel-section').forEach(section => {
                    section.classList.add('active');
                });
                this.loadConnections();
                console.log('About to call loadDataSources');
                // Direct call to populate data sources with click handlers
                if (GrafanaConfig.connected && typeof Connections !== 'undefined') {
                    console.log('Calling populateDatasources directly');
                    Connections.populateDatasources();
                } else {
                    console.log('Not connected or Connections unavailable, calling regular loadDataSources');
                    Interface.loadDataSources();
                }
                console.log('Finished calling loadDataSources');
                break;
            case 'explorer':
                this.refreshSchemaExplorer();
                this.populateSchemaDatasourceSelect();
                break;
            case 'dashboards':
                this.refreshDashboards();
                break;
            case 'files':
                this.loadFileExplorer();
                break;
            case 'history':
                this.loadHistory();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'agent':
                // Show AI Agent panel (don't auto-open chat)
                this.updateAgentPanel();
                break;
        }
    },

    // Update AI Agent panel status
    updateAgentPanel() {
        const statusIndicator = document.getElementById('aiAssistantStatus');
        if (statusIndicator) {
            // Check if AI service is connected
            const isAiConnected = window.Analytics && Analytics.isConnected;
            const isGrafanaConnected = GrafanaConfig.connected;
            
            if (isAiConnected && isGrafanaConnected) {
                statusIndicator.className = 'status-indicator connected';
            } else if (isGrafanaConnected) {
                statusIndicator.className = 'status-indicator offline';
            } else {
                statusIndicator.className = 'status-indicator disconnected';
            }
        }
    },

    // Tab Management
    initializeTabs() {
        // Handle new tab button
        document.querySelector('.new-tab-button').addEventListener('click', () => {
            this.createNewTab();
        });

        // Initialize existing tab
        this.tabs.set('untitled-1', {
            id: 'untitled-1',
            label: 'Untitled-1',
            content: '',
            queryType: 'influxql',
            saved: false,
            filePath: null,
            datasourceId: null,
            datasourceName: null,
            datasourceType: null
        });

        // Add click handler to initial tab
        const initialTab = document.querySelector('[data-tab-id="untitled-1"].tab');
        if (initialTab) {
            initialTab.addEventListener('click', (e) => {
                if (!e.target.classList.contains('tab-close')) {
                    this.switchTab('untitled-1');
                }
            });
        }
    },

    createInitialTab() {
        console.log('Creating initial tab...');
        
        
        // Create the initial tab content if it doesn't exist
        const existingContainer = document.querySelector(`[data-tab-id="untitled-1"].editor-container`);
        console.log('Existing container found:', !!existingContainer);
        if (!existingContainer) {
            console.log('Creating tab content for untitled-1');
            this.createTabContent('untitled-1');
        }
        console.log('Switching to untitled-1 tab');
        this.switchTab('untitled-1');
    },

    // Open AI-generated query in a new tab
    openAIGeneratedQuery(queryData) {
        console.log('📝 Opening AI-generated query in new tab:', queryData);
        
        // Create a new tab
        const tabId = this.createNewTab();
        
        // Wait for tab to be ready, then set content
        setTimeout(() => {
            const tabData = this.tabs.get(tabId);
            if (tabData && tabData.editor) {
                // Set the query text
                tabData.editor.setValue(queryData.query);
                
                // Set query type if available
                if (queryData.queryType) {
                    // Update the query type selector if it exists
                    const queryTypeSelector = document.querySelector(`#tab-${tabId} .query-type-selector`);
                    if (queryTypeSelector) {
                        queryTypeSelector.value = queryData.queryType;
                    }
                    
                    // Update CodeMirror mode
                    if (queryData.queryType === 'promql') {
                        tabData.editor.setOption('mode', 'promql');
                    } else {
                        tabData.editor.setOption('mode', 'text/x-sql');
                    }
                }
                
                // Try to set datasource if available
                if (queryData.datasourceName) {
                    // Look for matching datasource in connections
                    const connections = Storage.getSavedConnections();
                    for (const [id, connection] of Object.entries(connections)) {
                        if (connection.name === queryData.datasourceName) {
                            // Found matching datasource - connect to it
                            Connections.connectToSavedConnection(id);
                            break;
                        }
                    }
                }
                
                // Focus the new tab
                this.focusTab(tabId);
                
                // Show a notification
                Utils.showNotification('Query opened in new tab', 'success');
            }
        }, 100);
        
        return tabId;
    },
    
    createNewTab() {
        this.tabCounter++;
        const tabId = `untitled-${this.tabCounter}`;
        
        // Use the selected data source as default for new tabs
        let defaultQueryType = 'influxql';
        let defaultDatasourceId = null;
        let defaultDatasourceName = null;
        let defaultDatasourceType = null;
        
        if (GrafanaConfig.selectedDatasourceUid) {
            defaultDatasourceId = GrafanaConfig.selectedDatasourceUid;
            defaultDatasourceType = GrafanaConfig.selectedDatasourceType;
            defaultQueryType = defaultDatasourceType === 'prometheus' ? 'promql' : 'influxql';
            
            // Find the datasource name
            const selectedDs = GrafanaConfig.datasources.find(ds => ds.uid === defaultDatasourceId);
            if (selectedDs) {
                defaultDatasourceName = selectedDs.name;
            }
        }
        
        // Create tab data
        this.tabs.set(tabId, {
            id: tabId,
            label: `Untitled-${this.tabCounter}`,
            content: '',
            queryType: defaultQueryType,
            saved: false,
            filePath: null,
            datasourceId: defaultDatasourceId,
            datasourceName: defaultDatasourceName,
            datasourceType: defaultDatasourceType
        });

        // Create tab DOM element
        this.createTabElement(tabId);
        this.createTabContent(tabId);
        
        // Switch to new tab
        this.switchTab(tabId);
        
        // Populate datasource dropdown after tab is created and switched
        setTimeout(() => {
            this.populateTabDatasourceSelect(tabId);
        }, 100);
        
        // Return the tab ID for use by other functions
        return tabId;
    },

    createTabElement(tabId) {
        const tabBar = document.getElementById('tabBar');
        const newTabButton = document.querySelector('.new-tab-button');
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.tabId = tabId;
        
        tab.innerHTML = `
            <span class="tab-label">${this.tabs.get(tabId).label}</span>
            <button class="tab-close" onclick="Interface.closeTab('${tabId}')">×</button>
        `;
        
        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                this.switchTab(tabId);
            }
        });
        
        tabBar.insertBefore(tab, newTabButton);
    },

    createTabContent(tabId) {
        console.log('createTabContent called for:', tabId);
        const tabContent = document.querySelector('.tab-content');
        console.log('tabContent element found:', !!tabContent);
        const container = document.createElement('div');
        container.className = 'editor-container';
        container.dataset.tabId = tabId;
        
        container.innerHTML = `
            <div class="editor-toolbar">
                <div class="file-actions">
                    <button class="icon-button" onclick="saveQuery()" title="Save (Cmd/Ctrl+S)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                        </svg>
                    </button>
                </div>
                <div class="editor-options">
                    <div class="option-group">
                        <label>Data Source:</label>
                        <select class="tab-datasource-select" onchange="onTabDatasourceChange()">
                            <option value="">Select data source</option>
                        </select>
                    </div>
                    <div class="option-group">
                        <label>From (hours ago):</label>
                        <input type="number" class="small-input time-from" value="1" min="0" step="0.1">
                    </div>
                    <div class="option-group">
                        <label>To (hours ago):</label>
                        <input type="number" class="small-input time-to" value="0" min="0" step="0.1">
                    </div>
                    <div class="option-group">
                        <label>Interval ($__interval):</label>
                        <select class="small-input tab-interval-select">
                            <option value="15s">15s</option>
                            <option value="30s">30s</option>
                            <option value="1m" selected>1m</option>
                            <option value="5m">5m</option>
                            <option value="15m">15m</option>
                            <option value="30m">30m</option>
                            <option value="1h">1h</option>
                            <option value="6h">6h</option>
                            <option value="12h">12h</option>
                            <option value="1d">1d</option>
                        </select>
                    </div>
                    <div class="option-group">
                        <button class="execute-button" onclick="Interface.executeQuery('${tabId}')" disabled>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            Execute
                        </button>
                    </div>
                </div>
            </div>
            <div class="code-editor-container">
                <textarea placeholder="Enter your query here..." class="query-editor"></textarea>
            </div>
        `;
        
        tabContent.appendChild(container);
        
        // Initialize datasource select
        const datasourceSelect = container.querySelector('.tab-datasource-select');
        if (datasourceSelect) {
            datasourceSelect.addEventListener('change', () => {
                this.setTabDatasource(tabId, datasourceSelect.value);
            });
        }
        
        // Initialize CodeMirror for this tab after DOM is ready
        console.log('About to initialize CodeMirror for tab:', tabId);
        setTimeout(() => {
            console.log('Timeout executed, calling initializeCodeMirror for tab:', tabId);
            this.initializeCodeMirror(tabId);
        }, 50);
    },

    initializeCodeMirror(tabId) {
        const container = document.querySelector(`[data-tab-id="${tabId}"] .code-editor-container`);
        if (!container) {
            console.error('CodeMirror container not found for tab:', tabId);
            return;
        }
        
        const textarea = container.querySelector('textarea');
        if (!textarea) {
            console.error('Textarea not found for tab:', tabId);
            return;
        }
        
        console.log('Initializing CodeMirror for tab:', tabId);
        console.log('Current query type:', GrafanaConfig.currentQueryType);
        console.log('CodeMirror available:', typeof CodeMirror);
        console.log('PromQL mode available:', CodeMirror.modes && CodeMirror.modes.promql);
        
        try {
            let mode = GrafanaConfig.currentQueryType === 'promql' ? 'promql' : 'influxql';
            
            // Fallback to basic modes if custom modes aren't available
            if (mode === 'promql' && (!CodeMirror.modes || !CodeMirror.modes.promql)) {
                console.warn('PromQL mode not available, falling back to text/x-sql');
                mode = 'text/x-sql';
            } else if (mode === 'influxql' && (!CodeMirror.modes || !CodeMirror.modes.influxql)) {
                console.warn('InfluxQL mode not available, falling back to text/x-sql');
                mode = 'text/x-sql';
            }
            console.log('Using mode:', mode);
            
            // Enable linting for InfluxQL mode
            const enableLinting = mode === 'influxql';
            console.log('Enabling linting for mode:', mode, '=', enableLinting);
            
            const editor = CodeMirror.fromTextArea(textarea, {
                mode: mode,
                theme: 'monokai',
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                indentUnit: 2,
                tabSize: 2,
                lineWrapping: true,
                smartIndent: true,
                lint: enableLinting,
                gutters: enableLinting ? ["CodeMirror-linenumbers", "CodeMirror-lint-markers"] : ["CodeMirror-linenumbers"],
                extraKeys: {
                    'Ctrl-Space': 'autocomplete',
                    'Ctrl-Enter': () => this.executeQuery(tabId),
                    'Cmd-Enter': () => this.executeQuery(tabId),
                    'Ctrl-Shift-Enter': () => this.executeAllQueries(tabId),
                    'Cmd-Shift-Enter': () => this.executeAllQueries(tabId),
                    'Tab': function(cm) {
                        if (cm.getMode().name === 'null') {
                            cm.execCommand('insertTab');
                        } else {
                            if (cm.somethingSelected()) {
                                cm.execCommand('indentMore');
                            } else {
                                cm.execCommand('insertSoftTab');
                            }
                        }
                    }
                },
                hintOptions: {
                    completeSingle: false,
                    alignWithWord: true,
                    closeOnUnfocus: false
                }
            });

            // Store editor reference
            const tabData = this.tabs.get(tabId);
            tabData.editor = editor;
            
            // Always set global reference initially, switchTab will update it if needed
            GrafanaConfig.queryEditor = editor;
            console.log('Set global queryEditor for tab:', tabId);
            
            // Listen for changes
            editor.on('change', () => {
                tabData.content = editor.getValue();
                this.markTabUnsaved(tabId);
            });
            
            // Setup autocomplete and validation event handlers
            this.setupEditorEventHandlers(editor, tabId);
            
            
            console.log('CodeMirror successfully initialized for tab:', tabId);
            
        } catch (error) {
            console.error('Failed to initialize CodeMirror for tab:', tabId, error);
        }
    },

    // Setup editor event handlers for autocomplete and validation
    setupEditorEventHandlers(editor, tabId) {
        // Real-time syntax validation
        editor.on('change', function(cm) {
            clearTimeout(cm.validateTimeout);
            cm.validateTimeout = setTimeout(function() {
                // Only validate if we have the validateQuery function available
                if (typeof Editor !== 'undefined' && Editor.validateQuery) {
                    // Temporarily set global editor reference for validation
                    const previousEditor = GrafanaConfig.queryEditor;
                    GrafanaConfig.queryEditor = cm;
                    Editor.validateQuery();
                    GrafanaConfig.queryEditor = previousEditor;
                }
            }, 500);
        });
        
        // Auto-complete on typing
        editor.on('inputRead', function(cm, change) {
            if (!cm.state.completionActive &&
                change.text[0] && change.text[0].match(/[a-zA-Z]/)) {
                CodeMirror.commands.autocomplete(cm, null, {completeSingle: false});
            }
        });
        
        console.log('Editor event handlers set up for tab:', tabId);
    },
    
    ensureCodeMirrorInitialized() {
        console.log('Ensuring CodeMirror is initialized...');
        console.log('Active tab:', this.activeTab);
        console.log('Available tabs:', Array.from(this.tabs.keys()));
        
        if (!this.activeTab) {
            console.log('No active tab, creating initial tab');
            this.createInitialTab();
            return;
        }
        
        const tabData = this.tabs.get(this.activeTab);
        if (!tabData) {
            console.log('No tab data found for active tab');
            return;
        }
        
        if (!tabData.editor) {
            console.log('No editor found for active tab, initializing...');
            this.initializeCodeMirror(this.activeTab);
        } else {
            console.log('Editor already exists for tab:', this.activeTab);
            // Make sure global reference is set
            GrafanaConfig.queryEditor = tabData.editor;
            console.log('Set global queryEditor reference');
        }
    },

    switchTab(tabId) {
        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab-id="${tabId}"]`).classList.add('active');

        // Update active editor container
        document.querySelectorAll('.editor-container').forEach(container => {
            container.classList.remove('active');
        });
        document.querySelector(`[data-tab-id="${tabId}"].editor-container`).classList.add('active');

        this.activeTab = tabId;
        
        // Refresh CodeMirror and set global reference
        const tabData = this.tabs.get(tabId);
        if (tabData && tabData.editor) {
            GrafanaConfig.queryEditor = tabData.editor; // Set global reference
            console.log('Updated global queryEditor for tab:', tabId);
            setTimeout(() => tabData.editor.refresh(), 1);
        }
        
        // Update global query type and title bar indicator
        if (tabData && tabData.queryType) {
            GrafanaConfig.currentQueryType = tabData.queryType;
            // Only show indicator if connected and have a data source
            if (GrafanaConfig.connected && GrafanaConfig.selectedDatasourceUid) {
                this.updateQueryLanguageIndicator(tabData.queryType);
            } else {
                this.updateQueryLanguageIndicator(null);
            }
        } else {
            this.updateQueryLanguageIndicator(null);
        }
        
        // Restore datasource selection for this tab only if connected
        if (GrafanaConfig.connected) {
            this.restoreTabDatasourceSelection(tabId);
        }

        // Update execute button state
        this.updateExecuteButton(tabId);
    },

    closeTab(tabId) {
        const tabData = this.tabs.get(tabId);
        
        // Don't close if it's the last tab
        if (this.tabs.size === 1) {
            this.createNewTab();
        }
        
        // Check if tab has unsaved changes
        if (!tabData.saved && tabData.content.trim()) {
            if (!confirm('This tab has unsaved changes. Close anyway?')) {
                return;
            }
        }
        
        // Remove tab and content
        document.querySelector(`[data-tab-id="${tabId}"].tab`).remove();
        document.querySelector(`[data-tab-id="${tabId}"].editor-container`).remove();
        this.tabs.delete(tabId);
        
        // Switch to another tab if this was active
        if (this.activeTab === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchTab(remainingTabs[0]);
            }
        }
    },

    setQueryType(tabId, type) {
        console.log('Setting query type for tab', tabId, 'to', type);
        
        // Update tab data
        const tabData = this.tabs.get(tabId);
        if (tabData) {
            tabData.queryType = type;
            
            // Update CodeMirror mode and linting
            if (tabData.editor) {
                const mode = type === 'promql' ? 'promql' : 'influxql';
                const enableLinting = mode === 'influxql';
                
                console.log('Updating editor mode to:', mode, 'with linting:', enableLinting);
                tabData.editor.setOption('mode', mode);
                tabData.editor.setOption('lint', enableLinting);
                tabData.editor.setOption('gutters', enableLinting ? 
                    ["CodeMirror-linenumbers", "CodeMirror-lint-markers"] : 
                    ["CodeMirror-linenumbers"]);
                    
                // Refresh editor to apply changes
                tabData.editor.refresh();
            }
            
            // Set global config and update title bar for active tab
            if (tabId === this.activeTab) {
                GrafanaConfig.currentQueryType = type;
                this.updateQueryLanguageIndicator(type);
            }
        }
        
        // Update global query type for compatibility
        GrafanaConfig.currentQueryType = type;
        
        this.updateExecuteButton(tabId);
    },
    
    // Update query language indicator in title bar
    updateQueryLanguageIndicator(language) {
        const titleBarControls = document.querySelector('.title-bar-controls');
        if (!titleBarControls) return;
        
        // Remove existing query language indicator
        const existingIndicator = titleBarControls.querySelector('.query-language-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Only show indicator if we have a valid language and are connected with a data source
        if (language && (language === 'promql' || language === 'influxql') && 
            GrafanaConfig.connected && GrafanaConfig.selectedDatasourceUid) {
            
            const indicator = document.createElement('span');
            indicator.className = 'query-language-indicator';
            indicator.id = 'titleBarQueryLanguage';
            indicator.textContent = language.toUpperCase();
            
            // Append to the end of title bar controls (after all other indicators)
            titleBarControls.appendChild(indicator);
        }
    },
    
    setTabDatasource(tabId, datasourceId) {
        const tabData = this.tabs.get(tabId);
        if (!tabData) return;
        
        // Find datasource details - first try DOM element
        const datasourceItem = document.querySelector(`[data-uid="${datasourceId}"]`);
        if (datasourceItem) {
            tabData.datasourceId = datasourceId;
            tabData.datasourceName = datasourceItem.dataset.name;
            tabData.datasourceType = datasourceItem.dataset.type;
            
            // Auto-detect query type based on datasource
            const queryType = datasourceItem.dataset.type === 'prometheus' ? 'promql' : 'influxql';
            this.setQueryType(tabId, queryType);
        } else if (GrafanaConfig.datasources && GrafanaConfig.datasources.length > 0) {
            // Fallback to GrafanaConfig.datasources if DOM element not found
            const ds = GrafanaConfig.datasources.find(d => d.uid === datasourceId);
            if (ds) {
                tabData.datasourceId = datasourceId;
                tabData.datasourceName = ds.name;
                tabData.datasourceType = ds.type;
                
                // Auto-detect query type based on datasource
                const queryType = ds.type === 'prometheus' ? 'promql' : 'influxql';
                this.setQueryType(tabId, queryType);
            } else {
                tabData.datasourceId = null;
                tabData.datasourceName = null;
                tabData.datasourceType = null;
            }
        } else {
            tabData.datasourceId = null;
            tabData.datasourceName = null;
            tabData.datasourceType = null;
        }
        
        // Update the dropdown UI to show the selected datasource
        const container = document.querySelector(`[data-tab-id="${tabId}"].editor-container`);
        if (container) {
            const datasourceSelect = container.querySelector('.tab-datasource-select');
            if (datasourceSelect) {
                datasourceSelect.value = datasourceId || '';
            }
        }
        
        // Update execute button with a small delay to ensure everything is set
        setTimeout(() => {
            this.updateExecuteButton(tabId);
        }, 50);
    },
    
    restoreTabDatasourceSelection(tabId) {
        const tabData = this.tabs.get(tabId);
        if (!tabData) return;
        
        const container = document.querySelector(`[data-tab-id="${tabId}"].editor-container`);
        if (!container) return;
        
        const datasourceSelect = container.querySelector('.tab-datasource-select');
        if (!datasourceSelect) return;
        
        // Only restore if datasource select has options (datasources are loaded)
        if (datasourceSelect.options.length > 1 && tabData.datasourceId) {
            datasourceSelect.value = tabData.datasourceId;
        }
    },
    
    populateTabDatasourceSelect(tabId) {
        console.log('populateTabDatasourceSelect called for tab:', tabId);
        const container = document.querySelector(`[data-tab-id="${tabId}"].editor-container`);
        if (!container) {
            console.log('No container found for tab:', tabId);
            return;
        }
        
        const datasourceSelect = container.querySelector('.tab-datasource-select');
        if (!datasourceSelect) {
            console.log('No datasource select found for tab:', tabId);
            return;
        }
        
        // Clear existing options
        datasourceSelect.innerHTML = '<option value="">Select data source</option>';
        
        // Add datasources from the datasource list (only from the sidebar)
        const datasourceList = document.getElementById('datasourceList');
        if (datasourceList) {
            const datasourceItems = datasourceList.querySelectorAll('.datasource-item');
            console.log('Found datasource items:', datasourceItems.length);
            datasourceItems.forEach(item => {
                if (item.dataset.uid && item.dataset.name) {
                    const option = document.createElement('option');
                    option.value = item.dataset.uid;
                    option.textContent = item.dataset.name;
                    datasourceSelect.appendChild(option);
                    console.log('Added datasource option:', item.dataset.name);
                }
            });
        }
        
        // After populating, restore the tab's saved selection
        this.restoreTabDatasourceSelection(tabId);
    },
    
    populateAllTabDatasourceSelects() {
        console.log('populateAllTabDatasourceSelects called');
        this.tabs.forEach((_, tabId) => {
            this.populateTabDatasourceSelect(tabId);
            // Restore any saved selection for this tab
            this.restoreTabDatasourceSelection(tabId);
        });
    },

    markTabUnsaved(tabId) {
        const tab = document.querySelector(`[data-tab-id="${tabId}"].tab`);
        const label = tab.querySelector('.tab-label');
        const tabData = this.tabs.get(tabId);
        
        if (!label.textContent.endsWith(' •')) {
            label.textContent += ' •';
            tabData.saved = false;
        }
    },

    markTabSaved(tabId) {
        const tab = document.querySelector(`[data-tab-id="${tabId}"].tab`);
        const label = tab.querySelector('.tab-label');
        const tabData = this.tabs.get(tabId);
        
        if (label.textContent.endsWith(' •')) {
            label.textContent = label.textContent.slice(0, -2);
        }
        tabData.saved = true;
    },

    // Panel Management
    initializePanels() {
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchPanel(tab.dataset.panel);
            });
        });

        document.querySelector('.panel-close').addEventListener('click', () => {
            this.togglePanel();
        });
    },

    switchPanel(panelName) {
        // Update active panel tab
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-panel="${panelName}"]`).classList.add('active');

        // Update active panel content
        document.querySelectorAll('.panel-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${panelName}Panel`).classList.add('active');

        this.activePanel = panelName;
    },

    togglePanel() {
        const panelArea = document.querySelector('.panel-area');
        if (this.panelVisible) {
            panelArea.style.display = 'none';
            this.panelVisible = false;
        } else {
            panelArea.style.display = 'flex';
            this.panelVisible = true;
        }
    },

    // Connection Management
    loadConnections() {
        console.log('Loading connections...');
        const connectionList = document.getElementById('connectionList');
        if (!connectionList) {
            console.error('Connection list element not found');
            // Force create the element if it doesn't exist
            const connectionsPanel = document.getElementById('connectionsPanel');
            if (connectionsPanel) {
                console.log('Creating missing connectionList element');
                const newConnectionList = document.createElement('div');
                newConnectionList.id = 'connectionList';
                newConnectionList.className = 'connection-list';
                connectionsPanel.appendChild(newConnectionList);
                this.loadConnections(); // Retry
            }
            return;
        }
        
        const connections = Storage.getSavedConnections();
        console.log('Found connections:', connections);
        console.log('connectionList element:', connectionList);
        
        // Check if connections is truly empty (handles both {} and null/undefined)
        const hasConnections = connections && typeof connections === 'object' && Object.keys(connections).length > 0;
        
        if (!hasConnections) {
            console.log('No connections found, showing empty state');
            const html = `
                <div class="empty-state" style="padding: 20px; text-align: center; background-color: #2d2d30; margin: 10px; border-radius: 4px; min-height: 100px; display: block; visibility: visible;">
                    <div style="margin-bottom: 16px; color: #cccccc; font-size: 14px;">No connections configured</div>
                    <button class="primary-button" onclick="showNewConnectionDialog()" style="font-size: 13px; padding: 10px 16px; background-color: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                        Add Your First Connection
                    </button>
                </div>
            `;
            connectionList.innerHTML = html;
            connectionList.style.display = 'block';
            connectionList.style.visibility = 'visible';
            connectionList.style.height = 'auto';
            connectionList.style.overflow = 'visible';
            console.log('Set connectionList innerHTML to:', html);
            
            // Also add button to sidebar header as backup
            const sidebarHeader = document.querySelector('#connectionsPanel .sidebar-header');
            if (sidebarHeader && !sidebarHeader.querySelector('.backup-add-btn')) {
                const backupBtn = document.createElement('button');
                backupBtn.className = 'backup-add-btn';
                backupBtn.innerHTML = '+ Add Connection';
                backupBtn.style.cssText = 'background: #007acc; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; margin-left: 10px;';
                backupBtn.onclick = showNewConnectionDialog;
                sidebarHeader.appendChild(backupBtn);
                console.log('Added backup button to header');
            }
            return;
        }
        
        console.log('Has connections, building connection list HTML...');
        
        let html = '';
        for (const [id, connection] of Object.entries(connections)) {
            const isConnected = GrafanaConfig.connectionId === id || GrafanaConfig.currentConnectionId === id;
            const hasProxy = connection.proxy ? ' (via proxy)' : '';
            html += `
                <div class="connection-item ${isConnected ? 'active connected' : ''}" data-connection-id="${id}">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: #cccccc; font-size: 13px;">${Utils.escapeHtml(connection.name)}</div>
                        <div style="font-size: 11px; color: #858585;">${Utils.escapeHtml(connection.url)}${hasProxy}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="icon-button edit-connection-btn" data-connection-id="${id}" title="Edit Connection" style="padding: 2px 4px; font-size: 12px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                        </button>
                        <button class="icon-button delete-connection-btn" data-connection-id="${id}" title="Delete Connection" style="padding: 2px 4px; font-size: 12px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                        <div class="connection-status" id="connection-status-${id}"></div>
                    </div>
                </div>
            `;
        }
        
        connectionList.innerHTML = html;
        
        // Ensure proper styling for connection list
        connectionList.style.cssText = `
            display: block !important;
            visibility: visible !important;
            height: auto !important;
            min-height: 100px !important;
            overflow: visible !important;
            flex: 1 !important;
        `;
        
        console.log('connectionList after styling:', connectionList);
        console.log('connectionList parent:', connectionList.parentElement);
        console.log('connectionList getBoundingClientRect:', connectionList.getBoundingClientRect());
        
        // Force each connection item to be visible and clear any search filters
        connectionList.querySelectorAll('.connection-item').forEach(item => {
            item.style.display = 'flex';
            item.style.visibility = 'visible';
            item.style.opacity = '1';
            item.style.height = 'auto';
        });
        
        // Clear connection search filter when reloading
        const connectionSearch = document.getElementById('connectionSearch');
        if (connectionSearch && connectionSearch.value) {
            // Only clear if we have connections to show
            if (connectionList.querySelectorAll('.connection-item').length > 0) {
                connectionSearch.value = '';
            }
        }
        
        console.log('Set connectionList HTML with', connectionList.querySelectorAll('.connection-item').length, 'connections');
        
        // Remove the backup button if connections exist
        const backupBtn = document.querySelector('.backup-add-btn');
        if (backupBtn) {
            backupBtn.remove();
            console.log('Removed backup button');
        }
        
        // Add click handlers
        connectionList.querySelectorAll('.connection-item').forEach(item => {
            item.addEventListener('click', () => {
                // Don't connect if already connected
                if (!item.classList.contains('connected')) {
                    connectToConnectionWithSpinner(item.dataset.connectionId);
                }
            });
        });
        
        // Add edit button handlers
        connectionList.querySelectorAll('.edit-connection-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                showEditConnectionDialog(btn.dataset.connectionId);
            });
        });
        
        // Add delete button handlers
        connectionList.querySelectorAll('.delete-connection-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                deleteConnection(btn.dataset.connectionId);
            });
        });
        
        // Debug: Check if HTML is still there after a short delay
        setTimeout(() => {
            console.log('After timeout - connectionList contains:', connectionList.innerHTML.length, 'characters');
            console.log('Connection items found:', connectionList.querySelectorAll('.connection-item').length);
        }, 50);
        
        // Also load AI connections
        if (typeof loadAiConnections === 'function') {
            loadAiConnections();
        }
    },

    loadDataSources() {
        console.log('Interface.loadDataSources called');
        const datasourceList = document.getElementById('datasourceList');
        
        if (!GrafanaConfig.connected) {
            console.log('Not connected, showing empty state');
            datasourceList.innerHTML = '<div class="empty-state">Connect to Grafana first</div>';
            return;
        }
        
        // Call the actual data source population function
        if (typeof Connections !== 'undefined' && Connections.populateDatasources) {
            console.log('Calling Connections.populateDatasources');
            Connections.populateDatasources();
        } else {
            console.log('Connections.populateDatasources not available');
            datasourceList.innerHTML = '<div class="empty-state">Loading data sources...</div>';
        }
    },

    // Execute Query
    executeQuery(tabId) {
        console.log('executeQuery called with tabId:', tabId);
        const tabData = this.tabs.get(tabId || this.activeTab);
        console.log('tabData:', tabData);
        if (!tabData || !tabData.editor) {
            console.error('No tab data or editor found');
            return;
        }
        
        // Get the executable query (handles selected text and multiple queries)
        const executableQuery = Editor.getExecutableQuery(tabData.editor);
        if (!executableQuery) {
            this.showToast('Please enter a query', 'error');
            return;
        }
        
        // Show which query is being executed if there are multiple
        const allText = tabData.editor.getValue();
        const allQueries = Editor.splitIntoQueries(allText);
        if (allQueries.length > 1) {
            const selectedText = tabData.editor.getSelection();
            if (selectedText && selectedText.trim()) {
                this.showToast('Executing selected query...', 'info');
            } else {
                const queryIndex = allQueries.findIndex(q => q.trim() === executableQuery) + 1;
                this.showToast(`Executing query ${queryIndex} of ${allQueries.length}... (Use Cmd+Shift+Return to execute all)`, 'info');
            }
        }
        
        // Update global state for compatibility with existing code
        GrafanaConfig.currentQueryType = tabData.queryType;
        
        // Switch to results panel
        this.switchPanel('results');
        
        // Check if we have a datasource selected for this tab
        if (!tabData.datasourceId) {
            this.showToast('Please select a data source for this tab', 'error');
            return;
        }
        
        // Call existing query execution logic
        if (typeof Queries !== 'undefined' && Queries.executeQuery) {
            // Temporarily set the global query editor value to the executable query
            const originalGetQueryValue = Editor.getQueryValue;
            Editor.getQueryValue = () => executableQuery;
            
            // Update global datasource config for query execution and history
            GrafanaConfig.currentDatasourceId = tabData.datasourceId;
            GrafanaConfig.selectedDatasourceType = tabData.datasourceType;
            GrafanaConfig.selectedDatasourceName = tabData.datasourceName;
            
            // Create temporary select element for compatibility with old Queries module
            const tempSelect = document.createElement('select');
            tempSelect.id = 'datasource';
            tempSelect.innerHTML = `<option value="${tabData.datasourceId}" data-type="${tabData.datasourceType}" data-id="${tabData.datasourceId}" selected></option>`;
            
            // Create temporary time inputs
            const tempTimeFrom = document.createElement('input');
            tempTimeFrom.id = 'timeFrom';
            tempTimeFrom.value = document.querySelector(`[data-tab-id="${tabId}"] .time-from`)?.value || '1';
            
            const tempTimeTo = document.createElement('input');
            tempTimeTo.id = 'timeTo';
            tempTimeTo.value = document.querySelector(`[data-tab-id="${tabId}"] .time-to`)?.value || '0';
            
            const tempMaxDataPoints = document.createElement('input');
            tempMaxDataPoints.id = 'maxDataPoints';
            tempMaxDataPoints.value = '1000';
            
            const tempIntervalMs = document.createElement('input');
            tempIntervalMs.id = 'intervalMs';
            tempIntervalMs.value = '15000';
            
            const tempInstantQuery = document.createElement('input');
            tempInstantQuery.id = 'instantQuery';
            tempInstantQuery.type = 'checkbox';
            tempInstantQuery.checked = tabData.queryType === 'promql';
            
            // Temporarily add elements to DOM
            document.body.appendChild(tempSelect);
            document.body.appendChild(tempTimeFrom);
            document.body.appendChild(tempTimeTo);
            document.body.appendChild(tempMaxDataPoints);
            document.body.appendChild(tempIntervalMs);
            document.body.appendChild(tempInstantQuery);
            
            Queries.executeQuery().then(() => {
                // Restore original function and clean up
                Editor.getQueryValue = originalGetQueryValue;
                document.body.removeChild(tempSelect);
                document.body.removeChild(tempTimeFrom);
                document.body.removeChild(tempTimeTo);
                document.body.removeChild(tempMaxDataPoints);
                document.body.removeChild(tempIntervalMs);
                document.body.removeChild(tempInstantQuery);
            }).catch((error) => {
                Editor.getQueryValue = originalGetQueryValue;
                document.body.removeChild(tempSelect);
                document.body.removeChild(tempTimeFrom);
                document.body.removeChild(tempTimeTo);
                document.body.removeChild(tempMaxDataPoints);
                document.body.removeChild(tempIntervalMs);
                document.body.removeChild(tempInstantQuery);
                console.error('Query execution failed:', error);
            });
        }
    },

    // Execute All Queries in sequence
    async executeAllQueries(tabId) {
        console.log('executeAllQueries called with tabId:', tabId);
        const tabData = this.tabs.get(tabId || this.activeTab);
        if (!tabData || !tabData.editor) {
            console.error('No tab data or editor found');
            return;
        }
        
        // Get all executable queries
        const allQueries = Editor.getAllExecutableQueries(tabData.editor);
        if (!allQueries || allQueries.length === 0) {
            this.showToast('No queries to execute', 'error');
            return;
        }
        
        // Check if we have a datasource selected for this tab
        if (!tabData.datasourceId) {
            this.showToast('Please select a data source for this tab', 'error');
            return;
        }
        
        this.showToast(`Executing ${allQueries.length} queries sequentially...`, 'info');
        
        // Update global state for compatibility with existing code
        GrafanaConfig.currentQueryType = tabData.queryType;
        
        // Switch to results panel
        this.switchPanel('results');
        
        // Execute queries one by one
        for (let i = 0; i < allQueries.length; i++) {
            const query = allQueries[i];
            console.log(`Executing query ${i + 1} of ${allQueries.length}:`, query);
            
            try {
                await this.executeSingleQuery(query, tabData, tabId, i + 1, allQueries.length);
                
                // Add a small delay between queries to avoid overwhelming the server
                if (i < allQueries.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`Error executing query ${i + 1}:`, error);
                this.showToast(`Error in query ${i + 1}: ${error.message}`, 'error');
                // Continue with next query instead of stopping
            }
        }
        
        this.showToast(`Completed executing ${allQueries.length} queries`, 'success');
    },

    // Execute a single query (helper method)
    async executeSingleQuery(query, tabData, tabId, queryIndex, totalQueries) {
        return new Promise((resolve, reject) => {
            // Call existing query execution logic
            if (typeof Queries !== 'undefined' && Queries.executeQuery) {
                // Temporarily set the global query editor value to the current query
                const originalGetQueryValue = Editor.getQueryValue;
                Editor.getQueryValue = () => query;
                
                // Create temporary DOM elements for compatibility
                const tempSelect = document.createElement('select');
                tempSelect.id = 'datasource';
                tempSelect.innerHTML = `<option value="${tabData.datasourceId}" data-type="${tabData.datasourceType}" data-id="${tabData.datasourceId}" selected></option>`;
                
                const tempTimeFrom = document.createElement('input');
                tempTimeFrom.id = 'timeFrom';
                tempTimeFrom.value = document.querySelector(`[data-tab-id="${tabId}"] .time-from`)?.value || '1';
                
                const tempTimeTo = document.createElement('input');
                tempTimeTo.id = 'timeTo';
                tempTimeTo.value = document.querySelector(`[data-tab-id="${tabId}"] .time-to`)?.value || '0';
                
                const tempMaxDataPoints = document.createElement('input');
                tempMaxDataPoints.id = 'maxDataPoints';
                tempMaxDataPoints.value = '1000';
                
                const tempIntervalMs = document.createElement('input');
                tempIntervalMs.id = 'intervalMs';
                tempIntervalMs.value = '15000';
                
                const tempInstantQuery = document.createElement('input');
                tempInstantQuery.id = 'instantQuery';
                tempInstantQuery.type = 'checkbox';
                tempInstantQuery.checked = tabData.queryType === 'promql';
                
                // Temporarily add elements to DOM
                document.body.appendChild(tempSelect);
                document.body.appendChild(tempTimeFrom);
                document.body.appendChild(tempTimeTo);
                document.body.appendChild(tempMaxDataPoints);
                document.body.appendChild(tempIntervalMs);
                document.body.appendChild(tempInstantQuery);
                
                // Show progress
                this.showToast(`Executing query ${queryIndex} of ${totalQueries}...`, 'info');
                
                Queries.executeQuery().then(() => {
                    // Clean up and restore
                    Editor.getQueryValue = originalGetQueryValue;
                    document.body.removeChild(tempSelect);
                    document.body.removeChild(tempTimeFrom);
                    document.body.removeChild(tempTimeTo);
                    document.body.removeChild(tempMaxDataPoints);
                    document.body.removeChild(tempIntervalMs);
                    document.body.removeChild(tempInstantQuery);
                    resolve();
                }).catch((error) => {
                    // Clean up and restore on error
                    Editor.getQueryValue = originalGetQueryValue;
                    document.body.removeChild(tempSelect);
                    document.body.removeChild(tempTimeFrom);
                    document.body.removeChild(tempTimeTo);
                    document.body.removeChild(tempMaxDataPoints);
                    document.body.removeChild(tempIntervalMs);
                    document.body.removeChild(tempInstantQuery);
                    reject(error);
                });
            } else {
                reject(new Error('Queries module not available'));
            }
        });
    },

    updateExecuteButton(tabId) {
        console.log('updateExecuteButton called with tabId:', tabId);
        // Update per-tab execute button in new interface
        if (tabId) {
            const tabContainer = document.querySelector(`[data-tab-id="${tabId}"].editor-container`);
            const tabData = this.tabs.get(tabId);
            console.log('updateExecuteButton - tabContainer found:', !!tabContainer, 'tabData found:', !!tabData);
            if (tabContainer && tabData) {
                const executeBtn = tabContainer.querySelector('.execute-button');
                console.log('updateExecuteButton - executeBtn found:', !!executeBtn);
                console.log('updateExecuteButton - tabContainer innerHTML length:', tabContainer.innerHTML.length);
                console.log('updateExecuteButton - tabContainer has execute-button class:', tabContainer.innerHTML.includes('execute-button'));
                if (executeBtn) {
                    console.log('updateExecuteButton for tab:', tabId, 'connected:', GrafanaConfig.connected, 'datasourceId:', tabData.datasourceId);
                    if (GrafanaConfig.connected && tabData.datasourceId) {
                        executeBtn.disabled = false;
                        console.log('Execute button enabled for tab:', tabId);
                    } else {
                        executeBtn.disabled = true;
                        console.log('Execute button disabled for tab:', tabId);
                    }
                } else {
                    console.log('updateExecuteButton - no execute button found for tab:', tabId);
                }
            } else {
                console.log('updateExecuteButton - missing tabContainer or tabData for tab:', tabId);
            }
        } else {
            console.log('updateExecuteButton - no tabId provided');
        }
        
        // Also update global execute button for backward compatibility
        const globalExecuteBtn = document.getElementById('executeBtn');
        if (globalExecuteBtn) {
            if (GrafanaConfig.connected && (GrafanaConfig.selectedDatasourceId || GrafanaConfig.selectedDatasourceUid)) {
                globalExecuteBtn.disabled = false;
            } else {
                globalExecuteBtn.disabled = true;
            }
        }
    },

    // Helper methods
    showToast(message, type = 'info') {
        const toast = document.getElementById('authStatus');
        toast.textContent = message;
        toast.className = `auth-status-toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    // Keyboard shortcuts
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey)) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.createNewTab();
                        break;
                    case 'w':
                        e.preventDefault();
                        this.closeTab(this.activeTab);
                        break;
                    case 't':
                        e.preventDefault();
                        this.createNewTab();
                        break;
                    case 's':
                        e.preventDefault();
                        console.log('Keyboard shortcut Ctrl/Cmd+S detected, shiftKey:', e.shiftKey);
                        console.log('FileExplorer available:', typeof FileExplorer !== 'undefined');
                        
                        if (e.shiftKey) {
                            // Cmd/Ctrl+Shift+S for Save As
                            console.log('Calling FileExplorer.saveAsCurrentTab()');
                            if (typeof FileExplorer !== 'undefined') {
                                FileExplorer.saveAsCurrentTab();
                            } else {
                                console.error('FileExplorer not available for Save As');
                            }
                        } else {
                            // Cmd/Ctrl+S for Save
                            console.log('Calling FileExplorer.saveCurrentTab()');
                            if (typeof FileExplorer !== 'undefined') {
                                FileExplorer.saveCurrentTab();
                            } else {
                                console.error('FileExplorer not available for Save');
                            }
                        }
                        break;
                    case 'Enter':
                        if (e.shiftKey) {
                            // Cmd/Ctrl+Shift+Enter for Execute All Queries
                            e.preventDefault();
                            console.log('Keyboard shortcut Ctrl/Cmd+Shift+Enter detected');
                            this.executeAllQueries(this.activeTab);
                        }
                        // Note: Regular Cmd+Enter is handled by CodeMirror extraKeys
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                    case '5':
                        e.preventDefault();
                        const views = ['connections', 'explorer', 'dashboards', 'files', 'history'];
                        const viewIndex = parseInt(e.key) - 1;
                        if (views[viewIndex]) {
                            this.switchSidebarView(views[viewIndex]);
                        }
                        break;
                }
            }
        });
    },

    // Schema explorer implementation
    refreshSchemaExplorer() {
        const container = document.getElementById('schemaContainer');
        
        console.log('refreshSchemaExplorer called with:', {
            connected: GrafanaConfig.connected,
            selectedDatasourceUid: GrafanaConfig.currentDatasourceId,
            selectedDatasourceType: GrafanaConfig.selectedDatasourceType
        });
        
        if (!GrafanaConfig.connected) {
            container.innerHTML = '<div class="empty-state">Connect to Grafana first</div>';
            return;
        }
        
        if (!GrafanaConfig.currentDatasourceId) {
            container.innerHTML = '<div class="empty-state">Select a data source to explore schema</div>';
            return;
        }
        
        // Show loading state
        container.innerHTML = '<div class="schema-loading">Loading schema...</div>';
        
        // Update Schema module with current datasource info
        Schema.currentDatasourceType = GrafanaConfig.selectedDatasourceType;
        Schema.currentDatasourceId = GrafanaConfig.selectedDatasourceUid; // Use UID, not numeric ID
        
        console.log('Refreshing schema for:', {
            type: Schema.currentDatasourceType,
            uid: Schema.currentDatasourceId
        });
        
        // Load and render schema
        Schema.loadSchemaIfNeeded();
    },
    
    populateSchemaDatasourceSelect() {
        const select = document.getElementById('schemaDatasourceSelect');
        if (!select) return;
        
        // Clear current options
        select.innerHTML = '<option value="">Select a data source</option>';
        
        // Get datasource items from the connections panel
        const datasourceItems = document.querySelectorAll('.datasource-item');
        
        datasourceItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.dataset.uid;
            option.textContent = item.dataset.name || item.querySelector('div[style*="font-weight: 500"]')?.textContent || 'Unknown';
            option.dataset.type = item.dataset.type; // Add the data-type attribute
            
            // Select current datasource if it matches (use selectedDatasourceUid as the default)
            if (item.dataset.uid === GrafanaConfig.currentDatasourceId || 
                item.dataset.uid === GrafanaConfig.selectedDatasourceUid) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        // If no datasources but we're connected, we might need to load them
        if (datasourceItems.length === 0 && GrafanaConfig.connected) {
            this.loadDataSourcesForSchema();
        }
    },
    
    async loadDataSourcesForSchema() {
        if (!GrafanaConfig.connected) return;
        
        try {
            const response = await API.makeApiRequest('/api/datasources', {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const datasources = await response.json();
            const select = document.getElementById('schemaDatasourceSelect');
            if (!select) return;
            
            datasources.forEach(ds => {
                const option = document.createElement('option');
                option.value = ds.uid;
                option.textContent = ds.name;
                option.dataset.type = ds.type; // Add the data-type attribute
                
                if (ds.uid === GrafanaConfig.currentDatasourceId) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });
            
        } catch (error) {
            console.error('Error loading data sources for schema:', error);
        }
    },

    refreshDashboards() {
        console.log('Interface.refreshDashboards called');
        console.log('Dashboard available:', typeof Dashboard !== 'undefined');
        console.log('Dashboard object:', Dashboard);
        
        // Initialize dashboard module if needed
        if (typeof Dashboard !== 'undefined' && Dashboard) {
            console.log('Initializing Dashboard module...');
            Dashboard.initialize();
        } else {
            console.error('Dashboard module not available');
            console.log('Window.Dashboard:', window.Dashboard);
            console.log('Global Dashboard:', globalThis.Dashboard);
            
            // Try to initialize Dashboard after a short delay in case it's a timing issue
            setTimeout(() => {
                console.log('Checking Dashboard availability after delay...');
                if (typeof Dashboard !== 'undefined' && Dashboard) {
                    console.log('Dashboard module found after delay, initializing...');
                    Dashboard.initialize();
                } else {
                    console.error('Dashboard module still not available after delay');
                    // Try to access it through window object
                    if (window.Dashboard) {
                        console.log('Found Dashboard on window object, initializing...');
                        window.Dashboard.initialize();
                    }
                }
            }, 100);
        }
    },
    
    handleDashboardSearch(event) {
        console.log('handleDashboardSearch called');
        if (typeof searchDashboards === 'function') {
            searchDashboards();
        } else {
            console.error('searchDashboards function not available');
        }
    },

    loadHistory() {
        console.log('Interface.loadHistory called');
        // Initialize and load history
        if (typeof History !== 'undefined') {
            if (!History.initialized) {
                console.log('Initializing History module');
                History.initialize();
                History.initialized = true;
            }
            History.loadHistory();
        } else {
            console.error('History module not available');
        }
    },
    
    loadFileExplorer() {
        console.log('Interface.loadFileExplorer called');
        if (typeof FileExplorer !== 'undefined') {
            FileExplorer.initialize();
        } else {
            console.error('FileExplorer module not available');
        }
    },

    loadAnalytics() {
        console.log('Interface.loadAnalytics called');
        if (typeof Analytics !== 'undefined') {
            Analytics.initialize();
        } else {
            console.error('Analytics module not available');
        }
        
        // Load AI connections when analytics panel is opened
        if (typeof loadAiConnections === 'function') {
            loadAiConnections();
        }
    },

    // Initialize resizers for sidebar and panel
    initializeResizers() {
        this.initializeSidebarResizer();
        this.initializePanelResizer();
    },

    initializeSidebarResizer() {
        const resizer = document.querySelector('.sidebar-resizer');
        const sidebar = document.querySelector('.sidebar');
        
        if (!resizer || !sidebar) return;

        let isDragging = false;
        let startX = 0;
        let startWidth = 0;

        resizer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(sidebar).width, 10);
            
            document.body.classList.add('resizing');
            resizer.classList.add('dragging');
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const width = startWidth + e.clientX - startX;
            const minWidth = 200;
            const maxWidth = 600;
            
            if (width >= minWidth && width <= maxWidth) {
                sidebar.style.width = width + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.classList.remove('resizing');
                resizer.classList.remove('dragging');
                
                // Refresh CodeMirror editors after resize
                setTimeout(() => {
                    const activeTab = this.tabs.get(this.activeTab);
                    if (activeTab && activeTab.editor) {
                        activeTab.editor.refresh();
                    }
                }, 100);
            }
        });
    },

    initializePanelResizer() {
        const resizer = document.querySelector('.panel-resizer');
        const panel = document.querySelector('.panel-area');
        
        if (!resizer || !panel) return;

        let isDragging = false;
        let startY = 0;
        let startHeight = 0;

        resizer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startHeight = parseInt(document.defaultView.getComputedStyle(panel).height, 10);
            
            document.body.classList.add('resizing');
            resizer.classList.add('dragging');
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const height = startHeight - (e.clientY - startY);
            const minHeight = 150;
            const maxHeight = (window.innerHeight - 35) * 0.9; // 90% of available height (minus title bar)
            
            if (height >= minHeight && height <= maxHeight) {
                panel.style.height = height + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.classList.remove('resizing');
                resizer.classList.remove('dragging');
                
                // Refresh CodeMirror editors after resize
                setTimeout(() => {
                    const activeTab = this.tabs.get(this.activeTab);
                    if (activeTab && activeTab.editor) {
                        activeTab.editor.refresh();
                    }
                }, 100);
            }
        });
    },

    connectToConnection(connectionId) {
        // Connection logic - integrate with existing Connections module
        if (typeof Connections !== 'undefined' && Connections.connectWithStoredConnection) {
            Connections.connectWithStoredConnection(connectionId);
        }
    },

    // Handle connection form submission with proper authentication flow
    async handleConnectionSave(name, url, username, password, proxyConfig = null, editingConnectionId = null) {
        if (!name || !url || !username || !password) {
            this.showToast('Please fill in all fields', 'error');
            return false;
        }

        try {
            // Create connection object
            const connection = {
                id: editingConnectionId || Date.now().toString(),
                name: name,
                url: url,
                username: username,
                proxy: proxyConfig
            };

            // Save to storage (without password)
            Storage.saveConnectionToStorage(connection);

            // Try to connect immediately
            const success = await this.attemptConnection(connection, password);
            
            if (success) {
                this.loadConnections();
                this.showToast(`Connected to ${name}`, 'success');
                return true;
            } else {
                this.showToast('Connection saved but authentication failed. Try connecting manually.', 'info');
                this.loadConnections();
                return true;
            }
        } catch (error) {
            this.showToast('Failed to save connection: ' + error.message, 'error');
            return false;
        }
    },

    async attemptConnection(connection, password) {
        try {
            // Use existing Connections module for authentication
            if (typeof Connections !== 'undefined' && Connections.connectToGrafana) {
                await Connections.connectToGrafana(connection.url, connection.username, password, connection.id);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Connection attempt failed:', error);
            return false;
        }
    }
};

// Proxy fields toggle
function toggleProxyFields() {
    const enableProxy = document.getElementById('enableProxy');
    const proxyFields = document.getElementById('proxyFields');
    
    if (enableProxy.checked) {
        proxyFields.style.display = 'block';
    } else {
        proxyFields.style.display = 'none';
        // Clear proxy fields when disabled
        document.getElementById('proxyHost').value = '';
        document.getElementById('proxyPort').value = '';
        document.getElementById('proxyUsername').value = '';
        document.getElementById('proxyPassword').value = '';
    }
}

// Dialog management
function showNewConnectionDialog() {
    console.log('Showing new connection dialog...');
    const dialog = document.getElementById('connectionDialog');
    if (dialog) {
        // Clear form for new connection
        document.getElementById('connectionDialogTitle').textContent = 'New Connection';
        hideConnectionDialog(); // This clears all fields
        dialog.classList.add('active');
        console.log('Dialog shown');
    } else {
        console.error('Connection dialog not found');
        Interface.showToast('Connection dialog not found', 'error');
    }
}

function showEditConnectionDialog(connectionId) {
    console.log('Showing edit connection dialog for:', connectionId);
    const dialog = document.getElementById('connectionDialog');
    if (!dialog) {
        console.error('Connection dialog not found');
        Interface.showToast('Connection dialog not found', 'error');
        return;
    }
    
    const connections = Storage.getSavedConnections();
    const connection = connections[connectionId];
    
    if (!connection) {
        console.error('Connection not found:', connectionId);
        Interface.showToast('Connection not found', 'error');
        return;
    }
    
    // Set dialog title
    document.getElementById('connectionDialogTitle').textContent = 'Edit Connection';
    
    // Populate form fields
    document.getElementById('connectionName').value = connection.name;
    document.getElementById('connectionUrl').value = connection.url;
    document.getElementById('connectionUsername').value = connection.username;
    document.getElementById('connectionPassword').value = ''; // Never prefill password
    
    // Populate proxy fields if proxy is configured
    if (connection.proxy) {
        document.getElementById('enableProxy').checked = true;
        document.getElementById('proxyHost').value = connection.proxy.host;
        document.getElementById('proxyPort').value = connection.proxy.port;
        document.getElementById('proxyUsername').value = connection.proxy.username || '';
        document.getElementById('proxyPassword').value = ''; // Never prefill proxy password
        document.getElementById('proxyFields').style.display = 'block';
    } else {
        document.getElementById('enableProxy').checked = false;
        document.getElementById('proxyFields').style.display = 'none';
    }
    
    // Store connection ID for editing
    dialog.dataset.editingConnectionId = connectionId;
    
    dialog.classList.add('active');
    console.log('Edit dialog shown');
}

function hideConnectionDialog() {
    const dialog = document.getElementById('connectionDialog');
    dialog.classList.remove('active');
    
    // Clear form
    document.getElementById('connectionName').value = '';
    document.getElementById('connectionUrl').value = '';
    document.getElementById('connectionUsername').value = '';
    document.getElementById('connectionPassword').value = '';
    
    // Clear proxy fields
    document.getElementById('enableProxy').checked = false;
    document.getElementById('proxyHost').value = '';
    document.getElementById('proxyPort').value = '';
    document.getElementById('proxyUsername').value = '';
    document.getElementById('proxyPassword').value = '';
    document.getElementById('proxyFields').style.display = 'none';
    
    // Clear editing ID
    delete dialog.dataset.editingConnectionId;
}

async function saveConnection() {
    const name = document.getElementById('connectionName').value.trim();
    const url = document.getElementById('connectionUrl').value.trim();
    const username = document.getElementById('connectionUsername').value.trim();
    const password = document.getElementById('connectionPassword').value;
    
    // Get proxy data
    const enableProxy = document.getElementById('enableProxy').checked;
    let proxyConfig = null;
    
    if (enableProxy) {
        const proxyHost = document.getElementById('proxyHost').value.trim();
        const proxyPort = document.getElementById('proxyPort').value.trim();
        const proxyUsername = document.getElementById('proxyUsername').value.trim();
        const proxyPassword = document.getElementById('proxyPassword').value;
        
        if (!proxyHost || !proxyPort) {
            Interface.showToast('Please provide proxy host and port', 'error');
            return;
        }
        
        proxyConfig = {
            host: proxyHost,
            port: parseInt(proxyPort),
            username: proxyUsername || null,
            password: proxyPassword || null
        };
    }
    
    // Check if we're editing an existing connection
    const dialog = document.getElementById('connectionDialog');
    const editingConnectionId = dialog.dataset.editingConnectionId;
    
    const success = await Interface.handleConnectionSave(name, url, username, password, proxyConfig, editingConnectionId);
    
    if (success) {
        hideConnectionDialog();
    }
}

// AI Connection Management Functions
function showNewAiConnectionDialog() {
    document.getElementById('aiConnectionDialogTitle').textContent = 'New AI Connection';
    document.getElementById('aiConnectionName').value = '';
    document.getElementById('aiProvider').value = 'ollama';
    document.getElementById('aiEndpoint').value = 'http://localhost:11434';
    document.getElementById('aiApiKey').value = '';
    document.getElementById('aiEndpointGroup').style.display = 'block';
    document.getElementById('aiApiKeyGroup').style.display = 'none';
    document.getElementById('advancedSettingsToggle').style.display = 'block';
    // Set default model options without connecting
    const modelSelect = document.getElementById('aiModel');
    modelSelect.innerHTML = `
        <option value="llama3.1:8b-instruct-q4_K_M">llama3.1:8b-instruct-q4_K_M (Default)</option>
        <option value="llama3:8b">llama3:8b</option>
        <option value="llama3:70b">llama3:70b</option>
        <option value="mistral">mistral</option>
        <option value="codellama">codellama</option>
        <option value="custom">Custom Model</option>
    `;
    modelSelect.value = 'llama3.1:8b-instruct-q4_K_M';
    document.getElementById('customModelName').value = '';
    document.getElementById('aiResponseTokens').value = '-1';
    document.getElementById('aiContextSize').value = '16384';
    document.getElementById('showAdvancedAiSettings').checked = false;
    document.getElementById('advancedAiSettings').style.display = 'none';
    document.getElementById('customModelGroup').style.display = 'none';
    
    // Clear any editing state
    window.editingAiConnectionId = null;
    
    // Load available models for default provider (only if not erroring)
    // Don't auto-load models to avoid connection errors
    // User can click refresh or change provider to load models
    
    document.getElementById('aiConnectionDialog').style.display = 'flex';
}

function onAiProviderChange() {
    const provider = document.getElementById('aiProvider').value;
    const endpointGroup = document.getElementById('aiEndpointGroup');
    const apiKeyGroup = document.getElementById('aiApiKeyGroup');
    const modelSelect = document.getElementById('aiModel');
    const advancedSettingsToggle = document.getElementById('advancedSettingsToggle');
    const advancedSettings = document.getElementById('advancedAiSettings');
    const showAdvancedCheckbox = document.getElementById('showAdvancedAiSettings');
    
    if (provider === 'ollama') {
        endpointGroup.style.display = 'block';
        apiKeyGroup.style.display = 'none';
        advancedSettingsToggle.style.display = 'block';
        document.getElementById('aiConnectionName').placeholder = 'My Ollama Server';
        // Load Ollama models
        loadAvailableModels();
    } else if (provider === 'openai') {
        endpointGroup.style.display = 'none';
        apiKeyGroup.style.display = 'block';
        advancedSettingsToggle.style.display = 'none';
        advancedSettings.style.display = 'none';
        showAdvancedCheckbox.checked = false;
        document.getElementById('aiConnectionName').placeholder = 'My OpenAI Connection';
        // Clear models and show placeholder
        modelSelect.innerHTML = '<option value="">Enter API key to load models</option>';
        // Load models if API key is already present
        const apiKey = document.getElementById('aiApiKey').value;
        if (apiKey) {
            loadOpenAIModels(apiKey);
        }
    }
}

function hideAiConnectionDialog() {
    document.getElementById('aiConnectionDialog').style.display = 'none';
    window.editingAiConnectionId = null;
}

function toggleAdvancedAiSettings() {
    const checkbox = document.getElementById('showAdvancedAiSettings');
    const advancedSettings = document.getElementById('advancedAiSettings');
    advancedSettings.style.display = checkbox.checked ? 'block' : 'none';
}

async function loadAvailableModels() {
    const provider = document.getElementById('aiProvider').value;
    const modelSelect = document.getElementById('aiModel');
    const endpoint = document.getElementById('aiEndpoint').value;
    
    if (provider === 'ollama' && endpoint) {
        try {
            modelSelect.innerHTML = '<option value="">Loading models...</option>';
            
            // Fetch models from Ollama
            const response = await fetch(`${endpoint}/api/tags`);
            if (response.ok) {
                const data = await response.json();
                const models = data.models || [];
                
                modelSelect.innerHTML = models.map(model => 
                    `<option value="${model.name}">${model.name}</option>`
                ).join('');
                
                // Add custom model option
                modelSelect.innerHTML += '<option value="custom">Custom Model</option>';
                
                // Set default model if available
                if (models.some(m => m.name === 'llama3.1:8b-instruct-q4_K_M')) {
                    modelSelect.value = 'llama3.1:8b-instruct-q4_K_M';
                } else if (models.length > 0) {
                    modelSelect.value = models[0].name;
                }
            } else {
                modelSelect.innerHTML = '<option value="custom">Custom Model (Ollama offline)</option>';
                modelSelect.value = 'custom';
                document.getElementById('customModelGroup').style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load Ollama models:', error);
            modelSelect.innerHTML = '<option value="custom">Custom Model (Connection failed)</option>';
            modelSelect.value = 'custom';
            document.getElementById('customModelGroup').style.display = 'block';
        }
    }
    // OpenAI models are already set in onAiProviderChange
}

function onModelSelectionChange() {
    const modelSelect = document.getElementById('aiModel');
    const customModelGroup = document.getElementById('customModelGroup');
    
    if (modelSelect.value === 'custom') {
        customModelGroup.style.display = 'block';
    } else {
        customModelGroup.style.display = 'none';
    }
}

function onEndpointChange() {
    const provider = document.getElementById('aiProvider').value;
    if (provider === 'ollama') {
        loadAvailableModels();
    }
}

function onOpenAIApiKeyChange() {
    const apiKey = document.getElementById('aiApiKey').value.trim();
    if (apiKey) {
        loadOpenAIModels(apiKey);
    }
}

async function loadOpenAIModels(apiKey) {
    const modelSelect = document.getElementById('aiModel');
    
    try {
        modelSelect.innerHTML = '<option value="">Loading models...</option>';
        
        // Initialize a temporary OpenAI service instance to fetch models
        const tempService = Object.create(OpenAIService);
        tempService.config = { ...OpenAIService.config, apiKey: apiKey };
        
        const models = await tempService.getAvailableModels();
        
        if (models.length > 0) {
            // Sort models by name, prioritizing newer models
            const sortedModels = models.sort((a, b) => {
                // Prioritize GPT-4 models
                if (a.name.includes('gpt-4') && !b.name.includes('gpt-4')) return -1;
                if (!a.name.includes('gpt-4') && b.name.includes('gpt-4')) return 1;
                // Then sort alphabetically
                return b.name.localeCompare(a.name);
            });
            
            modelSelect.innerHTML = sortedModels.map(model => 
                `<option value="${model.name}">${model.name}</option>`
            ).join('');
            
            // Add custom model option
            modelSelect.innerHTML += '<option value="custom">Custom Model</option>';
            
            // Select a default model
            if (sortedModels.some(m => m.name === 'gpt-4-turbo-preview')) {
                modelSelect.value = 'gpt-4-turbo-preview';
            } else if (sortedModels.some(m => m.name === 'gpt-4')) {
                modelSelect.value = 'gpt-4';
            } else if (sortedModels.length > 0) {
                modelSelect.value = sortedModels[0].name;
            }
        } else {
            modelSelect.innerHTML = '<option value="">No models available</option>';
            modelSelect.innerHTML += '<option value="custom">Custom Model</option>';
        }
    } catch (error) {
        console.error('Failed to load OpenAI models:', error);
        modelSelect.innerHTML = '<option value="">Failed to load models (check API key)</option>';
        modelSelect.innerHTML += '<option value="custom">Custom Model</option>';
        modelSelect.value = 'custom';
        document.getElementById('customModelGroup').style.display = 'block';
    }
}

async function saveAiConnection() {
    const name = document.getElementById('aiConnectionName').value.trim();
    const provider = document.getElementById('aiProvider').value;
    const endpoint = document.getElementById('aiEndpoint').value.trim();
    const apiKey = document.getElementById('aiApiKey').value.trim();
    const model = document.getElementById('aiModel').value;
    const customModel = document.getElementById('customModelName').value.trim();
    const responseTokens = document.getElementById('aiResponseTokens').value;
    const contextSize = document.getElementById('aiContextSize').value;
    
    if (!name) {
        alert('Please provide a connection name');
        return;
    }
    
    if (provider === 'ollama' && !endpoint) {
        alert('Please provide the Ollama endpoint');
        return;
    }
    
    if (provider === 'openai' && !apiKey) {
        alert('Please provide your OpenAI API key');
        return;
    }
    
    const aiConnection = {
        id: window.editingAiConnectionId || Date.now().toString(),
        name: name,
        provider: provider || 'ollama', // Default to ollama for backwards compatibility
        endpoint: provider === 'ollama' ? endpoint : 'https://api.openai.com/v1',
        apiKey: provider === 'openai' ? apiKey : undefined,
        model: model === 'custom' ? customModel : model,
        status: 'disconnected',
        createdAt: new Date().toISOString()
    };
    
    // Only add Ollama-specific settings if provider is Ollama
    if (provider === 'ollama') {
        aiConnection.responseTokens = parseInt(responseTokens);
        aiConnection.contextSize = parseInt(contextSize);
    }
    
    // Save to storage using centralized cache
    let aiConnections = Storage.getAiConnections();
    
    if (window.editingAiConnectionId) {
        // Update existing
        const index = aiConnections.findIndex(conn => conn.id === window.editingAiConnectionId);
        if (index !== -1) {
            aiConnections[index] = aiConnection;
        }
    } else {
        // Add new
        aiConnections.push(aiConnection);
    }
    
    Storage.setAiConnections(aiConnections);
    
    // Show testing feedback
    const saveButton = document.querySelector('#aiConnectionDialog .primary-button');
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Testing Connection...';
    saveButton.disabled = true;
    
    // Test connection
    const success = await testAiConnectionInDialog(aiConnection);
    
    // Restore button state
    saveButton.textContent = originalText;
    saveButton.disabled = false;
    
    if (success) {
        // Update the connection status and disconnect others
        let updatedConnections = Storage.getAiConnections();
        
        // Disconnect all other connections
        updatedConnections = updatedConnections.map(conn => {
            if (conn.id !== aiConnection.id && conn.status === 'connected') {
                console.log(`🔌 Disconnecting from ${conn.name}`);
                // Disconnect the appropriate service
                if (conn.provider === 'openai') {
                    OpenAIService.disconnect();
                } else {
                    OllamaService.disconnect();
                }
                return { ...conn, status: 'disconnected' };
            }
            return conn;
        });
        
        // Set the new connection as connected
        const connectionIndex = updatedConnections.findIndex(conn => conn.id === aiConnection.id);
        if (connectionIndex !== -1) {
            updatedConnections[connectionIndex].status = 'connected';
            Storage.setAiConnections(updatedConnections);
            // Set as active connection
            Storage.set('ACTIVE_AI_CONNECTION', aiConnection.id);
        }
        
        hideAiConnectionDialog();
        loadAiConnections();
        
        // Update title bar status
        if (window.Analytics && typeof window.Analytics.updateTitleBarStatus === 'function') {
            window.Analytics.updateTitleBarStatus();
        }
    }
}

async function testAiConnectionInDialog(connection) {
    try {
        if (connection.provider === 'openai') {
            await OpenAIService.initialize(connection.apiKey, connection.model);
        } else {
            // Default to Ollama for backwards compatibility
            await OllamaService.initialize(connection.endpoint, connection.model);
        }
        return true;
    } catch (error) {
        alert(`Connection failed: ${error.message}`);
        return false;
    }
}

function loadAiConnections() {
    let aiConnections = Storage.getAiConnections();
    const connectionList = document.getElementById('aiConnectionList');
    const activeConnectionId = Storage.get('ACTIVE_AI_CONNECTION');
    
    if (!connectionList) {
        console.error('AI connection list element not found');
        return;
    }
    
    // Clean up connection states - check actual AI service status
    let hasChanges = false;
    // Check if any AI service is actually connected
    const isAnalyticsConnected = window.Analytics && Analytics.isConnected;
    const isOllamaConnected = window.OllamaService && window.OllamaService.isConnected;
    const isOpenAIConnected = window.OpenAIService && window.OpenAIService.isConnected;
    const isAiActuallyConnected = isAnalyticsConnected || isOllamaConnected || isOpenAIConnected;
    
    console.log('🔍 AI Service Status Check:', {
        analytics: isAnalyticsConnected,
        ollama: isOllamaConnected,
        openai: isOpenAIConnected,
        anyConnected: isAiActuallyConnected
    });
    
    aiConnections = aiConnections.map(conn => {
        // If this is the active connection, check if AI is actually connected
        if (conn.id === activeConnectionId) {
            // Only update status if there's a significant state change
            // Don't immediately disconnect after connection
            if (conn.status === 'connected' && !isAiActuallyConnected) {
                // Only mark as disconnected if we're sure the service is down
                // Add a delay to prevent immediate disconnection after connection
                const shouldDisconnect = !isAiActuallyConnected;
                if (shouldDisconnect) {
                    console.log(`🔧 UI: AI service disconnected, updating status for ${conn.name}`);
                    hasChanges = true;
                    return { ...conn, status: 'disconnected' };
                }
            } else if (conn.status === 'disconnected' && isAiActuallyConnected) {
                console.log(`🔧 UI: AI service connected, updating status for ${conn.name}`);
                hasChanges = true;
                return { ...conn, status: 'connected' };
            }
            return conn;
        }
        
        // For non-active connections, ensure they're marked as disconnected
        if (conn.status === 'connected') {
            console.log(`🔧 UI: Cleaning up stale connected status for ${conn.name} (not active)`);
            hasChanges = true;
            return { ...conn, status: 'disconnected' };
        }
        return conn;
    });
    
    if (hasChanges) {
        Storage.setAiConnections(aiConnections);
    }
    
    if (aiConnections.length === 0) {
        connectionList.innerHTML = `
            <div class="empty-state">
                <div style="margin-bottom: 12px; color: #858585;">No AI connections configured</div>
                <button class="primary-button" onclick="showNewAiConnectionDialog()" style="font-size: 12px; padding: 6px 12px;">
                    Add First AI Connection
                </button>
            </div>
        `;
        return;
    }
    
    connectionList.innerHTML = aiConnections.map(connection => `
        <div class="ai-connection-item ${connection.status === 'connected' ? 'connected' : ''}" 
             onclick="connectToAiService('${connection.id}')">
            <div class="connection-info">
                <div class="connection-name">${connection.name}</div>
                <div class="connection-url">${connection.provider === 'openai' ? 'OpenAI API' : connection.endpoint}</div>
            </div>
            <div class="connection-actions">
                <button class="icon-button" onclick="event.stopPropagation(); editAiConnection('${connection.id}')" title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                </button>
                <button class="icon-button delete-connection-btn" onclick="event.stopPropagation(); deleteAiConnection('${connection.id}')" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
            <div class="connection-status"></div>
        </div>
    `).join('');
}

function editAiConnection(connectionId) {
    const aiConnections = Storage.getAiConnections();
    const connection = aiConnections.find(conn => conn.id === connectionId);
    
    if (!connection) return;
    
    document.getElementById('aiConnectionDialogTitle').textContent = 'Edit AI Connection';
    document.getElementById('aiConnectionName').value = connection.name;
    
    // Set provider and show appropriate fields
    const provider = connection.provider || 'ollama'; // Default to ollama for old connections
    document.getElementById('aiProvider').value = provider;
    
    if (provider === 'openai') {
        document.getElementById('aiEndpointGroup').style.display = 'none';
        document.getElementById('aiApiKeyGroup').style.display = 'block';
        document.getElementById('advancedSettingsToggle').style.display = 'none';
        document.getElementById('advancedAiSettings').style.display = 'none';
        document.getElementById('showAdvancedAiSettings').checked = false;
        document.getElementById('aiApiKey').value = connection.apiKey || '';
    } else {
        document.getElementById('aiEndpointGroup').style.display = 'block';
        document.getElementById('aiApiKeyGroup').style.display = 'none';
        document.getElementById('advancedSettingsToggle').style.display = 'block';
        document.getElementById('aiEndpoint').value = connection.endpoint;
    }
    
    // Check if it's a custom model
    const modelSelect = document.getElementById('aiModel');
    const isCustomModel = ![...modelSelect.options].some(option => option.value === connection.model);
    
    if (isCustomModel) {
        modelSelect.value = 'custom';
        document.getElementById('customModelName').value = connection.model;
        document.getElementById('customModelGroup').style.display = 'block';
    } else {
        modelSelect.value = connection.model;
        document.getElementById('customModelGroup').style.display = 'none';
    }
    
    document.getElementById('aiResponseTokens').value = connection.responseTokens || -1;
    document.getElementById('aiContextSize').value = connection.contextSize || 16384;
    
    window.editingAiConnectionId = connectionId;
    
    // Load models and set the selected model after loading
    if (provider === 'ollama') {
        loadAvailableModels().then(() => {
            // Set the model after models are loaded
            const modelSelect = document.getElementById('aiModel');
            const isCustomModel = ![...modelSelect.options].some(option => option.value === connection.model);
            
            if (isCustomModel) {
                modelSelect.value = 'custom';
                document.getElementById('customModelName').value = connection.model;
                document.getElementById('customModelGroup').style.display = 'block';
            } else {
                modelSelect.value = connection.model;
                document.getElementById('customModelGroup').style.display = 'none';
            }
        });
    } else {
        // For OpenAI, load models if API key is available
        if (connection.apiKey) {
            loadOpenAIModels(connection.apiKey).then(() => {
                // Set the model after models are loaded
                const modelSelect = document.getElementById('aiModel');
                const isCustomModel = ![...modelSelect.options].some(option => option.value === connection.model);
                
                if (isCustomModel) {
                    modelSelect.value = 'custom';
                    document.getElementById('customModelName').value = connection.model;
                    document.getElementById('customModelGroup').style.display = 'block';
                } else {
                    modelSelect.value = connection.model;
                    document.getElementById('customModelGroup').style.display = 'none';
                }
            });
        } else {
            document.getElementById('aiModel').innerHTML = '<option value="">Enter API key to load models</option>';
        }
    }
    
    document.getElementById('aiConnectionDialog').style.display = 'flex';
}

function deleteAiConnection(connectionId) {
    if (!confirm('Delete this AI connection?')) return;
    
    let aiConnections = Storage.getAiConnections();
    aiConnections = aiConnections.filter(conn => conn.id !== connectionId);
    Storage.setAiConnections(aiConnections);
    
    loadAiConnections();
    
    // Update title bar status
    if (window.Analytics && typeof window.Analytics.updateTitleBarStatus === 'function') {
        window.Analytics.updateTitleBarStatus();
    }
}

async function connectToAiService(connectionId) {
    let aiConnections = Storage.getAiConnections();
    const connection = aiConnections.find(conn => conn.id === connectionId);
    
    if (!connection) return;
    
    // Disconnect all other connections first
    aiConnections = aiConnections.map(conn => {
        if (conn.id !== connectionId && conn.status === 'connected') {
            console.log(`🔌 Disconnecting from ${conn.name}`);
            // Disconnect the appropriate service
            if (conn.provider === 'openai') {
                OpenAIService.disconnect();
            } else {
                OllamaService.disconnect();
            }
            // Update Analytics connection state when disconnecting
            if (window.Analytics) {
                Analytics.isConnected = false;
            }
            return { ...conn, status: 'disconnected' };
        }
        return conn;
    });
    
    // Set connecting state for the target connection
    const connectionIndex = aiConnections.findIndex(conn => conn.id === connectionId);
    aiConnections[connectionIndex] = { ...connection, status: 'connecting' };
    Storage.setAiConnections(aiConnections);
    loadAiConnections();
    
    try {
        // Initialize the appropriate service based on provider
        if (connection.provider === 'openai') {
            await OpenAIService.initialize(connection.apiKey, connection.model);
        } else {
            // Default to Ollama for backwards compatibility
            await OllamaService.initialize(connection.endpoint, connection.model);
        }
        connection.status = 'connected';
        // Set this as the active AI connection
        Storage.set('ACTIVE_AI_CONNECTION', connectionId);
        console.log(`✅ Successfully connected to ${connection.name}`);
        
        // Update storage first
        aiConnections[connectionIndex] = connection;
        Storage.setAiConnections(aiConnections);
        
        // Force UI refresh with a small delay to ensure state is fully updated
        setTimeout(async () => {
            loadAiConnections();
            // Properly initialize Analytics connection with the connected service
            if (window.Analytics) {
                // Call Analytics.initializeAiConnection to properly set up the connection
                const initSuccess = await window.Analytics.initializeAiConnection(connection);
                if (initSuccess) {
                    console.log('✅ Analytics AI connection initialized');
                } else {
                    console.warn('⚠️ Analytics AI connection initialization failed');
                }
                // Update title bar status after connection is established
                if (typeof window.Analytics.updateTitleBarStatus === 'function') {
                    window.Analytics.updateTitleBarStatus();
                }
            }
            
            // Trigger advanced AI initialization if available
            if (window.initializeAdvancedAIWhenReady) {
                setTimeout(() => {
                    window.initializeAdvancedAIWhenReady();
                }, 1000);
            }
        }, 100);
        
    } catch (error) {
        connection.status = 'disconnected';
        console.error('AI connection failed:', error);
        alert(`Failed to connect to ${connection.name}: ${error.message}`);
        
        // Update storage and UI for failure case
        aiConnections[connectionIndex] = connection;
        Storage.setAiConnections(aiConnections);
        loadAiConnections();
        
        // Update title bar status after failure
        if (window.Analytics && typeof window.Analytics.updateTitleBarStatus === 'function') {
            window.Analytics.updateTitleBarStatus();
        }
    }
}

function filterAiConnections() {
    const searchTerm = document.getElementById('aiConnectionSearch').value.toLowerCase();
    const aiConnections = Storage.getAiConnections();
    
    const filteredConnections = aiConnections.filter(connection => 
        connection.name.toLowerCase().includes(searchTerm) ||
        connection.endpoint.toLowerCase().includes(searchTerm)
    );
    
    const connectionList = document.getElementById('aiConnectionList');
    
    if (filteredConnections.length === 0) {
        connectionList.innerHTML = '<div class="empty-state" style="color: #858585;">No matching AI connections found</div>';
        return;
    }
    
    connectionList.innerHTML = filteredConnections.map(connection => `
        <div class="ai-connection-item ${connection.status === 'connected' ? 'connected' : ''}" 
             onclick="connectToAiService('${connection.id}')">
            <div class="connection-info">
                <div class="connection-name">${connection.name}</div>
                <div class="connection-url">${connection.provider === 'openai' ? 'OpenAI API' : connection.endpoint}</div>
            </div>
            <div class="connection-actions">
                <button class="icon-button" onclick="event.stopPropagation(); editAiConnection('${connection.id}')" title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                </button>
                <button class="icon-button delete-connection-btn" onclick="event.stopPropagation(); deleteAiConnection('${connection.id}')" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
            <div class="connection-status"></div>
        </div>
    `).join('');
}

// Global functions for compatibility
function refreshDataSources() {
    Interface.loadDataSources();
}

function refreshSchema() {
    Interface.refreshSchemaExplorer();
}

function clearQueryHistory() {
    if (confirm('Clear all query history?')) {
        Storage.clearHistory();
        Interface.loadHistory();
    }
}

function addNewVariable() {
    Interface.switchPanel('variables');
    // Variable creation logic
}

function createNewTab() {
    Interface.createNewTab();
}

function closeTab(tabId) {
    Interface.closeTab(tabId);
}

function togglePanel() {
    Interface.togglePanel();
}

// Debug functions for SOCKS proxy testing
async function testAuthWithoutProxy() {
    if (!GrafanaConfig.url || !GrafanaConfig.authHeader) {
        console.log('No connection configured');
        return;
    }
    
    try {
        const response = await fetch('/test-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: GrafanaConfig.url,
                authorization: GrafanaConfig.authHeader
            })
        });
        
        const result = await response.json();
        console.log('Auth test without proxy:', result);
        Interface.showToast(`Auth test without proxy: ${result.status}`, result.status === 200 ? 'success' : 'error');
    } catch (error) {
        console.error('Auth test error:', error);
        Interface.showToast('Auth test failed: ' + error.message, 'error');
    }
}

async function testAuthWithProxy() {
    if (!GrafanaConfig.url || !GrafanaConfig.authHeader || !GrafanaConfig.proxyConfig) {
        console.log('No connection or proxy configured');
        return;
    }
    
    try {
        const response = await fetch('/test-auth-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: GrafanaConfig.url,
                authorization: GrafanaConfig.authHeader,
                proxyConfig: GrafanaConfig.proxyConfig
            })
        });
        
        const result = await response.json();
        console.log('Auth test with proxy:', result);
        Interface.showToast(`Auth test with proxy: ${result.status}`, result.status === 200 ? 'success' : 'error');
    } catch (error) {
        console.error('Proxy auth test error:', error);
        Interface.showToast('Proxy auth test failed: ' + error.message, 'error');
    }
}

// Delete connection function
function deleteConnection(connectionId) {
    if (!connectionId) {
        Interface.showToast('Invalid connection ID', 'error');
        return;
    }
    
    const connections = Storage.getSavedConnections();
    const connection = connections[connectionId];
    
    if (!connection) {
        Interface.showToast('Connection not found', 'error');
        return;
    }
    
    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to delete the connection "${connection.name}"?\n\nThis will also clear any stored authentication tokens.`);
    
    if (confirmed) {
        // Check if this is the currently active connection
        const isActiveConnection = GrafanaConfig.connectionId === connectionId || GrafanaConfig.currentConnectionId === connectionId;
        
        // Delete the connection from storage
        Storage.deleteConnectionFromStorage(connectionId);
        
        // Clear any stored auth tokens
        Storage.clearAuthToken(connectionId);
        
        // If this was the active connection, disconnect
        if (isActiveConnection) {
            Connections.disconnect();
            Interface.showToast('Connection deleted and disconnected', 'success');
        } else {
            Interface.showToast(`Connection "${connection.name}" deleted`, 'success');
        }
        
        // Reload the connections list
        Interface.loadConnections();
    }
}

// Show connecting spinner for a connection
function showConnectionSpinner(connectionId) {
    const statusElement = document.getElementById(`connection-status-${connectionId}`);
    if (statusElement) {
        statusElement.innerHTML = '<div class="connection-spinner"></div>';
        statusElement.style.backgroundColor = 'transparent';
        statusElement.title = 'Connecting...';
    }
}

// Hide connecting spinner and show connected state
function hideConnectionSpinner(connectionId, connected = false) {
    const statusElement = document.getElementById(`connection-status-${connectionId}`);
    if (statusElement) {
        statusElement.innerHTML = '';
        statusElement.style.backgroundColor = connected ? '#2ed573' : '#858585';
        statusElement.title = connected ? 'Connected' : 'Disconnected';
    }
}


// Enhanced connection function with spinner
async function connectToConnectionWithSpinner(connectionId) {
    if (!connectionId) return;
    
    // Show spinner
    showConnectionSpinner(connectionId);
    
    try {
        // Get the connection
        const connections = Storage.getSavedConnections();
        const connection = connections[connectionId];
        
        if (!connection) {
            Interface.showToast('Connection not found', 'error');
            hideConnectionSpinner(connectionId, false);
            return;
        }
        
        // Try to connect
        await Connections.connectWithStoredConnection(connectionId);
        
        // Connection successful - spinner will be hidden when loadConnections is called
        
    } catch (error) {
        console.error('Connection failed:', error);
        hideConnectionSpinner(connectionId, false);
        
        // Show user-friendly error message
        let errorMessage = 'Connection failed';
        if (error.message) {
            errorMessage = error.message;
            // Clean up technical error messages
            if (errorMessage.includes('Failed to fetch')) {
                errorMessage = 'Unable to connect to server. Please check the URL and try again.';
            } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                errorMessage = 'Authentication failed. Please check your credentials.';
            } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
                errorMessage = 'Access denied. You may not have permission to access this server.';
            } else if (errorMessage.includes('404')) {
                errorMessage = 'Server not found. Please check the URL.';
            } else if (errorMessage.includes('Network')) {
                errorMessage = 'Network error. Please check your internet connection.';
            }
        }
        
        Interface.showToast(errorMessage, 'error');
    }
}