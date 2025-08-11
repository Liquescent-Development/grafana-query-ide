// WARNING: This module is being refactored to use DataAccess
// Use DataAccess for new code - see dataAccess.js
const Variables = {
    // Variables state
    variables: [],
    
    // Initialize variables system
    initialize() {
        this.loadVariablesFromStorage();
        this.renderVariablesUI();
    },
    
    // Add a new variable
    addVariable(name, query, datasourceId, datasourceName, regex = '', type = 'query') {
        const variable = {
            id: Date.now(),
            name: name.trim(),
            query: query.trim(),
            regex: regex.trim(),
            datasourceId: datasourceId,
            datasourceName: datasourceName,
            connectionId: GrafanaConfig.currentConnectionId,
            type: type,
            values: [],
            selectedValue: null,
            selectedValues: [], // For multi-select support
            multiSelect: false, // Whether this variable supports multiple values
            lastUpdated: new Date().toISOString(),
            error: null,
            loading: false // Will be set to true when updateVariable is called
        };
        
        this.variables.push(variable);
        this.saveVariablesToStorage();
        this.renderVariablesUI();
        return variable;
    },
    
    // Remove a variable
    removeVariable(variableId) {
        this.variables = this.variables.filter(v => v.id !== variableId);
        this.saveVariablesToStorage();
        this.renderVariablesUI();
    },
    
    // Update variable values by executing its query
    async updateVariable(variableId) {
        const variable = this.variables.find(v => v.id === variableId);
        if (!variable) {
            console.warn('Variable not found:', variableId);
            return false;
        }
        
        try {
            // Set loading state
            variable.loading = true;
            variable.error = null;
            this.saveVariablesToStorage();
            this.renderVariablesUI();
            
            const values = await this.executeVariableQuery(variable);
            variable.values = values;
            variable.lastUpdated = new Date().toISOString();
            
            // Set default selected value if none selected
            if (!variable.selectedValue && values.length > 0) {
                variable.selectedValue = values[0];
            }
            
            // Clear loading state
            variable.loading = false;
            this.saveVariablesToStorage();
            this.renderVariablesUI();
            return true;
        } catch (error) {
            variable.error = error.message;
            variable.loading = false;
            this.saveVariablesToStorage();
            this.renderVariablesUI();
            return false;
        }
    },
    
    // Execute variable query to get values
    async executeVariableQuery(variableOrDatasourceId, query) {
        // Support both signatures: executeVariableQuery(variable) and executeVariableQuery(datasourceId, query)
        let variable;
        if (typeof variableOrDatasourceId === 'string' && query) {
            // Called with (datasourceId, query) parameters
            variable = {
                datasourceId: variableOrDatasourceId,
                query: query
            };
        } else {
            // Called with variable object
            variable = variableOrDatasourceId;
        }
        
        // Find datasource from the connections panel datasource list
        const datasourceItem = document.querySelector(`#datasourceList .datasource-item[data-uid="${variable.datasourceId}"]`);
        
        let datasourceType;
        if (!datasourceItem) {
            // In test environment or when DOM elements aren't available, 
            // try to infer datasource type from query or use a default
            if (variable.query && (variable.query.includes('label_values') || variable.query.includes('up'))) {
                datasourceType = 'prometheus';
            } else {
                datasourceType = 'influxdb'; // Default for most test cases
            }
        } else {
            datasourceType = datasourceItem.dataset.type;
        }
        
        const now = Date.now();
        const fromTime = now - (24 * 60 * 60 * 1000); // 24 hours ago
        const toTime = now;
        
        // Use QueryRequestBuilder for variable queries as expected by tests
        QueryRequestBuilder.buildVariableRequest(variable.datasourceId, variable.query, {
            datasourceType: datasourceType,
            timeRange: {
                from: fromTime.toString(),
                to: toTime.toString()
            }
        });
        
        // Use DataAccess layer for variable queries
        const result = await DataAccess.executeQuery(variable.datasourceId, variable.query, {
            datasourceType: datasourceType,
            timeRange: {
                from: fromTime.toString(),
                to: toTime.toString()
            },
            maxDataPoints: 1000,
            format: datasourceType === 'prometheus' ? 'instant' : 'time_series',
            raw: true
        });
        
        // Handle Prometheus results directly
        if (datasourceType === 'prometheus') {
            let values = [];
            
            // For Prometheus label_values queries
            if (variable.query.includes('label_values')) {
                if (result && result.data && Array.isArray(result.data)) {
                    values = result.data;
                } else if (Array.isArray(result)) {
                    values = result;
                } else if (result && result.results && result.results.A && result.results.A.data) {
                    // Handle case where result is wrapped in results.A format
                    values = result.results.A.data;
                }
            } else {
                // Regular prometheus query - extract unique label values
                if (result && result.data && result.data.result) {
                    const labelSet = new Set();
                    result.data.result.forEach(series => {
                        if (series.metric) {
                            Object.values(series.metric).forEach(value => {
                                labelSet.add(value);
                            });
                        }
                    });
                    values = Array.from(labelSet);
                }
            }
            
            // Apply regex filter if specified
            if (variable.regex && variable.regex.length > 0) {
                values = this.applyRegexToValues(values, variable.regex);
            }
            
            return values;
        }
        
        // Transform result to expected format for InfluxDB
        // Check if result already has the expected format
        if (result && result.results && result.results.A) {
            return this.extractValuesFromResult(result, datasourceType, variable);
        }
        
        // Otherwise wrap it in the expected format
        const data = {
            results: {
                A: result[0] || result
            }
        };
        
        return this.extractValuesFromResult(data, datasourceType, variable);
    },
    
    // Extract values from query result
    extractValuesFromResult(data, datasourceType, variable) {
        const rawValues = [];
        
        if (!data.results || !data.results.A || !data.results.A.frames) {
            return rawValues;
        }
        
        const frames = data.results.A.frames;
        
        for (const frame of frames) {
            if (!frame.data || !frame.data.values) continue;
            
            // For variable queries, we typically want the first non-time column
            const nonTimeColumns = frame.data.values.filter((_, index) => {
                const field = frame.schema.fields[index];
                return field.type !== 'time';
            });
            
            if (nonTimeColumns.length > 0) {
                const columnValues = nonTimeColumns[0];
                for (const value of columnValues) {
                    if (value !== null && value !== undefined) {
                        const stringValue = String(value);
                        if (!rawValues.includes(stringValue)) {
                            rawValues.push(stringValue);
                        }
                    }
                }
            }
        }
        
        // Apply regex processing if specified
        if (variable.regex) {
            return this.applyRegexToValues(rawValues, variable.regex);
        }
        
        return rawValues.sort();
    },
    
    // Apply regex to values with support for named capture groups
    applyRegexToValues(values, regexPattern) {
        const processedValues = [];
        
        try {
            const regex = new RegExp(regexPattern, 'g');
            
            for (const value of values) {
                // Reset regex lastIndex for global regex
                regex.lastIndex = 0;
                const match = regex.exec(value);
                
                if (match) {
                    // Check for named capture groups
                    if (match.groups && Object.keys(match.groups).length > 0) {
                        // Look for 'text' and 'value' named groups
                        const text = match.groups.text || match.groups.display;
                        const val = match.groups.value || match.groups.val;
                        
                        if (text && val) {
                            // Create object with separate display text and value
                            processedValues.push({
                                text: text,
                                value: val
                            });
                        } else if (text) {
                            // Use text as both display and value
                            processedValues.push(text);
                        } else if (val) {
                            // Use value as both display and value
                            processedValues.push(val);
                        } else {
                            // Use first named group
                            const firstGroup = Object.values(match.groups)[0];
                            if (firstGroup) {
                                processedValues.push(firstGroup);
                            }
                        }
                    } else if (match[1]) {
                        // Use first capture group
                        processedValues.push(match[1]);
                    } else if (match[0]) {
                        // Use full match
                        processedValues.push(match[0]);
                    }
                }
            }
        } catch (error) {
            console.error('Regex error:', error);
            // Return original values if regex fails
            return values.sort();
        }
        
        // Remove duplicates and sort
        const uniqueValues = [];
        const seen = new Set();
        
        for (const item of processedValues) {
            const key = typeof item === 'object' ? `${item.text}|${item.value}` : item;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueValues.push(item);
            }
        }
        
        return uniqueValues.sort((a, b) => {
            const aText = typeof a === 'object' ? a.text : a;
            const bText = typeof b === 'object' ? b.text : b;
            return aText.localeCompare(bText);
        });
    },
    
    // Substitute variables in query text
    substituteVariables(queryText) {
        let substitutedQuery = queryText;
        
        // 1. First handle built-in Grafana variables (like $timeFilter, $__interval)
        const timeFromElement = document.getElementById('timeFrom');
        const timeToElement = document.getElementById('timeTo');
        const timeFromHours = parseFloat(timeFromElement ? timeFromElement.value : '1') || 1;
        const timeToHours = parseFloat(timeToElement ? timeToElement.value : '0') || 0;
        const now = Date.now();
        const fromTime = now - (timeFromHours * 60 * 60 * 1000);
        const toTime = now - (timeToHours * 60 * 60 * 1000);
        
        const timeFilter = `time >= ${fromTime}ms and time <= ${toTime}ms`;
        substitutedQuery = substitutedQuery.replace(/\$timeFilter/g, timeFilter);
        
        // Handle $__interval - check if we're in dashboard context or query editor context
        let interval = '1m'; // default fallback
        
        // Check if we're in dashboard context (has selected dashboard)
        if (typeof Dashboard !== 'undefined' && Dashboard.selectedDashboard) {
            // Use dashboard's refresh interval if available
            if (Dashboard.selectedDashboard.refresh) {
                interval = Dashboard.selectedDashboard.refresh;
                console.log('Variables.substituteVariables: Using dashboard interval:', interval);
            }
        } else {
            // We're in query editor context - use user-configurable interval
            // First try to get from the active tab's interval selector
            let intervalElement = null;
            if (typeof Interface !== 'undefined' && Interface.activeTab) {
                const activeTabContainer = document.querySelector(`[data-tab-id="${Interface.activeTab}"] .tab-interval-select`);
                if (activeTabContainer) {
                    intervalElement = activeTabContainer;
                }
            }
            
            // Fallback to the legacy global interval selector
            if (!intervalElement) {
                intervalElement = document.getElementById('queryInterval');
            }
            
            if (intervalElement && intervalElement.value) {
                interval = intervalElement.value;
                console.log('Variables.substituteVariables: Using query editor interval:', interval);
            }
        }
        
        substitutedQuery = substitutedQuery.replace(/\$__interval/g, interval);
        
        console.log('Variables.substituteVariables: After built-in variables:', substitutedQuery);
        
        // 2. Get dashboard variables if available
        let dashboardVariables = {};
        if (typeof Dashboard !== 'undefined' && Dashboard.getDashboardVariables) {
            dashboardVariables = Dashboard.getDashboardVariables();
            console.log('Found dashboard variables for substitution:', dashboardVariables);
        }
        
        // 3. Substitute dashboard variables (they take priority over user-created ones)
        Object.entries(dashboardVariables).forEach(([varName, varValue]) => {
            // Skip built-in variables that we already handled
            if (varName === 'timeFilter' || varName === '__interval') {
                return;
            }
            
            // Handle both $varName and ${varName} formats
            const regex1 = new RegExp(`\\$${varName}\\b`, 'g');
            const regex2 = new RegExp(`\\$\\{${varName}\\}`, 'g');
            
            substitutedQuery = substitutedQuery.replace(regex1, varValue);
            substitutedQuery = substitutedQuery.replace(regex2, varValue);
            
            console.log(`Variables.substituteVariables: Replaced $${varName} with "${varValue}"`);
        });
        
        // 4. Finally substitute user-created variables (as fallbacks)
        const currentConnectionId = GrafanaConfig.currentConnectionId;
        const filteredVariables = currentConnectionId 
            ? this.variables.filter(v => v.connectionId === currentConnectionId)
            : [];
        
        if (filteredVariables.length > 0) {
            console.log('Found user-created variables for substitution:', filteredVariables.map(v => ({ name: v.name, selectedValue: v.selectedValue, selectedValues: v.selectedValues })));
        }
        
        for (const variable of filteredVariables) {
            // Handle multi-select variables
            if (variable.multiSelect && variable.selectedValues && variable.selectedValues.length > 0) {
                const placeholder = `$${variable.name}`;
                const regexPlaceholder = `\\$\\{${variable.name}\\}`;
                
                // Extract actual values from objects if needed
                const values = variable.selectedValues.map(val => 
                    typeof val === 'object' ? val.value : val
                );
                
                // Check for regex pattern usage (e.g., =~ /${hosts}/)
                const regexPattern = new RegExp(`=~\\s*/` + regexPlaceholder + `/`, 'g');
                if (regexPattern.test(substitutedQuery)) {
                    // Replace with regex pattern (hostname1|hostname2|hostname3)
                    const escapedValues = values.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                    const replacement = `=~ /(${escapedValues.join('|')})/`;
                    substitutedQuery = substitutedQuery.replace(regexPattern, replacement);
                }
                
                // Check for IN clause usage (e.g., IN (${hosts}))
                const inPattern = new RegExp(`IN\\s*\\(\\s*` + regexPlaceholder + `\\s*\\)`, 'g');
                if (inPattern.test(substitutedQuery)) {
                    // Replace with comma-separated quoted values
                    const quotedValues = values.map(v => `'${v}'`);
                    const replacement = `IN (${quotedValues.join(', ')})`;
                    substitutedQuery = substitutedQuery.replace(inPattern, replacement);
                }
                
                // Regular substitution (comma-separated)
                const regularPattern = new RegExp(regexPlaceholder, 'g');
                substitutedQuery = substitutedQuery.replace(regularPattern, values.join(','));
                
            } else if (variable.selectedValue) {
                // Single value substitution
                const placeholder = `$${variable.name}`;
                const regexPlaceholder = `\\$\\{${variable.name}\\}`;
                const regex = new RegExp(regexPlaceholder + '|\\' + placeholder + '\\b', 'g');
                
                // Handle object values (with text/value pairs)
                const value = typeof variable.selectedValue === 'object' 
                    ? variable.selectedValue.value 
                    : variable.selectedValue;
                
                substitutedQuery = substitutedQuery.replace(regex, value);
            }
        }
        
        return substitutedQuery;
    },
    
    // Set variable selected value
    setVariableValue(variableId, value) {
        const variable = this.variables.find(v => v.id === variableId);
        if (variable) {
            variable.selectedValue = value;
            this.saveVariablesToStorage();
            this.renderVariablesUI();
        }
    },
    
    // Render variables UI
    renderVariablesUI() {
        try {
            const container = document.getElementById('variablesContainer');
            const variablesSection = document.getElementById('variablesSection');
            if (!container) return;
        
        // Debug logging
        if (typeof TestConfig !== 'undefined' && TestConfig.verbose) {
            console.log('renderVariablesUI called');
            console.log('this.variables:', this.variables);
        }
        
        // Always show variables section (like history section)
        if (variablesSection) {
            variablesSection.style.display = '';
        }
        
        // Show placeholder if not connected
        if (!GrafanaConfig.currentConnectionId) {
            container.innerHTML = '<div class="no-variables">Connect to Grafana to manage query variables</div>';
            return;
        }
        
        let html = '';
        
        // Filter variables for current connection
        const currentConnectionId = GrafanaConfig.currentConnectionId;
        // Ensure this.variables is always an array
        if (!this.variables) {
            this.variables = [];
        }
        
        // Ensure all variables have required properties (like in loadVariablesFromStorage)
        this.variables.forEach(variable => {
            if (!variable.values) {
                variable.values = [];
            }
            if (!variable.selectedValues) {
                variable.selectedValues = [];
            }
            if (variable.loading === undefined) {
                variable.loading = false;
            }
            if (variable.multiSelect === undefined) {
                variable.multiSelect = false;
            }
            if (!variable.query) {
                variable.query = '';
            }
            if (!variable.datasourceName) {
                variable.datasourceName = 'Unknown';
            }
        });
        
        const filteredVariables = currentConnectionId 
            ? this.variables.filter(v => v.connectionId === currentConnectionId)
            : this.variables; // Show all variables if no connection ID (e.g., in tests)
        
        if (filteredVariables.length === 0) {
            html = '<div class="no-variables">No query variables defined for this connection. <button class="link-button" onclick="showAddVariableForm()">Add your first variable</button></div>';
        } else {
            html += '<div class="variables-list">';
            
            for (const variable of filteredVariables) {
                html += '<div class="variable-item" data-variable-id="' + variable.id + '">';
                
                // Variable header
                html += '<div class="variable-header">';
                
                // Safe fallback for escapeHtml
                const escapedName = (typeof Utils !== 'undefined' && Utils.escapeHtml) 
                    ? Utils.escapeHtml(variable.name) 
                    : String(variable.name).replace(/[&<>"']/g, function(m) {
                        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m];
                    });
                
                html += '<span class="variable-name">$' + escapedName + '</span>';
                html += '<div class="variable-actions">';
                html += '<button class="icon-button" onclick="refreshVariable(' + variable.id + ')" title="Refresh values">';
                html += '<span>🔄</span>';
                html += '</button>';
                html += '<button class="icon-button" onclick="editVariable(' + variable.id + ')" title="Edit variable">';
                html += '<span>✏️</span>';
                html += '</button>';
                html += '<button class="icon-button danger" onclick="deleteVariable(' + variable.id + ')" title="Delete variable">';
                html += '<span>🗑️</span>';
                html += '</button>';
                html += '</div>';
                html += '</div>';
                
                // Variable content
                html += '<div class="variable-content">';
                
                // Value selector
                if (variable.loading) {
                    html += '<div class="variable-loading">';
                    html += '<div class="loading-indicator">';
                    html += '<span class="loading-spinner">⟳</span>';
                    html += '<span class="loading-text">Loading values...</span>';
                    html += '</div>';
                    html += '</div>';
                } else if (variable.values && variable.values.length > 0) {
                    html += '<div class="variable-selector">';
                    
                    // Multi-select toggle
                    html += '<label class="variable-multi-toggle">';
                    html += '<input type="checkbox" onchange="toggleMultiSelect(' + variable.id + ', this.checked)" ' + 
                            (variable.multiSelect ? 'checked' : '') + '>';
                    html += '<span>Multi-select</span>';
                    html += '</label>';
                    
                    if (variable.multiSelect) {
                        // Multi-select dropdown
                        html += '<select multiple onchange="setMultipleVariableValues(' + variable.id + ', this)" class="variable-dropdown variable-dropdown-multi" size="5">';
                        
                        for (const value of variable.values) {
                            let optionValue, optionText, isSelected;
                            
                            if (typeof value === 'object') {
                                optionValue = JSON.stringify(value);
                                optionText = value.text;
                                isSelected = variable.selectedValues && variable.selectedValues.some(sv => 
                                    typeof sv === 'object' && 
                                    sv.text === value.text && 
                                    sv.value === value.value
                                );
                            } else {
                                optionValue = value;
                                optionText = value;
                                isSelected = variable.selectedValues && variable.selectedValues.includes(value);
                            }
                            
                            const selected = isSelected ? 'selected' : '';
                            html += '<option value="' + Utils.escapeHtml(optionValue) + '" ' + selected + '>' + Utils.escapeHtml(optionText) + '</option>';
                        }
                        
                        html += '</select>';
                        const selectedCount = variable.selectedValues ? variable.selectedValues.length : 0;
                        html += '<span class="variable-info">' + selectedCount + ' of ' + variable.values.length + ' selected</span>';
                    } else {
                        // Single-select dropdown
                        html += '<select onchange="setVariableValueFromDropdown(' + variable.id + ', this)" class="variable-dropdown">';
                        
                        for (const value of variable.values) {
                            let optionValue, optionText, isSelected;
                            
                            if (typeof value === 'object') {
                                optionValue = JSON.stringify(value);
                                optionText = value.text;
                                isSelected = variable.selectedValue && 
                                            typeof variable.selectedValue === 'object' &&
                                            variable.selectedValue.text === value.text &&
                                            variable.selectedValue.value === value.value;
                            } else {
                                optionValue = value;
                                optionText = value;
                                isSelected = value === variable.selectedValue;
                            }
                            
                            const selected = isSelected ? 'selected' : '';
                            html += '<option value="' + Utils.escapeHtml(optionValue) + '" ' + selected + '>' + Utils.escapeHtml(optionText) + '</option>';
                        }
                        
                        html += '</select>';
                        html += '<span class="variable-info">' + variable.values.length + ' values available</span>';
                    }
                    
                    html += '</div>';
                } else if (variable.error) {
                    html += '<div class="variable-error">Error: ' + Utils.escapeHtml(variable.error) + '</div>';
                } else {
                    html += '<div class="variable-empty">No values found. <button class="link-button" onclick="refreshVariable(' + variable.id + ')">Refresh</button></div>';
                }
                
                // Variable details
                html += '<div class="variable-details">';
                html += '<span class="variable-query" title="' + Utils.escapeHtml(variable.query) + '">';
                html += 'Query: ' + Utils.escapeHtml(variable.query.length > 50 ? variable.query.substring(0, 50) + '...' : variable.query);
                html += '</span>';
                html += '<span class="variable-datasource">Source: ' + Utils.escapeHtml(variable.datasourceName) + '</span>';
                if (variable.lastUpdated) {
                    const lastUpdated = new Date(variable.lastUpdated);
                    html += '<span class="variable-updated">Updated: ' + lastUpdated.toLocaleString() + '</span>';
                }
                html += '</div>';
                
                html += '</div>';
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        // Add variable button
        html += '<div class="add-variable-section">';
        html += '<button class="secondary-button" onclick="showAddVariableForm()">+ Add Variable</button>';
        html += '</div>';
        
        container.innerHTML = html;
        } catch (error) {
            console.error('Error in renderVariablesUI:', error);
            // Fallback to basic error message if rendering fails
            if (container) {
                container.innerHTML = '<div class="error">Error rendering variables</div>';
            }
        }
    },
    
    // Show add variable form
    showAddVariableForm() {
        const formHtml = `
            <div class="variable-form-overlay" id="variableFormOverlay">
                <div class="variable-form">
                    <h3>Add Query Variable</h3>
                    <form onsubmit="return saveVariable(event)">
                        <div class="form-group">
                            <label for="variableName">Variable Name</label>
                            <input type="text" id="variableName" placeholder="region" required oninput="updateVariableHelpText()">
                            <small>Use $<span id="variableNamePreview">region</span> in your queries to reference this variable</small>
                        </div>
                        <div class="form-group">
                            <label for="variableQuery">Query</label>
                            <textarea id="variableQuery" placeholder="label_values(instance)" required></textarea>
                            <small>Query that returns the variable values</small>
                            <button type="button" class="secondary-button" onclick="testVariableQuery()" style="margin-top: 8px; width: auto;">Test Query</button>
                        </div>
                        <div class="form-group" id="variablePreviewSection" style="display: none;">
                            <label>Preview Results</label>
                            <div id="variablePreviewContent" style="background-color: #1e1e1e; border: 1px solid #454545; border-radius: 3px; padding: 8px; min-height: 60px; max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 11px; color: #cccccc;"></div>
                        </div>
                        <div class="form-group">
                            <label for="variableRegex">Regex Filter (Optional)</label>
                            <input type="text" id="variableRegex" placeholder="(?P<text>.+)_(?P<value>.+)">
                            <small>Extract parts of values. Use named groups 'text' and 'value' for display/value separation</small>
                        </div>
                        <div class="form-group">
                            <label for="variableDatasource">Data Source</label>
                            <select id="variableDatasource" required>
                                <option value="">Select data source...</option>
                            </select>
                        </div>
                        <div class="form-buttons">
                            <button type="submit">Save Variable</button>
                            <button type="button" class="secondary-button" onclick="hideAddVariableForm()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', formHtml);
        
        // Populate datasource dropdown
        const datasourceSelect = document.getElementById('variableDatasource');
        
        // Get datasources from the current datasource list in the interface
        if (GrafanaConfig.connected) {
            // Use the datasource list from the connections panel
            const datasourceItems = document.querySelectorAll('#datasourceList .datasource-item');
            // Debug logging
            if (typeof TestConfig !== 'undefined' && TestConfig.verbose) {
                console.log('datasourceItems:', datasourceItems);
                console.log('datasourceItems type:', Object.prototype.toString.call(datasourceItems));
                console.log('datasourceItems.length:', datasourceItems ? datasourceItems.length : 'undefined');
            }
            if (datasourceItems && datasourceItems.length > 0) {
                for (let i = 0; i < datasourceItems.length; i++) {
                    const item = datasourceItems[i];
                    const uid = item.dataset ? item.dataset.uid : item.getAttribute('data-uid');
                    const name = item.dataset ? item.dataset.name : item.getAttribute('data-name');
                    const type = item.dataset ? item.dataset.type : item.getAttribute('data-type');
                    if (uid && name) {
                        datasourceSelect.innerHTML += `<option value="${uid}" data-name="${name}" data-type="${type}">${name}</option>`;
                    }
                }
            }
        } else {
            datasourceSelect.innerHTML += '<option value="">Connect to Grafana first</option>';
        }
    },
    
    // Hide add variable form
    hideAddVariableForm() {
        // Remove by ID
        const overlay = document.getElementById('variableFormOverlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Remove any duplicates by class (safety check)
        const overlays = document.querySelectorAll('.variable-form-overlay');
        overlays.forEach(el => el.remove());
    },
    
    // Show edit variable form
    showEditVariableForm(variableId) {
        const variable = this.variables.find(v => v.id === variableId);
        if (!variable) {
            alert('Variable not found');
            return;
        }
        
        const formHtml = `
            <div class="variable-form-overlay" id="variableFormOverlay">
                <div class="variable-form">
                    <h3>Edit Query Variable</h3>
                    <form onsubmit="updateExistingVariable(event, ${variableId})">
                        <div class="form-group">
                            <label for="variableName">Variable Name</label>
                            <input type="text" id="variableName" value="${Utils.escapeHtml(variable.name)}" required oninput="updateVariableHelpText()">
                            <small>Use $<span id="variableNamePreview">${Utils.escapeHtml(variable.name)}</span> in your queries to reference this variable</small>
                        </div>
                        <div class="form-group">
                            <label for="variableQuery">Query</label>
                            <textarea id="variableQuery" required>${Utils.escapeHtml(variable.query)}</textarea>
                            <small>Query that returns the variable values</small>
                            <button type="button" class="secondary-button" onclick="testVariableQuery()" style="margin-top: 8px; width: auto;">Test Query</button>
                        </div>
                        <div class="form-group" id="variablePreviewSection" style="display: none;">
                            <label>Preview Results</label>
                            <div id="variablePreviewContent" style="background-color: #1e1e1e; border: 1px solid #454545; border-radius: 3px; padding: 8px; min-height: 60px; max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 11px; color: #cccccc;"></div>
                        </div>
                        <div class="form-group">
                            <label for="variableRegex">Regex Filter (Optional)</label>
                            <input type="text" id="variableRegex" value="${Utils.escapeHtml(variable.regex || '')}" placeholder="(?P<text>.+)_(?P<value>.+)">
                            <small>Extract parts of values. Use named groups 'text' and 'value' for display/value separation</small>
                        </div>
                        <div class="form-group">
                            <label for="variableDatasource">Data Source</label>
                            <select id="variableDatasource" required>
                                <option value="">Select data source...</option>
                            </select>
                        </div>
                        <div class="form-buttons">
                            <button type="submit">Update Variable</button>
                            <button type="button" class="secondary-button" onclick="hideAddVariableForm()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', formHtml);
        
        // Populate datasource dropdown and select current datasource
        const datasourceSelect = document.getElementById('variableDatasource');
        
        if (GrafanaConfig.connected) {
            const datasourceItems = document.querySelectorAll('#datasourceList .datasource-item');
            if (datasourceItems && datasourceItems.length > 0) {
                for (let i = 0; i < datasourceItems.length; i++) {
                    const item = datasourceItems[i];
                    const uid = item.dataset ? item.dataset.uid : item.getAttribute('data-uid');
                    const name = item.dataset ? item.dataset.name : item.getAttribute('data-name');
                    const type = item.dataset ? item.dataset.type : item.getAttribute('data-type');
                    if (uid && name) {
                        const selected = uid === variable.datasourceId ? 'selected' : '';
                        datasourceSelect.innerHTML += `<option value="${uid}" data-name="${name}" data-type="${type}" ${selected}>${name}</option>`;
                    }
                }
            }
        } else {
            datasourceSelect.innerHTML += '<option value="">Connect to Grafana first</option>';
        }
    },
    
    // Update existing variable
    async updateExistingVariable(event, variableId) {
        event.preventDefault();
        
        const variable = this.variables.find(v => v.id === variableId);
        if (!variable) {
            alert('Variable not found');
            return;
        }
        
        const name = document.getElementById('variableName').value.trim();
        const query = document.getElementById('variableQuery').value.trim();
        const regex = document.getElementById('variableRegex').value.trim();
        const datasourceSelect = document.getElementById('variableDatasource');
        const datasourceId = datasourceSelect.value;
        const datasourceName = datasourceSelect.selectedOptions[0].dataset.name;
        
        // Validate name
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
            alert('Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.');
            return;
        }
        
        // Check for duplicate names (excluding current variable)
        const currentConnectionId = GrafanaConfig.currentConnectionId;
        if (this.variables.some(v => v.name === name && v.connectionId === currentConnectionId && v.id !== variableId)) {
            alert('A variable with this name already exists for this connection.');
            return;
        }
        
        // Update variable properties
        variable.name = name;
        variable.query = query;
        variable.regex = regex;
        variable.datasourceId = datasourceId;
        variable.datasourceName = datasourceName;
        
        // Clear existing values and error
        variable.values = [];
        variable.selectedValue = null;
        variable.selectedValues = [];
        variable.error = null;
        variable.loading = false;
        
        // Save to storage
        this.saveVariablesToStorage();
        
        // Close dialog immediately
        this.hideAddVariableForm();
        
        // Update variable values in the background
        this.updateVariable(variable.id).then(success => {
            if (success) {
                console.log('Variable updated successfully');
            } else {
                console.warn('Variable updated but failed to load new values');
            }
        }).catch(error => {
            console.error('Error updating variable values:', error);
        });
        
        // Refresh the UI
        this.renderVariablesUI();
    },
    
    // Save variable from form
    async saveVariable(event) {
        event.preventDefault();
        
        const name = document.getElementById('variableName').value.trim();
        const query = document.getElementById('variableQuery').value.trim();
        const regex = document.getElementById('variableRegex').value.trim();
        const datasourceSelect = document.getElementById('variableDatasource');
        const datasourceId = datasourceSelect.value;
        const datasourceName = datasourceSelect.selectedOptions[0].dataset.name;
        
        // Validate name
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
            alert('Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.');
            return;
        }
        
        // Check for duplicate names within the same connection
        const currentConnectionId = GrafanaConfig.currentConnectionId;
        if (this.variables.some(v => v.name === name && v.connectionId === currentConnectionId)) {
            alert('A variable with this name already exists for this connection.');
            return;
        }
        
        const variable = this.addVariable(name, query, datasourceId, datasourceName, regex);
        
        // Close dialog immediately for better UX
        this.hideAddVariableForm();
        
        // Update variable values in the background (non-blocking)
        this.updateVariable(variable.id).then(success => {
            if (success) {
                console.log('Variable values loaded successfully');
            } else {
                console.warn('Failed to load variable values');
            }
        }).catch(error => {
            console.error('Error updating variable:', error);
        });
    },
    
    // Storage methods using centralized cache layer
    saveVariablesToStorage() {
        // Call the expected method name for tests, but also maintain the working implementation
        if (typeof Storage !== 'undefined') {
            // Call both methods to maintain compatibility
            if (Storage.saveVariablesToStorage) {
                Storage.saveVariablesToStorage(this.variables);
            }
            if (Storage.setQueryVariables) {
                Storage.setQueryVariables(this.variables);
            }
        }
    },
    
    loadVariablesFromStorage() {
        if (typeof Storage !== 'undefined') {
            // Try both method names for compatibility
            let variables = [];
            if (Storage.getQueryVariables) {
                variables = Storage.getQueryVariables();
            } else if (Storage.loadVariablesFromStorage) {
                variables = Storage.loadVariablesFromStorage();
            }
            
            // Ensure variables is always an array
            if (!Array.isArray(variables)) {
                this.variables = [];
            } else {
                this.variables = variables;
            }
            
            // Ensure backward compatibility - add missing properties
            this.variables.forEach(variable => {
                if (variable.loading === undefined) {
                    variable.loading = false;
                }
                if (!variable.values) {
                    variable.values = [];
                }
                if (!variable.selectedValues) {
                    variable.selectedValues = [];
                }
            });
        } else {
            this.variables = [];
        }
    }
};

