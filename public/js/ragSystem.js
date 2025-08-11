// Advanced RAG (Retrieval-Augmented Generation) System
// Vector embeddings, semantic search, and knowledge management for Time Buddy

class TimeSeriesRAGSystem {
    constructor() {
        this.vectorStore = new VectorStore();
        this.knowledgeGraphs = new Map();
        this.embeddingCache = new Map();
        this.documentIndex = new Map();
        
        // Pre-built knowledge domains
        this.knowledgeDomains = {
            influxql: new InfluxQLKnowledgeDomain(),
            promql: new PromQLKnowledgeDomain(),
            timeseries: new TimeSeriesKnowledgeDomain(),
            monitoring: new MonitoringKnowledgeDomain(),
            anomalies: new AnomalyDetectionKnowledgeDomain()
        };
        
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🧠 Initializing Advanced RAG System...');
        
        try {
            // Initialize vector store
            await this.vectorStore.initialize();
            
            // Load and index all knowledge domains
            await this.indexKnowledgeDomains();
            
            // Build semantic relationships
            await this.buildSemanticGraph();
            
            // Load user interaction patterns
            await this.loadUserPatterns();
            
            this.initialized = true;
            console.log('✅ RAG System initialized with', this.vectorStore.size(), 'embeddings');
            
        } catch (error) {
            console.error('❌ RAG System initialization failed:', error);
            throw error;
        }
    }

    // Main RAG retrieval method
    async retrieveRelevantContext(query, options = {}) {
        const {
            maxResults = 10,
            threshold = 0.7,
            domains = Object.keys(this.knowledgeDomains),
            includeExamples = true,
            includeUserPatterns = true
        } = options;

        console.log('🔍 RAG retrieval for:', query);

        // Generate query embedding
        const queryEmbedding = await this.generateEmbedding(query);
        
        const retrievedContext = {
            documentation: [],
            examples: [],
            userPatterns: [],
            semanticMatches: [],
            relatedConcepts: [],
            confidence: 0
        };

        // Search each knowledge domain
        for (const domainName of domains) {
            const domain = this.knowledgeDomains[domainName];
            if (!domain) continue;

            const domainResults = await this.searchDomain(
                domain, 
                queryEmbedding, 
                { maxResults: Math.ceil(maxResults / domains.length), threshold }
            );
            
            retrievedContext.documentation.push(...domainResults.documents);
            retrievedContext.examples.push(...domainResults.examples);
            retrievedContext.semanticMatches.push(...domainResults.semanticMatches);
        }

        // Search user patterns if requested
        if (includeUserPatterns) {
            retrievedContext.userPatterns = await this.searchUserPatterns(queryEmbedding, {
                maxResults: 5,
                threshold: threshold * 0.8 // Slightly lower threshold for user patterns
            });
        }

        // Find related concepts using knowledge graph
        retrievedContext.relatedConcepts = await this.findRelatedConcepts(query, {
            maxResults: 5,
            depth: 2
        });

        // Calculate overall confidence
        retrievedContext.confidence = this.calculateRetrievalConfidence(retrievedContext);

        // Rank and deduplicate results
        const rankedContext = this.rankAndDeduplicateResults(retrievedContext);

        console.log('📚 Retrieved context:', {
            docs: rankedContext.documentation.length,
            examples: rankedContext.examples.length,
            patterns: rankedContext.userPatterns.length,
            confidence: rankedContext.confidence.toFixed(3)
        });

        return rankedContext;
    }

    // Search user patterns
    async searchUserPatterns(queryEmbedding, options) {
        return await this.vectorStore.search(queryEmbedding, {
            ...options,
            filter: { type: 'user_interaction' }
        });
    }

    // Find related concepts
    async findRelatedConcepts(query, options) {
        const concepts = [];
        const queryLower = query.toLowerCase();
        
        // Simple concept matching for now
        const conceptKeywords = ['cpu', 'memory', 'disk', 'network', 'anomaly', 'monitoring'];
        conceptKeywords.forEach(keyword => {
            if (queryLower.includes(keyword)) {
                concepts.push({
                    concept: keyword,
                    relevance: 0.8,
                    description: `Related to ${keyword} monitoring`
                });
            }
        });
        
        return concepts.slice(0, options.maxResults || 5);
    }

