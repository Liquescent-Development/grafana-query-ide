const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    saveFile: (content, filename) => ipcRenderer.invoke('save-file', content, filename),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    loadFile: (filePath) => ipcRenderer.invoke('load-file', filePath),
    
    // Directory operations
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
    readFileContent: (filePath) => ipcRenderer.invoke('read-file-content', filePath),
    
    // Grafana API requests
    grafanaRequest: (options) => ipcRenderer.invoke('grafana-api-request', options),
    
    // Chat window functionality with security validation
    openChatWindow: (options) => {
        // SECURITY FIX: Validate chat window options
        if (options && typeof options === 'object') {
            const validatedOptions = {
                conversation: options.conversation && typeof options.conversation === 'object' ? {
                    messages: Array.isArray(options.conversation.messages) ? 
                        options.conversation.messages.slice(0, 100).map(msg => ({
                            sender: typeof msg.sender === 'string' ? msg.sender.substring(0, 20) : 'user',
                            text: typeof msg.text === 'string' ? msg.text.substring(0, 10000) : '',
                            data: null // Don't pass complex data objects
                        })) : []
                } : { messages: [] }
            };
            return ipcRenderer.invoke('open-chat-window', validatedOptions);
        }
        return ipcRenderer.invoke('open-chat-window', { conversation: { messages: [] } });
    },
    closeChatWindow: () => ipcRenderer.invoke('close-chat-window'),
    sendChatMessage: (message) => {
        // SECURITY FIX: Validate chat message
        if (typeof message !== 'string') {
            throw new Error('Chat message must be a string');
        }
        if (message.length === 0) {
            throw new Error('Chat message cannot be empty');
        }
        if (message.length > 10000) {
            throw new Error('Chat message too long (max 10,000 characters)');
        }
        return ipcRenderer.invoke('send-chat-message', message);
    },
    sendChatResponse: (response) => {
        // SECURITY FIX: Validate chat response (supports both string and enhanced object format)
        if (typeof response === 'string') {
            // Legacy string format
            if (response.length > 50000) {
                throw new Error('Chat response too long (max 50,000 characters)');
            }
            return ipcRenderer.invoke('send-chat-response', response);
        } else if (response && typeof response === 'object') {
            // Enhanced object format with metadata
            const validatedResponse = {
                text: typeof response.text === 'string' ? response.text.substring(0, 50000) : '',
                data: response.data && typeof response.data === 'object' ? {
                    type: typeof response.data.type === 'string' ? response.data.type.substring(0, 50) : '',
                    confidence: typeof response.data.confidence === 'number' ? response.data.confidence : undefined,
                    dataSources: Array.isArray(response.data.dataSources) ? response.data.dataSources.slice(0, 10) : undefined,
                    generatedQuery: typeof response.data.generatedQuery === 'string' ? response.data.generatedQuery.substring(0, 5000) : undefined
                } : {},
                actions: Array.isArray(response.actions) ? response.actions.slice(0, 5) : [],
                timestamp: typeof response.timestamp === 'string' ? response.timestamp : new Date().toISOString()
            };
            return ipcRenderer.invoke('send-chat-response', validatedResponse);
        } else {
            throw new Error('Chat response must be a string or enhanced response object');
        }
    },
    showChatLoading: () => ipcRenderer.invoke('show-chat-loading'),
    hideChatLoading: () => ipcRenderer.invoke('hide-chat-loading'),
    checkAIProcessing: () => ipcRenderer.invoke('check-ai-processing'),
    getAIAvatar: () => ipcRenderer.invoke('get-ai-avatar'),
    onChatMessage: (callback) => ipcRenderer.on('chat-response', (event, message) => callback(message)),
    onChatMessageFromPopup: (callback) => ipcRenderer.on('chat-message-from-popup', (event, message) => callback(message)),
    onLoadConversation: (callback) => ipcRenderer.on('load-conversation', (event, conversation) => callback(conversation)),
    onChatWindowClosed: (callback) => ipcRenderer.on('chat-window-closed', callback),
    
    // Run query in editor from chat window
    runQueryInEditor: (queryData) => {
        // SECURITY FIX: Validate query data
        if (queryData && typeof queryData === 'object') {
            const validatedData = {
                query: typeof queryData.query === 'string' ? queryData.query.substring(0, 50000) : '',
                datasourceName: typeof queryData.datasourceName === 'string' ? queryData.datasourceName.substring(0, 200) : '',
                datasourceType: typeof queryData.datasourceType === 'string' ? queryData.datasourceType.substring(0, 50) : 'influxdb',
                queryType: typeof queryData.queryType === 'string' ? queryData.queryType.substring(0, 50) : 'influxql'
            };
            return ipcRenderer.invoke('run-query-in-editor', validatedData);
        }
        throw new Error('Invalid query data');
    },
    
    // Menu event listeners
    onMenuAction: (callback) => {
        // Menu shortcuts
        ipcRenderer.on('menu-new-query', callback);
        ipcRenderer.on('menu-save-query', callback);
        ipcRenderer.on('menu-execute-query', callback);
        ipcRenderer.on('menu-format-query', callback);
        ipcRenderer.on('menu-clear-results', callback);
        ipcRenderer.on('menu-find', callback);
        ipcRenderer.on('menu-toggle-schema', callback);
        ipcRenderer.on('menu-toggle-history', callback);
        ipcRenderer.on('menu-import-connection', callback);
        ipcRenderer.on('menu-export-connection', callback);
    },
    
    // Query editor integration
    onOpenQueryInEditor: (callback) => ipcRenderer.on('open-query-in-editor', (event, queryData) => callback(queryData)),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    
    // Platform detection
    platform: process.platform,
    
    // Version info
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    }
});