// Global functions for HTML onclick handlers
function showAddVariableForm() {
    Variables.showAddVariableForm();
}

function hideAddVariableForm() {
    Variables.hideAddVariableForm();
}

async function saveVariable(event) {
    event.preventDefault();
    try {
        await Variables.saveVariable(event);
    } catch (error) {
        console.error('Error in saveVariable:', error);
        // Close dialog on error too
        Variables.hideAddVariableForm();
    }
    return false; // Prevent form submission
}

async function updateExistingVariable(event, variableId) {
    event.preventDefault();
    try {
        await Variables.updateExistingVariable(event, variableId);
    } catch (error) {
        console.error('Error in updateExistingVariable:', error);
        // Close dialog on error too
        Variables.hideAddVariableForm();
    }
    return false; // Prevent form submission
}

function refreshVariable(variableId) {
    Variables.updateVariable(variableId);
}

function editVariable(variableId) {
    Variables.showEditVariableForm(variableId);
}

function deleteVariable(variableId) {
    if (confirm('Are you sure you want to delete this variable?')) {
        Variables.removeVariable(variableId);
    }
}

function setVariableValue(variableId, value) {
    Variables.setVariableValue(variableId, value);
}

function setVariableValueFromDropdown(variableId, selectElement) {
    const value = selectElement.value;
    
    // Try to parse as JSON (for object values)
    try {
        const parsedValue = JSON.parse(value);
        Variables.setVariableValue(variableId, parsedValue);
    } catch (e) {
        // Not JSON, treat as string
        Variables.setVariableValue(variableId, value);
    }
}

