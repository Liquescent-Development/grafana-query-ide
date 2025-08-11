// WARNING: This module is being refactored to use DataAccess
// Use DataAccess for dashboard data access - see dataAccess.js
const Dashboard = {
    // Dashboard state
    currentDashboards: [],
    selectedDashboard: null,
    searchTimeout: null,
    initialized: false,
    
    // Initialize dashboard explorer
    initialize() {
        if (this.initialized) {
            console.log('Dashboard already initialized, skipping');
            return;
        }
        
        console.log('Initializing Dashboard module');
        this.initialized = true;
        this.renderDashboardUI();
        
        // Initialize query preview resizer
        setTimeout(() => {
            this.initializeQueryPreviewResizer();
        }, 100);
        
        // Load all dashboards when connected
        if (GrafanaConfig.connected) {
            this.loadAllDashboards();
        }
    },
    
    // Load all dashboards
    async loadAllDashboards() {
        // Check if connected to Grafana
        if (!GrafanaConfig.connected) {
            this.showError('Please connect to Grafana first');
            return;
        }
        
        try {
            console.log('Loading all dashboards');
            
            // Show loading state
            const container = document.getElementById('dashboardResults');
            if (container) {
                container.innerHTML = '<div class="dashboard-loading">Loading dashboards...</div>';
            }
            
            // Get all dashboards without a search query
            const searchUrl = `/api/search?type=dash-db`;
            
            const results = await DataAccess.request(searchUrl, {
                method: 'GET'
            });
            console.log('All dashboard results:', results.length);
            
            // Filter to ensure we only have dashboards
            const dashboards = results.filter(item => item.type === 'dash-db');
            
            // Store all dashboards
            this.allDashboards = dashboards;
            this.currentDashboards = dashboards;
            
            this.renderDashboardResults();
            
        } catch (error) {
            console.error('Error loading all dashboards:', error);
            this.showError('Failed to load dashboards: ' + error.message);
        }
    },
    
    // Search for dashboards
    async searchDashboards(query) {
        console.log('Dashboard.searchDashboards called with query:', query);
        
        if (!query || query.trim().length === 0) {
            // No search query - show all dashboards
            if (this.allDashboards) {
                this.currentDashboards = this.allDashboards;
            } else {
                await this.loadAllDashboards();
            }
            this.renderDashboardResults();
            return;
        }
        
        // Check if connected to Grafana
        if (!GrafanaConfig.connected) {
            this.showError('Please connect to Grafana first');
            return;
        }
        
        // Filter from all dashboards if we have them loaded
        if (this.allDashboards && this.allDashboards.length > 0) {
            // Client-side filtering from loaded dashboards
            const filteredResults = this.allDashboards.filter(item => {
                const searchTerm = query.toLowerCase();
                return item.title.toLowerCase().includes(searchTerm) ||
                       (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
                       (item.description && item.description.toLowerCase().includes(searchTerm));
            });
            
            console.log('Filtered dashboard results (client-side):', filteredResults.length, 'out of', this.allDashboards.length);
            this.currentDashboards = filteredResults;
            this.renderDashboardResults();
            return;
        }
        
        // Fallback to server-side search if we don't have all dashboards loaded
        try {
            console.log('Searching dashboards server-side for:', query);
            
            // Show loading state
            const container = document.getElementById('dashboardResults');
            if (container) {
                container.innerHTML = '<div class="dashboard-loading">Searching dashboards...</div>';
            }
            
            const searchUrl = `/api/search?q=${encodeURIComponent(query)}&type=dash-db`;
            
            const results = await DataAccess.request(searchUrl, {
                method: 'GET'
            });
            console.log('Dashboard search results (server-side):', results);
            
            // Filter results client-side if Grafana API didn't filter properly
            const filteredResults = results.filter(item => {
                // Ensure it's a dashboard and matches the search query
                const isMatch = item.type === 'dash-db' && 
                               (item.title.toLowerCase().includes(query.toLowerCase()) ||
                                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))) ||
                                (item.description && item.description.toLowerCase().includes(query.toLowerCase())));
                return isMatch;
            });
            
            console.log('Filtered dashboard results (server-side):', filteredResults.length, 'out of', results.length);
            
            // Store the filtered results
            this.currentDashboards = filteredResults;
            
            this.renderDashboardResults();
            
        } catch (error) {
            console.error('Error searching dashboards:', error);
            this.showError('Failed to search dashboards: ' + error.message);
        }
    },
    
    // Get dashboard by UID
    async getDashboardByUid(uid) {
        try {
            console.log('Fetching dashboard:', uid);
            
            const result = await DataAccess.request(`/api/dashboards/uid/${uid}`, {
                method: 'GET'
            });
            console.log('Dashboard data:', result);
            
            return result.dashboard;
            
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            this.showError('Failed to fetch dashboard: ' + error.message);
            return null;
        }
    },
    
    // Select a dashboard and load its queries
    async selectDashboard(dashboardItem) {
        try {
            // Mark as selected in UI
            document.querySelectorAll('.dashboard-item').forEach(item => {
                item.classList.remove('selected');
            });
            document.querySelector(`[data-dashboard-uid="${dashboardItem.uid}"]`).classList.add('selected');
            
            // Show loading state
            const dashboardQueries = document.getElementById('dashboardQueries');
            const dashboardResults = document.getElementById('dashboardResults');
            
            if (dashboardQueries && dashboardResults) {
                // Hide results, show queries section with loading
                dashboardResults.style.display = 'none';
                dashboardQueries.classList.remove('hidden');
                
                // Show loading in the queries section
                const queryList = document.getElementById('dashboardQueryList');
                if (queryList) {
                    queryList.innerHTML = '<div class="dashboard-loading">Loading dashboard queries...</div>';
                }
                
                // Also clear the preview
                const previewSection = document.getElementById('dashboardQueryPreview');
                if (previewSection) {
                    previewSection.classList.add('hidden');
                }
            }
            
            // Fetch full dashboard data
            const dashboard = await this.getDashboardByUid(dashboardItem.uid);
            if (!dashboard) return;
            
            this.selectedDashboard = dashboard;
            this.extractAndDisplayQueries(dashboard);
            
        } catch (error) {
            console.error('Error selecting dashboard:', error);
            this.showError('Failed to load dashboard queries: ' + error.message);
        }
    },
    
    // Extract queries from dashboard panels
    extractAndDisplayQueries(dashboard) {
        const queries = [];
        
        // Recursively extract queries from panels
        const extractFromPanels = (panels) => {
            if (!panels) return;
            
            panels.forEach((panel, panelIndex) => {
                if (panel.panels) {
                    // Row panel with sub-panels
                    extractFromPanels(panel.panels);
                } else if (panel.targets) {
                    // Regular panel with queries
                    panel.targets.forEach((target, targetIndex) => {
                        if (target.expr || target.query) {
                            queries.push({
                                id: `panel-${panelIndex}-target-${targetIndex}`,
                                panelTitle: panel.title || `Panel ${panelIndex + 1}`,
                                panelType: panel.type || 'unknown',
                                datasource: target.datasource,
                                query: target.expr || target.query || '',
                                refId: target.refId || 'A',
                                target: target,
                                panel: panel, // Store full panel data
                                panelId: panel.id || panelIndex,
                                dashboardUid: dashboard.uid
                            });
                        }
                    });
                }
            });
        };
        
        extractFromPanels(dashboard.panels);
        
        console.log('Extracted queries:', queries);
        this.renderDashboardQueries(dashboard, queries);
    },
    
    // Render dashboard UI
    renderDashboardUI() {
        // Initial render - results container is already in HTML
        console.log('Rendering dashboard UI');
        const container = document.getElementById('dashboardResults');
        if (container) {
            if (GrafanaConfig.connected) {
                // If connected, load all dashboards
                container.innerHTML = '<div class="dashboard-loading">Loading dashboards...</div>';
                this.loadAllDashboards();
            } else {
                // If not connected, show connect message
                container.innerHTML = '<div class="empty-state">Connect to Grafana to explore dashboards</div>';
            }
        }
    },
    
    // Render dashboard search results
    renderDashboardResults() {
        const container = document.getElementById('dashboardResults');
        if (!container) {
            console.error('Dashboard results container not found');
            return;
        }
        
        let html = '';
        
        if (this.currentDashboards.length === 0) {
            // Show different message based on connection and search state
            const searchInput = document.getElementById('dashboardSearch');
            const hasSearched = searchInput && searchInput.value.trim().length > 0;
            
            if (!GrafanaConfig.connected) {
                html = '<div class="dashboard-empty">Connect to Grafana to explore dashboards</div>';
            } else if (hasSearched) {
                html = '<div class="dashboard-empty">No dashboards found matching your search</div>';
            } else {
                html = '<div class="dashboard-empty">No dashboards available</div>';
            }
        } else {
            // Show count of dashboards
            const searchInput = document.getElementById('dashboardSearch');
            const hasSearched = searchInput && searchInput.value.trim().length > 0;
            const countLabel = hasSearched ? 
                `${this.currentDashboards.length} dashboard${this.currentDashboards.length === 1 ? '' : 's'} found` :
                `${this.currentDashboards.length} dashboard${this.currentDashboards.length === 1 ? '' : 's'}`;
            
            html += `<div class="dashboard-count">${countLabel}</div>`;
            
            for (const dashboard of this.currentDashboards) {
                html += `<div class="dashboard-item" data-dashboard-uid="${dashboard.uid}" onclick="selectDashboard('${dashboard.uid}')">`;
                html += `<div class="dashboard-item-title">${Utils.escapeHtml(dashboard.title)}</div>`;
                if (dashboard.description) {
                    html += `<div class="dashboard-item-description">${Utils.escapeHtml(dashboard.description)}</div>`;
                }
                html += '</div>';
            }
        }
        
        container.innerHTML = html;
    },
    
    // Render dashboard queries in tabs
    renderDashboardQueries(dashboard, queries) {
        const dashboardQueries = document.getElementById('dashboardQueries');
        const dashboardResults = document.getElementById('dashboardResults');
        
        if (!dashboardQueries || !dashboardResults) return;
        
        // Show queries section, hide results
        dashboardQueries.classList.remove('hidden');
        dashboardResults.style.display = 'none';
        
        // Update dashboard info
        document.getElementById('selectedDashboardTitle').textContent = dashboard.title || 'Untitled Dashboard';
        document.getElementById('selectedDashboardDescription').textContent = dashboard.description || 'No description available';
        
        // Update dashboard link
        this.updateDashboardLink(dashboard);
        
        // Render query list
        this.renderQueryList(queries);
    },
    
    // Update dashboard link
    updateDashboardLink(dashboard) {
        const linkContainer = document.getElementById('selectedDashboardLink');
        const linkElement = document.getElementById('dashboardLinkUrl');
        
        if (!linkContainer || !linkElement) return;
        
        // Check if we have the necessary data to construct the URL
        if (GrafanaConfig.url && dashboard.uid) {
            // Remove trailing slash from Grafana URL if present
            const baseUrl = GrafanaConfig.url.replace(/\/$/, '');
            
            // Construct the dashboard URL
            const dashboardUrl = `${baseUrl}/d/${dashboard.uid}/${dashboard.meta?.slug || dashboard.title?.toLowerCase().replace(/\s+/g, '-') || 'dashboard'}`;
            
            // Update the link
            linkElement.href = dashboardUrl;
            linkContainer.classList.remove('hidden');
            
            console.log('Dashboard link created:', dashboardUrl);
        } else {
            // Hide the link if we can't construct the URL
            linkContainer.classList.add('hidden');
            console.warn('Cannot create dashboard link - missing URL or UID:', {
                url: GrafanaConfig.url,
                uid: dashboard.uid
            });
        }
    },
    
    // Render query list
    renderQueryList(queries) {
        const queryList = document.getElementById('dashboardQueryList');
        
        if (!queryList) return;
        
        // Group queries by panel
        const panelGroups = {};
        queries.forEach((query) => {
            const panelKey = `${query.panelId}-${query.panelTitle}`;
            if (!panelGroups[panelKey]) {
                panelGroups[panelKey] = {
                    panelTitle: query.panelTitle,
                    panelType: query.panelType,
                    panelId: query.panelId,
                    queries: []
                };
            }
            panelGroups[panelKey].queries.push(query);
        });
        
        let listHtml = '';
        
        Object.values(panelGroups).forEach(panel => {
            const firstQuery = panel.queries[0];
            const datasourceName = this.resolveDatasourceName(firstQuery.datasource);
            
            listHtml += `
                <div class="panel-group">
                    <div class="panel-header" onclick="togglePanelQueries('${panel.panelId}')">
                        <div class="panel-title-section">
                            <span class="panel-expand-icon" id="expand-${panel.panelId}">▶</span>
                            <span class="panel-title">${Utils.escapeHtml(this.resolveDisplayVariables(panel.panelTitle))}</span>
                            <span class="panel-type-badge">${Utils.escapeHtml(panel.panelType)}</span>
                        </div>
                        <div class="panel-actions">
                            <button class="view-panel-btn" onclick="event.stopPropagation(); viewPanel(${panel.panelId})" title="View Panel">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                </svg>
                                View Panel
                            </button>
                        </div>
                    </div>
                    
                    <div class="panel-queries hidden" id="queries-${panel.panelId}">
                        <div class="panel-info">
                            <span class="panel-datasource">📊 ${Utils.escapeHtml(datasourceName)}</span>
                            <span class="panel-query-count">${panel.queries.length} ${panel.queries.length === 1 ? 'query' : 'queries'}</span>
                        </div>
                        
                        ${panel.queries.map(query => `
                            <div class="query-list-item" data-query-id="${query.id}" onclick="showQueryPreview('${query.id}')">
                                <div class="query-item-header">
                                    <span class="query-refid">${Utils.escapeHtml(query.target.refId || query.refId || 'A')}</span>
                                    ${query.target.hide ? '<span class="query-hidden-badge">Hidden</span>' : ''}
                                </div>
                                <div class="query-preview">
                                    ${Utils.escapeHtml((query.query || '').substring(0, 120))}${(query.query || '').length > 120 ? '...' : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        queryList.innerHTML = listHtml;
        
        // Store queries for preview
        this.currentQueries = queries;
        
        // Clear any existing query preview and show default message
        this.clearQueryPreview();
    },
    
    // Clear query preview and show default message
    clearQueryPreview() {
        const previewContainer = document.getElementById('dashboardQueryPreview');
        const previewContent = document.getElementById('queryPreviewContent');
        
        if (previewContainer && previewContent) {
            previewContent.innerHTML = `
                <div class="query-preview-placeholder">
                    <div class="placeholder-icon">📊</div>
                    <div class="placeholder-text">Select a panel to view its details</div>
                    <div class="placeholder-subtext">Click on a panel above to see its queries and configuration</div>
                </div>
            `;
            previewContainer.classList.remove('hidden');
        }
    },
    
    // Show error message
    showError(message) {
        const container = document.getElementById('dashboardResults');
        if (container) {
            container.innerHTML = `<div class="dashboard-empty" style="color: #f87171;">${Utils.escapeHtml(message)}</div>`;
        }
    },
    
    // Clear search
    clearSearch() {
        document.getElementById('dashboardSearch').value = '';
        this.currentDashboards = [];
        this.selectedDashboard = null;
        
        // Hide queries section, show results
        const dashboardQueries = document.getElementById('dashboardQueries');
        const dashboardResults = document.getElementById('dashboardResults');
        
        if (dashboardQueries) {
            dashboardQueries.classList.add('hidden');
        }
        
        if (dashboardResults) {
            dashboardResults.style.display = '';
        }
        
        this.renderDashboardResults();
    },
    
    // Helper function to resolve datasource UID to name
    resolveDatasourceName(datasource) {
        if (!datasource) return 'Unknown';
        
        // If it's already an object, check if it has a name, otherwise look up by uid
        if (typeof datasource === 'object') {
            if (datasource.name) {
                return datasource.name;
            }
            // If object has uid but no name, look up the name
            if (datasource.uid) {
                return this.lookupDatasourceNameByUid(datasource.uid);
            }
            return datasource.uid || 'Unknown';
        }
        
        // If it's a string (UID), look it up in the available datasources
        if (typeof datasource === 'string') {
            return this.lookupDatasourceNameByUid(datasource);
        }
        
        return 'Unknown';
    },
    
    // Helper method to look up datasource name by UID
    lookupDatasourceNameByUid(uid) {
        // Try to find the datasource in the global config
        if (GrafanaConfig.datasources && GrafanaConfig.datasources.length > 0) {
            const ds = GrafanaConfig.datasources.find(d => d.uid === uid);
            if (ds) {
                return ds.name;
            }
        }
        
        // Try to find it in the DOM elements
        const datasourceItem = document.querySelector(`[data-uid="${uid}"]`);
        if (datasourceItem && datasourceItem.dataset.name) {
            return datasourceItem.dataset.name;
        }
        
        // Fallback to the UID itself
        return uid;
    },
    
    // Show panel viewer modal
    showPanelViewer(query) {
        const panel = query.panel;
        console.log('Showing panel viewer for:', panel);
        
        // Create modal HTML
        const modalHtml = `
            <div class="modal-overlay active" id="panelViewerModal">
                <div class="modal panel-viewer-modal">
                    <div class="modal-header">
                        <h3>${Utils.escapeHtml(this.resolveDisplayVariables(panel.title) || 'Panel Viewer')}</h3>
                        <button class="modal-close" onclick="Dashboard.closePanelViewer()">×</button>
                    </div>
                    <div class="modal-content panel-viewer-content">
                        <div class="panel-viewer-info">
                            <div class="panel-info-item">
                                <strong>Panel Type:</strong> ${Utils.escapeHtml(panel.type || 'Unknown')}
                            </div>
                            <div class="panel-info-item">
                                <strong>Panel ID:</strong> ${panel.id || 'N/A'}
                            </div>
                        </div>
                        <div class="panel-viewer-body" id="panelViewerBody">
                            <!-- Panel content will be rendered here -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary-button" onclick="Dashboard.closePanelViewer()">Close</button>
                        <button class="primary-button" onclick="Dashboard.renderPanelInGrafana('${query.dashboardUid}', ${panel.id})">
                            Open in Grafana
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // Render panel content
        this.renderPanelContent(query);
    },
    
    // Close panel viewer modal
    closePanelViewer() {
        const modal = document.getElementById('panelViewerModal');
        if (modal) {
            modal.remove();
        }
    },
    
    // Render panel content based on type
    renderPanelContent(query) {
        const panel = query.panel;
        const container = document.getElementById('panelViewerBody');
        if (!container) return;
        
        // Show loading state
        container.innerHTML = '<div class="panel-loading">Loading panel data...</div>';
        
        // Depending on panel type, render appropriate visualization
        switch (panel.type) {
            case 'graph':
            case 'timeseries':
                this.renderTimeSeriesPanel(query, container);
                break;
            case 'stat':
            case 'singlestat':
                this.renderStatPanel(query, container);
                break;
            case 'table':
                this.renderTablePanel(query, container);
                break;
            case 'gauge':
                this.renderGaugePanel(query, container);
                break;
            case 'text':
                this.renderTextPanel(panel, container);
                break;
            default:
                this.renderGenericPanel(query, container);
        }
    },
    
    // Render time series panel
    async renderTimeSeriesPanel(query, container) {
        console.log('📈 renderTimeSeriesPanel called');
        console.log('📈 Query:', query);
        console.log('📈 Container:', container);
        
        try {
            console.log('📈 Executing panel query...');
            // Execute the query to get data
            const results = await this.executePanelQuery(query);
            console.log('📈 Query results:', results);
            
            if (results && results.data) {
                console.log('📈 Results data found, setting up chart container...');
                // Render chart using our existing charting infrastructure
                container.innerHTML = '<div class="panel-chart-container"><canvas id="panelChart" width="400" height="200"></canvas></div>';
                
                setTimeout(() => {
                    console.log('📈 Looking for canvas element...');
                    const canvas = document.getElementById('panelChart');
                    console.log('📈 Canvas found:', !!canvas);
                    
                    if (canvas) {
                        console.log('📈 Calling renderPanelChart...');
                        this.renderPanelChart(canvas, results.data, query.panel);
                    } else {
                        console.error('📈 Canvas element not found!');
                        container.innerHTML = '<div class="panel-error">Chart canvas not found</div>';
                    }
                }, 100);
            } else {
                console.log('📈 No results data found');
                container.innerHTML = '<div class="panel-no-data">No data available</div>';
            }
        } catch (error) {
            console.error('❌ Error rendering time series panel:', error);
            container.innerHTML = '<div class="panel-error">Error loading panel data: ' + Utils.escapeHtml(error.message) + '</div>';
        }
    },
    
    // Render stat panel
    async renderStatPanel(query, container) {
        console.log('📊 renderStatPanel called');
        console.log('📊 Query:', query);
        console.log('📊 Container:', container);
        
        // Show loading state
        container.innerHTML = '<div class="panel-loading">Loading panel data...</div>';
        
        try {
            console.log('📊 Executing panel query...');
            const results = await this.executePanelQuery(query);
            console.log('📊 Query results:', results);
            
            if (results && results.data) {
                console.log('📊 Results data found, calculating stat value...');
                // Calculate stat value
                const statValue = this.calculateStatValue(results.data, query.panel);
                console.log('📊 Calculated stat value:', statValue);
                
                const html = `
                    <div class="panel-stat">
                        <div class="stat-value">${Utils.escapeHtml(statValue.value)}</div>
                        <div class="stat-unit">${Utils.escapeHtml(statValue.unit || '')}</div>
                    </div>
                `;
                console.log('📊 Setting HTML:', html);
                container.innerHTML = html;
                console.log('📊 Stat panel rendered successfully');
            } else {
                console.log('📊 No results data found');
                container.innerHTML = '<div class="panel-no-data">No data available</div>';
            }
        } catch (error) {
            console.error('❌ Error rendering stat panel:', error);
            container.innerHTML = '<div class="panel-error">Error loading panel data: ' + Utils.escapeHtml(error.message) + '</div>';
        }
    },
    
    // Render table panel
    async renderTablePanel(query, container) {
        try {
            const results = await this.executePanelQuery(query);
            
            if (results && results.data) {
                // Use our existing table rendering
                container.innerHTML = '<div class="panel-table-wrapper"></div>';
                const tableWrapper = container.querySelector('.panel-table-wrapper');
                this.renderPanelTable(tableWrapper, results.data, query.panel);
            } else {
                container.innerHTML = '<div class="panel-no-data">No data available</div>';
            }
        } catch (error) {
            console.error('Error rendering table panel:', error);
            container.innerHTML = '<div class="panel-error">Error loading panel data: ' + Utils.escapeHtml(error.message) + '</div>';
        }
    },
    
    // Render gauge panel
    async renderGaugePanel(query, container) {
        // Similar to stat panel but with gauge visualization
        this.renderStatPanel(query, container);
    },
    
    // Render text panel
    renderTextPanel(panel, container) {
        const content = panel.options?.content || panel.content || 'No content';
        container.innerHTML = `<div class="panel-text">${content}</div>`;
    },
    
    // Render generic panel
    async renderGenericPanel(query, container) {
        container.innerHTML = `
            <div class="panel-generic">
                <p>Panel type "${Utils.escapeHtml(query.panel.type)}" preview not implemented.</p>
                <p>Query: <code>${Utils.escapeHtml(query.query)}</code></p>
                <details>
                    <summary>Panel Configuration</summary>
                    <pre>${JSON.stringify(query.panel, null, 2)}</pre>
                </details>
            </div>
        `;
    },
    
    // Get dashboard time range and convert to InfluxQL timestamps
    getDashboardTimeRange() {
        // Try to get time range from the selected dashboard
        let fromTime = 'now-1h';  // Default
        let toTime = 'now';       // Default
        
        // Check if we have a selected dashboard with time range
        if (this.selectedDashboard && this.selectedDashboard.time) {
            fromTime = this.selectedDashboard.time.from || fromTime;
            toTime = this.selectedDashboard.time.to || toTime;
        }
        
        console.log('🕐 Dashboard time range:', { from: fromTime, to: toTime });
        
        // Convert Grafana-style relative times to ISO timestamps
        const now = new Date();
        const fromTimestamp = this.parseGrafanaTime(fromTime, now);
        const toTimestamp = this.parseGrafanaTime(toTime, now);
        
        return {
            from: fromTimestamp,
            to: toTimestamp,
            grafanaFrom: fromTime,
            grafanaTo: toTime
        };
    },
    
    // Parse Grafana time expressions to millisecond timestamps (like Grafana uses)
    parseGrafanaTime(timeExpr, referenceTime = new Date()) {
        if (timeExpr === 'now') {
            return referenceTime.getTime().toString();
        }
        
        // Handle relative time expressions like "now-1h", "now-24h", "now-7d"
        const relativeMatch = timeExpr.match(/^now-(\d+)([hmsdwMy])$/);
        if (relativeMatch) {
            const amount = parseInt(relativeMatch[1]);
            const unit = relativeMatch[2];
            
            const time = new Date(referenceTime);
            
            switch (unit) {
                case 's': time.setSeconds(time.getSeconds() - amount); break;
                case 'm': time.setMinutes(time.getMinutes() - amount); break;
                case 'h': time.setHours(time.getHours() - amount); break;
                case 'd': time.setDate(time.getDate() - amount); break;
                case 'w': time.setDate(time.getDate() - (amount * 7)); break;
                case 'M': time.setMonth(time.getMonth() - amount); break;
                case 'y': time.setFullYear(time.getFullYear() - amount); break;
                default: 
                    console.warn('Unknown time unit:', unit);
                    time.setHours(time.getHours() - 1); // Default to 1 hour
            }
            
            return time.getTime().toString();
        }
        
        // Handle absolute time expressions
        if (timeExpr.includes('T') || timeExpr.includes('-')) {
            try {
                return new Date(timeExpr).getTime().toString();
            } catch (e) {
                console.warn('Could not parse absolute time:', timeExpr);
            }
        }
        
        // Fallback - treat as relative to 1 hour ago
        console.warn('Could not parse time expression, using fallback:', timeExpr);
        const fallback = new Date(referenceTime);
        fallback.setHours(fallback.getHours() - 1);
        return fallback.getTime().toString();
    },
    
    // Resolve template variables in display text (like titles)
    resolveDisplayVariables(text) {
        if (!text) return text;
        
        const dashboardVariables = this.getDashboardVariables();
        let resolvedText = text;
        
        Object.entries(dashboardVariables).forEach(([varName, varValue]) => {
            // Handle both $varName and ${varName} formats
            const regex1 = new RegExp(`\\$${varName}\\b`, 'g');
            const regex2 = new RegExp(`\\$\\{${varName}\\}`, 'g');
            
            resolvedText = resolvedText.replace(regex1, varValue);
            resolvedText = resolvedText.replace(regex2, varValue);
        });
        
        return resolvedText;
    },
    
    // Resolve template variables in query
    resolveTemplateVariables(queryString, timeRange) {
        console.log('🔧 Resolving template variables in query:', queryString);
        
        let resolvedQuery = queryString;
        
        // 1. Resolve built-in Grafana variables
        const timeFilter = `time >= ${timeRange.from}ms and time <= ${timeRange.to}ms`;
        resolvedQuery = resolvedQuery.replace(/\$timeFilter/g, timeFilter);
        
        // Handle $__interval - use dashboard's refresh interval
        let interval = '1m'; // default fallback
        if (this.selectedDashboard && this.selectedDashboard.refresh) {
            interval = this.selectedDashboard.refresh;
            console.log('🔧 Using dashboard refresh interval:', interval);
        }
        resolvedQuery = resolvedQuery.replace(/\$__interval/g, interval);
        
        console.log('🔧 After built-in variables:', resolvedQuery);
        
        // 2. Resolve dashboard template variables
        const dashboardVariables = this.getDashboardVariables();
        console.log('🔧 Dashboard variables found:', dashboardVariables);
        
        Object.entries(dashboardVariables).forEach(([varName, varValue]) => {
            // Handle both $varName and ${varName} formats
            const regex1 = new RegExp(`\\$${varName}\\b`, 'g');
            const regex2 = new RegExp(`\\$\\{${varName}\\}`, 'g');
            
            resolvedQuery = resolvedQuery.replace(regex1, varValue);
            resolvedQuery = resolvedQuery.replace(regex2, varValue);
            
            console.log(`🔧 Replaced $${varName} with "${varValue}"`);
        });
        
        console.log('🔧 Final resolved query:', resolvedQuery);
        return resolvedQuery;
    },
    
    // Extract template variables from dashboard
    getDashboardVariables() {
        const variables = {};
        
        console.log('🔧 Getting dashboard variables from:', this.selectedDashboard?.title);
        
        // Try to get variables from the selected dashboard
        if (this.selectedDashboard && this.selectedDashboard.templating && this.selectedDashboard.templating.list) {
            console.log('🔧 Found templating.list with', this.selectedDashboard.templating.list.length, 'variables');
            
            this.selectedDashboard.templating.list.forEach(variable => {
                if (variable.name && variable.current) {
                    // Use the current value of the variable
                    let value = variable.current.value;
                    
                    // Handle different value formats
                    if (Array.isArray(value)) {
                        // Multi-select variables - use first value or join
                        value = value.length > 0 ? value[0] : '';
                    } else if (typeof value === 'object' && value !== null) {
                        // Object format - try to get text or value
                        value = variable.current.text || '';
                    } else if (!value) {
                        // Fallback to text if value is empty
                        value = variable.current.text || '';
                    }
                    
                    variables[variable.name] = String(value);
                    console.log(`🔧 Dashboard variable: ${variable.name} = "${variables[variable.name]}" (type: ${variable.type})`);
                }
            });
        } else {
            console.log('🔧 No dashboard templating found');
        }
        
        // Include any manually created variables (only as fallbacks)
        if (window.QueryVariables) {
            Object.entries(window.QueryVariables).forEach(([name, value]) => {
                if (!variables[name]) {
                    variables[name] = value;
                    console.log(`🔧 Using fallback created variable: ${name} = "${value}"`);
                }
            });
        }
        
        console.log('🔧 All resolved variables:', variables);
        return variables;
    },
    
    // Extract variables from query and create them if they don't exist
    createVariablesFromQuery(queryString) {
        console.log('🔧 Creating variables from query:', queryString);
        
        // Find all variables in the query (both $var and ${var} formats)
        const variableMatches = queryString.match(/\$\{?(\w+)\}?/g) || [];
        const variableNames = [...new Set(variableMatches.map(match => {
            // Extract variable name, removing $ and optional {}
            return match.replace(/\$\{?(\w+)\}?/, '$1');
        }))];
        
        console.log('🔧 Found variables in query:', variableNames);
        
        // Get current dashboard variables to see what we already have
        const dashboardVariables = this.getDashboardVariables();
        const createdVariables = [];
        
        variableNames.forEach(varName => {
            // Skip built-in Grafana variables
            if (varName.startsWith('__') || varName === 'timeFilter') {
                return;
            }
            
            // If variable doesn't exist in dashboard, create a fallback
            if (!dashboardVariables[varName]) {
                let defaultValue = '';
                let isGuessed = true;
                
                // Try to infer from dashboard context first
                if (this.selectedDashboard) {
                    // Check if there are similar variable names
                    const similarVar = Object.keys(dashboardVariables).find(name => 
                        name.toLowerCase().includes(varName.toLowerCase()) || 
                        varName.toLowerCase().includes(name.toLowerCase())
                    );
                    
                    if (similarVar) {
                        defaultValue = dashboardVariables[similarVar];
                        isGuessed = false;
                        console.log(`🔧 Using similar dashboard variable ${similarVar} for ${varName}`);
                    }
                }
                
                // If no similar variable found, use educated guesses
                if (isGuessed) {
                    switch (varName.toLowerCase()) {
                        case 'service':
                            defaultValue = 'ec2';
                            break;
                        case 'environment':
                        case 'env':
                            defaultValue = 'production';
                            break;
                        case 'region':
                            defaultValue = 'us-west-2';
                            break;
                        case 'instance':
                            defaultValue = 'i-123456789';
                            break;
                        case 'cluster':
                            defaultValue = 'default';
                            break;
                        default:
                            defaultValue = 'UNKNOWN';
                    }
                    
                    console.warn(`⚠️ Variable ${varName} not found in dashboard, using fallback: "${defaultValue}"`);
                }
                
                // Create the fallback variable
                if (!window.QueryVariables) {
                    window.QueryVariables = {};
                }
                
                window.QueryVariables[varName] = defaultValue;
                createdVariables.push({ 
                    name: varName, 
                    value: defaultValue, 
                    isGuessed: isGuessed 
                });
                
                console.log(`🔧 Created fallback variable: ${varName} = "${defaultValue}"`);
            } else {
                console.log(`✅ Variable ${varName} found in dashboard: "${dashboardVariables[varName]}"`);
            }
        });
        
        // Always update the Variables panel to show available variables
        this.updateVariablesPanel();
        
        if (createdVariables.length > 0) {
            const guessedVars = createdVariables.filter(v => v.isGuessed);
            const inferredVars = createdVariables.filter(v => !v.isGuessed);
            
            if (guessedVars.length > 0) {
                const guessedList = guessedVars.map(v => `${v.name}="${v.value}"`).join(', ');
                Interface.showToast(`⚠️ Created fallback variables: ${guessedList}. Please verify values!`, 'warning', 8000);
            }
            
            if (inferredVars.length > 0) {
                const inferredList = inferredVars.map(v => `${v.name}="${v.value}"`).join(', ');
                Interface.showToast(`✅ Inferred variables: ${inferredList}`, 'success', 5000);
            }
        }
        
        return createdVariables;
    },
    
    // Update the Variables panel to show created variables
    updateVariablesPanel() {
        const container = document.getElementById('variablesContainer');
        if (!container) return;
        
        const allVariables = this.getDashboardVariables();
        
        if (Object.keys(allVariables).length === 0) {
            container.innerHTML = '<div class="empty-state">No variables defined</div>';
            return;
        }
        
        let html = '<div class="variables-list">';
        
        Object.entries(allVariables).forEach(([name, value]) => {
            const isCreated = window.QueryVariables && window.QueryVariables[name];
            const sourceLabel = isCreated ? 'Auto-created' : 'Dashboard';
            
            html += `
                <div class="variable-item ${isCreated ? 'auto-created' : 'dashboard'}">
                    <div class="variable-header">
                        <span class="variable-name">$${name}</span>
                        <span class="variable-source">${sourceLabel}</span>
                    </div>
                    <div class="variable-value">
                        <input type="text" value="${Utils.escapeHtml(value)}" 
                               onchange="Dashboard.updateVariable('${name}', this.value)"
                               class="variable-input" />
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    // Update a variable value
    updateVariable(name, value) {
        if (window.QueryVariables) {
            window.QueryVariables[name] = value;
            console.log(`🔧 Updated variable: ${name} = "${value}"`);
            Interface.showToast(`Updated variable: ${name}="${value}"`, 'success');
        }
    },
    
    // Initialize query preview resizer
    initializeQueryPreviewResizer() {
        const preview = document.getElementById('dashboardQueryPreview');
        if (!preview) return;
        
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;
        
        // Create a resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'query-preview-resize-handle';
        resizeHandle.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            cursor: ns-resize;
            z-index: 10;
            background: transparent;
        `;
        
        preview.style.position = 'relative';
        preview.appendChild(resizeHandle);
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = parseInt(window.getComputedStyle(preview).height, 10);
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            // Prevent text selection during resize
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        
        function handleMouseMove(e) {
            if (!isResizing) return;
            
            const deltaY = startY - e.clientY; // Inverted because we want to resize from top
            const newHeight = Math.max(80, Math.min(window.innerHeight * 0.6, startHeight + deltaY));
            
            preview.style.height = newHeight + 'px';
            preview.style.maxHeight = newHeight + 'px';
        }
        
        function handleMouseUp() {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        }
        
        // Add hover effect
        resizeHandle.addEventListener('mouseenter', () => {
            resizeHandle.style.background = 'rgba(0, 122, 204, 0.3)';
        });
        
        resizeHandle.addEventListener('mouseleave', () => {
            if (!isResizing) {
                resizeHandle.style.background = 'transparent';
            }
        });
    },
    
    // Execute panel query
    async executePanelQuery(query) {
        console.log('🔍 executePanelQuery called with query:', query);
        console.log('🔍 Panel structure:', query.panel);
        console.log('🔍 Panel targets:', query.panel?.targets);
        console.log('🔍 Number of targets:', query.panel?.targets?.length);
        
        // Reuse our existing query execution logic
        const datasourceUid = this.resolveDatasourceUid(query.datasource);
        
        if (!datasourceUid) {
            throw new Error('Datasource not found');
        }
        
        console.log('📊 Using datasource UID:', datasourceUid);
        
        // Resolve template variables in the query
        let resolvedQuery = query.query || query.target.query || '';
        
        // Get proper time range - look for dashboard time range or use default
        const timeRange = this.getDashboardTimeRange();
        
        console.log('🕐 Using time range:', timeRange);
        
        // Resolve template variables
        resolvedQuery = this.resolveTemplateVariables(resolvedQuery, timeRange);
        
        console.log('🔄 Original query:', query.query);
        console.log('🔄 Resolved query:', resolvedQuery);
        
        // Check if this is a complex panel with multiple targets
        let queries = [];
        
        if (query.panel && query.panel.targets && query.panel.targets.length > 0) {
            console.log('🎯 Panel with', query.panel.targets.length, 'targets detected');
            console.log('🎯 All targets:', query.panel.targets);
            
            // Log each target in detail
            query.panel.targets.forEach((target, index) => {
                console.log(`🎯 Target ${index}:`, {
                    refId: target.refId,
                    query: target.query,
                    rawSql: target.rawSql,
                    expr: target.expr,
                    expression: target.expression,
                    hide: target.hide,
                    datasource: target.datasource,
                    // Log all properties to see what we're missing
                    allProperties: Object.keys(target)
                });
            });
            
            // Execute all targets for complex panels
            // Include ALL targets that have query content, even if hidden
            // Hidden queries are needed when expressions reference them
            queries = query.panel.targets
                .filter(target => (target.query || target.rawSql || target.expr || target.expression))
                .map((target, index) => {
                    let targetQuery = target.query || target.rawSql || target.expr || target.expression || '';
                    
                    // Resolve template variables for each target
                    targetQuery = this.resolveTemplateVariables(targetQuery, timeRange);
                    
                    console.log(`🎯 Target ${target.refId || index} (${target.hide ? 'hidden' : 'visible'}) query:`, targetQuery);
                    
                    return {
                        refId: target.refId || String.fromCharCode(65 + index), // A, B, C, D, E...
                        query: targetQuery,
                        rawQuery: true,
                        resultFormat: target.resultFormat || "time_series",
                        datasource: {
                            type: target.datasource?.type || 'influxdb',
                            uid: this.resolveDatasourceUid(target.datasource) || datasourceUid
                        },
                        intervalMs: target.intervalMs || 60000,
                        maxDataPoints: target.maxDataPoints || 1170,
                        hide: target.hide || false,
                        // Include additional fields from the original target, preserving existing structure
                        ...target,
                        // Override with our processed values
                        query: targetQuery,
                        datasource: {
                            type: target.datasource?.type || 'influxdb',
                            uid: this.resolveDatasourceUid(target.datasource) || datasourceUid
                        }
                    };
                });
        } else {
            // Single target panel
            queries = [{
                refId: query.target.refId || 'A',
                expr: query.target.expr,
                query: resolvedQuery,
                rawSql: resolvedQuery,
                datasource: {
                    type: query.target.datasource?.type || 'influxdb',
                    uid: datasourceUid
                },
                intervalMs: 60000,
                maxDataPoints: 1000,
                // Include target properties but override the query
                ...query.target,
                query: resolvedQuery,
                rawSql: resolvedQuery
            }];
        }
        
        // Build query request matching Grafana's expected format
        const queryRequest = {
            queries: queries,
            range: {
                from: timeRange.grafanaFrom,
                to: timeRange.grafanaTo
            },
            from: timeRange.grafanaFrom,
            to: timeRange.grafanaTo
        };
        
        console.log('📤 Sending panel query request:', queryRequest);
        console.log('📤 Query request JSON:', JSON.stringify(queryRequest, null, 2));
        
        const data = await DataAccess.request('/api/ds/query', {
            method: 'POST',
            body: queryRequest
        });
        
        console.log('✅ DataAccess response data:', data);
        
        // Additional debugging for empty results
        if (data.results) {
            Object.entries(data.results).forEach(([key, result]) => {
                console.log(`📊 Result ${key} detailed:`, {
                    status: result.status,
                    frameCount: result.frames?.length,
                    error: result.error,
                    message: result.message
                });
            });
        }
        
        return { data };
    },
    
    // Resolve datasource UID
    resolveDatasourceUid(datasource) {
        if (typeof datasource === 'string') {
            return datasource;
        }
        if (datasource && datasource.uid) {
            return datasource.uid;
        }
        return null;
    },
    
    // Calculate stat value from data
    calculateStatValue(data, panel) {
        console.log('🧮 calculateStatValue called');
        console.log('🧮 Data structure:', JSON.stringify(data, null, 2));
        console.log('🧮 Panel:', panel);
        
        // Handle the actual Grafana API response structure: data.results.A/B/C etc.
        if (data.results) {
            console.log('🧮 Found results object, keys:', Object.keys(data.results));
            
            // For complex panels, prioritize non-hidden results or the final calculation
            const resultKeys = Object.keys(data.results);
            const priorityKeys = [
                'Success Rate Calculation',  // Math expression result
                ...resultKeys.filter(k => !k.match(/^[A-D]$/)),  // Non-letter keys
                ...resultKeys.reverse()  // Then reverse order (E, D, C, B, A)
            ];
            
            console.log('🧮 Checking results in priority order:', priorityKeys);
            
            // Try to find any result with frames that have data
            for (const key of priorityKeys) {
                if (!data.results[key]) continue;
                
                const result = data.results[key];
                console.log(`🧮 Checking result ${key}:`, result);
                
                if (result.status === 200 && result.frames && result.frames.length > 0) {
                    console.log(`🧮 Result ${key} has ${result.frames.length} frames`);
                    
                    for (let i = 0; i < result.frames.length; i++) {
                        const frame = result.frames[i];
                        console.log(`🧮 Frame ${i}:`, frame);
                        
                        if (frame.data && frame.data.values && frame.data.values.length > 0) {
                            console.log(`🧮 Frame ${i} has data values, count:`, frame.data.values.length);
                            
                            // Look for the last non-time column with data
                            for (let col = frame.data.values.length - 1; col >= 0; col--) {
                                const columnValues = frame.data.values[col];
                                console.log(`🧮 Column ${col} values:`, columnValues);
                                
                                if (columnValues && columnValues.length > 0) {
                                    // Check if this is a time column (skip it)
                                    const fieldType = frame.schema?.fields?.[col]?.type;
                                    console.log(`🧮 Column ${col} field type:`, fieldType);
                                    
                                    if (fieldType !== 'time') {
                                        const lastValue = columnValues[columnValues.length - 1];
                                        console.log(`🧮 Using last value from result ${key}, column ${col}:`, lastValue);
                                        
                                        if (lastValue !== null && lastValue !== undefined) {
                                            const calculatedResult = {
                                                value: this.formatValue(lastValue, panel),
                                                unit: panel.fieldConfig?.defaults?.unit || ''
                                            };
                                            console.log('🧮 Calculated result:', calculatedResult);
                                            return calculatedResult;
                                        }
                                    }
                                }
                            }
                        } else {
                            console.log(`🧮 Frame ${i} has no data or empty values`);
                        }
                    }
                } else {
                    console.log(`🧮 Result ${key} status: ${result.status}, frame count: ${result.frames?.length || 0}, error: ${result.error}`);
                }
            }
        }
        
        console.log('🧮 No usable data found in any result, returning N/A');
        return { value: 'No Data', unit: '' };
    },
    
    // Format value based on panel settings
    formatValue(value, panel) {
        if (value === null || value === undefined) return 'null';
        
        // Check for decimals setting
        const decimals = panel.fieldConfig?.defaults?.decimals;
        if (typeof value === 'number' && decimals !== undefined) {
            return value.toFixed(decimals);
        }
        
        return String(value);
    },
    
    // Render panel chart
    renderPanelChart(canvas, data, panel) {
        console.log('📊 renderPanelChart called');
        console.log('📊 Canvas:', canvas);
        console.log('📊 Data:', data);
        console.log('📊 Panel:', panel);
        
        try {
            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
                console.error('📊 Chart.js not available');
                canvas.parentElement.innerHTML = '<div class="panel-error">Chart.js library not loaded</div>';
                return;
            }
            
            console.log('📊 Chart.js available');
            
            // Transform data to frames format 
            const frames = this.transformDataToFrames(data, panel);
            console.log('📊 Transformed frames:', frames);
            console.log('📊 Frame count:', frames.length);
            
            if (frames.length === 0) {
                console.error('📊 No frames available for chart');
                canvas.parentElement.innerHTML = '<div class="panel-error">No chart data available</div>';
                return;
            }
            
            console.log('📊 Processing frames for panel chart...');
            
            // Create datasets from frames
            const datasets = [];
            const allTimePoints = [];
            let timeLabels = [];
            
            frames.forEach((frame, frameIndex) => {
                console.log(`📊 Processing frame ${frameIndex}:`, frame);
                
                if (!frame || !frame.data || !frame.data.values) {
                    console.log(`📊 Frame ${frameIndex} has no data, skipping`);
                    return;
                }
                
                // Find time and value columns
                const timeFieldIndex = frame.schema.fields.findIndex(field => field.type === 'time');
                const valueFieldIndex = frame.schema.fields.findIndex(field => field.type === 'number' && field.name !== 'time');
                
                console.log(`📊 Frame ${frameIndex} field indices - time: ${timeFieldIndex}, value: ${valueFieldIndex}`);
                
                if (timeFieldIndex === -1 || valueFieldIndex === -1) {
                    console.log(`📊 Frame ${frameIndex} missing required fields, skipping`);
                    return;
                }
                
                const timeData = frame.data.values[timeFieldIndex];
                const valueData = frame.data.values[valueFieldIndex];
                
                console.log(`📊 Frame ${frameIndex} data lengths - time: ${timeData?.length}, value: ${valueData?.length}`);
                
                if (!timeData || !valueData) {
                    console.log(`📊 Frame ${frameIndex} has null data arrays, skipping`);
                    return;
                }
                
                // Create data points
                const dataPoints = [];
                const frameTimePoints = [];
                
                for (let i = 0; i < Math.min(timeData.length, valueData.length); i++) {
                    if (timeData[i] !== null && valueData[i] !== null) {
                        const timestamp = new Date(timeData[i]);
                        if (!isNaN(timestamp.getTime())) {
                            dataPoints.push(valueData[i]);
                            frameTimePoints.push(timestamp);
                        }
                    }
                }
                
                console.log(`📊 Frame ${frameIndex} created ${dataPoints.length} valid data points`);
                
                if (dataPoints.length === 0) {
                    console.log(`📊 Frame ${frameIndex} has no valid data points, skipping`);
                    return;
                }
                
                // Sort data points by time
                const sortedData = dataPoints.map((value, index) => ({
                    time: frameTimePoints[index], 
                    value: value
                })).sort((a, b) => a.time.getTime() - b.time.getTime());
                
                const sortedValues = sortedData.map(item => item.value);
                const sortedTimes = sortedData.map(item => item.time);
                
                // Add to all time points
                sortedTimes.forEach(time => {
                    const timeStr = time.toISOString();
                    if (allTimePoints.indexOf(timeStr) === -1) {
                        allTimePoints.push(timeStr);
                    }
                });
                
                // Use ChartColors if available, otherwise fallback
                const colors = window.ChartColors || ['#007acc', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
                const color = colors[frameIndex % colors.length];
                
                // Generate series name
                let seriesName = `Series ${frameIndex + 1}`;
                if (frame.schema?.fields?.[valueFieldIndex]?.labels) {
                    const labels = frame.schema.fields[valueFieldIndex].labels;
                    seriesName = Object.keys(labels).map(key => `${key}=${labels[key]}`).join(', ') || seriesName;
                } else if (frame.schema?.fields?.[valueFieldIndex]?.name) {
                    seriesName = frame.schema.fields[valueFieldIndex].name;
                }
                
                console.log(`📊 Frame ${frameIndex} series name: ${seriesName}`);
                
                datasets.push({
                    label: seriesName,
                    data: sortedValues,
                    borderColor: color,
                    backgroundColor: color + '33',
                    pointBackgroundColor: color,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointHoverBorderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    borderWidth: 2,
                    timeData: sortedTimes
                });
            });
            
            console.log(`📊 Created ${datasets.length} datasets`);
            
            if (datasets.length === 0) {
                console.error('📊 No valid datasets created');
                canvas.parentElement.innerHTML = '<div class="panel-error">No valid data for chart</div>';
                return;
            }
            
            // Sort all time points and create labels
            allTimePoints.sort();
            timeLabels = allTimePoints.map(timeStr => {
                const date = new Date(timeStr);
                const now = new Date();
                const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                
                if (diffHours < 24) {
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else if (diffHours < 24 * 7) {
                    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
                           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                }
            });
            
            console.log(`📊 Created ${timeLabels.length} time labels`);
            
            // Align all datasets to the same time points
            datasets.forEach(dataset => {
                const paddedData = [];
                const datasetTimes = dataset.timeData.map(time => time.toISOString());
                
                allTimePoints.forEach(timePoint => {
                    const index = datasetTimes.indexOf(timePoint);
                    paddedData.push(index >= 0 ? dataset.data[index] : null);
                });
                
                dataset.data = paddedData;
                delete dataset.timeData; // Clean up temporary data
            });
            
            console.log('📊 Aligned datasets to time points');
            
            // Destroy existing chart instance for this canvas
            if (canvas.chartInstance) {
                console.log('📊 Destroying existing chart instance');
                canvas.chartInstance.destroy();
                canvas.chartInstance = null;
            }
            
            // Get canvas context
            const ctx = canvas.getContext('2d');
            
            // Create chart configuration
            const config = {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: datasets.length > 1,
                            labels: {
                                color: '#cccccc',
                                usePointStyle: true,
                                padding: 15,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: '#2d2d30',
                            titleColor: '#007acc',
                            bodyColor: '#cccccc',
                            borderColor: '#007acc',
                            borderWidth: 1,
                            cornerRadius: 4,
                            callbacks: {
                                title: function(context) {
                                    const timeStr = allTimePoints[context[0].dataIndex];
                                    return new Date(timeStr).toLocaleString();
                                },
                                label: function(context) {
                                    return context.dataset.label + ': ' + (context.parsed.y !== null ? context.parsed.y.toFixed(2) : 'N/A');
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'category',
                            grid: { color: '#3c3c3c', borderColor: '#3c3c3c' },
                            ticks: { 
                                color: '#cccccc',
                                maxRotation: 45,
                                minRotation: 0,
                                font: { size: 11 }
                            },
                            title: {
                                display: true,
                                text: 'Time',
                                color: '#cccccc',
                                font: { size: 12, weight: 'normal' }
                            }
                        },
                        y: {
                            grid: { color: '#3c3c3c', borderColor: '#3c3c3c' },
                            ticks: { 
                                color: '#cccccc',
                                font: { size: 11 }
                            },
                            title: {
                                display: true,
                                text: 'Value',
                                color: '#cccccc',
                                font: { size: 12, weight: 'normal' }
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    spanGaps: true
                }
            };
            
            // Create the chart
            console.log('📊 Creating chart instance...');
            canvas.chartInstance = new Chart(ctx, config);
            console.log('📊 Panel chart created successfully');
            
        } catch (error) {
            console.error('📊 Error creating panel chart:', error);
            canvas.parentElement.innerHTML = '<div class="panel-error">Chart error: ' + Utils.escapeHtml(error.message) + '</div>';
        }
    },
    
    // Transform data to frames format expected by Charts module
    transformDataToFrames(data, panel) {
        console.log('📊 transformDataToFrames called with data:', data);
        
        // Handle different data formats from Grafana API
        if (data.results) {
            console.log('📊 Data has results structure');
            // Multiple results format: data.results[refId].frames
            let allFrames = [];
            Object.values(data.results).forEach((result, index) => {
                console.log(`📊 Processing result ${index}:`, result);
                if (result.frames && Array.isArray(result.frames)) {
                    console.log(`📊 Result ${index} has ${result.frames.length} frames`);
                    allFrames = allFrames.concat(result.frames);
                }
            });
            console.log(`📊 Total frames collected: ${allFrames.length}`);
            return allFrames;
        }
        
        // Direct frames format
        if (data.frames && Array.isArray(data.frames)) {
            console.log('📊 Data has direct frames structure');
            return data.frames;
        }
        
        // Legacy data format
        if (data.data && Array.isArray(data.data)) {
            console.log('📊 Data has legacy data structure');
            return data.data;
        }
        
        console.log('📊 No recognizable data format found');
        return [];
    },
    
    // Render panel table
    renderPanelTable(container, data, panel) {
        // Simplified table rendering
        if (data.results && data.results[0] && data.results[0].frames) {
            const frame = data.results[0].frames[0];
            if (frame && frame.schema && frame.data) {
                let html = '<table class="panel-table"><thead><tr>';
                
                // Headers
                frame.schema.fields.forEach(field => {
                    html += `<th>${Utils.escapeHtml(field.name)}</th>`;
                });
                html += '</tr></thead><tbody>';
                
                // Rows
                const numRows = frame.data.values[0]?.length || 0;
                for (let i = 0; i < numRows; i++) {
                    html += '<tr>';
                    frame.data.values.forEach(column => {
                        html += `<td>${Utils.escapeHtml(String(column[i]))}</td>`;
                    });
                    html += '</tr>';
                }
                
                html += '</tbody></table>';
                container.innerHTML = html;
            }
        }
    },
    
    // Open panel in Grafana
    renderPanelInGrafana(dashboardUid, panelId) {
        if (GrafanaConfig.url && dashboardUid && panelId) {
            const baseUrl = GrafanaConfig.url.replace(/\/$/, '');
            const panelUrl = `${baseUrl}/d/${dashboardUid}?viewPanel=${panelId}`;
            window.open(panelUrl, '_blank');
        }
    }
};

// Ensure Dashboard is available globally
window.Dashboard = Dashboard;

// Toggle panel queries visibility
function togglePanelQueries(panelId) {
    const queriesContainer = document.getElementById(`queries-${panelId}`);
    const expandIcon = document.getElementById(`expand-${panelId}`);
    
    if (queriesContainer && expandIcon) {
        if (queriesContainer.classList.contains('hidden')) {
            queriesContainer.classList.remove('hidden');
            expandIcon.textContent = '▼';
            
            // Show panel information in preview when expanded
            showPanelInfo(panelId);
        } else {
            queriesContainer.classList.add('hidden');
            expandIcon.textContent = '▶';
            
            // Clear preview when collapsed
            Dashboard.clearQueryPreview();
        }
    }
}

// Show panel information in the preview area
function showPanelInfo(panelId) {
    const dashboard = Dashboard.selectedDashboard;
    if (!dashboard) return;
    
    const panel = dashboard.panels?.find(p => p.id === panelId);
    if (!panel) return;
    
    const previewContent = document.getElementById('queryPreviewContent');
    if (!previewContent) return;
    
    const queries = Dashboard.currentQueries?.filter(q => q.panelId === panelId) || [];
    const datasources = [...new Set(queries.map(q => Dashboard.resolveDatasourceName(q.datasource)))];
    
    previewContent.innerHTML = `
        <div class="panel-info-display">
            <div class="panel-info-header">
                <h3>${Utils.escapeHtml(panel.title || 'Untitled Panel')}</h3>
                <span class="panel-type-large">${Utils.escapeHtml(panel.type || 'unknown')}</span>
            </div>
            
            ${panel.description ? `
                <div class="panel-description">
                    <strong>Description:</strong>
                    <p>${Utils.escapeHtml(panel.description)}</p>
                </div>
            ` : ''}
            
            <div class="panel-stats">
                <div class="panel-stat-item">
                    <span class="stat-label">Queries:</span>
                    <span class="stat-value">${queries.length}</span>
                </div>
                <div class="panel-stat-item">
                    <span class="stat-label">Data Sources:</span>
                    <span class="stat-value">${datasources.join(', ')}</span>
                </div>
                <div class="panel-stat-item">
                    <span class="stat-label">Panel ID:</span>
                    <span class="stat-value">${panel.id}</span>
                </div>
            </div>
            
            <div class="panel-actions-info">
                <button class="view-panel-btn-large" onclick="viewPanel(${panel.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                    View Panel
                </button>
            </div>
            
            <div class="panel-queries-hint">
                <span>Click on individual queries below to see their details</span>
            </div>
        </div>
    `;
}

// View panel function
function viewPanel(panelId) {
    const dashboard = Dashboard.selectedDashboard;
    if (!dashboard) {
        console.error('No dashboard selected');
        return;
    }
    
    // Find the panel in the dashboard
    const panel = dashboard.panels?.find(p => p.id === panelId);
    if (!panel) {
        console.error('Panel not found:', panelId);
        return;
    }
    
    console.log('Viewing panel:', panel);
    Dashboard.showPanelViewer(panel);
}

// Global functions for HTML onclick handlers
function searchDashboards() {
    const searchInput = document.getElementById('dashboardSearch');
    if (!searchInput) {
        console.error('Dashboard search input not found');
        return;
    }
    
    const query = searchInput.value.trim();
    
    // Ensure Dashboard object is available
    const dashboardObj = (typeof Dashboard !== 'undefined' && Dashboard) ? Dashboard : window.Dashboard;
    if (!dashboardObj) {
        console.error('Dashboard object not available in searchDashboards');
        return;
    }
    
    // Clear previous timeout
    if (dashboardObj.searchTimeout) {
        clearTimeout(dashboardObj.searchTimeout);
    }
    
    // Debounce search to avoid too many API calls
    dashboardObj.searchTimeout = setTimeout(() => {
        if (dashboardObj && dashboardObj.searchDashboards) {
            dashboardObj.searchDashboards(query);
        } else {
            console.error('Dashboard.searchDashboards not available');
        }
    }, 300);
}

function clearDashboardSearch() {
    const dashboardObj = (typeof Dashboard !== 'undefined' && Dashboard) ? Dashboard : window.Dashboard;
    if (dashboardObj && dashboardObj.clearSearch) {
        dashboardObj.clearSearch();
    } else {
        console.error('Dashboard.clearSearch not available');
    }
}

function selectDashboard(uid) {
    const dashboardItem = Dashboard.currentDashboards.find(d => d.uid === uid);
    if (dashboardItem) {
        Dashboard.selectDashboard(dashboardItem);
    }
}

function showQueryPreview(queryId) {
    // Remove active class from all query list items
    document.querySelectorAll('.query-list-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add active class to selected query
    const selectedItem = document.querySelector(`[data-query-id="${queryId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // Find the query data
    const query = Dashboard.currentQueries ? Dashboard.currentQueries.find(q => q.id === queryId) : null;
    
    if (!query) return;
    
    // Show preview section
    const previewSection = document.getElementById('dashboardQueryPreview');
    const previewContent = document.getElementById('queryPreviewContent');
    
    if (previewSection && previewContent) {
        previewSection.classList.remove('hidden');
        
        // Build preview content with separate scrollable content and fixed actions
        let html = '<div class="dashboard-query-content">';
        
        html += '<div class="dashboard-query-info">';
        html += `<div class="dashboard-query-title">Query ${query.refId}: ${Utils.escapeHtml(Dashboard.resolveDisplayVariables(query.panelTitle))}</div>`;
        
        if (query.datasource) {
            const dsName = Dashboard.resolveDatasourceName(query.datasource);
            html += `<div class="dashboard-query-datasource">Data Source: ${Utils.escapeHtml(dsName)}</div>`;
        }
        
        html += `<div class="dashboard-query-expression">${Utils.escapeHtml(query.query)}</div>`;
        html += '</div>'; // Close dashboard-query-info
        
        html += '</div>'; // Close dashboard-query-content
        
        html += '<div class="dashboard-query-actions">';
        html += `<button class="secondary-button" onclick="copyQueryToEditor('${query.id}')">Copy to Editor</button>`;
        html += `<button class="secondary-button" onclick="executeQueryFromDashboard('${query.id}')">Execute Query</button>`;
        html += `<button class="secondary-button" onclick="viewPanel('${query.id}')">View Panel</button>`;
        html += '</div>';
        
        previewContent.innerHTML = html;
    }
}

function copyQueryToEditor(queryId) {
    try {
        // Find the query by ID
        const query = Dashboard.currentQueries ? Dashboard.currentQueries.find(q => q.id === queryId) : null;
        
        if (!query) {
            console.error('Query not found with ID:', queryId);
            return;
        }
        
        // Create variables for any variables used in the query
        Dashboard.createVariablesFromQuery(query.query);
        
        // Create a new tab for this query
        const newTabId = Interface.createNewTab();
        
        // Wait for tab to be fully created, then set the query and datasource
        setTimeout(() => {
            console.log('copyQueryToEditor: Processing query:', query);
            console.log('copyQueryToEditor: Query datasource:', query.datasource);
            console.log('copyQueryToEditor: GrafanaConfig.datasources:', GrafanaConfig.datasources);
            
            // Get the tab data and set the query
            const tabData = Interface.tabs.get(newTabId);
            if (tabData && tabData.editor) {
                tabData.editor.setValue(query.query);
                tabData.editor.focus();
            }
            
            // Set the datasource for this tab if available
            if (query.datasource) {
                const datasourceUid = typeof query.datasource === 'object' ? query.datasource.uid : query.datasource;
                console.log('copyQueryToEditor: Datasource UID:', datasourceUid);
                if (datasourceUid) {
                    console.log('copyQueryToEditor: Calling setTabDatasource with:', newTabId, datasourceUid);
                    Interface.setTabDatasource(newTabId, datasourceUid);
                    
                    // Force execute button update after datasource is set
                    setTimeout(() => {
                        console.log('copyQueryToEditor: Force calling updateExecuteButton');
                        Interface.updateExecuteButton(newTabId);
                        
                        // Also populate the datasource dropdown
                        Interface.populateTabDatasourceSelect(newTabId);
                        
                        // Set the dropdown value again after population
                        setTimeout(() => {
                            const container = document.querySelector(`[data-tab-id="${newTabId}"].editor-container`);
                            if (container) {
                                const datasourceSelect = container.querySelector('.tab-datasource-select');
                                if (datasourceSelect) {
                                    datasourceSelect.value = datasourceUid;
                                }
                            }
                        }, 50);
                    }, 100);
                } else {
                    console.log('copyQueryToEditor: No valid datasource UID found');
                }
            } else {
                console.log('copyQueryToEditor: No datasource found in query');
            }
            
            // Show success message
            console.log('Query copied to new tab:', query.query);
            Interface.showToast('Query copied to new tab', 'success');
        }, 200);
        
    } catch (error) {
        console.error('Error copying query to editor:', error);
        Interface.showToast('Error copying query to editor', 'error');
    }
}

function executeQueryFromDashboard(queryId) {
    try {
        // Find the query by ID
        const query = Dashboard.currentQueries ? Dashboard.currentQueries.find(q => q.id === queryId) : null;
        
        if (!query) {
            console.error('Query not found with ID:', queryId);
            return;
        }
        
        // Create variables for any variables used in the query
        Dashboard.createVariablesFromQuery(query.query);
        
        // Create a new tab for this query
        const newTabId = Interface.createNewTab();
        
        // Wait for tab to be fully created, then set the query, datasource, and execute
        setTimeout(() => {
            // Get the tab data and set the query
            const tabData = Interface.tabs.get(newTabId);
            if (tabData && tabData.editor) {
                tabData.editor.setValue(query.query);
            }
            
            // Set the datasource for this tab if available
            if (query.datasource) {
                const datasourceUid = typeof query.datasource === 'object' ? query.datasource.uid : query.datasource;
                if (datasourceUid) {
                    Interface.setTabDatasource(newTabId, datasourceUid);
                    
                    // Force execute button update and then execute query
                    setTimeout(() => {
                        Interface.updateExecuteButton(newTabId);
                        
                        // Also populate the datasource dropdown
                        Interface.populateTabDatasourceSelect(newTabId);
                        
                        // Set the dropdown value again after population
                        setTimeout(() => {
                            const container = document.querySelector(`[data-tab-id="${newTabId}"].editor-container`);
                            if (container) {
                                const datasourceSelect = container.querySelector('.tab-datasource-select');
                                if (datasourceSelect) {
                                    datasourceSelect.value = datasourceUid;
                                }
                            }
                            
                            // Execute the query after ensuring everything is set
                            setTimeout(() => {
                                Interface.executeQuery(newTabId);
                            }, 50);
                        }, 50);
                    }, 100);
                }
            }
            
            // Show success message
            console.log('Query executed in new tab:', query.query);
            Interface.showToast('Query executed in new tab', 'success');
        }, 200);
        
    } catch (error) {
        console.error('Error executing query from dashboard:', error);
        Interface.showToast('Error executing query from dashboard', 'error');
    }
}

function backToDashboardList() {
    // Hide queries section, show results
    const dashboardQueries = document.getElementById('dashboardQueries');
    const dashboardResults = document.getElementById('dashboardResults');
    
    if (dashboardQueries) {
        dashboardQueries.classList.add('hidden');
    }
    
    if (dashboardResults) {
        dashboardResults.style.display = '';
    }
    
    // Hide dashboard link
    const linkContainer = document.getElementById('selectedDashboardLink');
    if (linkContainer) {
        linkContainer.classList.add('hidden');
    }
    
    // Clear selected dashboard
    Dashboard.selectedDashboard = null;
    
    // Remove selected state from all dashboard items
    document.querySelectorAll('.dashboard-item').forEach(item => {
        item.classList.remove('selected');
    });
}

function viewPanel(identifier) {
    try {
        console.log('viewPanel called with identifier:', identifier, 'type:', typeof identifier);
        
        let query = null;
        
        // Check if it's a query ID (string) or panel ID (number)
        if (typeof identifier === 'string') {
            // It's a query ID - find by exact match
            query = Dashboard.currentQueries ? Dashboard.currentQueries.find(q => q.id === identifier) : null;
            console.log('Looking for query by ID:', identifier);
        } else {
            // It's a panel ID (number) - find the first query for this panel
            query = Dashboard.currentQueries ? Dashboard.currentQueries.find(q => q.panelId == identifier) : null;
            console.log('Looking for query by panelId:', identifier);
        }
        
        if (!query || !query.panel) {
            console.error('Panel data not found for identifier:', identifier);
            console.log('Available queries:', Dashboard.currentQueries?.map(q => ({id: q.id, panelId: q.panelId, panelTitle: q.panelTitle})));
            Interface.showToast('Panel data not available', 'error');
            return;
        }
        
        console.log('Found query for panel:', query);
        
        // Show panel viewer modal
        Dashboard.showPanelViewer(query);
        
    } catch (error) {
        console.error('Error viewing panel:', error);
        Interface.showToast('Error viewing panel', 'error');
    }
}

function toggleDashboardExplorer() {
    const dashboardSection = document.getElementById('dashboardSection');
    const toggleButton = document.querySelector('.dashboard-toggle');
    
    if (dashboardSection.classList.contains('collapsed')) {
        dashboardSection.classList.remove('collapsed');
        toggleButton.textContent = 'Hide';
    } else {
        dashboardSection.classList.add('collapsed');
        toggleButton.textContent = 'Show';
    }
}