const Schema = {
    // Schema state
    currentDatasourceType: null,
    currentDatasourceId: null,
    prometheusMetrics: [],
    prometheusLabels: {},
    influxMeasurements: [],
    influxRetentionPolicies: [],
    influxFields: {},
    influxTags: {},
    influxTagValues: {}, // Store tag values keyed by "measurement:tag"
    selectedMeasurement: null,
    selectedRetentionPolicy: null,
    selectedTag: null, // Track which tag is selected
    isLoading: false,
    isLoadingMeasurement: false,
    isLoadingTagValues: false,
    
    // Initialize schema explorer
    initialize() {
        this.renderSchemaUI();
        this.bindEvents();
    },
    
    // Bind event handlers
    bindEvents() {
        // Listen for datasource changes
        const datasourceSelect = document.getElementById('datasource');
        if (datasourceSelect) {
            datasourceSelect.addEventListener('change', () => {
                this.onDatasourceChange();
            });
        }
    },
    
    // Handle datasource change
    async onDatasourceChange() {
        const datasourceSelect = document.getElementById('datasource');
        const selectedOption = datasourceSelect.selectedOptions[0];
        
        if (!selectedOption || !selectedOption.value) {
            this.currentDatasourceType = null;
            this.currentDatasourceId = null;
            this.renderSchemaUI();
            return;
        }
        
        this.currentDatasourceType = selectedOption.dataset.type;
        this.currentDatasourceId = selectedOption.value;
        
        await this.loadSchema();
    },
    
    // Load schema based on datasource type
    async loadSchema() {
        if (!this.currentDatasourceType || !this.currentDatasourceId) return;
        
        this.isLoading = true;
        this.renderSchemaUI();
        
        try {
            console.log('Loading schema for:', this.currentDatasourceType);
            if (this.currentDatasourceType === 'prometheus') {
                await this.loadPrometheusSchema();
            } else if (this.currentDatasourceType === 'influxdb') {
                await this.loadInfluxDBSchema();
            }
        } catch (error) {
            console.error('Error loading schema:', error);
            this.showError('Failed to load schema: ' + error.message);
        } finally {
            this.isLoading = false;
            this.renderSchemaUI();
        }
    },
    
    // Load Prometheus schema (metrics and labels)
    async loadPrometheusSchema() {
        try {
            // Method 1: Use a series query to get all metrics - this works universally
            const metricsQuery = '{__name__=~".+"}';
            console.log('Executing metrics query:', metricsQuery);
            const metricsResult = await this.executeSchemaQuery(metricsQuery, 'prometheus');
            
            console.log('Metrics query result:', metricsResult);
            
            if (metricsResult && metricsResult.results && metricsResult.results.A && metricsResult.results.A.frames) {
                const metrics = new Set();
                
                console.log('Processing frames:', metricsResult.results.A.frames.length);
                
                // Extract metrics from series frames
                for (const frame of metricsResult.results.A.frames) {
                    console.log('Frame schema:', frame.schema);
                    console.log('Frame data:', frame.data);
                    
                    // Check schema fields for metric names in labels
                    if (frame.schema && frame.schema.fields) {
                        frame.schema.fields.forEach(field => {
                            if (field.labels && field.labels.__name__) {
                                metrics.add(field.labels.__name__);
                                console.log('Found metric from field labels:', field.labels.__name__);
                            }
                        });
                    }
                    
                    // Also check if there's a displayNameFromDS
                    if (frame.schema && frame.schema.fields) {
                        frame.schema.fields.forEach(field => {
                            if (field.config && field.config.displayNameFromDS) {
                                // Extract metric name from display name (usually like "metric{labels}")
                                const metricMatch = field.config.displayNameFromDS.match(/^([^{]+)/);
                                if (metricMatch) {
                                    metrics.add(metricMatch[1]);
                                    console.log('Found metric from displayName:', metricMatch[1]);
                                }
                            }
                        });
                    }
                }
                
                this.prometheusMetrics = Array.from(metrics).sort();
                console.log('Extracted metrics count:', this.prometheusMetrics.length);
                console.log('Sample metrics:', this.prometheusMetrics.slice(0, 10));
            }
            
            // Method 2: Try to get labels using group by query
            try {
                const labelsQuery = 'group by () ({__name__=~".+"})';
                console.log('Executing labels discovery query:', labelsQuery);
                const labelsResult = await this.executeSchemaQuery(labelsQuery, 'prometheus');
                
                console.log('Labels query result:', labelsResult);
                
                if (labelsResult && labelsResult.results && labelsResult.results.A && labelsResult.results.A.frames) {
                    const labels = new Set(['__name__', 'job', 'instance']); // Common labels
                    
                    // Extract label names from frame schema
                    for (const frame of labelsResult.results.A.frames) {
                        if (frame.schema && frame.schema.fields) {
                            frame.schema.fields.forEach(field => {
                                if (field.labels) {
                                    Object.keys(field.labels).forEach(labelName => {
                                        labels.add(labelName);
                                        console.log('Found label:', labelName);
                                    });
                                }
                            });
                        }
                    }
                    
                    this.prometheusLabels = {};
                    Array.from(labels).sort().forEach(label => {
                        this.prometheusLabels[label] = [];
                    });
                    
                    console.log('Extracted labels count:', Object.keys(this.prometheusLabels).length);
                    console.log('Sample labels:', Object.keys(this.prometheusLabels).slice(0, 10));
                }
            } catch (labelsError) {
                console.warn('Labels discovery failed, using defaults:', labelsError);
                this.prometheusLabels = {
                    '__name__': [],
                    'job': [],
                    'instance': []
                };
            }
            
            console.log('Final Prometheus schema:', {
                metrics: this.prometheusMetrics.length,
                labels: Object.keys(this.prometheusLabels).length
            });
            
        } catch (error) {
            console.error('Error loading Prometheus schema:', error);
            // Set some default common metrics if discovery fails
            this.prometheusMetrics = ['up', 'prometheus_build_info', 'process_start_time_seconds'];
            this.prometheusLabels = {
                'job': [],
                'instance': [],
                '__name__': []
            };
        }
    },
    
    // Load InfluxDB schema
    async loadInfluxDBSchema() {
        try {
            console.log('Loading InfluxDB schema...');
            
            // Get retention policies
            console.log('Executing: SHOW RETENTION POLICIES');
            const retentionPoliciesResult = await this.executeSchemaQuery('SHOW RETENTION POLICIES', 'influxdb');
            console.log('Retention policies result:', retentionPoliciesResult);
            
            if (retentionPoliciesResult && retentionPoliciesResult.results && retentionPoliciesResult.results.A) {
                this.influxRetentionPolicies = this.extractInfluxResults(retentionPoliciesResult.results.A);
                console.log('Extracted retention policies:', this.influxRetentionPolicies);
            } else {
                console.warn('No retention policies data found');
                this.influxRetentionPolicies = ['autogen']; // Default
            }
            
            // Get measurements
            console.log('Executing: SHOW MEASUREMENTS');
            const measurementsResult = await this.executeSchemaQuery('SHOW MEASUREMENTS', 'influxdb');
            console.log('Measurements result:', measurementsResult);
            
            if (measurementsResult && measurementsResult.results && measurementsResult.results.A) {
                this.influxMeasurements = this.extractInfluxResults(measurementsResult.results.A);
                console.log('Extracted measurements:', this.influxMeasurements);
            } else {
                console.warn('No measurements data found');
                this.influxMeasurements = [];
            }
            
            console.log('InfluxDB schema loaded:', {
                retentionPolicies: this.influxRetentionPolicies.length,
                measurements: this.influxMeasurements.length
            });
            
        } catch (error) {
            console.error('Error loading InfluxDB schema:', error);
            // Set defaults if discovery fails
            this.influxRetentionPolicies = ['autogen'];
            this.influxMeasurements = [];
        }
    },
    
    // Load fields and tags for a specific measurement
    async loadMeasurementSchema(measurement, retentionPolicy = 'autogen') {
        this.selectedMeasurement = measurement;
        this.selectedRetentionPolicy = retentionPolicy;
        this.selectedTag = null; // Clear selected tag when changing measurement
        this.isLoadingMeasurement = true;
        
        // Render UI to show loading state
        this.renderSchemaUI();
        
        try {
            console.log(`Loading schema for measurement: ${measurement}, retention policy: ${retentionPolicy}`);
            
            // Get field keys - try without retention policy first
            let fieldsQuery = `SHOW FIELD KEYS FROM "${measurement}"`;
            console.log('Executing fields query:', fieldsQuery);
            let fieldsResult = await this.executeSchemaQuery(fieldsQuery, 'influxdb');
            console.log('Fields result:', fieldsResult);
            
            // Check if we got fields
            let hasFields = false;
            if (fieldsResult && fieldsResult.results && fieldsResult.results.A) {
                const extractedFields = this.extractInfluxResults(fieldsResult.results.A);
                if (extractedFields.length > 0) {
                    this.influxFields[measurement] = extractedFields;
                    console.log('Extracted fields:', this.influxFields[measurement]);
                    hasFields = true;
                }
            }
            
            // If no fields found, try with retention policy
            if (!hasFields) {
                console.warn('No fields found with basic query, trying with retention policy:', retentionPolicy);
                fieldsQuery = `SHOW FIELD KEYS FROM "${retentionPolicy}"."${measurement}"`;
                console.log('Executing fields query with retention policy:', fieldsQuery);
                fieldsResult = await this.executeSchemaQuery(fieldsQuery, 'influxdb');
                console.log('Fields result with retention policy:', fieldsResult);
                
                if (fieldsResult && fieldsResult.results && fieldsResult.results.A) {
                    this.influxFields[measurement] = this.extractInfluxResults(fieldsResult.results.A);
                    console.log('Extracted fields with retention policy:', this.influxFields[measurement]);
                } else {
                    console.warn('No fields data found for measurement:', measurement);
                    this.influxFields[measurement] = [];
                }
            }
            
            // Get tag keys
            const tagsQuery = `SHOW TAG KEYS FROM "${retentionPolicy}"."${measurement}"`;
            console.log('Executing tags query:', tagsQuery);
            const tagsResult = await this.executeSchemaQuery(tagsQuery, 'influxdb');
            console.log('Tags result:', tagsResult);
            
            if (tagsResult && tagsResult.results && tagsResult.results.A) {
                this.influxTags[measurement] = this.extractInfluxResults(tagsResult.results.A);
                console.log('Extracted tags:', this.influxTags[measurement]);
            } else {
                console.warn('No tags data found for measurement:', measurement);
                this.influxTags[measurement] = [];
            }
            
            console.log(`Measurement schema loaded for ${measurement}:`, {
                fields: this.influxFields[measurement] ? this.influxFields[measurement].length : 0,
                tags: this.influxTags[measurement] ? this.influxTags[measurement].length : 0
            });
            
        } catch (error) {
            console.error('Error loading measurement schema:', error);
            this.showError('Failed to load measurement schema: ' + error.message);
        } finally {
            this.isLoadingMeasurement = false;
            this.renderSchemaUI();
        }
    },
    
    // Execute schema discovery query
    async executeSchemaQuery(query, datasourceType) {
        const selectedOption = document.getElementById('datasource').selectedOptions[0];
        if (!selectedOption) return null;
        
        const datasourceNumericId = selectedOption.dataset.id;
        
        let requestBody;
        let urlParams = '';
        
        const now = Date.now();
        const fromTime = now - (60 * 60 * 1000); // 1 hour ago
        const toTime = now;
        
        if (datasourceType === 'prometheus') {
            const requestId = Math.random().toString(36).substr(2, 9);
            urlParams = '?ds_type=prometheus&requestId=' + requestId;
            
            requestBody = {
                queries: [{
                    refId: 'A',
                    datasource: { 
                        uid: this.currentDatasourceId,
                        type: 'prometheus'
                    },
                    expr: query,
                    instant: true,
                    interval: '',
                    legendFormat: '',
                    editorMode: 'code',
                    exemplar: false,
                    requestId: requestId.substr(0, 3).toUpperCase(),
                    utcOffsetSec: new Date().getTimezoneOffset() * -60,
                    scopes: [],
                    adhocFilters: [],
                    datasourceId: parseInt(datasourceNumericId),
                    intervalMs: 15000,
                    maxDataPoints: 10000
                }],
                from: fromTime.toString(),
                to: toTime.toString()
            };
        } else if (datasourceType === 'influxdb') {
            const requestId = Math.random().toString(36).substr(2, 9);
            urlParams = '?ds_type=influxdb&requestId=' + requestId;
            
            requestBody = {
                queries: [{
                    refId: 'A',
                    datasource: { 
                        uid: this.currentDatasourceId,
                        type: 'influxdb'
                    },
                    query: query,
                    rawQuery: true,
                    resultFormat: 'time_series',
                    requestId: requestId.substr(0, 3).toUpperCase(),
                    utcOffsetSec: new Date().getTimezoneOffset() * -60,
                    datasourceId: parseInt(datasourceNumericId),
                    intervalMs: 15000,
                    maxDataPoints: 10000
                }],
                from: fromTime.toString(),
                to: toTime.toString()
            };
        }
        
        const response = await API.makeApiRequest('/api/ds/query' + urlParams, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('Schema query failed: ' + response.statusText + ' - ' + errorText);
        }
        
        return await response.json();
    },
    
    // Load tag values for a specific tag
    async loadTagValues(tag) {
        if (!this.selectedMeasurement || !tag) return;
        
        const key = `${this.selectedMeasurement}:${tag}`;
        this.selectedTag = tag;
        this.isLoadingTagValues = true;
        
        // Update UI to show loading state
        this.renderSchemaUI();
        
        try {
            console.log(`Loading values for tag: ${tag} in measurement: ${this.selectedMeasurement}`);
            
            // Query for tag values
            const tagValuesQuery = `SHOW TAG VALUES WITH KEY = "${tag}"`;
            console.log('Executing tag values query:', tagValuesQuery);
            const tagValuesResult = await this.executeSchemaQuery(tagValuesQuery, 'influxdb');
            console.log('Tag values result:', tagValuesResult);
            
            if (tagValuesResult && tagValuesResult.results && tagValuesResult.results.A) {
                // Extract values from the result
                const values = [];
                const frames = tagValuesResult.results.A.frames || [];
                
                for (const frame of frames) {
                    if (!frame.data || !frame.data.values) continue;
                    
                    // Tag values typically come in the second column (index 1)
                    if (frame.data.values.length > 1 && Array.isArray(frame.data.values[1])) {
                        const columnValues = frame.data.values[1];
                        for (const value of columnValues) {
                            if (value !== null && value !== undefined) {
                                const stringValue = String(value);
                                if (!values.includes(stringValue)) {
                                    values.push(stringValue);
                                }
                            }
                        }
                    }
                }
                
                this.influxTagValues[key] = values.sort();
                console.log(`Extracted ${values.length} values for tag ${tag}:`, this.influxTagValues[key]);
            } else {
                console.warn('No tag values found for:', tag);
                this.influxTagValues[key] = [];
            }
            
        } catch (error) {
            console.error('Error loading tag values:', error);
            this.showError('Failed to load tag values: ' + error.message);
            this.influxTagValues[key] = [];
        } finally {
            this.isLoadingTagValues = false;
            this.renderSchemaUI();
        }
    },
    
    // Extract results from InfluxDB response
    extractInfluxResults(result) {
        const values = [];
        
        if (!result.frames || result.frames.length === 0) {
            return values;
        }
        
        for (const frame of result.frames) {
            if (!frame.data || !frame.data.values) continue;
            
            // For SHOW commands, InfluxDB typically returns a single column of values
            // Try to get the first (and usually only) column of values
            if (frame.data.values.length > 0 && Array.isArray(frame.data.values[0])) {
                const columnValues = frame.data.values[0];
                for (const value of columnValues) {
                    if (value !== null && value !== undefined) {
                        const stringValue = String(value);
                        if (!values.includes(stringValue)) {
                            values.push(stringValue);
                        }
                    }
                }
            }
        }
        
        return values.sort();
    },
    
    // Filter metrics based on search term
    filterMetrics(searchTerm) {
        if (!searchTerm) return this.prometheusMetrics;
        
        const term = searchTerm.toLowerCase();
        return this.prometheusMetrics.filter(metric => 
            metric.toLowerCase().includes(term)
        );
    },
    
    // Insert text into query editor
    insertIntoQuery(text) {
        if (GrafanaConfig.queryEditor) {
            const doc = GrafanaConfig.queryEditor.getDoc();
            const cursor = doc.getCursor();
            doc.replaceRange(text, cursor);
            GrafanaConfig.queryEditor.focus();
        }
    },
    
    // Show error message
    showError(message) {
        const container = document.getElementById('schemaContainer');
        if (container) {
            container.innerHTML = `<div class="schema-error">${Utils.escapeHtml(message)}</div>`;
        }
    },
    
    // Render schema UI
    renderSchemaUI() {
        const container = document.getElementById('schemaContainer');
        if (!container) return;
        
        let html = '';
        
        if (!this.currentDatasourceType) {
            html = '<div class="schema-empty">Select a data source to explore schema</div>';
        } else if (this.isLoading) {
            html = '<div class="schema-loading">Loading schema...</div>';
        } else if (this.currentDatasourceType === 'prometheus') {
            html = this.renderPrometheusSchema();
        } else if (this.currentDatasourceType === 'influxdb') {
            html = this.renderInfluxDBSchema();
        }
        
        container.innerHTML = html;
    },
    
    // Render Prometheus schema
    renderPrometheusSchema() {
        let html = '<div class="schema-content">';
        
        // Metrics section
        html += '<div class="schema-subsection">';
        html += '<h4>Metrics</h4>';
        
        // Search box
        html += '<div class="schema-search">';
        html += '<input type="text" id="metricsSearch" placeholder="Search metrics..." onkeyup="filterPrometheusMetrics(this.value)">';
        html += '</div>';
        
        // Metrics list
        html += '<div class="schema-list" id="metricsList">';
        
        if (this.prometheusMetrics.length === 0) {
            html += '<div class="schema-empty">No metrics found</div>';
        } else {
            for (const metric of this.prometheusMetrics) {
                html += '<div class="schema-item" onclick="insertMetric(\'' + Utils.escapeHtml(metric) + '\')">';
                html += '<span class="schema-item-name">' + Utils.escapeHtml(metric) + '</span>';
                html += '<span class="schema-item-type metric">metric</span>';
                html += '</div>';
            }
        }
        
        html += '</div>';
        html += '</div>';
        
        // Labels section
        if (Object.keys(this.prometheusLabels).length > 0) {
            html += '<div class="schema-subsection">';
            html += '<h4>Common Labels</h4>';
            html += '<div class="schema-list">';
            
            for (const labelName of Object.keys(this.prometheusLabels).sort()) {
                html += '<div class="schema-item" onclick="insertLabel(\'' + Utils.escapeHtml(labelName) + '\')">';
                html += '<span class="schema-item-name">' + Utils.escapeHtml(labelName) + '</span>';
                html += '<span class="schema-item-type label">label</span>';
                html += '</div>';
            }
            
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    },
    
    // Render InfluxDB schema
    renderInfluxDBSchema() {
        let html = '<div class="schema-content">';
        
        // Retention Policies Dropdown
        if (this.influxRetentionPolicies.length > 0) {
            html += '<div class="schema-subsection">';
            html += '<h4>Retention Policy</h4>';
            html += '<select id="retentionPolicySelect" onchange="selectRetentionPolicy(this.value)" class="schema-dropdown">';
            html += '<option value="">Select retention policy...</option>';
            
            for (const policy of this.influxRetentionPolicies) {
                const isSelected = policy === this.selectedRetentionPolicy;
                html += '<option value="' + Utils.escapeHtml(policy) + '"' + (isSelected ? ' selected' : '') + '>';
                html += Utils.escapeHtml(policy);
                html += '</option>';
            }
            
            html += '</select>';
            html += '</div>';
        }
        
        // Measurements Dropdown
        html += '<div class="schema-subsection">';
        html += '<h4>Measurement</h4>';
        
        if (this.influxMeasurements.length === 0) {
            html += '<div class="schema-empty">No measurements found</div>';
        } else {
            html += '<select id="measurementSelect" onchange="selectMeasurement(this.value)" class="schema-dropdown">';
            html += '<option value="">Select measurement...</option>';
            
            for (const measurement of this.influxMeasurements) {
                const isSelected = measurement === this.selectedMeasurement;
                html += '<option value="' + Utils.escapeHtml(measurement) + '"' + (isSelected ? ' selected' : '') + '>';
                html += Utils.escapeHtml(measurement);
                html += '</option>';
            }
            
            html += '</select>';
        }
        
        html += '</div>';
        
        // Fields and Tags (when measurement is selected)
        if (this.selectedMeasurement) {
            if (this.isLoadingMeasurement) {
                // Show loading state for fields and tags
                html += '<div class="schema-subsection">';
                html += '<h4>Fields & Tags</h4>';
                html += '<div class="schema-loading">Loading fields and tags...</div>';
                html += '</div>';
            } else {
                const fields = this.influxFields[this.selectedMeasurement] || [];
                const tags = this.influxTags[this.selectedMeasurement] || [];
                
                if (fields.length > 0) {
                    html += '<div class="schema-subsection">';
                    html += '<h4>Fields (' + Utils.escapeHtml(this.selectedMeasurement) + ')</h4>';
                    
                    // Search box for fields
                    html += '<div class="schema-search">';
                    html += '<input type="text" id="fieldsSearch" placeholder="Search fields..." onkeyup="filterInfluxFields(this.value)">';
                    html += '</div>';
                    
                    html += '<div class="schema-list" id="fieldsList">';
                    
                    for (const field of fields) {
                        html += '<div class="schema-item" onclick="insertField(\'' + Utils.escapeHtml(field) + '\')">';
                        html += '<span class="schema-item-name">' + Utils.escapeHtml(field) + '</span>';
                        html += '<span class="schema-item-type field">field</span>';
                        html += '</div>';
                    }
                    
                    html += '</div>';
                    html += '</div>';
                }
                
                if (tags.length > 0) {
                    html += '<div class="schema-subsection">';
                    html += '<h4>Tags (' + Utils.escapeHtml(this.selectedMeasurement) + ')</h4>';
                    
                    // Search box for tags
                    html += '<div class="schema-search">';
                    html += '<input type="text" id="tagsSearch" placeholder="Search tags..." onkeyup="filterInfluxTags(this.value)">';
                    html += '</div>';
                    
                    html += '<div class="schema-list" id="tagsList">';
                    
                    for (const tag of tags) {
                        const isSelected = this.selectedTag === tag;
                        const key = `${this.selectedMeasurement}:${tag}`;
                        const tagValues = this.influxTagValues[key] || [];
                        
                        html += '<div class="schema-tag-wrapper">';
                        
                        // Tag item with expand/collapse icon
                        html += '<div class="schema-item' + (isSelected ? ' selected' : '') + '" onclick="toggleTag(\'' + Utils.escapeHtml(tag) + '\')">';
                        html += '<span class="schema-expand-icon">' + (isSelected ? '▼' : '▶') + '</span>';
                        html += '<span class="schema-item-name">' + Utils.escapeHtml(tag) + '</span>';
                        html += '<span class="schema-item-type tag">tag</span>';
                        html += '</div>';
                        
                        // Tag values (shown when tag is selected)
                        if (isSelected) {
                            html += '<div class="schema-tag-values">';
                            
                            if (this.isLoadingTagValues) {
                                html += '<div class="schema-loading">Loading tag values...</div>';
                            } else if (tagValues.length === 0) {
                                html += '<div class="schema-empty">No values found</div>';
                            } else {
                                for (const value of tagValues) {
                                    html += '<div class="schema-value-item" onclick="insertTagValue(\'' + Utils.escapeHtml(tag) + '\', \'' + Utils.escapeHtml(value) + '\')">';
                                    html += '<span class="schema-value-name">' + Utils.escapeHtml(value) + '</span>';
                                    html += '</div>';
                                }
                            }
                            
                            html += '</div>';
                        }
                        
                        html += '</div>';
                    }
                    
                    html += '</div>';
                    html += '</div>';
                }
            }
        }
        
        html += '</div>';
        return html;
    },
    
    // Refresh schema
    async refreshSchema() {
        if (this.currentDatasourceType && this.currentDatasourceId) {
            await this.loadSchema();
        }
    }
};

// Global functions for HTML onclick handlers
function filterPrometheusMetrics(searchTerm) {
    const metricsList = document.getElementById('metricsList');
    if (!metricsList) return;
    
    const filteredMetrics = Schema.filterMetrics(searchTerm);
    
    let html = '';
    if (filteredMetrics.length === 0) {
        html = '<div class="schema-empty">No metrics found</div>';
    } else {
        for (const metric of filteredMetrics) {
            html += '<div class="schema-item" onclick="insertMetric(\'' + Utils.escapeHtml(metric) + '\')">';
            html += '<span class="schema-item-name">' + Utils.escapeHtml(metric) + '</span>';
            html += '<span class="schema-item-type metric">metric</span>';
            html += '</div>';
        }
    }
    
    metricsList.innerHTML = html;
}

function insertMetric(metric) {
    Schema.insertIntoQuery(metric);
}

function insertLabel(label) {
    Schema.insertIntoQuery(label);
}

function insertField(field) {
    Schema.insertIntoQuery(field);
}

function insertTag(tag) {
    Schema.insertIntoQuery(tag);
}

function toggleTag(tag) {
    if (Schema.selectedTag === tag) {
        // If already selected, deselect
        Schema.selectedTag = null;
        Schema.renderSchemaUI();
    } else {
        // Select the tag and load its values
        Schema.loadTagValues(tag);
    }
}

function insertTagValue(tag, value) {
    // Insert in WHERE clause format: tag="value"
    const whereClause = `"${tag}"='${value}'`;
    Schema.insertIntoQuery(whereClause);
}

function selectMeasurement(measurement) {
    if (!measurement) {
        Schema.selectedMeasurement = null;
        Schema.renderSchemaUI();
        return;
    }
    const retentionPolicy = Schema.selectedRetentionPolicy || 'autogen';
    Schema.loadMeasurementSchema(measurement, retentionPolicy);
}

function selectRetentionPolicy(policy) {
    Schema.selectedRetentionPolicy = policy || null;
    if (Schema.selectedMeasurement && policy) {
        Schema.loadMeasurementSchema(Schema.selectedMeasurement, policy);
    } else {
        Schema.renderSchemaUI();
    }
}

function filterInfluxFields(searchTerm) {
    const fieldsList = document.getElementById('fieldsList');
    if (!fieldsList || !Schema.selectedMeasurement) return;
    
    const fields = Schema.influxFields[Schema.selectedMeasurement] || [];
    const filteredFields = searchTerm ? 
        fields.filter(field => field.toLowerCase().includes(searchTerm.toLowerCase())) : 
        fields;
    
    let html = '';
    if (filteredFields.length === 0) {
        html = '<div class="schema-empty">No fields found</div>';
    } else {
        for (const field of filteredFields) {
            html += '<div class="schema-item" onclick="insertField(\'' + Utils.escapeHtml(field) + '\')">';
            html += '<span class="schema-item-name">' + Utils.escapeHtml(field) + '</span>';
            html += '<span class="schema-item-type field">field</span>';
            html += '</div>';
        }
    }
    
    fieldsList.innerHTML = html;
}

function filterInfluxTags(searchTerm) {
    const tagsList = document.getElementById('tagsList');
    if (!tagsList || !Schema.selectedMeasurement) return;
    
    const tags = Schema.influxTags[Schema.selectedMeasurement] || [];
    const filteredTags = searchTerm ? 
        tags.filter(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) : 
        tags;
    
    let html = '';
    if (filteredTags.length === 0) {
        html = '<div class="schema-empty">No tags found</div>';
    } else {
        for (const tag of filteredTags) {
            const isSelected = Schema.selectedTag === tag;
            const key = `${Schema.selectedMeasurement}:${tag}`;
            const tagValues = Schema.influxTagValues[key] || [];
            
            html += '<div class="schema-tag-wrapper">';
            
            // Tag item with expand/collapse icon
            html += '<div class="schema-item' + (isSelected ? ' selected' : '') + '" onclick="toggleTag(\'' + Utils.escapeHtml(tag) + '\')">';
            html += '<span class="schema-expand-icon">' + (isSelected ? '▼' : '▶') + '</span>';
            html += '<span class="schema-item-name">' + Utils.escapeHtml(tag) + '</span>';
            html += '<span class="schema-item-type tag">tag</span>';
            html += '</div>';
            
            // Tag values (shown when tag is selected)
            if (isSelected) {
                html += '<div class="schema-tag-values">';
                
                if (Schema.isLoadingTagValues) {
                    html += '<div class="schema-loading">Loading tag values...</div>';
                } else if (tagValues.length === 0) {
                    html += '<div class="schema-empty">No values found</div>';
                } else {
                    for (const value of tagValues) {
                        html += '<div class="schema-value-item" onclick="insertTagValue(\'' + Utils.escapeHtml(tag) + '\', \'' + Utils.escapeHtml(value) + '\')">';
                        html += '<span class="schema-value-name">' + Utils.escapeHtml(value) + '</span>';
                        html += '</div>';
                    }
                }
                
                html += '</div>';
            }
            
            html += '</div>';
        }
    }
    
    tagsList.innerHTML = html;
}

function refreshSchema() {
    Schema.refreshSchema();
}

function toggleSchemaExplorer() {
    const schemaSection = document.getElementById('schemaSection');
    const toggleButton = document.querySelector('.schema-toggle');
    
    if (schemaSection.classList.contains('collapsed')) {
        schemaSection.classList.remove('collapsed');
        toggleButton.textContent = 'Hide';
    } else {
        schemaSection.classList.add('collapsed');
        toggleButton.textContent = 'Show';
    }
}