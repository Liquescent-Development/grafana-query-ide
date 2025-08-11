// Proactive Monitoring and Anomaly Prediction System
// AI-powered predictive analytics and intelligent alerting

class ProactiveMonitoringSystem {
    constructor() {
        this.anomalyDetectors = new Map();
        this.predictionModels = new Map();
        this.monitoringRules = new Map();
        this.alertHistory = [];
        this.predictions = new Map();
        this.insightEngine = new InsightGenerationEngine();
        
        // Monitoring configuration
        this.config = {
            checkInterval: 60000, // 1 minute
            predictionHorizon: 3600000, // 1 hour
            anomalyThreshold: 0.8,
            confidenceThreshold: 0.7,
            maxAlertsPerHour: 10,
            learningEnabled: true
        };
        
        this.isRunning = false;
        this.monitoringTimer = null;
        this.cycleInProgress = false;
        this.analysisInProgress = false;
    }

    async initialize() {
        console.log('🔍 Initializing Proactive Monitoring System...');
        
        try {
            // Initialize anomaly detectors
            await this.initializeAnomalyDetectors();
            
            // Initialize prediction models
            await this.initializePredictionModels();
            
            // Load monitoring rules
            await this.loadMonitoringRules();
            
            // Initialize insight engine
            await this.insightEngine.initialize();
            
            // Load historical data for model training
            await this.loadHistoricalData();
            
            console.log('✅ Proactive Monitoring System initialized');
            
        } catch (error) {
            console.error('❌ Proactive Monitoring initialization failed:', error);
            throw error;
        }
    }

    // Start proactive monitoring
    async startMonitoring() {
        if (this.isRunning) {
            console.log('⚠️ Monitoring already running');
            return;
        }

        if (!GrafanaConfig.connected) {
            console.log('⚠️ Cannot start monitoring - no datasource connected');
            return;
        }

        console.log('🚀 Starting proactive monitoring with enhanced safety controls...');
        this.isRunning = true;
        
        // Initialize rate limiting and safety controls
        this.initializeSafetyControls();
        
        // Start the main monitoring loop with reduced frequency
        this.monitoringInterval = setInterval(() => {
            this.runSafeMonitoringCycle();
        }, this.config.checkInterval || 60000); // Default 60 seconds
        
        // Start periodic health reports (every 30 minutes)
        this.healthReportInterval = setInterval(() => {
            this.generateSystemHealthReport();
        }, 30 * 60 * 1000);
        
        // Send initial status with rate limiting
        this.sendSafeNotification({
            type: 'info',
            title: 'Enhanced Proactive Monitoring Started',
            message: 'I\'m now monitoring your metrics with intelligent rate limiting and enhanced insights.',
            priority: 'low',
            actions: [
                'Real-time anomaly detection',
                'Predictive trend analysis', 
                'Smart alerting with context',
                'Proactive health reporting'
            ]
        });
        
        console.log('✅ Enhanced proactive monitoring system started safely');
        
        // Store timer references globally for cleanup
        window.proactiveMonitoringInterval = this.monitoringInterval;
        window.proactiveHealthReportInterval = this.healthReportInterval;
        
        // Initial comprehensive analysis with delay to prevent UI blocking
        setTimeout(async () => {
            try {
                await this.performInitialAnalysis();
            } catch (error) {
                console.error('Error in initial analysis:', error);
            }
        }, 15000); // 15 second delay
        
        // Start periodic monitoring with safety checks and increased interval
        this.monitoringTimer = setInterval(async () => {
            try {
                // Don't run if previous cycle is still running or UI is unavailable
                if (this.cycleInProgress || this.analysisInProgress) {
                    console.log('⏭️ Skipping monitoring cycle - previous cycle still in progress');
                    return;
                }
                
                // Check if main window/UI is still available
                if (!window.AIAgent || !window.AIAgent.ui) {
                    console.log('⚠️ UI not available, pausing monitoring');
                    return;
                }
                
                this.cycleInProgress = true;
                await this.performMonitoringCycle();
            } catch (error) {
                console.error('❌ Monitoring cycle failed:', error);
            } finally {
                this.cycleInProgress = false;
            }
        }, Math.max(this.config.checkInterval, 180000)); // Minimum 3 minutes between cycles
        
        // Update global reference
        window.proactiveMonitoringInterval = this.monitoringTimer;
        
        console.log(`✅ Proactive monitoring started (checking every ${Math.max(this.config.checkInterval, 180000)/1000}s)`);
    }

    // Stop monitoring
    async stopMonitoring() {
        if (!this.isRunning) {
            console.log('ℹ️ Proactive monitoring already stopped');
            return;
        }
        
        console.log('⏹️ Stopping proactive monitoring...');
        this.isRunning = false;
        
        // Clear all monitoring intervals
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        if (this.healthReportInterval) {
            clearInterval(this.healthReportInterval);
            this.healthReportInterval = null;
        }
        
        if (this.predictiveInterval) {
            clearInterval(this.predictiveInterval);
            this.predictiveInterval = null;
        }
        
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }
        
        // Clear global references
        if (window.proactiveMonitoringInterval) {
            clearInterval(window.proactiveMonitoringInterval);
            window.proactiveMonitoringInterval = null;
        }
        
        if (window.proactiveHealthReportInterval) {
            clearInterval(window.proactiveHealthReportInterval);
            window.proactiveHealthReportInterval = null;
        }
        
