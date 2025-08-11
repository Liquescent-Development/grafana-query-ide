// Intelligent Query Generation System
// Advanced natural language to query translation with optimization

class IntelligentQueryGenerator {
    constructor() {
        this.queryTemplates = new Map();
        this.optimizationRules = [];
        this.queryPatterns = new Map();
        this.performanceStats = new Map();
        this.userPreferences = {};
        
        // Query complexity scoring
        this.complexityWeights = {
            joins: 5,
            subqueries: 4,
            functions: 2,
            filters: 1,
            grouping: 2,
            sorting: 1
        };
        
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🔧 Initializing Intelligent Query Generator...');
        
        try {
            await this.loadQueryTemplates();
            await this.loadOptimizationRules();
            await this.loadQueryPatterns();
            await this.loadUserPreferences();
            
            this.initialized = true;
            console.log('✅ Query Generator initialized with', this.queryTemplates.size, 'templates');
            
        } catch (error) {
            console.error('❌ Query Generator initialization failed:', error);
            throw error;
        }
    }

    // Main entry point for natural language to query translation
    async translateNaturalLanguageToQuery(naturalLanguage, context = {}) {
        console.log('🔤 Translating natural language:', naturalLanguage);
        
        // Enhanced semantic analysis
        const analysis = await this.analyzeQueryIntent(naturalLanguage, context);
        
        // Generate multiple query candidates
        const candidates = await this.generateQueryCandidates(analysis);
        
        // Optimize each candidate
        const optimizedCandidates = await Promise.all(
            candidates.map(candidate => this.optimizeQuery(candidate, context))
        );
        
        // Rank candidates by performance and accuracy
        const rankedCandidates = this.rankQueryCandidates(optimizedCandidates, analysis);
        
        // Select best query
        const bestQuery = rankedCandidates[0];
        
        // Generate explanation
        const explanation = await this.generateQueryExplanation(bestQuery, analysis);
        
        const result = {
            originalQuery: naturalLanguage,
            generatedQuery: bestQuery.query,
            queryType: bestQuery.type,
            database: bestQuery.database,
            confidence: bestQuery.confidence,
            explanation,
            alternatives: rankedCandidates.slice(1, 3),
            optimizations: bestQuery.optimizations,
            estimatedPerformance: bestQuery.performance,
            complexity: bestQuery.complexity
        };
        
        console.log('📝 Generated query:', result);
        return result;
    }

    // Analyze user intent and extract query components
    async analyzeQueryIntent(naturalLanguage, context) {
        const analysis = {
            originalText: naturalLanguage,
            normalizedText: this.normalizeQueryText(naturalLanguage),
            tokens: this.tokenizeForQuery(naturalLanguage),
            
            // Query components
            intent: null,
            measurements: [],
            fields: [],
            tags: {},
            timeRange: null,
            aggregations: [],
            filters: [],
            groupings: [],
            sorting: null,
            
            // Semantic features
            complexity: 'simple',
            urgency: 'normal',
            analyticalType: null,
            
            // Context
            currentDatasource: context.datasource || GrafanaConfig.currentDatasourceName,
            availableMetrics: context.availableMetrics || [],
            userHistory: context.userHistory || []
        };

        // Use AI model for sophisticated intent analysis
        if (this.canUseAIModel()) {
            const aiAnalysis = await this.performAIIntentAnalysis(naturalLanguage, context);
            Object.assign(analysis, aiAnalysis);
        } else {
            // Fallback to pattern-based analysis
            this.performPatternBasedAnalysis(analysis);
        }

        // Enhanced entity extraction
        await this.extractQueryEntities(analysis);
        
        // Determine query type and database
        this.determineQueryTypeAndDatabase(analysis);
        
        console.log('🧠 Query intent analysis:', analysis);
        return analysis;
    }

    // AI-powered intent analysis
    async performAIIntentAnalysis(naturalLanguage, context) {
        const prompt = this.buildIntentAnalysisPrompt(naturalLanguage, context);
        
        try {
            const aiResponse = await this.callAIModel(prompt, {
                temperature: 0.1, // Low temperature for consistent parsing
                maxTokens: 500
            });
            
            return JSON.parse(aiResponse);
        } catch (error) {
            console.warn('AI intent analysis failed, using fallback:', error);
            return {};
        }
    }

