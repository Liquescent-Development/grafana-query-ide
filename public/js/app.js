const App = {
    // Initialize the application
    initialize() {
        console.log('Initializing VS Code-like interface...');
        
        // Add platform class to body for platform-specific styling
        if (typeof process !== 'undefined' && process.platform) {
            document.body.classList.add(`platform-${process.platform}`);
        } else if (navigator.userAgent.includes('Mac')) {
            document.body.classList.add('platform-darwin');
        } else if (navigator.userAgent.includes('Win')) {
            document.body.classList.add('platform-win32');
        } else {
            document.body.classList.add('platform-linux');
        }
        
        // Initialize the new VS Code-like interface
        Interface.initialize();
        
        // Initialize CodeMirror modes and helpers for the new interface
        Editor.setupCodeMirrorHelpers();
        Variables.initialize();
        Dashboard.initialize();
        
        // Initialize connection and API systems
        Connections.ensureDisconnectedState();
        API.checkIfRunningInContainer();
        
        // Set default application state
        this.setDefaultApplicationState();
        
        console.log('VS Code-like interface initialization complete');
        
        // Clean up expired schema cache on startup
        if (typeof Storage !== 'undefined') {
            Storage.clearExpiredSchemaCache();
        }
        
        // Initialize AI Agent
        if (typeof AIAgent !== 'undefined') {
            console.log('Initializing AI Agent...');
            AIAgent.initialize();
        }
        
        // Listen for IPC messages from pop-out chat window (Electron only)
        this.setupElectronListeners();
    },
    
    // Set default application state
    // Setup Electron-specific listeners
    setupElectronListeners() {
        if (window.electronAPI && window.electronAPI.onOpenQueryInEditor) {
            console.log('🔌 Setting up Electron listeners for AI query integration');
            
            // Listen for queries from pop-out chat window
            window.electronAPI.onOpenQueryInEditor((queryData) => {
                console.log('📝 Received query from chat window:', queryData);
                if (typeof Interface !== 'undefined' && Interface.openAIGeneratedQuery) {
                    Interface.openAIGeneratedQuery(queryData);
                }
            });
        }
    },
    
    setDefaultApplicationState() {
        // Set default query type
        GrafanaConfig.currentQueryType = 'influxql';
        GrafanaConfig.currentViewMode = 'table';
        GrafanaConfig.pageSize = 25;
        GrafanaConfig.currentPage = 1;
        
        // Update title bar connection status
        this.updateTitleBarStatus();
        
        // Check for saved connections and load them
        this.loadSavedConnections();
        
        // Update AI status after a delay to ensure services are loaded
        // NOTE: We do NOT automatically restore AI connections on startup
        // AI connections should only be made when user explicitly connects
        setTimeout(() => {
            // Just update the title bar to show disconnected state
            if (window.Analytics && typeof window.Analytics.updateTitleBarStatus === 'function') {
                window.Analytics.updateTitleBarStatus();
            }
            
            // Clear any stale ACTIVE_AI_CONNECTION from storage
            if (Storage && Storage.remove) {
                const activeConnectionId = Storage && Storage.get ? Storage.get('ACTIVE_AI_CONNECTION') : null;
                if (activeConnectionId) {
                    console.log('🧹 Clearing stale active AI connection from storage');
                    Storage.remove('ACTIVE_AI_CONNECTION');
                }
            }
        }, 1000);
    },
    
    updateTitleBarStatus() {
        const statusElement = document.getElementById('titleBarConnectionStatus');
        if (GrafanaConfig.connected && GrafanaConfig.url) {
            statusElement.textContent = `Connected to ${GrafanaConfig.url}`;
            statusElement.style.color = '#51cf66';
        } else {
            statusElement.textContent = 'Not Connected';
            statusElement.style.color = '#858585';
        }
    },
    
    loadSavedConnections() {
        // Load and display saved connections in the new interface
        Interface.loadConnections();
    }
};

// Connection Management - Updated for new interface
function showConnectedState(connection) {
    GrafanaConfig.connected = true;
    GrafanaConfig.url = connection.url;
    GrafanaConfig.username = connection.username;
    GrafanaConfig.connectionId = connection.id;
    
    App.updateTitleBarStatus();
    Interface.loadConnections();
    Interface.loadDataSources();
    
    // Update execute buttons in all tabs
    Interface.tabs.forEach((_, tabId) => {
        Interface.updateExecuteButton(tabId);
    });
    
    // Populate tab datasource selects after a delay to ensure datasources are loaded
    setTimeout(() => {
        Interface.populateAllTabDatasourceSelects();
    }, 200);
    
    Interface.showToast(`Connected to ${connection.name}`, 'success');
}

