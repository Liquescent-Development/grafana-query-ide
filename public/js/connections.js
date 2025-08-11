const Connections = {
    // Show connected state
    showConnectedState(connection) {
        Utils.hideAllAuthSections();
        
        // Handle old interface elements (may not exist in Electron version)
        const authInfo = document.getElementById('authInfo');
        if (authInfo) {
            authInfo.classList.remove('hidden');
        }
        
        const connectedUrl = document.getElementById('connectedUrl');
        if (connectedUrl) {
            connectedUrl.textContent = connection.url + ' (' + connection.username + ')';
        }
        
        // Log connection status for new interface
        console.log('Connected to:', connection.url, 'as', connection.username);
        
        // Update header status
        const headerStatus = document.getElementById('authHeaderStatus');
        if (headerStatus) {
            headerStatus.textContent = 'Connected: ' + connection.url;
        }
        
        // Update title bar connection status
        const titleBarStatus = document.getElementById('titleBarConnectionStatus');
        if (titleBarStatus) {
            // Find the connection name from saved connections
            let connectionName = connection.name;
            if (!connectionName && GrafanaConfig.currentConnectionId) {
                const connections = Storage.getSavedConnections();
                const savedConnection = connections[GrafanaConfig.currentConnectionId];
                if (savedConnection) {
                    connectionName = savedConnection.name;
                }
            }
            
            titleBarStatus.textContent = 'Connected: ' + (connectionName || connection.username);
            titleBarStatus.className = 'connection-status connected';
            
            // Update title bar with selected data source if available
            updateTitleBarDataSource();
            
            // Disconnect button removed - users can disconnect from connections panel
        }
        
        // Update variables UI for the connected state
        if (typeof Variables !== 'undefined') {
            Variables.renderVariablesUI();
        }
        
        // Load dashboards for dashboard explorer
        if (typeof Dashboard !== 'undefined') {
            Dashboard.renderDashboardUI();
        }
        
        // Auto-collapse auth section on connection
        const authSection = document.getElementById('authSection');
        if (authSection && !authSection.classList.contains('collapsed')) {
            authSection.classList.add('collapsed');
            const toggleButton = document.querySelector('.auth-toggle');
            if (toggleButton) {
                toggleButton.textContent = 'Show';
            }
        }
        
        // Auto-expand datasource section when connected
        const datasourceSection = document.getElementById('datasourceSection');
        if (datasourceSection) {
            datasourceSection.style.display = '';
            if (datasourceSection.classList.contains('collapsed')) {
                datasourceSection.classList.remove('collapsed');
                const toggleButton = document.querySelector('.datasource-toggle');
                if (toggleButton) {
                    toggleButton.textContent = 'Hide';
                }
            }
        }
    },

    // Ensure disconnected state
    ensureDisconnectedState() {
        // Reset GrafanaConfig to disconnected state
        GrafanaConfig.connected = false;
        GrafanaConfig.url = '';
        GrafanaConfig.username = '';
        GrafanaConfig.password = '';
        GrafanaConfig.authHeader = '';
        GrafanaConfig.currentConnectionId = null;
        GrafanaConfig.connectionId = null;
        
        // Check if elements exist before accessing them (VS Code interface compatibility)
        const authInfo = document.getElementById('authInfo');
        if (authInfo) {
            authInfo.classList.add('hidden');
        }
        
        if (typeof Utils !== 'undefined' && Utils.hideAllAuthSections) {
            Utils.hideAllAuthSections();
        }
        
        const datasource = document.getElementById('datasource');
        if (datasource) {
            datasource.innerHTML = '<option value="">Connect to Grafana first</option>';
            datasource.disabled = true;
        }
        
        // Clear new interface data sources list
        const datasourceList = document.getElementById('datasourceList');
        if (datasourceList) {
            datasourceList.innerHTML = '<div class="empty-state">Connect to Grafana first</div>';
        }
        
        const executeBtn = document.getElementById('executeBtn');
        if (executeBtn) {
            executeBtn.disabled = true;
        }
        
        const authStatus = document.getElementById('authStatus');
        if (authStatus) {
            authStatus.innerHTML = '';
        }
        
        // Clear header status
        const headerStatus = document.getElementById('authHeaderStatus');
        if (headerStatus) {
            headerStatus.textContent = '';
        }
        
        // Clear title bar connection status
        const titleBarStatus = document.getElementById('titleBarConnectionStatus');
        if (titleBarStatus) {
            titleBarStatus.textContent = 'Not Connected';
            titleBarStatus.className = 'connection-status disconnected';
        }
        
        // Ensure AI title bar status is also disconnected
        const titleBarAiStatus = document.getElementById('titleBarAiStatus');
        if (titleBarAiStatus) {
            titleBarAiStatus.textContent = 'AI: Not Connected';
            titleBarAiStatus.className = 'connection-status ai-disconnected';
        }
        
        // Remove disconnect button from title bar
        const titleBarDisconnectBtn = document.querySelector('.title-bar-disconnect');
        if (titleBarDisconnectBtn) {
            titleBarDisconnectBtn.remove();
        }
        
        // Remove data source indicator from title bar
        const titleBarDataSource = document.querySelector('.title-bar-datasource');
        if (titleBarDataSource) {
            titleBarDataSource.remove();
        }
        
        // Remove query language indicator from title bar
        const titleBarQueryLanguage = document.querySelector('.query-language-indicator');
        if (titleBarQueryLanguage) {
            titleBarQueryLanguage.remove();
        }
        
        // Update variables UI for the disconnected state
        if (typeof Variables !== 'undefined') {
            Variables.renderVariablesUI();
        }
    },

    // Connect to Grafana
    async connectToGrafana(url, username, password, connectionId = null) {
        GrafanaConfig.url = url.replace(/\/$/, '');
        GrafanaConfig.username = username;
        GrafanaConfig.password = password;
        GrafanaConfig.currentConnectionId = connectionId;
        
        // Set proxy configuration if connection has one
        if (connectionId) {
            const connections = Storage.getSavedConnections();
            const connection = connections[connectionId];
            if (connection && connection.proxy) {
                GrafanaConfig.proxyConfig = connection.proxy;
            } else {
                GrafanaConfig.proxyConfig = null;
            }
        } else {
            GrafanaConfig.proxyConfig = null;
        }
        
        // Use cached token if available, otherwise create new Basic auth
        if (connectionId && !password) {
            const cachedToken = Storage.getAuthToken(connectionId);
            if (cachedToken) {
                GrafanaConfig.authHeader = cachedToken;
            } else {
                throw new Error('No cached authentication token available');
            }
        } else {
            const credentials = btoa(username + ':' + password);
            GrafanaConfig.authHeader = 'Basic ' + credentials;
            
            // Debug: Log credential info (not the actual password)
            console.log('Creating Basic auth for user:', username);
            console.log('Basic auth header length:', GrafanaConfig.authHeader.length);
        }

        Utils.showStatus('authStatus', 'Connecting...', 'info');

        try {
            const response = await API.makeApiRequest('/api/datasources');

            if (!response.ok) {
                let errorMessage = response.status + ' ' + response.statusText;
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    } else if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    try {
                        const errorText = await response.text();
                        if (errorText) {
                            errorMessage = errorText;
                        }
                    } catch (e2) {
                        // Ignore
                    }
                }
                throw new Error('Authentication failed: ' + errorMessage);
            }

            GrafanaConfig.datasources = await response.json();
            GrafanaConfig.connected = true;
            GrafanaConfig.connectionId = connectionId;
            
            Storage.saveGrafanaConfig();

            if (connectionId) {
                const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
                Storage.saveAuthToken(connectionId, GrafanaConfig.authHeader, expiresAt);
                
                // Connection saved successfully for new interface
                
                Utils.showTokenStatus(connectionId, 'Authentication saved for future use', 'success');
            }

            Utils.showStatus('authStatus', 'Connected successfully!', 'success');
            
            const connection = { url: GrafanaConfig.url, username: username };
            this.showConnectedState(connection);
            
            this.populateDatasources();
            
            // Try to enable query editor, but don't fail if elements don't exist
            try {
                Editor.enableQueryEditor();
            } catch (e) {
                console.log('Note: Could not enable query editor (likely using new interface)');
            }
            
            // Update connection status in new interface
            if (typeof Interface !== 'undefined' && Interface.loadConnections) {
                Interface.loadConnections();
                Interface.updateExecuteButton(Interface.activeTab);
            }

            // Password fields cleared automatically in new interface

        } catch (error) {
            Utils.showStatus('authStatus', 'Connection failed: ' + error.message, 'error');
            console.error('Connection error:', error);
            throw error;
        }
    },

    // Disconnect from Grafana
    disconnect() {
        GrafanaConfig.url = '';
        GrafanaConfig.username = '';
        GrafanaConfig.password = '';
        GrafanaConfig.authHeader = '';
        GrafanaConfig.currentConnectionId = null;
        GrafanaConfig.connectionId = null;
        GrafanaConfig.datasources = [];
        GrafanaConfig.currentResults = null;
        GrafanaConfig.proxyConfig = null;
        GrafanaConfig.connected = false;
        GrafanaConfig.selectedDatasourceUid = null;
        GrafanaConfig.selectedDatasourceType = null;
        GrafanaConfig.selectedDatasourceId = null;
        GrafanaConfig.currentDatasourceId = null;
        
        Storage.remove('GRAFANA_CONFIG');
        
        Utils.clearTokenStatus();
        this.ensureDisconnectedState();
    },

    // Populate datasources dropdown
    populateDatasources() {
        console.log('populateDatasources called');
        // For new interface, update the data sources list in the sidebar
        const datasourceList = document.getElementById('datasourceList');
        if (datasourceList) {
            const supportedDatasources = GrafanaConfig.datasources.filter(function(ds) {
                return ds.type === 'influxdb' || ds.type === 'prometheus';
            });
            
            if (supportedDatasources.length === 0) {
                datasourceList.innerHTML = '<div class="empty-state">No supported data sources found</div>';
                return;
            }
            
            let html = '';
            supportedDatasources.forEach(function(ds) {
                html += `
                    <div class="datasource-item" data-uid="${ds.uid}" data-type="${ds.type}" data-id="${ds.id}" data-name="${Utils.escapeHtml(ds.name)}">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: #cccccc; font-size: 13px;">${Utils.escapeHtml(ds.name)}</div>
                            <div style="font-size: 11px; color: #858585;">${ds.type}</div>
                        </div>
                    </div>
                `;
            });
            
            datasourceList.innerHTML = html;
            
            // Auto-select default data source for this connection if available
            if (GrafanaConfig.currentConnectionId) {
                const connections = Storage.getSavedConnections();
                const currentConnection = connections[GrafanaConfig.currentConnectionId];
                if (currentConnection && currentConnection.defaultDataSource) {
                    const defaultDataSource = currentConnection.defaultDataSource;
                    // Check if the default data source still exists in the current list
                    const defaultItem = datasourceList.querySelector(`[data-uid="${defaultDataSource.uid}"]`);
                    if (defaultItem) {
                        // Set global config to the saved default
                        GrafanaConfig.selectedDatasourceUid = defaultDataSource.uid;
                        GrafanaConfig.selectedDatasourceType = defaultDataSource.type;
                        GrafanaConfig.selectedDatasourceId = defaultDataSource.id;
                        GrafanaConfig.currentDatasourceId = defaultDataSource.uid;
                        
                        // Visually select the item
                        defaultItem.classList.add('selected');
                        
                        // Update title bar
                        updateTitleBarDataSource();
                        
                        // Update schema explorer
                        if (typeof Interface !== 'undefined' && Interface.refreshSchemaExplorer) {
                            Interface.refreshSchemaExplorer();
                        }
                        
                        // Auto-select appropriate query type
                        const queryType = defaultDataSource.type === 'prometheus' ? 'promql' : 'influxql';
                        if (typeof Interface !== 'undefined' && Interface.setQueryType) {
                            // Add small delay to ensure tab DOM is ready
                            setTimeout(() => {
                                Interface.setQueryType(Interface.activeTab, queryType);
                            }, 100);
                        } else if (typeof Editor !== 'undefined' && Editor.setQueryType) {
                            Editor.setQueryType(queryType);
                        }
                        
                        // Update execute button
                        if (typeof Interface !== 'undefined' && Interface.updateExecuteButton) {
                            Interface.updateExecuteButton(Interface.activeTab);
                        }
                        
                        // Update current tab's data source if it doesn't have one selected
                        if (typeof Interface !== 'undefined' && Interface.activeTab) {
                            const tabData = Interface.tabs.get(Interface.activeTab);
                            if (tabData && !tabData.datasourceId) {
                                // Update tab data
                                tabData.datasourceId = defaultDataSource.uid;
                                tabData.datasourceName = defaultDataSource.name;
                                tabData.datasourceType = defaultDataSource.type;
                                tabData.queryType = queryType;
                                
                                // Update the tab's datasource select dropdown
                                const container = document.querySelector(`[data-tab-id="${Interface.activeTab}"].editor-container`);
                                if (container) {
                                    const datasourceSelect = container.querySelector('.tab-datasource-select');
                                    if (datasourceSelect) {
                                        datasourceSelect.value = defaultDataSource.uid;
                                    }
                                }
                            }
                        }
                        
                        // Update all tab datasource selects
                        if (typeof Interface !== 'undefined' && Interface.populateAllTabDatasourceSelects) {
                            Interface.populateAllTabDatasourceSelects();
                        }
                        
                        console.log('Auto-selected default data source for connection:', defaultDataSource.name);
                    }
                }
            }
            
            // Add click handlers for data source selection
            datasourceList.querySelectorAll('.datasource-item').forEach(item => {
                // Check if this item should be selected (restore selection)
                if (GrafanaConfig.selectedDatasourceUid === item.dataset.uid) {
                    item.classList.add('selected');
                }
                
                item.addEventListener('click', () => {
                    // Remove previous selection
                    datasourceList.querySelectorAll('.datasource-item').forEach(ds => ds.classList.remove('selected'));
                    // Add selection to clicked item
                    item.classList.add('selected');
                    
                    // Update global config
                    GrafanaConfig.selectedDatasourceUid = item.dataset.uid;
                    GrafanaConfig.selectedDatasourceType = item.dataset.type;
                    GrafanaConfig.selectedDatasourceId = item.dataset.id;
                    GrafanaConfig.currentDatasourceId = item.dataset.uid; // Also set current for compatibility
                    
                    // Debug log
                    console.log('Data source selected:', {
                        uid: GrafanaConfig.selectedDatasourceUid,
                        type: GrafanaConfig.selectedDatasourceType,
                        id: GrafanaConfig.selectedDatasourceId
                    });
                    
                    // Auto-select appropriate query type
                    const queryType = item.dataset.type === 'prometheus' ? 'promql' : 'influxql';
                    if (typeof Interface !== 'undefined' && Interface.setQueryType) {
                        // Add small delay to ensure tab DOM is ready
                        setTimeout(() => {
                            Interface.setQueryType(Interface.activeTab, queryType);
                        }, 100);
                    } else if (typeof Editor !== 'undefined' && Editor.setQueryType) {
                        Editor.setQueryType(queryType);
                    }
                    
                    // Always refresh schema explorer when data source is selected
                    if (typeof Interface !== 'undefined' && Interface.refreshSchemaExplorer) {
                        console.log('Calling refreshSchemaExplorer after data source selection');
                        Interface.refreshSchemaExplorer();
                    }
                    
                    // Update title bar with selected data source
                    updateTitleBarDataSource();
                    
                    // Save data source preference for current connection
                    if (GrafanaConfig.currentConnectionId) {
                        const connections = Storage.getSavedConnections();
                        const currentConnection = connections[GrafanaConfig.currentConnectionId];
                        if (currentConnection) {
                            currentConnection.defaultDataSource = {
                                uid: item.dataset.uid,
                                name: item.dataset.name,
                                type: item.dataset.type,
                                id: item.dataset.id
                            };
                            Storage.saveConnectionToStorage(currentConnection);
                            console.log('Saved default data source for connection:', currentConnection.name);
                        }
                    }
                    
                    // Update execute button
                    if (typeof Interface !== 'undefined' && Interface.updateExecuteButton) {
                        Interface.updateExecuteButton(Interface.activeTab);
                    }
                    
                    // Update current tab's data source if it doesn't have one selected
                    if (typeof Interface !== 'undefined' && Interface.activeTab) {
                        const tabData = Interface.tabs.get(Interface.activeTab);
                        if (tabData && !tabData.datasourceId) {
                            // Update tab data
                            tabData.datasourceId = item.dataset.uid;
                            tabData.datasourceName = item.dataset.name;
                            tabData.datasourceType = item.dataset.type;
                            tabData.queryType = queryType;
                            
                            // Update the tab's datasource select dropdown
                            const container = document.querySelector(`[data-tab-id="${Interface.activeTab}"].editor-container`);
                            if (container) {
                                const datasourceSelect = container.querySelector('.tab-datasource-select');
                                if (datasourceSelect) {
                                    datasourceSelect.value = item.dataset.uid;
                                }
                            }
                            
                            // Update query type (which also updates CodeMirror mode)
                            Interface.setQueryType(Interface.activeTab, queryType);
                        }
                    }
                });
            });
        }
        
        // Also update old interface if it exists (for backward compatibility)
        const select = document.getElementById('datasource');
        if (select) {
            select.innerHTML = '<option value="">Select a data source</option>';
            
            const supportedDatasources = GrafanaConfig.datasources.filter(function(ds) {
                return ds.type === 'influxdb' || ds.type === 'prometheus';
            });
            
            supportedDatasources.forEach(function(ds) {
                const option = document.createElement('option');
                option.value = ds.uid;
                option.textContent = ds.name + ' (' + ds.type + ')';
                option.dataset.type = ds.type;
                option.dataset.id = ds.id;
                select.appendChild(option);
            });
            
            // Add event listener for auto-selecting query type based on datasource
            select.addEventListener('change', function() {
                const selectedOption = this.selectedOptions[0];
                if (selectedOption && selectedOption.dataset.type) {
                    const datasourceType = selectedOption.dataset.type;
                    
                    // Auto-select appropriate query type
                    if (typeof Editor !== 'undefined' && Editor.setQueryType) {
                        if (datasourceType === 'prometheus') {
                            Editor.setQueryType('promql');
                        } else if (datasourceType === 'influxdb') {
                            Editor.setQueryType('influxql');
                        }
                    }
                    
                    // Show a brief notification about the auto-selection
                    if (typeof Utils !== 'undefined' && Utils.showDataSourceNotification) {
                        Utils.showDataSourceNotification(datasourceType);
                    }
                }
            });
            
            select.disabled = false;
        }
        
        // Populate tab datasource selects after datasources are loaded
        if (typeof Interface !== 'undefined' && Interface.populateAllTabDatasourceSelects) {
            setTimeout(() => {
                Interface.populateAllTabDatasourceSelects();
            }, 50);
        }
    },

    // Load saved connections
    // Removed loadSavedConnections - only needed for old interface

    // Load a saved connection
    loadSavedConnection() {
        const select = document.getElementById('savedConnections');
        const connectionId = select.value;
        
        Utils.hideAllAuthSections();
        
        if (connectionId) {
            const connections = Storage.getSavedConnections();
            const connection = connections[connectionId];
            
            if (connection) {
                const authToken = Storage.getAuthToken(connectionId);
                if (authToken) {
                    this.attemptTokenConnection(connection, authToken);
                } else {
                    this.showPasswordInput(connection);
                }
            }
        }
        
        // Connection buttons updated automatically in new interface
    },

    // Show password input for connection
    showPasswordInput(connection) {
        document.getElementById('selectedConnectionName').textContent = connection.name;
        document.getElementById('password').value = '';
        document.getElementById('connectWithPassword').classList.remove('hidden');
        Utils.showTokenStatus(connection.id, 'Enter password to connect to ' + connection.name, 'info');
    },

    // Attempt connection with stored token
    async attemptTokenConnection(connection, authToken) {
        Utils.showTokenStatus(connection.id, 'Verifying stored authentication...', 'info');
        
        try {
            const tempConfig = {
                url: connection.url,
                username: connection.username,
                authHeader: authToken,
                proxyConfig: connection.proxy || null
            };
            
            const response = await API.makeApiRequestWithConfig(tempConfig, '/api/user');
            
            if (response.ok) {
                GrafanaConfig.url = tempConfig.url;
                GrafanaConfig.username = tempConfig.username;
                GrafanaConfig.authHeader = tempConfig.authHeader;
                GrafanaConfig.currentConnectionId = connection.id;
                GrafanaConfig.proxyConfig = connection.proxy || null;
                
                const dsResponse = await API.makeApiRequestWithConfig(tempConfig, '/api/datasources');
                if (dsResponse.ok) {
                    GrafanaConfig.datasources = await dsResponse.json();
                    
                    Utils.showTokenStatus(connection.id, 'Connected with stored authentication', 'success');
                    this.showConnectedState(connection);
                    
                    this.populateDatasources();
                    
                    // Try to enable query editor, but don't fail if elements don't exist
                    try {
                        Editor.enableQueryEditor();
                    } catch (e) {
                        console.log('Note: Could not enable query editor (likely using new interface)');
                    }

                } else {
                    throw new Error('Failed to load datasources');
                }
            } else {
                throw new Error('Token authentication failed');
            }
        } catch (error) {
            Storage.clearAuthToken(connection.id);
            Utils.showTokenStatus(connection.id, 'Stored authentication expired - password required', 'error');
            
            // Connection list updated automatically in new interface
            
            const select = document.getElementById('savedConnections');
            select.value = connection.id;
            this.showPasswordInput(connection);
        }
    },

    // Connect with stored connection
    async connectWithStoredConnection(connectionId) {
        // If connectionId is provided directly, use it; otherwise get from form
        if (!connectionId) {
            const select = document.getElementById('savedConnections');
            if (select) {
                connectionId = select.value;
            }
        }
        
        if (!connectionId) {
            const error = new Error('Please select a connection first');
            Utils.showStatus('authStatus', error.message, 'error');
            throw error;
        }
        
        const connections = Storage.getSavedConnections();
        const connection = connections[connectionId];
        
        if (!connection) {
            const error = new Error('Connection not found');
            Utils.showStatus('authStatus', error.message, 'error');
            throw error;
        }
        
        // Check if we have a cached authentication token
        const cachedToken = Storage.getAuthToken(connectionId);
        if (cachedToken) {
            // Try to connect with cached token first
            await this.connectToGrafana(connection.url, connection.username, null, connectionId);
            return;
        }
        
        // If no cached token, prompt for password
        const password = await this.promptForPassword(connection.name);
        if (!password) {
            const error = new Error('Password required for connection');
            Utils.showStatus('authStatus', error.message, 'error');
            throw error;
        }
        
        await this.connectToGrafana(connection.url, connection.username, password, connectionId);
    },
    
    async promptForPassword(connectionName) {
        return new Promise((resolve) => {
            // Create password dialog
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;
            
            const dialog = document.createElement('div');
            dialog.className = 'password-dialog';
            dialog.style.cssText = `
                background-color: #2d2d30;
                border: 1px solid #454545;
                border-radius: 4px;
                padding: 20px;
                min-width: 300px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            
            dialog.innerHTML = `
                <div style="margin-bottom: 16px; color: #cccccc; font-size: 14px; font-weight: 500;">
                    Connect to ${Utils.escapeHtml(connectionName)}
                </div>
                <div style="margin-bottom: 8px; color: #cccccc; font-size: 12px;">
                    Password:
                </div>
                <input type="password" id="passwordInput" style="
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #454545;
                    border-radius: 3px;
                    background-color: #3c3c3c;
                    color: #cccccc;
                    font-size: 13px;
                    margin-bottom: 16px;
                " placeholder="Enter password...">
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button id="cancelBtn" style="
                        padding: 8px 16px;
                        border: 1px solid #454545;
                        border-radius: 3px;
                        background-color: transparent;
                        color: #cccccc;
                        font-size: 13px;
                        cursor: pointer;
                    ">Cancel</button>
                    <button id="connectBtn" style="
                        padding: 8px 16px;
                        border: none;
                        border-radius: 3px;
                        background-color: #007acc;
                        color: white;
                        font-size: 13px;
                        cursor: pointer;
                    ">Connect</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            const passwordInput = dialog.querySelector('#passwordInput');
            const cancelBtn = dialog.querySelector('#cancelBtn');
            const connectBtn = dialog.querySelector('#connectBtn');
            
            // Focus password input
            passwordInput.focus();
            
            // Handle connect button
            connectBtn.addEventListener('click', () => {
                const password = passwordInput.value;
                document.body.removeChild(overlay);
                resolve(password);
            });
            
            // Handle cancel button
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(null);
            });
            
            // Handle Enter key
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const password = passwordInput.value;
                    document.body.removeChild(overlay);
                    resolve(password);
                }
            });
            
            // Handle Escape key
            document.addEventListener('keydown', function escapeHandler(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escapeHandler);
                    document.body.removeChild(overlay);
                    resolve(null);
                }
            });
        });
    },

    // Removed updateConnectionButtons - only needed for old interface

    // Clear connection token
    clearConnectionToken(connectionId) {
        if (!connectionId) return;
        
        if (confirm('Clear stored authentication for this connection?')) {
            Storage.clearAuthToken(connectionId);
            // Connection list updated automatically in new interface
            
            const select = document.getElementById('savedConnections');
            if (select.value === connectionId) {
                Utils.showTokenStatus(connectionId, 'Authentication cleared - password required', 'info');
            }
            // Connection buttons updated automatically in new interface
        }
    },

    // Toggle connection form
    toggleConnectionForm() {
        const form = document.getElementById('connectionForm');
        const isHidden = form.classList.contains('hidden');
        
        if (isHidden) {
            Utils.hideAllAuthSections();
            document.getElementById('connectionFormTitle').textContent = 'Add New Connection';
            document.getElementById('connectionName').value = '';
            document.getElementById('connectionUrl').value = '';
            document.getElementById('connectionUsername').value = '';
            document.getElementById('connectionPassword').value = '';
            GrafanaConfig.currentEditingConnectionId = null;
            form.classList.remove('hidden');
            
            document.getElementById('savedConnections').value = '';
            // Connection buttons updated automatically in new interface
        } else {
            Utils.hideAllAuthSections();
        }
    },

    // Edit connection
    editConnection() {
        const select = document.getElementById('savedConnections');
        const connectionId = select.value;
        
        if (!connectionId) return;
        
        const connections = Storage.getSavedConnections();
        const connection = connections[connectionId];
        
        if (connection) {
            Utils.hideAllAuthSections();
            document.getElementById('connectionFormTitle').textContent = 'Edit Connection';
            document.getElementById('connectionName').value = connection.name;
            document.getElementById('connectionUrl').value = connection.url;
            document.getElementById('connectionUsername').value = connection.username;
            document.getElementById('connectionPassword').value = '';
            GrafanaConfig.currentEditingConnectionId = connectionId;
            document.getElementById('connectionForm').classList.remove('hidden');
        }
    },

    // Save connection
    saveConnection() {
        const name = document.getElementById('connectionName').value.trim();
        const url = document.getElementById('connectionUrl').value.trim();
        const username = document.getElementById('connectionUsername').value.trim();
        
        if (!name || !url) {
            alert('Please provide at least a name and URL for the connection.');
            return;
        }
        
        const connection = {
            id: GrafanaConfig.currentEditingConnectionId || Date.now().toString(),
            name: name,
            url: url.replace(/\/$/, ''),
            username: username
        };
        
        Storage.saveConnectionToStorage(connection);
        // Connection list updated automatically in new interface
        
        document.getElementById('savedConnections').value = connection.id;
        
        this.cancelConnectionForm();
        // Connection buttons updated automatically in new interface
        
        Utils.showStatus('authStatus', 'Connection "' + name + '" saved successfully', 'success');
    },

    // Save and connect connection
    saveAndConnectConnection() {
        const name = document.getElementById('connectionName').value.trim();
        const url = document.getElementById('connectionUrl').value.trim();
        const username = document.getElementById('connectionUsername').value.trim();
        const password = document.getElementById('connectionPassword').value.trim();
        
        if (!name || !url || !username || !password) {
            alert('Please provide all connection details including password to test connection.');
            return;
        }
        
        const connection = {
            id: GrafanaConfig.currentEditingConnectionId || Date.now().toString(),
            name: name,
            url: url.replace(/\/$/, ''),
            username: username
        };
        
        Storage.saveConnectionToStorage(connection);
        // Connection list updated automatically in new interface
        
        document.getElementById('savedConnections').value = connection.id;
        this.cancelConnectionForm();
        // Connection buttons updated automatically in new interface
        
        this.connectToGrafana(url, username, password, connection.id);
    },

    // Cancel connection form
    cancelConnectionForm() {
        Utils.hideAllAuthSections();
        GrafanaConfig.currentEditingConnectionId = null;
        
        const select = document.getElementById('savedConnections');
        if (select.value) {
            this.loadSavedConnection();
        }
        // Connection buttons updated automatically in new interface
    },

    // Delete connection
    deleteConnection() {
        const select = document.getElementById('savedConnections');
        const connectionId = select.value;
        
        if (!connectionId) return;
        
        const connections = Storage.getSavedConnections();
        const connection = connections[connectionId];
        
        if (connection && confirm('Are you sure you want to delete the connection "' + connection.name + '"? This will also clear any stored authentication.')) {
            Storage.deleteConnectionFromStorage(connectionId);
            Storage.clearAuthToken(connectionId);
            // Connection list updated automatically in new interface
            
            select.value = '';
            Utils.hideAllAuthSections();
            Utils.clearTokenStatus();
            // Connection buttons updated automatically in new interface
        }
    }
};

