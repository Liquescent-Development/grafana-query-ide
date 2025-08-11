// Advanced AI Agent System
// Sophisticated Natural Language Understanding and Reasoning for Time Series Analysis

class AdvancedAIAgent {
    constructor() {
        this.initialized = false;
        this.knowledgeBase = new AIKnowledgeBase();
        this.contextManager = new ConversationContextManager();
        this.queryGenerator = new IntelligentQueryGenerator();
        this.reasoningEngine = new ChainOfThoughtReasoner();
        this.visualizationEngine = new SmartVisualizationEngine();
        
        // Advanced capabilities
        this.capabilities = {
            multiTurnConversation: true,
            proactiveInsights: true,
            semanticSearch: true,
            queryOptimization: true,
            anomalyPrediction: true,
            crossDatabaseTranslation: true,
            naturalLanguageReporting: true,
            contextualLearning: true
        };
        
        // Performance metrics
        this.metrics = {
            conversationTurns: 0,
            successfulQueries: 0,
            anomaliesDetected: 0,
            insightsGenerated: 0,
            userSatisfactionScore: 0
        };
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing Advanced AI Agent...');
        
        try {
            // Initialize all components
            await this.knowledgeBase.initialize();
            await this.contextManager.initialize();
            await this.queryGenerator.initialize();
            await this.reasoningEngine.initialize();
            await this.visualizationEngine.initialize();
            
            // Load domain knowledge
            await this.loadTimeSeriesKnowledge();
            await this.loadQueryPatterns();
            await this.loadUserPreferences();
            
            this.initialized = true;
            console.log('✅ Advanced AI Agent initialized successfully');
            
            // Start proactive monitoring
            this.startProactiveMonitoring();
            
        } catch (error) {
            console.error('❌ Failed to initialize Advanced AI Agent:', error);
            throw error;
        }
    }

    // Clear conversation history to start fresh
    clearConversationHistory() {
        console.log('🧹 Clearing conversation history');
        this.contextManager.clearHistory();
    }

    // Main entry point for user interactions - TRUE INTELLIGENT PROCESSING
    async processAdvancedQuery(userInput, context = {}) {
        if (!this.initialized) {
            console.log('⚠️ Advanced AI Agent not initialized, falling back to basic');
            return this.generateFallbackResponse(userInput, context);
        }

        // Set conversation context for isolation
        if (context.conversationId) {
            this.contextManager.setConversationId(context.conversationId);
            console.log('🔒 Set conversation context to:', context.conversationId);
        }

        this.metrics.conversationTurns++;
        console.log('🧠 Processing intelligent query:', userInput);
        
        try {
            // Step 1: Parse user intent using NLU with conversation context
            const intent = await this.parseUserIntent(userInput, context);
            console.log('🎯 Parsed intent:', intent);
            
            // Step 2: Execute the intent by querying real data
            const analysisResult = await this.executeIntent(intent, context);
            console.log('📊 Analysis result:', analysisResult);
            
            // Step 3: Generate intelligent response based on actual findings
            const response = await this.generateIntelligentResponse(intent, analysisResult, userInput);
            console.log('💬 Generated response:', response);
            
            // Step 4: Store this exchange in conversation history
            this.contextManager.addToHistory(userInput, response, context);
            
            return response;
            
        } catch (error) {
            console.error('Error in intelligent query processing:', error);
            const errorResponse = this.generateErrorResponse(error, userInput);
            
            // Still store error responses in history for context
            this.contextManager.addToHistory(userInput, errorResponse, context);
            
            return errorResponse;
        }
    }

    // Parse user intent from natural language using AI
    async parseUserIntent(userInput, context) {
        const availableMetrics = context.availableMetrics || [];
        
        // Use AI model for intent parsing if available
        if (window.OllamaService?.isConnected || window.OpenAIService?.isConnected) {
            const intentPrompt = this.buildIntentParsingPrompt(userInput, availableMetrics);
            
            try {
                const aiResponse = await this.callAIModel(intentPrompt, { temperature: 0.1, maxTokens: 500 });
                
                // Check if AI is requesting system information
                if (this.isSystemCommand(aiResponse)) {
                    const commandResult = await this.executeSystemCommand(aiResponse, context);
                    
                    // Call AI again with the command result
                    const enhancedPrompt = intentPrompt + `\n\n**SYSTEM RESPONSE:**\n${commandResult}\n\nNow that you have the information you requested, please provide your intent parsing response:`;
                    const finalResponse = await this.callAIModel(enhancedPrompt, { temperature: 0.1, maxTokens: 500 });
                    const parsedIntent = this.parseAIIntentResponse(finalResponse);
                    
                    if (parsedIntent) {
                        return parsedIntent;
                    }
                } else {
                    const parsedIntent = this.parseAIIntentResponse(aiResponse);
                    
                    if (parsedIntent) {
                        return parsedIntent;
                    }
                }
            } catch (error) {
                console.warn('AI intent parsing failed, using fallback:', error);
            }
        }
        
        // If AI parsing fails, return error - no fallback
        return {
            type: 'ai_parsing_failed',
            error: 'AI service unavailable - cannot process your request',
            success: false
        };
    }

    // Build prompt for AI-powered intent parsing with rich context
    buildIntentParsingPrompt(userInput, availableMetrics) {
        // Get rich schema information
        const schemaInfo = this.buildRichSchemaContext(availableMetrics);
        
        // Get conversation context
        const conversationContext = this.contextManager.getConversationContext();
        
        return `You are an expert time series analyst. Parse this user query and extract the intent with full understanding of the available data.

${schemaInfo}

${conversationContext}

User query: "${userInput}"

Analyze the query and return a JSON object with:
{
  "type": "find_anomalies",  // Choose ONE: find_anomalies, compare_metrics, explain_metric, list_metrics, get_stats, query_data, analyze_fields
  "metrics": ["specific_measurement_names"],  // Only exact measurement names from above
  "timeRange": "24h",  // Choose: 1h, 24h, 7d, or custom
  "operation": "anomaly_detection",  // Choose: mean, sum, max, min, rate, count, anomaly_detection
  "confidence": 0.9,  // How confident you are in this interpretation (0-1)
  "reasoning": "Why you chose these metrics and this approach",
  "question": "${userInput}"
}

CRITICAL RULES:
- When user says "those measurements", "those metrics", "the measurements", "them", etc., ONLY use measurements from the conversation history
- For dashboard requests referencing previous conversation, IGNORE the example measurements list entirely
- Only use measurement names that exist exactly as mentioned in the conversation or listed above
- Use "analyze_fields" when user asks about fields/columns within a specific measurement
- Be specific about which measurements match the user's intent
- IMPORTANT: Conversation context takes ABSOLUTE PRIORITY over sample measurements

**DASHBOARD RULE**: If user requests a dashboard and refers to previously discussed measurements, extract ONLY those specific measurements from the conversation history, regardless of measurement naming pattern.`;
    }