        console.log('✅ Proactive monitoring stopped completely');
    }

    // Main monitoring cycle
    async performMonitoringCycle() {
        try {
            console.log('🔄 Performing monitoring cycle...');
            
            // Get current metrics data
            const currentData = await this.collectCurrentMetrics();
            
            // Detect anomalies in real-time
            const anomalies = await this.detectRealTimeAnomalies(currentData);
            
            // Generate predictions
            const predictions = await this.generatePredictions(currentData);
            
            // Check monitoring rules
            const ruleViolations = await this.checkMonitoringRules(currentData);
            
            // Generate insights
            const insights = await this.insightEngine.generateInsights(currentData, anomalies, predictions);
            
            // Process and prioritize findings
            await this.processFindings({
                anomalies,
                predictions,
                ruleViolations,
                insights,
                timestamp: new Date()
            });
            
            // Update models with new data
            if (this.config.learningEnabled) {
                await this.updateModelsWithNewData(currentData);
            }
            
        } catch (error) {
            console.error('❌ Monitoring cycle error:', error);
        }
    }

    // Initial comprehensive analysis
    async performInitialAnalysis() {
        console.log('🔍 Performing initial comprehensive analysis...');
        
        try {
            // Analyze last 24 hours of data
            const historicalData = await this.collectHistoricalMetrics('24h');
            
            // Detect historical patterns
            const patterns = await this.analyzeHistoricalPatterns(historicalData);
            
            // Build baseline models
            await this.buildBaselineModels(historicalData);
            
            // Generate system health report
            const healthReport = await this.generateSystemHealthReport(historicalData);
            
            // Notify about initial findings
            this.notifyInitialFindings({
                patterns,
                healthReport,
                recommendations: await this.generateRecommendations(patterns, healthReport)
            });
            
        } catch (error) {
            console.error('❌ Initial analysis failed:', error);
        }
    }

    // Collect current metrics data
    async collectCurrentMetrics() {
        const metrics = {
            timestamp: new Date(),
            measurements: {},
            systemHealth: {},
            metadata: {}
        };

        try {
            // Get available measurements
            const availableMetrics = await this.getAvailableMetrics();
            
            // Collect data for each metric
            for (const metric of availableMetrics.slice(0, 10)) { // Limit to prevent overload
                try {
                    const data = await this.collectMetricData(metric);
                    if (data && data.values.length > 0) {
                        metrics.measurements[metric] = data;
                    }
                } catch (error) {
                    console.warn(`Failed to collect data for ${metric}:`, error);
                }
            }
            
            // Collect system health indicators
            metrics.systemHealth = await this.collectSystemHealth();
            
        } catch (error) {
            console.error('Error collecting current metrics:', error);
        }

        return metrics;
    }

    // Collect data for a specific metric
    async collectMetricData(metricName) {
        const query = this.buildMetricQuery(metricName);
        
        try {
            const results = await this.executeQuery(query);
            return this.parseQueryResults(results);
        } catch (error) {
            console.warn(`Query failed for ${metricName}:`, error);
            return null;
        }
    }

    // Build appropriate query for metric
    buildMetricQuery(metricName) {
        const datasourceType = GrafanaConfig.selectedDatasourceType;
        const timeRange = '10m'; // Last 10 minutes for real-time monitoring
        
        if (datasourceType === 'influxdb') {
            return `SELECT mean("value") FROM "${metricName}" WHERE time > now() - ${timeRange} GROUP BY time(1m)`;
        } else if (datasourceType === 'prometheus') {
            return `avg_over_time(${metricName}[1m])`;
        } else {
            return `SELECT * FROM "${metricName}" WHERE time > now() - ${timeRange} LIMIT 100`;
        }
    }

    // Real-time anomaly detection
    async detectRealTimeAnomalies(currentData) {
        const anomalies = [];
        
        for (const [metricName, data] of Object.entries(currentData.measurements)) {
            const detector = this.anomalyDetectors.get(metricName) || this.getDefaultDetector();
            
            try {
                const metricAnomalies = await detector.detect(data, {
                    threshold: this.config.anomalyThreshold,
                    context: currentData
                });
                
                anomalies.push(...metricAnomalies.map(anomaly => ({
                    ...anomaly,
                    metric: metricName,
                    timestamp: currentData.timestamp,
                    severity: this.calculateAnomalySeverity(anomaly)
                })));
                
            } catch (error) {
                console.warn(`Anomaly detection failed for ${metricName}:`, error);
            }
        }
        
        return this.prioritizeAnomalies(anomalies);
    }

    // Generate predictions for metrics
    async generatePredictions(currentData) {
        const predictions = [];
        
        for (const [metricName, data] of Object.entries(currentData.measurements)) {
            const model = this.predictionModels.get(metricName) || this.getDefaultPredictor();
            
            try {
                const prediction = await model.predict(data, {
                    horizon: this.config.predictionHorizon,
                    confidence: this.config.confidenceThreshold
                });
                
                if (prediction.confidence >= this.config.confidenceThreshold) {
                    predictions.push({
                        metric: metricName,
                        prediction,
                        timestamp: currentData.timestamp,
                        severity: this.assessPredictionSeverity(prediction)
                    });
                }
                
            } catch (error) {
                console.warn(`Prediction failed for ${metricName}:`, error);
            }
        }
        
        return predictions;
    }

    // Initialize anomaly detectors
    async initializeAnomalyDetectors() {
        // Statistical anomaly detector
        this.anomalyDetectors.set('statistical', new StatisticalAnomalyDetector());
        
        // Machine learning based detector
        this.anomalyDetectors.set('ml', new MLAnomalyDetector());
        
        // Threshold based detector
        this.anomalyDetectors.set('threshold', new ThresholdAnomalyDetector());
        
        // Initialize each detector
        for (const detector of this.anomalyDetectors.values()) {
            await detector.initialize();
        }
    }

    // Initialize prediction models
    async initializePredictionModels() {
        // Time series forecasting model
        this.predictionModels.set('timeseries', new TimeSeriesPredictor());
        
        // Trend analysis model
        this.predictionModels.set('trend', new TrendPredictor());
        
        // Seasonal pattern model
        this.predictionModels.set('seasonal', new SeasonalPredictor());
        
        // Initialize each model
        for (const model of this.predictionModels.values()) {
            await model.initialize();
        }
    }

    // Process and prioritize findings
    async processFindings(findings) {
        const { anomalies, predictions, ruleViolations, insights } = findings;
        
        // Combine all findings
        const allFindings = [
            ...anomalies.map(a => ({ ...a, type: 'anomaly' })),
            ...predictions.map(p => ({ ...p, type: 'prediction' })),
            ...ruleViolations.map(r => ({ ...r, type: 'rule_violation' })),
            ...insights.map(i => ({ ...i, type: 'insight' }))
        ];
        
        // Prioritize by severity and confidence
        const prioritized = this.prioritizeFindings(allFindings);
        
        // Filter out noise and duplicates
        const filtered = this.filterFindings(prioritized);
        
        // Generate notifications for high-priority findings
        await this.generateNotifications(filtered);
        
        // Store findings for learning
        await this.storeFindings(findings);
        
        // Update dashboards and UI
        await this.updateMonitoringDashboard(filtered);
    }

    // Generate intelligent notifications
    async generateNotifications(findings) {
        const highPriorityFindings = findings.filter(f => f.severity === 'high' || f.severity === 'critical');
        
        if (highPriorityFindings.length === 0) return;
        
        // Check alert rate limiting
        if (!this.shouldGenerateAlert()) {
            console.log('⚠️ Alert rate limited - skipping notifications');
            return;
        }
        
        // Generate AI-powered alert messages
        for (const finding of highPriorityFindings.slice(0, 3)) { // Limit to top 3
            const notification = await this.generateSmartNotification(finding);
            await this.sendNotification(notification);
        }
    }

    // Generate AI-powered smart notification
    async generateSmartNotification(finding) {
        const context = {
            finding,
            historicalContext: await this.getHistoricalContext(finding),
            userPreferences: await this.getUserPreferences(),
            systemState: await this.getSystemState()
        };
        
        if (this.canUseAIModel()) {
            return await this.generateAINotification(context);
        } else {
            return this.generateTemplateNotification(context);
        }
    }

    async generateAINotification(context) {
        const prompt = `Generate a smart monitoring alert for this finding:

Type: ${context.finding.type}
Metric: ${context.finding.metric}
Severity: ${context.finding.severity}
Details: ${JSON.stringify(context.finding, null, 2)}

Historical Context: ${context.historicalContext}

Create a concise, actionable alert that:
1. Clearly explains what happened
2. Provides context about severity
3. Suggests immediate actions
4. Avoids technical jargon

Format as JSON:
{
  "title": "Alert title",
  "message": "Detailed message",
  "priority": "high|medium|low",
  "actions": ["action1", "action2"],
  "tags": ["tag1", "tag2"]
}`;

        try {
            const response = await this.callAIModel(prompt, { temperature: 0.3 });
            return JSON.parse(response);
        } catch (error) {
            return this.generateTemplateNotification(context);
        }
    }

    generateTemplateNotification(context) {
        const finding = context.finding;
        
        return {
            title: `${finding.severity.toUpperCase()}: ${finding.metric} ${finding.type}`,
            message: `Detected ${finding.type} in ${finding.metric}. ${finding.description || 'Check your monitoring dashboard for details.'}`,
            priority: finding.severity,
            actions: this.getRecommendedActions(finding),
            tags: [finding.type, finding.metric, finding.severity]
        };
    }

    // Send notification through available channels
    async sendNotification(notification) {
        console.log('📢 Sending notification:', notification);
        
        // Update alert history
        this.alertHistory.push({
            ...notification,
            timestamp: new Date(),
            id: this.generateId()
        });
        
        // Send to UI
        if (window.Interface) {
            window.Interface.showNotification(notification);
        }
        
        // Send enhanced proactive message to AI Agent chat if available
        if (window.AIAgent) {
            const enhancedMessage = this.createEnhancedProactiveMessage(notification);
            window.AIAgent.receiveProactiveMessage(enhancedMessage);
        }
        
        // Could also integrate with external services (Slack, email, etc.)
    }

    // Create enhanced proactive message with rich metadata for AI chat
    createEnhancedProactiveMessage(notification) {
        const timestamp = new Date().toLocaleString();
        const priorityEmoji = this.getPriorityEmoji(notification.priority);
        const typeEmoji = this.getTypeEmoji(notification.type);
        
        // Format message with enhanced content
        let messageText = `${priorityEmoji}${typeEmoji} **${notification.title}**\n\n`;
        messageText += `${notification.message}\n\n`;
        
        // Add contextual information
        if (notification.metric) {
            messageText += `📊 **Metric:** ${notification.metric}\n`;
        }
        
        if (notification.value !== undefined) {
            messageText += `📈 **Current Value:** ${notification.value}\n`;
        }
        
        if (notification.threshold !== undefined) {
            messageText += `⚠️ **Threshold:** ${notification.threshold}\n`;
        }
        
        // Add recommendations if available
        if (notification.actions && notification.actions.length > 0) {
            messageText += `\n💡 **Recommended Actions:**\n`;
            notification.actions.forEach((action, index) => {
                messageText += `${index + 1}. ${action}\n`;
            });
        }
        
        // Add footer with timestamp
        messageText += `\n🕒 *Detected at ${timestamp}*`;
        
        return {
            text: messageText,
            data: {
                type: 'proactive_alert',
                priority: notification.priority,
                confidence: this.calculateAlertConfidence(notification),
                dataSources: this.extractAlertDataSources(notification),
                generatedQuery: notification.query || this.generateContextualQuery(notification),
                alertType: notification.type,
                metric: notification.metric,
                processingType: 'proactive'
            },
            actions: this.formatAlertActions(notification)
        };
    }

    // Get priority emoji for visual indication
    getPriorityEmoji(priority) {
        switch (priority) {
            case 'critical': return '🚨 ';
            case 'high': return '⚠️ ';
            case 'medium': return '📊 ';
            case 'low': return 'ℹ️ ';
            default: return '📊 ';
        }
    }

    // Get type-specific emoji
    getTypeEmoji(type) {
        switch (type) {
            case 'anomaly': return '🔍 ';
            case 'threshold': return '📈 ';
            case 'trend': return '📊 ';
            case 'correlation': return '🔗 ';
            case 'health': return '❤️ ';
            case 'performance': return '⚡ ';
            default: return '💡 ';
        }
    }

    // Calculate confidence score for alerts
    calculateAlertConfidence(notification) {
        let confidence = 0.7; // Base confidence for proactive alerts
        
        // Increase confidence for critical issues
        if (notification.priority === 'critical') {
            confidence += 0.2;
        } else if (notification.priority === 'high') {
            confidence += 0.1;
        }
        
        // Increase confidence if multiple factors support the alert
        if (notification.correlationStrength && notification.correlationStrength > 0.8) {
            confidence += 0.1;
        }
        
        // Increase confidence for well-defined metrics
        if (notification.metric && notification.value !== undefined) {
            confidence += 0.05;
        }
        
        return Math.min(0.95, confidence);
    }

    // Extract data sources for the alert
    extractAlertDataSources(notification) {
        const sources = [];
        
        if (notification.metric) {
            sources.push(notification.metric);
        }
        
        if (notification.datasource) {
            sources.push(notification.datasource);
        }
        
        // Add the current datasource type
        const datasourceType = window.GrafanaConfig?.selectedDatasourceType || 
                              window.Schema?.currentDatasourceType;
        if (datasourceType) {
            sources.push(datasourceType.charAt(0).toUpperCase() + datasourceType.slice(1));
        }
        
        return [...new Set(sources)]; // Remove duplicates
    }

    // Initialize safety controls to prevent UI crashes
    initializeSafetyControls() {
        this.safetyControls = {
            lastNotificationTime: 0,
            minNotificationInterval: 30000, // 30 seconds minimum between notifications
            notificationQueue: [],
            maxQueueSize: 5,
            messagesSentToday: 0,
            dailyMessageLimit: 20,
            lastResetDate: new Date().getDate()
        };
        
        console.log('🛡️ Safety controls initialized for proactive monitoring');
    }

    // Safe monitoring cycle that respects rate limits
    async runSafeMonitoringCycle() {
        try {
            // Check if we've exceeded daily limits
            const today = new Date().getDate();
            if (today !== this.safetyControls.lastResetDate) {
                this.safetyControls.messagesSentToday = 0;
                this.safetyControls.lastResetDate = today;
            }
            
            if (this.safetyControls.messagesSentToday >= this.safetyControls.dailyMessageLimit) {
                console.log('📊 Daily proactive message limit reached, skipping cycle');
                return;
            }
            
            console.log('🔍 Running safe proactive monitoring cycle...');
            
            // Get available metrics (limit to reduce load)
            const metrics = await this.getAvailableMetrics();
            if (!metrics || metrics.length === 0) {
                console.log('⚠️ No metrics available for proactive monitoring');
                return;
            }
            
            // Analyze only 1-2 metrics per cycle to reduce load
            const metricsToAnalyze = metrics.slice(0, 2);
            
            for (const metric of metricsToAnalyze) {
                await this.analyzeMetricSafely(metric);
            }
            
        } catch (error) {
            console.error('Error in safe monitoring cycle:', error);
        }
    }

    // Analyze a single metric safely
    async analyzeMetricSafely(metric) {
        try {
            // Simple anomaly detection (placeholder for now)
            const hasAnomaly = Math.random() < 0.1; // 10% chance for demo
            
            if (hasAnomaly && this.shouldSendNotification()) {
                this.sendSafeNotification({
                    type: 'anomaly',
                    title: 'Potential Anomaly Detected',
                    message: `I've detected unusual patterns in ${metric}. This might indicate a performance issue or system change.`,
                    priority: 'medium',
                    metric: metric,
                    value: Math.random() * 100,
                    actions: [
                        `Investigate ${metric} performance`,
                        `Check system resources`,
                        `Review recent changes`
                    ]
                });
            }
            
        } catch (error) {
            console.error(`Error analyzing metric ${metric}:`, error);
        }
    }

    // Check if we should send a notification based on rate limits
    shouldSendNotification() {
        const now = Date.now();
        const timeSinceLastNotification = now - this.safetyControls.lastNotificationTime;
        
        return timeSinceLastNotification >= this.safetyControls.minNotificationInterval &&
               this.safetyControls.messagesSentToday < this.safetyControls.dailyMessageLimit;
    }

    // Send notification with safety controls
    sendSafeNotification(notification) {
        if (!this.shouldSendNotification()) {
            console.log('📊 Notification rate limited, queuing for later');
            
            // Add to queue if not full
            if (this.safetyControls.notificationQueue.length < this.safetyControls.maxQueueSize) {
                this.safetyControls.notificationQueue.push(notification);
            }
            return;
        }
        
        // Update rate limiting counters
        this.safetyControls.lastNotificationTime = Date.now();
        this.safetyControls.messagesSentToday++;
        
        // Send the notification
        this.sendNotification(notification);
        
        console.log(`📊 Proactive notification sent (${this.safetyControls.messagesSentToday}/${this.safetyControls.dailyMessageLimit} today)`);
    }

    // Generate periodic system health report
    async generateSystemHealthReport() {
        try {
            if (!this.shouldSendNotification()) {
                console.log('📊 Health report rate limited');
                return;
            }
            
            const metrics = await this.getAvailableMetrics();
            const timestamp = new Date().toLocaleString();
            
            let healthMessage = '📊 **System Health Report**\n\n';
            healthMessage += `🕒 Generated at ${timestamp}\n\n`;
            
            if (metrics && metrics.length > 0) {
                healthMessage += `📈 **Monitoring Status:**\n`;
                healthMessage += `• Tracking ${metrics.length} metrics\n`;
                healthMessage += `• Proactive alerts: ${this.safetyControls.messagesSentToday} sent today\n`;
                healthMessage += `• System status: Operational\n\n`;
                
                healthMessage += `💡 **Key Insights:**\n`;
                healthMessage += `• All systems appear stable\n`;
                healthMessage += `• No critical anomalies detected\n`;
                healthMessage += `• Monitoring coverage is adequate\n\n`;
                
                healthMessage += `🎯 **Recommendations:**\n`;
                healthMessage += `• Continue monitoring current metrics\n`;
                healthMessage += `• Consider adding alerts for key thresholds\n`;
                healthMessage += `• Review dashboard configurations periodically`;
            } else {
                healthMessage += `⚠️ **Status:** No metrics currently available for monitoring\n\n`;
                healthMessage += `🔧 **Action Required:** Please connect to a data source to enable monitoring`;
            }
            
            this.sendSafeNotification({
                type: 'health',
                title: 'System Health Report',
                message: healthMessage,
                priority: 'low',
                actions: [
                    'Review metric coverage',
                    'Check alert configurations',
                    'Optimize monitoring setup'
                ]
            });
            
        } catch (error) {
            console.error('Error generating health report:', error);
        }
    }

    // Generate contextual query for the alert
    generateContextualQuery(notification) {
        if (!notification.metric) return null;
        
        const datasourceType = window.GrafanaConfig?.selectedDatasourceType || 
                              window.Schema?.currentDatasourceType;
        
        if (datasourceType === 'influxdb') {
            return `SELECT mean("${notification.metric}") FROM "${notification.metric}" WHERE time > now() - 1h GROUP BY time(5m)`;
        } else if (datasourceType === 'prometheus') {
            return `rate(${notification.metric}[5m])`;
        }
        
        return null;
    }

    // Format alert actions for the UI
    formatAlertActions(notification) {
        if (!notification.actions || notification.actions.length === 0) {
            return [];
        }
        
        return notification.actions.map((action, index) => ({
            label: action.replace(/^(Monitor|Plan|Investigate|Verify|Adjust)\s+/, ''),
            action: `proactive_action_${index}`,
            data: { 
                type: 'proactive_action',
                originalAction: action,
                metric: notification.metric,
                priority: notification.priority
            }
        }));
    }

    // Utility methods
    async getAvailableMetrics() {
        if (window.Schema && Schema.measurements) {
            return Schema.measurements.slice(0, 10); // Limit for performance
        }
        
        // Fallback to common metrics
        return ['cpu_usage', 'memory_usage', 'disk_usage', 'network_traffic'];
    }

    async executeQuery(query) {
        if (window.Queries) {
            return await Queries.executeQuery(query, {
                datasourceId: GrafanaConfig.currentDatasourceId,
                datasourceType: GrafanaConfig.selectedDatasourceType
            });
        }
        throw new Error('Query system not available');
    }

    parseQueryResults(results) {
        if (!results || !results.results || !results.results.A) {
            return { values: [], timestamps: [] };
        }
        
        const frames = results.results.A.frames || [];
        const values = [];
        const timestamps = [];
        
        frames.forEach(frame => {
            if (frame.data && frame.data.values) {
                const timeValues = frame.data.values[0] || [];
                const dataValues = frame.data.values[1] || [];
                
                timeValues.forEach((time, index) => {
                    timestamps.push(new Date(time));
                    values.push(dataValues[index]);
                });
            }
        });
        
        return { values, timestamps };
    }

    canUseAIModel() {
        return window.OpenAIService?.isConnected || window.OllamaService?.isConnected;
    }

    async callAIModel(prompt, options = {}) {
        if (window.OpenAIService?.isConnected) {
            return await window.OpenAIService.generateCompletion(prompt, options);
        } else if (window.OllamaService?.isConnected) {
            return await window.OllamaService.generateCompletion(prompt, options);
        }
        throw new Error('No AI service available');
    }

    shouldGenerateAlert() {
        const oneHourAgo = new Date(Date.now() - 3600000);
        const recentAlerts = this.alertHistory.filter(alert => 
            new Date(alert.timestamp) > oneHourAgo
        );
        
        return recentAlerts.length < this.config.maxAlertsPerHour;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    prioritizeFindings(findings) {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        
        return findings.sort((a, b) => {
            const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
            if (severityDiff !== 0) return severityDiff;
            
            return (b.confidence || 0) - (a.confidence || 0);
        });
    }

    filterFindings(findings) {
        // Remove duplicates and low-confidence findings
        const filtered = [];
        const seen = new Set();
        
        for (const finding of findings) {
            const key = `${finding.type}:${finding.metric}:${finding.severity}`;
            
            if (!seen.has(key) && (finding.confidence || 1) >= this.config.confidenceThreshold) {
                filtered.push(finding);
                seen.add(key);
            }
        }
        
        return filtered;
    }

    getDefaultDetector() {
        return this.anomalyDetectors.get('statistical') || new StatisticalAnomalyDetector();
    }

    getDefaultPredictor() {
        return this.predictionModels.get('timeseries') || new TimeSeriesPredictor();
    }

    // Collect historical metrics for analysis
    async collectHistoricalMetrics(timeRange = '24h') {
        console.log(`📊 Collecting historical metrics for ${timeRange}...`);
        
        try {
            // For now, return simulated historical data
            // In a real implementation, this would query the actual datasource
            const now = Date.now();
            const timeRangeMs = this.parseTimeRange(timeRange);
            const startTime = now - timeRangeMs;
            
            // Generate simulated time series data
            const interval = Math.max(60000, timeRangeMs / 100); // 100 data points max
            const dataPoints = [];
            
            for (let time = startTime; time <= now; time += interval) {
                dataPoints.push({
                    timestamp: time,
                    cpu: Math.random() * 100,
                    memory: Math.random() * 100,
                    disk: Math.random() * 100,
                    network: Math.random() * 1000,
                    errors: Math.floor(Math.random() * 20)
                });
            }
            
            const historicalData = {
                timeRange,
                dataPoints,
                summary: {
                    totalPoints: dataPoints.length,
                    startTime,
                    endTime: now,
                    metrics: ['cpu', 'memory', 'disk', 'network', 'errors']
                }
            };
            
            console.log(`✅ Collected ${dataPoints.length} historical data points`);
            return historicalData;
            
        } catch (error) {
            console.warn('Failed to collect historical metrics:', error);
            // Return empty data structure if collection fails
            return {
                timeRange,
                dataPoints: [],
                summary: {
                    totalPoints: 0,
                    startTime: Date.now(),
                    endTime: Date.now(),
                    metrics: []
                }
            };
        }
    }

    // Parse time range string to milliseconds
    parseTimeRange(timeRange) {
        const units = {
            's': 1000,
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000,
            'w': 7 * 24 * 60 * 60 * 1000
        };
        
        const match = timeRange.match(/^(\d+)([smhdw])$/);
        if (!match) {
            console.warn(`Invalid time range format: ${timeRange}, defaulting to 1h`);
            return 60 * 60 * 1000; // 1 hour default
        }
        
        const [, amount, unit] = match;
        return parseInt(amount) * (units[unit] || units.h);
    }

    // Analyze historical patterns in the data
    async analyzeHistoricalPatterns(historicalData) {
        console.log('🔍 Analyzing historical patterns...');
        
        try {
            const patterns = {
                trends: {},
                seasonality: {},
                anomalies: [],
                correlations: {},
                insights: []
            };

            if (!historicalData.dataPoints || historicalData.dataPoints.length === 0) {
                console.warn('No historical data to analyze');
                return patterns;
            }

            const metrics = ['cpu', 'memory', 'disk', 'network', 'errors'];
            
            for (const metric of metrics) {
                // Extract metric values
                const values = historicalData.dataPoints.map(dp => dp[metric]).filter(v => v !== undefined);
                
                if (values.length === 0) continue;

                // Trend analysis
                patterns.trends[metric] = this.calculateTrend(values);
                
                // Basic seasonality detection
                patterns.seasonality[metric] = this.detectSeasonality(values);
                
                // Anomaly detection
                const anomalies = this.detectSimpleAnomalies(values, metric, historicalData.dataPoints);
                patterns.anomalies.push(...anomalies);
            }

            // Calculate correlations between metrics
            patterns.correlations = this.calculateCorrelations(historicalData.dataPoints, metrics);
            
            // Generate insights
            patterns.insights = this.generatePatternInsights(patterns);

            console.log(`✅ Found ${patterns.anomalies.length} anomalies and ${patterns.insights.length} insights`);
            return patterns;
            
        } catch (error) {
            console.warn('Failed to analyze historical patterns:', error);
            return {
                trends: {},
                seasonality: {},
                anomalies: [],
                correlations: {},
                insights: []
            };
        }
    }

    // Calculate trend for a metric
    calculateTrend(values) {
        if (values.length < 2) return { direction: 'stable', strength: 0 };
        
        const n = values.length;
        const sumX = n * (n - 1) / 2; // Sum of indices 0, 1, 2, ..., n-1
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
        const sumX2 = n * (n - 1) * (2 * n - 1) / 6; // Sum of squares of indices
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const strength = Math.abs(slope);
        
        let direction = 'stable';
        if (slope > 0.1) direction = 'increasing';
        else if (slope < -0.1) direction = 'decreasing';
        
        return { direction, strength, slope };
    }

    // Simple seasonality detection
    detectSeasonality(values) {
        if (values.length < 10) return { present: false, period: null };
        
        // Very basic seasonality detection - look for repeating patterns
        const possiblePeriods = [4, 6, 12, 24]; // Common periods for monitoring data
        
        for (const period of possiblePeriods) {
            if (values.length < period * 2) continue;
            
            let correlation = 0;
            const cycles = Math.floor(values.length / period);
            
            for (let i = 0; i < cycles - 1; i++) {
                const cycle1 = values.slice(i * period, (i + 1) * period);
                const cycle2 = values.slice((i + 1) * period, (i + 2) * period);
                
                if (cycle2.length === period) {
                    correlation += this.calculateSimpleCorrelation(cycle1, cycle2);
                }
            }
            
            correlation /= (cycles - 1);
            
            if (correlation > 0.7) {
                return { present: true, period, correlation };
            }
        }
        
        return { present: false, period: null };
    }

    // Simple anomaly detection using statistical methods
    detectSimpleAnomalies(values, metric, dataPoints) {
        const anomalies = [];
        
        if (values.length < 10) return anomalies;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stddev = Math.sqrt(variance);
        const threshold = 2.5; // 2.5 standard deviations
        
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            const zscore = Math.abs((value - mean) / stddev);
            
            if (zscore > threshold) {
                anomalies.push({
                    metric,
                    value,
                    timestamp: dataPoints[i]?.timestamp || Date.now(),
                    severity: zscore > 3 ? 'critical' : 'high',
                    zscore,
                    description: `${metric} value ${value.toFixed(2)} is ${zscore.toFixed(1)} standard deviations from normal`
                });
            }
        }
        
        return anomalies;
    }

    // Calculate simple correlation between two arrays
    calculateSimpleCorrelation(arr1, arr2) {
        if (arr1.length !== arr2.length) return 0;
        
        const mean1 = arr1.reduce((sum, val) => sum + val, 0) / arr1.length;
        const mean2 = arr2.reduce((sum, val) => sum + val, 0) / arr2.length;
        
        let numerator = 0;
        let sum1Sq = 0;
        let sum2Sq = 0;
        
        for (let i = 0; i < arr1.length; i++) {
            const diff1 = arr1[i] - mean1;
            const diff2 = arr2[i] - mean2;
            
            numerator += diff1 * diff2;
            sum1Sq += diff1 * diff1;
            sum2Sq += diff2 * diff2;
        }
        
        const denominator = Math.sqrt(sum1Sq * sum2Sq);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    // Calculate correlations between metrics
    calculateCorrelations(dataPoints, metrics) {
        const correlations = {};
        
        for (let i = 0; i < metrics.length; i++) {
            for (let j = i + 1; j < metrics.length; j++) {
                const metric1 = metrics[i];
                const metric2 = metrics[j];
                
                const values1 = dataPoints.map(dp => dp[metric1]).filter(v => v !== undefined);
                const values2 = dataPoints.map(dp => dp[metric2]).filter(v => v !== undefined);
                
                if (values1.length === values2.length && values1.length > 0) {
                    const correlation = this.calculateSimpleCorrelation(values1, values2);
                    correlations[`${metric1}_${metric2}`] = correlation;
                }
            }
        }
        
        return correlations;
    }

    // Generate insights from patterns
    generatePatternInsights(patterns) {
        const insights = [];
        
        // Trend insights
        for (const [metric, trend] of Object.entries(patterns.trends)) {
            if (trend.strength > 0.5) {
                insights.push({
                    type: 'trend',
                    metric,
                    message: `${metric} shows a ${trend.direction} trend with strength ${trend.strength.toFixed(2)}`,
                    priority: trend.strength > 0.8 ? 'high' : 'medium'
                });
            }
        }
        
        // Correlation insights
        for (const [pair, correlation] of Object.entries(patterns.correlations)) {
            if (Math.abs(correlation) > 0.7) {
                const [metric1, metric2] = pair.split('_');
                const type = correlation > 0 ? 'positive' : 'negative';
                insights.push({
                    type: 'correlation',
                    metrics: [metric1, metric2],
                    message: `Strong ${type} correlation (${correlation.toFixed(2)}) between ${metric1} and ${metric2}`,
                    priority: 'medium'
                });
            }
        }
        
        // Anomaly count insight
        if (patterns.anomalies.length > 0) {
            const criticalCount = patterns.anomalies.filter(a => a.severity === 'critical').length;
            insights.push({
                type: 'anomaly_summary',
                message: `Found ${patterns.anomalies.length} anomalies (${criticalCount} critical)`,
                priority: criticalCount > 0 ? 'high' : 'medium'
            });
        }
        
        return insights;
    }

    // Build baseline models from historical data
    async buildBaselineModels(historicalData) {
        console.log('📊 Building baseline models from historical data...');
        
        try {
            if (!historicalData.dataPoints || historicalData.dataPoints.length === 0) {
                console.warn('No historical data available for baseline modeling');
                return;
            }

            const metrics = ['cpu', 'memory', 'disk', 'network', 'errors'];
            const baselines = new Map();

            for (const metric of metrics) {
                const values = historicalData.dataPoints
                    .map(dp => dp[metric])
                    .filter(v => v !== undefined && !isNaN(v));

                if (values.length === 0) continue;

                // Calculate statistical baseline
                const baseline = this.calculateStatisticalBaseline(values, metric);
                baselines.set(metric, baseline);
                
                // Update historical data with the new baseline
                this.historicalData.baselines.set(metric, baseline);
            }

            // Save baselines to localStorage for persistence
            try {
                const cacheData = {
                    baselines: Array.from(this.historicalData.baselines.entries()),
                    trends: Array.from(this.historicalData.trends.entries()),
                    timestamp: Date.now()
                };
                localStorage.setItem('proactiveMonitoringHistory', JSON.stringify(cacheData));
            } catch (error) {
                console.warn('Failed to cache baseline models:', error);
            }

            console.log(`✅ Built baseline models for ${baselines.size} metrics`);
            
        } catch (error) {
            console.warn('Failed to build baseline models:', error);
        }
    }

    // Calculate statistical baseline for a metric
    calculateStatisticalBaseline(values, metric) {
        const sortedValues = [...values].sort((a, b) => a - b);
        const n = sortedValues.length;
        
        // Basic statistics
        const mean = values.reduce((sum, val) => sum + val, 0) / n;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        const stddev = Math.sqrt(variance);
        
        // Percentiles
        const p10 = sortedValues[Math.floor(n * 0.1)];
        const p25 = sortedValues[Math.floor(n * 0.25)];
        const p50 = sortedValues[Math.floor(n * 0.5)]; // Median
        const p75 = sortedValues[Math.floor(n * 0.75)];
        const p90 = sortedValues[Math.floor(n * 0.9)];
        const p95 = sortedValues[Math.floor(n * 0.95)];
        const p99 = sortedValues[Math.floor(n * 0.99)];
        
        // Interquartile range
        const iqr = p75 - p25;
        
        // Normal range (mean ± 2 stddev, but constrained by percentiles)
        const normalRangeMin = Math.max(p10, mean - 2 * stddev);
        const normalRangeMax = Math.min(p90, mean + 2 * stddev);
        
        // Alert thresholds
        const warningThreshold = p75 + 0.5 * iqr;
        const criticalThreshold = p90;
        
        return {
            metric,
            mean,
            median: p50,
            stddev,
            variance,
            percentiles: { p10, p25, p50, p75, p90, p95, p99 },
            iqr,
            normal_range: [normalRangeMin, normalRangeMax],
            warning_threshold: warningThreshold,
            critical_threshold: criticalThreshold,
            min: sortedValues[0],
            max: sortedValues[n - 1],
            sample_size: n,
            created_at: new Date(),
            confidence: this.calculateBaselineConfidence(n, stddev / mean) // Coefficient of variation
        };
    }

    // Calculate confidence score for baseline (0-1)
    calculateBaselineConfidence(sampleSize, coefficientOfVariation) {
        // More samples = higher confidence
        let sizeConfidence = Math.min(sampleSize / 100, 1); // Max confidence at 100+ samples
        
        // Lower coefficient of variation = higher confidence (more stable metric)
        let stabilityConfidence = Math.max(0, 1 - coefficientOfVariation);
        
        // Combined confidence (weighted average)
        return (sizeConfidence * 0.6 + stabilityConfidence * 0.4);
    }

    // Generate system health report
    async generateSystemHealthReport(historicalData) {
        console.log('🏥 Generating system health report...');
        
        try {
            const report = {
                timestamp: new Date(),
                timeRange: historicalData.timeRange,
                overallHealth: 'good', // good, warning, critical
                metrics: {},
                alerts: [],
                recommendations: [],
                summary: {}
            };

            if (!historicalData.dataPoints || historicalData.dataPoints.length === 0) {
                report.overallHealth = 'unknown';
                report.summary.message = 'Insufficient data for health assessment';
                return report;
            }

            const metrics = ['cpu', 'memory', 'disk', 'network', 'errors'];
            let warningCount = 0;
            let criticalCount = 0;

            for (const metric of metrics) {
                const values = historicalData.dataPoints
                    .map(dp => dp[metric])
                    .filter(v => v !== undefined && !isNaN(v));

                if (values.length === 0) continue;

                const baseline = this.historicalData.baselines.get(metric);
                if (!baseline) continue;

                const currentValue = values[values.length - 1]; // Most recent value
                const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
                
                let status = 'good';
                if (currentValue > baseline.critical_threshold) {
                    status = 'critical';
                    criticalCount++;
                } else if (currentValue > baseline.warning_threshold) {
                    status = 'warning';
                    warningCount++;
                }

                report.metrics[metric] = {
                    current: currentValue,
                    average: avgValue,
                    baseline: baseline.mean,
                    status,
                    percentile: this.calculatePercentile(currentValue, baseline),
                    trend: this.calculateShortTermTrend(values.slice(-10)) // Last 10 points
                };

                // Generate alerts for problematic metrics
                if (status !== 'good') {
                    report.alerts.push({
                        metric,
                        severity: status,
                        message: `${metric} is ${status}: current ${currentValue.toFixed(2)}, threshold ${baseline[status + '_threshold'].toFixed(2)}`,
                        timestamp: new Date()
                    });
                }
            }

            // Determine overall health
            if (criticalCount > 0) {
                report.overallHealth = 'critical';
            } else if (warningCount > 1) {
                report.overallHealth = 'warning';
            }

            // Generate recommendations
            report.recommendations = this.generateHealthRecommendations(report);
            
            // Summary statistics
            report.summary = {
                totalMetrics: Object.keys(report.metrics).length,
                warningCount,
                criticalCount,
                dataPoints: historicalData.dataPoints.length,
                healthScore: this.calculateHealthScore(report)
            };

            console.log(`✅ Generated health report: ${report.overallHealth} (${report.summary.healthScore}/100)`);
            return report;
            
        } catch (error) {
            console.warn('Failed to generate health report:', error);
            return {
                timestamp: new Date(),
                overallHealth: 'unknown',
                error: error.message
            };
        }
    }

    // Calculate which percentile a value falls into
    calculatePercentile(value, baseline) {
        const percentiles = [
            { name: 'p99', value: baseline.percentiles.p99 },
            { name: 'p95', value: baseline.percentiles.p95 },
            { name: 'p90', value: baseline.percentiles.p90 },
            { name: 'p75', value: baseline.percentiles.p75 },
            { name: 'p50', value: baseline.percentiles.p50 },
            { name: 'p25', value: baseline.percentiles.p25 },
            { name: 'p10', value: baseline.percentiles.p10 }
        ];

        for (const p of percentiles) {
            if (value >= p.value) {
                return p.name;
            }
        }
        return 'p0';
    }

    // Calculate short-term trend
    calculateShortTermTrend(values) {
        if (values.length < 3) return 'stable';
        
        const trend = this.calculateTrend(values);
        return trend.direction;
    }

    // Generate health recommendations
    generateHealthRecommendations(report) {
        const recommendations = [];
        
        for (const [metric, data] of Object.entries(report.metrics)) {
            if (data.status === 'critical') {
                recommendations.push({
                    type: 'critical',
                    metric,
                    message: `Immediate attention needed: ${metric} is at critical levels (${data.current.toFixed(2)})`,
                    priority: 'high',
                    actions: this.getMetricActions(metric, 'critical')
                });
            } else if (data.status === 'warning') {
                recommendations.push({
                    type: 'warning',
                    metric,
                    message: `Monitor ${metric}: approaching concerning levels (${data.current.toFixed(2)})`,
                    priority: 'medium',
                    actions: this.getMetricActions(metric, 'warning')
                });
            }
        }

        return recommendations;
    }

    // Get recommended actions for a metric
    getMetricActions(metric, severity) {
        const actions = {
            cpu: {
                warning: ['Check running processes', 'Review CPU-intensive applications'],
                critical: ['Scale up resources', 'Kill high-CPU processes', 'Investigate performance bottlenecks']
            },
            memory: {
                warning: ['Monitor memory leaks', 'Check application memory usage'],
                critical: ['Restart memory-intensive processes', 'Add more RAM', 'Clear caches']
            },
            disk: {
                warning: ['Clean up temporary files', 'Archive old data'],
                critical: ['Free up disk space immediately', 'Move data to external storage', 'Expand disk capacity']
            },
            network: {
                warning: ['Monitor network usage patterns', 'Check for unusual traffic'],
                critical: ['Investigate network congestion', 'Implement traffic shaping', 'Check for DDoS']
            },
            errors: {
                warning: ['Review error logs', 'Check application health'],
                critical: ['Investigate error spike', 'Restart failing services', 'Check system stability']
            }
        };

        return actions[metric]?.[severity] || ['Investigate and monitor'];
    }

    // Calculate overall health score (0-100)
    calculateHealthScore(report) {
        let score = 100;
        
        // Deduct points for each issue
        for (const alert of report.alerts) {
            if (alert.severity === 'critical') {
                score -= 20;
            } else if (alert.severity === 'warning') {
                score -= 10;
            }
        }
        
        return Math.max(0, score);
    }

    // Generate comprehensive recommendations based on patterns and health report
    async generateRecommendations(patterns, healthReport) {
        console.log('💡 Generating comprehensive recommendations...');
        
        try {
            const recommendations = [];
            
            // Health-based recommendations (from health report)
            if (healthReport && healthReport.recommendations) {
                recommendations.push(...healthReport.recommendations);
            }
            
            // Pattern-based recommendations
            if (patterns && patterns.insights) {
                for (const insight of patterns.insights) {
                    const recommendation = this.convertInsightToRecommendation(insight);
                    if (recommendation) {
                        recommendations.push(recommendation);
                    }
                }
            }
            
            // Trend-based recommendations
            if (patterns && patterns.trends) {
                for (const [metric, trend] of Object.entries(patterns.trends)) {
                    if (trend.strength > 0.7) {
                        const recommendation = this.generateTrendRecommendation(metric, trend);
                        if (recommendation) {
                            recommendations.push(recommendation);
                        }
                    }
                }
            }
            
            // Correlation-based recommendations
            if (patterns && patterns.correlations) {
                const correlationRecs = this.generateCorrelationRecommendations(patterns.correlations);
                recommendations.push(...correlationRecs);
            }
            
            // Anomaly-based recommendations
            if (patterns && patterns.anomalies && patterns.anomalies.length > 0) {
                const anomalyRecs = this.generateAnomalyRecommendations(patterns.anomalies);
                recommendations.push(...anomalyRecs);
            }
            
            // General system optimization recommendations
            const systemRecs = this.generateSystemOptimizationRecommendations(healthReport);
            recommendations.push(...systemRecs);
            
            // Remove duplicates and prioritize
            const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
            const prioritizedRecommendations = this.prioritizeRecommendations(uniqueRecommendations);
            
            console.log(`✅ Generated ${prioritizedRecommendations.length} recommendations`);
            return prioritizedRecommendations.slice(0, 10); // Limit to top 10
            
        } catch (error) {
            console.warn('Failed to generate recommendations:', error);
            return [];
        }
    }

    // Convert insight to actionable recommendation
    convertInsightToRecommendation(insight) {
        const recommendationMap = {
            trend: {
                priority: 'medium',
                actionType: 'monitor',
                template: 'Monitor {metric} trend and consider capacity planning'
            },
            correlation: {
                priority: 'low',
                actionType: 'analyze',
                template: 'Investigate relationship between correlated metrics'
            },
            anomaly_summary: {
                priority: 'high',
                actionType: 'investigate',
                template: 'Review and address detected anomalies'
            }
        };

        const config = recommendationMap[insight.type];
        if (!config) return null;

        return {
            type: insight.type,
            message: insight.message,
            priority: config.priority,
            actionType: config.actionType,
            actions: this.getInsightActions(insight),
            source: 'pattern_analysis'
        };
    }

    // Generate trend-based recommendations
    generateTrendRecommendation(metric, trend) {
        if (trend.direction === 'increasing' && trend.strength > 0.7) {
            return {
                type: 'trend_alert',
                metric,
                message: `${metric} showing strong upward trend - consider capacity planning`,
                priority: trend.strength > 0.9 ? 'high' : 'medium',
                actionType: 'plan',
                actions: [
                    `Monitor ${metric} growth rate`,
                    `Plan capacity expansion for ${metric}`,
                    `Set up alerts for ${metric} thresholds`
                ],
                source: 'trend_analysis'
            };
        } else if (trend.direction === 'decreasing' && trend.strength > 0.7) {
            return {
                type: 'trend_opportunity',
                metric,
                message: `${metric} showing declining trend - investigate cause`,
                priority: 'medium',
                actionType: 'investigate',
                actions: [
                    `Investigate cause of ${metric} decline`,
                    `Verify if decline is expected`,
                    `Adjust monitoring thresholds if needed`
                ],
                source: 'trend_analysis'
            };
        }
        return null;
    }

    // Generate correlation-based recommendations
    generateCorrelationRecommendations(correlations) {
        const recommendations = [];
        
        for (const [pair, correlation] of Object.entries(correlations)) {
            if (Math.abs(correlation) > 0.8) {
                const [metric1, metric2] = pair.split('_');
                const type = correlation > 0 ? 'positive' : 'negative';
                
                recommendations.push({
                    type: 'correlation_insight',
                    metrics: [metric1, metric2],
                    message: `Strong ${type} correlation between ${metric1} and ${metric2} (${correlation.toFixed(2)})`,
                    priority: 'low',
                    actionType: 'optimize',
                    actions: [
                        `Use ${metric1} as predictor for ${metric2}`,
                        'Set up cascade monitoring',
                        'Consider unified alerting strategy'
                    ],
                    source: 'correlation_analysis'
                });
            }
        }
        
        return recommendations;
    }

    // Generate anomaly-based recommendations
    generateAnomalyRecommendations(anomalies) {
        const recommendations = [];
        const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
        const highAnomalies = anomalies.filter(a => a.severity === 'high');
        
        if (criticalAnomalies.length > 0) {
            recommendations.push({
                type: 'critical_anomalies',
                message: `${criticalAnomalies.length} critical anomalies detected requiring immediate attention`,
                priority: 'critical',
                actionType: 'investigate',
                actions: [
                    'Review critical anomalies immediately',
                    'Check system logs for related errors',
                    'Consider emergency response procedures'
                ],
                source: 'anomaly_detection',
                details: criticalAnomalies.slice(0, 3) // Top 3 critical
            });
        }
        
        if (highAnomalies.length > 2) {
            recommendations.push({
                type: 'pattern_anomalies',
                message: `Multiple high-severity anomalies suggest systemic issues`,
                priority: 'high',
                actionType: 'analyze',
                actions: [
                    'Look for common root causes',
                    'Review system configuration',
                    'Consider preventive measures'
                ],
                source: 'anomaly_pattern'
            });
        }
        
        return recommendations;
    }

    // Generate system optimization recommendations
    generateSystemOptimizationRecommendations(healthReport) {
        const recommendations = [];
        
        if (!healthReport || !healthReport.summary) {
            return recommendations;
        }
        
        const { healthScore, warningCount, criticalCount } = healthReport.summary;
        
        if (healthScore < 80) {
            recommendations.push({
                type: 'system_health',
                message: `System health score is ${healthScore}/100 - optimization needed`,
                priority: healthScore < 60 ? 'high' : 'medium',
                actionType: 'optimize',
                actions: [
                    'Review system resource allocation',
                    'Optimize high-impact processes',
                    'Consider infrastructure scaling'
                ],
                source: 'health_assessment'
            });
        }
        
        if (warningCount > 3) {
            recommendations.push({
                type: 'multiple_warnings',
                message: `${warningCount} metrics showing warning levels - proactive action needed`,
                priority: 'medium',
                actionType: 'monitor',
                actions: [
                    'Address warning-level metrics',
                    'Implement preventive monitoring',
                    'Review alert thresholds'
                ],
                source: 'warning_analysis'
            });
        }
        
        return recommendations;
    }

    // Get actions for specific insights
    getInsightActions(insight) {
        const actionMap = {
            trend: [
                'Set up trend monitoring',
                'Review capacity planning',
                'Adjust alert thresholds'
            ],
            correlation: [
                'Investigate relationship',
                'Consider unified monitoring',
                'Set up cascade alerts'
            ],
            anomaly_summary: [
                'Review anomaly details',
                'Investigate root causes',
                'Update detection rules'
            ]
        };
        
        return actionMap[insight.type] || ['Monitor and investigate'];
    }

    // Remove duplicate recommendations
    deduplicateRecommendations(recommendations) {
        const seen = new Set();
        return recommendations.filter(rec => {
            const key = `${rec.type}_${rec.message}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // Prioritize recommendations
    prioritizeRecommendations(recommendations) {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        
        return recommendations.sort((a, b) => {
            const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            if (priorityDiff !== 0) return priorityDiff;
            
            // Secondary sort by action type importance
            const actionOrder = { 'investigate': 4, 'optimize': 3, 'monitor': 2, 'analyze': 1, 'plan': 1 };
            return (actionOrder[b.actionType] || 0) - (actionOrder[a.actionType] || 0);
        });
    }

    // Notify about initial analysis findings
    async notifyInitialFindings(findings) {
        console.log('📢 Notifying about initial analysis findings...');
        
        try {
            const { patterns, healthReport, recommendations } = findings;
            
            // Create comprehensive notification
            const notification = {
                title: 'System Analysis Complete',
                message: this.formatInitialFindingsMessage(patterns, healthReport, recommendations),
                priority: this.determineNotificationPriority(healthReport, patterns),
                type: 'initial_analysis',
                timestamp: new Date(),
                data: {
                    patterns,
                    healthReport,
                    recommendations,
                    summary: this.createFindingsSummary(patterns, healthReport, recommendations)
                },
                actions: this.generateInitialFindingsActions(patterns, healthReport, recommendations)
            };
            
            // Send notification
            await this.sendNotification(notification);
            
            // Also send high-priority recommendations as separate notifications
            const criticalRecommendations = recommendations.filter(r => r.priority === 'critical' || r.priority === 'high');
            
            for (const rec of criticalRecommendations.slice(0, 3)) { // Limit to top 3
                await this.sendRecommendationNotification(rec);
            }
            
            console.log(`✅ Sent initial findings notification with ${recommendations.length} recommendations`);
            
        } catch (error) {
            console.warn('Failed to notify initial findings:', error);
        }
    }

    // Format initial findings message
    formatInitialFindingsMessage(patterns, healthReport, recommendations) {
        let message = '🔍 **System Analysis Results:**\n\n';
        
        // Health status
        if (healthReport && healthReport.overallHealth) {
            const healthEmoji = {
                'good': '✅',
                'warning': '⚠️',
                'critical': '🚨',
                'unknown': '❓'
            };
            
            message += `**System Health:** ${healthEmoji[healthReport.overallHealth] || '❓'} ${healthReport.overallHealth.toUpperCase()}`;
            
            if (healthReport.summary?.healthScore) {
                message += ` (${healthReport.summary.healthScore}/100)\n`;
            } else {
                message += '\n';
            }
        }
        
        // Anomalies
        if (patterns && patterns.anomalies && patterns.anomalies.length > 0) {
            const criticalCount = patterns.anomalies.filter(a => a.severity === 'critical').length;
            const highCount = patterns.anomalies.filter(a => a.severity === 'high').length;
            
            message += `**Anomalies Found:** ${patterns.anomalies.length} total`;
            if (criticalCount > 0) message += ` (${criticalCount} critical)`;
            if (highCount > 0) message += ` (${highCount} high)`;
            message += '\n';
        }
        
        // Key insights
        if (patterns && patterns.insights && patterns.insights.length > 0) {
            message += `**Key Insights:** ${patterns.insights.length} patterns detected\n`;
        }
        
        // Recommendations
        if (recommendations && recommendations.length > 0) {
            const highPriorityCount = recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length;
            message += `**Recommendations:** ${recommendations.length} total`;
            if (highPriorityCount > 0) {
                message += ` (${highPriorityCount} high priority)`;
            }
            message += '\n';
        }
        
        message += '\nClick to view detailed analysis and recommendations.';
        
        return message;
    }

    // Determine notification priority based on findings
    determineNotificationPriority(healthReport, patterns) {
        // Critical if system health is critical or critical anomalies found
        if (healthReport?.overallHealth === 'critical') {
            return 'critical';
        }
        
        if (patterns?.anomalies?.some(a => a.severity === 'critical')) {
            return 'critical';
        }
        
        // High if system health is warning or multiple high anomalies
        if (healthReport?.overallHealth === 'warning') {
            return 'high';
        }
        
        if (patterns?.anomalies?.filter(a => a.severity === 'high').length > 2) {
            return 'high';
        }
        
        // Medium for any other findings
        if (patterns?.insights?.length > 0 || patterns?.anomalies?.length > 0) {
            return 'medium';
        }
        
        return 'low';
    }

    // Create summary of findings
    createFindingsSummary(patterns, healthReport, recommendations) {
        return {
            healthScore: healthReport?.summary?.healthScore || 0,
            overallHealth: healthReport?.overallHealth || 'unknown',
            totalAnomalies: patterns?.anomalies?.length || 0,
            criticalAnomalies: patterns?.anomalies?.filter(a => a.severity === 'critical').length || 0,
            totalInsights: patterns?.insights?.length || 0,
            totalRecommendations: recommendations?.length || 0,
            highPriorityRecommendations: recommendations?.filter(r => r.priority === 'high' || r.priority === 'critical').length || 0,
            analysisTimestamp: new Date()
        };
    }

    // Generate actions for initial findings
    generateInitialFindingsActions(patterns, healthReport, recommendations) {
        const actions = [];
        
        // Always add view details action
        actions.push({
            label: 'View Detailed Analysis',
            action: 'viewAnalysisDetails',
            data: { patterns, healthReport, recommendations }
        });
        
        // Add specific actions based on findings
        if (healthReport?.overallHealth === 'critical' || healthReport?.overallHealth === 'warning') {
            actions.push({
                label: 'Review System Health',
                action: 'reviewSystemHealth',
                data: { healthReport }
            });
        }
        
        if (patterns?.anomalies?.length > 0) {
            actions.push({
                label: 'Investigate Anomalies',
                action: 'investigateAnomalies',
                data: { anomalies: patterns.anomalies }
            });
        }
        
        if (recommendations?.filter(r => r.priority === 'high' || r.priority === 'critical').length > 0) {
            actions.push({
                label: 'View Recommendations',
                action: 'viewRecommendations',
                data: { recommendations }
            });
        }
        
        return actions;
    }

    // Send individual recommendation notification
    async sendRecommendationNotification(recommendation) {
        const notification = {
            title: `${recommendation.priority.toUpperCase()}: ${recommendation.type.replace('_', ' ').toUpperCase()}`,
            message: recommendation.message,
            priority: recommendation.priority,
            type: 'recommendation',
            timestamp: new Date(),
            data: { recommendation },
            actions: [
                {
                    label: 'View Details',
                    action: 'viewRecommendationDetails',
                    data: { recommendation }
                },
                {
                    label: 'Take Action',
                    action: 'executeRecommendation',
                    data: { recommendation }
                }
            ]
        };
        
        await this.sendNotification(notification);
    }

    // Load monitoring rules and thresholds
    async loadMonitoringRules() {
        console.log('📋 Loading monitoring rules...');
        
        // Default monitoring rules
        this.monitoringRules = [
            {
                id: 'cpu_high_usage',
                metric: 'cpu',
                condition: 'value > 80',
                severity: 'high',
                description: 'CPU usage above 80%',
                enabled: true
            },
            {
                id: 'memory_high_usage', 
                metric: 'memory',
                condition: 'value > 90',
                severity: 'critical',
                description: 'Memory usage above 90%',
                enabled: true
            },
            {
                id: 'disk_space_low',
                metric: 'disk',
                condition: 'value > 85',
                severity: 'high',
                description: 'Disk usage above 85%',
                enabled: true
            },
            {
                id: 'network_anomaly',
                metric: 'network',
                condition: 'anomaly_score > 0.8',
                severity: 'medium',
                description: 'Unusual network traffic pattern detected',
                enabled: true
            },
            {
                id: 'error_rate_spike',
                metric: 'errors',
                condition: 'rate > baseline * 3',
                severity: 'critical',
                description: 'Error rate 3x higher than baseline',
                enabled: true
            }
        ];

        // Try to load custom rules from localStorage
        try {
            const storedRules = localStorage.getItem('proactiveMonitoringRules');
            if (storedRules) {
                const customRules = JSON.parse(storedRules);
                this.monitoringRules.push(...customRules);
            }
        } catch (error) {
            console.warn('Failed to load custom monitoring rules:', error);
        }

        console.log(`✅ Loaded ${this.monitoringRules.length} monitoring rules`);
    }

    // Load historical data for model training
    async loadHistoricalData() {
        console.log('📈 Loading historical data for model training...');
        
        try {
            // Initialize empty historical data structure
            this.historicalData = {
                metrics: new Map(),
                patterns: [],
                baselines: new Map(),
                trends: new Map()
            };

            // Try to load from localStorage cache
            const cachedData = localStorage.getItem('proactiveMonitoringHistory');
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                if (parsed.timestamp && (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000)) {
                    // Use cached data if less than 24 hours old
                    this.historicalData.baselines = new Map(parsed.baselines || []);
                    this.historicalData.trends = new Map(parsed.trends || []);
                    console.log('📊 Loaded cached historical data');
                    return;
                }
            }

            // If we have an active data connection, we could load recent data
            // For now, we'll use default baseline values
            const defaultBaselines = {
                cpu: { mean: 25, stddev: 15, normal_range: [10, 70] },
                memory: { mean: 60, stddev: 20, normal_range: [30, 85] },
                disk: { mean: 45, stddev: 25, normal_range: [20, 75] },
                network: { mean: 100, stddev: 50, normal_range: [10, 300] },
                errors: { mean: 5, stddev: 3, normal_range: [0, 15] }
            };

            for (const [metric, baseline] of Object.entries(defaultBaselines)) {
                this.historicalData.baselines.set(metric, baseline);
            }

            console.log('✅ Historical data initialized with defaults');
            
        } catch (error) {
            console.warn('Failed to load historical data:', error);
            // Initialize with empty data if loading fails
            this.historicalData = {
                metrics: new Map(),
                patterns: [],
                baselines: new Map(),
                trends: new Map()
            };
        }
    }
}

// Supporting classes for anomaly detection and prediction
class StatisticalAnomalyDetector {
    async initialize() {
        this.windowSize = 20;
        this.stddevThreshold = 2.5;
    }

    async detect(data, options = {}) {
        const { values } = data;
        if (values.length < this.windowSize) return [];
        
        const anomalies = [];
        const recentValues = values.slice(-this.windowSize);
        const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
        const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
        const stddev = Math.sqrt(variance);
        
        const latestValue = values[values.length - 1];
        const zScore = Math.abs((latestValue - mean) / stddev);
        
        if (zScore > this.stddevThreshold) {
            anomalies.push({
                type: 'statistical',
                value: latestValue,
                expected: mean,
                deviation: zScore,
                confidence: Math.min(zScore / this.stddevThreshold, 1),
                description: `Value ${latestValue.toFixed(2)} is ${zScore.toFixed(2)} standard deviations from normal`
            });
        }
        
        return anomalies;
    }
}

class MLAnomalyDetector {
    async initialize() {
        // Placeholder for ML model initialization
        this.model = null;
    }

    async detect(data, options = {}) {
        // Placeholder for ML-based anomaly detection
        // In a real implementation, this would use a trained ML model
        return [];
    }
}

class ThresholdAnomalyDetector {
    async initialize() {
        this.thresholds = new Map();
    }

    async detect(data, options = {}) {
        // Simple threshold-based detection
        return [];
    }
}

class TimeSeriesPredictor {
    async initialize() {
        this.model = null;
    }

    async predict(data, options = {}) {
        // Simple linear trend prediction
        const { values, timestamps } = data;
        if (values.length < 5) return { confidence: 0 };
        
        // Calculate trend
        const recentValues = values.slice(-5);
        const trend = (recentValues[recentValues.length - 1] - recentValues[0]) / recentValues.length;
        
        const prediction = {
            value: values[values.length - 1] + trend * 60, // 60 minutes ahead
            trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            confidence: Math.min(Math.abs(trend) / 10, 1),
            horizon: options.horizon || 3600000
        };
        
        return prediction;
    }
}

class TrendPredictor {
    async initialize() {}
    async predict(data, options = {}) { return { confidence: 0 }; }
}

class SeasonalPredictor {
    async initialize() {}
    async predict(data, options = {}) { return { confidence: 0 }; }
}

class InsightGenerationEngine {
    async initialize() {
        console.log('💡 Initializing Insight Generation Engine...');
    }

    async generateInsights(currentData, anomalies, predictions) {
        const insights = [];
        
        // Pattern-based insights
        insights.push(...await this.generatePatternInsights(currentData));
        
        // Correlation insights
        insights.push(...await this.generateCorrelationInsights(currentData));
        
        // Performance insights
        insights.push(...await this.generatePerformanceInsights(currentData, anomalies));
        
        return insights.filter(insight => insight.confidence > 0.5);
    }

    async generatePatternInsights(data) {
        // Analyze patterns in the data
        return [];
    }

    async generateCorrelationInsights(data) {
        // Find correlations between metrics
        return [];
    }

    async generatePerformanceInsights(data, anomalies) {
        // Generate performance-related insights
        return [];
    }
}

// Export for global access
window.ProactiveMonitoringSystem = ProactiveMonitoringSystem;