    buildIntentAnalysisPrompt(naturalLanguage, context) {
        return `You are an expert in time series databases and query languages. Analyze this natural language query and extract structured information.

Natural Language Query: "${naturalLanguage}"

Available Context:
- Current Datasource: ${context.datasource || 'Unknown'}
- Available Metrics: ${(context.availableMetrics || []).slice(0, 10).join(', ')}
- Database Type: ${GrafanaConfig.selectedDatasourceType || 'Unknown'}

Extract and return a JSON object with:
{
  "intent": "monitoring|anomaly_detection|trend_analysis|comparison|exploration",
  "measurements": ["measurement_name"],
  "fields": ["field_name"],
  "tags": {"tag_key": "tag_value"},
  "timeRange": "1h|24h|7d|etc",
  "aggregations": ["mean|sum|max|min|count"],
  "filters": [{"field": "field_name", "operator": ">|<|=", "value": "value"}],
  "groupings": ["time(5m)|tag_key"],
  "sorting": {"field": "field_name", "direction": "asc|desc"},
  "complexity": "simple|moderate|complex",
  "urgency": "low|normal|high",
  "analyticalType": "realtime|historical|predictive"
}

Only include fields that are clearly indicated in the natural language query. Use null for unclear fields.`;
    }

    // Generate multiple query candidates
    async generateQueryCandidates(analysis) {
        const candidates = [];
        
        // Template-based generation
        const templateCandidates = await this.generateFromTemplates(analysis);
        candidates.push(...templateCandidates);
        
        // AI-powered generation
        if (this.canUseAIModel()) {
            const aiCandidates = await this.generateWithAI(analysis);
            candidates.push(...aiCandidates);
        }
        
        // Pattern-based generation
        const patternCandidates = await this.generateFromPatterns(analysis);
        candidates.push(...patternCandidates);
        
        return candidates;
    }

    // Template-based query generation
    async generateFromTemplates(analysis) {
        const candidates = [];
        const relevantTemplates = this.findRelevantTemplates(analysis);
        
        for (const template of relevantTemplates) {
            try {
                const query = await this.instantiateTemplate(template, analysis);
                candidates.push({
                    query,
                    type: template.type,
                    database: template.database,
                    confidence: template.confidence * 0.8, // Template-based queries get high confidence
                    source: 'template',
                    templateId: template.id
                });
            } catch (error) {
                console.warn('Template instantiation failed:', error);
            }
        }
        
        return candidates;
    }

    // AI-powered query generation
    async generateWithAI(analysis) {
        const prompt = this.buildQueryGenerationPrompt(analysis);
        
        try {
            const aiResponse = await this.callAIModel(prompt, {
                temperature: 0.2,
                maxTokens: 800
            });
            
            const queries = this.parseAIQueryResponse(aiResponse);
            return queries.map(query => ({
                ...query,
                confidence: query.confidence * 0.9, // AI queries get high confidence
                source: 'ai'
            }));
            
        } catch (error) {
            console.warn('AI query generation failed:', error);
            return [];
        }
    }

    buildQueryGenerationPrompt(analysis) {
        const dbType = analysis.currentDatasource?.includes('influx') ? 'InfluxQL' : 'PromQL';
        
        return `Generate optimized ${dbType} queries for this analysis:

Intent: ${analysis.intent}
Measurements: ${analysis.measurements.join(', ')}
Fields: ${analysis.fields.join(', ')}
Time Range: ${analysis.timeRange}
Aggregations: ${analysis.aggregations.join(', ')}
Filters: ${JSON.stringify(analysis.filters)}

Generate 2-3 different ${dbType} queries that accomplish this goal, ordered by efficiency.
Consider query performance, readability, and accuracy.

Return as JSON array:
[
  {
    "query": "SELECT ...",
    "type": "${dbType.toLowerCase()}",
    "database": "${dbType === 'InfluxQL' ? 'influxdb' : 'prometheus'}",
    "confidence": 0.95,
    "reasoning": "Why this query is effective"
  }
]`;
    }