// Add keyboard shortcut indicators for desktop
document.addEventListener('DOMContentLoaded', () => {
    // Add visual indicators for keyboard shortcuts
    const style = document.createElement('style');
    style.textContent = `
        .electron-shortcut {
            position: relative;
        }
        
        .electron-shortcut::after {
            content: attr(data-shortcut);
            position: absolute;
            right: 5px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 11px;
            color: #888;
            background: rgba(255,255,255,0.1);
            padding: 2px 6px;
            border-radius: 3px;
            pointer-events: none;
        }
        
        .desktop-only {
            display: block !important;
        }
        
        @media (max-width: 768px) {
            .desktop-only {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Mark app as running in desktop mode
    document.body.classList.add('electron-app');
    
    // Add desktop-specific functionality indicators
    const appTitle = document.querySelector('h1');
    if (appTitle) {
        appTitle.title = 'Desktop Application - Use Ctrl+Enter to execute queries';
    }
});

// Handle menu actions
window.addEventListener('DOMContentLoaded', () => {
    if (window.electronAPI) {
        window.electronAPI.onMenuAction((event, ...args) => {
            const action = event.type || event;
            
            switch (action) {
                case 'menu-new-query':
                    if (typeof Editor !== 'undefined' && Editor.clearQuery) {
                        Editor.clearQuery();
                    }
                    break;
                    
                case 'menu-save-query':
                    if (typeof saveCurrentQuery === 'function') {
                        saveCurrentQuery();
                    } else if (typeof Editor !== 'undefined' && Editor.getQueryValue) {
                        const query = Editor.getQueryValue();
                        if (query.trim()) {
                            window.electronAPI.saveFile(query, 'query.sql');
                        }
                    }
                    break;
                    
                case 'menu-execute-query':
                    if (typeof Queries !== 'undefined' && Queries.executeQuery) {
                        Queries.executeQuery();
                    } else {
                        const executeBtn = document.querySelector('button[onclick="executeQuery()"]') || 
                                         document.querySelector('#executeQuery');
                        if (executeBtn) executeBtn.click();
                    }
                    break;
                    
                case 'menu-format-query':
                    if (typeof Editor !== 'undefined' && Editor.formatQuery) {
                        Editor.formatQuery();
                    }
                    break;
                    
                case 'menu-clear-results':
                    const resultsDiv = document.getElementById('results');
                    if (resultsDiv) {
                        resultsDiv.innerHTML = '<div class="status">Results cleared</div>';
                    }
                    break;
                    
                case 'menu-find':
                    if (typeof Editor !== 'undefined' && Editor.openSearchDialog) {
                        Editor.openSearchDialog();
                    }
                    break;
                    
                case 'menu-toggle-schema':
                    const schemaSection = document.querySelector('.schema-section') || 
                                         document.getElementById('schema-explorer');
                    if (schemaSection) {
                        schemaSection.style.display = 
                            schemaSection.style.display === 'none' ? 'block' : 'none';
                    }
                    break;
                    
                case 'menu-toggle-history':
                    const historySection = document.querySelector('.history-section') || 
                                          document.getElementById('query-history');
                    if (historySection) {
                        historySection.style.display = 
                            historySection.style.display === 'none' ? 'block' : 'none';
                    }
                    break;
                    
                case 'menu-import-connection':
                    if (args[1]) { // filePath provided
                        window.electronAPI.loadFile(args[1]).then(content => {
                            try {
                                const connectionData = JSON.parse(content);
                                if (typeof importConnection === 'function') {
                                    importConnection(connectionData);
                                }
                            } catch (error) {
                                alert('Failed to import connection: Invalid JSON file');
                            }
                        });
                    }
                    break;
                    
                case 'menu-export-connection':
                    if (typeof exportConnection === 'function') {
                        exportConnection();
                    } else if (typeof Storage !== 'undefined' && Storage.getSavedConnections) {
                        const connections = Storage.getSavedConnections();
                        const content = JSON.stringify(connections, null, 2);
                        window.electronAPI.saveFile(content, 'grafana-connections.json');
                    }
                    break;
            }
        });
    }
});

// Global functions for connection import/export
window.importConnection = function(connectionData) {
    if (typeof Storage !== 'undefined' && Storage.saveConnectionToStorage) {
        for (const [id, connection] of Object.entries(connectionData)) {
            Storage.saveConnectionToStorage(connection);
        }
        
        // Reload connections UI if available
        if (typeof Connections !== 'undefined' && Connections.loadSavedConnections) {
            Connections.loadSavedConnections();
        }
        
        alert('Connections imported successfully!');
    }
};

window.exportConnection = function() {
    if (typeof Storage !== 'undefined' && Storage.getSavedConnections) {
        const connections = Storage.getSavedConnections();
        const content = JSON.stringify(connections, null, 2);
        window.electronAPI.saveFile(content, 'grafana-connections.json');
    }
};

window.saveCurrentQuery = function() {
    if (typeof Editor !== 'undefined' && Editor.getQueryValue) {
        const query = Editor.getQueryValue();
        if (query.trim()) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `query-${timestamp}.sql`;
            window.electronAPI.saveFile(query, filename);
        }
    }
};