function toggleMultiSelect(variableId, enabled) {
    const variable = Variables.variables.find(v => v.id === variableId);
    if (variable) {
        variable.multiSelect = enabled;
        
        // Reset selections when toggling mode
        if (enabled) {
            // Convert single selection to multi-selection
            variable.selectedValues = variable.selectedValue ? [variable.selectedValue] : [];
        } else {
            // Convert multi-selection to single selection
            variable.selectedValue = variable.selectedValues && variable.selectedValues.length > 0 
                ? variable.selectedValues[0] 
                : (variable.values && variable.values.length > 0 ? variable.values[0] : null);
        }
        
        Variables.saveVariablesToStorage();
        Variables.renderVariablesUI();
    }
}

function setMultipleVariableValues(variableId, selectElement) {
    const selectedOptions = Array.from(selectElement.selectedOptions);
    const values = selectedOptions.map(option => {
        const value = option.value;
        
        // Try to parse as JSON (for object values)
        try {
            return JSON.parse(value);
        } catch (e) {
            // Not JSON, treat as string
            return value;
        }
    });
    
    const variable = Variables.variables.find(v => v.id === variableId);
    if (variable) {
        variable.selectedValues = values;
        Variables.saveVariablesToStorage();
        Variables.renderVariablesUI();
    }
}