// Update title bar with selected data source information
function updateTitleBarDataSource() {
    const titleBarControls = document.querySelector('.title-bar-controls');
    if (!titleBarControls) return;
    
    // Remove existing data source indicator
    const existingDataSourceIndicator = titleBarControls.querySelector('.title-bar-datasource');
    if (existingDataSourceIndicator) {
        existingDataSourceIndicator.remove();
    }
    
    // Add data source indicator if one is selected
    if (GrafanaConfig.selectedDatasourceUid && GrafanaConfig.connected) {
        // Find the data source name
        const selectedDataSource = GrafanaConfig.datasources.find(ds => ds.uid === GrafanaConfig.selectedDatasourceUid);
        if (selectedDataSource) {
            const dataSourceIndicator = document.createElement('span');
            dataSourceIndicator.className = 'title-bar-datasource';
            dataSourceIndicator.textContent = `Default Data Source: ${selectedDataSource.name}`;
            dataSourceIndicator.title = `Default data source: ${selectedDataSource.name} (${selectedDataSource.type})`;
            dataSourceIndicator.style.cssText = `
                font-size: 11px;
                color: #ff8c00;
                background-color: rgba(255, 140, 0, 0.15);
                padding: 2px 8px;
                border-radius: 3px;
                margin-left: 8px;
                font-weight: 500;
                border: 1px solid rgba(255, 140, 0, 0.4);
            `;
            
            titleBarControls.appendChild(dataSourceIndicator);
            
            // Update query language indicator after data source indicator is added
            if (typeof Interface !== 'undefined' && Interface.updateQueryLanguageIndicator) {
                // Determine query language from datasource type
                const queryType = selectedDataSource.type === 'prometheus' ? 'promql' : 'influxql';
                Interface.updateQueryLanguageIndicator(queryType);
            }
        }
    } else {
        // No data source selected, hide query language indicator
        if (typeof Interface !== 'undefined' && Interface.updateQueryLanguageIndicator) {
            Interface.updateQueryLanguageIndicator(null);
        }
    }
}