function disconnect() {
    GrafanaConfig.connected = false;
    GrafanaConfig.url = '';
    GrafanaConfig.username = '';
    GrafanaConfig.connectionId = null;
    GrafanaConfig.currentDatasourceId = null;
    
    App.updateTitleBarStatus();
    Interface.loadConnections();
    Interface.loadDataSources();
    
    // Disable execute buttons in all tabs
    Interface.tabs.forEach((_, tabId) => {
        Interface.updateExecuteButton(tabId);
    });
    
    Interface.showToast('Disconnected from Grafana', 'info');
}

// Global functions for HTML onclick handlers and compatibility
function clearConnectionToken(connectionId) {
    if (typeof Connections !== 'undefined') {
        Connections.clearConnectionToken(connectionId);
    }
}

function updateConnectionButtons() {
    Interface.loadConnections();
}

function loadSavedConnection() {
    // This is handled by the new connection click handlers in Interface
}

function editConnection() {
    // TODO: Implement edit functionality in new interface
    Interface.showToast('Edit connection functionality coming soon', 'info');
}

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

function connectWithStoredConnection(connectionId) {
    if (typeof Connections !== 'undefined') {
        Connections.connectWithStoredConnection(connectionId);
    }
}

// Query and Editor functions - Updated for tab system
function setQueryType(type) {
    Interface.setQueryType(Interface.activeTab, type);
}

function clearQuery() {
    const tabData = Interface.tabs.get(Interface.activeTab);
    if (tabData && tabData.editor) {
        tabData.editor.setValue('');
    }
}

function executeQuery(tabId) {
    Interface.executeQuery(tabId || Interface.activeTab);
}

// Datasource management - Updated for new interface
function onDataSourceChange() {
    const datasourceSelect = document.getElementById('datasource');
    if (!datasourceSelect) return;
    
    const selectedOption = datasourceSelect.selectedOptions[0];
    if (selectedOption && selectedOption.value) {
        GrafanaConfig.currentDatasourceId = selectedOption.value;
        
        // Update execute buttons
        Interface.tabs.forEach((_, tabId) => {
            Interface.updateExecuteButton(tabId);
        });
        
        // Auto-detect query type based on datasource
        const datasourceType = selectedOption.dataset.type;
        if (datasourceType) {
            const queryType = datasourceType === 'prometheus' ? 'promql' : 'influxql';
            Interface.setQueryType(Interface.activeTab, queryType);
        }
        
        // Trigger schema loading
        if (typeof Schema !== 'undefined' && Schema.onDatasourceChange) {
            Schema.onDatasourceChange();
        }
        
        // Switch to schema explorer view
        Interface.switchSidebarView('explorer');
        
        Interface.showToast(`Selected datasource: ${selectedOption.textContent}`, 'success');
    }
}