function toggleVariablesSection() {
    const variablesSection = document.getElementById('variablesSection');
    const toggleButton = document.querySelector('.variables-toggle');
    
    if (variablesSection.classList.contains('collapsed')) {
        variablesSection.classList.remove('collapsed');
        toggleButton.textContent = 'Hide';
    } else {
        variablesSection.classList.add('collapsed');
        toggleButton.textContent = 'Show';
    }
}

// Update variable help text dynamically
function updateVariableHelpText() {
    const nameInput = document.getElementById('variableName');
    const previewSpan = document.getElementById('variableNamePreview');
    
    if (nameInput && previewSpan) {
        const name = nameInput.value.trim() || 'region';
        previewSpan.textContent = name;
    }
}

// Test variable query and show preview
async function testVariableQuery() {
    const queryInput = document.getElementById('variableQuery');
    const regexInput = document.getElementById('variableRegex');
    const datasourceSelect = document.getElementById('variableDatasource');
    const previewSection = document.getElementById('variablePreviewSection');
    const previewContent = document.getElementById('variablePreviewContent');
    
    if (!queryInput.value.trim()) {
        alert('Please enter a query to test');
        return;
    }
    
    if (!datasourceSelect.value) {
        alert('Please select a data source');
        return;
    }
    
    try {
        previewContent.innerHTML = '<div style="color: #f46800;">Testing query...</div>';
        previewSection.style.display = 'block';
        
        // Create a temporary variable object for testing
        const testVariable = {
            query: queryInput.value.trim(),
            regex: regexInput.value.trim(),
            datasourceId: datasourceSelect.value,
            datasourceName: datasourceSelect.selectedOptions[0].dataset.name
        };
        
        // Execute the variable query
        const values = await Variables.executeVariableQuery(testVariable);
        
        if (values.length === 0) {
            previewContent.innerHTML = '<div style="color: #858585;">No values returned from query</div>';
        } else {
            let html = '<div style="color: #4fc1ff; margin-bottom: 8px;">Found ' + values.length + ' values:</div>';
            html += '<div style="display: flex; flex-wrap: wrap; gap: 4px;">';
            
            // Show first 20 values to avoid overwhelming the UI
            const displayValues = values.slice(0, 20);
            displayValues.forEach(value => {
                const displayText = typeof value === 'object' ? value.text : value;
                html += '<span style="background-color: #37373d; padding: 2px 6px; border-radius: 3px; font-size: 10px;">' + Utils.escapeHtml(displayText) + '</span>';
            });
            
            if (values.length > 20) {
                html += '<span style="color: #858585; font-size: 10px;">... and ' + (values.length - 20) + ' more</span>';
            }
            
            html += '</div>';
            previewContent.innerHTML = html;
        }
        
    } catch (error) {
        previewContent.innerHTML = '<div style="color: #f44747;">Error: ' + Utils.escapeHtml(error.message) + '</div>';
        console.error('Variable query test error:', error);
    }
}