    // Load historical data
    async loadHistoricalData() {
        console.log('📊 Loading historical data for model training...');
        // Placeholder - would load actual historical patterns
    }

    // Load user patterns
    async loadUserPatterns() {
        console.log('👤 Loading user interaction patterns...');
        // Placeholder - would load user interaction history
    }

    // Update user patterns
    async updateUserPatterns(interaction) {
        console.log('📝 Updating user patterns...');
        // Placeholder - would update user preference models
    }

    // Generate embeddings using connected AI service
    async generateEmbedding(text) {
        // Check cache first
        const cacheKey = this.hashText(text);
        if (this.embeddingCache.has(cacheKey)) {
            return this.embeddingCache.get(cacheKey);
        }

        let embedding;
        
        try {
            if (window.OpenAIService?.isConnected) {
                // Use OpenAI embeddings API
                embedding = await this.generateOpenAIEmbedding(text);
            } else if (window.OllamaService?.isConnected) {
                // Use Ollama for local embeddings
                embedding = await this.generateOllamaEmbedding(text);
            } else {
                // Fallback to simple text-based features
                embedding = this.generateSimpleEmbedding(text);
            }
            
            // Cache the result
            this.embeddingCache.set(cacheKey, embedding);
            
        } catch (error) {
            console.warn('Embedding generation failed, using fallback:', error);
            embedding = this.generateSimpleEmbedding(text);
        }

        return embedding;
    }

