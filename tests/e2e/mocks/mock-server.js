// Mock server for E2E tests - simulates Grafana and AI services
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

class MockServer {
  constructor(port = 3001) {
    this.app = express();
    this.port = port;
    this.server = null;
    
    // Middleware
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[Mock Server] ${req.method} ${req.path}`);
      next();
    });
    
    // Setup routes
    this.setupGrafanaRoutes();
    this.setupAIRoutes();
  }
  
  setupGrafanaRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', version: 'mock-1.0.0' });
    });
    
    // User authentication check
    this.app.get('/api/user', (req, res) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Decode credentials
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [username, password] = credentials.split(':');
      
      // Accept test credentials
      if (username === 'admin' && password === 'admin') {
        res.json({
          id: 1,
          login: 'admin',
          email: 'admin@localhost',
          name: 'Admin User',
          isGrafanaAdmin: true
        });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    });
    
    // List datasources
    this.app.get('/api/datasources', (req, res) => {
      res.json([
        {
          id: 1,
          uid: 'influx-test-123',
          name: 'Test InfluxDB',
          type: 'influxdb',
          url: 'http://localhost:8086',
          database: 'test_db',
          isDefault: true,
          access: 'proxy'
        },
        {
          id: 2,
          uid: 'prom-test-456',
          name: 'Test Prometheus',
          type: 'prometheus',
          url: 'http://localhost:9090',
          isDefault: false,
          access: 'proxy'
        },
        {
          id: 3,
          uid: 'influx-prod-789',
          name: 'Production InfluxDB',
          type: 'influxdb',
          url: 'http://localhost:8087',
          database: 'prod_db',
          isDefault: false,
          access: 'proxy'
        }
      ]);
    });
    
    // Get specific datasource
    this.app.get('/api/datasources/:id', (req, res) => {
      const datasources = {
        '1': {
          id: 1,
          uid: 'influx-test-123',
          name: 'Test InfluxDB',
          type: 'influxdb',
          url: 'http://localhost:8086',
          database: 'test_db'
        },
        '2': {
          id: 2,
          uid: 'prom-test-456',
          name: 'Test Prometheus',
          type: 'prometheus',
          url: 'http://localhost:9090'
        }
      };
      
      const ds = datasources[req.params.id];
      if (ds) {
        res.json(ds);
      } else {
        res.status(404).json({ message: 'Datasource not found' });
      }
    });
    
    // Query endpoint
    this.app.post('/api/ds/query', (req, res) => {
      const { queries, from, to } = req.body;
      
      if (!queries || queries.length === 0) {
        return res.status(400).json({ message: 'No queries provided' });
      }
      
      const query = queries[0];
      
      // Simulate different response types based on query
      if (query.datasourceId === 'influx-test-123') {
        // InfluxDB response
        res.json({
          results: {
            A: {
              frames: [{
                schema: {
                  fields: [
                    { name: 'time', type: 'time' },
                    { name: 'cpu_usage', type: 'number' },
                    { name: 'host', type: 'string' }
                  ]
                },
                data: {
                  values: [
                    [1704067200000, 1704067260000, 1704067320000],
                    [45.2, 48.7, 42.1],
                    ['server-1', 'server-1', 'server-1']
                  ]
                }
              }]
            }
          }
        });
      } else if (query.datasourceId === 'prom-test-456') {
        // Prometheus response
        res.json({
          results: {
            A: {
              frames: [{
                schema: {
                  fields: [
                    { name: 'Time', type: 'time' },
                    { name: 'Value', type: 'number' }
                  ]
                },
                data: {
                  values: [
                    [1704067200000, 1704067260000, 1704067320000],
                    [0.85, 0.87, 0.83]
                  ]
                }
              }]
            }
          }
        });
      } else {
        res.status(400).json({ message: 'Unknown datasource' });
      }
    });
    
    // Schema endpoints for InfluxDB
    this.app.post('/api/datasources/proxy/:id/query', (req, res) => {
      const { q } = req.query;
      
      if (q && q.includes('SHOW DATABASES')) {
        res.json({
          results: [{
            series: [{
              name: 'databases',
              columns: ['name'],
              values: [['test_db'], ['prod_db'], ['_internal']]
            }]
          }]
        });
      } else if (q && q.includes('SHOW MEASUREMENTS')) {
        res.json({
          results: [{
            series: [{
              name: 'measurements',
              columns: ['name'],
              values: [
                ['cpu_usage'],
                ['memory_usage'],
                ['disk_io'],
                ['network_traffic']
              ]
            }]
          }]
        });
      } else if (q && q.includes('SHOW FIELD KEYS')) {
        res.json({
          results: [{
            series: [{
              name: 'cpu_usage',
              columns: ['fieldKey', 'fieldType'],
              values: [
                ['usage_idle', 'float'],
                ['usage_system', 'float'],
                ['usage_user', 'float']
              ]
            }]
          }]
        });
      } else if (q && q.includes('SHOW TAG KEYS')) {
        res.json({
          results: [{
            series: [{
              name: 'cpu_usage',
              columns: ['tagKey'],
              values: [['host'], ['region'], ['datacenter']]
            }]
          }]
        });
      } else {
        // Default query response
        res.json({
          results: [{
            series: [{
              name: 'test_measurement',
              columns: ['time', 'value'],
              values: [[1704067200000, 42]]
            }]
          }]
        });
      }
    });
    
    // Dashboard search
    this.app.get('/api/search', (req, res) => {
      res.json([
        {
          id: 1,
          uid: 'dash-001',
          title: 'System Overview',
          tags: ['system', 'monitoring'],
          type: 'dash-db',
          url: '/d/dash-001/system-overview'
        },
        {
          id: 2,
          uid: 'dash-002',
          title: 'Application Metrics',
          tags: ['app', 'performance'],
          type: 'dash-db',
          url: '/d/dash-002/application-metrics'
        }
      ]);
    });
  }
  
  setupAIRoutes() {
    // Ollama endpoints
    this.app.get('/api/tags', (req, res) => {
      res.json({
        models: [
          {
            name: 'llama3.1:8b',
            modified_at: '2024-01-01T00:00:00Z',
            size: 4661000000
          },
          {
            name: 'gemma3:27b',
            modified_at: '2024-01-01T00:00:00Z',
            size: 27000000000
          }
        ]
      });
    });
    
    // Ollama generate endpoint
    this.app.post('/api/generate', (req, res) => {
      const { model, prompt, stream } = req.body;
      
      if (!model || !prompt) {
        return res.status(400).json({ error: 'Missing model or prompt' });
      }
      
      // Simulate AI response
      const response = this.generateMockAIResponse(prompt);
      
      if (stream === false) {
        res.json({
          model: model,
          created_at: new Date().toISOString(),
          response: response,
          done: true
        });
      } else {
        // For streaming, we'd need to implement SSE
        res.json({
          model: model,
          response: response,
          done: true
        });
      }
    });
    
    // OpenAI chat endpoint
    this.app.post('/v1/chat/completions', (req, res) => {
      const { model, messages } = req.body;
      
      if (!messages || messages.length === 0) {
        return res.status(400).json({ error: 'No messages provided' });
      }
      
      const lastMessage = messages[messages.length - 1];
      const response = this.generateMockAIResponse(lastMessage.content);
      
      res.json({
        id: 'chatcmpl-test-123',
        object: 'chat.completion',
        created: Date.now(),
        model: model || 'gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 150,
          total_tokens: 250
        }
      });
    });
  }
  
  generateMockAIResponse(prompt) {
    // Generate contextual responses based on prompt content
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('query') && promptLower.includes('cpu')) {
      return 'Here\'s a query to get CPU usage:\n```sql\nSELECT mean("usage_idle") FROM "cpu_usage" WHERE time > now() - 1h GROUP BY time(5m)\n```';
    } else if (promptLower.includes('anomaly') || promptLower.includes('anomalies')) {
      return 'I detected some anomalies in your data:\n- Unusual spike in CPU usage at 14:30\n- Memory usage exceeded threshold 3 times\n- Network latency increased by 45%';
    } else if (promptLower.includes('optimize')) {
      return 'To optimize this query:\n1. Add a time range filter\n2. Use aggregation functions\n3. Consider indexing on frequently queried tags';
    } else {
      return 'I understand your request. Based on the current data, everything appears to be operating normally. Would you like me to analyze specific metrics?';
    }
  }
  
  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🎭 Mock server running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }
  
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Mock server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = MockServer;