// Data source loading function (called by Interface)
async function loadDataSources() {
    if (!GrafanaConfig.connected) return;
    
    try {
        const response = await API.makeApiRequest('/api/datasources', {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const datasources = await response.json();
        populateDataSourceList(datasources);
        
    } catch (error) {
        console.error('Error loading data sources:', error);
        Interface.showToast('Failed to load data sources: ' + error.message, 'error');
    }
}

function populateDataSourceList(datasources) {
    const datasourceList = document.getElementById('datasourceList');
    
    if (!datasources || datasources.length === 0) {
        datasourceList.innerHTML = '<div class="empty-state">No data sources found</div>';
        return;
    }
    
    let html = '';
    datasources.forEach(ds => {
        const isSelected = GrafanaConfig.currentDatasourceId === ds.uid;
        html += `
            <div class="datasource-item ${isSelected ? 'selected' : ''}" data-uid="${ds.uid}" data-type="${ds.type}" data-id="${ds.id}" data-name="${Utils.escapeHtml(ds.name)}">
                <div>
                    <div style="font-weight: 500;">${Utils.escapeHtml(ds.name)}</div>
                    <div style="font-size: 11px; color: #858585;">${Utils.escapeHtml(ds.type)}</div>
                </div>
            </div>
        `;
    });
    
    datasourceList.innerHTML = html;
    
    // Add click handlers
    datasourceList.querySelectorAll('.datasource-item').forEach(item => {
        item.addEventListener('click', () => {
            // Update selection
            datasourceList.querySelectorAll('.datasource-item').forEach(i => {
                i.classList.remove('selected');
            });
            item.classList.add('selected');
            
            // Update global state
            GrafanaConfig.currentDatasourceId = item.dataset.uid;
            GrafanaConfig.selectedDatasourceType = item.dataset.type;
            GrafanaConfig.selectedDatasourceNumericId = item.dataset.id;
            GrafanaConfig.selectedDatasourceName = item.dataset.name;
            
            // Trigger change event
            onDataSourceChange();
            
            // Update schema dropdown if it exists
            const schemaSelect = document.getElementById('schemaDatasourceSelect');
            if (schemaSelect) {
                schemaSelect.value = item.dataset.uid;
            }
        });
    });
    
    // Clear datasource search filter when reloading
    const datasourceSearch = document.getElementById('datasourceSearch');
    if (datasourceSearch && datasourceSearch.value) {
        // Only clear if we have datasources to show
        if (datasourceList.querySelectorAll('.datasource-item').length > 0) {
            datasourceSearch.value = '';
        }
    }
    
    // Populate tab datasource selects after a short delay to ensure DOM is updated
    setTimeout(() => {
        Interface.populateAllTabDatasourceSelects();
    }, 100);
}

// Connection backup functions
function exportConnections() {
    const backupData = Storage.exportConnections();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `grafana-connections-${timestamp}.json`;
    
    // Create a download link
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Interface.showToast(`Connections exported to ${filename}`, 'success');
}

function importConnections() {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = Storage.importConnections(e.target.result);
            
            if (result.success) {
                Interface.showToast(`Imported ${result.connectionsImported} connections and ${result.tokensImported} auth tokens`, 'success');
                Interface.loadConnections();
            } else {
                Interface.showToast(`Import failed: ${result.error}`, 'error');
            }
        };
        
        reader.onerror = () => {
            Interface.showToast('Failed to read file', 'error');
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Dashboard search functions are now handled in dashboard.js

function clearDashboardSearch() {
    const searchInput = document.getElementById('dashboardSearch');
    if (searchInput) {
        searchInput.value = '';
        searchDashboards();
    }
}

// Connection filtering
function filterConnections() {
    const searchInput = document.getElementById('connectionSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    const connectionItems = document.querySelectorAll('.connection-item');
    let visibleCount = 0;
    
    connectionItems.forEach(item => {
        // Get the text content from the item - includes both name and URL
        const textContent = item.textContent.toLowerCase();
        
        if (textContent.includes(searchTerm)) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show/hide empty state if all connections are filtered out
    const connectionList = document.getElementById('connectionList');
    if (connectionList) {
        if (visibleCount === 0 && connectionItems.length > 0) {
            if (!connectionList.querySelector('.no-matches')) {
                const noMatches = document.createElement('div');
                noMatches.className = 'empty-state no-matches';
                noMatches.textContent = 'No connections match your search';
                connectionList.appendChild(noMatches);
            }
        } else {
            const noMatches = connectionList.querySelector('.no-matches');
            if (noMatches) {
                noMatches.remove();
            }
        }
    }
}

// Data source filtering
function filterDataSources() {
    const searchInput = document.getElementById('datasourceSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    const datasourceItems = document.querySelectorAll('.datasource-item');
    let visibleCount = 0;
    
    datasourceItems.forEach(item => {
        const name = item.dataset.name?.toLowerCase() || '';
        const type = item.dataset.type?.toLowerCase() || '';
        
        if (name.includes(searchTerm) || type.includes(searchTerm)) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show/hide empty state if all datasources are filtered out
    const datasourceList = document.getElementById('datasourceList');
    if (datasourceList) {
        if (visibleCount === 0 && datasourceItems.length > 0) {
            if (!datasourceList.querySelector('.no-matches')) {
                const noMatches = document.createElement('div');
                noMatches.className = 'empty-state no-matches';
                noMatches.textContent = 'No data sources match your search';
                datasourceList.appendChild(noMatches);
            }
        } else {
            const noMatches = datasourceList.querySelector('.no-matches');
            if (noMatches) {
                noMatches.remove();
            }
        }
    }
}

// Clear search filters
function clearConnectionSearch() {
    const searchInput = document.getElementById('connectionSearch');
    if (searchInput) {
        searchInput.value = '';
        filterConnections();
    }
}

function clearDataSourceSearch() {
    const searchInput = document.getElementById('datasourceSearch');
    if (searchInput) {
        searchInput.value = '';
        filterDataSources();
    }
}

// Panel management functions
function selectSeries(seriesIndex) {
    const index = parseInt(seriesIndex);
    if (GrafanaConfig.currentResults && index >= 0) {
        GrafanaConfig.currentPage = 1;
        GrafanaConfig.selectedSeries = index;
        Queries.displayResults(GrafanaConfig.currentResults, GrafanaConfig.currentPage, index);
    }
}

function setViewMode(mode) {
    GrafanaConfig.currentViewMode = mode;
    if (GrafanaConfig.currentResults) {
        Queries.displayResults(GrafanaConfig.currentResults, GrafanaConfig.currentPage, GrafanaConfig.selectedSeries);
    }
}

function goToPage(page) {
    if (GrafanaConfig.currentResults && page >= 1 && page <= Math.ceil(GrafanaConfig.totalRows / GrafanaConfig.pageSize)) {
        Queries.displayResults(GrafanaConfig.currentResults, page, GrafanaConfig.selectedSeries);
    }
}

function changePageSize(newSize) {
    GrafanaConfig.pageSize = parseInt(newSize);
    GrafanaConfig.currentPage = 1;
    if (GrafanaConfig.currentResults) {
        Queries.displayResults(GrafanaConfig.currentResults, GrafanaConfig.currentPage, GrafanaConfig.selectedSeries);
    }
}

// updateChart is defined in charts.js as a global function

// Schema datasource selector
function onSchemaDatasourceChange() {
    const select = document.getElementById('schemaDatasourceSelect');
    if (!select || !select.value) return;
    
    // Get the selected option details
    const selectedOption = select.selectedOptions[0];
    if (selectedOption && window.Schema) {
        // Set the current datasource info and trigger schema loading
        Schema.currentDatasourceId = selectedOption.value;
        Schema.currentDatasourceType = selectedOption.dataset.type;
        Schema.loadSchemaIfNeeded();
    }
}

// Tab datasource selector
function onTabDatasourceChange() {
    const activeTab = Interface.activeTab;
    if (!activeTab) return;
    
    const container = document.querySelector(`[data-tab-id="${activeTab}"].editor-container`);
    if (!container) return;
    
    const select = container.querySelector('.tab-datasource-select');
    if (!select) return;
    
    Interface.setTabDatasource(activeTab, select.value);
}

// Analytics datasource selector
function onAnalyticsDatasourceChange() {
    const select = document.getElementById('analyticsDatasource');
    if (!select || !select.value) return;
    
    // Update Analytics datasource and reload data
    if (typeof Analytics !== 'undefined') {
        Analytics.setDatasource(select.value);
    }
}

// Legacy function compatibility
function toggleSchemaExplorer() {
    Interface.switchSidebarView('explorer');
}

function toggleDashboardExplorer() {
    Interface.switchSidebarView('dashboards');
}

function refreshSchema() {
    if (typeof Schema !== 'undefined' && Schema.loadSchema) {
        Schema.loadSchema();
    }
}

// Variables management
function addVariable() {
    Interface.switchPanel('variables');
    if (typeof Variables !== 'undefined' && Variables.addVariable) {
        Variables.addVariable();
    }
}

// Global function for clearing query history
function clearQueryHistory() {
    if (typeof History !== 'undefined') {
        History.clearHistory();
    } else {
        console.error('History module not available');
    }
}

// Initialize when page loads
window.onload = function() {
    App.initialize();
    
    // Load data sources when Interface is ready
    Interface.loadDataSources = loadDataSources;
    
    // Mark app as loaded for Electron
    if (document.body) {
        document.body.classList.add('electron-app');
    }
    
    // Initialize FileExplorer for save functionality
    if (typeof FileExplorer !== 'undefined') {
        console.log('Initializing FileExplorer during app startup');
        FileExplorer.initialize();
    }
    
    // Advanced AI System will be initialized when user connects to an AI service
    // We do NOT automatically initialize it on startup
    console.log('💡 Advanced AI System ready - will initialize when AI service is connected by user');
    
    // Expose debug functions to global scope for console access
    window.debugStorage = Storage.debugLocalStorage.bind(Storage);
    window.recoverConnections = Storage.recoverConnections.bind(Storage);
    window.exportConnections = exportConnections;
    
    
    // Log debug info on startup
    console.log('App initialized - you can use debugStorage() and recoverConnections() in console');
};