    async generateOpenAIEmbedding(text) {
        // OpenAI embedding generation
        const response = await fetch('/api/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Grafana-URL': 'openai-embeddings'
            },
            body: JSON.stringify({
                input: text,
                model: 'text-embedding-ada-002'
            })
        });
        
        if (!response.ok) {
            throw new Error('OpenAI embedding request failed');
        }
        
        const data = await response.json();
        return data.data[0].embedding;
    }

    async generateOllamaEmbedding(text) {
        // Generate embedding using Ollama with nomic-embed-text model
        if (!window.OllamaService?.isConnected) {
            console.warn('Ollama not connected, using simple embedding fallback');
            return this.generateSimpleEmbedding(text);
        }

        try {
            // Use Ollama's embedding endpoint with nomic-embed-text model
            const response = await fetch(`${window.OllamaService.config.endpoint}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'nomic-embed-text:latest',
                    prompt: text
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama embedding API error: ${response.status}`);
            }

            const data = await response.json();
            if (data.embedding && Array.isArray(data.embedding)) {
                console.log(`📊 Generated Ollama embedding (size: ${data.embedding.length})`);
                return data.embedding;
            } else {
                throw new Error('Invalid embedding response format');
            }
        } catch (error) {
            console.warn('Ollama embedding failed, using fallback:', error.message);
            return this.generateSimpleEmbedding(text);
        }
    }

    generateSimpleEmbedding(text) {
        // Fallback: Simple TF-IDF-like embedding
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        const embedding = new Array(384).fill(0); // Standard embedding size
        
        words.forEach((word, index) => {
            const hash = this.simpleHash(word);
            const positions = [hash % 384, (hash * 7) % 384, (hash * 13) % 384];
            positions.forEach(pos => {
                embedding[pos] += 1 / (index + 1); // Position-weighted
            });
        });
        
        // Normalize
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / (norm || 1));
    }

    // Index all knowledge domains
    async indexKnowledgeDomains() {
        console.log('📖 Indexing knowledge domains...');
        
        for (const [domainName, domain] of Object.entries(this.knowledgeDomains)) {
            console.log(`  Indexing ${domainName}...`);
            await domain.initialize();
            
            // Index documents
            for (const doc of domain.getDocuments()) {
                const embedding = await this.generateEmbedding(doc.content);
                await this.vectorStore.add({
                    id: `${domainName}:${doc.id}`,
                    content: doc.content,
                    metadata: { ...doc.metadata, domain: domainName, type: 'document' },
                    embedding
                });
            }
            
            // Index examples
            for (const example of domain.getExamples()) {
                const embedding = await this.generateEmbedding(example.description + ' ' + example.code);
                await this.vectorStore.add({
                    id: `${domainName}:example:${example.id}`,
                    content: example.description,
                    code: example.code,
                    metadata: { ...example.metadata, domain: domainName, type: 'example' },
                    embedding
                });
            }
        }
    }

    // Build semantic relationship graph
    async buildSemanticGraph() {
        console.log('🕸️ Building semantic graph...');
        
        // Create relationships between concepts
        const concepts = [
            'anomaly_detection', 'time_series', 'metrics', 'monitoring',
            'influxql', 'promql', 'grafana', 'queries', 'alerting',
            'cpu', 'memory', 'disk', 'network', 'performance'
        ];
        
        const relationships = new Map();
        
        for (const concept1 of concepts) {
            for (const concept2 of concepts) {
                if (concept1 !== concept2) {
                    const similarity = await this.calculateConceptSimilarity(concept1, concept2);
                    if (similarity > 0.6) {
                        relationships.set(`${concept1}-${concept2}`, similarity);
                    }
                }
            }
        }
        
        this.conceptGraph = relationships;
    }

    // Calculate concept similarity (placeholder implementation)
    async calculateConceptSimilarity(concept1, concept2) {
        // Simple similarity based on string similarity for now
        // In production, this would use semantic embeddings
        const similarity = this.stringSimilarity(concept1, concept2);
        return similarity;
    }

    stringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // Search within a specific domain
    async searchDomain(domain, queryEmbedding, options) {
        const results = {
            documents: [],
            examples: [],
            semanticMatches: []
        };
        
        // Search vector store for this domain
        const vectorResults = await this.vectorStore.search(queryEmbedding, {
            ...options,
            filter: { domain: domain.name }
        });
        
        for (const result of vectorResults) {
            if (result.metadata.type === 'document') {
                results.documents.push({
                    content: result.content,
                    score: result.score,
                    metadata: result.metadata
                });
            } else if (result.metadata.type === 'example') {
                results.examples.push({
                    description: result.content,
                    code: result.code,
                    score: result.score,
                    metadata: result.metadata
                });
            }
        }
        
        return results;
    }

    // Advanced context augmentation for AI prompts
    async augmentPromptWithContext(originalPrompt, retrievedContext, options = {}) {
        const {
            maxContextLength = 4000,
            includeExamples = true,
            includeUserPatterns = true,
            prioritizeRecent = true
        } = options;

        let augmentedPrompt = '';
        let usedLength = 0;
        
        // Add system context
        augmentedPrompt += `You are an expert time series analyst with deep knowledge of InfluxQL, PromQL, and monitoring systems. `;
        augmentedPrompt += `Use the following context to provide accurate, helpful responses.\n\n`;
        
        // Add relevant documentation
        if (retrievedContext.documentation.length > 0) {
            augmentedPrompt += `## Relevant Documentation:\n`;
            for (const doc of retrievedContext.documentation.slice(0, 3)) {
                const addition = `- ${doc.content}\n`;
                if (usedLength + addition.length < maxContextLength) {
                    augmentedPrompt += addition;
                    usedLength += addition.length;
                }
            }
            augmentedPrompt += '\n';
        }
        
        // Add examples if requested
        if (includeExamples && retrievedContext.examples.length > 0) {
            augmentedPrompt += `## Examples:\n`;
            for (const example of retrievedContext.examples.slice(0, 2)) {
                const addition = `${example.description}\n\`\`\`\n${example.code}\n\`\`\`\n`;
                if (usedLength + addition.length < maxContextLength) {
                    augmentedPrompt += addition;
                    usedLength += addition.length;
                }
            }
            augmentedPrompt += '\n';
        }
        
        // Add user patterns if requested
        if (includeUserPatterns && retrievedContext.userPatterns.length > 0) {
            augmentedPrompt += `## User's Previous Patterns:\n`;
            const recentPatterns = prioritizeRecent 
                ? retrievedContext.userPatterns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                : retrievedContext.userPatterns;
                
            for (const pattern of recentPatterns.slice(0, 2)) {
                const addition = `- ${pattern.description}\n`;
                if (usedLength + addition.length < maxContextLength) {
                    augmentedPrompt += addition;
                    usedLength += addition.length;
                }
            }
            augmentedPrompt += '\n';
        }
        
        // Add the original user query
        augmentedPrompt += `## User Query:\n${originalPrompt}\n\n`;
        augmentedPrompt += `Please provide a comprehensive response based on the context above.`;
        
        return augmentedPrompt;
    }

    // Store successful interactions for learning
    async storeSuccessfulInteraction(query, response, results, metadata = {}) {
        const interaction = {
            id: this.generateId(),
            query,
            response,
            results,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                success: true,
                userSatisfaction: metadata.userSatisfaction || 0.8
            }
        };
        
        // Generate embedding for the interaction
        const embedding = await this.generateEmbedding(query + ' ' + response.text);
        
        // Store in vector store
        await this.vectorStore.add({
            id: `interaction:${interaction.id}`,
            content: query,
            response: response.text,
            metadata: { ...interaction.metadata, type: 'user_interaction' },
            embedding
        });
        
        // Update user patterns
        await this.updateUserPatterns(interaction);
        
        console.log('💾 Stored successful interaction:', interaction.id);
    }

    // Utility methods
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
        }
        return Math.abs(hash);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    calculateRetrievalConfidence(context) {
        const weights = {
            documentation: 0.4,
            examples: 0.3,
            userPatterns: 0.2,
            semanticMatches: 0.1
        };
        
        let confidence = 0;
        for (const [type, items] of Object.entries(context)) {
            if (weights[type] && Array.isArray(items)) {
                const avgScore = items.reduce((sum, item) => sum + (item.score || 0), 0) / (items.length || 1);
                confidence += weights[type] * avgScore;
            }
        }
        
        return Math.min(confidence, 1);
    }

    rankAndDeduplicateResults(context) {
        // Advanced ranking and deduplication logic
        // This would implement sophisticated algorithms for result ranking
        return context;
    }
}