    // Advanced query optimization
    async optimizeQuery(queryCandidate, context) {
        const optimized = { ...queryCandidate };
        optimized.optimizations = [];
        
        // Apply optimization rules
        for (const rule of this.optimizationRules) {
            if (rule.applies(optimized, context)) {
                const result = await rule.optimize(optimized, context);
                if (result.improved) {
                    optimized.query = result.query;
                    optimized.optimizations.push(result.optimization);
                }
            }
        }
        
        // Database-specific optimizations
        if (optimized.database === 'influxdb') {
            await this.optimizeInfluxQuery(optimized, context);
        } else if (optimized.database === 'prometheus') {
            await this.optimizePromQLQuery(optimized, context);
        }
        
        // Calculate performance metrics
        optimized.performance = this.estimateQueryPerformance(optimized);
        optimized.complexity = this.calculateQueryComplexity(optimized);
        
        return optimized;
    }

    // InfluxDB-specific optimizations
    async optimizeInfluxQuery(query, context) {
        const optimizations = [];
        
        // Time range optimization
        if (!query.query.includes('time >')) {
            const timeClause = this.generateOptimalTimeClause(context);
            query.query = query.query.replace('WHERE ', `WHERE ${timeClause} AND `);
            optimizations.push('Added time range filter for performance');
        }
        
        // Index hint optimization
        if (query.query.includes('GROUP BY')) {
            const indexHints = this.suggestIndexUsage(query.query);
            if (indexHints.length > 0) {
                optimizations.push(`Consider indexes on: ${indexHints.join(', ')}`);
            }
        }
        
        // Limit optimization for large datasets
        if (!query.query.includes('LIMIT') && this.isLargeDatasetQuery(query.query)) {
            query.query += ' LIMIT 10000';
            optimizations.push('Added LIMIT for large dataset performance');
        }
        
        query.optimizations.push(...optimizations);
    }

    // PromQL-specific optimizations
    async optimizePromQLQuery(query, context) {
        const optimizations = [];
        
        // Rate function optimization
        if (query.query.includes('rate(') && !query.query.includes('[5m]')) {
            query.query = query.query.replace(/rate\(([^)]+)\)/g, 'rate($1[5m])');
            optimizations.push('Added optimal time window to rate function');
        }
        
        // Label selector optimization
        const labelOptimizations = this.optimizeLabelSelectors(query.query);
        if (labelOptimizations.length > 0) {
            optimizations.push(...labelOptimizations);
        }
        