    // Build lean schema context - AI can request more specific information
    buildRichSchemaContext(availableMetrics) {
        const totalCount = availableMetrics.length;
        
        // Extract measurements mentioned in conversation history
        const recentHistory = this.contextManager.currentContext.conversationHistory.slice(-3);
        const mentionedMeasurements = new Set();
        
        recentHistory.forEach(exchange => {
            // Look for any measurement names mentioned in user input and AI responses
            const text = `${exchange.userInput} ${exchange.aiResponse?.text || ''}`;
            
            // Check each available metric to see if it's mentioned in the conversation
            availableMetrics.forEach(metric => {
                // Case-insensitive search for exact measurement names
                const regex = new RegExp(`\\b${metric.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                if (regex.test(text)) {
                    mentionedMeasurements.add(metric);
                    console.log(`🔍 Found mentioned measurement in conversation: ${metric}`);
                }
            });
        });
        
        let schemaInfo = `**TIME SERIES DATA AVAILABLE:**\n`;
        schemaInfo += `Total measurements: ${totalCount}\n\n`;
        
        // Show recently mentioned measurements first, then sample
        if (mentionedMeasurements.size > 0) {
            schemaInfo += `**Recently discussed measurements:**\n`;
            Array.from(mentionedMeasurements).forEach(metric => {
                schemaInfo += `• ${metric}\n`;
            });
            schemaInfo += `\n`;
        }
        
        // Show a small sample for context, but make it clear these are just examples
        const sampleMetrics = availableMetrics.slice(0, 5);
        schemaInfo += `**Example measurements (${sampleMetrics.length} of ${totalCount}):**\n`;
        
        sampleMetrics.forEach(metric => {
            if (!mentionedMeasurements.has(metric)) {
                schemaInfo += `• ${metric}\n`;
            }
        });
        
        schemaInfo += `\n**AI SYSTEM COMMANDS:**\n`;
        schemaInfo += `If you need more information to answer the user's question, you can use these commands:\n`;
        schemaInfo += `- LOOKUP_MEASUREMENT: measurement_name - Get details about a specific measurement\n`;
        schemaInfo += `- SEARCH_MEASUREMENTS: search_pattern - Find measurements matching a pattern\n`;
        schemaInfo += `- GET_FIELDS: measurement_name - Get field names and tags for a measurement\n`;
        schemaInfo += `- GET_TAGS: measurement_name - Get only tag names for a measurement (for filtering/grouping)\n`;
        schemaInfo += `- GET_SAMPLE_DATA: measurement_name - Get sample data from a measurement\n`;
        schemaInfo += `\nIf you use a command, I will execute it and provide the results, then you can answer the user.\n\n`;
        
        return schemaInfo;
    }

    // Check if AI response contains a system command
    isSystemCommand(response) {
        const commands = ['LOOKUP_MEASUREMENT:', 'SEARCH_MEASUREMENTS:', 'GET_FIELDS:', 'GET_TAGS:', 'GET_SAMPLE_DATA:', 'SHOW TAG KEYS', 'SHOW FIELD KEYS', 'SHOW MEASUREMENTS'];
        const flexibleCommands = ['I need to', 'let me', 'I should', 'I will need to', 'execute', 'query', 'sample data'];
        
        console.log('🔍 Checking for system commands in response:', response.substring(0, 300) + '...');
        
        // Strip markdown code blocks and formatting to find commands
        const cleanResponse = response.replace(/```[\s\S]*?```/g, (match) => {
            // Extract content from code blocks and check for commands
            const content = match.replace(/```/g, '').trim();
            console.log('🔍 Found code block content:', content);
            return content;
        });
        
        console.log('🔍 Cleaned response for command detection:', cleanResponse.substring(0, 300));
        
        // Check for exact command format first
        const hasExactCommand = commands.some(cmd => cleanResponse.includes(cmd));
        if (hasExactCommand) {
            console.log('✅ Found exact system command format');
            return true;
        }
        
        // Check if AI is indicating it needs more data but didn't use exact format
        const responseLines = response.toLowerCase().split('\n');
        for (const line of responseLines) {
            if ((line.includes('need') || line.includes('should') || line.includes('execute')) && 
                (line.includes('query') || line.includes('data') || line.includes('sample'))) {
                console.log('🤖 AI indicated need for data but used flexible language:', line);
                return true;
            }
        }
        
        console.log('❌ No system commands detected');
        return false;
    }

    // Execute system command requested by AI
    async executeSystemCommand(response, context) {
        console.log('🤖 AI requested system command:', response);
        
        // Strip markdown code blocks to find commands
        const cleanResponse = response.replace(/```[\s\S]*?```/g, (match) => {
            return match.replace(/```/g, '').trim();
        });
        
        console.log('🤖 Cleaned response for command extraction:', cleanResponse.substring(0, 200));
        
        // Handle exact command format
        if (cleanResponse.includes('LOOKUP_MEASUREMENT:')) {
            const measurementName = cleanResponse.split('LOOKUP_MEASUREMENT:')[1].trim().split('\n')[0];
            console.log('🔍 Extracted measurement name for lookup:', measurementName);
            return await this.lookupMeasurement(measurementName, context);
        }
        
        if (cleanResponse.includes('SEARCH_MEASUREMENTS:')) {
            const searchPattern = cleanResponse.split('SEARCH_MEASUREMENTS:')[1].trim().split('\n')[0];
            console.log('🔍 Extracted search pattern:', searchPattern);
            return await this.searchMeasurements(searchPattern, context);
        }
        
        if (cleanResponse.includes('GET_FIELDS:')) {
            let measurementName = cleanResponse.split('GET_FIELDS:')[1].trim().split('\n')[0];
            // Clean up backticks, quotes, and other formatting
            measurementName = measurementName.replace(/[`"']/g, '').trim();
            console.log('🔍 Extracted measurement name for fields:', measurementName);
            return await this.getFieldsAndTagsForAI(measurementName, context);
        }
        
        if (cleanResponse.includes('GET_TAGS:')) {
            let measurementName = cleanResponse.split('GET_TAGS:')[1].trim().split('\n')[0];
            // Clean up backticks, quotes, and other formatting
            measurementName = measurementName.replace(/[`"']/g, '').trim();
            console.log('🔍 Extracted measurement name for tags:', measurementName);
            return await this.getTagKeysFromSchema(measurementName, context);
        }
        
        if (cleanResponse.includes('GET_SAMPLE_DATA:')) {
            let measurementName = cleanResponse.split('GET_SAMPLE_DATA:')[1].trim().split('\n')[0];
            // Clean up backticks, quotes, and other formatting
            measurementName = measurementName.replace(/[`"']/g, '').trim();
            console.log('🔍 Extracted measurement name for sample data:', measurementName);
            return await this.getSampleData(measurementName, context);
        }
        
        // Handle InfluxQL schema queries as system commands using Schema cache
        if (cleanResponse.includes('SHOW TAG KEYS')) {
            const match = cleanResponse.match(/SHOW TAG KEYS FROM "([^"]+)"/);
            if (match) {
                const measurementName = match[1];
                console.log('🔍 Extracted measurement name for tag keys:', measurementName);
                return await this.getTagKeysFromSchema(measurementName, context);
            }
        }
        
        if (cleanResponse.includes('SHOW FIELD KEYS')) {
            const match = cleanResponse.match(/SHOW FIELD KEYS FROM "([^"]+)"/);
            if (match) {
                const measurementName = match[1];
                console.log('🔍 Extracted measurement name for field keys:', measurementName);
                return await this.getMeasurementFields(measurementName, context);
            }
        }
        
        if (cleanResponse.includes('SHOW MEASUREMENTS')) {
            console.log('🔍 AI requested to show measurements');
            return await this.getAllMeasurementsFromSchema(context);
        }
        
        if (response.includes('GET_RETENTION_POLICIES')) {
            return await this.getRetentionPoliciesFromSchema(context);
        }
        
        if (response.includes('SET_RETENTION_POLICY:')) {
            const retentionPolicy = response.split('SET_RETENTION_POLICY:')[1].trim().split('\n')[0];
            return await this.setRetentionPolicy(retentionPolicy, context);
        }
        
        // Handle flexible language - try to infer what AI wants
        return await this.inferSystemCommand(response, context);
    }

    // Infer what system command the AI wanted based on flexible language
    async inferSystemCommand(response, context) {
        console.log('🤖 Inferring system command from flexible language');
        
        // Extract measurement names mentioned in the response
        const measurementRegex = /ec2-[a-zA-Z0-9-]+/g;
        const measurements = response.match(measurementRegex) || [];
        
        if (measurements.length > 0) {
            const measurement = measurements[0];
            console.log(`🎯 Found measurement reference: ${measurement}`);
            
            // If AI mentions needing sample data or structure
            if (response.toLowerCase().includes('sample') || 
                response.toLowerCase().includes('structure') ||
                response.toLowerCase().includes('execute') ||
                response.toLowerCase().includes('dashboard')) {
                
                console.log(`🔍 AI needs sample data for dashboard creation`);
                return await this.getSampleData(measurement, context);
            }
            
            // If AI mentions fields
            if (response.toLowerCase().includes('field')) {
                console.log(`🔍 AI needs field information`);
                return await this.getMeasurementFields(measurement, context);
            }
        }
        
        return `I detected that you need more information, but I couldn't determine exactly what. Please use the specific command format:
- GET_SAMPLE_DATA: measurement_name
- GET_FIELDS: measurement_name  
- SEARCH_MEASUREMENTS: pattern`;
    }

    // Lookup a specific measurement
    async lookupMeasurement(measurementName, context) {
        const measurements = context.availableMetrics || [];
        const found = measurements.find(m => m.toLowerCase() === measurementName.toLowerCase());
        
        if (found) {
            const details = this.getMeasurementDetails(found);
            return `**Measurement Found: ${found}**\n` +
                   `Type: ${details.type}\n` +
                   `Description: ${details.description}\n` +
                   `Use Case: ${details.useCase}\n` +
                   `Fields: ${details.fields.join(', ')}\n` +
                   `Tags: ${details.tags.join(', ')}`;
        } else {
            return `Measurement "${measurementName}" not found in available measurements.`;
        }
    }

    // Search for measurements matching a pattern
    async searchMeasurements(searchPattern, context) {
        const measurements = context.availableMetrics || [];
        const pattern = searchPattern.toLowerCase();
        const matches = measurements.filter(m => m.toLowerCase().includes(pattern));
        
        if (matches.length > 0) {
            const limitedMatches = matches.slice(0, 20); // Limit results
            let result = `**Found ${matches.length} measurements matching "${searchPattern}":**\n`;
            limitedMatches.forEach(match => {
                result += `• ${match}\n`;
            });
            if (matches.length > 20) {
                result += `... and ${matches.length - 20} more matches\n`;
            }
            return result;
        } else {
            return `No measurements found matching pattern "${searchPattern}".`;
        }
    }

    // Get field names for a measurement (this would query the actual database)
    async getMeasurementFields(measurementName, context) {
        try {
            // This is where we'd query the actual database for field names
            // For now, simulate the API call
            const fields = await this.queryMeasurementFields(measurementName);
            
            if (fields && fields.length > 0) {
                return `**Fields in measurement "${measurementName}":**\n${fields.map(f => `• ${f}`).join('\n')}`;
            } else {
                return `No fields found for measurement "${measurementName}" or measurement does not exist.`;
            }
        } catch (error) {
            return `Error retrieving fields for "${measurementName}": ${error.message}`;
        }
    }

    // Get measurement fields using the centralized Schema cache
    async queryMeasurementFields(measurementName) {
        console.log(`🔍 Getting fields for measurement: ${measurementName} from Schema cache`);
        
        try {
            // Use Schema's centralized method which handles caching and multiple retention policies
            if (typeof Schema === 'undefined') {
                console.warn('Schema service not available for field lookup');
                return [];
            }
            
            // Try with the first available retention policy
            const retentionPolicies = Schema.influxRetentionPolicies || ['autogen'];
            const defaultRetentionPolicy = retentionPolicies[0] || 'autogen';
            
            console.log(`🔍 Using retention policy: ${defaultRetentionPolicy} for measurement: ${measurementName}`);
            
            const fields = await Schema.getFieldsForMeasurement(measurementName, defaultRetentionPolicy);
            
            console.log(`🔍 Retrieved ${fields.length} fields from Schema cache:`, fields);
            return fields;
            
        } catch (error) {
            console.error(`Error getting fields for ${measurementName} from Schema:`, error);
            return [];
        }
    }

    // Get sample data from a measurement
    async getSampleData(measurementName, context) {
        try {
            // This would query actual sample data
            const sampleData = await this.querySampleData(measurementName);
            console.log(`🔍 Retrieved sample data for AI:`, sampleData?.length, 'rows');
            
            if (sampleData && sampleData.length > 0) {
                const formattedResponse = `**Sample data from "${measurementName}":**\n${JSON.stringify(sampleData.slice(0, 3), null, 2)}`;
                console.log(`🔍 Formatted response for AI:`, formattedResponse);
                return formattedResponse;
            } else {
                console.log(`🔍 No sample data found for measurement: ${measurementName}`);
                return `No sample data found for measurement "${measurementName}".`;
            }
        } catch (error) {
            console.log(`🔍 Error in getSampleData:`, error.message);
            return `Error retrieving sample data for "${measurementName}": ${error.message}`;
        }
    }

    // Get both fields and tags for AI system commands (formatted response)
    async getFieldsAndTagsForAI(measurementName, context) {
        console.log(`🔍 Getting fields and tags for AI: ${measurementName} from Schema cache`);
        
        try {
            if (typeof Schema === 'undefined') {
                console.warn('Schema service not available for fields/tags lookup');
                return 'Schema service not available for fields/tags lookup';
            }
            
            // Get fields using the centralized method
            const retentionPolicies = Schema.influxRetentionPolicies || ['autogen'];
            const defaultRetentionPolicy = retentionPolicies[0] || 'autogen';
            
            const fields = await Schema.getFieldsForMeasurement(measurementName, defaultRetentionPolicy);
            console.log(`🔍 Retrieved ${fields.length} fields from Schema cache:`, fields);
            
            // Get tags from Schema cache
            const tags = Schema.influxTags[measurementName] || [];
            console.log(`🔍 Retrieved ${tags.length} tags from Schema cache:`, tags);
            
            // Return formatted response for AI
            let response = `**Fields in measurement "${measurementName}":**\n`;
            if (fields.length > 0) {
                response += fields.map(field => `• ${field}`).join('\n');
            } else {
                response += 'No fields found';
            }
            
            if (tags.length > 0) {
                response += `\n\n**Tags in measurement "${measurementName}" (for filtering/grouping):**\n`;
                response += tags.map(tag => `• ${tag}`).join('\n');
            }
            
            return response;
            
        } catch (error) {
            console.error(`Error getting fields and tags for ${measurementName} from Schema:`, error);
            return `Error retrieving fields and tags for "${measurementName}": ${error.message}`;
        }
    }

    // Query actual sample data using the same method as field queries
    async querySampleData(measurementName) {
        console.log(`🔍 Querying sample data for measurement: ${measurementName}`);
        
        try {
            // Use the same executeQuery method that works for fields
            // Try without retention policy first
            const query = `SELECT * FROM "${measurementName}" ORDER BY time DESC LIMIT 5`;
            console.log(`🔍 Executing sample data query: ${query}`);
            const response = await this.executeQuery(query, {});
            
            console.log(`🔍 Sample data response:`, JSON.stringify(response, null, 2));
            
            // Handle both old and new Grafana response formats
            
            // Try new Grafana format first (response.results.A.frames)
            if (response && response.results && response.results.A && response.results.A.frames && response.results.A.frames.length > 0) {
                const frame = response.results.A.frames[0];
                if (frame.schema && frame.schema.fields && frame.data && frame.data.values) {
                    const fields = frame.schema.fields;
                    const columns = frame.data.values; // Each element is a column, not a row
                    
                    const numRows = columns.length > 0 ? columns[0].length : 0;
                    console.log(`🔍 Sample data format (new): ${fields.length} fields, ${numRows} rows`);
                    
                    // Convert columnar data to row objects (same as query editor)
                    const result = [];
                    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                        const obj = {};
                        fields.forEach((field, fieldIndex) => {
                            obj[field.name] = columns[fieldIndex] ? columns[fieldIndex][rowIndex] : null;
                        });
                        result.push(obj);
                    }
                    
                    console.log(`🔍 Converted to ${result.length} row objects:`, result.slice(0, 2));
                    return result;
                }
            }
            
            // Try old format (response.data.columns/values)
            else if (response && response.data && response.data.columns && response.data.values) {
                const columns = response.data.columns; // Column names array like ["Time", "Value"]
                const values = response.data.values;   // Flat array of all values
                
                console.log(`🔍 Sample data format (old): ${columns.length} columns, ${values.length} total values`);
                console.log(`🔍 Columns:`, columns);
                console.log(`🔍 Values sample:`, values.slice(0, 10));
                
                // Calculate number of rows
                const numRows = columns.length > 0 ? Math.floor(values.length / columns.length) : 0;
                console.log(`🔍 Calculated ${numRows} rows from ${values.length} values / ${columns.length} columns`);
                
                if (numRows > 0) {
                    // Convert flat values array to row objects
                    const result = [];
                    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                        const obj = {};
                        columns.forEach((columnName, colIndex) => {
                            const valueIndex = rowIndex * columns.length + colIndex;
                            obj[columnName] = valueIndex < values.length ? values[valueIndex] : null;
                        });
                        result.push(obj);
                    }
                    
                    console.log(`🔍 Converted to ${result.length} row objects:`, result.slice(0, 2));
                    return result;
                }
            }
            
            return [];
        } catch (error) {
            console.error(`Error querying sample data for ${measurementName}:`, error);
            return [];
        }
    }

    // Get tag keys for a measurement from Schema cache
    async getTagKeysFromSchema(measurementName, context) {
        console.log(`🔍 Getting tag keys for measurement: ${measurementName} from Schema cache`);
        
        try {
            if (typeof Schema === 'undefined') {
                console.warn('Schema service not available for tag keys lookup');
                return 'Schema service not available for tag keys lookup';
            }
            
            const tagKeys = Schema.influxTags[measurementName] || [];
            console.log(`🔍 Retrieved ${tagKeys.length} tag keys from Schema cache:`, tagKeys);
            
            if (tagKeys.length > 0) {
                const tagList = tagKeys.map(key => `• ${key}`).join('\n');
                return `**Tag keys for "${measurementName}":**\n${tagList}`;
            } else {
                return `No tag keys found for measurement "${measurementName}" in Schema cache.`;
            }
            
        } catch (error) {
            console.error(`Error getting tag keys for ${measurementName} from Schema:`, error);
            return `Error retrieving tag keys for "${measurementName}": ${error.message}`;
        }
    }

    // Get all measurements from Schema cache
    async getAllMeasurementsFromSchema(context) {
        console.log(`🔍 Getting all measurements from Schema cache`);
        
        try {
            if (typeof Schema === 'undefined') {
                console.warn('Schema service not available for measurements lookup');
                return 'Schema service not available for measurements lookup';
            }
            
            const measurements = Schema.influxMeasurements || [];
            console.log(`🔍 Retrieved ${measurements.length} measurements from Schema cache`);
            
            if (measurements.length > 0) {
                const measurementList = measurements.slice(0, 20).map(m => `• ${m}`).join('\n');
                const remaining = measurements.length > 20 ? `\n\n...and ${measurements.length - 20} more measurements` : '';
                return `**Available Measurements (showing first 20):**\n${measurementList}${remaining}`;
            } else {
                return 'No measurements found in Schema cache. Make sure schema is loaded.';
            }
            
        } catch (error) {
            console.error(`Error getting measurements from Schema:`, error);
            return `Error retrieving measurements: ${error.message}`;
        }
    }

    // Get retention policies from Schema cache
    async getRetentionPoliciesFromSchema(context) {
        console.log(`🔍 Getting retention policies from Schema cache`);
        
        try {
            if (typeof Schema === 'undefined') {
                console.warn('Schema service not available for retention policy lookup');
                return 'Schema service not available for retention policy lookup';
            }
            
            const policies = Schema.influxRetentionPolicies || [];
            console.log(`🔍 Retrieved ${policies.length} retention policies from Schema cache:`, policies);
            
            if (policies.length > 0) {
                const policyList = policies.map(p => `• ${p}`).join('\n');
                return `**Available Retention Policies:**\n${policyList}`;
            } else {
                return 'No retention policies found in Schema cache. Make sure schema is loaded.';
            }
            
        } catch (error) {
            console.error(`Error getting retention policies from Schema:`, error);
            return `Error retrieving retention policies: ${error.message}`;
        }
    }

    // Try to get sample data using Schema retention policies
    async trySampleDataWithRetentionPolicies(measurementName) {
        console.log(`🔄 Trying sample data with Schema retention policies for: ${measurementName}`);
        
        if (typeof Schema === 'undefined') {
            console.log(`❌ Schema service not available`);
            return [];
        }
        
        const policies = Schema.influxRetentionPolicies || [];
        
        if (policies.length === 0) {
            console.log(`❌ No retention policies found in Schema`);
            return [];
        }
        
        for (const policy of policies) {
            try {
                console.log(`🔄 Trying sample data query with retention policy: ${policy}`);
                const fullMeasurementName = `"${policy}"."${measurementName}"`;
                const query = `SELECT * FROM ${fullMeasurementName} ORDER BY time DESC LIMIT 5`;
                
                const response = await this.executeQuery(query, {});
                
                // Use the same data extraction logic
                if (response && response.data && response.data.columns && response.data.values) {
                    const columns = response.data.columns;
                    const values = response.data.values;
                    
                    if (values.length > 0) {
                        console.log(`✅ Found sample data using retention policy "${policy}"`);
                        return values.map(row => {
                            const obj = {};
                            columns.forEach((col, index) => {
                                obj[col] = row[index];
                            });
                            return obj;
                        });
                    }
                }
                
            } catch (policyError) {
                console.log(`❌ Retention policy "${policy}" failed: ${policyError.message}`);
                continue;
            }
        }
        
        return [];
    }

    // Check if this is a complex request that needs AI with system command access
    isComplexRequest(query) {
        const complexKeywords = [
            'dashboard', 'grafana', 'json', 'panel', 'visualization',
            'create', 'build', 'generate', 'export', 'chart'
        ];
        const queryLower = query.toLowerCase();
        const isComplex = complexKeywords.some(keyword => queryLower.includes(keyword));
        
        console.log(`🤔 Complex request check for "${query}":`, isComplex);
        return isComplex;
    }

    // Generate complex response using AI with system command access
    async generateComplexResponse(intent, analysisResult, originalQuery) {
        console.log('🎯 Generating complex response with AI system access');
        
        // Get conversation context
        const conversationContext = this.contextManager.getConversationContext();
        
        // Build context for the AI with analysis results
        let context = `**Analysis Results:**\n`;
        if (analysisResult.success && analysisResult.metrics && analysisResult.metrics.length > 0) {
            analysisResult.metrics.forEach(metric => {
                context += `• ${metric.name}: ${metric.success ? 'success' : 'failed'}\n`;
                if (metric.success && metric.analysis) {
                    context += `  Latest: ${metric.analysis.summary.latest}\n`;
                    context += `  Count: ${metric.analysis.summary.count} data points\n`;
                }
            });
        }

        // Use the same enhanced prompt as buildSystemCommandPrompt for consistency
        const prompt = this.buildSystemCommandPrompt('complex_ai_response', intent, analysisResult, originalQuery);

        try {
            const aiResponse = await this.callAIModel(prompt);
            
            // Check if AI is requesting system information
            if (this.isSystemCommand(aiResponse)) {
                // Pass full context including all available metrics
                const fullContext = {
                    availableMetrics: window.Schema?.measurements || intent.metrics || [],
                    intent: intent,
                    analysisResult: analysisResult
                };
                const commandResult = await this.executeSystemCommand(aiResponse, fullContext);
                
                // Call AI again with the command result
                const enhancedPrompt = prompt + `\n\n**SYSTEM RESPONSE:**\n${commandResult}\n\nNow please provide your complete response to the user:`;
                const finalResponse = await this.callAIModel(enhancedPrompt);
                
                return {
                    text: finalResponse,
                    data: { 
                        type: 'complex_ai_response', 
                        intent, 
                        usedSystemCommands: true,
                        originalQuery 
                    }
                };
            } else {
                return {
                    text: aiResponse,
                    data: { 
                        type: 'complex_ai_response', 
                        intent, 
                        usedSystemCommands: false,
                        originalQuery 
                    }
                };
            }
        } catch (error) {
            console.error('❌ Complex AI response generation failed:', error);
            return {
                text: `❌ **AI Service Error**\n\nI couldn't generate a detailed response due to: ${error.message}`,
                data: { type: 'ai_error', intent, error: error.message }
            };
        }
    }

    // Generate response with system command support
    async generateResponseWithSystemCommands(responseType, intent, analysisResult, originalQuery) {
        console.log(`🎯 Generating ${responseType} response with system command support`);
        
        // First, try to generate response using AI with system command access
        try {
            const prompt = this.buildSystemCommandPrompt(responseType, intent, analysisResult, originalQuery);
            const aiResponse = await this.callAIModel(prompt);
            
            // Check if AI is requesting system information
            if (this.isSystemCommand(aiResponse)) {
                console.log('🤖 AI requested system command, executing...');
                const fullContext = {
                    availableMetrics: window.Schema?.measurements || intent.metrics || [],
                    intent: intent,
                    analysisResult: analysisResult
                };
                const commandResult = await this.executeSystemCommand(aiResponse, fullContext);
                console.log(`🔍 System command result:`, commandResult);
                
                // Call AI again with the command result
                const enhancedPrompt = prompt + `\n\n**SYSTEM RESPONSE:**\n${commandResult}\n\nNow please provide your complete response to the user:`;
                console.log(`🔍 Enhanced prompt length: ${enhancedPrompt.length} characters`);
                console.log(`🔍 Enhanced prompt preview:`, enhancedPrompt.slice(-500)); // Last 500 chars
                const finalResponse = await this.callAIModel(enhancedPrompt);
                
                return {
                    text: finalResponse,
                    data: { 
                        type: responseType + '_with_system_commands', 
                        intent, 
                        usedSystemCommands: true,
                        originalQuery 
                    }
                };
            } else {
                return {
                    text: aiResponse,
                    data: { 
                        type: responseType + '_with_ai', 
                        intent, 
                        usedSystemCommands: false,
                        originalQuery 
                    }
                };
            }
        } catch (error) {
            console.error('❌ AI system command response failed, falling back to standard:', error);
            
            // Fallback to standard response generation
            switch (responseType) {
                case 'query_data':
                    return this.generateDataQueryResponse(intent, analysisResult, originalQuery);
                case 'find_anomalies':
                    return this.generateAnomalyResponse(intent, analysisResult, originalQuery);
                case 'compare_metrics':
                    return this.generateComparisonResponse(intent, analysisResult, originalQuery);
                case 'explain_metric':
                    return this.generateExplanationResponse(intent, analysisResult, originalQuery);
                case 'get_stats':
                    return this.generateStatisticsResponse(intent, analysisResult, originalQuery);
                case 'analyze_fields':
                    return this.generateFieldAnalysisResponse(intent, analysisResult, originalQuery);
                default:
                    return this.generateBasicResponse(originalQuery, { availableMetrics: intent.metrics });
            }
        }
    }

    // Build AI prompt for system command enabled responses
    buildSystemCommandPrompt(responseType, intent, analysisResult, originalQuery) {
        const conversationContext = this.contextManager.getConversationContext();
        
        // Get current data source type from global config
        const dataSourceType = GrafanaConfig?.selectedDatasourceType || 'influxdb';
        const dataSourceName = dataSourceType === 'influxdb' ? 'InfluxDB' : 
                              dataSourceType === 'prometheus' ? 'Prometheus' : 
                              'Database';
        
        // Check if this is a Grafana dashboard request
        const isDashboardRequest = originalQuery.toLowerCase().includes('dashboard') || 
                                  originalQuery.toLowerCase().includes('grafana');
        
        // Build context based on analysis results
        let analysisContext = '';
        if (analysisResult.success && analysisResult.metrics) {
            analysisContext = `**Available Analysis Results:**\n`;
            analysisResult.metrics.forEach(metric => {
                // Check if metric has data (success) or error (failure)
                const hasData = metric.data && !metric.error;
                analysisContext += `• ${metric.name}: ${hasData ? 'Data available' : metric.error || 'No data'}\n`;
                
                // Add additional context if data is available
                if (hasData && metric.analysis && metric.analysis.summary) {
                    const summary = metric.analysis.summary;
                    if (summary.count) {
                        analysisContext += `  - ${summary.count} data points\n`;
                    }
                }
            });
        }

        // Add special dashboard generation context
        let dashboardContext = '';
        if (isDashboardRequest) {
            // Get current datasource info from GrafanaConfig
            const datasourceId = GrafanaConfig?.currentDatasourceId || 'your-datasource-uid';
            const datasourceName = GrafanaConfig?.selectedDatasourceName || 'InfluxDB';
            
            dashboardContext = `
**🎯 GRAFANA DASHBOARD GENERATION REQUIREMENTS:**

**CRITICAL DATASOURCE INFO (USE THESE EXACT VALUES):**
- Datasource UID: "${datasourceId}"
- Datasource Name: "${datasourceName}" 
- Datasource Type: "${dataSourceType}"

**MANDATORY DASHBOARD STRUCTURE:**
1. Every panel MUST include: "datasource": {"uid": "${datasourceId}", "type": "${dataSourceType}"}
2. Generate actual ${dataSourceType === 'influxdb' ? 'InfluxQL' : 'PromQL'} queries using the fields and tags from GET_SAMPLE_DATA
3. Use measurement names, field names, and tag names from the conversation
4. Set appropriate panel titles, units (bytes, count, etc.), and visualization types
5. Include proper time range and refresh configuration

**REQUIRED PANEL STRUCTURE FOR INFLUXDB:**
Each panel MUST have this exact structure:
\`\`\`json
{
  "title": "Panel Title",
  "type": "timeseries",
  "datasource": {
    "uid": "${datasourceId}",
    "type": "${dataSourceType}"
  },
  "targets": [
    {
      "datasource": {
        "uid": "${datasourceId}",
        "type": "${dataSourceType}"
      },
      "query": "SELECT mean(\\"value\\") FROM \\"measurement-name\\" WHERE $timeFilter GROUP BY time($__interval) fill(null)",
      "rawQuery": true,
      "refId": "A"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "short"
    }
  }
}
\`\`\`

**NEVER USE PLACEHOLDERS LIKE:**
- "\$datasource" 
- "Your Datasource Name"
- Empty queries
- Generic field names

**ALWAYS USE ACTUAL:**
- Real datasource UID: "${datasourceId}"
- Real measurement names from conversation  
- Real field names from GET_SAMPLE_DATA
- Real tag names for GROUP BY clauses

`;
        }
        
        return `You are a data analysis assistant responding to a user query.

${conversationContext}

**User Request:** "${originalQuery}"
**Response Type:** ${responseType}
**Data Source:** ${dataSourceName} (${dataSourceType})
**Intent:** ${JSON.stringify(intent, null, 2)}

${analysisContext}${dashboardContext}

**SYSTEM COMMANDS AVAILABLE:**
- GET_SAMPLE_DATA: measurement_name - Get actual sample data
- GET_FIELDS: measurement_name - Get field names and tags for a measurement
- GET_TAGS: measurement_name - Get only tag names for a measurement (for filtering/grouping)
- SEARCH_MEASUREMENTS: pattern - Find measurements matching a pattern

**INSTRUCTIONS:**
Provide a complete response to the user's ${responseType} request. If you need to understand data structure, field names, or sample values to give an accurate response, use the system commands first.

For dashboard/visualization requests, ALWAYS use GET_SAMPLE_DATA first to understand the data structure.

**CRITICAL**: Use ${dataSourceType === 'influxdb' ? 'InfluxQL' : dataSourceType === 'prometheus' ? 'PromQL' : 'SQL'} query syntax only since this is a ${dataSourceName} data source. Do not mix query languages.

Respond with either:
1. A system command (exact format: GET_SAMPLE_DATA: measurement_name)
2. Your complete response to the user`;
    }
    
    // Get detailed information about a specific measurement
    getMeasurementDetails(measurementName) {
        const details = {
            type: 'time_series',
            description: 'Time series measurement',
            fields: ['value'],
            tags: ['host'],
            useCase: 'General monitoring'
        };
        
        // No pattern matching - let AI analyze measurement types dynamically
        details.type = 'time_series';
        details.description = `Time series measurement: ${measurementName}`;
        details.fields = ['value', 'timestamp', 'metadata'];
        details.tags = ['host', 'environment', 'service'];
        details.useCase = 'Time series data analysis and monitoring';
        
        return details;
    }

    // Parse AI response for intent
    parseAIIntentResponse(response) {
        try {
            // Look for JSON in the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                // Fix intent type if it contains pipe characters
                if (parsed.type && parsed.type.includes('|')) {
                    // Take the most specific intent (usually the last one)
                    const types = parsed.type.split('|');
                    parsed.type = types[types.length - 1];
                    console.log('🔧 Fixed intent type from', parsed.type, 'to', types[types.length - 1]);
                }
                
                return parsed;
            }
        } catch (error) {
            console.warn('Failed to parse AI intent response:', error);
        }
        return null;
    }

    // This function was removed - no pattern matching allowed

    // Execute the parsed intent by querying real data
    async executeIntent(intent, context) {
        console.log('🔍 Executing intent:', intent.type);
        
        switch (intent.type) {
            case 'query_data':
                return await this.queryMetricData(intent, context);
            
            case 'find_anomalies':
                return await this.findAnomalies(intent, context);
                
            case 'compare_metrics':
                return await this.compareMetrics(intent, context);
                
            case 'explain_metric':
                return await this.explainMetric(intent, context);
                
            case 'list_metrics':
                return await this.listMetrics(intent, context);
                
            case 'get_stats':
                return await this.getMetricStatistics(intent, context);
                
            case 'analyze_fields':
                return await this.analyzeFields(intent, context);
                
            default:
                return await this.handleUnknownIntent(intent, context);
        }
    }

    // Query actual metric data from the datasource
    async queryMetricData(intent, context) {
        const results = {
            type: 'data_query',
            metrics: [],
            success: false,
            error: null
        };

        if (intent.metrics.length === 0) {
            results.error = 'No specific metrics mentioned';
            return results;
        }

        console.log(`📊 Intent metrics to analyze:`, intent.metrics);
        
        for (const metric of intent.metrics) {
            try {
                console.log(`📊 Querying data for metric: ${metric}`);
                
                // Build InfluxQL query based on intent
                const query = this.buildInfluxQuery(metric, intent);
                console.log(`🔤 Generated query: ${query}`);
                
                // Execute the query using the existing API
                const queryResult = await this.executeQuery(query, context);
                
                console.log(`🔍 Analysis query result for ${metric}:`, JSON.stringify(queryResult, null, 2));
                
                if (queryResult && queryResult.data) {
                    // Analyze the data
                    const analysis = this.analyzeQueryData(queryResult.data, intent.operation);
                    
                    results.metrics.push({
                        name: metric,
                        data: queryResult.data,
                        analysis: analysis,
                        query: query
                    });
                    results.success = true;
                }
                
            } catch (error) {
                console.error(`Error querying ${metric}:`, error);
                results.metrics.push({
                    name: metric,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Build InfluxQL query based on intent
    buildInfluxQuery(metric, intent) {
        let query = `SELECT `;
        
        // Add aggregation based on operation
        switch (intent.operation) {
            case 'mean':
                query += `mean(*)`;
                break;
            case 'max':
                query += `max(*)`;
                break;
            case 'min':
                query += `min(*)`;
                break;
            case 'sum':
                query += `sum(*)`;
                break;
            case 'count':
                query += `count(*)`;
                break;
            default:
                query += `*`;
        }
        
        query += ` FROM "${metric}"`;
        
        // Add time filter using $timeFilter (Grafana format)
        if (intent.timeRange === '1h') {
            query += ` WHERE time > now() - 1h`;
        } else if (intent.timeRange === '24h') {
            query += ` WHERE time > now() - 24h`;
        } else if (intent.timeRange === '7d') {
            query += ` WHERE time > now() - 7d`;
        } else {
            query += ` WHERE time > now() - 24h`; // default
        }
        
        // Add GROUP BY for aggregations
        if (['mean', 'max', 'min', 'sum', 'count'].includes(intent.operation)) {
            const interval = intent.timeRange === '1h' ? '5m' : intent.timeRange === '24h' ? '1h' : '1d';
            query += ` GROUP BY time(${interval}) fill(null)`;
        }
        
        // Limit results
        query += ` LIMIT 1000`;
        
        return query;
    }

    // Execute query using existing API infrastructure
    async executeQuery(query, context) {
        try {
            console.log('🚀 Executing query:', query);
            
            // Use the centralized query execution API (no DOM dependencies)
            if (typeof Queries !== 'undefined' && Queries.executeQueryDirect) {
                console.log('📊 Using centralized Queries.executeQueryDirect...');
                const result = await Queries.executeQueryDirect(query, {
                    datasourceId: GrafanaConfig?.currentDatasourceId,
                    datasourceType: GrafanaConfig?.selectedDatasourceType || 'influxdb',
                    timeFromHours: 168, // 7 days for anomaly analysis
                    timeToHours: 0,     // to now
                    maxDataPoints: 2000,
                    intervalMs: 300000  // 5 minute intervals
                });
                
                if (result && result.results && result.results.A && result.results.A.frames && result.results.A.frames.length > 0) {
                    // Format the result to match expected structure
                    const frame = result.results.A.frames[0];
                    if (frame.data && frame.data.values && frame.schema && frame.schema.fields) {
                        const columns = frame.schema.fields.map(field => field.name);
                        const values = frame.data.values[0] || [];
                        return {
                            data: {
                                columns: columns,
                                values: values
                            }
                        };
                    }
                }
                
                return result;
            }
            
            // Fallback: direct API call
            if (typeof API !== 'undefined' && GrafanaConfig?.connected) {
                console.log('📡 Using direct API call...');
                const url = `/api/datasources/proxy/${GrafanaConfig.currentDatasourceId}/query`;
                
                const response = await API.makeApiRequest(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Grafana-URL': GrafanaConfig.url
                    },
                    body: `db=${GrafanaConfig.database || 'default'}&q=${encodeURIComponent(query)}&epoch=ms`
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.results && data.results.A && data.results.A.frames && data.results.A.frames.length > 0) {
                        const frame = data.results.A.frames[0];
                        if (frame.data && frame.data.values && frame.schema && frame.schema.fields) {
                            const columns = frame.schema.fields.map(field => field.name);
                            const values = frame.data.values[0] || [];
                            return {
                                data: {
                                    columns: columns,
                                    values: values
                                }
                            };
                        }
                    }
                    return data;
                }
            }
            
            throw new Error('No query execution method available. Please ensure you are connected to a datasource.');
            
        } catch (error) {
            console.error('Query execution failed:', error);
            throw error;
        }
    }

    // Analyze query results to extract insights
    analyzeQueryData(data, operation) {
        const analysis = {
            operation: operation,
            summary: {},
            insights: [],
            trends: []
        };

        console.log('🔍 analyzeQueryData input:', JSON.stringify(data, null, 2));
        
        if (!data || !data.values || data.values.length === 0) {
            console.log('❌ analyzeQueryData: No data.values found');
            analysis.insights.push('No data points found for the specified time range');
            return analysis;
        }

        // Handle both response formats: flat array and array of arrays
        let values = [];
        if (data.columns && data.columns.length > 0) {
            // Old format: {columns: ["Time", "Value"], values: [time1, value1, time2, value2, ...]}
            const numColumns = data.columns.length;
            const valueColumnIndex = data.columns.findIndex(col => col.toLowerCase().includes('value')) || 1;
            
            for (let i = valueColumnIndex; i < data.values.length; i += numColumns) {
                const value = data.values[i];
                if (value !== null && !isNaN(value)) {
                    values.push(value);
                }
            }
        } else {
            // New format: values is array of arrays [[time, value], [time, value], ...]
            values = data.values.map(row => row[1]).filter(val => val !== null && !isNaN(val));
        }
        
        console.log('🔍 analyzeQueryData extracted values:', values);
        
        if (values.length === 0) {
            console.log('❌ analyzeQueryData: No valid numeric values found');
            analysis.insights.push('No valid numeric values found');
            return analysis;
        }

        // Calculate basic statistics
        analysis.summary = {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            mean: values.reduce((a, b) => a + b, 0) / values.length,
            latest: values[values.length - 1]
        };

        // Generate insights based on the data
        if (analysis.summary.max > analysis.summary.mean * 3) {
            analysis.insights.push(`Detected potential spike: maximum value (${analysis.summary.max.toFixed(2)}) is significantly higher than average`);
        }

        if (analysis.summary.latest > analysis.summary.mean * 1.5) {
            analysis.insights.push(`Current value (${analysis.summary.latest.toFixed(2)}) is above average (${analysis.summary.mean.toFixed(2)})`);
        } else if (analysis.summary.latest < analysis.summary.mean * 0.5) {
            analysis.insights.push(`Current value (${analysis.summary.latest.toFixed(2)}) is below average (${analysis.summary.mean.toFixed(2)})`);
        }

        // Trend analysis for time series
        if (values.length > 10) {
            const firstHalf = values.slice(0, Math.floor(values.length / 2));
            const secondHalf = values.slice(Math.floor(values.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            
            if (secondAvg > firstAvg * 1.1) {
                analysis.trends.push('Increasing trend detected');
            } else if (secondAvg < firstAvg * 0.9) {
                analysis.trends.push('Decreasing trend detected');
            } else {
                analysis.trends.push('Stable trend');
            }
        }

        return analysis;
    }

    // Generate intelligent response based on actual data analysis
    async generateIntelligentResponse(intent, analysisResult, originalQuery) {
        console.log('🧠 Generating intelligent response for:', intent.type);
        
        if (!analysisResult.success && analysisResult.error) {
            return {
                text: `I encountered an issue analyzing your request: ${analysisResult.error}. Let me help you rephrase or try a different approach.`,
                data: { type: 'error', intent, error: analysisResult.error }
            };
        }

        // For complex requests like dashboard creation, use AI with system command access
        if (this.isComplexRequest(originalQuery)) {
            console.log('🎯 Routing to complex response generation for:', originalQuery);
            return await this.generateComplexResponse(intent, analysisResult, originalQuery);
        } else {
            console.log('📝 Using standard response generation for:', originalQuery);
        }

        // Apply system command detection to all response types
        switch (intent.type) {
            case 'query_data':
                return await this.generateResponseWithSystemCommands('query_data', intent, analysisResult, originalQuery);
                
            case 'find_anomalies':
                return await this.generateResponseWithSystemCommands('find_anomalies', intent, analysisResult, originalQuery);
                
            case 'list_metrics':
                return this.generateMetricsListResponse(intent, analysisResult, originalQuery);
                
            case 'compare_metrics':
                return await this.generateResponseWithSystemCommands('compare_metrics', intent, analysisResult, originalQuery);
                
            case 'explain_metric':
                return await this.generateResponseWithSystemCommands('explain_metric', intent, analysisResult, originalQuery);
                
            case 'get_stats':
                return await this.generateResponseWithSystemCommands('get_stats', intent, analysisResult, originalQuery);
                
            case 'analyze_fields':
                return await this.generateResponseWithSystemCommands('analyze_fields', intent, analysisResult, originalQuery);
                
            default:
                return this.generateGenericDataResponse(intent, analysisResult, originalQuery);
        }
    }

    // Generate response for data queries with actual analysis
    generateDataQueryResponse(intent, analysisResult, originalQuery) {
        if (!analysisResult.success || analysisResult.metrics.length === 0) {
            return {
                text: `I couldn't retrieve data for the requested metrics. This might be because:\n\n• The metrics don't have recent data\n• There's a connectivity issue\n• The metric names need to be more specific\n\nCould you try asking about a specific metric from the available list?`,
                data: { type: 'no_data', intent }
            };
        }

        let responseText = `📊 **Analysis Results for: ${originalQuery}**\n\n`;
        
        for (const metricResult of analysisResult.metrics) {
            if (metricResult.error) {
                responseText += `❌ **${metricResult.name}**: ${metricResult.error}\n\n`;
                continue;
            }

            const { analysis } = metricResult;
            responseText += `📈 **${metricResult.name}**\n`;
            responseText += `• **Latest Value**: ${analysis.summary.latest?.toFixed(2)}\n`;
            responseText += `• **Average**: ${analysis.summary.mean?.toFixed(2)}\n`;
            responseText += `• **Range**: ${analysis.summary.min?.toFixed(2)} - ${analysis.summary.max?.toFixed(2)}\n`;
            responseText += `• **Data Points**: ${analysis.summary.count}\n`;
            
            if (analysis.insights.length > 0) {
                responseText += `\n**💡 Insights:**\n`;
                analysis.insights.forEach(insight => {
                    responseText += `• ${insight}\n`;
                });
            }
            
            if (analysis.trends.length > 0) {
                responseText += `\n**📊 Trends:**\n`;
                analysis.trends.forEach(trend => {
                    responseText += `• ${trend}\n`;
                });
            }
            
            responseText += `\n*Query: \`${metricResult.query}\`*\n\n`;
        }

        return {
            text: responseText,
            data: { 
                type: 'data_analysis', 
                intent, 
                results: analysisResult,
                metrics: analysisResult.metrics.map(m => m.name)
            },
            actions: [
                { label: 'Show Chart', action: 'visualizeData' },
                { label: 'Find Anomalies', action: 'findAnomalies' },
                { label: 'Compare with Yesterday', action: 'compareYesterday' }
            ]
        };
    }

    // Generate response for anomaly detection
    generateAnomalyResponse(intent, analysisResult, originalQuery) {
        if (!analysisResult.success || analysisResult.metrics.length === 0) {
            return {
                text: `I couldn't analyze metrics for anomalies. This might be because:\n\n• No metrics were specified or available\n• The metrics don't have sufficient recent data\n• There's a connectivity issue\n\nTry asking about specific metrics by name.`,
                data: { type: 'anomaly_error', intent }
            };
        }

        let responseText = `🔍 **Anomaly Analysis Results**\n\n`;
        let totalAnomalies = 0;
        let highSeverityCount = 0;

        for (const metricResult of analysisResult.metrics) {
            if (metricResult.error) {
                responseText += `❌ **${metricResult.name}**: ${metricResult.error}\n\n`;
                continue;
            }

            const analysis = metricResult.analysis;
            const anomalyCount = analysis.anomalies ? analysis.anomalies.length : 0;
            totalAnomalies += anomalyCount;
            
            if (analysis.severity === 'high') highSeverityCount++;

            responseText += `📊 **${metricResult.name}**\n`;
            
            if (anomalyCount === 0) {
                responseText += `✅ No anomalies detected - metric appears normal\n`;
                responseText += `• Baseline: ${analysis.baseline?.mean?.toFixed(2)} ± ${analysis.baseline?.stddev?.toFixed(2)}\n`;
            } else {
                responseText += `🚨 **${anomalyCount} anomalies detected** (${analysis.severity} severity)\n`;
                
                analysis.anomalies.forEach(anomaly => {
                    const icon = anomaly.severity === 'high' ? '🔥' :
                                 anomaly.severity === 'medium' ? '⚠️' : 'ℹ️';
                    responseText += `${icon} **${anomaly.type.replace('_', ' ')}**: ${anomaly.message}\n`;
                    
                    if (anomaly.details && anomaly.count) {
                        responseText += `   Found ${anomaly.count} instances\n`;
                    }
                });
            }
            
            if (analysis.recommendations && analysis.recommendations.length > 0) {
                responseText += `\n💡 **Recommendations:**\n`;
                analysis.recommendations.forEach(rec => {
                    responseText += `• ${rec}\n`;
                });
            }
            
            responseText += `\n*Confidence: ${(analysis.confidence * 100).toFixed(0)}%*\n\n`;
        }

        // Summary
        if (totalAnomalies === 0) {
            responseText += `✅ **Overall Status**: All monitored metrics appear normal\n`;
        } else {
            const severity = highSeverityCount > 0 ? '🔥 HIGH' :
                           totalAnomalies > analysisResult.metrics.length ? '⚠️ MEDIUM' : 'ℹ️ LOW';
            responseText += `🚨 **Overall Status**: ${totalAnomalies} anomalies detected (${severity} priority)\n`;
        }

        return {
            text: responseText,
            data: { 
                type: 'anomaly_analysis', 
                intent, 
                results: analysisResult,
                totalAnomalies,
                severity: highSeverityCount > 0 ? 'high' : totalAnomalies > 0 ? 'medium' : 'normal'
            },
            actions: [
                { label: 'Generate Alert Rules', action: 'generateAlerts' },
                { label: 'Show Detailed Charts', action: 'visualizeAnomalies' },
                { label: 'Export Report', action: 'exportAnomalyReport' }
            ]
        };
    }

    // Generate response for metrics list
    generateMetricsListResponse(intent, analysisResult, originalQuery) {
        if (!analysisResult.success || !analysisResult.metrics || analysisResult.metrics.length === 0) {
            return {
                text: `I don't see any metrics available. This might be because:\n\n• No datasource is connected\n• The connection hasn't been established\n• No measurements have been loaded\n\nPlease check your datasource connection.`,
                data: { type: 'no_metrics', intent }
            };
        }

        let responseText = `📊 **Available Metrics** (${analysisResult.metrics.length} total)\n\n`;
        
        // Group metrics by category
        const categories = {
            system: [],
            network: [],
            storage: [],
            application: [],
            custom: []
        };

        analysisResult.metrics.forEach(metric => {
            const category = metric.category || 'custom';
            categories[category].push(metric);
        });

        // Display metrics by category
        Object.entries(categories).forEach(([category, metrics]) => {
            if (metrics.length > 0) {
                const icon = {
                    system: '⚙️',
                    network: '🌐',
                    storage: '💾',
                    application: '📱',
                    custom: '📊'
                }[category];
                
                responseText += `${icon} **${category.charAt(0).toUpperCase() + category.slice(1)} Metrics** (${metrics.length})\n`;
                
                metrics.slice(0, 10).forEach(metric => {
                    responseText += `• \`${metric.name}\`\n`;
                });
                
                if (metrics.length > 10) {
                    responseText += `   ...and ${metrics.length - 10} more\n`;
                }
                responseText += `\n`;
            }
        });

        responseText += `💡 **What you can do:**\n`;
        responseText += `• Ask about specific metrics: "analyze cpu usage"\n`;
        responseText += `• Find anomalies: "find anomalies in memory metrics"\n`;
        responseText += `• Get statistics: "show stats for disk io"\n`;
        responseText += `• Compare metrics: "compare cpu and memory usage"\n`;

        return {
            text: responseText,
            data: { 
                type: 'metrics_list', 
                intent, 
                results: analysisResult,
                categories: Object.keys(categories).filter(cat => categories[cat].length > 0)
            },
            actions: [
                { label: 'Analyze System Metrics', action: 'analyzeSystemMetrics' },
                { label: 'Find All Anomalies', action: 'findAllAnomalies' },
                { label: 'Generate Dashboard', action: 'generateDashboard' }
            ]
        };
    }

    // Generate response for metric comparisons
    generateComparisonResponse(intent, analysisResult, originalQuery) {
        if (!analysisResult.success || analysisResult.comparisons.length === 0) {
            return {
                text: `I couldn't compare the requested metrics. Make sure to specify at least two metrics to compare.`,
                data: { type: 'comparison_error', intent }
            };
        }

        let responseText = `📊 **Metric Comparison Results**\n\n`;
        
        analysisResult.comparisons.forEach(comparison => {
            responseText += `🔍 **${comparison.metric1.name} vs ${comparison.metric2.name}**\n\n`;
            
            // Statistical comparison
            responseText += `📈 **Statistical Summary:**\n`;
            responseText += `• **${comparison.metric1.name}**: avg ${comparison.metric1.summary.mean.toFixed(2)}, range ${comparison.metric1.summary.min.toFixed(2)}-${comparison.metric1.summary.max.toFixed(2)}\n`;
            responseText += `• **${comparison.metric2.name}**: avg ${comparison.metric2.summary.mean.toFixed(2)}, range ${comparison.metric2.summary.min.toFixed(2)}-${comparison.metric2.summary.max.toFixed(2)}\n\n`;
            
            // Insights
            if (comparison.insights.length > 0) {
                responseText += `💡 **Key Insights:**\n`;
                comparison.insights.forEach(insight => {
                    responseText += `• ${insight}\n`;
                });
                responseText += `\n`;
            }
            
            // Recommendations
            if (comparison.recommendations.length > 0) {
                responseText += `🎯 **Recommendations:**\n`;
                comparison.recommendations.forEach(rec => {
                    responseText += `• ${rec}\n`;
                });
            }
        });

        return {
            text: responseText,
            data: { 
                type: 'metric_comparison', 
                intent, 
                results: analysisResult
            },
            actions: [
                { label: 'Show Correlation Chart', action: 'showCorrelation' },
                { label: 'Analyze Trends', action: 'analyzeTrends' }
            ]
        };
    }

    // Generate response for metric explanations
    generateExplanationResponse(intent, analysisResult, originalQuery) {
        if (!analysisResult.success || analysisResult.explanations.length === 0) {
            return {
                text: `I couldn't provide explanations for the requested metrics. Please specify which metrics you'd like me to explain.`,
                data: { type: 'explanation_error', intent }
            };
        }

        let responseText = `📖 **Metric Explanations**\n\n`;
        
        analysisResult.explanations.forEach(explanation => {
            if (explanation.error) {
                responseText += `❌ **${explanation.metric}**: ${explanation.error}\n\n`;
                return;
            }

            responseText += `📊 **${explanation.metric}**\n`;
            responseText += `${explanation.description}\n\n`;
            
            responseText += `**Type**: ${explanation.type}\n`;
            responseText += `**Unit**: ${explanation.unit}\n`;
            responseText += `**Context**: ${explanation.context}\n\n`;
            
            if (explanation.commonPatterns.length > 0) {
                responseText += `🔍 **Common Patterns:**\n`;
                explanation.commonPatterns.forEach(pattern => {
                    responseText += `• ${pattern}\n`;
                });
                responseText += `\n`;
            }
            
            if (explanation.relatedMetrics.length > 0) {
                responseText += `🔗 **Related Metrics**: ${explanation.relatedMetrics.join(', ')}\n\n`;
            }
        });

        return {
            text: responseText,
            data: { 
                type: 'metric_explanation', 
                intent, 
                results: analysisResult
            },
            actions: [
                { label: 'Analyze Related Metrics', action: 'analyzeRelated' },
                { label: 'Generate Query Examples', action: 'generateExamples' }
            ]
        };
    }

    // Generate response for field analysis
    generateFieldAnalysisResponse(intent, analysisResult, originalQuery) {
        if (!analysisResult.success) {
            return {
                text: `❌ **Field Analysis Failed**\n\nI couldn't analyze the fields in the "${analysisResult.measurement}" measurement.\n\n**Error:** ${analysisResult.error || 'Unknown error occurred'}\n\nPlease check that the measurement exists and you have access to it.`,
                data: { type: 'field_analysis_error', intent, error: analysisResult.error }
            };
        }

        // Return the smart analysis directly (don't override it with field dumps)
        return {
            text: analysisResult.analysis || `🔍 **Field Analysis Complete**\n\nAnalyzed ${analysisResult.fields?.length || 0} fields in the "${analysisResult.measurement}" measurement.`,
            data: { 
                type: 'field_analysis', 
                intent, 
                results: analysisResult,
                measurement: analysisResult.measurement,
                fields: analysisResult.fields
            },
            actions: [
                { label: 'Query Sample Data', action: 'querySampleData', data: { measurement: analysisResult.measurement } },
                { label: 'Show Field Statistics', action: 'showFieldStats', data: { measurement: analysisResult.measurement } },
                { label: 'List Related Measurements', action: 'listRelatedMeasurements' }
            ]
        };
    }

    // Generate response for statistics
    generateStatisticsResponse(intent, analysisResult, originalQuery) {
        if (!analysisResult.success || analysisResult.statistics.length === 0) {
            return {
                text: `I couldn't generate statistics for the requested metrics. Please specify which metrics you'd like statistics for.`,
                data: { type: 'statistics_error', intent }
            };
        }

        let responseText = `📈 **Detailed Statistics**\n\n`;
        
        analysisResult.statistics.forEach(stats => {
            if (stats.error) {
                responseText += `❌ **${stats.metric}**: ${stats.error}\n\n`;
                return;
            }

            responseText += `📊 **${stats.metric}**\n\n`;
            
            // Summary statistics
            responseText += `**Summary Statistics:**\n`;
            responseText += `• Mean: ${stats.summary.mean?.toFixed(2)}\n`;
            responseText += `• Median: ${stats.summary.median?.toFixed(2)}\n`;
            responseText += `• Std Dev: ${stats.summary.stddev?.toFixed(2)}\n`;
            responseText += `• Min/Max: ${stats.summary.min?.toFixed(2)} / ${stats.summary.max?.toFixed(2)}\n`;
            responseText += `• 95th Percentile: ${stats.summary.percentile95?.toFixed(2)}\n`;
            responseText += `• Data Points: ${stats.summary.count}\n\n`;
            
            // Distribution info
            if (stats.distribution) {
                responseText += `**Distribution:**\n`;
                responseText += `• Range: ${stats.distribution.range?.toFixed(2)}\n`;
                responseText += `• Coefficient of Variation: ${(stats.distribution.coefficientOfVariation * 100)?.toFixed(1)}%\n`;
                responseText += `• Skewness: ${stats.distribution.skewness?.toFixed(2)}\n\n`;
            }
            
            // Data quality
            if (stats.quality) {
                responseText += `**Data Quality:**\n`;
                responseText += `• Completeness: ${(stats.quality.completeness * 100)?.toFixed(1)}%\n`;
                responseText += `• Reliability: ${stats.quality.reliability}\n\n`;
            }
        });

        return {
            text: responseText,
            data: { 
                type: 'detailed_statistics', 
                intent, 
                results: analysisResult
            },
            actions: [
                { label: 'Generate Report', action: 'generateStatsReport' },
                { label: 'Show Distribution Chart', action: 'showDistribution' }
            ]
        };
    }

    // Handle other intent types
    async findAnomalies(intent, context) {
        const results = {
            type: 'anomaly_detection',
            metrics: [],
            success: false,
            anomalies: [],
            error: null
        };

        // If no specific metrics mentioned, analyze all available metrics
        const metricsToAnalyze = intent.metrics.length > 0 ? intent.metrics : context.availableMetrics.slice(0, 5);
        
        if (metricsToAnalyze.length === 0) {
            results.error = 'No metrics available for anomaly analysis';
            return results;
        }

        for (const metric of metricsToAnalyze) {
            try {
                console.log(`🔍 Analyzing ${metric} for anomalies...`);
                
                // Build query to get recent data with higher resolution
                const query = this.buildAnomalyDetectionQuery(metric, intent);
                const queryResult = await this.executeQuery(query, context);
                
                if (queryResult && queryResult.data) {
                    const anomalyAnalysis = this.performAnomalyDetection(queryResult.data, metric);
                    
                    results.metrics.push({
                        name: metric,
                        data: queryResult.data,
                        analysis: anomalyAnalysis,
                        query: query
                    });
                    
                    if (anomalyAnalysis.anomalies.length > 0) {
                        results.anomalies.push(...anomalyAnalysis.anomalies.map(a => ({ 
                            ...a, 
                            metric: metric 
                        })));
                    }
                    
                    results.success = true;
                }
                
            } catch (error) {
                console.error(`Error analyzing ${metric} for anomalies:`, error);
                results.metrics.push({
                    name: metric,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Build query optimized for anomaly detection
    buildAnomalyDetectionQuery(metric, intent) {
        // Use higher resolution and longer time range for better anomaly detection
        const timeRange = intent.timeRange === '1h' ? '6h' : intent.timeRange === '24h' ? '7d' : '30d';
        const interval = timeRange === '6h' ? '30s' : timeRange === '7d' ? '5m' : '1h';
        
        return `SELECT mean(*), stddev(*) FROM "${metric}" WHERE time > now() - ${timeRange} GROUP BY time(${interval}) fill(null) LIMIT 2000`;
    }

    // Perform sophisticated anomaly detection
    performAnomalyDetection(data, metricName) {
        const analysis = {
            metric: metricName,
            anomalies: [],
            patterns: [],
            severity: 'normal',
            confidence: 0,
            baseline: {},
            recommendations: []
        };

        if (!data || !data.values || data.values.length < 10) {
            analysis.anomalies.push({
                type: 'insufficient_data',
                message: 'Not enough data points for reliable anomaly detection',
                severity: 'info'
            });
            return analysis;
        }

        const values = data.values.map(row => {
            return {
                time: row[0],
                value: row[1],
                stddev: row[2] || 0
            };
        }).filter(v => v.value !== null && !isNaN(v.value));

        if (values.length === 0) {
            analysis.anomalies.push({
                type: 'no_valid_data',
                message: 'No valid numeric values found',
                severity: 'warning'
            });
            return analysis;
        }

        // Calculate baseline statistics
        const numericValues = values.map(v => v.value);
        const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
        const stdDev = Math.sqrt(variance);
        
        analysis.baseline = {
            mean: mean,
            stddev: stdDev,
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            count: numericValues.length
        };

        // Detect statistical anomalies (values beyond 2.5 standard deviations)
        const threshold = 2.5;
        const anomalousPoints = values.filter(v => 
            Math.abs(v.value - mean) > threshold * stdDev
        );

        if (anomalousPoints.length > 0) {
            analysis.anomalies.push({
                type: 'statistical_outlier',
                message: `Found ${anomalousPoints.length} statistical outliers`,
                severity: anomalousPoints.length > numericValues.length * 0.1 ? 'high' : 'medium',
                details: anomalousPoints.slice(0, 5).map(p => ({
                    time: p.time,
                    value: p.value.toFixed(2),
                    deviation: ((p.value - mean) / stdDev).toFixed(2) + 'σ'
                })),
                count: anomalousPoints.length
            });
        }

        // Detect spikes (sudden increases)
        const spikes = [];
        for (let i = 1; i < values.length; i++) {
            const current = values[i].value;
            const previous = values[i - 1].value;
            
            if (previous > 0 && current > previous * 3) {
                spikes.push({
                    time: values[i].time,
                    value: current,
                    previousValue: previous,
                    ratio: (current / previous).toFixed(2)
                });
            }
        }

        if (spikes.length > 0) {
            analysis.anomalies.push({
                type: 'spike_detection',
                message: `Detected ${spikes.length} significant spikes`,
                severity: 'high',
                details: spikes.slice(0, 3),
                count: spikes.length
            });
        }

        // Detect flatlines (no variation)
        const recentValues = numericValues.slice(-20); // Last 20 points
        const recentStdDev = Math.sqrt(
            recentValues.reduce((acc, val) => {
                const recentMean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
                return acc + Math.pow(val - recentMean, 2);
            }, 0) / recentValues.length
        );

        if (recentValues.length > 10 && recentStdDev < mean * 0.01) {
            analysis.anomalies.push({
                type: 'flatline_detection',
                message: 'Metric appears to be flatlining (no variation)',
                severity: 'medium',
                details: {
                    recentStdDev: recentStdDev.toFixed(4),
                    expectedVariation: (mean * 0.01).toFixed(4)
                }
            });
        }

        // Calculate overall severity
        const highSeverityCount = analysis.anomalies.filter(a => a.severity === 'high').length;
        const mediumSeverityCount = analysis.anomalies.filter(a => a.severity === 'medium').length;
        
        if (highSeverityCount > 0) {
            analysis.severity = 'high';
        } else if (mediumSeverityCount > 0) {
            analysis.severity = 'medium';
        } else if (analysis.anomalies.length > 0) {
            analysis.severity = 'low';
        }

        // Generate recommendations
        if (analysis.anomalies.length === 0) {
            analysis.recommendations.push('No anomalies detected. Metric appears to be operating normally.');
        } else {
            analysis.recommendations.push('Review the detected anomalies and consider setting up alerts for similar patterns.');
            if (spikes.length > 0) {
                analysis.recommendations.push('Investigate the cause of the detected spikes - they may indicate capacity issues or unusual load.');
            }
        }

        analysis.confidence = Math.min(0.9, Math.max(0.3, numericValues.length / 100));
        
        return analysis;
    }

    async compareMetrics(intent, context) {
        const results = {
            type: 'metric_comparison',
            comparisons: [],
            success: false,
            error: null
        };

        if (intent.metrics.length < 2) {
            results.error = 'Need at least two metrics to compare';
            return results;
        }

        // Compare the first two metrics
        const metric1 = intent.metrics[0];
        const metric2 = intent.metrics[1];

        try {
            const query1 = this.buildInfluxQuery(metric1, intent);
            const query2 = this.buildInfluxQuery(metric2, intent);
            
            const [result1, result2] = await Promise.all([
                this.executeQuery(query1, context),
                this.executeQuery(query2, context)
            ]);

            if (result1 && result1.data && result2 && result2.data) {
                const analysis1 = this.analyzeQueryData(result1.data, intent.operation);
                const analysis2 = this.analyzeQueryData(result2.data, intent.operation);
                
                const comparison = this.compareMetricAnalyses(metric1, analysis1, metric2, analysis2);
                
                results.comparisons.push(comparison);
                results.success = true;
            }
            
        } catch (error) {
            console.error('Error comparing metrics:', error);
            results.error = error.message;
        }

        return results;
    }

    compareMetricAnalyses(metric1, analysis1, metric2, analysis2) {
        const comparison = {
            metric1: { name: metric1, ...analysis1 },
            metric2: { name: metric2, ...analysis2 },
            insights: [],
            correlations: [],
            recommendations: []
        };

        // Compare means
        const meanRatio = analysis1.summary.mean / analysis2.summary.mean;
        if (meanRatio > 1.5) {
            comparison.insights.push(`${metric1} has ${meanRatio.toFixed(1)}x higher average than ${metric2}`);
        } else if (meanRatio < 0.67) {
            comparison.insights.push(`${metric2} has ${(1/meanRatio).toFixed(1)}x higher average than ${metric1}`);
        } else {
            comparison.insights.push(`${metric1} and ${metric2} have similar average values`);
        }

        // Compare variability
        const range1 = analysis1.summary.max - analysis1.summary.min;
        const range2 = analysis2.summary.max - analysis2.summary.min;
        
        if (range1 > range2 * 2) {
            comparison.insights.push(`${metric1} shows much higher variability than ${metric2}`);
        } else if (range2 > range1 * 2) {
            comparison.insights.push(`${metric2} shows much higher variability than ${metric1}`);
        }

        return comparison;
    }

    async explainMetric(intent, context) {
        const results = {
            type: 'metric_explanation',
            explanations: [],
            success: false,
            error: null
        };

        if (intent.metrics.length === 0) {
            results.error = 'No metric specified for explanation';
            return results;
        }

        for (const metric of intent.metrics) {
            try {
                const explanation = await this.generateMetricExplanation(metric, context);
                results.explanations.push(explanation);
                results.success = true;
            } catch (error) {
                console.error(`Error explaining metric ${metric}:`, error);
                results.explanations.push({
                    metric: metric,
                    error: error.message
                });
            }
        }

        return results;
    }

    async generateMetricExplanation(metric, context) {
        const explanation = {
            metric: metric,
            description: '',
            type: 'unknown',
            unit: 'unknown',
            context: '',
            commonPatterns: [],
            relatedMetrics: []
        };

        // Pattern-based metric classification
        const lowerMetric = metric.toLowerCase();
        
        if (lowerMetric.includes('cpu') || lowerMetric.includes('processor')) {
            explanation.type = 'system_resource';
            explanation.description = 'CPU utilization or processing metrics';
            explanation.unit = 'percentage or count';
            explanation.context = 'System performance monitoring';
            explanation.commonPatterns = ['High values may indicate processing bottlenecks', 'Spikes often correlate with increased workload'];
        } else if (lowerMetric.includes('memory') || lowerMetric.includes('ram')) {
            explanation.type = 'system_resource';
            explanation.description = 'Memory usage and allocation metrics';
            explanation.unit = 'bytes or percentage';
            explanation.context = 'System resource monitoring';
            explanation.commonPatterns = ['Gradual increases may indicate memory leaks', 'Sudden drops often indicate garbage collection'];
        } else if (lowerMetric.includes('disk') || lowerMetric.includes('storage')) {
            explanation.type = 'system_resource';
            explanation.description = 'Disk usage, I/O operations, or storage metrics';
            explanation.unit = 'bytes, IOPS, or percentage';
            explanation.context = 'Storage performance monitoring';
            explanation.commonPatterns = ['High I/O may indicate database activity', 'Storage growth trends help with capacity planning'];
        } else if (lowerMetric.includes('network') || lowerMetric.includes('bandwidth')) {
            explanation.type = 'network';
            explanation.description = 'Network traffic, bandwidth, or connectivity metrics';
            explanation.unit = 'bytes per second or packets';
            explanation.context = 'Network performance monitoring';
            explanation.commonPatterns = ['Traffic spikes may correlate with user activity', 'Dropped packets indicate network issues'];
        } else if (lowerMetric.includes('request') || lowerMetric.includes('response')) {
            explanation.type = 'application';
            explanation.description = 'Application request/response metrics';
            explanation.unit = 'count or milliseconds';
            explanation.context = 'Application performance monitoring';
            explanation.commonPatterns = ['Response time increases may indicate performance degradation', 'Request volume correlates with user activity'];
        } else {
            explanation.description = `Time series metric: ${metric}`;
            explanation.context = 'Custom application or system metric';
        }

        // Find related metrics in the same context
        explanation.relatedMetrics = context.availableMetrics.filter(m => 
            m !== metric && (
                m.toLowerCase().includes(explanation.type) ||
                this.shareCommonWords(metric, m)
            )
        ).slice(0, 3);

        return explanation;
    }

    shareCommonWords(metric1, metric2) {
        const words1 = metric1.toLowerCase().split(/[._-]/);
        const words2 = metric2.toLowerCase().split(/[._-]/);
        return words1.some(word => words2.includes(word) && word.length > 2);
    }

    async getMetricStatistics(intent, context) {
        const results = {
            type: 'metric_statistics',
            statistics: [],
            success: false,
            error: null
        };

        if (intent.metrics.length === 0) {
            results.error = 'No metrics specified for statistics';
            return results;
        }

        for (const metric of intent.metrics) {
            try {
                // Build comprehensive statistics query
                const query = `SELECT 
                    mean(*) as avg_value,
                    median(*) as median_value,
                    stddev(*) as stddev_value,
                    min(*) as min_value,
                    max(*) as max_value,
                    count(*) as count_value,
                    percentile(*, 95) as p95_value
                FROM "${metric}" 
                WHERE time > now() - ${intent.timeRange}`;
                
                const queryResult = await this.executeQuery(query, context);
                
                if (queryResult && queryResult.data && queryResult.data.values) {
                    const stats = this.extractDetailedStatistics(queryResult.data, metric);
                    results.statistics.push(stats);
                    results.success = true;
                }
                
            } catch (error) {
                console.error(`Error getting statistics for ${metric}:`, error);
                results.statistics.push({
                    metric: metric,
                    error: error.message
                });
            }
        }

        return results;
    }

    extractDetailedStatistics(data, metricName) {
        const stats = {
            metric: metricName,
            summary: {},
            distribution: {},
            trends: {},
            quality: {}
        };

        if (data.values && data.values.length > 0) {
            const values = data.values[0]; // Aggregated results are in first row
            
            stats.summary = {
                mean: values[1] || 0,
                median: values[2] || 0,
                stddev: values[3] || 0,
                min: values[4] || 0,
                max: values[5] || 0,
                count: values[6] || 0,
                percentile95: values[7] || 0
            };

            // Calculate additional metrics
            stats.distribution = {
                range: stats.summary.max - stats.summary.min,
                coefficientOfVariation: stats.summary.mean > 0 ? (stats.summary.stddev / stats.summary.mean) : 0,
                skewness: this.calculateSkewness(stats.summary)
            };

            // Data quality assessment
            stats.quality = {
                completeness: stats.summary.count > 0 ? 1.0 : 0.0,
                variability: stats.distribution.coefficientOfVariation,
                reliability: stats.summary.count >= 100 ? 'high' : stats.summary.count >= 20 ? 'medium' : 'low'
            };
        }

        return stats;
    }

    calculateSkewness(summary) {
        // Simplified skewness calculation using mode approximation
        if (summary.stddev === 0) return 0;
        return (3 * (summary.mean - summary.median)) / summary.stddev;
    }

    // Analyze specific measurement fields to answer targeted questions
    async analyzeFields(intent, context) {
        console.log('🔍 Analyzing fields for measurement:', intent.metrics);
        
        const results = {
            type: 'field_analysis',
            success: false,
            measurement: intent.metrics[0], // Focus on first measurement specified
            fields: [],
            analysis: null,
            error: null
        };

        if (!intent.metrics || intent.metrics.length === 0) {
            results.error = 'No measurement specified for field analysis';
            return results;
        }

        const measurement = intent.metrics[0];
        
        try {
            // Query to discover all fields in the measurement
            const fieldsQuery = `SHOW FIELD KEYS FROM "${measurement}"`;
            console.log(`🔍 Discovering fields in ${measurement}:`, fieldsQuery);
            
            const fieldsResult = await this.executeQuery(fieldsQuery, context);
            
            console.log('🔍 Raw SHOW FIELD KEYS result:', JSON.stringify(fieldsResult, null, 2));
            
            if (fieldsResult && fieldsResult.data && fieldsResult.data.values) {
                console.log('🔍 Field result data structure:', {
                    columns: fieldsResult.data.columns,
                    values: fieldsResult.data.values.slice(0, 5), // Show first 5 for debugging
                    totalRows: fieldsResult.data.values.length
                });
                
                // Extract field names from the result
                // The values array contains strings directly, not nested arrays
                const allFieldNames = fieldsResult.data.values.filter(Boolean);
                console.log('🔍 Extracted field names (first 10):', allFieldNames.slice(0, 10));
                
                // Remove duplicates and limit to manageable number
                const fieldNames = [...new Set(allFieldNames)].slice(0, 20);
                results.fields = allFieldNames; // Store all fields for analysis
                
                if (fieldNames.length > 0) {
                    // Analyze field names directly without sampling data to avoid query issues
                    console.log(`🔍 Analyzing field names directly for ${measurement}`);
                    
                    // Analyze the fields in context of the user's question
                    results.analysis = await this.analyzeFieldsForContext(measurement, allFieldNames, null, intent.question);
                    results.success = true;
                }
            }
            
        } catch (error) {
            console.error(`Error analyzing fields for ${measurement}:`, error);
            results.error = error.message;
        }

        return results;
    }

    // Analyze fields in the context of the user's specific question using AI
    async analyzeFieldsForContext(measurement, fieldNames, sampleData, userQuestion) {
        console.log('🧠 Analyzing fields in context:', { measurement, fieldNames: fieldNames.length, userQuestion });
        
        // Always send all fields to AI for genuine analysis - no pre-filtering or pattern matching
        console.log(`🔍 Sending all ${fieldNames.length} fields to AI for genuine analysis`);
        
        // Get conversation context
        const conversationContext = this.contextManager.getConversationContext();
        
        // Get current data source type from global config
        const dataSourceType = GrafanaConfig?.selectedDatasourceType || 'influxdb';
        const dataSourceName = dataSourceType === 'influxdb' ? 'InfluxDB' : 
                              dataSourceType === 'prometheus' ? 'Prometheus' : 
                              'Database';
        
        // Build prompt for AI to analyze ALL fields genuinely
        const prompt = `You are analyzing time series data fields for a user's specific question.

${conversationContext}

**User's Question:** "${userQuestion}"
**Measurement:** ${measurement}
**Data Source:** ${dataSourceName} (${dataSourceType})
**Available Fields:** ${fieldNames.join(', ')}

Please analyze ALL the available fields and provide:

1. **Identifies relevant fields** for the user's question (considering conversation history)
2. **Explains what each relevant field contains** 
3. **Answers the user's specific question** about these fields
4. **Suggests specific fields to query** for analysis
5. **Provides ${dataSourceType === 'influxdb' ? 'InfluxQL' : dataSourceType === 'prometheus' ? 'PromQL' : 'SQL'} query examples** (NOT other query languages)

Use **markdown formatting** with:
- Headers (##)
- **Bold text** for emphasis
- Code blocks for queries
- Bullet points for lists

**CRITICAL**: Only provide ${dataSourceType === 'influxdb' ? 'InfluxQL' : dataSourceType === 'prometheus' ? 'PromQL' : 'SQL'} query examples since this is a ${dataSourceName} data source. Do not mix query syntaxes.

Be specific and actionable - analyze the actual field names provided above and reference previous conversation when relevant.`;

        try {
            const analysis = await this.callAIModel(prompt);
            return analysis;
        } catch (error) {
            console.error('❌ AI field analysis failed:', error);
            return `## ❌ AI Analysis Failed

I couldn't analyze the fields using AI due to a service error: ${error.message}

**Available fields in ${measurement}:**
${fieldNames.slice(0, 20).map(field => `• \`${field}\``).join('\n')}
${fieldNames.length > 20 ? `\n...and ${fieldNames.length - 20} more fields` : ''}

Without AI analysis, I cannot provide intelligent insights about which fields are relevant to your question: "${userQuestion}"`;
        }
    }

    // This pattern matching function was removed - AI does all analysis now

    async listMetrics(intent, context) {
        return {
            type: 'metrics_list',
            success: true,
            metrics: context.availableMetrics.map(metric => ({
                name: metric,
                description: `Time series metric: ${metric}`,
                category: this.categorizeMetric(metric)
            }))
        };
    }

    categorizeMetric(metric) {
        // Let AI categorize metrics instead of pattern matching
        return 'custom';  // All metrics are custom until AI analyzes them
    }

    async handleUnknownIntent(intent, context) {
        return {
            type: 'unknown_intent',
            success: false,
            error: `I'm not sure how to handle the request: "${intent.question}". Could you try rephrasing it?`,
            suggestions: [
                'Ask about specific metrics by name',
                'Request anomaly detection',
                'Compare metrics over time periods',
                'Get statistics for metrics'
            ]
        };
    }

    // Enhance analysis for anomaly detection
    enhanceForAnomalyDetection(analysis, data) {
        // Add anomaly-specific insights
        const enhanced = { ...analysis };
        enhanced.anomalies = [];
        
        if (data && data.values) {
            const values = data.values.map(row => row[1]).filter(val => val !== null && !isNaN(val));
            const mean = enhanced.summary.mean;
            const stdDev = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length);
            
            // Find outliers (values > 2 standard deviations from mean)
            const outliers = values.filter(val => Math.abs(val - mean) > 2 * stdDev);
            
            if (outliers.length > 0) {
                enhanced.anomalies.push(`Found ${outliers.length} potential anomalies (values beyond 2 standard deviations)`);
                enhanced.anomalies.push(`Anomalous values: ${outliers.map(v => v.toFixed(2)).join(', ')}`);
            } else {
                enhanced.anomalies.push('No significant anomalies detected in the data');
            }
        }
        
        return enhanced;
    }

    // Generate fallback response when AI is not initialized
    generateFallbackResponse(userInput, context) {
        return {
            text: "I'm still initializing my advanced capabilities. For now, I can show you the available metrics or help with basic queries.",
            data: { type: 'fallback' },
            actions: [
                { label: 'Show Available Metrics', action: 'showMeasurements' }
            ]
        };
    }

    // Generate intelligent response using AI - no pattern matching
    async generateBasicResponse(userInput, context) {
        console.log('🧠 Processing user input with AI:', userInput);
        console.log('📊 Available metrics:', context.availableMetrics?.length || 0);
        
        // Get conversation context
        const conversationContext = this.contextManager.getConversationContext();
        
        // Build AI prompt to understand user intent
        const prompt = `You are a time series data analysis assistant. Analyze this user input and provide a helpful response.

${conversationContext}

User Input: "${userInput}"
Available Metrics: ${context.availableMetrics?.join(', ') || 'None available'}

Provide a helpful response that:
1. Understands what the user is asking for (considering any previous conversation)
2. Offers specific next steps 
3. Suggests relevant actions they can take
4. References previous context when relevant (e.g., "Based on the analysis we just did...")

Format your response as a JSON object with:
{
    "text": "markdown formatted response text",
    "data": {"type": "response_type"},
    "actions": [{"label": "Action Name", "action": "actionId"}]
}`;

        try {
            const aiResponse = await this.callAIModel(prompt);
            const response = JSON.parse(aiResponse);
            
            // Store this exchange in conversation history
            this.contextManager.addToHistory(userInput, response, context);
            
            return response;
        } catch (error) {
            console.error('❌ AI response generation failed:', error);
            const errorResponse = {
                text: `❌ **AI Service Unavailable**\n\nI cannot process your request because the AI service is not available: ${error.message}\n\nPlease check your AI configuration or try again later.`,
                data: { type: 'ai_error' },
                actions: []
            };
            
            // Store error response in history too
            this.contextManager.addToHistory(userInput, errorResponse, context);
            
            return errorResponse;
        }
    }

    // Handle queries about specific metrics
    async handleSpecificMetricQuery(metric, userInput, context) {
        console.log('🎯 Handling specific metric query for:', metric);
        
        const lowerInput = userInput.toLowerCase();
        
        // Check what they want to do with this metric
        if (lowerInput.includes('anomal') || lowerInput.includes('unusual') || lowerInput.includes('spike')) {
            return {
                text: `🔍 **Analyzing ${metric} for anomalies**\n\nI can help you detect unusual patterns in ${metric}. To get started, I'll need to:\n\n1. Query recent data for ${metric}\n2. Analyze patterns and baselines\n3. Identify any anomalous behavior\n\nWould you like me to generate a query to analyze ${metric} for anomalies?`,
                data: { type: 'specific_anomaly_analysis', metric },
                actions: [
                    { label: 'Generate Anomaly Query', action: 'generateAnomalyQuery' },
                    { label: 'Show Recent Data', action: 'showRecentData' }
                ]
            };
        }
        
        if (lowerInput.includes('query') || lowerInput.includes('influxql') || lowerInput.includes('promql')) {
            return {
                text: `⚡ **Query Generation for ${metric}**\n\nI can help you create optimized queries for ${metric}. What type of analysis are you looking for?\n\n• Basic data retrieval\n• Aggregations (mean, sum, max)\n• Time-based grouping\n• Rate calculations\n• Anomaly detection\n\nWhat would you like to query about ${metric}?`,
                data: { type: 'query_generation', metric },
                actions: [
                    { label: 'Basic Query', action: 'generateBasicQuery' },
                    { label: 'Aggregation Query', action: 'generateAggQuery' },
                    { label: 'Anomaly Query', action: 'generateAnomalyQuery' }
                ]
            };
        }
        
        // Default response for specific metric
        return {
            text: `📊 **${metric} Analysis**\n\nI can help you analyze ${metric} in several ways:\n\n• **Query recent data** - Get current values and trends\n• **Detect anomalies** - Find unusual patterns or spikes\n• **Generate alerts** - Set up monitoring thresholds\n• **Compare periods** - Analyze changes over time\n\nWhat type of analysis would you like for ${metric}?`,
            data: { type: 'metric_analysis_options', metric },
            actions: [
                { label: 'Query Recent Data', action: 'showRecentData' },
                { label: 'Find Anomalies', action: 'generateAnomalyQuery' },
                { label: 'Generate Basic Query', action: 'generateBasicQuery' }
            ]
        };
    }

    // Handle IOPS-related queries
    async handleIOPSQuery(userInput, context) {
        const ioMetrics = context.availableMetrics.filter(metric => 
            metric.toLowerCase().includes('read') || 
            metric.toLowerCase().includes('write') || 
            metric.toLowerCase().includes('iops') ||
            metric.toLowerCase().includes('volume')
        );
        
        if (ioMetrics.length === 0) {
            return {
                text: "I don't see any obvious IOPS or I/O related metrics in the available measurements. Here are all available metrics to help you find what you're looking for:",
                data: { type: 'no_io_metrics' },
                actions: [
                    { label: 'Show All Metrics', action: 'showMeasurements' }
                ]
            };
        }
        
        const metricsList = ioMetrics.map(metric => `• ${metric}`).join('\n');
        
        return {
            text: `🔍 **IOPS & I/O Metrics Found**\n\n${metricsList}\n\nThese metrics can help you analyze I/O performance. Which one would you like to explore?`,
            data: { type: 'iops_metrics', metrics: ioMetrics },
            actions: [
                { label: 'Analyze Volume Metrics', action: 'analyzeVolumeMetrics' },
                { label: 'Generate I/O Query', action: 'generateIOQuery' }
            ]
        };
    }

    // Handle general metric queries
    async handleGeneralMetricQuery(userInput, context) {
        const availableMetrics = context.availableMetrics || [];
        
        if (availableMetrics.length === 0) {
            return {
                text: "I don't see any metrics available. Please ensure you're connected to a datasource.",
                data: { type: 'no_metrics' }
            };
        }
        
        const metricsList = availableMetrics.slice(0, 8).map(metric => `• ${metric}`).join('\n');
        const moreText = availableMetrics.length > 8 ? `\n\n...and ${availableMetrics.length - 8} more metrics` : '';
        
        return {
            text: `📊 **Available Metrics**\n\n${metricsList}${moreText}\n\nWhich metric would you like to analyze?`,
            data: { type: 'metrics_display', metrics: availableMetrics }
        };
    }

    // Handle Prometheus-specific queries  
    async handlePrometheusQuery(userInput, context) {
        return {
            text: `📊 **Prometheus Measurement Query**\n\nI see you're asking about prometheus measurements. However, the current datasource appears to be InfluxDB-based. \n\nFor InfluxDB:\n• **Measurements** are like tables (e.g., cpu, memory, disk)\n• **Retention policies** determine how long data is kept\n• **Fields** are the actual metric values\n\nDid you mean to ask about a specific measurement with a retention policy?`,
            data: { type: 'prometheus_clarification' },
            actions: [
                { label: 'Show Measurements', action: 'showMeasurements' },
                { label: 'Explain InfluxDB Structure', action: 'explainInfluxDB' }
            ]
        };
    }

    // Handle retention policy queries
    async handleRetentionPolicyQuery(userInput, context) {
        return {
            text: `📝 **Retention Policy Information**\n\nRetention policies in InfluxDB determine how long data is stored:\n\n• **autogen** - Default policy (often unlimited retention)\n• **raw** - Typically high-resolution, short-term storage\n• **downsampled** - Lower resolution, longer-term storage\n\nTo query with a specific retention policy:\n\`\`\`influxql\nSELECT * FROM "policy"."measurement" WHERE time > now() - 1h\n\`\`\`\n\nWhat measurement would you like to query with a specific retention policy?`,
            data: { type: 'retention_policy_help' },
            actions: [
                { label: 'Generate Query with Policy', action: 'generatePolicyQuery' },
                { label: 'Show Available Measurements', action: 'showMeasurements' }
            ]
        };
    }

    // Handle anomaly queries
    async handleAnomalyQuery(userInput, context) {
        return {
            text: "🔍 **Anomaly Detection**\n\nI can help you find unusual patterns in your metrics. Which metric would you like me to analyze for anomalies?",
            data: { type: 'anomaly_detection_help' },
            actions: [
                { label: 'Show Available Metrics', action: 'showMeasurements' }
            ]
        };
    }

    // Advanced semantic analysis using AI models
    async performSemanticAnalysis(userInput, context) {
        const analysis = {
            originalText: userInput,
            normalizedText: this.normalizeText(userInput),
            tokens: this.tokenize(userInput),
            entities: {},
            intent: null,
            confidence: 0,
            semanticEmbedding: null,
            contextualFactors: {},
            temporalReferences: [],
            metricReferences: [],
            operationalIntents: []
        };

        // Use connected AI model for semantic understanding
        if (window.OpenAIService?.isConnected || window.OllamaService?.isConnected) {
            const semanticPrompt = this.buildSemanticAnalysisPrompt(userInput, context);
            const aiResponse = await this.callAIModel(semanticPrompt);
            
            try {
                const parsed = JSON.parse(aiResponse);
                Object.assign(analysis, parsed);
            } catch (e) {
                // Fallback to regex-based analysis
                analysis.intent = this.extractIntentWithPatterns(userInput);
            }
        }

        // Enhanced entity extraction
        analysis.entities = await this.extractAdvancedEntities(userInput, context);
        
        // Temporal analysis
        analysis.temporalReferences = this.extractTemporalReferences(userInput);
        
        // Metric and measurement references
        analysis.metricReferences = await this.extractMetricReferences(userInput);
        
        console.log('🔍 Semantic analysis result:', analysis);
        return analysis;
    }

    // RAG: Retrieve relevant knowledge from multiple sources
    async retrieveRelevantKnowledge(understanding) {
        const knowledge = {
            documentation: [],
            queryPatterns: [],
            similarConversations: [],
            domainFacts: [],
            userPreferences: {},
            contextualExamples: []
        };

        // Search documentation embeddings
        if (understanding.semanticEmbedding) {
            knowledge.documentation = await this.knowledgeBase.searchDocumentation(
                understanding.semanticEmbedding, 
                { limit: 5, threshold: 0.7 }
            );
        }

        // Find similar successful query patterns
        knowledge.queryPatterns = await this.knowledgeBase.findSimilarQueries(
            understanding.normalizedText,
            { limit: 3, includeContext: true }
        );

        // Retrieve relevant conversation history
        knowledge.similarConversations = await this.contextManager.findSimilarConversations(
            understanding.intent,
            understanding.entities
        );

        // Domain-specific facts
        knowledge.domainFacts = await this.knowledgeBase.getRelevantFacts(
            understanding.metricReferences,
            understanding.temporalReferences
        );

        // User preferences and patterns
        knowledge.userPreferences = this.contextManager.currentContext.userPreferences;

        console.log('📚 Retrieved knowledge:', knowledge);
        return knowledge;
    }

    // Generate intelligent execution plan
    async generateExecutionPlan(reasoning) {
        const plan = {
            steps: [],
            optimizations: [],
            fallbacks: [],
            expectedOutcome: '',
            confidenceLevels: {},
            resourceRequirements: {},
            estimatedDuration: 0
        };

        // Use AI to create execution plan
        const planningPrompt = this.buildPlanningPrompt(reasoning);
        const aiResponse = await this.callAIModel(planningPrompt);
        
        try {
            const parsedPlan = JSON.parse(aiResponse);
            Object.assign(plan, parsedPlan);
        } catch (e) {
            // Fallback planning logic
            plan.steps = [`Analyze the request: ${reasoning.originalText}`, 'Execute data query', 'Generate response'];
        }

        // Add query optimizations
        plan.optimizations = await this.queryGenerator.generateOptimizations(plan.steps);
        
        console.log('📋 Execution plan:', plan);
        return plan;
    }

    // Execute plan with intelligent monitoring
    async executeIntelligentPlan(plan) {
        const results = {
            stepResults: [],
            overallSuccess: false,
            insights: [],
            anomalies: [],
            recommendations: [],
            performance: {},
            dataQuality: {}
        };

        for (const [index, step] of plan.steps.entries()) {
            console.log(`⚡ Executing step ${index + 1}:`, step.description);
            
            try {
                const stepStart = Date.now();
                const stepResult = await this.executeStep(step, results);
                const stepDuration = Date.now() - stepStart;
                
                stepResult.duration = stepDuration;
                stepResult.performance = this.analyzeStepPerformance(stepResult, stepDuration);
                
                results.stepResults.push(stepResult);
                
                // Analyze results for insights
                const insights = await this.extractInsights(stepResult);
                results.insights.push(...insights);
                
                // Check for anomalies
                const anomalies = await this.detectAnomalies(stepResult);
                results.anomalies.push(...anomalies);
                
            } catch (error) {
                console.error(`❌ Step ${index + 1} failed:`, error);
                
                // Try fallback if available
                if (step.fallback) {
                    console.log('🔄 Attempting fallback...');
                    const fallbackResult = await this.executeStep(step.fallback, results);
                    results.stepResults.push(fallbackResult);
                } else {
                    throw error;
                }
            }
        }

        results.overallSuccess = results.stepResults.every(r => r.success);
        
        // Generate recommendations
        results.recommendations = await this.generateRecommendations(results);
        
        console.log('📊 Execution results:', results);
        return results;
    }

    // Generate sophisticated AI response
    async generateAdvancedResponse(results, reasoning) {
        const response = {
            text: '',
            visualizations: [],
            insights: [],
            recommendations: [],
            followUpQuestions: [],
            confidence: 0,
            explanations: {},
            interactiveElements: [],
            metadata: {}
        };

        // Use AI to generate natural language response
        const responsePrompt = this.buildResponsePrompt(results, reasoning);
        const aiResponse = await this.callAIModel(responsePrompt);
        
        response.text = aiResponse;
        
        // Add intelligent visualizations
        response.visualizations = await this.visualizationEngine.generateOptimalCharts(results);
        
        // Extract insights with explanations
        response.insights = results.insights.map(insight => ({
            ...insight,
            explanation: this.explainInsight(insight),
            confidence: this.calculateInsightConfidence(insight)
        }));
        
        // Generate contextual recommendations
        response.recommendations = await this.generateContextualRecommendations(results, reasoning);
        
        // Suggest follow-up questions
        response.followUpQuestions = await this.generateFollowUpQuestions(results, reasoning);
        
        // Add interactive elements
        response.interactiveElements = this.createInteractiveElements(results);
        
        console.log('💬 Generated advanced response:', response);
        return response;
    }

    // Helper methods for AI model interaction
    async callAIModel(prompt, options = {}) {
        try {
            if (window.OpenAIService?.isConnected) {
                return await window.OpenAIService.generateCompletion(prompt, {
                    temperature: options.temperature || 0.7,
                    max_tokens: options.maxTokens || 1000,
                    ...options
                });
            } else if (window.OllamaService?.isConnected) {
                return await window.OllamaService.generateCompletion(prompt, options);
            } else {
                throw new Error('No AI service connected');
            }
        } catch (error) {
            console.error('AI model call failed:', error);
            throw error;
        }
    }

    // Text preprocessing utilities
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    tokenize(text) {
        // Advanced tokenization with stop word removal and stemming
        const tokens = this.normalizeText(text).split(' ');
        const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but']);
        
        return tokens
            .filter(token => token.length > 1 && !stopWords.has(token))
            .map(token => this.stemWord(token));
    }

    stemWord(word) {
        // Simple stemming - in production, use a proper stemming library
        const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 's'];
        for (const suffix of suffixes) {
            if (word.endsWith(suffix) && word.length > suffix.length + 2) {
                return word.slice(0, -suffix.length);
            }
        }
        return word;
    }

    // Proactive monitoring system
    startProactiveMonitoring() {
        // Monitor for patterns that might need attention
        setInterval(async () => {
            if (GrafanaConfig.connected && this.capabilities.proactiveInsights) {
                await this.performProactiveAnalysis();
            }
        }, 300000); // Every 5 minutes
    }

    async performProactiveAnalysis() {
        console.log('🔍 Performing proactive analysis...');
        
        try {
            // Check for anomalies in background (placeholder for now)
            const anomalies = [];
            
            // Generate insights
            const insights = await this.generateProactiveInsights();
            
            // Check system health
            const healthStatus = await this.assessSystemHealth();
            
            // Notify if important findings
            if (anomalies.length > 0 || insights.length > 0 || !healthStatus.healthy) {
                this.notifyProactiveFindings({
                    anomalies,
                    insights,
                    healthStatus
                });
            }
            
        } catch (error) {
            console.error('Proactive analysis error:', error);
        }
    }
    
    // Generate proactive insights based on current data
    async generateProactiveInsights() {
        // Placeholder implementation - will be enhanced with actual insight generation
        console.log('📊 Generating proactive insights...');
        return [];
    }
    
    // Assess overall system health
    async assessSystemHealth() {
        // Placeholder implementation - will check datasource health, query performance, etc.
        console.log('🏥 Assessing system health...');
        return {
            healthy: true,
            metrics: {
                datasourceConnectivity: 'good',
                queryPerformance: 'normal',
                errorRate: 0
            }
        };
    }
    
    // Notify user of proactive findings
    notifyProactiveFindings(findings) {
        // Placeholder implementation - will send notifications through UI
        console.log('📢 Proactive findings:', findings);
        
        if (findings.anomalies && findings.anomalies.length > 0) {
            console.log(`⚠️ Found ${findings.anomalies.length} anomalies`);
        }
        
        if (findings.insights && findings.insights.length > 0) {
            console.log(`💡 Generated ${findings.insights.length} insights`);
        }
        
        if (findings.healthStatus && !findings.healthStatus.healthy) {
            console.log('❌ System health issues detected');
        }
    }

    // Learning and adaptation
    async learnFromInteraction(userInput, response, results) {
        // Store successful patterns
        if (results.overallSuccess) {
            await this.knowledgeBase.storeSuccessfulPattern({
                input: userInput,
                response: response,
                results: results,
                timestamp: new Date(),
                context: this.contextManager.getCurrentContext()
            });
        }

        // Update user preferences (stored automatically when adding to history)
        // this.contextManager.addToHistory already handles preference updates
        
        // Improve query patterns
        await this.queryGenerator.learnFromResults(results);
    }

    // Load time series domain knowledge
    async loadTimeSeriesKnowledge() {
        console.log('📊 Loading time series knowledge...');
        
        // Load knowledge about time series concepts
        await this.knowledgeBase.loadTimeSeriesDocumentation();
        
        // Load metric patterns and best practices
        const timeSeriesKnowledge = {
            concepts: [
                'Time series data consists of data points indexed by time',
                'Aggregation functions like mean, sum, max, min are commonly used',
                'Time windows and grouping by time intervals enable trend analysis',
                'Rate functions calculate per-second rates from counters',
                'Anomaly detection identifies unusual patterns in metrics'
            ],
            bestPractices: [
                'Always include time filters for better query performance',
                'Use appropriate aggregation intervals based on data resolution',
                'Consider data retention policies when querying historical data',
                'Use rate() for counter metrics in PromQL',
                'Add LIMIT clauses for potentially large result sets'
            ],
            commonPatterns: [
                'CPU utilization monitoring',
                'Memory usage tracking',
                'Network traffic analysis',
                'Application performance metrics',
                'System health monitoring'
            ]
        };
        
        // Store knowledge in the knowledge base
        this.knowledgeBase.timeSeriesKnowledge = timeSeriesKnowledge;
        console.log('✅ Time series knowledge loaded');
    }

    // Load query patterns
    async loadQueryPatterns() {
        console.log('🔍 Loading query patterns...');
        await this.knowledgeBase.loadQueryPatterns();
    }

    // Load user preferences
    async loadUserPreferences() {
        console.log('👤 Loading user preferences...');
        try {
            const stored = localStorage.getItem('advancedAIPreferences');
            if (stored) {
                this.userPreferences = JSON.parse(stored);
            } else {
                this.userPreferences = {
                    preferredExplanationStyle: 'concise',
                    includeOptimizations: true,
                    showAlternatives: true,
                    defaultTimeout: 30000
                };
            }
            console.log('✅ User preferences loaded:', this.userPreferences);
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
            this.userPreferences = {};
        }
    }
}

// Supporting classes for the advanced AI system
class AIKnowledgeBase {
    constructor() {
        this.embeddings = new Map();
        this.documentation = [];
        this.queryPatterns = [];
        this.facts = [];
    }

    async initialize() {
        console.log('📚 Initializing AI Knowledge Base...');
        // Load and index domain knowledge
        await this.loadTimeSeriesDocumentation();
        await this.loadQueryPatterns();
        await this.buildEmbeddings();
    }

    async loadTimeSeriesDocumentation() {
        // Load InfluxQL and PromQL documentation
        this.documentation = [
            {
                topic: 'InfluxQL SELECT Queries',
                content: 'SELECT statements retrieve data from measurements...',
                embedding: null // Will be populated
            },
            {
                topic: 'PromQL Functions',
                content: 'Prometheus functions like rate(), avg_over_time()...',
                embedding: null
            },
            // More documentation entries
        ];
    }

    async loadQueryPatterns() {
        // Load common query patterns for optimization
        this.queryPatterns = [
            {
                id: 'influxql_basic_select',
                pattern: 'SELECT {fields} FROM {measurement} WHERE time > {timeRange}',
                type: 'influxql',
                description: 'Basic InfluxQL SELECT pattern'
            },
            {
                id: 'promql_rate_query',
                pattern: 'rate({metric}[{timeWindow}])',
                type: 'promql',
                description: 'PromQL rate function pattern'
            },
            {
                id: 'aggregation_pattern',
                pattern: '{function}({field}) FROM {measurement} GROUP BY time({interval})',
                type: 'influxql',
                description: 'Time-based aggregation pattern'
            }
        ];
        console.log('🔍 Loaded', this.queryPatterns.length, 'query patterns');
    }

    async buildEmbeddings() {
        // Placeholder for building embeddings
        // In production, this would generate embeddings for all documentation
        console.log('🔗 Building embeddings for documentation...');
        
        for (const doc of this.documentation) {
            // Placeholder - would generate actual embeddings
            doc.embedding = new Array(384).fill(0); // Simple placeholder
        }
        
        console.log('✅ Built embeddings for', this.documentation.length, 'documents');
    }

    async searchDocumentation(embedding, options = {}) {
        // Vector similarity search
        const results = [];
        for (const doc of this.documentation) {
            if (doc.embedding) {
                const similarity = this.cosineSimilarity(embedding, doc.embedding);
                if (similarity > (options.threshold || 0.5)) {
                    results.push({ ...doc, similarity });
                }
            }
        }
        
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, options.limit || 5);
    }

    cosineSimilarity(a, b) {
        // Simple cosine similarity implementation
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
}

class ConversationContextManager {
    constructor() {
        this.conversationContexts = new Map(); // Store contexts per conversation ID
        this.currentConversationId = null;
        this.maxHistorySize = 10; // Keep last 10 exchanges per conversation
        
        // Default context structure
        this.defaultContext = {
            conversationHistory: [],
            userPreferences: {},
            sessionMetrics: {},
            activeTopics: [],
            temporalContext: null
        };
    }

    async initialize() {
        console.log('💭 Initializing Conversation Context Manager...');
        await this.loadUserPreferences();
        // Note: Individual conversation histories are now loaded on-demand
    }

    async loadUserPreferences() {
        const stored = localStorage.getItem('aiUserPreferences');
        if (stored) {
            this.defaultContext.userPreferences = JSON.parse(stored);
        }
    }

    // Set the current conversation ID for context isolation
    setCurrentConversation(conversationId) {
        this.currentConversationId = conversationId;
        
        // Initialize context for this conversation if it doesn't exist
        if (!this.conversationContexts.has(conversationId)) {
            this.conversationContexts.set(conversationId, {
                ...JSON.parse(JSON.stringify(this.defaultContext)), // Deep copy
                conversationHistory: this.loadConversationHistory(conversationId)
            });
        }
    }

    // Alias method for backwards compatibility
    setConversationId(conversationId) {
        this.setCurrentConversation(conversationId);
    }

    // Load conversation history for a specific conversation
    loadConversationHistory(conversationId) {
        try {
            const stored = localStorage.getItem(`aiConversationHistory_${conversationId}`);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn(`Failed to load conversation history for ${conversationId}:`, error);
            return [];
        }
    }

    // Get current context (conversation-specific)
    get currentContext() {
        if (!this.currentConversationId) {
            return this.defaultContext;
        }
        
        return this.conversationContexts.get(this.currentConversationId) || this.defaultContext;
    }

    // Add a user message and AI response to conversation history
    addToHistory(userInput, aiResponse, context = {}) {
        const exchange = {
            timestamp: new Date().toISOString(),
            userInput: userInput,
            aiResponse: aiResponse,
            context: {
                availableMetrics: context.availableMetrics || [],
                selectedDatabase: context.selectedDatabase || null,
                dataSourceType: context.dataSourceType || null
            }
        };

        this.currentContext.conversationHistory.push(exchange);

        // Keep only the most recent exchanges
        if (this.currentContext.conversationHistory.length > this.maxHistorySize) {
            this.currentContext.conversationHistory = this.currentContext.conversationHistory.slice(-this.maxHistorySize);
        }

        // Save to localStorage
        this.saveConversationHistory();
    }

    saveConversationHistory() {
        if (!this.currentConversationId) {
            console.warn('No current conversation ID set, cannot save history');
            return;
        }
        
        try {
            const context = this.conversationContexts.get(this.currentConversationId);
            if (context && context.conversationHistory) {
                localStorage.setItem(
                    `aiConversationHistory_${this.currentConversationId}`, 
                    JSON.stringify(context.conversationHistory)
                );
            }
        } catch (error) {
            console.warn(`Failed to save conversation history for ${this.currentConversationId}:`, error);
        }
    }

    // Get conversation context for AI prompts
    getConversationContext() {
        if (this.currentContext.conversationHistory.length === 0) {
            return '';
        }

        let contextString = '\n**Previous Conversation:**\n';
        
        // Include the most recent exchanges (limit to last 5 for prompt length)
        const recentHistory = this.currentContext.conversationHistory.slice(-5);
        
        recentHistory.forEach((exchange, index) => {
            contextString += `\n${index + 1}. User: "${exchange.userInput}"\n`;
            contextString += `   AI: "${this.truncateResponse(exchange.aiResponse)}"\n`;
        });

        contextString += '\n**Current Context:** Please continue this conversation with awareness of the previous exchanges.\n';
        
        return contextString;
    }

    // Truncate AI responses for context (to avoid overly long prompts)
    truncateResponse(response) {
        if (typeof response === 'string') {
            return response.length > 200 ? response.substring(0, 200) + '...' : response;
        } else if (response && response.text) {
            return response.text.length > 200 ? response.text.substring(0, 200) + '...' : response.text;
        }
        return '[AI Response]';
    }

    // Clear conversation history for current conversation
    clearHistory() {
        if (!this.currentConversationId) {
            console.warn('No current conversation ID set, cannot clear history');
            return;
        }
        
        const context = this.conversationContexts.get(this.currentConversationId);
        if (context) {
            context.conversationHistory = [];
            this.saveConversationHistory();
        }
    }
    
    // Clear history for a specific conversation
    clearHistoryForConversation(conversationId) {
        const context = this.conversationContexts.get(conversationId);
        if (context) {
            context.conversationHistory = [];
            try {
                localStorage.removeItem(`aiConversationHistory_${conversationId}`);
            } catch (error) {
                console.warn(`Failed to clear conversation history for ${conversationId}:`, error);
            }
        }
    }
    
    // Remove conversation context entirely
    removeConversationContext(conversationId) {
        this.conversationContexts.delete(conversationId);
        try {
            localStorage.removeItem(`aiConversationHistory_${conversationId}`);
        } catch (error) {
            console.warn(`Failed to remove conversation context for ${conversationId}:`, error);
        }
    }

    getCurrentContext() {
        return { ...this.currentContext };
    }
}

class ChainOfThoughtReasoner {
    async initialize() {
        console.log('🤔 Initializing Chain of Thought Reasoner...');
    }

    async analyzeRequest(understanding, knowledge) {
        return {
            reasoning: [],
            confidence: 0,
            assumptions: [],
            alternatives: []
        };
    }
}

class SmartVisualizationEngine {
    async initialize() {
        console.log('📈 Initializing Smart Visualization Engine...');
    }

    async generateOptimalCharts(results) {
        return [];
    }
}

// Export for global access
window.AdvancedAIAgent = AdvancedAIAgent;
console.log('✅ AdvancedAIAgent class loaded and exported to window');