// Vector Store implementation
class VectorStore {
    constructor() {
        this.vectors = new Map();
        this.index = new Map();
    }

    async initialize() {
        console.log('🗃️ Initializing Vector Store...');
        await this.loadPersistedVectors();
    }

    async add(item) {
        this.vectors.set(item.id, item);
        
        // Simple indexing by metadata fields
        for (const [key, value] of Object.entries(item.metadata || {})) {
            if (!this.index.has(key)) {
                this.index.set(key, new Map());
            }
            if (!this.index.get(key).has(value)) {
                this.index.get(key).set(value, new Set());
            }
            this.index.get(key).get(value).add(item.id);
        }
    }

    async search(queryEmbedding, options = {}) {
        const { maxResults = 10, threshold = 0.7, filter = {} } = options;
        const results = [];
        
        // Filter candidates based on metadata
        let candidates = new Set(this.vectors.keys());
        for (const [key, value] of Object.entries(filter)) {
            if (this.index.has(key) && this.index.get(key).has(value)) {
                candidates = new Set([...candidates].filter(id => 
                    this.index.get(key).get(value).has(id)
                ));
            }
        }
        
        // Calculate similarities
        for (const id of candidates) {
            const item = this.vectors.get(id);
            if (!item.embedding) continue;
            
            const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
            if (similarity >= threshold) {
                results.push({
                    ...item,
                    score: similarity
                });
            }
        }
        
        // Sort by similarity and limit results
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    cosineSimilarity(a, b) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    size() {
        return this.vectors.size;
    }

    async loadPersistedVectors() {
        // Load from localStorage or IndexedDB
        try {
            const stored = localStorage.getItem('timeBuddyVectorStore');
            if (stored) {
                const data = JSON.parse(stored);
                for (const item of data) {
                    await this.add(item);
                }
            }
        } catch (error) {
            console.warn('Could not load persisted vectors:', error);
        }
    }
}

// Knowledge Domain base class
class KnowledgeDomain {
    constructor(name) {
        this.name = name;
        this.documents = [];
        this.examples = [];
        this.concepts = [];
    }

