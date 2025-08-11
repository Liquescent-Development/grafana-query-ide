// WARNING: This module is being refactored to use DataAccess instead
// Use DataAccess.request() for new code - see dataAccess.js
const API = {
    // Single unified API request method
    async makeApiRequest(endpoint, options = {}) {
        const config = options.config || GrafanaConfig;
        return this._makeRequest(config, endpoint, options);
    },

    // Legacy method for backward compatibility - redirects to makeApiRequest
    async makeApiRequestWithConfig(config, endpoint, options = {}) {
        return this.makeApiRequest(endpoint, { ...options, config });
    },

    // Internal implementation
    async _makeRequest(config, endpoint, options = {}) {
        // Check if running in Electron
        if (window.electronAPI && window.electronAPI.grafanaRequest) {
            return this._electronRequest(config, endpoint, options);
        }
        
        // Fallback to HTTP requests (for web-only mode)
        const isIntegratedProxy = window.location.pathname !== '/grafana-query-ide.html';
        
        if (isIntegratedProxy) {
            return this._proxyRequest(config, endpoint, options);
        } else {
            return this._directRequest(config, endpoint, options);
        }
    },

    // Electron-specific request handling
    async _electronRequest(config, endpoint, options) {
        try {
            const requestOptions = {
                grafanaUrl: config.url,
                path: endpoint,
                method: options.method || 'GET',
                headers: {
                    'Authorization': config.authHeader,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: options.body,
                timeout: 30000,
                proxyConfig: config.proxyConfig
            };
            
            const response = await window.electronAPI.grafanaRequest(requestOptions);
            
            // Convert to fetch-like response
            return {
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
                statusText: response.statusText,
                headers: {
                    get: (name) => response.headers[name.toLowerCase()]
                },
                json: async () => response.data,
                text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
            };
        } catch (error) {
            return this._errorToResponse(error);
        }
    },

    // Proxy server request handling
    async _proxyRequest(config, endpoint, options) {
        const headers = {
            'Authorization': config.authHeader,
            'X-Grafana-URL': config.url,
            'Accept': 'application/json'
        };
        
        if (config.proxyConfig) {
            headers['X-Proxy-Config'] = JSON.stringify(config.proxyConfig);
        }
        
        if (options.headers) {
            Object.assign(headers, options.headers);
        }

        return fetch('/api' + endpoint.replace('/api', ''), {
            method: options.method || 'GET',
            headers: headers,
            body: options.body
        });
    },

    // Direct request handling (web-only mode)
    async _directRequest(config, endpoint, options) {
        const headers = {
            'Authorization': config.authHeader,
            'Accept': 'application/json'
        };
        
        if (options.headers) {
            Object.assign(headers, options.headers);
        }
        
        return fetch(config.url + endpoint, {
            method: options.method || 'GET',
            headers: headers,
            body: options.body
        });
    },

    // Convert error to fetch-like response
    _errorToResponse(error) {
        const status = error.status || 500;
        return {
            ok: false,
            status: status,
            statusText: error.statusText || error.message || 'Request failed',
            headers: {
                get: () => null
            },
            json: async () => ({ 
                error: error.error || error.message,
                message: error.statusText || error.message 
            }),
            text: async () => error.error || error.message || 'Request failed'
        };
    },

    // Check if running in container
    async checkIfRunningInContainer() {
        // Check if running in Electron instead
        if (window.electronAPI) {
            const tip = document.createElement('div');
            tip.style.cssText = 'margin-top: 5px; font-size: 12px; color: #4ade80; text-align: center;';
            tip.textContent = '✓ Running in Electron - Direct API access enabled';
            const connectionManagement = document.querySelector('.connection-management');
            if (connectionManagement) {
                connectionManagement.appendChild(tip);
            }
        }
    }
};