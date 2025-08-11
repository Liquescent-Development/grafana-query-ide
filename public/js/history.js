const History = {
    // State
    searchTerm: '',
    filterTags: [],
    showFavoritesOnly: false,
    
    // Initialize history
    initialize() {
        this.renderHistoryControls();
        this.loadHistory();
    },
    
    // Render history controls (search, filters)
    renderHistoryControls() {
        // Check if we're in the new VS Code-like interface
        const historyPanel = document.getElementById('historyPanel');
        if (historyPanel) {
            // The search input already exists in the HTML, just add the filters
            const searchContainer = historyPanel.querySelector('.search-container');
            if (searchContainer && !searchContainer.querySelector('.history-filters')) {
                const filtersHtml = `
                    <div class="history-filters" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #2d2d30;">
                        <label class="history-filter-toggle">
                            <input type="checkbox" onchange="History.toggleFavoritesOnly(this.checked)">
                            <span>Favorites only</span>
                        </label>
                        <button class="secondary-button" onclick="clearHistory()" style="padding: 4px 8px; font-size: 11px;">Clear All</button>
                    </div>
                `;
                searchContainer.insertAdjacentHTML('beforeend', filtersHtml);
            }
            return;
        }
        
        // Fallback for old interface
        const historySection = document.querySelector('.history-section');
        if (!historySection) return;
        
        const titleElement = historySection.querySelector('.section-title');
        if (!titleElement) return;
        
        // Create controls container
        const controlsHtml = `
            <div class="history-controls">
                <div class="history-search-container">
                    <input type="text" id="historySearch" placeholder="Search queries..." 
                           onkeyup="History.handleSearch(this.value)" class="history-search">
                </div>
                <div class="history-filters">
                    <label class="history-filter-toggle">
                        <input type="checkbox" onchange="History.toggleFavoritesOnly(this.checked)">
                        <span>Favorites only</span>
                    </label>
                    <button class="secondary-button" onclick="clearHistory()">Clear All</button>
                </div>
            </div>
        `;
        
        // Insert after title
        titleElement.insertAdjacentHTML('afterend', controlsHtml);
    },
    
    // Handle search
    handleSearch(term) {
        this.searchTerm = term.toLowerCase();
        this.loadHistory();
    },
    
    // Toggle favorites only filter
    toggleFavoritesOnly(checked) {
        this.showFavoritesOnly = checked;
        this.loadHistory();
    },
    
    // Filter by tag
    filterByTag(tag) {
        if (this.filterTags.includes(tag)) {
            this.filterTags = this.filterTags.filter(t => t !== tag);
        } else {
            this.filterTags.push(tag);
        }
        this.loadHistory();
    },
    
    // Load history into UI with filtering
    loadHistory() {
        let history = Storage.getHistory();
        const historyList = document.getElementById('historyList');
        
        // Apply filters
        if (this.searchTerm) {
            history = history.filter(item => 
                item.query.toLowerCase().includes(this.searchTerm) ||
                (item.label && item.label.toLowerCase().includes(this.searchTerm)) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(this.searchTerm)))
            );
        }
        
        if (this.showFavoritesOnly) {
            history = history.filter(item => item.isFavorite);
        }
        
        if (this.filterTags.length > 0) {
            history = history.filter(item => 
                item.tags && this.filterTags.some(tag => item.tags.includes(tag))
            );
        }
        
        if (history.length === 0) {
            historyList.innerHTML = '<p style="color: #888; text-align: center;">No queries found</p>';
            return;
        }
        
        historyList.innerHTML = history.map(item => this.renderHistoryItem(item)).join('');
    },
    
    // Render a single history item
    renderHistoryItem(item) {
        const tags = (item.tags || []).map(tag => 
            `<span class="history-tag" onclick="History.filterByTag('${Utils.escapeHtml(tag)}')">${Utils.escapeHtml(tag)}</span>`
        ).join('');
        
        return `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <div class="history-timestamp">${new Date(item.timestamp).toLocaleString()}</div>
                    <div class="history-item-actions">
                        <button class="history-action-btn ${item.isFavorite ? 'favorite active' : 'favorite'}" 
                                onclick="History.toggleFavorite(${item.id})" title="Toggle favorite">
                            ${item.isFavorite ? '★' : '☆'}
                        </button>
                        <button class="history-action-btn" onclick="History.editItem(${item.id})" title="Edit label/tags">
                            ✏️
                        </button>
                        <button class="history-action-btn danger" onclick="History.deleteItem(${item.id})" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
                ${item.label ? `<div class="history-label">${Utils.escapeHtml(item.label)}</div>` : ''}
                <div class="history-query" onclick="loadHistoryItem(${item.id})">${Utils.escapeHtml(item.query)}</div>
                <div class="history-metadata">
                    <span class="history-datasource">${item.datasourceName} (${item.queryType || 'unknown'})</span>
                    ${tags ? `<div class="history-tags">${tags}</div>` : ''}
                </div>
            </div>
        `;
    },
    
    // Toggle favorite status
    toggleFavorite(id) {
        const item = Storage.getHistory().find(h => h.id === id);
        if (item) {
            Storage.updateHistoryItem(id, { isFavorite: !item.isFavorite });
            this.loadHistory();
        }
    },
    
    // Delete history item
    deleteItem(id) {
        if (confirm('Are you sure you want to delete this query from history?')) {
            Storage.deleteHistoryItem(id);
            this.loadHistory();
        }
    },
    
    // Edit history item (label/tags)
    editItem(id) {
        console.log('Edit item clicked for ID:', id);
        const item = Storage.getHistory().find(h => h.id === id);
        if (!item) {
            console.error('History item not found for ID:', id);
            return;
        }
        
        console.log('Found history item:', item);
        
        ListManager.showEditForm('Edit Query Details', item, (data) => {
            Storage.updateHistoryItem(id, data);
            this.loadHistory();
        });
    },

    // Load a specific history item
    loadHistoryItem(id) {
        const history = Storage.getHistory();
        const item = history.find(function(h) { return h.id === id; });
        
        if (!item) return;
        
        // Check if we should create a new tab or use the current one
        let targetTabId = null;
        
        if (typeof Interface !== 'undefined' && Interface.activeTab) {
            // Check if active tab has content
            const activeTabData = Interface.tabs.get(Interface.activeTab);
            if (activeTabData && activeTabData.editor) {
                const currentContent = activeTabData.editor.getValue().trim();
                
                if (currentContent) {
                    // Tab has content, create a new tab
                    targetTabId = Interface.createNewTab();
                    Interface.switchTab(targetTabId);
                    
                    // Wait for the new tab's editor to be initialized
                    setTimeout(() => {
                        this.setHistoryItemInTab(targetTabId, item);
                    }, 150); // Wait longer than the 50ms CodeMirror initialization delay
                    return; // Exit early, the setTimeout will handle the rest
                } else {
                    // Tab is empty, use current tab
                    targetTabId = Interface.activeTab;
                }
            } else {
                // No editor, use current tab
                targetTabId = Interface.activeTab;
            }
        }
        
        // Set the query content for current tab or fallback to legacy
        if (targetTabId) {
            this.setHistoryItemInTab(targetTabId, item);
        } else {
            // Fallback to legacy Editor methods
            Editor.setQueryValue(item.query);
            
            if (item.queryType) {
                Editor.setQueryType(item.queryType);
            }
        }
        
        // Also update global datasource selection (for sidebar)
        if (item.datasourceId) {
            // Find the datasource item in the new interface
            const datasourceItem = document.querySelector(`[data-uid="${item.datasourceId}"]`);
            if (datasourceItem) {
                // Remove selection from all datasource items
                document.querySelectorAll('.datasource-item').forEach(dsItem => {
                    dsItem.classList.remove('selected');
                });
                
                // Select the matching datasource
                datasourceItem.classList.add('selected');
                
                // Update global config
                GrafanaConfig.currentDatasourceId = datasourceItem.dataset.uid;
                GrafanaConfig.selectedDatasourceType = datasourceItem.dataset.type;
                GrafanaConfig.selectedDatasourceNumericId = datasourceItem.dataset.id;
                GrafanaConfig.selectedDatasourceName = datasourceItem.dataset.name;
                
                // Trigger change event
                if (typeof onDataSourceChange === 'function') {
                    onDataSourceChange();
                }
            }
        }
    },

    // Helper function to set history item content in a specific tab
    setHistoryItemInTab(targetTabId, item) {
        if (typeof Interface !== 'undefined') {
            // Use Interface for tab-specific operations
            const tabData = Interface.tabs.get(targetTabId);
            if (tabData && tabData.editor) {
                tabData.editor.setValue(item.query);
                
                // Set query type if available
                if (item.queryType) {
                    Interface.setQueryType(targetTabId, item.queryType);
                }
                
                // Set datasource for this tab
                if (item.datasourceId) {
                    Interface.setTabDatasource(targetTabId, item.datasourceId);
                }
            } else {
                console.warn('No editor found for tab:', targetTabId);
            }
        }
    },

    // Clear all history
    clearHistory() {
        if (confirm('Are you sure you want to clear all query history?')) {
            Storage.clearHistory();
            this.loadHistory();
        }
    }
};

// Global functions for HTML onclick handlers
function loadHistoryItem(id) {
    History.loadHistoryItem(id);
}

function clearHistory() {
    History.clearHistory();
}