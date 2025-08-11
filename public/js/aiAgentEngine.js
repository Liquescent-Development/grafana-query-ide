// AI Agent Engine
// Natural Language Understanding and Query Processing for Time Series Analysis

const AIAgentEngine = {
    // Intent patterns for NLU
    intents: {
        // Anomaly detection intents
        anomaly_detection: {
            patterns: [
                /what.*(?:unusual|strange|anomal|weird|odd)/i,
                /show.*(?:spike|surge|drop|anomal|outlier)/i,
                /find.*(?:outlier|abnormal|unusual|anomal)/i,
                /any.*(?:issues|problems|anomal)/i,
                /detect.*anomal/i,
                /anomalies.*(?:today|yesterday|this week|last)/i
            ],
            handler: 'handleAnomalyDetection'
        },
        
        // Status check intents
        status_check: {
            patterns: [
                /(?:current|latest|recent).*(?:status|state|value)/i,
                /what.*(?:status|happening|going on)/i,
                /show.*current/i,
                /how.*(?:is|are).*(?:metric|system|service)/i,
                /(?:health|status).*check/i
            ],
            handler: 'handleStatusCheck'
        },
        
        // Trend analysis intents
        trend_analysis: {
            patterns: [
                /(?:trend|pattern|behavior)/i,
                /(?:increasing|decreasing|stable|growing|declining)/i,
                /analyze.*trend/i,
                /what.*trend/i,
                /show.*(?:trend|pattern)/i,
                /(?:forecast|predict)/i
            ],
            handler: 'handleTrendAnalysis'
        },
        
        // Comparison intents
        comparison: {
            patterns: [
                /compare.*(?:to|versus|vs|with)/i,
                /difference.*between/i,
                /how.*changed.*(?:since|from)/i,
                /(?:yesterday|today|this week|last week).*(?:vs|versus|compared)/i
            ],
            handler: 'handleComparison'
        },
        
        // Metric query intents
        metric_query: {
            patterns: [
                /show.*(?:metric|measurement|field)/i,
                /what.*(?:metrics|measurements|fields)/i,
                /list.*(?:metric|measurement|field)/i,
                /available.*(?:metric|measurement|field)/i
            ],
            handler: 'handleMetricQuery'
        },
        
        // Alert/threshold intents
        alert_setup: {
            patterns: [
                /alert.*when/i,
                /notify.*(?:if|when)/i,
                /set.*(?:threshold|alert|alarm)/i,
                /monitor.*for/i,
                /watch.*(?:for|when)/i
            ],
            handler: 'handleAlertSetup'
        },
        
        // Time range intents
        time_range: {
            patterns: [
                /(?:last|past).*(?:hour|day|week|month)/i,
                /(?:today|yesterday|this week|last week)/i,
                /between.*and/i,
                /from.*to/i,
                /since.*(?:yesterday|monday|last)/i
            ],
            handler: 'handleTimeRange'
        }
    },

    // Entity extraction patterns
    entities: {
        timeRanges: {
            'last hour': '1h',
            'past hour': '1h',
            'last 6 hours': '6h',
            'last day': '1d',
            'past day': '1d',
            'today': '1d',
            'yesterday': '2d',
            'last week': '7d',
            'past week': '7d',
            'this week': '7d',
            'last month': '30d',
            'past month': '30d'
        },
        
        metrics: {
            // Common metric patterns
            patterns: [
                /(?:cpu|processor).*(?:usage|utilization|percent)/i,
                /memory.*(?:usage|utilization|percent|consumption)/i,
                /disk.*(?:usage|space|io|read|write)/i,
                /network.*(?:traffic|bandwidth|throughput|latency)/i,
                /response.*time/i,
                /error.*(?:rate|count)/i,
                /request.*(?:rate|count|per second)/i,
                /temperature/i,
                /load.*average/i
            ]
        },
        
        severities: {
            patterns: {
                high: /(?:high|critical|severe|major)/i,
                medium: /(?:medium|moderate|warning)/i,
                low: /(?:low|minor|info)/i
            }
        },
        
        aggregations: {
            patterns: {
                mean: /(?:mean|average|avg)/i,
                max: /(?:max|maximum|peak|highest)/i,
                min: /(?:min|minimum|lowest)/i,
                sum: /(?:sum|total)/i,
                count: /(?:count|number)/i,
                median: /(?:median)/i,
                stddev: /(?:stddev|standard deviation)/i
            }
        }
    },

    // Context management
    context: {
        currentMetric: null,
        currentTimeRange: '1h',
        currentDatasource: null,
        recentQueries: [],
        discoveries: [],
        conversation: []
    },

    // Process a user message
    async processMessage(message, context = {}) {
        console.log('🧠 Processing message:', message);
        
        // Update context
        this.updateContext(context);
        
        // Check for datasource-specific queries first
        const lower = message.toLowerCase();
        if ((lower.includes('griffin-') || lower.includes('datasource') || lower.includes('data source')) &&
            (lower.includes('measurement') || lower.includes('metric'))) {
            return this.handleDatasourceQuery(message);
        }
        
        // Parse intent and entities
        const parsed = this.parseMessage(message);
        console.log('📝 Parsed:', parsed);
        
        // Execute appropriate handler
        try {
            const handler = this[parsed.intent.handler];
            if (handler) {
                const result = await handler.call(this, parsed, message);
                
                // Update conversation context
                this.context.conversation.push({
                    message,
                    intent: parsed.intent.type,
                    entities: parsed.entities,
                    result,
                    timestamp: new Date()
                });
                
                return result;
            } else {
                return this.handleUnknownIntent(message, parsed);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            return {
                text: `I encountered an error while processing your request: ${error.message}`,
                data: { error: error.message }
            };
        }
    },

    // Parse message to extract intent and entities
    parseMessage(message) {
        const lower = message.toLowerCase();
        let matchedIntent = null;
        let confidence = 0;
        
        // Check if user is mentioning a specific metric
        const possibleMetric = this.extractPossibleMetricFromMessage(message);
        
        // Match against intent patterns
        for (const [intentType, intentData] of Object.entries(this.intents)) {
            for (const pattern of intentData.patterns) {
                if (pattern.test(message)) {
                    matchedIntent = {
                        type: intentType,
                        handler: intentData.handler
                    };
                    confidence = 0.9;
                    break;
                }
            }
            if (matchedIntent) break;
        }
        
        // If we found a metric mention but no specific intent, default to status check
        if (!matchedIntent && possibleMetric) {
            matchedIntent = {
                type: 'status_check',
                handler: 'handleStatusCheck'
            };
            confidence = 0.7;
        }
        
        // Default to general query if no specific intent matched
        if (!matchedIntent) {
            matchedIntent = {
                type: 'general_query',
                handler: 'handleGeneralQuery'
            };
            confidence = 0.5;
        }
        
        // Extract entities
        const entities = this.extractEntities(message);
        
        // Add possible metric to entities
        if (possibleMetric) {
            entities.possibleMetric = possibleMetric;
        }
        
        return {
            intent: matchedIntent,
            entities,
            confidence
        };
    },

    // Extract entities from message
    extractEntities(message) {
        const entities = {
            timeRange: null,
            metric: null,
            severity: null,
            aggregation: null,
            values: []
        };
        
        const lower = message.toLowerCase();
        
        // Extract time range
        for (const [phrase, value] of Object.entries(this.entities.timeRanges)) {
            if (lower.includes(phrase)) {
                entities.timeRange = value;
                break;
            }
        }
        
        // Extract metrics
        for (const pattern of this.entities.metrics.patterns) {
            const match = message.match(pattern);
            if (match) {
                entities.metric = match[0];
                break;
            }
        }
        
        // Extract severity
        for (const [level, pattern] of Object.entries(this.entities.severities.patterns)) {
            if (pattern.test(message)) {
                entities.severity = level;
                break;
            }
        }
        
        // Extract aggregation
        for (const [agg, pattern] of Object.entries(this.entities.aggregations.patterns)) {
            if (pattern.test(message)) {
                entities.aggregation = agg;
                break;
            }
        }
        
        // Extract numeric values
        const numberPattern = /\b\d+(?:\.\d+)?(?:\s*(?:ms|s|m|h|GB|MB|KB|%))?\b/g;
        const numbers = message.match(numberPattern);
        if (numbers) {
            entities.values = numbers;
        }
        
        return entities;
    },

    // Update context from current state
    updateContext(newContext) {
        Object.assign(this.context, newContext);
        
        // Update from global state
        if (GrafanaConfig.currentDatasourceName) {
            this.context.currentDatasource = GrafanaConfig.currentDatasourceName;
        }
        
        // Update from Analytics if available
        if (window.Analytics && Analytics.config.measurement && Analytics.config.field) {
            this.context.currentMetric = {
                measurement: Analytics.config.measurement,
                field: Analytics.config.field
            };
        }
    },

    // Intent handlers
    async handleAnomalyDetection(parsed, message) {
        const timeRange = parsed.entities.timeRange || this.context.currentTimeRange;
        const severity = parsed.entities.severity || 'all';
        
        // Check if we have a connected datasource
        if (!GrafanaConfig.connected) {
            return {
                text: "I need you to connect to a Grafana datasource first. Please connect to a datasource and try again.",
                data: { type: 'connection_required' }
            };
        }
        
        // If no metric is selected, start conversational metric selection
        if (!this.context.currentMetric) {
            return await this.startMetricConversation('anomaly', timeRange, 
                "I'd be happy to help you find anomalies! First, let me understand which metric you want to analyze.");
        }
        
        return {
            text: `Great! I'm analyzing ${this.context.currentMetric.measurement}.${this.context.currentMetric.field} for anomalies over the ${timeRange} period...`,
            data: {
                type: 'anomaly_analysis',
                metric: this.context.currentMetric,
                timeRange,
                severity
            },
            actions: [
                { label: 'Run Full Analysis', action: 'runAnomalyAnalysis' },
                { label: 'Change Time Range', action: 'changeTimeRange' }
            ]
        };
    },

    async handleStatusCheck(parsed, message) {
        let metric = parsed.entities.metric || this.context.currentMetric;
        
        // Check if the message itself is a simple metric name
        const simpleMetrics = ['cpu', 'memory', 'disk', 'network', 'load'];
        const lower = message.toLowerCase().trim();
        if (simpleMetrics.includes(lower) || parsed.entities.possibleMetric) {
            metric = lower;
        }
        
        if (!GrafanaConfig.connected) {
            return {
                text: "I need you to connect to a Grafana datasource first to check status.",
                data: { type: 'connection_required' }
            };
        }
        
        if (!metric) {
            // Start conversational status check
            return {
                text: "I can help you check the status of your metrics! Would you like to see a general overview of all systems, or do you have a specific metric in mind?",
                data: {
                    type: 'status_conversation',
                    datasource: this.context.currentDatasource,
                    connected: true
                },
                actions: [
                    { label: 'General Overview', action: 'showAllMetrics' },
                    { label: 'Specific Metric', action: 'selectSpecificMetric' },
                    { label: 'Health Check', action: 'runHealthCheck' }
                ]
            };
        }
        
        return {
            text: `Checking current status of ${metric.measurement || metric}...`,
            data: {
                type: 'metric_status',
                metric
            }
        };
    },

    async handleTrendAnalysis(parsed, message) {
        const timeRange = parsed.entities.timeRange || '7d'; // Default to week for trends
        const metric = parsed.entities.metric || this.context.currentMetric;
        
        if (!metric) {
            return await this.startMetricConversation('trend', timeRange, 
                "I'd love to help you analyze trends! Let me know which metric you're interested in.");
        }
        
        return {
            text: `Perfect! I'll analyze the trends for ${metric.measurement || metric} over the ${timeRange} period...`,
            data: {
                type: 'trend_analysis',
                metric,
                timeRange
            },
            actions: [
                { label: 'Show Forecast', action: 'showForecast' },
                { label: 'Compare Periods', action: 'comparePeriods' }
            ]
        };
    },

    async handleComparison(parsed, message) {
        // Extract comparison periods
        const timeRanges = this.extractComparisonPeriods(message);
        
        return {
            text: `I'll compare the metrics between ${timeRanges.period1} and ${timeRanges.period2}...`,
            data: {
                type: 'comparison',
                periods: timeRanges,
                metric: this.context.currentMetric
            }
        };
    },

    async handleMetricQuery(parsed, message) {
        return {
            text: "I'll help you explore available metrics. Here are the data sources and measurements available:",
            data: {
                type: 'metric_exploration',
                datasource: this.context.currentDatasource
            },
            actions: [
                { label: 'Show Measurements', action: 'showMeasurements' },
                { label: 'Show Fields', action: 'showFields' },
                { label: 'Search Metrics', action: 'searchMetrics' }
            ]
        };
    },

    async handleAlertSetup(parsed, message) {
        const threshold = parsed.entities.values[0] || null;
        const metric = parsed.entities.metric || this.context.currentMetric;
        
        return {
            text: "I can help you set up monitoring alerts. Let me gather the details:",
            data: {
                type: 'alert_setup',
                metric,
                threshold,
                condition: this.extractAlertCondition(message)
            },
            actions: [
                { label: 'Configure Alert', action: 'configureAlert' },
                { label: 'Test Alert', action: 'testAlert' }
            ]
        };
    },

    async handleTimeRange(parsed, message) {
        const timeRange = parsed.entities.timeRange;
        
        if (timeRange) {
            this.context.currentTimeRange = timeRange;
            return {
                text: `I've updated the time range to ${timeRange}. What would you like to analyze?`,
                data: {
                    type: 'time_range_update',
                    timeRange
                }
            };
        }
        
        return {
            text: "Please specify a time range like 'last hour', 'today', or 'last week'.",
            data: { type: 'time_range_required' }
        };
    },

    async handleGeneralQuery(parsed, message) {
        // Try to provide helpful suggestions based on keywords
        const suggestions = this.generateSuggestions(message);
        
        // Check if they might be asking about a specific metric
        const possibleMetric = this.extractPossibleMetricFromMessage(message);
        
        let responseText = "I can help you analyze your time series data! ";
        
        if (possibleMetric) {
            responseText += `I noticed you mentioned "${possibleMetric}". Would you like me to analyze that metric, or `;
        }
        
        responseText += "here are some things I can help you with:";
        
        return {
            text: responseText,
            data: {
                type: 'suggestions',
                suggestions,
                possibleMetric
            },
            actions: suggestions.map(s => ({
                label: s.label,
                action: s.action
            }))
        };
    },

    async handleUnknownIntent(message, parsed) {
        return {
            text: `I'm not sure how to help with "${message}". I can help you find anomalies, analyze trends, check status, and more. What would you like to do?`,
            data: { type: 'unknown_intent' },
            actions: [
                { label: 'Find Anomalies', action: 'findAnomalies' },
                { label: 'Check Status', action: 'checkStatus' },
                { label: 'Analyze Trends', action: 'analyzeTrends' },
                { label: 'Show Help', action: 'showHelp' }
            ]
        };
    },

    // Helper methods
    extractComparisonPeriods(message) {
        // Simple extraction - can be enhanced
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (message.includes('yesterday') && message.includes('today')) {
            return {
                period1: 'yesterday',
                period2: 'today'
            };
        } else if (message.includes('last week') && message.includes('this week')) {
            return {
                period1: 'last week',
                period2: 'this week'
            };
        }
        
        // Default
        return {
            period1: 'previous period',
            period2: 'current period'
        };
    },

    extractAlertCondition(message) {
        const conditions = {
            above: /(?:above|greater than|exceeds|more than|>)/i,
            below: /(?:below|less than|under|<)/i,
            equals: /(?:equals|is|=)/i,
            contains: /(?:contains|includes)/i
        };
        
        for (const [type, pattern] of Object.entries(conditions)) {
            if (pattern.test(message)) {
                return type;
            }
        }
        
        return 'above'; // Default
    },

    generateSuggestions(message) {
        const suggestions = [];
        const lower = message.toLowerCase();
        
        if (lower.includes('help')) {
            suggestions.push(
                { label: 'Show Available Commands', action: 'showCommands' },
                { label: 'Browse Metrics', action: 'browseMetrics' }
            );
        }
        
        if (lower.includes('metric') || lower.includes('data')) {
            suggestions.push(
                { label: 'Explore Metrics', action: 'exploreMetrics' },
                { label: 'Search Metrics', action: 'searchMetrics' }
            );
        }
        
        if (lower.includes('problem') || lower.includes('issue') || lower.includes('anomal')) {
            suggestions.push(
                { label: 'Find Anomalies', action: 'findAnomalies' },
                { label: 'Run Health Check', action: 'runHealthCheck' }
            );
        }
        
        if (lower.includes('trend') || lower.includes('pattern') || lower.includes('forecast')) {
            suggestions.push(
                { label: 'Analyze Trends', action: 'analyzeTrends' },
                { label: 'Compare Periods', action: 'comparePeriods' }
            );
        }
        
        // Default suggestions if nothing specific matched
        if (suggestions.length === 0) {
            suggestions.push(
                { label: 'Find Anomalies', action: 'findAnomalies' },
                { label: 'Check Status', action: 'checkStatus' },
                { label: 'Analyze Trends', action: 'analyzeTrends' },
                { label: 'Browse Metrics', action: 'browseMetrics' }
            );
        }
        
        return suggestions;
    },

    // Execute actions from message responses
    async executeAction(action, context) {
        console.log('🎯 Executing action:', action);
        
        switch (action) {
            case 'runAnomalyAnalysis':
                return this.runAnomalyAnalysis(context);
            case 'showMetrics':
            case 'browseMetrics':
            case 'exploreMetrics':
                return this.showAvailableMetrics();
            case 'searchMetrics':
                return this.showMetricSearch();
            case 'selectMetric':
            case 'selectSpecificMetric':
                return this.showMetricSelector();
            case 'showMeasurements':
                return this.showMeasurements();
            case 'showFields':
                return this.showFields();
            case 'showAllMetrics':
                return this.showAllMetricsStatus();
            case 'runHealthCheck':
                return this.runSystemHealthCheck();
            case 'showForecast':
                return this.showMetricForecast(context);
            case 'comparePeriods':
                return this.compareTimePeriods(context);
            case 'changeTimeRange':
                return this.showTimeRangeOptions(context);
            case 'findAnomalies':
                return this.handleAnomalyDetection({ entities: {} }, 'find anomalies');
            case 'checkStatus':
                return this.handleStatusCheck({ entities: {} }, 'check status');
            case 'analyzeTrends':
                return this.handleTrendAnalysis({ entities: {} }, 'analyze trends');
            case 'openSchemaExplorer':
                return this.openSchemaExplorer();
            case 'checkMetricStatus':
                return this.checkSpecificMetricStatus(context);
            case 'compareTimePeriods':
                return this.compareTimePeriods(context);
            case 'openConnections':
                return this.openConnections();
            case 'refreshSchema':
                return this.refreshSchema();
            default:
                // Handle time range setting actions
                if (action.startsWith('setTimeRange:')) {
                    const timeRange = action.split(':')[1];
                    return this.setTimeRange(timeRange, context);
                }
                
                // Handle other comparison actions
                if (action === 'compareYesterdayToday' || action === 'compareWeeks') {
                    return this.handleSpecificComparison(action, context);
                }
                
                return {
                    text: `I'm still learning how to do that. In the meantime, I can help you find anomalies, check status, analyze trends, or browse your available metrics.`,
                    data: { type: 'action_redirect' },
                    actions: [
                        { label: 'Find Anomalies', action: 'findAnomalies' },
                        { label: 'Check Status', action: 'checkStatus' },
                        { label: 'Browse Metrics', action: 'browseMetrics' }
                    ]
                };
        }
    },
    
    // Set time range
    async setTimeRange(timeRange, context) {
        this.context.currentTimeRange = timeRange;
        
        const timeRangeLabels = {
            '1h': 'last hour',
            '6h': 'last 6 hours',
            '1d': 'last day',
            '7d': 'last week',
            '30d': 'last month'
        };
        
        const label = timeRangeLabels[timeRange] || timeRange;
        
        return {
            text: `Time range updated to ${label}. What would you like me to analyze over this period?`,
            data: {
                type: 'time_range_updated',
                timeRange,
                label
            },
            actions: [
                { label: 'Find Anomalies', action: 'findAnomalies' },
                { label: 'Check Status', action: 'checkStatus' },
                { label: 'Analyze Trends', action: 'analyzeTrends' }
            ]
        };
    },
    
    // Handle specific comparison actions
    async handleSpecificComparison(action, context) {
        const metric = context?.metric || this.context.currentMetric;
        
        if (!metric) {
            return await this.startMetricConversation('comparison', '7d', 
                "To run a comparison, I need to know which metric to compare. What metric would you like me to analyze?");
        }
        
        let comparisonType = '';
        let timeRanges = {};
        
        switch (action) {
            case 'compareYesterdayToday':
                comparisonType = 'Yesterday vs Today';
                timeRanges = { period1: 'yesterday', period2: 'today' };
                break;
            case 'compareWeeks':
                comparisonType = 'This Week vs Last Week';
                timeRanges = { period1: 'last week', period2: 'this week' };
                break;
            default:
                comparisonType = 'Custom Comparison';
                timeRanges = { period1: 'previous period', period2: 'current period' };
        }
        
        return {
            text: `I'll compare ${metric.measurement}.${metric.field} for ${comparisonType}. Let me analyze the differences...`,
            data: {
                type: 'specific_comparison',
                metric,
                comparisonType,
                timeRanges
            },
            actions: [
                { label: 'Show Detailed Results', action: 'showComparisonDetails' },
                { label: 'Find Anomalies', action: 'findAnomalies' }
            ]
        };
    },

    // Action implementations
    async runAnomalyAnalysis(context) {
        // Use the engine's current metric context if not provided
        const metric = context?.metric || this.context.currentMetric;
        
        if (!GrafanaConfig.connected) {
            return {
                text: "I need you to connect to a Grafana datasource first to run analysis.",
                data: { type: 'connection_required' }
            };
        }
        
        if (!metric) {
            return await this.startMetricConversation('anomaly', context?.timeRange || '1h', 
                "To run anomaly analysis, I need to know which metric to analyze. What metric would you like me to check?");
        }
        
        // Trigger Analytics module
        if (window.Analytics) {
            // Set up Analytics config
            Analytics.config.measurement = context.metric.measurement;
            Analytics.config.field = context.metric.field;
            Analytics.config.timeRange = context.timeRange || '1h';
            Analytics.config.analysisType = 'anomaly';
            
            // Run analysis and get results directly
            try {
                // Show analytics panel
                if (window.Interface) {
                    Interface.switchSidebarView('analytics');
                }
                
                // Execute analysis
                const results = await this.executeAnomalyAnalysis(context);
                
                // Format results for chat
                if (results.anomalies && results.anomalies.length > 0) {
                    const summary = this.formatAnomalySummary(results);
                    return {
                        text: summary,
                        data: { 
                            type: 'anomaly_results',
                            results: results
                        }
                    };
                } else {
                    return {
                        text: `Good news! I didn't find any significant anomalies in ${context.metric.measurement}.${context.metric.field} over the ${context.timeRange} period. The metrics appear to be within normal ranges.`,
                        data: { type: 'no_anomalies' }
                    };
                }
            } catch (error) {
                return {
                    text: `Failed to run analysis: ${error.message}`,
                    data: { type: 'error', error: error.message }
                };
            }
        }
        
        return {
            text: "Analytics module not available.",
            data: { type: 'error' }
        };
    },

    // Execute anomaly analysis directly
    async executeAnomalyAnalysis(context) {
        // Check if we have AI connection
        if (!Analytics.isConnected) {
            throw new Error('AI service not connected. Please connect to an AI service first.');
        }
        
        // Build analysis configuration
        const config = {
            analysisType: 'anomaly',
            measurement: context.metric.measurement,
            field: context.metric.field,
            timeRange: context.timeRange || '1h',
            tags: {},
            sensitivity: 'medium',
            alertThreshold: 0.8
        };
        
        // Execute analysis using AIAnalytics
        if (window.AIAnalytics) {
            return await AIAnalytics.executeAnalysis(config);
        } else {
            throw new Error('AI Analytics engine not available');
        }
    },

    // Format anomaly summary for chat
    formatAnomalySummary(results) {
        const anomalies = results.anomalies || [];
        const summary = results.summary || {};
        
        let text = `I found ${anomalies.length} anomalies in your data:\n\n`;
        
        // Group by severity
        const bySeverity = {
            critical: anomalies.filter(a => a.severity === 'critical'),
            high: anomalies.filter(a => a.severity === 'high'),
            medium: anomalies.filter(a => a.severity === 'medium'),
            low: anomalies.filter(a => a.severity === 'low')
        };
        
        // Report critical anomalies first
        if (bySeverity.critical.length > 0) {
            text += `🚨 **Critical Anomalies (${bySeverity.critical.length})**:\n`;
            bySeverity.critical.slice(0, 3).forEach(a => {
                text += `- ${new Date(a.timestamp).toLocaleString()}: ${a.value} (${a.type || 'spike detected'})\n`;
            });
            text += '\n';
        }
        
        if (bySeverity.high.length > 0) {
            text += `⚠️ **High Severity (${bySeverity.high.length})**:\n`;
            bySeverity.high.slice(0, 2).forEach(a => {
                text += `- ${new Date(a.timestamp).toLocaleString()}: ${a.value}\n`;
            });
            text += '\n';
        }
        
        if (bySeverity.medium.length > 0) {
            text += `📊 Medium severity: ${bySeverity.medium.length} anomalies\n`;
        }
        
        if (bySeverity.low.length > 0) {
            text += `📈 Low severity: ${bySeverity.low.length} anomalies\n`;
        }
        
        // Add recommendation
        if (bySeverity.critical.length > 0 || bySeverity.high.length > 0) {
            text += '\n💡 **Recommendation**: Investigate the critical and high severity anomalies immediately.';
        }
        
        return text;
    },

    async showAvailableMetrics() {
        if (!GrafanaConfig.connected) {
            return {
                text: "I need you to connect to a Grafana datasource first. Once connected, I can show you all available metrics.",
                data: { type: 'connection_required' },
                actions: [
                    { label: 'Connect to Grafana', action: 'openConnections' }
                ]
            };
        }
        
        // Check if datasource is selected
        if (!GrafanaConfig.currentDatasourceId) {
            return {
                text: "I see you're connected to Grafana, but no datasource is selected. Please select a datasource first, then I can show you the available metrics.",
                data: { type: 'datasource_required' },
                actions: [
                    { label: 'Select Datasource', action: 'openConnections' }
                ]
            };
        }
        
        const availableMetrics = await this.getAvailableMetrics();
        let text = "";
        
        if (availableMetrics && availableMetrics.length > 0) {
            text = "Great! Here are the metrics I can analyze for you:\n\n";
            availableMetrics.forEach(metric => {
                text += `• ${metric}\n`;
            });
            
            text += "\nJust tell me which one you'd like to analyze, or ask me something like:\n";
            text += `• "Find anomalies in ${availableMetrics[0]}"\n`;
            text += `• "Show me trends for ${availableMetrics[1] || availableMetrics[0]}"\n`;
            text += `• "What's the status of ${availableMetrics[2] || availableMetrics[0]}?"`;
            
            return {
                text,
                data: { 
                    type: 'metrics_display', 
                    availableMetrics
                }
            };
        } else {
            text = "I don't see any cached metrics yet. Let me open the Schema Explorer so you can browse and load your available measurements and fields.";
            
            // Switch to schema explorer
            if (window.Interface) {
                Interface.switchSidebarView('explorer');
            }
            
            return {
                text,
                data: { 
                    type: 'no_metrics_found',
                    view: 'explorer' 
                },
                actions: [
                    { label: 'Refresh Schema', action: 'refreshSchema' },
                    { label: 'Open Schema Explorer', action: 'openSchemaExplorer' }
                ]
            };
        }
    },

    async showMetricSelector() {
        const availableMetrics = await this.getAvailableMetrics();
        
        let text = "Let me help you select a metric to analyze. ";
        
        if (availableMetrics && availableMetrics.length > 0) {
            text += "I can see these metrics in your data:\n\n";
            availableMetrics.slice(0, 8).forEach((metric, index) => {
                text += `${index + 1}. ${metric}\n`;
            });
            
            if (availableMetrics.length > 8) {
                text += `\n...and ${availableMetrics.length - 8} more.`;
            }
            
            text += "\n\nYou can tell me which one interests you, or I can open the Schema Explorer for you to browse all available metrics.";
        } else {
            text += "Let me open the Schema Explorer where you can browse all your available metrics.";
            
            // Switch to schema explorer
            if (window.Interface) {
                Interface.switchSidebarView('explorer');
            }
        }
        
        return {
            text,
            data: { 
                type: 'metric_selection',
                availableMetrics
            },
            actions: [
                { label: 'Open Schema Explorer', action: 'openSchemaExplorer' },
                { label: 'Search Metrics', action: 'searchMetrics' }
            ]
        };
    },

    async showAllMetricsStatus() {
        if (!GrafanaConfig.connected) {
            return {
                text: "Please connect to a datasource first.",
                data: { type: 'connection_required' }
            };
        }
        
        // Instead of executing a query, provide a helpful overview
        const measurements = await this.getAvailableMetrics();
        
        let text = "📊 **Metrics Overview**\n\n";
        
        if (measurements.length > 0) {
            text += `I can see ${measurements.length} measurements available in your current datasource.\n\n`;
            text += "To check the status of specific metrics, you can:\n";
            text += "• Tell me a metric name (like 'cpu' or 'memory')\n";
            text += "• Ask 'show me cpu status' or 'analyze memory usage'\n";
            text += "• Say 'find anomalies in [metric name]'\n\n";
            text += "What metric would you like to examine?";
        } else {
            text += "To see metric status, I need measurements to be loaded.\n\n";
            text += "Please open the Schema Explorer to load your measurements, then I can help you analyze them.";
        }
        
        return {
            text,
            data: { type: 'status_overview', measurementCount: measurements.length },
            actions: [
                { label: 'Open Schema Explorer', action: 'openSchemaExplorer' },
                { label: 'Show Measurements', action: 'showMeasurements' }
            ]
        };
    },

    async runSystemHealthCheck() {
        const checks = [];
        
        // Check connection
        checks.push({
            name: 'Grafana Connection',
            status: GrafanaConfig.connected ? 'healthy' : 'disconnected',
            details: GrafanaConfig.connected ? `Connected to ${GrafanaConfig.url}` : 'Not connected'
        });
        
        // Check AI service
        checks.push({
            name: 'AI Service',
            status: Analytics.isConnected ? 'healthy' : 'disconnected',
            details: Analytics.isConnected ? 'AI service available' : 'AI service not connected'
        });
        
        // Check datasources
        if (GrafanaConfig.connected) {
            const datasourceCount = document.querySelectorAll('.datasource-item').length;
            checks.push({
                name: 'Data Sources',
                status: datasourceCount > 0 ? 'healthy' : 'warning',
                details: `${datasourceCount} data sources available`
            });
        }
        
        // Format health check results
        let text = '🏥 **System Health Check**\n\n';
        checks.forEach(check => {
            const icon = check.status === 'healthy' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
            text += `${icon} ${check.name}: ${check.details}\n`;
        });
        
        return {
            text,
            data: { type: 'health_check', checks }
        };
    },

    async showMetricForecast(context) {
        if (!context.metric) {
            return await this.startMetricConversation('forecast', '7d', 
                "I can help you forecast metric trends! Which metric would you like me to predict?");
        }
        
        // Set up forecast analysis
        if (window.Analytics) {
            Analytics.config.measurement = context.metric.measurement;
            Analytics.config.field = context.metric.field;
            Analytics.config.timeRange = context.timeRange || '7d';
            Analytics.config.analysisType = 'prediction';
            Analytics.config.forecastHorizon = '1d';
            
            return {
                text: `I'll generate a forecast for ${context.metric.measurement}.${context.metric.field}...`,
                data: { type: 'forecast_started' },
                actions: [
                    { label: 'Run Forecast', action: 'executeForecast' }
                ]
            };
        }
        
        return {
            text: "Forecasting module not available.",
            data: { type: 'error' }
        };
    },
    
    // Show metric search interface
    async showMetricSearch() {
        const availableMetrics = await this.getAvailableMetrics();
        
        return {
            text: "I can help you find the right metric! Here are some of the metrics I can see:",
            data: {
                type: 'metric_search',
                availableMetrics
            },
            actions: [
                { label: 'Open Schema Explorer', action: 'openSchemaExplorer' },
                { label: 'Show All Metrics', action: 'browseMetrics' }
            ]
        };
    },
    
    // Show time range selection options
    async showTimeRangeOptions(context) {
        const currentRange = context?.timeRange || this.context.currentTimeRange || '1h';
        
        return {
            text: `Current time range is ${currentRange}. What time range would you like to analyze instead?`,
            data: {
                type: 'time_range_selection',
                currentRange
            },
            actions: [
                { label: 'Last Hour', action: 'setTimeRange:1h' },
                { label: 'Last 6 Hours', action: 'setTimeRange:6h' },
                { label: 'Last Day', action: 'setTimeRange:1d' },
                { label: 'Last Week', action: 'setTimeRange:7d' }
            ]
        };
    },

    // Query execution helpers
    async executeQuery(query) {
        if (!window.Queries) {
            throw new Error('Query system not available');
        }
        
        return await Queries.executeQuery(query, {
            datasourceId: GrafanaConfig.currentDatasourceId,
            datasourceType: GrafanaConfig.selectedDatasourceType
        });
    },

    buildStatusQuery() {
        // Build a query to get current status
        if (GrafanaConfig.selectedDatasourceType === 'influxdb') {
            return 'SHOW MEASUREMENTS LIMIT 10';
        } else if (GrafanaConfig.selectedDatasourceType === 'prometheus') {
            return 'up';
        }
        
        return '';
    },

    formatStatusResults(results) {
        // Format query results for chat display
        if (!results || !results.results) {
            return 'No data available.';
        }
        
        let text = '📊 **Current Status**\n\n';
        
        // Extract and format data
        if (results.results.A && results.results.A.frames) {
            const frames = results.results.A.frames;
            frames.forEach(frame => {
                if (frame.data && frame.data.values) {
                    text += `Found ${frame.data.values[0].length} data points\n`;
                }
            });
        }
        
        return text;
    },
    
    // Start conversational metric selection
    async startMetricConversation(analysisType, timeRange, greeting) {
        // Try to show available measurements to guide the conversation
        const availableMetrics = await this.getAvailableMetrics();
        
        let text = greeting + "\n\n";
        
        if (availableMetrics && availableMetrics.length > 0) {
            text += "I can see you have data for these metrics:\n";
            const topMetrics = availableMetrics.slice(0, 5);
            topMetrics.forEach(metric => {
                text += `• ${metric}\n`;
            });
            
            if (availableMetrics.length > 5) {
                text += `• ... and ${availableMetrics.length - 5} more\n`;
            }
            
            text += "\nWhich one would you like me to analyze?";
        } else {
            text += "What metric would you like me to analyze? You can tell me the measurement name (like 'cpu', 'memory', 'network') and I'll help you find the specific field.";
        }
        
        return {
            text,
            data: {
                type: 'metric_conversation',
                analysisType,
                timeRange,
                availableMetrics
            },
            actions: [
                { label: 'Browse All Metrics', action: 'browseMetrics' },
                { label: 'Search Metrics', action: 'searchMetrics' }
            ]
        };
    },
    
    // Get available metrics from the current datasource
    async getAvailableMetrics() {
        try {
            if (!GrafanaConfig.connected) {
                console.log('🗛️ No Grafana connection found');
                return [];
            }
            
            console.log('🔍 Getting available metrics...', {
                connected: GrafanaConfig.connected,
                datasourceId: GrafanaConfig.currentDatasourceId,
                schemaAvailable: !!(window.Schema),
                schemaMeasurements: window.Schema?.measurements?.length || 0
            });
            
            // Primary source: Schema object (populated by schema loading)
            if (window.Schema && Schema.measurements && Schema.measurements.length > 0) {
                console.log('📊 Using Schema.measurements:', Schema.measurements);
                return Schema.measurements.map(m => {
                    const name = typeof m === 'string' ? m : (m.name || m.measurement || m);
                    return name;
                }).filter(Boolean).slice(0, 15);
            }
            
            // Secondary source: localStorage cache (persisted schema data)
            const cachedSchema = this.getSchemaFromCache();
            if (cachedSchema.length > 0) {
                console.log('💾 Using cached schema:', cachedSchema);
                return cachedSchema.slice(0, 15);
            }
            
            console.log('⚠️ No measurements found in data layer - schema may need to be loaded');
            return [];
        } catch (error) {
            console.warn('Could not fetch available metrics:', error);
            return [];
        }
    },
    
    // Get schema from localStorage cache
    getSchemaFromCache() {
        try {
            const cacheKey = 'grafanaSchemaCache';
            const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
            
            if (GrafanaConfig.currentDatasourceId && cache[GrafanaConfig.currentDatasourceId]) {
                const schema = cache[GrafanaConfig.currentDatasourceId];
                if (schema.measurements && Array.isArray(schema.measurements)) {
                    return schema.measurements.map(m => {
                        const name = typeof m === 'string' ? m : (m.name || m.measurement || m);
                        return name;
                    }).filter(Boolean);
                }
            }
            
            return [];
        } catch (error) {
            console.warn('Error reading schema cache:', error);
            return [];
        }
    },
    
    // Get available fields from the data layer (not DOM)
    getAvailableFields() {
        const fields = [];
        
        // Primary source: Schema object
        if (window.Schema && Schema.fields && Array.isArray(Schema.fields)) {
            Schema.fields.forEach(f => {
                const name = typeof f === 'string' ? f : (f.name || f.field);
                if (name && !fields.includes(name)) {
                    fields.push(name);
                }
            });
        }
        
        // Secondary source: cached schema data
        try {
            const cacheKey = 'grafanaSchemaCache';
            const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
            
            if (GrafanaConfig.currentDatasourceId && cache[GrafanaConfig.currentDatasourceId]) {
                const schema = cache[GrafanaConfig.currentDatasourceId];
                if (schema.fields && Array.isArray(schema.fields)) {
                    schema.fields.forEach(f => {
                        const name = typeof f === 'string' ? f : (f.name || f.field);
                        if (name && !fields.includes(name)) {
                            fields.push(name);
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('Error reading field cache:', error);
        }
        
        console.log('🏷️ Found fields from data layer:', fields);
        return fields;
    },
    
    // Extract possible metric from user message
    extractPossibleMetricFromMessage(message) {
        const commonMetrics = [
            'cpu', 'memory', 'mem', 'disk', 'network', 'net', 'load', 'response_time', 
            'latency', 'throughput', 'error_rate', 'temperature', 'temp', 'bandwidth',
            'requests', 'connections', 'queue', 'cache', 'database', 'db',
            'uptime', 'availability', 'usage', 'utilization', 'performance', 
            'bytes', 'packets', 'errors', 'dropped', 'transmitted', 'received'
        ];
        
        const lowerMessage = message.toLowerCase().trim();
        
        // First check if the entire message is just a metric name
        if (commonMetrics.includes(lowerMessage)) {
            return lowerMessage;
        }
        
        // Then check if any metric is contained in the message
        for (const metric of commonMetrics) {
            if (lowerMessage.includes(metric)) {
                return metric;
            }
        }
        
        // Also check for metric patterns in measurement names from available data
        const availableMetrics = this.getCurrentMetricsList();
        for (const available of availableMetrics) {
            const availableLower = available.toLowerCase();
            if (lowerMessage.includes(availableLower) || availableLower.includes(lowerMessage)) {
                return available;
            }
        }
        
        return null;
    },
    
    // Get current metrics list synchronously (for immediate use)
    getCurrentMetricsList() {
        try {
            // Use the same data access pattern as getAvailableMetrics but synchronously
            if (window.Schema && Schema.measurements && Array.isArray(Schema.measurements)) {
                return Schema.measurements.map(m => {
                    const name = typeof m === 'string' ? m : (m.name || m.measurement);
                    return name;
                }).filter(Boolean);
            }
            
            // Try cached schema data
            const cached = this.getSchemaFromCache();
            if (cached.length > 0) {
                return cached;
            }
            
            return [];
        } catch (error) {
            return [];
        }
    },
    
    // Extract measurements from query results
    extractMeasurementsFromResults(results) {
        try {
            if (!results || !results.results || !results.results.A) {
                return [];
            }
            
            const frames = results.results.A.frames || [];
            const measurements = [];
            
            frames.forEach(frame => {
                if (frame.data && frame.data.values && frame.data.values[0]) {
                    frame.data.values[0].forEach(value => {
                        if (typeof value === 'string' && !measurements.includes(value)) {
                            measurements.push(value);
                        }
                    });
                }
            });
            
            return measurements;
        } catch (error) {
            console.warn('Error extracting measurements:', error);
            return [];
        }
    },
    
    // Open schema explorer
    async openSchemaExplorer() {
        if (window.Interface) {
            Interface.switchSidebarView('explorer');
        }
        
        return {
            text: "I've opened the Schema Explorer where you can browse all your available metrics and measurements. Once you find an interesting metric, just tell me about it and I can analyze it for you!",
            data: { type: 'view_switched', view: 'explorer' }
        };
    },
    
    // Show measurements
    async showMeasurements() {
        if (!GrafanaConfig.connected) {
            return {
                text: "Please connect to a Grafana datasource first to see available measurements.",
                data: { type: 'connection_required' }
            };
        }
        
        // Get actual measurements, not datasources
        const allMetrics = await this.getAvailableMetrics();
        const schemaCache = this.getSchemaFromCache();
        
        // Combine and deduplicate
        const measurements = [...new Set([...allMetrics, ...schemaCache])];
        
        if (measurements.length > 0) {
            let text = "Here are the measurements I found:\n\n";
            measurements.slice(0, 20).forEach((measurement, index) => {
                text += `• ${measurement}\n`;
            });
            
            if (measurements.length > 20) {
                text += `\n... and ${measurements.length - 20} more\n`;
            }
            
            text += "\nTell me which measurement you'd like to analyze (e.g., 'analyze cpu_usage' or 'show me memory trends').";
            
            return {
                text,
                data: { type: 'measurements_list', measurements }
            };
        } else {
            // If no measurements cached, explain how to load them
            return {
                text: `I don't see any measurements loaded yet. To load measurements:\n\n1. Select a data source (you have Griffin-NBS selected)\n2. Open the Schema Explorer\n3. The measurements will load automatically\n\nCommon measurements include:\n• cpu_usage\n• memory_utilization\n• disk_io\n• network_traffic\n• error_rate\n\nWould you like me to help you analyze any of these?`,
                data: { type: 'no_measurements' },
                actions: [
                    { label: 'Open Schema Explorer', action: 'openSchemaExplorer' },
                    { label: 'Analyze CPU', action: 'analyzeCPU' },
                    { label: 'Analyze Memory', action: 'analyzeMemory' }
                ]
            };
        }
    },
    
    // Show fields
    async showFields() {
        if (!GrafanaConfig.connected) {
            return {
                text: "Please connect to a Grafana datasource first to see available fields.",
                data: { type: 'connection_required' }
            };
        }
        
        const fields = this.getAvailableFields();
        
        if (fields.length > 0) {
            let text = "Here are the available fields I can see:\n\n";
            fields.forEach((field, index) => {
                text += `${index + 1}. ${field}\n`;
            });
            text += "\nTell me which field you'd like to analyze, like 'value' or 'usage'.";
            
            return {
                text,
                data: { type: 'fields_list', fields }
            };
        } else {
            return {
                text: "I don't see any fields loaded yet. You may need to select a measurement first in the Schema Explorer to see its fields.",
                data: { type: 'no_fields' },
                actions: [
                    { label: 'Open Schema Explorer', action: 'openSchemaExplorer' }
                ]
            };
        }
    },
    
    // Open connections panel
    async openConnections() {
        if (window.Interface) {
            Interface.switchSidebarView('connections');
        }
        
        return {
            text: "I've opened the Connections panel. Please connect to a Grafana datasource and select a data source, then come back and ask me about your metrics!",
            data: { type: 'view_switched', view: 'connections' }
        };
    },
    
    // Refresh schema
    async refreshSchema() {
        if (window.Schema && typeof Schema.loadSchema === 'function') {
            Schema.loadSchema();
        }
        
        if (window.Interface) {
            Interface.switchSidebarView('explorer');
        }
        
        return {
            text: "I've refreshed the schema data and opened the Schema Explorer. The measurements should load shortly. Once you see them, let me know which metrics you'd like to analyze!",
            data: { type: 'schema_refreshed' }
        };
    },
    
    // Check specific metric status
    async checkSpecificMetricStatus(context) {
        const metric = context?.metric || this.context.currentMetric;
        
        if (!metric) {
            return await this.startMetricConversation('status', '1h', 
                "I'd be happy to check a metric's status! Which metric would you like me to examine?");
        }
        
        return {
            text: `Checking the current status of ${metric.measurement}.${metric.field}...`,
            data: {
                type: 'metric_status_check',
                metric
            },
            actions: [
                { label: 'Show Recent Values', action: 'showRecentValues' },
                { label: 'Check for Issues', action: 'findAnomalies' }
            ]
        };
    },
    
    // Compare time periods
    async compareTimePeriods(context) {
        const metric = context?.metric || this.context.currentMetric;
        
        if (!metric) {
            return await this.startMetricConversation('comparison', '7d', 
                "I can compare metrics across different time periods! Which metric would you like me to compare?");
        }
        
        return {
            text: `I'll compare ${metric.measurement}.${metric.field} across different time periods. What would you like to compare?`,
            data: {
                type: 'period_comparison',
                metric
            },
            actions: [
                { label: 'Yesterday vs Today', action: 'compareYesterdayToday' },
                { label: 'This Week vs Last Week', action: 'compareWeeks' },
                { label: 'Custom Periods', action: 'customComparison' }
            ]
        };
    },
    
    // Handle datasource-specific queries
    async handleDatasourceQuery(message) {
        const lower = message.toLowerCase();
        
        // Extract datasource name if mentioned
        let datasourceName = null;
        const datasourceMatches = message.match(/griffin-[\w\s-]+/gi);
        if (datasourceMatches) {
            datasourceName = datasourceMatches[0];
        }
        
        if (datasourceName) {
            return {
                text: `To see measurements for ${datasourceName}:\n\n1. First, make sure ${datasourceName} is selected as your data source\n2. Then I can help you explore its measurements\n\nThe measurements are specific to each data source. Common ones include metrics like:\n• cpu_usage\n• memory_utilization\n• disk_io\n• network_traffic\n• response_time\n\nWhat type of metrics are you interested in analyzing?`,
                data: { type: 'datasource_guidance', datasource: datasourceName },
                actions: [
                    { label: 'Select This Datasource', action: 'openConnections' },
                    { label: 'Browse Schema', action: 'openSchemaExplorer' }
                ]
            };
        }
        
        return this.handleGeneralQuery({ entities: {} }, message);
    },
    
    // Handle when user mentions a specific metric in conversation
    async handleMetricMention(metricName, analysisType = 'status') {
        // Try to find the metric in available measurements
        const availableMetrics = await this.getAvailableMetrics();
        const matchedMetric = availableMetrics.find(m => 
            m.toLowerCase().includes(metricName.toLowerCase()) ||
            metricName.toLowerCase().includes(m.toLowerCase())
        );
        
        if (matchedMetric) {
            // Set as current context
            this.context.currentMetric = {
                measurement: matchedMetric,
                field: 'value' // Default field, might need to be more specific
            };
            
            return {
                text: `Great! I found the "${matchedMetric}" metric. What would you like me to do with it?`,
                data: {
                    type: 'metric_found',
                    metric: matchedMetric,
                    analysisType
                },
                actions: [
                    { label: 'Find Anomalies', action: 'runAnomalyAnalysis' },
                    { label: 'Check Status', action: 'checkMetricStatus' },
                    { label: 'Analyze Trends', action: 'analyzeTrends' }
                ]
            };
        } else {
            return {
                text: `I couldn't find a metric called "${metricName}". Let me show you what's available:`,
                data: {
                    type: 'metric_not_found',
                    searchTerm: metricName
                },
                actions: [
                    { label: 'Browse Available Metrics', action: 'browseMetrics' },
                    { label: 'Search Metrics', action: 'searchMetrics' }
                ]
            };
        }
    }
};

// Export for global access
window.AIAgentEngine = AIAgentEngine;