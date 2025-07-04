const API = {
    // Make API requests with current config
    async makeApiRequest(endpoint, options = {}) {
        const isIntegratedProxy = window.location.pathname !== '/grafana-query-ide.html';
        
        if (isIntegratedProxy) {
            const headers = {
                'Authorization': GrafanaConfig.authHeader,
                'X-Grafana-URL': GrafanaConfig.url,
                'Accept': 'application/json'
            };
            
            if (options.headers) {
                Object.assign(headers, options.headers);
            }

            return fetch('/api' + endpoint.replace('/api', ''), {
                method: options.method || 'GET',
                headers: headers,
                body: options.body
            });
        } else {
            const headers = {
                'Authorization': GrafanaConfig.authHeader,
                'Accept': 'application/json'
            };
            
            if (options.headers) {
                Object.assign(headers, options.headers);
            }
            
            return fetch(GrafanaConfig.url + endpoint, {
                method: options.method || 'GET',
                headers: headers,
                body: options.body
            });
        }
    },

    // Make API requests with specific config
    async makeApiRequestWithConfig(config, endpoint, options = {}) {
        const isIntegratedProxy = window.location.pathname !== '/grafana-query-ide.html';
        
        if (isIntegratedProxy) {
            const headers = {
                'Authorization': config.authHeader,
                'X-Grafana-URL': config.url,
                'Accept': 'application/json'
            };
            
            if (options.headers) {
                Object.assign(headers, options.headers);
            }

            return fetch('/api' + endpoint.replace('/api', ''), {
                method: options.method || 'GET',
                headers: headers,
                body: options.body
            });
        } else {
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
        }
    },

    // Check if running in container
    async checkIfRunningInContainer() {
        try {
            const response = await fetch('/health');
            if (response.ok) {
                const tip = document.createElement('div');
                tip.style.cssText = 'margin-top: 5px; font-size: 12px; color: #4ade80; text-align: center;';
                tip.textContent = '✓ Running with integrated proxy - CORS handling enabled';
                document.querySelector('.connection-management').appendChild(tip);
            }
        } catch (e) {
            // Not running in container, ignore
        }
    }
};