    async initialize() {
        await this.loadDocuments();
        await this.loadExamples();
        await this.loadConcepts();
    }

    getDocuments() { return this.documents; }
    getExamples() { return this.examples; }
    getConcepts() { return this.concepts; }

    async loadDocuments() { /* Override in subclasses */ }
    async loadExamples() { /* Override in subclasses */ }
    async loadConcepts() { /* Override in subclasses */ }
}

// Specific knowledge domains
class InfluxQLKnowledgeDomain extends KnowledgeDomain {
    constructor() {
        super('influxql');
    }

    async loadDocuments() {
        this.documents = [
            {
                id: 'influxql_select',
                content: 'InfluxQL SELECT statements retrieve data from measurements. Basic syntax: SELECT <field_key>[,<field_key>,<tag_key>] FROM <measurement_name>[,<measurement_name>]',
                metadata: { category: 'syntax', complexity: 'basic' }
            },
            {
                id: 'influxql_where',
                content: 'WHERE clause filters data by field values, tag values, and timestamps. Supports comparison operators, logical operators, and regular expressions.',
                metadata: { category: 'filtering', complexity: 'intermediate' }
            },
            {
                id: 'influxql_group_by',
                content: 'GROUP BY time() groups query results by specified time intervals. Common intervals: 1s, 1m, 1h, 1d. Can be combined with tag grouping.',
                metadata: { category: 'aggregation', complexity: 'intermediate' }
            }
        ];
    }

    async loadExamples() {
        this.examples = [
            {
                id: 'basic_select',
                description: 'Get CPU usage from the last hour',
                code: 'SELECT mean("usage_idle") FROM "cpu" WHERE time > now() - 1h GROUP BY time(5m)',
                metadata: { useCase: 'monitoring', difficulty: 'beginner' }
            },
            {
                id: 'anomaly_detection',
                description: 'Find CPU spikes above 90% usage',
                code: 'SELECT * FROM "cpu" WHERE "usage_system" + "usage_user" > 90 AND time > now() - 24h',
                metadata: { useCase: 'anomaly_detection', difficulty: 'intermediate' }
            }
        ];
    }
}

class PromQLKnowledgeDomain extends KnowledgeDomain {
    constructor() {
        super('promql');
    }

    async loadDocuments() {
        this.documents = [
            {
                id: 'promql_selectors',
                content: 'PromQL instant vector selectors select time series by metric name and labels. Example: http_requests_total{job="api-server", method="GET"}',
                metadata: { category: 'selectors', complexity: 'basic' }
            },
            {
                id: 'promql_functions',
                content: 'PromQL functions operate on vector types. rate() calculates per-second rate, avg_over_time() averages values over time ranges.',
                metadata: { category: 'functions', complexity: 'intermediate' }
            }
        ];
    }

    async loadExamples() {
        this.examples = [
            {
                id: 'cpu_rate',
                description: 'Calculate CPU usage rate over 5 minutes',
                code: 'rate(cpu_usage_seconds_total[5m])',
                metadata: { useCase: 'monitoring', difficulty: 'beginner' }
            }
        ];
    }
}

// Additional domain classes would be implemented similarly...
class TimeSeriesKnowledgeDomain extends KnowledgeDomain {
    constructor() { super('timeseries'); }
}

class MonitoringKnowledgeDomain extends KnowledgeDomain {
    constructor() { super('monitoring'); }
}

class AnomalyDetectionKnowledgeDomain extends KnowledgeDomain {
    constructor() { super('anomalies'); }
}

// Export for global access
window.TimeSeriesRAGSystem = TimeSeriesRAGSystem;