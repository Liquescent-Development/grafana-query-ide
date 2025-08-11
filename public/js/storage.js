const Storage = {
    // Centralized cache key registry with expiration policies
    CACHE_KEYS: {
        // Core application data
        CONNECTIONS: { key: 'grafanaConnections', ttl: null }, // No expiration
        AUTH_TOKENS: { key: 'grafanaTokens', ttl: 24 * 60 * 60 * 1000 }, // 24 hours
        SCHEMA_CACHE: { key: 'grafanaSchemaCache', ttl: 24 * 60 * 60 * 1000 }, // 24 hours
        QUERY_HISTORY: { key: 'queryHistory', ttl: null, maxItems: 100 },
        GRAFANA_CONFIG: { key: 'grafanaConfig', ttl: null },
        
        // Feature-specific data
        QUERY_VARIABLES: { key: 'queryVariables', ttl: null },
        ANALYTICS_CONFIG: { key: 'analytics_config', ttl: null },
        AI_CONNECTIONS: { key: 'aiConnections', ttl: null },
        ACTIVE_AI_CONNECTION: { key: 'activeAiConnection', ttl: null },
        SAVED_AI_ANALYSES: { key: 'savedAiAnalyses', ttl: 7 * 24 * 60 * 60 * 1000 }, // 7 days
        AI_CONVERSATIONS: { key: 'aiConversations', ttl: null, maxItems: 100 },
        
        // UI state and preferences
        FILE_EXPLORER_LAST_DIR: { key: 'fileExplorerLastDirectory', ttl: null }
    },

    // Unified cache operations with validation and expiration
    get(cacheKey, defaultValue = null) {
        const keyConfig = this.CACHE_KEYS[cacheKey];
        if (!keyConfig) {
            console.error(`Unknown cache key: ${cacheKey}`);
            return defaultValue;
        }

        try {
            const rawData = localStorage.getItem(keyConfig.key);
            if (rawData === null) {
                return defaultValue;
            }

            const data = JSON.parse(rawData);

            // Check for TTL expiration if configured
            if (keyConfig.ttl && data._timestamp) {
                const age = Date.now() - data._timestamp;
                if (age > keyConfig.ttl) {
                    this.remove(cacheKey);
                    return defaultValue;
                }
                // Return data without timestamp metadata
                // For arrays stored with TTL, return the _data property
                if (data._data) {
                    return data._data;
                }
                // For objects, remove the timestamp
                const { _timestamp, ...actualData } = data;
                // Check if actualData looks like an array stored as object (has numeric keys)
                if (actualData['0'] !== undefined || actualData.length !== undefined) {
                    const arrayData = [];
                    let i = 0;
                    while (actualData[i] !== undefined) {
                        arrayData.push(actualData[i]);
                        i++;
                    }
                    return arrayData;
                }
                return actualData;
            }

            return data;
        } catch (error) {
            console.error(`Error reading cache key ${cacheKey}:`, error);
            return defaultValue;
        }
    },

    set(cacheKey, data, customTtl = null) {
        const keyConfig = this.CACHE_KEYS[cacheKey];
        if (!keyConfig) {
            console.error(`Unknown cache key: ${cacheKey}`);
            return false;
        }

        try {
            let dataToStore = data;

            // Add timestamp for TTL if configured
            const ttl = customTtl || keyConfig.ttl;
            if (ttl) {
                // For arrays, wrap in an object with _data property
                if (Array.isArray(data)) {
                    dataToStore = {
                        _data: data,
                        _timestamp: Date.now()
                    };
                } else {
                    dataToStore = {
                        ...data,
                        _timestamp: Date.now()
                    };
                }
            }

            // Handle size limits for array-based caches
            if (keyConfig.maxItems && Array.isArray(data)) {
                if (data.length > keyConfig.maxItems) {
                    const limitedData = data.slice(0, keyConfig.maxItems);
                    if (ttl) {
                        dataToStore = {
                            _data: limitedData,
                            _timestamp: Date.now()
                        };
                    } else {
                        dataToStore = limitedData;
                    }
                }
            }

            localStorage.setItem(keyConfig.key, JSON.stringify(dataToStore));
            return true;
        } catch (error) {
            console.error(`Error setting cache key ${cacheKey}:`, error);
            return false;
        }
    },

    remove(cacheKey) {
        const keyConfig = this.CACHE_KEYS[cacheKey];
        if (!keyConfig) {
            console.error(`Unknown cache key: ${cacheKey}`);
            return false;
        }

        try {
            localStorage.removeItem(keyConfig.key);
            return true;
        } catch (error) {
            console.error(`Error removing cache key ${cacheKey}:`, error);
            return false;
        }
    },

    // Bulk operations
    clear(cacheKeys = null) {
        if (cacheKeys === null) {
            // Clear all registered cache keys
            cacheKeys = Object.keys(this.CACHE_KEYS);
        }

        const results = {};
        cacheKeys.forEach(key => {
            results[key] = this.remove(key);
        });
        return results;
    },

    // Expiration management
    cleanExpired() {
        let cleanedCount = 0;
        Object.keys(this.CACHE_KEYS).forEach(cacheKey => {
            const keyConfig = this.CACHE_KEYS[cacheKey];
            if (keyConfig.ttl) {
                const currentData = this.get(cacheKey);
                if (currentData === null) {
                    cleanedCount++;
                }
            }
        });
        return cleanedCount;
    },

    // Demo mode backup/restore with centralized access

    // Debug and diagnostics
    inspect() {
        const report = {
            totalKeys: localStorage.length,
            registeredKeys: {},
            unregisteredKeys: [],
            expiredKeys: []
        };

        // Check all registered keys
        Object.keys(this.CACHE_KEYS).forEach(cacheKey => {
            const keyConfig = this.CACHE_KEYS[cacheKey];
            const data = localStorage.getItem(keyConfig.key);
            
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    const info = {
                        size: data.length,
                        type: Array.isArray(parsed) ? 'array' : typeof parsed,
                        hasTimestamp: parsed._timestamp ? true : false
                    };

                    if (keyConfig.ttl && parsed._timestamp) {
                        const age = Date.now() - parsed._timestamp;
                        info.age = age;
                        info.expired = age > keyConfig.ttl;
                        if (info.expired) {
                            report.expiredKeys.push(cacheKey);
                        }
                    }

                    if (Array.isArray(parsed)) {
                        info.itemCount = parsed.length;
                    }

                    report.registeredKeys[cacheKey] = info;
                } catch (error) {
                    report.registeredKeys[cacheKey] = { error: error.message };
                }
            } else {
                report.registeredKeys[cacheKey] = null;
            }
        });

        // Check for unregistered keys
        const registeredKeyValues = Object.values(this.CACHE_KEYS).map(config => config.key);
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!registeredKeyValues.includes(key) && 
                !key.startsWith(this.CACHE_KEYS.DEMO_BACKUP_PREFIX)) {
                report.unregisteredKeys.push(key);
            }
        }

        return report;
    },

    // Legacy connection storage methods (backwards compatibility)
    getSavedConnections() {
        const rawData = localStorage.getItem('grafanaConnections');
        console.log('DEBUG: Raw localStorage data for grafanaConnections:', rawData);
        console.log('DEBUG: localStorage length:', localStorage.length);
        console.log('DEBUG: All localStorage keys:', Object.keys(localStorage));
        
        if (rawData === null) {
            console.log('DEBUG: No grafanaConnections found in localStorage');
            return {};
        }
        
        try {
            const connections = JSON.parse(rawData || '{}');
            console.log('DEBUG: Parsed connections:', connections);
            console.log('DEBUG: Connection count:', Object.keys(connections).length);
            return connections;
        } catch (error) {
            console.error('DEBUG: Error parsing connections from localStorage:', error);
            console.error('DEBUG: Raw data that caused error:', rawData);
            return {};
        }
    },

    saveConnectionToStorage(connection) {
        const connections = this.getSavedConnections();
        connections[connection.id] = connection;
        localStorage.setItem('grafanaConnections', JSON.stringify(connections));
        console.log('DEBUG: Saved connection:', connection);
        console.log('DEBUG: All connections after save:', connections);
    },

    // Schema cache storage
    getSavedSchemaCache() {
        const rawData = localStorage.getItem('grafanaSchemaCache');
        if (rawData === null) {
            console.log('DEBUG: No schema cache found in localStorage');
            return {};
        }
        
        try {
            const cache = JSON.parse(rawData || '{}');
            console.log('DEBUG: Loaded schema cache for', Object.keys(cache).length, 'datasources');
            return cache;
        } catch (error) {
            console.error('DEBUG: Error parsing schema cache from localStorage:', error);
            return {};
        }
    },

    saveSchemaToStorage(datasourceId, schemaData) {
        const cache = this.getSavedSchemaCache();
        const timestamp = Date.now();
        
        cache[datasourceId] = {
            ...schemaData,
            timestamp: timestamp,
            version: '1.0' // For future compatibility
        };
        
        localStorage.setItem('grafanaSchemaCache', JSON.stringify(cache));
        console.log(`DEBUG: Saved schema cache for datasource ${datasourceId}:`, {
            retentionPolicies: schemaData.retentionPolicies?.length || 0,
            measurements: schemaData.measurements?.length || 0,
            fieldsForMeasurements: Object.keys(schemaData.fields || {}).length,
            tagsForMeasurements: Object.keys(schemaData.tags || {}).length
        });
    },

    getSchemaFromStorage(datasourceId, maxAgeMs = 24 * 60 * 60 * 1000) { // Default: 24 hours
        const cache = this.getSavedSchemaCache();
        const cached = cache[datasourceId];
        
        if (!cached) {
            console.log(`DEBUG: No cached schema found for datasource ${datasourceId}`);
            return null;
        }
        
        const age = Date.now() - cached.timestamp;
        if (age > maxAgeMs) {
            console.log(`DEBUG: Cached schema for ${datasourceId} is expired (${Math.round(age / 1000 / 60)} minutes old)`);
            // Clean up expired cache
            delete cache[datasourceId];
            localStorage.setItem('grafanaSchemaCache', JSON.stringify(cache));
            return null;
        }
        
        console.log(`DEBUG: Using cached schema for ${datasourceId} (${Math.round(age / 1000 / 60)} minutes old)`);
        return cached;
    },

    clearExpiredSchemaCache(maxAgeMs = 24 * 60 * 60 * 1000) {
        const cache = this.getSavedSchemaCache();
        const now = Date.now();
        let clearedCount = 0;
        
        Object.keys(cache).forEach(datasourceId => {
            const age = now - cache[datasourceId].timestamp;
            if (age > maxAgeMs) {
                delete cache[datasourceId];
                clearedCount++;
            }
        });
        
        if (clearedCount > 0) {
            localStorage.setItem('grafanaSchemaCache', JSON.stringify(cache));
            console.log(`DEBUG: Cleared ${clearedCount} expired schema cache entries`);
        }
        
        return clearedCount;
    },
    
    // Clear all schema cache or specific datasource cache
    clearSchemaFromStorage(datasourceId = null) {
        if (datasourceId) {
            // Clear specific datasource cache
            const cache = this.getSavedSchemaCache();
            if (cache[datasourceId]) {
                delete cache[datasourceId];
                localStorage.setItem('grafanaSchemaCache', JSON.stringify(cache));
                console.log(`DEBUG: Cleared schema cache for datasource ${datasourceId}`);
            }
        } else {
            // Clear all schema cache
            localStorage.removeItem('grafanaSchemaCache');
            console.log('DEBUG: Cleared all schema cache from storage');
        }
    },

    // Debug function to inspect and recover localStorage data
    debugLocalStorage() {
        console.log('=== DEBUG: localStorage INSPECTION ===');
        console.log('localStorage length:', localStorage.length);
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            console.log(`Key: ${key}`, `Value:`, value);
            
            if (key.includes('grafana') || key.includes('connection')) {
                try {
                    const parsed = JSON.parse(value);
                    console.log(`Parsed ${key}:`, parsed);
                } catch (e) {
                    console.log(`Could not parse ${key} as JSON`);
                }
            }
        }
        console.log('=== END DEBUG ===');
    },

    // Recovery function to attempt to restore connections from various sources
    recoverConnections() {
        console.log('=== ATTEMPTING CONNECTION RECOVERY ===');
        
        // Check for connections under different keys
        const possibleKeys = ['grafanaConnections', 'connections', 'savedConnections', 'grafana_connections'];
        
        for (const key of possibleKeys) {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                        console.log(`Found potential connections under key '${key}':`, parsed);
                        
                        // If this isn't the standard key, migrate the data
                        if (key !== 'grafanaConnections') {
                            localStorage.setItem('grafanaConnections', data);
                            console.log(`Migrated connections from '${key}' to 'grafanaConnections'`);
                        }
                        return parsed;
                    }
                } catch (e) {
                    console.log(`Data under '${key}' is not valid JSON`);
                }
            }
        }
        
        console.log('No recoverable connections found');
        return {};
    },

    deleteConnectionFromStorage(id) {
        const connections = this.getSavedConnections();
        delete connections[id];
        localStorage.setItem('grafanaConnections', JSON.stringify(connections));
    },

    // Auth token storage
    saveAuthToken(connectionId, authHeader, expiresAt = null) {
        const tokens = JSON.parse(localStorage.getItem('grafanaTokens') || '{}');
        tokens[connectionId] = {
            authHeader: authHeader,
            timestamp: Date.now(),
            expiresAt: expiresAt
        };
        localStorage.setItem('grafanaTokens', JSON.stringify(tokens));
    },

    getAuthToken(connectionId) {
        const tokens = JSON.parse(localStorage.getItem('grafanaTokens') || '{}');
        const token = tokens[connectionId];
        
        if (!token) return null;
        
        if (token.expiresAt && Date.now() > token.expiresAt) {
            this.clearAuthToken(connectionId);
            return null;
        }
        
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() - token.timestamp > maxAge) {
            this.clearAuthToken(connectionId);
            return null;
        }
        
        return token.authHeader;
    },

    clearAuthToken(connectionId) {
        const tokens = JSON.parse(localStorage.getItem('grafanaTokens') || '{}');
        delete tokens[connectionId];
        localStorage.setItem('grafanaTokens', JSON.stringify(tokens));
    },

    // Backup and restore functionality
    exportConnections() {
        const connections = this.getSavedConnections();
        const tokens = JSON.parse(localStorage.getItem('grafanaTokens') || '{}');
        const history = this.getHistory();
        const variables = JSON.parse(localStorage.getItem('queryVariables') || '[]');
        
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            connections: connections,
            tokens: tokens,
            history: history,
            variables: variables
        };
        
        return JSON.stringify(backup, null, 2);
    },

    importConnections(backupData) {
        try {
            const backup = JSON.parse(backupData);
            
            if (!backup.connections) {
                throw new Error('Invalid backup format: missing connections');
            }
            
            // Validate the structure
            if (typeof backup.connections !== 'object') {
                throw new Error('Invalid backup format: connections must be an object');
            }
            
            // Import connections
            localStorage.setItem('grafanaConnections', JSON.stringify(backup.connections));
            
            // Import tokens if they exist
            if (backup.tokens) {
                localStorage.setItem('grafanaTokens', JSON.stringify(backup.tokens));
            }
            
            // Import history if it exists
            if (backup.history) {
                localStorage.setItem('queryHistory', JSON.stringify(backup.history));
            }
            
            // Import variables if they exist
            if (backup.variables) {
                localStorage.setItem('queryVariables', JSON.stringify(backup.variables));
            }
            
            console.log('Import successful:', {
                connectionsImported: Object.keys(backup.connections).length,
                tokensImported: backup.tokens ? Object.keys(backup.tokens).length : 0,
                historyImported: backup.history ? backup.history.length : 0,
                variablesImported: backup.variables ? backup.variables.length : 0
            });
            
            return {
                success: true,
                connectionsImported: Object.keys(backup.connections).length,
                tokensImported: backup.tokens ? Object.keys(backup.tokens).length : 0,
                historyImported: backup.history ? backup.history.length : 0,
                variablesImported: backup.variables ? backup.variables.length : 0
            };
        } catch (error) {
            console.error('Import failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Grafana config storage
    saveGrafanaConfig() {
        localStorage.setItem('grafanaConfig', JSON.stringify({
            url: GrafanaConfig.url,
            username: GrafanaConfig.username
        }));
    },

    // Query history storage
    getHistory() {
        const history = localStorage.getItem('queryHistory');
        console.log('DEBUG: Raw queryHistory from localStorage:', history);
        console.log('DEBUG: localStorage queryHistory length:', history ? history.length : 0);
        const parsed = history ? JSON.parse(history) : [];
        console.log('DEBUG: Parsed history items count:', parsed.length);
        return parsed;
    },

    generateQueryTitle(query, queryType) {
        // Clean up the query for title generation
        const cleanQuery = query.trim().replace(/\s+/g, ' ');
        
        if (queryType === 'promql') {
            // Extract metric name from PromQL
            const metricMatch = cleanQuery.match(/^(\w+)(?:\{|$)/);
            if (metricMatch) {
                const metric = metricMatch[1];
                // Check for common functions
                if (cleanQuery.includes('rate(')) return `Rate of ${metric}`;
                if (cleanQuery.includes('sum(')) return `Sum of ${metric}`;
                if (cleanQuery.includes('avg(')) return `Average ${metric}`;
                if (cleanQuery.includes('max(')) return `Max ${metric}`;
                if (cleanQuery.includes('min(')) return `Min ${metric}`;
                if (cleanQuery.includes('count(')) return `Count of ${metric}`;
                return metric;
            }
        } else if (queryType === 'influxql') {
            // Extract table/measurement from InfluxQL
            const fromMatch = cleanQuery.match(/FROM\s+["']?(\w+)["']?/i);
            const selectMatch = cleanQuery.match(/SELECT\s+(.+?)\s+FROM/i);
            
            if (fromMatch) {
                const table = fromMatch[1];
                if (selectMatch) {
                    const fields = selectMatch[1].toLowerCase();
                    if (fields.includes('count(')) return `Count from ${table}`;
                    if (fields.includes('mean(')) return `Mean from ${table}`;
                    if (fields.includes('sum(')) return `Sum from ${table}`;
                    if (fields.includes('max(')) return `Max from ${table}`;
                    if (fields.includes('min(')) return `Min from ${table}`;
                }
                return `Query ${table}`;
            }
        }
        
        // Fallback: use first few words
        const words = cleanQuery.split(' ').slice(0, 3).join(' ');
        return words.length > 30 ? words.substring(0, 27) + '...' : words;
    },

    saveToHistory(query, datasourceId, datasourceName) {
        const history = this.getHistory();
        
        // Check if this exact query already exists for the same datasource
        const existingIndex = history.findIndex(item => 
            item.query === query && 
            item.datasourceId === datasourceId
        );
        
        let historyItem;
        
        if (existingIndex !== -1) {
            // Move existing item to top, preserving its metadata
            historyItem = history[existingIndex];
            historyItem.timestamp = new Date().toISOString();
            // Remove from current position
            history.splice(existingIndex, 1);
        } else {
            // Create new history item with auto-generated title
            historyItem = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                query: query,
                datasourceId: datasourceId,
                datasourceName: datasourceName,
                queryType: GrafanaConfig.currentQueryType,
                tags: [],
                label: this.generateQueryTitle(query, GrafanaConfig.currentQueryType),
                isFavorite: false
            };
        }
        
        // Add to top
        history.unshift(historyItem);
        
        // Keep only the last 100 items
        if (history.length > 100) {
            history.pop();
        }
        
        const historyJson = JSON.stringify(history);
        console.log('DEBUG: Saving history to localStorage, items count:', history.length);
        console.log('DEBUG: History JSON length:', historyJson.length);
        localStorage.setItem('queryHistory', historyJson);
        
        // Verify it was saved
        const saved = localStorage.getItem('queryHistory');
        console.log('DEBUG: Verified save - retrieved length:', saved ? saved.length : 0);
    },
    
    updateHistoryItem(id, updates) {
        const history = this.getHistory();
        const index = history.findIndex(item => item.id === id);
        
        if (index !== -1) {
            history[index] = { ...history[index], ...updates };
            localStorage.setItem('queryHistory', JSON.stringify(history));
        }
        
        return history[index];
    },
    
    deleteHistoryItem(id) {
        const history = this.getHistory();
        const filteredHistory = history.filter(item => item.id !== id);
        localStorage.setItem('queryHistory', JSON.stringify(filteredHistory));
    },

    clearHistory() {
        localStorage.removeItem('queryHistory');
    },

    // High-level convenience methods using the unified cache interface
    
    // Query Variables
    getQueryVariables() {
        return this.get('QUERY_VARIABLES', []);
    },

    setQueryVariables(variables) {
        return this.set('QUERY_VARIABLES', variables);
    },

    // Analytics Configuration
    getAnalyticsConfig() {
        return this.get('ANALYTICS_CONFIG', {});
    },

    setAnalyticsConfig(config) {
        return this.set('ANALYTICS_CONFIG', config);
    },

    // AI Connections (maintaining backwards compatibility with array format)
    getAiConnections() {
        const connections = this.get('AI_CONNECTIONS', []);
        // Ensure we return an array for backwards compatibility
        return Array.isArray(connections) ? connections : Object.values(connections);
    },

    setAiConnections(connections) {
        // Accept both array and object formats
        const dataToStore = Array.isArray(connections) ? connections : Object.values(connections);
        return this.set('AI_CONNECTIONS', dataToStore);
    },

    // AI Connections as object (for new code)
    getAiConnectionsAsObject() {
        const connections = this.get('AI_CONNECTIONS', []);
        if (Array.isArray(connections)) {
            // Convert array to object using id as key
            const connectionsObj = {};
            connections.forEach(conn => {
                if (conn.id) {
                    connectionsObj[conn.id] = conn;
                }
            });
            return connectionsObj;
        }
        return connections;
    },

    setAiConnectionsFromObject(connectionsObj) {
        const connectionsArray = Object.values(connectionsObj);
        return this.set('AI_CONNECTIONS', connectionsArray);
    },

    // Saved AI Analyses
    getSavedAiAnalyses() {
        return this.get('SAVED_AI_ANALYSES', []);
    },

    setSavedAiAnalyses(analyses) {
        return this.set('SAVED_AI_ANALYSES', analyses);
    },

    // File Explorer Last Directory
    getFileExplorerLastDirectory() {
        return this.get('FILE_EXPLORER_LAST_DIR', null);
    },

    setFileExplorerLastDirectory(directory) {
        return this.set('FILE_EXPLORER_LAST_DIR', directory);
    },

    // Utility methods for common operations
    
    // Add item to array-based cache (like history, variables, etc.)
    addToArrayCache(cacheKey, item, uniqueKey = 'id') {
        const currentArray = this.get(cacheKey, []);
        
        // Remove existing item if it exists (based on uniqueKey)
        if (uniqueKey && item[uniqueKey]) {
            const filteredArray = currentArray.filter(existing => 
                existing[uniqueKey] !== item[uniqueKey]
            );
            // Add new item to the beginning
            const newArray = [item, ...filteredArray];
            return this.set(cacheKey, newArray);
        } else {
            // Simple prepend
            const newArray = [item, ...currentArray];
            return this.set(cacheKey, newArray);
        }
    },

    // Remove item from array-based cache
    removeFromArrayCache(cacheKey, itemId, uniqueKey = 'id') {
        const currentArray = this.get(cacheKey, []);
        const filteredArray = currentArray.filter(item => 
            item[uniqueKey] !== itemId
        );
        return this.set(cacheKey, filteredArray);
    },

    // Update item in array-based cache
    updateInArrayCache(cacheKey, itemId, updates, uniqueKey = 'id') {
        const currentArray = this.get(cacheKey, []);
        const updatedArray = currentArray.map(item => 
            item[uniqueKey] === itemId ? { ...item, ...updates } : item
        );
        return this.set(cacheKey, updatedArray);
    },

    // Add or update item in object-based cache
    setInObjectCache(cacheKey, key, value) {
        const currentObject = this.get(cacheKey, {});
        const updatedObject = { ...currentObject, [key]: value };
        return this.set(cacheKey, updatedObject);
    },

    // Remove item from object-based cache
    removeFromObjectCache(cacheKey, key) {
        const currentObject = this.get(cacheKey, {});
        const { [key]: removed, ...remainingObject } = currentObject;
        return this.set(cacheKey, remainingObject);
    },

    // ===== AI CONVERSATION MANAGEMENT =====
    
    // Get all conversations
    getAiConversations() {
        return this.get('AI_CONVERSATIONS', []);
    },

    // Save conversation
    saveAiConversation(conversation) {
        const conversations = this.getAiConversations();
        
        // Find existing conversation
        const existingIndex = conversations.findIndex(c => c.id === conversation.id);
        
        if (existingIndex !== -1) {
            // Update existing conversation
            conversations[existingIndex] = {
                ...conversations[existingIndex],
                ...conversation,
                updatedAt: new Date().toISOString()
            };
        } else {
            // Add new conversation with metadata
            const newConversation = {
                id: conversation.id || this.generateConversationId(),
                title: conversation.title || this.generateConversationTitle(conversation.messages),
                messages: conversation.messages || [],
                tags: conversation.tags || [],
                starred: conversation.starred || false,
                createdAt: conversation.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                datasourceContext: conversation.datasourceContext || null,
                messageCount: (conversation.messages || []).length,
                lastMessagePreview: this.getLastMessagePreview(conversation.messages)
            };
            
            // Add to beginning of array
            conversations.unshift(newConversation);
        }
        
        // Ensure we don't exceed maxItems
        if (conversations.length > 100) {
            conversations.splice(100);
        }
        
        return this.set('AI_CONVERSATIONS', conversations);
    },

    // Update conversation metadata
    updateAiConversation(conversationId, updates) {
        const conversations = this.getAiConversations();
        const conversationIndex = conversations.findIndex(c => c.id === conversationId);
        
        if (conversationIndex !== -1) {
            conversations[conversationIndex] = {
                ...conversations[conversationIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            // Update computed fields
            if (updates.messages) {
                conversations[conversationIndex].messageCount = updates.messages.length;
                conversations[conversationIndex].lastMessagePreview = this.getLastMessagePreview(updates.messages);
            }
            
            // If title is being updated, make sure it's valid
            if (updates.title && updates.title.trim()) {
                conversations[conversationIndex].title = updates.title.trim();
            }
            
            this.set('AI_CONVERSATIONS', conversations);
            return conversations[conversationIndex];
        }
        
        return null;
    },

    // Delete conversation
    deleteAiConversation(conversationId) {
        const conversations = this.getAiConversations();
        const filteredConversations = conversations.filter(c => c.id !== conversationId);
        return this.set('AI_CONVERSATIONS', filteredConversations);
    },

    // Get specific conversation
    getAiConversation(conversationId) {
        const conversations = this.getAiConversations();
        return conversations.find(c => c.id === conversationId) || null;
    },

    // Star/unstar conversation
    toggleConversationStar(conversationId) {
        const conversation = this.getAiConversation(conversationId);
        if (conversation) {
            return this.updateAiConversation(conversationId, {
                starred: !conversation.starred
            });
        }
        return null;
    },

    // Add tags to conversation
    addConversationTags(conversationId, tags) {
        const conversation = this.getAiConversation(conversationId);
        if (conversation) {
            const existingTags = conversation.tags || [];
            const newTags = Array.isArray(tags) ? tags : [tags];
            const updatedTags = [...new Set([...existingTags, ...newTags])]; // Remove duplicates
            
            return this.updateAiConversation(conversationId, {
                tags: updatedTags
            });
        }
        return null;
    },

    // Remove tags from conversation
    removeConversationTags(conversationId, tagsToRemove) {
        const conversation = this.getAiConversation(conversationId);
        if (conversation) {
            const existingTags = conversation.tags || [];
            const removeArray = Array.isArray(tagsToRemove) ? tagsToRemove : [tagsToRemove];
            const updatedTags = existingTags.filter(tag => !removeArray.includes(tag));
            
            return this.updateAiConversation(conversationId, {
                tags: updatedTags
            });
        }
        return null;
    },

    // Search conversations
    searchAiConversations(searchTerm, options = {}) {
        const conversations = this.getAiConversations();
        
        if (!searchTerm || searchTerm.trim() === '') {
            return this.filterAndSortConversations(conversations, options);
        }
        
        const term = searchTerm.toLowerCase().trim();
        
        const matchingConversations = conversations.filter(conversation => {
            // Search in title
            if (conversation.title && conversation.title.toLowerCase().includes(term)) {
                return true;
            }
            
            // Search in tags
            if (conversation.tags && conversation.tags.some(tag => 
                tag.toLowerCase().includes(term)
            )) {
                return true;
            }
            
            // Search in message content
            if (conversation.messages && conversation.messages.some(msg => 
                (msg.content && msg.content.toLowerCase().includes(term)) ||
                (msg.text && msg.text.toLowerCase().includes(term))
            )) {
                return true;
            }
            
            // Search in last message preview
            if (conversation.lastMessagePreview && 
                conversation.lastMessagePreview.toLowerCase().includes(term)) {
                return true;
            }
            
            return false;
        });
        
        return this.filterAndSortConversations(matchingConversations, options);
    },

    // Filter and sort conversations
    filterAndSortConversations(conversations, options = {}) {
        let filtered = conversations;
        
        // Filter by starred
        if (options.starred === true) {
            filtered = filtered.filter(c => c.starred);
        }
        
        // Filter by tags
        if (options.tags && options.tags.length > 0) {
            filtered = filtered.filter(c => 
                c.tags && c.tags.some(tag => options.tags.includes(tag))
            );
        }
        
        // Sort
        const sortBy = options.sortBy || 'updatedAt';
        const sortOrder = options.sortOrder || 'desc';
        
        filtered.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'title':
                    valueA = (a.title || '').toLowerCase();
                    valueB = (b.title || '').toLowerCase();
                    break;
                case 'createdAt':
                    valueA = a.createdAt;
                    valueB = b.createdAt;
                    break;
                case 'messageCount':
                    valueA = a.messageCount || 0;
                    valueB = b.messageCount || 0;
                    break;
                case 'starred':
                    valueA = a.starred ? 1 : 0;
                    valueB = b.starred ? 1 : 0;
                    break;
                default: // updatedAt
                    valueA = a.updatedAt || a.createdAt;
                    valueB = b.updatedAt || b.createdAt;
            }
            
            if (sortOrder === 'asc') {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            } else {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            }
        });
        
        return filtered;
    },

    // Get all unique tags from conversations
    getAllConversationTags() {
        const conversations = this.getAiConversations();
        const allTags = new Set();
        
        conversations.forEach(conversation => {
            if (conversation.tags) {
                conversation.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        return Array.from(allTags).sort();
    },

    // Clear all conversations
    clearAiConversations() {
        return this.set('AI_CONVERSATIONS', []);
    },

    // Utility methods for conversation management
    generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    generateConversationTitle(messages) {
        if (!messages || messages.length === 0) {
            return 'New Conversation';
        }
        
        // Find the first user message
        const firstUserMessage = messages.find(msg => msg.role === 'user' || msg.type === 'user');
        
        if (firstUserMessage) {
            const content = firstUserMessage.content || firstUserMessage.text || '';
            const cleaned = content.trim().replace(/\s+/g, ' ');
            
            if (cleaned.length > 50) {
                return cleaned.substring(0, 47) + '...';
            }
            
            return cleaned || 'New Conversation';
        }
        
        return 'New Conversation';
    },

    getLastMessagePreview(messages) {
        if (!messages || messages.length === 0) {
            return '';
        }
        
        const lastMessage = messages[messages.length - 1];
        const content = lastMessage.content || lastMessage.text || '';
        const cleaned = content.trim().replace(/\s+/g, ' ');
        
        if (cleaned.length > 100) {
            return cleaned.substring(0, 97) + '...';
        }
        
        return cleaned;
    },

    // Export conversations for backup
    exportAiConversations() {
        const conversations = this.getAiConversations();
        const tags = this.getAllConversationTags();
        
        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            conversationCount: conversations.length,
            conversations: conversations,
            tags: tags
        };
    },

    // Import conversations from backup
    importAiConversations(backupData, options = {}) {
        try {
            const backup = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
            
            if (!backup.conversations || !Array.isArray(backup.conversations)) {
                throw new Error('Invalid backup format: missing conversations array');
            }
            
            const existingConversations = this.getAiConversations();
            let importedCount = 0;
            let updatedCount = 0;
            
            backup.conversations.forEach(conversation => {
                if (!conversation.id) {
                    conversation.id = this.generateConversationId();
                }
                
                const existingIndex = existingConversations.findIndex(c => c.id === conversation.id);
                
                if (existingIndex !== -1) {
                    if (options.overwrite) {
                        existingConversations[existingIndex] = conversation;
                        updatedCount++;
                    }
                } else {
                    existingConversations.unshift(conversation);
                    importedCount++;
                }
            });
            
            // Ensure we don't exceed max items
            if (existingConversations.length > 100) {
                existingConversations.splice(100);
            }
            
            this.set('AI_CONVERSATIONS', existingConversations);
            
            return {
                success: true,
                imported: importedCount,
                updated: updatedCount,
                total: backup.conversations.length
            };
            
        } catch (error) {
            console.error('Error importing AI conversations:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};