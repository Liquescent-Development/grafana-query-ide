// WARNING: This module is being refactored to use DataAccess
// Use DataAccess.getSchema() for new code - see dataAccess.js
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
    selectedField: null, // Track which field is selected
    selectedTag: null, // Track which tag is selected
    fieldAssociatedTags: {}, // Store tags associated with fields keyed by "measurement:field"
    isLoading: false,
    isLoadingMeasurement: false,
    isLoadingFieldTags: false,
    isLoadingTagValues: false,
    
    // Computed property to indicate if schema is loaded
    get loadedSchema() {
        if (!this.currentDatasourceId) return null;
        
        if (this.currentDatasourceType === 'influxdb') {
            return {
                measurements: this.influxMeasurements.length > 0 ? 
                    this.influxMeasurements.reduce((acc, measurement) => {
                        acc[measurement] = {
                            fields: this.influxFields[measurement] || {},
                            tags: this.influxTags[measurement] || {}
                        };
                        return acc;
                    }, {}) : null
            };
        } else if (this.currentDatasourceType === 'prometheus') {
            return {
                metrics: this.prometheusMetrics,
                labels: this.prometheusLabels
            };
        }
        
        return null;
    },
    
    // Centralized method to get fields for a measurement, loading if necessary
    async getFieldsForMeasurement(measurement, retentionPolicy = 'autogen') {
        if (!measurement) return [];
        
        // Check if we already have fields for this measurement
        if (this.influxFields[measurement] && this.influxFields[measurement].length > 0) {
            console.log(`📋 Schema.getFieldsForMeasurement: Found cached fields for ${measurement}:`, this.influxFields[measurement]);
            return this.influxFields[measurement];
        }
        
        // If not in cache, load them
        console.log(`🔄 Schema.getFieldsForMeasurement: Loading fields for ${measurement}...`);
        try {
            await this.loadMeasurementFieldsAndTags(measurement, retentionPolicy, false);
            const fields = this.influxFields[measurement] || [];
            console.log(`✅ Schema.getFieldsForMeasurement: Loaded ${fields.length} fields for ${measurement}:`, fields);
            return fields;
        } catch (error) {
            console.error(`❌ Schema.getFieldsForMeasurement: Failed to load fields for ${measurement}:`, error);
            return [];
        }
    },
    
    // Centralized method to get tags for a measurement, loading if necessary  
    async getTagsForMeasurement(measurement, retentionPolicy = 'autogen') {
        if (!measurement) return [];
        
        // Check if we already have tags for this measurement
        if (this.influxTags[measurement] && this.influxTags[measurement].length > 0) {
            console.log(`📋 Schema.getTagsForMeasurement: Found cached tags for ${measurement}:`, this.influxTags[measurement].length);
            return this.influxTags[measurement];
        }
        
        // If not in cache, load them
        console.log(`🔄 Schema.getTagsForMeasurement: Loading tags for ${measurement}...`);
        try {
            await this.loadMeasurementFieldsAndTags(measurement, retentionPolicy, false);
            const tags = this.influxTags[measurement] || [];
            console.log(`✅ Schema.getTagsForMeasurement: Loaded ${tags.length} tags for ${measurement}`);
            return tags;
        } catch (error) {
            console.error(`❌ Schema.getTagsForMeasurement: Failed to load tags for ${measurement}:`, error);
            return [];
        }
    },
    
    // Cache management
    schemaCache: {}, // Cache schema data per datasource: { datasourceId: { type, data, timestamp } }
    cacheExpiry: 5 * 60 * 1000, // 5 minutes cache expiry
    lastDatasourceId: null, // Track last loaded datasource to avoid redundant loads
    
    // Clear all cached schema data
    clearSchemaCache() {
        console.log('🗑️ Clearing all schema cache data');
        this.schemaCache = {};
        this.lastDatasourceId = null;
        
        // Clear persistent storage cache
        if (typeof Storage !== 'undefined') {
            Storage.clearSchemaFromStorage();
        }
        
        // Clear in-memory data
        this.influxMeasurements = [];
        this.influxRetentionPolicies = [];
        this.influxFields = {};
        this.influxTags = {};
        this.influxTagValues = {};
        this.prometheusMetrics = [];
        this.prometheusLabels = {};
        
        console.log('✅ Schema cache cleared');
    },
    
    // Clear cache for specific datasource
    clearDatasourceCache(datasourceId) {
        if (this.schemaCache[datasourceId]) {
            console.log('🗑️ Clearing cache for datasource:', datasourceId);
            delete this.schemaCache[datasourceId];
            
            // Clear persistent storage cache for this datasource
            if (typeof Storage !== 'undefined') {
                Storage.clearSchemaFromStorage(datasourceId);
            }
            
            // If this is the current datasource, clear in-memory data
            if (this.currentDatasourceId === datasourceId) {
                this.influxMeasurements = [];
                this.influxRetentionPolicies = [];
                this.influxFields = {};
                this.influxTags = {};
                this.influxTagValues = {};
                this.prometheusMetrics = [];
                this.prometheusLabels = {};
            }
            
            console.log('✅ Cache cleared for datasource:', datasourceId);
        }
    },
    
    // Initialize schema explorer
    initialize() {
        this.renderSchemaUI();
        this.bindEvents();
    },
    
    // Bind event handlers
    bindEvents() {
        // Listen for datasource changes
        const datasourceSelect = document.getElementById('schemaDatasourceSelect');
        if (datasourceSelect) {
            datasourceSelect.addEventListener('change', () => {
                this.onDatasourceChange();
            });
        }
    },
    
    // Handle datasource change
    async onDatasourceChange() {
        const datasourceSelect = document.getElementById('schemaDatasourceSelect');
        const selectedOption = datasourceSelect.selectedOptions[0];
        
        if (!selectedOption || !selectedOption.value) {
            this.currentDatasourceType = null;
            this.currentDatasourceId = null;
            this.renderSchemaUI();
            return;
        }
        
        this.currentDatasourceType = selectedOption.dataset.type;
        this.currentDatasourceId = selectedOption.value;
        
        await this.loadSchemaIfNeeded();
    },
    
    // Check if schema needs to be loaded (new datasource or cache expired)
    shouldLoadSchema(datasourceId) {
        if (!datasourceId) return false;
        
        // Check if this is a different datasource than last time
        if (this.lastDatasourceId !== datasourceId) {
            console.log('Schema load needed: different datasource', this.lastDatasourceId, '->', datasourceId);
            return true;
        }
        
        // First check persistent storage
        if (typeof Storage !== 'undefined') {
            const persistentCache = Storage.getSchemaFromStorage(datasourceId, 24 * 60 * 60 * 1000); // 24 hours
            if (persistentCache) {
                console.log('Schema load NOT needed: using persistent storage for', datasourceId);
                return false;
            }
        }
        
        // Check if we have in-memory cached data for this datasource
        const cached = this.schemaCache[datasourceId];
        if (!cached) {
            console.log('Schema load needed: no cached data for', datasourceId);
            return true;
        }
        
        // Check if cache is expired
        const isExpired = Date.now() - cached.timestamp > this.cacheExpiry;
        if (isExpired) {
            console.log('Schema load needed: cache expired for', datasourceId);
            return true;
        }
        
        console.log('Schema load NOT needed: using in-memory cache for', datasourceId);
        return false;
    },
    
    // Load schema from cache or fetch if needed
    async loadSchemaIfNeeded(force = false) {
        // Use global config datasource if available (new interface)
        const datasourceId = this.currentDatasourceId || GrafanaConfig.selectedDatasourceUid;
        const datasourceType = this.currentDatasourceType || GrafanaConfig.selectedDatasourceType;
        
        if (!datasourceId || !datasourceType) {
            console.log('No datasource selected, clearing schema');
            this.clearSchema();
            this.renderSchemaUI();
            return;
        }
        
        // Try to load from persistent storage first
        if (!force && typeof Storage !== 'undefined') {
            const persistentCache = Storage.getSchemaFromStorage(datasourceId, 24 * 60 * 60 * 1000); // 24 hours
            if (persistentCache) {
                console.log('Loading schema from persistent storage for:', datasourceId);
                this.loadFromPersistentCache(persistentCache, datasourceId, datasourceType);
                this.renderSchemaUI();
                return;
            }
        }
        
        // Check if we need to load schema
        if (!force && !this.shouldLoadSchema(datasourceId)) {
            // Load from in-memory cache
            this.loadFromCache(datasourceId);
            this.renderSchemaUI();
            return;
        }
        
        // Load fresh data
        console.log('Loading fresh schema data for:', datasourceId, datasourceType);
        await this.loadSchema();
    },
    
    // Load schema from cache
    loadFromCache(datasourceId) {
        const cached = this.schemaCache[datasourceId];
        if (!cached) return;
        
        console.log('Loading schema from cache for:', datasourceId);
        
        // Set current state
        this.currentDatasourceId = datasourceId;
        this.currentDatasourceType = cached.type;
        this.lastDatasourceId = datasourceId;
        
        // Load cached data
        if (cached.type === 'prometheus') {
            this.prometheusMetrics = cached.data.metrics || [];
            this.prometheusLabels = cached.data.labels || {};
        } else if (cached.type === 'influxdb') {
            this.influxMeasurements = cached.data.measurements || [];
            this.influxRetentionPolicies = cached.data.retentionPolicies || [];
            this.influxFields = cached.data.fields || {};
            this.influxTags = cached.data.tags || {};
            this.influxTagValues = cached.data.tagValues || {};
        }
    },
    
    // Load schema from persistent storage cache
    loadFromPersistentCache(cached, datasourceId, datasourceType) {
        console.log('Loading schema from persistent storage for:', datasourceId);
        
        // Set current state
        this.currentDatasourceId = datasourceId;
        this.currentDatasourceType = datasourceType;
        this.lastDatasourceId = datasourceId;
        
        // Load cached data
        if (datasourceType === 'prometheus') {
            this.prometheusMetrics = cached.metrics || [];
            this.prometheusLabels = cached.labels || {};
        } else if (datasourceType === 'influxdb') {
            this.influxRetentionPolicies = cached.retentionPolicies || [];
            this.influxMeasurements = cached.measurements || [];
            this.influxFields = cached.fields || {};
            this.influxTags = cached.tags || {};
            this.influxTagValues = cached.tagValues || {};
        }
        
        // Also update in-memory cache
        this.schemaCache[datasourceId] = {
            type: datasourceType,
            data: {
                retentionPolicies: this.influxRetentionPolicies,
                measurements: this.influxMeasurements,
                fields: this.influxFields,
                tags: this.influxTags,
                tagValues: this.influxTagValues,
                metrics: this.prometheusMetrics,
                labels: this.prometheusLabels
            },
            timestamp: cached.timestamp
        };
    },
    
    // Save schema to cache
    saveToCache(datasourceId, datasourceType) {
        console.log('Saving schema to cache for:', datasourceId, datasourceType);
        
        const data = {};
        if (datasourceType === 'prometheus') {
            data.metrics = this.prometheusMetrics;
            data.labels = this.prometheusLabels;
        } else if (datasourceType === 'influxdb') {
            data.measurements = this.influxMeasurements;
            data.retentionPolicies = this.influxRetentionPolicies;
            data.fields = this.influxFields;
            data.tags = this.influxTags;
            data.tagValues = this.influxTagValues;
        }
        
        const timestamp = Date.now();
        
        // Save to in-memory cache
        this.schemaCache[datasourceId] = {
            type: datasourceType,
            data: data,
            timestamp: timestamp
        };
        
        // Save to persistent storage
        if (typeof Storage !== 'undefined') {
            const persistentData = {
                ...data,
                type: datasourceType
            };
            Storage.saveSchemaToStorage(datasourceId, persistentData);
        }
        
        this.lastDatasourceId = datasourceId;
    },
    
    // Clear current schema data
    clearSchema() {
        this.currentDatasourceType = null;
        this.currentDatasourceId = null;
        this.prometheusMetrics = [];
        this.prometheusLabels = {};
        this.influxMeasurements = [];
        this.influxRetentionPolicies = [];
        this.influxFields = {};
        this.influxTags = {};
        this.influxTagValues = {};
        this.selectedMeasurement = null;
        this.selectedRetentionPolicy = null;
        this.selectedField = null;
        this.selectedTag = null;
        this.fieldAssociatedTags = {};
    },
    
    // Load schema based on datasource type
    async loadSchema() {
        // Use global config if current values not set (new interface)
        const datasourceId = this.currentDatasourceId || GrafanaConfig.selectedDatasourceUid;
        const datasourceType = this.currentDatasourceType || GrafanaConfig.selectedDatasourceType;
        
        if (!datasourceType || !datasourceId) return;
        
        // Update current state
        this.currentDatasourceId = datasourceId;
        this.currentDatasourceType = datasourceType;
        
        this.isLoading = true;
        this.renderSchemaUI();
        
        try {
            console.log('Loading schema for:', datasourceType, datasourceId);
            if (datasourceType === 'prometheus') {
                await this.loadPrometheusSchema();
            } else if (datasourceType === 'influxdb') {
                await this.loadInfluxDBSchema();
            }
            
            // Save to cache after successful load
            this.saveToCache(datasourceId, datasourceType);
            
        } catch (error) {
            console.error('Error loading schema:', error);
            this.showError('Failed to load schema: ' + error.message);
        } finally {
            this.isLoading = false;
            this.renderSchemaUI();
        }
    },
    
    // Load Prometheus schema (metrics only, labels loaded per-metric)
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
            
            // Initialize empty labels structure - labels will be loaded per metric
            this.prometheusLabels = {};
            
            console.log('Final Prometheus schema:', {
                metrics: this.prometheusMetrics.length
            });
            
        } catch (error) {
            console.error('Error loading Prometheus schema:', error);
            // Set some default common metrics if discovery fails
            this.prometheusMetrics = ['up', 'prometheus_build_info', 'process_start_time_seconds'];
            this.prometheusLabels = {};
        }
    },
    
    // Load labels for a specific Prometheus metric
    async loadPrometheusMetricLabels(metric) {
        try {
            console.log('Loading labels for metric:', metric);
            
            // Query to get labels for this specific metric
            const labelsQuery = `group by (__name__) ({__name__="${metric}"})`;
            console.log('Executing metric labels query:', labelsQuery);
            const labelsResult = await this.executeSchemaQuery(labelsQuery, 'prometheus');
            
            console.log('Metric labels result:', labelsResult);
            
            const metricLabels = new Set(['__name__']); // Always include __name__
            
            if (labelsResult && labelsResult.results && labelsResult.results.A && labelsResult.results.A.frames) {
                // Extract label names from frame schema
                for (const frame of labelsResult.results.A.frames) {
                    if (frame.schema && frame.schema.fields) {
                        frame.schema.fields.forEach(field => {
                            if (field.labels) {
                                Object.keys(field.labels).forEach(labelName => {
                                    metricLabels.add(labelName);
                                    console.log('Found label for metric:', labelName);
                                });
                            }
                        });
                    }
                }
            }
            
            // Store labels for this metric
            this.prometheusLabels[metric] = Array.from(metricLabels).sort();
            console.log(`Found ${this.prometheusLabels[metric].length} labels for ${metric}:`, this.prometheusLabels[metric]);
            
            return this.prometheusLabels[metric];
            
        } catch (error) {
            console.error('Error loading labels for metric:', metric, error);
            // Set some default labels
            this.prometheusLabels[metric] = ['__name__', 'job', 'instance'];
            return this.prometheusLabels[metric];
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
            console.log('🔍 Retention policies result structure:', JSON.stringify(retentionPoliciesResult, null, 2));
            
            if (retentionPoliciesResult && retentionPoliciesResult.results && retentionPoliciesResult.results.A) {
                console.log('🎯 Processing retention policies results.A:', retentionPoliciesResult.results.A);
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
            
            // Load fields for common measurements to enable better autocomplete
            await this.loadCommonFieldsAndTags();
            
        } catch (error) {
            console.error('Error loading InfluxDB schema:', error);
            // Set defaults if discovery fails
            this.influxRetentionPolicies = ['autogen'];
            this.influxMeasurements = [];
        }
    },
    
    // Load fields and tags for common measurements to enhance autocompletion
    async loadCommonFieldsAndTags() {
        if (this.influxMeasurements.length === 0) return;
        
        console.log('Loading fields and tags for common measurements...');
        
        // Load fields and tags for up to 10 measurements initially (more will be loaded dynamically as needed)
        const measurementsToLoad = this.influxMeasurements.slice(0, Math.min(10, this.influxMeasurements.length));
        const defaultRetentionPolicy = this.influxRetentionPolicies[0] || 'autogen';
        
        for (const measurement of measurementsToLoad) {
            try {
                console.log(`Loading schema for measurement: ${measurement}`);
                
                // Load fields
                let fieldsQuery = `SHOW FIELD KEYS FROM "${measurement}"`;
                let fieldsResult = await this.executeSchemaQuery(fieldsQuery, 'influxdb');
                
                // If no results, try with retention policy
                if (!fieldsResult || !fieldsResult.results || !fieldsResult.results.A || 
                    !fieldsResult.results.A.series || fieldsResult.results.A.series.length === 0) {
                    fieldsQuery = `SHOW FIELD KEYS FROM "${defaultRetentionPolicy}"."${measurement}"`;
                    fieldsResult = await this.executeSchemaQuery(fieldsQuery, 'influxdb');
                }
                
                if (fieldsResult && fieldsResult.results && fieldsResult.results.A) {
                    const fields = this.extractInfluxResults(fieldsResult.results.A);
                    if (fields.length > 0) {
                        this.influxFields[measurement] = fields;
                        console.log(`Loaded ${fields.length} fields for ${measurement}:`, fields);
                    }
                }
                
                // Load tags
                let tagsQuery = `SHOW TAG KEYS FROM "${measurement}"`;
                let tagsResult = await this.executeSchemaQuery(tagsQuery, 'influxdb');
                
                // If no results, try with retention policy
                if (!tagsResult || !tagsResult.results || !tagsResult.results.A || 
                    !tagsResult.results.A.series || tagsResult.results.A.series.length === 0) {
                    tagsQuery = `SHOW TAG KEYS FROM "${defaultRetentionPolicy}"."${measurement}"`;
                    tagsResult = await this.executeSchemaQuery(tagsQuery, 'influxdb');
                }
                
                if (tagsResult && tagsResult.results && tagsResult.results.A) {
                    const tags = this.extractInfluxResults(tagsResult.results.A);
                    if (tags.length > 0) {
                        this.influxTags[measurement] = tags;
                        console.log(`Loaded ${tags.length} tags for ${measurement}:`, tags);
                    }
                }
                
            } catch (error) {
                console.warn(`Failed to load schema for measurement ${measurement}:`, error);
                // Continue with next measurement
            }
        }
        
        console.log('Common fields and tags loaded:', {
            fieldsForMeasurements: Object.keys(this.influxFields).length,
            tagsForMeasurements: Object.keys(this.influxTags).length
        });
    },
    
    // Load fields and tags for a specific measurement
    async loadMeasurementSchema(measurement, retentionPolicy = 'autogen') {
        this.selectedMeasurement = measurement;
        this.selectedRetentionPolicy = retentionPolicy;
        this.selectedField = null; // Clear selected field when changing measurement
        this.selectedTag = null; // Clear selected tag when changing measurement
        this.isLoadingMeasurement = true;
        
        // Don't render entire UI, let the caller handle the loading state
        
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
            // Don't render entire UI, let the caller handle the final state
        }
    },
    
    // Load just fields and tags for a measurement (for tree expansion)
    async loadMeasurementFieldsAndTags(measurement, retentionPolicy = 'autogen', forceReload = false) {
        try {
            console.log(`Loading fields and tags for measurement: ${measurement}, retention policy: ${retentionPolicy}, force: ${forceReload}`);
            
            // Check if we already have data and don't need to force reload
            if (!forceReload && this.influxFields[measurement] && this.influxFields[measurement].length > 0) {
                console.log('Using cached fields and tags for measurement:', measurement);
                return {
                    fields: this.influxFields[measurement] || [],
                    tags: this.influxTags[measurement] || []
                };
            }
            
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
            
            console.log(`Fields and tags loaded for ${measurement}:`, {
                fields: this.influxFields[measurement] ? this.influxFields[measurement].length : 0,
                tags: this.influxTags[measurement] ? this.influxTags[measurement].length : 0
            });
            
            return {
                fields: this.influxFields[measurement] || [],
                tags: this.influxTags[measurement] || []
            };
            
        } catch (error) {
            console.error('Error loading measurement fields and tags:', error);
            this.influxFields[measurement] = [];
            this.influxTags[measurement] = [];
            return {
                fields: [],
                tags: []
            };
        }
    },
    
    // Force reload fields and tags for a specific measurement
    async forceReloadMeasurement(measurement, retentionPolicy = 'autogen') {
        console.log('🔄 Force reloading fields and tags for measurement:', measurement);
        
        // Clear cached data for this measurement
        delete this.influxFields[measurement];
        delete this.influxTags[measurement];
        
        // Clear any tag values associated with this measurement
        Object.keys(this.influxTagValues).forEach(key => {
            if (key.startsWith(`${measurement}:`)) {
                delete this.influxTagValues[key];
            }
        });
        
        // Reload with force flag
        const result = await this.loadMeasurementFieldsAndTags(measurement, retentionPolicy, true);
        
        // Re-render the UI to show fresh data
        this.renderSchemaUI();
        
        return result;
    },
    
    // Legacy method - redirects to executeSchemaQuery
    async executeInfluxSchemaQuery(query, datasourceNumericId) {
        return this.executeSchemaQuery(query, 'influxdb');
    },
    
    // Execute schema discovery query using DataAccess layer
    async executeSchemaQuery(query, datasourceType) {
        try {
            // Use currentDatasourceId if set (for specific schema loading), 
            // otherwise fall back to global datasourceId
            const datasourceId = this.currentDatasourceId || GrafanaConfig.datasourceId;
            if (!datasourceId) {
                throw new Error('No datasource selected');
            }
            
            // Use DataAccess layer for schema queries
            const result = await DataAccess.executeQuery(datasourceId, query, {
                datasourceType: datasourceType || 'influxdb',
                maxDataPoints: 10000,
                raw: true
            });
            
            return result;
        } catch (error) {
            console.error('Schema query error:', error);
            throw error;
        }
    },
    
    // Load tags associated with a specific field
    async loadFieldAssociatedTags(field) {
        if (!this.selectedMeasurement || !field) return;
        
        const key = `${this.selectedMeasurement}:${field}`;
        this.selectedField = field;
        this.selectedTag = null; // Clear selected tag when field changes
        this.isLoadingFieldTags = true;
        
        // Update only the tags list to show loading state
        this.renderTagsList();
        
        // Clear tag values panel since selected tag is cleared
        this.renderTagValuesPanel();
        
        try {
            console.log(`Loading tags associated with field: ${field} in measurement: ${this.selectedMeasurement}`);
            
            // Query to get tag groupings for this field
            const now = Date.now();
            const fromTime = now - (60 * 60 * 1000); // 1 hour ago
            const toTime = now;
            
            // Build time filter
            const timeFilter = `time >= ${fromTime}ms AND time <= ${toTime}ms`;
            
            // Query with GROUP BY * to get all tag combinations
            const tagsQuery = `SELECT last("${field}") FROM "${this.selectedRetentionPolicy}"."${this.selectedMeasurement}" WHERE ${timeFilter} GROUP BY time(1h), *`;
            console.log('Executing field tags query:', tagsQuery);
            
            const tagsResult = await this.executeSchemaQuery(tagsQuery, 'influxdb');
            console.log('Field tags result:', tagsResult);
            
            const associatedTags = new Set();
            
            if (tagsResult && tagsResult.results && tagsResult.results.A && tagsResult.results.A.frames) {
                // Extract tag names from the frames
                for (const frame of tagsResult.results.A.frames) {
                    if (frame.schema && frame.schema.fields) {
                        frame.schema.fields.forEach(field => {
                            if (field.labels) {
                                Object.keys(field.labels).forEach(tagName => {
                                    // Exclude time-related labels
                                    if (tagName !== 'Time' && tagName !== '__name__') {
                                        associatedTags.add(tagName);
                                    }
                                });
                            }
                        });
                    }
                }
            }
            
            this.fieldAssociatedTags[key] = Array.from(associatedTags).sort();
            console.log(`Found ${this.fieldAssociatedTags[key].length} tags associated with field ${field}:`, this.fieldAssociatedTags[key]);
            
        } catch (error) {
            console.error('Error loading field associated tags:', error);
            // If the query fails, don't filter tags
            this.fieldAssociatedTags[key] = null;
        } finally {
            this.isLoadingFieldTags = false;
            this.renderTagsList();
        }
    },
    
    // Render just the tag values panel
    renderTagValuesPanel() {
        const valuesPanel = document.querySelector('.schema-values-panel');
        if (!valuesPanel) return;
        
        let html = '';
        html += '<div class="schema-panel-header">';
        html += '<h5>Tag Values' + (this.selectedTag ? ' (' + Utils.escapeHtml(this.selectedTag) + ')' : '') + '</h5>';
        html += '</div>';
        
        if (this.selectedTag) {
            const key = `${this.selectedMeasurement}:${this.selectedTag}`;
            const tagValues = this.influxTagValues[key] || [];
            
            // Search box for tag values
            html += '<div class="schema-search">';
            html += '<input type="text" id="tagValuesSearch" placeholder="Search values..." onkeyup="filterTagValues(this.value)">';
            html += '</div>';
            
            html += '<div class="schema-list" id="tagValuesList">';
            
            if (this.isLoadingTagValues) {
                html += '<div class="schema-loading">Loading tag values...</div>';
            } else if (tagValues.length === 0) {
                html += '<div class="schema-empty">No values found</div>';
            } else {
                for (const value of tagValues) {
                    html += '<div class="schema-value-item" onclick="insertTagValue(\'' + Utils.escapeHtml(this.selectedTag) + '\', \'' + Utils.escapeHtml(value) + '\')">';
                    html += '<span class="schema-value-name">' + Utils.escapeHtml(value) + '</span>';
                    html += '</div>';
                }
            }
            
            html += '</div>';
        } else {
            html += '<div class="schema-list">';
            html += '<div class="schema-empty">Select a tag to view values</div>';
            html += '</div>';
        }
        
        // Save current scroll position of tag values list if it exists
        const currentTagValuesList = document.getElementById('tagValuesList');
        const scrollTop = currentTagValuesList ? currentTagValuesList.scrollTop : 0;
        
        valuesPanel.innerHTML = html;
        
        // Restore scroll position after render
        if (this.selectedTag) {
            requestAnimationFrame(() => {
                const newTagValuesList = document.getElementById('tagValuesList');
                if (newTagValuesList && scrollTop > 0) {
                    newTagValuesList.scrollTop = scrollTop;
                }
            });
        }
    },
    
    // Load tag values for tree expansion (with explicit measurement)
    async loadTagValuesForMeasurement(tag, measurement) {
        try {
            console.log(`Loading values for tag: ${tag} in measurement: ${measurement}`);
            
            const key = `${measurement}:${tag}`;
            
            // Query for tag values from the specific measurement
            const tagValuesQuery = `SHOW TAG VALUES FROM "${measurement}" WITH KEY = "${tag}"`;
            console.log('Executing tag values query:', tagValuesQuery);
            const tagValuesResult = await this.executeSchemaQuery(tagValuesQuery, 'influxdb');
            console.log('Tag values result:', tagValuesResult);
            
            if (tagValuesResult && tagValuesResult.results && tagValuesResult.results.A) {
                // Extract values from the result
                const values = [];
                const frames = tagValuesResult.results.A.frames || [];
                
                for (const frame of frames) {
                    if (!frame.data || !frame.data.values) continue;
                    
                    // SHOW TAG VALUES returns results with the tag key in first column and value in second
                    for (let i = 0; i < frame.data.values.length; i++) {
                        const column = frame.data.values[i];
                        if (Array.isArray(column)) {
                            // Skip the first column if it contains the tag name
                            if (i === 0 && column.length > 0 && column[0] === tag) {
                                continue;
                            }
                            
                            // Extract values from this column
                            for (const value of column) {
                                if (value !== null && value !== undefined && value !== tag) {
                                    const stringValue = String(value);
                                    if (!values.includes(stringValue)) {
                                        values.push(stringValue);
                                    }
                                }
                            }
                        }
                    }
                }
                
                this.influxTagValues[key] = values.sort();
                console.log(`Extracted ${values.length} values for tag ${tag} in ${measurement}:`, this.influxTagValues[key]);
                return this.influxTagValues[key];
            } else {
                console.warn('No tag values found for:', tag, 'in measurement:', measurement);
                this.influxTagValues[key] = [];
                return [];
            }
            
        } catch (error) {
            console.error('Error loading tag values:', error);
            const key = `${measurement}:${tag}`;
            this.influxTagValues[key] = [];
            return [];
        }
    },
    
    // Load tag values for a specific tag
    async loadTagValues(tag) {
        if (!this.selectedMeasurement || !tag) return;
        
        const key = `${this.selectedMeasurement}:${tag}`;
        this.selectedTag = tag;
        this.isLoadingTagValues = true;
        
        // Save scroll positions
        const scrollPositions = this.saveScrollPositions();
        
        // Update tags list to show selection
        const tagsList = document.getElementById('tagsList');
        if (tagsList) {
            // Remove previous selection
            const selectedItems = tagsList.querySelectorAll('.schema-item.selected');
            selectedItems.forEach(item => item.classList.remove('selected'));
            
            // Add selection to clicked tag
            const clickedTag = Array.from(tagsList.querySelectorAll('.schema-item')).find(
                item => item.querySelector('.schema-item-name').textContent === tag
            );
            if (clickedTag) {
                clickedTag.classList.add('selected');
            }
        }
        
        // Update only tag values panel to show loading state
        this.renderTagValuesPanel();
        
        // Restore scroll positions
        this.restoreScrollPositions(scrollPositions);
        
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
                    
                    // SHOW TAG VALUES returns results with the tag key in first column and value in second
                    // But we should check all columns to be safe
                    for (let i = 0; i < frame.data.values.length; i++) {
                        const column = frame.data.values[i];
                        if (Array.isArray(column)) {
                            // Skip the first column if it contains the tag name
                            if (i === 0 && column.length > 0 && column[0] === tag) {
                                continue;
                            }
                            
                            // Extract values from this column
                            for (const value of column) {
                                if (value !== null && value !== undefined && value !== tag) {
                                    const stringValue = String(value);
                                    if (!values.includes(stringValue)) {
                                        values.push(stringValue);
                                    }
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
            this.renderTagValuesPanel();
            
            // Ensure selected items are visible
            this.ensureItemVisible('fieldsList', '.schema-item.selected');
            this.ensureItemVisible('tagsList', '.schema-item.selected');
        }
    },
    
    // Extract results from InfluxDB response
    extractInfluxResults(result) {
        const values = [];
        
        // Handle both old format (series) and new format (frames)
        if (result.frames && result.frames.length > 0) {
            // New Grafana frame format
            for (const frame of result.frames) {
                if (!frame.data || !frame.data.values) continue;
                
                // For SHOW commands, InfluxDB data can be in column format
                // The first column contains the values we want
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
        } else if (result.series && result.series.length > 0) {
            // Old InfluxDB format (for backward compatibility)
            for (const series of result.series) {
                if (!series.values) continue;
                
                for (const row of series.values) {
                    if (Array.isArray(row)) {
                        // Take the first column (usually the value we want)
                        const value = row[0];
                        if (value !== null && value !== undefined) {
                            const stringValue = String(value);
                            if (!values.includes(stringValue)) {
                                values.push(stringValue);
                            }
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
    
    // Refresh schema cache
    async refreshSchema() {
        console.log('🔄 Refreshing schema cache...');
        
        // Clear cache for current datasource
        if (this.currentDatasourceId) {
            this.clearDatasourceCache(this.currentDatasourceId);
        }
        
        // Force reload schema
        await this.loadSchemaIfNeeded(true);
        
        console.log('✅ Schema cache refreshed');
    },
    
    // Render Prometheus schema as a tree
    renderPrometheusSchema() {
        let html = '<div class="schema-tree">';
        
        // Search box at the top
        html += '<div class="schema-search">';
        html += '<input type="text" id="metricsSearch" placeholder="Search metrics..." onkeyup="filterPrometheusMetrics(this.value)">';
        html += '</div>';
        
        // Metrics tree node
        html += '<div class="tree-node">';
        html += '<div class="tree-node-header" onclick="toggleTreeNode(this)">';
        html += '<span class="tree-node-icon">▼</span>';
        html += '<span class="tree-node-label">Metrics</span>';
        html += '<span class="tree-node-count">(' + this.prometheusMetrics.length + ')</span>';
        html += '</div>';
        html += '<div class="tree-node-content expanded" id="metricsList">';
        
        if (this.prometheusMetrics.length === 0) {
            html += '<div class="tree-item-empty">No metrics found</div>';
        } else {
            // Group metrics by prefix for better organization
            const groupedMetrics = this.groupMetricsByPrefix(this.prometheusMetrics);
            
            for (const [prefix, metrics] of Object.entries(groupedMetrics)) {
                if (metrics.length > 1 && prefix !== 'other') {
                    // Create a sub-group for metrics with common prefix
                    html += '<div class="tree-subnode">';
                    html += '<div class="tree-subnode-header" onclick="toggleTreeNode(this)">';
                    html += '<span class="tree-node-icon">▼</span>';
                    html += '<span class="tree-node-label">' + Utils.escapeHtml(prefix) + '</span>';
                    html += '<span class="tree-node-count">(' + metrics.length + ')</span>';
                    html += '</div>';
                    html += '<div class="tree-subnode-content expanded">';
                    
                    for (const metric of metrics) {
                        html += this.renderPrometheusMetricWithLabels(metric);
                    }
                    
                    html += '</div>';
                    html += '</div>';
                } else {
                    // Show individual metrics
                    for (const metric of metrics) {
                        html += this.renderPrometheusMetricWithLabels(metric);
                    }
                }
            }
        }
        
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
        return html;
    },
    
    // Render a single Prometheus metric with its labels as children
    renderPrometheusMetricWithLabels(metric) {
        let html = '';
        
        // Metric node with expandable labels
        html += '<div class="tree-subnode">';
        html += '<div class="tree-subnode-header metric-header">';
        html += '<span class="tree-node-icon" onclick="togglePrometheusMetric(this.parentElement, \'' + Utils.escapeHtml(metric) + '\')">▶</span>';
        html += '<span class="tree-item-icon">📊</span>';
        html += '<span class="tree-item-name" onclick="insertMetric(\'' + Utils.escapeHtml(metric) + '\')" title="Click to insert metric">' + Utils.escapeHtml(metric) + '</span>';
        html += '</div>';
        html += '<div class="tree-subnode-content collapsed" id="labels-' + Utils.escapeHtml(metric).replace(/[^a-zA-Z0-9]/g, '_') + '">';
        
        // Labels will be loaded when expanded
        html += '<div class="tree-item-empty">Click arrow to load labels...</div>';
        
        html += '</div>';
        html += '</div>';
        
        return html;
    },
    
    // Group metrics by common prefix for better tree organization
    groupMetricsByPrefix(metrics) {
        const groups = {};
        const prefixCounts = {};
        
        // Count common prefixes
        for (const metric of metrics) {
            const parts = metric.split('_');
            if (parts.length > 1) {
                const prefix = parts[0];
                prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
            }
        }
        
        // Group metrics by prefix if there are enough items
        for (const metric of metrics) {
            const parts = metric.split('_');
            if (parts.length > 1) {
                const prefix = parts[0];
                if (prefixCounts[prefix] >= 3) { // Only group if 3+ metrics share prefix
                    if (!groups[prefix]) groups[prefix] = [];
                    groups[prefix].push(metric);
                    continue;
                }
            }
            
            // Add to 'other' group
            if (!groups.other) groups.other = [];
            groups.other.push(metric);
        }
        
        return groups;
    },
    
    // Render InfluxDB schema as a tree with proper hierarchy
    renderInfluxDBSchema() {
        let html = '<div class="schema-tree">';
        
        // Search box for measurements at the top
        html += '<div class="schema-search">';
        html += '<input type="text" id="measurementsSearch" placeholder="Search measurements..." onkeyup="filterInfluxMeasurements(this.value)">';
        html += '</div>';
        
        // Retention Policies as top level, with measurements as children
        if (this.influxRetentionPolicies.length > 0) {
            for (const policy of this.influxRetentionPolicies) {
                html += this.renderRetentionPolicyWithMeasurements(policy);
            }
        } else {
            html += '<div class="tree-item-empty">No retention policies found</div>';
        }
        
        html += '</div>';
        return html;
    },
    
    // Render a retention policy with its measurements as children
    renderRetentionPolicyWithMeasurements(retentionPolicy) {
        let html = '';
        
        html += '<div class="tree-node">';
        html += '<div class="tree-node-header" onclick="toggleInfluxRetentionPolicy(this, \'' + Utils.escapeHtml(retentionPolicy) + '\')">';
        html += '<span class="tree-node-icon">▶</span>';
        html += '<span class="tree-item-icon">🗄️</span>';
        html += '<span class="tree-node-label">' + Utils.escapeHtml(retentionPolicy) + '</span>';
        html += '<span class="tree-node-count">(' + this.influxMeasurements.length + ' measurements)</span>';
        html += '</div>';
        html += '<div class="tree-node-content collapsed" id="measurements-' + Utils.escapeHtml(retentionPolicy).replace(/[^a-zA-Z0-9]/g, '_') + '">';
        
        // Measurements will be loaded when expanded
        html += '<div class="tree-item-empty">Click to load measurements...</div>';
        
        html += '</div>';
        html += '</div>';
        
        return html;
    },
    
    // Render a measurement with its fields as children
    renderMeasurementWithFields(measurement, retentionPolicy) {
        let html = '';
        
        html += '<div class="tree-subnode">';
        html += '<div class="tree-subnode-header measurement-header">';
        html += '<span class="tree-node-icon expand-button" aria-expanded="false" onclick="toggleInfluxMeasurement(this.parentElement, \'' + Utils.escapeHtml(measurement) + '\', \'' + Utils.escapeHtml(retentionPolicy) + '\')">▶</span>';
        html += '<span class="tree-item-icon">📋</span>';
        html += '<span class="tree-item-name" data-measurement="' + Utils.escapeHtml(measurement) + '" onclick="insertMeasurement(\'' + Utils.escapeHtml(measurement) + '\')" title="Click to insert measurement">' + Utils.escapeHtml(measurement) + '</span>';
        html += '</div>';
        html += '<div class="tree-subnode-content collapsed" id="fields-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_') + '">';
        
        // Fields will be loaded when expanded
        html += '<div class="tree-item-empty">Click arrow to load fields...</div>';
        
        html += '</div>';
        html += '</div>';
        
        return html;
    },
    
    // Render a field with its tag keys as children
    renderFieldWithTags(field, measurement) {
        let html = '';
        
        html += '<div class="tree-subnode">';
        html += '<div class="tree-subnode-header field-header">';
        html += '<span class="tree-node-icon" onclick="toggleInfluxField(this.parentElement, \'' + Utils.escapeHtml(field) + '\', \'' + Utils.escapeHtml(measurement) + '\')">▶</span>';
        html += '<span class="tree-item-icon">🔢</span>';
        html += '<span class="tree-item-name field-key schema-field" onclick="insertField(\'' + Utils.escapeHtml(field) + '\')" title="Click to insert field">' + Utils.escapeHtml(field) + '</span>';
        html += '</div>';
        html += '<div class="tree-subnode-content collapsed" id="tags-' + Utils.escapeHtml(field).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_') + '">';
        
        // Tag keys will be loaded when expanded
        html += '<div class="tree-item-empty">Click arrow to load tag keys...</div>';
        
        html += '</div>';
        html += '</div>';
        
        return html;
    },
    
    // Render a tag key with its values as children
    renderTagWithValues(tag, field, measurement) {
        let html = '';
        
        html += '<div class="tree-subnode">';
        html += '<div class="tree-subnode-header tag-header">';
        html += '<span class="tree-node-icon" onclick="toggleInfluxTag(this.parentElement, \'' + Utils.escapeHtml(tag) + '\', \'' + Utils.escapeHtml(field) + '\', \'' + Utils.escapeHtml(measurement) + '\')">▶</span>';
        html += '<span class="tree-item-icon">🏷️</span>';
        html += '<span class="tree-item-name" onclick="insertTag(\'' + Utils.escapeHtml(tag) + '\')" title="Click to insert tag key">' + Utils.escapeHtml(tag) + '</span>';
        html += '</div>';
        html += '<div class="tree-subnode-content collapsed" id="values-' + Utils.escapeHtml(tag).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(field).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_') + '">';
        
        // Tag values will be loaded when expanded
        html += '<div class="tree-item-empty">Click arrow to load tag values...</div>';
        
        html += '</div>';
        html += '</div>';
        
        return html;
    },
    
    // Save scroll positions
    saveScrollPositions() {
        const positions = {};
        const fieldsList = document.getElementById('fieldsList');
        const tagsList = document.getElementById('tagsList');
        const tagValuesList = document.getElementById('tagValuesList');
        
        if (fieldsList) positions.fields = fieldsList.scrollTop;
        if (tagsList) positions.tags = tagsList.scrollTop;
        if (tagValuesList) positions.tagValues = tagValuesList.scrollTop;
        
        return positions;
    },
    
    // Restore scroll positions
    restoreScrollPositions(positions) {
        if (!positions) return;
        
        requestAnimationFrame(() => {
            const fieldsList = document.getElementById('fieldsList');
            const tagsList = document.getElementById('tagsList');
            const tagValuesList = document.getElementById('tagValuesList');
            
            if (fieldsList && positions.fields !== undefined) {
                fieldsList.scrollTop = positions.fields;
            }
            if (tagsList && positions.tags !== undefined) {
                tagsList.scrollTop = positions.tags;
            }
            if (tagValuesList && positions.tagValues !== undefined) {
                tagValuesList.scrollTop = positions.tagValues;
            }
        });
    },
    
    // Ensure selected item is visible
    ensureItemVisible(containerId, itemSelector) {
        requestAnimationFrame(() => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const selectedItem = container.querySelector(itemSelector);
            if (!selectedItem) return;
            
            const containerRect = container.getBoundingClientRect();
            const itemRect = selectedItem.getBoundingClientRect();
            
            // Check if item is outside visible area
            if (itemRect.top < containerRect.top) {
                // Item is above visible area
                container.scrollTop -= containerRect.top - itemRect.top;
            } else if (itemRect.bottom > containerRect.bottom) {
                // Item is below visible area
                container.scrollTop += itemRect.bottom - containerRect.bottom;
            }
        });
    },
    
    // Render just the tags list
    renderTagsList() {
        const tagsList = document.getElementById('tagsList');
        if (!tagsList || !this.selectedMeasurement) return;
        
        // Save current scroll position
        const scrollTop = tagsList.scrollTop;
        
        const tags = this.influxTags[this.selectedMeasurement] || [];
        
        // Filter tags based on selected field if available
        let displayTags = tags;
        if (this.selectedField) {
            const key = `${this.selectedMeasurement}:${this.selectedField}`;
            const associatedTags = this.fieldAssociatedTags[key];
            if (associatedTags !== null && associatedTags !== undefined) {
                displayTags = tags.filter(tag => associatedTags.includes(tag));
            }
        }
        
        let html = '';
        
        if (this.isLoadingFieldTags) {
            html = '<div class="schema-loading">Loading associated tags...</div>';
        } else if (displayTags.length === 0) {
            html = '<div class="schema-empty">No tags found</div>';
        } else {
            for (const tag of displayTags) {
                const isSelected = this.selectedTag === tag;
                
                html += '<div class="schema-item' + (isSelected ? ' selected' : '') + '" onclick="selectTag(\'' + Utils.escapeHtml(tag) + '\')">';
                html += '<span class="schema-item-name">' + Utils.escapeHtml(tag) + '</span>';
                html += '<span class="schema-item-type tag">tag</span>';
                html += '</div>';
            }
        }
        
        tagsList.innerHTML = html;
        
        // Restore scroll position
        requestAnimationFrame(() => {
            tagsList.scrollTop = scrollTop;
        });
        
        // Update the header to show field context
        const headerElement = document.querySelector('.schema-tags-panel .schema-panel-header h5');
        if (headerElement) {
            headerElement.textContent = 'Tag Keys' + (this.selectedField ? ' (for ' + this.selectedField + ')' : '');
        }
    },
    
};

// Global functions for HTML onclick handlers
function refreshSchema() {
    Schema.refreshSchema();
}

function toggleTreeNode(header) {
    const icon = header.querySelector('.tree-node-icon');
    const content = header.nextElementSibling;
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        icon.textContent = '▶';
    } else {
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        icon.textContent = '▼';
    }
}

// Toggle Prometheus metric and load its labels
async function togglePrometheusMetric(header, metric) {
    const icon = header.querySelector('.tree-node-icon');
    const content = header.nextElementSibling;
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        icon.textContent = '▶';
    } else {
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        icon.textContent = '▼';
        
        // Check if labels are already loaded
        if (!Schema.prometheusLabels[metric]) {
            // Show loading state
            content.innerHTML = '<div class="tree-item-empty">Loading labels...</div>';
            
            // Load labels for this metric
            const labels = await Schema.loadPrometheusMetricLabels(metric);
            
            // Render the labels
            let labelsHtml = '';
            if (labels.length === 0) {
                labelsHtml = '<div class="tree-item-empty">No labels found</div>';
            } else {
                for (const label of labels) {
                    labelsHtml += '<div class="tree-item" onclick="insertLabel(\'' + Utils.escapeHtml(label) + '\')">';
                    labelsHtml += '<span class="tree-item-icon">🏷️</span>';
                    labelsHtml += '<span class="tree-item-name">' + Utils.escapeHtml(label) + '</span>';
                    labelsHtml += '</div>';
                }
            }
            
            content.innerHTML = labelsHtml;
        }
    }
}

// Toggle InfluxDB retention policy and load its measurements
async function toggleInfluxRetentionPolicy(header, retentionPolicy) {
    const icon = header.querySelector('.tree-node-icon');
    const content = header.nextElementSibling;
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        icon.textContent = '▶';
    } else {
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        icon.textContent = '▼';
        
        // Check if measurements are already loaded
        if (content.innerHTML.includes('Click to load measurements')) {
            // Show loading state
            content.innerHTML = '<div class="tree-item-empty">Loading measurements...</div>';
            
            // Load measurements (they should already be loaded)
            let measurementsHtml = '';
            if (Schema.influxMeasurements.length === 0) {
                measurementsHtml = '<div class="tree-item-empty">No measurements found</div>';
            } else {
                // Apply any current filter from the measurements search box
                const measurementsSearchInput = document.getElementById('measurementsSearch');
                const searchTerm = measurementsSearchInput ? measurementsSearchInput.value : '';
                const filteredMeasurements = searchTerm ? 
                    Schema.influxMeasurements.filter(measurement => 
                        measurement.toLowerCase().includes(searchTerm.toLowerCase())
                    ) : Schema.influxMeasurements;
                
                for (const measurement of filteredMeasurements) {
                    measurementsHtml += Schema.renderMeasurementWithFields(measurement, retentionPolicy);
                }
            }
            
            content.innerHTML = measurementsHtml;
        }
    }
}

// Toggle InfluxDB measurement and load its fields
async function toggleInfluxMeasurement(header, measurement, retentionPolicy) {
    const icon = header.querySelector('.tree-node-icon');
    const content = header.nextElementSibling;
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        icon.textContent = '▶';
        icon.setAttribute('aria-expanded', 'false');
    } else {
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        icon.textContent = '▼';
        icon.setAttribute('aria-expanded', 'true');
        
        // Check if fields are already loaded
        if (!Schema.influxFields[measurement] || content.innerHTML.includes('Click arrow to load fields')) {
            console.log('🔄 Loading fields for measurement:', measurement, 'retention policy:', retentionPolicy);
            
            // Show loading state
            content.innerHTML = '<div class="tree-item-empty">Loading fields...</div>';
            
            // Load fields for this measurement
            await Schema.loadMeasurementFieldsAndTags(measurement, retentionPolicy);
            
            // Render the fields with search functionality
            const fields = Schema.influxFields[measurement] || [];
            let fieldsHtml = '';
            
            // Add search box for fields
            fieldsHtml += '<div class="schema-search" style="margin: 8px 0;">';
            fieldsHtml += '<input type="text" id="fieldsSearch-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_') + '" placeholder="Search fields..." onkeyup="filterMeasurementFields(this.value, \'' + Utils.escapeHtml(measurement) + '\')" style="width: 100%; padding: 4px; font-size: 11px; background: #2d2d30; color: #cccccc; border: 1px solid #454545; border-radius: 3px;">';
            fieldsHtml += '</div>';
            
            fieldsHtml += '<div id="fieldsList-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_') + '">';
            if (fields.length === 0) {
                fieldsHtml += '<div class="tree-item-empty">No fields found</div>';
            } else {
                for (const field of fields) {
                    fieldsHtml += Schema.renderFieldWithTags(field, measurement);
                }
            }
            fieldsHtml += '</div>';
            
            content.innerHTML = fieldsHtml;
        }
    }
}

// Toggle InfluxDB field and load its tag keys
async function toggleInfluxField(header, field, measurement) {
    const icon = header.querySelector('.tree-node-icon');
    const content = header.nextElementSibling;
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        icon.textContent = '▶';
    } else {
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        icon.textContent = '▼';
        
        // Show loading state
        content.innerHTML = '<div class="tree-item-empty">Loading tag keys...</div>';
        
        // Load tags associated with this field
        await Schema.loadFieldAssociatedTags(field);
        
        // Get tags for this measurement, filtered by field association
        const allTags = Schema.influxTags[measurement] || [];
        const key = `${measurement}:${field}`;
        const associatedTags = Schema.fieldAssociatedTags[key];
        
        let tagsToShow = allTags;
        if (associatedTags !== null && associatedTags !== undefined) {
            tagsToShow = allTags.filter(tag => associatedTags.includes(tag));
        }
        
        // Render the tag keys with search functionality
        let tagsHtml = '';
        
        // Add search box for tags
        tagsHtml += '<div class="schema-search" style="margin: 8px 0;">';
        tagsHtml += '<input type="text" id="tagsSearch-' + Utils.escapeHtml(field).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_') + '" placeholder="Search tags..." onkeyup="filterFieldTags(this.value, \'' + Utils.escapeHtml(field) + '\', \'' + Utils.escapeHtml(measurement) + '\')" style="width: 100%; padding: 4px; font-size: 11px; background: #2d2d30; color: #cccccc; border: 1px solid #454545; border-radius: 3px;">';
        tagsHtml += '</div>';
        
        tagsHtml += '<div id="tagsList-' + Utils.escapeHtml(field).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_') + '">';
        if (tagsToShow.length === 0) {
            tagsHtml += '<div class="tree-item-empty">No tag keys found for this field</div>';
        } else {
            for (const tag of tagsToShow) {
                tagsHtml += Schema.renderTagWithValues(tag, field, measurement);
            }
        }
        tagsHtml += '</div>';
        
        content.innerHTML = tagsHtml;
    }
}

// Toggle InfluxDB tag and load its values
async function toggleInfluxTag(header, tag, field, measurement) {
    const icon = header.querySelector('.tree-node-icon');
    const content = header.nextElementSibling;
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        icon.textContent = '▶';
    } else {
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        icon.textContent = '▼';
        
        // Check if tag values are already loaded
        const key = `${measurement}:${tag}`;
        if (!Schema.influxTagValues[key] || content.innerHTML.includes('Click to load tag values')) {
            // Show loading state
            content.innerHTML = '<div class="tree-item-empty">Loading tag values...</div>';
            
            // Load tag values
            await Schema.loadTagValuesForMeasurement(tag, measurement);
            
            // Render the tag values with search functionality
            const tagValues = Schema.influxTagValues[key] || [];
            let valuesHtml = '';
            
            // Add search box for tag values
            valuesHtml += '<div class="schema-search" style="margin: 8px 0;">';
            valuesHtml += '<input type="text" id="tagValuesSearch-' + Utils.escapeHtml(tag).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(field).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_') + '" placeholder="Search values..." onkeyup="filterTagValuesList(this.value, \'' + Utils.escapeHtml(tag) + '\', \'' + Utils.escapeHtml(field) + '\', \'' + Utils.escapeHtml(measurement) + '\')" style="width: 100%; padding: 4px; font-size: 11px; background: #2d2d30; color: #cccccc; border: 1px solid #454545; border-radius: 3px;">';
            valuesHtml += '</div>';
            
            valuesHtml += '<div id="tagValuesList-' + Utils.escapeHtml(tag).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(field).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_') + '">';
            if (tagValues.length === 0) {
                valuesHtml += '<div class="tree-item-empty">No values found</div>';
            } else {
                for (const value of tagValues) {
                    valuesHtml += '<div class="tree-item" onclick="insertTagValue(\'' + Utils.escapeHtml(tag) + '\', \'' + Utils.escapeHtml(value) + '\')">';
                    valuesHtml += '<span class="tree-item-icon">📄</span>';
                    valuesHtml += '<span class="tree-item-name">' + Utils.escapeHtml(value) + '</span>';
                    valuesHtml += '</div>';
                }
            }
            valuesHtml += '</div>';
            
            content.innerHTML = valuesHtml;
        }
    }
}

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

function insertMeasurement(measurement) {
    Schema.insertIntoQuery(measurement);
}

function insertField(field) {
    Schema.insertIntoQuery(field);
}

function selectField(field) {
    // Save all scroll positions before any updates
    const scrollPositions = Schema.saveScrollPositions();
    
    if (Schema.selectedField === field) {
        // If already selected, deselect
        Schema.selectedField = null;
        Schema.selectedTag = null;
        
        // Update fields list to remove selection
        const fieldsList = document.getElementById('fieldsList');
        if (fieldsList) {
            const selectedItems = fieldsList.querySelectorAll('.schema-item.selected');
            selectedItems.forEach(item => item.classList.remove('selected'));
        }
        
        // Refresh tags list to show all tags
        Schema.renderTagsList();
        
        // Clear tag values panel
        Schema.renderTagValuesPanel();
        
        // Restore scroll positions
        Schema.restoreScrollPositions(scrollPositions);
    } else {
        // Select the field and load associated tags
        Schema.loadFieldAssociatedTags(field);
        
        // Update fields list to show selection
        const fieldsList = document.getElementById('fieldsList');
        if (fieldsList) {
            // Remove previous selection
            const selectedItems = fieldsList.querySelectorAll('.schema-item.selected');
            selectedItems.forEach(item => item.classList.remove('selected'));
            
            // Add selection to clicked field
            const clickedField = Array.from(fieldsList.querySelectorAll('.schema-item')).find(
                item => item.querySelector('.schema-item-name').textContent === field
            );
            if (clickedField) {
                clickedField.classList.add('selected');
            }
        }
        
        // Restore fields scroll position
        Schema.restoreScrollPositions(scrollPositions);
    }
}

function insertTag(tag) {
    Schema.insertIntoQuery(tag);
}

function selectTag(tag) {
    if (Schema.selectedTag === tag) {
        // If already selected, deselect
        Schema.selectedTag = null;
        
        // Save scroll positions
        const scrollPositions = Schema.saveScrollPositions();
        
        // Update tags list to remove selection
        const tagsList = document.getElementById('tagsList');
        if (tagsList) {
            const selectedItems = tagsList.querySelectorAll('.schema-item.selected');
            selectedItems.forEach(item => item.classList.remove('selected'));
        }
        
        // Clear tag values
        Schema.renderTagValuesPanel();
        
        // Restore scroll positions
        Schema.restoreScrollPositions(scrollPositions);
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
    
    // Save scroll position
    const scrollTop = fieldsList.scrollTop;
    
    const fields = Schema.influxFields[Schema.selectedMeasurement] || [];
    const filteredFields = searchTerm ? 
        fields.filter(field => field.toLowerCase().includes(searchTerm.toLowerCase())) : 
        fields;
    
    let html = '';
    if (filteredFields.length === 0) {
        html = '<div class="schema-empty">No fields found</div>';
    } else {
        for (const field of filteredFields) {
            const isSelected = Schema.selectedField === field;
            
            html += '<div class="schema-item' + (isSelected ? ' selected' : '') + '" onclick="selectField(\'' + Utils.escapeHtml(field) + '\')">';
            html += '<span class="schema-item-name">' + Utils.escapeHtml(field) + '</span>';
            html += '<span class="schema-item-type field">field</span>';
            html += '</div>';
        }
    }
    
    fieldsList.innerHTML = html;
    
    // Restore scroll position
    requestAnimationFrame(() => {
        fieldsList.scrollTop = scrollTop;
    });
}

function filterInfluxTags(searchTerm) {
    const tagsList = document.getElementById('tagsList');
    if (!tagsList || !Schema.selectedMeasurement) return;
    
    // Save scroll position
    const scrollTop = tagsList.scrollTop;
    
    let tags = Schema.influxTags[Schema.selectedMeasurement] || [];
    
    // Filter tags based on selected field if available
    if (Schema.selectedField) {
        const key = `${Schema.selectedMeasurement}:${Schema.selectedField}`;
        const associatedTags = Schema.fieldAssociatedTags[key];
        if (associatedTags !== null && associatedTags !== undefined) {
            tags = tags.filter(tag => associatedTags.includes(tag));
        }
    }
    
    const filteredTags = searchTerm ? 
        tags.filter(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) : 
        tags;
    
    let html = '';
    if (filteredTags.length === 0) {
        html = '<div class="schema-empty">No tags found</div>';
    } else {
        for (const tag of filteredTags) {
            const isSelected = Schema.selectedTag === tag;
            
            html += '<div class="schema-item' + (isSelected ? ' selected' : '') + '" onclick="selectTag(\'' + Utils.escapeHtml(tag) + '\')">';
            html += '<span class="schema-item-name">' + Utils.escapeHtml(tag) + '</span>';
            html += '<span class="schema-item-type tag">tag</span>';
            html += '</div>';
        }
    }
    
    tagsList.innerHTML = html;
    
    // Restore scroll position
    requestAnimationFrame(() => {
        tagsList.scrollTop = scrollTop;
    });
}

function filterTagValues(searchTerm) {
    const tagValuesList = document.getElementById('tagValuesList');
    if (!tagValuesList || !Schema.selectedMeasurement || !Schema.selectedTag) return;
    
    // Save scroll position
    const scrollTop = tagValuesList.scrollTop;
    
    const key = `${Schema.selectedMeasurement}:${Schema.selectedTag}`;
    const tagValues = Schema.influxTagValues[key] || [];
    const filteredValues = searchTerm ? 
        tagValues.filter(value => value.toLowerCase().includes(searchTerm.toLowerCase())) : 
        tagValues;
    
    let html = '';
    if (filteredValues.length === 0) {
        html = '<div class="schema-empty">No values found</div>';
    } else {
        for (const value of filteredValues) {
            html += '<div class="schema-value-item" onclick="insertTagValue(\'' + Utils.escapeHtml(Schema.selectedTag) + '\', \'' + Utils.escapeHtml(value) + '\')">';
            html += '<span class="schema-value-name">' + Utils.escapeHtml(value) + '</span>';
            html += '</div>';
        }
    }
    
    tagValuesList.innerHTML = html;
    
    // Restore scroll position
    requestAnimationFrame(() => {
        tagValuesList.scrollTop = scrollTop;
    });
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

// Filter InfluxDB measurements
function filterInfluxMeasurements(searchTerm) {
    if (Schema.currentDatasourceType !== 'influxdb') return;
    
    const filteredMeasurements = searchTerm ? 
        Schema.influxMeasurements.filter(measurement => 
            measurement.toLowerCase().includes(searchTerm.toLowerCase())
        ) : Schema.influxMeasurements;
    
    // Update all retention policy measurement lists
    for (const policy of Schema.influxRetentionPolicies) {
        const measurementsContainer = document.getElementById('measurements-' + Utils.escapeHtml(policy).replace(/[^a-zA-Z0-9]/g, '_'));
        if (measurementsContainer && !measurementsContainer.innerHTML.includes('Click to load measurements')) {
            let measurementsHtml = '';
            if (filteredMeasurements.length === 0) {
                measurementsHtml = '<div class="tree-item-empty">No measurements found</div>';
            } else {
                for (const measurement of filteredMeasurements) {
                    measurementsHtml += Schema.renderMeasurementWithFields(measurement, policy);
                }
            }
            measurementsContainer.innerHTML = measurementsHtml;
        }
    }
}

// Filter fields for a specific measurement
function filterMeasurementFields(searchTerm, measurement) {
    const fields = Schema.influxFields[measurement] || [];
    const filteredFields = searchTerm ? 
        fields.filter(field => field.toLowerCase().includes(searchTerm.toLowerCase())) : 
        fields;
    
    const fieldsContainer = document.getElementById('fieldsList-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_'));
    if (!fieldsContainer) return;
    
    let fieldsHtml = '';
    if (filteredFields.length === 0) {
        fieldsHtml = '<div class="tree-item-empty">No fields found</div>';
    } else {
        for (const field of filteredFields) {
            fieldsHtml += Schema.renderFieldWithTags(field, measurement);
        }
    }
    
    fieldsContainer.innerHTML = fieldsHtml;
}

// Filter tags for a specific field in a measurement
function filterFieldTags(searchTerm, field, measurement) {
    let allTags = Schema.influxTags[measurement] || [];
    
    // Filter tags based on field association if available
    const key = `${measurement}:${field}`;
    const associatedTags = Schema.fieldAssociatedTags[key];
    if (associatedTags !== null && associatedTags !== undefined) {
        allTags = allTags.filter(tag => associatedTags.includes(tag));
    }
    
    const filteredTags = searchTerm ? 
        allTags.filter(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) : 
        allTags;
    
    const tagsContainer = document.getElementById('tagsList-' + Utils.escapeHtml(field).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_'));
    if (!tagsContainer) return;
    
    let tagsHtml = '';
    if (filteredTags.length === 0) {
        tagsHtml = '<div class="tree-item-empty">No tag keys found</div>';
    } else {
        for (const tag of filteredTags) {
            tagsHtml += Schema.renderTagWithValues(tag, field, measurement);
        }
    }
    
    tagsContainer.innerHTML = tagsHtml;
}

// Filter tag values for a specific tag
function filterTagValuesList(searchTerm, tag, field, measurement) {
    const key = `${measurement}:${tag}`;
    const tagValues = Schema.influxTagValues[key] || [];
    const filteredValues = searchTerm ? 
        tagValues.filter(value => value.toLowerCase().includes(searchTerm.toLowerCase())) : 
        tagValues;
    
    const valuesContainer = document.getElementById('tagValuesList-' + Utils.escapeHtml(tag).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(field).replace(/[^a-zA-Z0-9]/g, '_') + '-' + Utils.escapeHtml(measurement).replace(/[^a-zA-Z0-9]/g, '_'));
    if (!valuesContainer) return;
    
    let valuesHtml = '';
    if (filteredValues.length === 0) {
        valuesHtml = '<div class="tree-item-empty">No values found</div>';
    } else {
        for (const value of filteredValues) {
            valuesHtml += '<div class="tree-item" onclick="insertTagValue(\'' + Utils.escapeHtml(tag) + '\', \'' + Utils.escapeHtml(value) + '\')">';
            valuesHtml += '<span class="tree-item-icon">📄</span>';
            valuesHtml += '<span class="tree-item-name">' + Utils.escapeHtml(value) + '</span>';
            valuesHtml += '</div>';
        }
    }
    
    valuesContainer.innerHTML = valuesHtml;
}

// Export Schema to global window for access by other modules
window.Schema = Schema;