        query.optimizations.push(...optimizations);
    }

    // Query ranking algorithm
    rankQueryCandidates(candidates, analysis) {
        return candidates
            .map(candidate => ({
                ...candidate,
                score: this.calculateQueryScore(candidate, analysis)
            }))
            .sort((a, b) => b.score - a.score);
    }

    calculateQueryScore(candidate, analysis) {
        let score = 0;
        
        // Base confidence score (0-100)
        score += candidate.confidence * 100;
        
        // Performance bonus (0-30)
        if (candidate.performance) {
            score += (1 - candidate.performance.estimatedTime / 10000) * 30;
        }
        
        // Complexity penalty (-20 to 0)
        if (candidate.complexity) {
            score -= Math.min(candidate.complexity.total * 2, 20);
        }
        
        // User preference bonus (0-20)
        const preferenceBonus = this.calculatePreferenceBonus(candidate);
        score += preferenceBonus;
        
        // Optimization bonus (0-15)
        score += Math.min(candidate.optimizations?.length || 0, 3) * 5;
        
        return Math.max(0, Math.min(100, score));
    }

    // Generate human-readable query explanation
    async generateQueryExplanation(queryCandidate, analysis) {
        if (this.canUseAIModel()) {
            return await this.generateAIExplanation(queryCandidate, analysis);
        } else {
            return this.generateTemplateExplanation(queryCandidate, analysis);
        }
    }

    async generateAIExplanation(queryCandidate, analysis) {
        const prompt = `Explain this ${queryCandidate.type} query in simple terms:

Query: ${queryCandidate.query}
Original Request: ${analysis.originalText}

Provide a clear, non-technical explanation of:
1. What data this query retrieves
2. How it processes the data
3. What the results will show
4. Why this approach was chosen

Keep it concise and user-friendly.`;

        try {
            return await this.callAIModel(prompt, { temperature: 0.3, maxTokens: 300 });
        } catch (error) {
            return this.generateTemplateExplanation(queryCandidate, analysis);
        }
    }

    generateTemplateExplanation(queryCandidate, analysis) {
        let explanation = `This query `;
        
        if (analysis.measurements.length > 0) {
            explanation += `retrieves data from ${analysis.measurements.join(' and ')} `;
        }
        
        if (analysis.fields.length > 0) {
            explanation += `focusing on ${analysis.fields.join(' and ')} metrics `;
        }
        
        if (analysis.timeRange) {
            explanation += `over the ${analysis.timeRange} time period `;
        }
        
        if (analysis.aggregations.length > 0) {
            explanation += `and calculates ${analysis.aggregations.join(', ')} values `;
        }
        
        if (analysis.groupings.length > 0) {
            explanation += `grouped by ${analysis.groupings.join(', ')} `;
        }
        
        explanation += '.';
        
        if (queryCandidate.optimizations?.length > 0) {
            explanation += ` Optimizations applied: ${queryCandidate.optimizations.join(', ')}.`;
        }
        
        return explanation;
    }

    // Load query templates
    async loadQueryTemplates() {
        this.queryTemplates.set('influxql_basic_select', {
            id: 'influxql_basic_select',
            type: 'influxql',
            database: 'influxdb',
            template: 'SELECT {aggregation}("{field}") FROM "{measurement}" WHERE time > now() - {timeRange}',
            confidence: 0.9,
            applicableIntents: ['monitoring', 'exploration'],
            requiredFields: ['field', 'measurement'],
            optionalFields: ['aggregation', 'timeRange']
        });

        this.queryTemplates.set('influxql_anomaly_detection', {
            id: 'influxql_anomaly_detection',
            type: 'influxql',
            database: 'influxdb',
            template: 'SELECT * FROM "{measurement}" WHERE "{field}" {operator} {threshold} AND time > now() - {timeRange}',
            confidence: 0.85,
            applicableIntents: ['anomaly_detection'],
            requiredFields: ['measurement', 'field', 'operator', 'threshold'],
            optionalFields: ['timeRange']
        });

        this.queryTemplates.set('promql_rate_query', {
            id: 'promql_rate_query',
            type: 'promql',
            database: 'prometheus',
            template: 'rate({metric}[{timeWindow}])',
            confidence: 0.9,
            applicableIntents: ['monitoring', 'trend_analysis'],
            requiredFields: ['metric'],
            optionalFields: ['timeWindow']
        });

        console.log('📋 Loaded', this.queryTemplates.size, 'query templates');
    }

    // Load query patterns
    async loadQueryPatterns() {
        // Initialize common query patterns
        this.queryPatterns.set('time_series_basic', {
            pattern: /SELECT .+ FROM .+ WHERE time > .+/i,
            type: 'influxql',
            description: 'Basic time series query pattern'
        });

        this.queryPatterns.set('promql_rate', {
            pattern: /rate\(.+\[.+\]\)/i,
            type: 'promql',
            description: 'PromQL rate function pattern'
        });

        this.queryPatterns.set('aggregation', {
            pattern: /(mean|sum|max|min|count)\(.+\)/i,
            type: 'both',
            description: 'Aggregation function pattern'
        });

        console.log('🔍 Loaded', this.queryPatterns.size, 'query patterns');
    }

    // Load user preferences
    async loadUserPreferences() {
        try {
            const stored = localStorage.getItem('queryGeneratorPreferences');
            if (stored) {
                this.userPreferences = JSON.parse(stored);
            } else {
                // Set default preferences
                this.userPreferences = {
                    preferredDatabase: 'influxdb',
                    defaultTimeRange: '1h',
                    includeOptimizations: true,
                    verboseExplanations: false
                };
            }
            console.log('👤 Loaded user preferences:', this.userPreferences);
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
            this.userPreferences = {};
        }
    }

    // Load optimization rules
    async loadOptimizationRules() {
        this.optimizationRules = [
            {
                name: 'time_range_filter',
                applies: (query, context) => !query.query.includes('time >') && query.database === 'influxdb',
                optimize: async (query, context) => {
                    const timeRange = context.timeRange || '1h';
                    const optimized = query.query.replace('WHERE ', `WHERE time > now() - ${timeRange} AND `);
                    return {
                        improved: true,
                        query: optimized,
                        optimization: 'Added time range filter for better performance'
                    };
                }
            },
            {
                name: 'limit_large_queries',
                applies: (query, context) => !query.query.includes('LIMIT') && this.isLargeDatasetQuery(query.query),
                optimize: async (query, context) => {
                    return {
                        improved: true,
                        query: query.query + ' LIMIT 1000',
                        optimization: 'Added LIMIT to prevent large result sets'
                    };
                }
            }
        ];
    }

    // Utility methods
    canUseAIModel() {
        return (window.OpenAIService?.isConnected || window.OllamaService?.isConnected);
    }

    async callAIModel(prompt, options = {}) {
        if (window.OpenAIService?.isConnected) {
            return await window.OpenAIService.generateCompletion(prompt, options);
        } else if (window.OllamaService?.isConnected) {
            return await window.OllamaService.generateCompletion(prompt, options);
        } else {
            throw new Error('No AI service available');
        }
    }

    normalizeQueryText(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    tokenizeForQuery(text) {
        const tokens = this.normalizeQueryText(text).split(' ');
        const queryTerms = new Set([
            'select', 'from', 'where', 'group', 'order', 'limit',
            'show', 'get', 'find', 'analyze', 'compare', 'monitor'
        ]);
        
        return tokens.filter(token => 
            token.length > 1 && 
            (queryTerms.has(token) || this.isMetricTerm(token) || this.isTimeTerm(token))
        );
    }

    isMetricTerm(term) {
        const metricTerms = ['cpu', 'memory', 'disk', 'network', 'load', 'usage', 'utilization'];
        return metricTerms.some(metric => term.includes(metric));
    }

    isTimeTerm(term) {
        const timeTerms = ['hour', 'day', 'week', 'month', 'minute', 'second', 'now', 'last', 'past'];
        return timeTerms.some(time => term.includes(time));
    }

    isLargeDatasetQuery(query) {
        // Heuristics to identify potentially large queries
        return !query.includes('LIMIT') && 
               (query.includes('*') || !query.includes('time >'));
    }

    estimateQueryPerformance(query) {
        // Simple performance estimation
        let estimatedTime = 100; // Base time in ms
        
        if (query.query.includes('*')) estimatedTime *= 3;
        if (!query.query.includes('time >')) estimatedTime *= 5;
        if (!query.query.includes('LIMIT')) estimatedTime *= 2;
        if (query.query.includes('GROUP BY')) estimatedTime *= 1.5;
        
        return {
            estimatedTime,
            category: estimatedTime < 500 ? 'fast' : estimatedTime < 2000 ? 'moderate' : 'slow'
        };
    }

    calculateQueryComplexity(query) {
        const complexity = { total: 0 };
        
        // Count complexity factors
        if (query.query.includes('JOIN')) complexity.total += this.complexityWeights.joins;
        if (query.query.includes('GROUP BY')) complexity.total += this.complexityWeights.grouping;
        if (query.query.includes('ORDER BY')) complexity.total += this.complexityWeights.sorting;
        
        const functionCount = (query.query.match(/(mean|sum|max|min|count|rate)\(/g) || []).length;
        complexity.total += functionCount * this.complexityWeights.functions;
        
        const filterCount = (query.query.match(/WHERE|AND|OR/g) || []).length;
        complexity.total += filterCount * this.complexityWeights.filters;
        
        complexity.category = complexity.total < 5 ? 'simple' : 
                             complexity.total < 15 ? 'moderate' : 'complex';
        
        return complexity;
    }
}

// Export for global access
window.IntelligentQueryGenerator = IntelligentQueryGenerator;