// Enhanced mock server with comprehensive feature coverage
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

class EnhancedMockServer {
  constructor(port = 3001) {
    this.app = express();
    this.port = port;
    this.server = null;
    
    // Store state for persistence
    this.queryHistory = [];
    this.variables = {};
    this.savedQueries = {};
    
    // Middleware
    this.app.use(cors());
    this.app.use(bodyParser.json({ limit: '50mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    
    // Logging
    this.app.use((req, res, next) => {
      if (process.env.DEBUG_MOCK) {
        console.log(`[Mock] ${req.method} ${req.path}`, req.query);
      }
      next();
    });
    
    // Setup all routes
    this.setupGrafanaRoutes();
    this.setupPrometheusRoutes();
    this.setupInfluxRoutes();
    this.setupAIRoutes();
    this.setupFileRoutes();
    this.setupVariableRoutes();
  }
  
  setupGrafanaRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', version: 'mock-2.0.0' });
    });
    
    // Authentication
    this.app.get('/api/user', (req, res) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [username, password] = credentials.split(':');
      
      if (username === 'admin' && password === 'admin') {
        res.json({
          id: 1,
          login: 'admin',
          email: 'admin@localhost',
          name: 'Admin User',
          isGrafanaAdmin: true,
          orgId: 1
        });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    });
    
    // Organizations
    this.app.get('/api/org', (req, res) => {
      res.json({
        id: 1,
        name: 'Main Org.',
        address: { address1: '', address2: '', city: '', zipCode: '', state: '', country: '' }
      });
    });
    
    // Datasources
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
          access: 'proxy',
          jsonData: { 
            httpMode: 'GET',
            keepCookies: [],
            timeInterval: '10s'
          }
        },
        {
          id: 2,
          uid: 'prom-test-456',
          name: 'Test Prometheus',
          type: 'prometheus',
          url: 'http://localhost:9090',
          isDefault: false,
          access: 'proxy',
          jsonData: {
            httpMethod: 'POST',
            customQueryParameters: '',
            timeInterval: '15s'
          }
        },
        {
          id: 3,
          uid: 'influx-prod-789',
          name: 'Production InfluxDB',
          type: 'influxdb',
          url: 'http://localhost:8087',
          database: 'prod_db',
          isDefault: false,
          access: 'proxy',
          jsonData: {
            httpMode: 'POST',
            keepCookies: [],
            timeInterval: '30s'
          }
        }
      ]);
    });
    
    // Query execution endpoint
    this.app.post('/api/ds/query', (req, res) => {
      console.log('🚀 Mock server: Received /api/ds/query request');
      console.log('📝 Query request body:', JSON.stringify(req.body, null, 2));
      console.log('📝 Request headers:', JSON.stringify(req.headers, null, 2));
      const { queries, from, to, scopedVars } = req.body;
      
      if (!queries || queries.length === 0) {
        return res.status(400).json({ message: 'No queries provided' });
      }
      
      // Store in history
      queries.forEach(q => {
        this.queryHistory.push({
          query: q.expr || q.rawQuery || q.query,
          timestamp: new Date().toISOString(),
          datasource: q.datasourceId,
          duration: Math.random() * 1000
        });
      });
      
      const results = {};
      
      queries.forEach((query, idx) => {
        const refId = query.refId || String.fromCharCode(65 + idx); // A, B, C...
        
        console.log(`🔍 Query datasourceId: "${query.datasourceId}", contains prom: ${query.datasourceId?.includes('prom')}`);
        
        if (query.datasourceId?.includes('prom')) {
          console.log('📊 Mock server: Routing to Prometheus response');
          // Prometheus response
          results[refId] = {
            frames: [{
              schema: {
                refId,
                meta: {
                  type: 'timeseries-multi',
                  custom: { resultType: 'matrix' }
                },
                fields: [
                  { name: 'Time', type: 'time', typeInfo: { frame: 'time.Time' } },
                  { name: 'Value', type: 'number', labels: { job: 'prometheus', instance: 'localhost:9090' } }
                ]
              },
              data: {
                values: [
                  this.generateTimeArray(from, to, 60000),
                  this.generateRandomValues(20, 0.7, 0.95)
                ]
              }
            }]
          };
        } else {
          console.log('📊 Mock server: Routing to InfluxDB response');
          // InfluxDB response
          const influxQuery = query.rawQuery || query.query || query.expr || '';
          console.log('🔍 Mock server processing InfluxDB query:', influxQuery);
          
          // Handle InfluxDB schema queries
          if (typeof influxQuery === 'string' && influxQuery.includes('SHOW RETENTION POLICIES')) {
            console.log('📊 Mock server: Detected SHOW RETENTION POLICIES query');
            results[refId] = {
              frames: [{
                schema: {
                  refId,
                  meta: { 
                    type: 'table',
                    custom: { query: influxQuery }
                  },
                  fields: [
                    { name: 'name', type: 'string' }
                  ]
                },
                data: {
                  values: [
                    ['autogen', '7d', '30d', '1y']
                  ]
                }
              }]
            };
          }
          else if (typeof influxQuery === 'string' && influxQuery.includes('SHOW MEASUREMENTS')) {
            console.log('📊 Mock server: Detected SHOW MEASUREMENTS query');
            results[refId] = {
              frames: [{
                schema: {
                  refId,
                  meta: { 
                    type: 'table',
                    custom: { query: influxQuery }
                  },
                  fields: [
                    { name: 'name', type: 'string' }
                  ]
                },
                data: {
                  values: [
                    ['cpu_usage', 'memory_usage', 'disk_io', 'network_traffic', 'http_requests', 'response_time', 'error_rate']
                  ]
                }
              }]
            };
          }
          else if (typeof influxQuery === 'string' && influxQuery.includes('SHOW FIELD KEYS')) {
            const measurement = influxQuery.match(/FROM\s+"?(\w+)"?/i)?.[1] || 'cpu_usage';
            
            const fieldKeys = {
              cpu_usage: ['usage_idle', 'usage_system', 'usage_user', 'usage_iowait'],
              memory_usage: ['used', 'free', 'cached', 'available'],
              disk_io: ['read_bytes', 'write_bytes', 'read_time', 'write_time'],
              network_traffic: ['bytes_sent', 'bytes_recv', 'packets_sent', 'packets_recv']
            };
            
            results[refId] = {
              frames: [{
                schema: {
                  refId,
                  meta: { 
                    type: 'table',
                    custom: { query: influxQuery }
                  },
                  fields: [
                    { name: 'fieldKey', type: 'string' }
                  ]
                },
                data: {
                  values: [
                    fieldKeys[measurement] || ['value']
                  ]
                }
              }]
            };
          }
          else if (typeof influxQuery === 'string' && influxQuery.includes('SHOW TAG KEYS')) {
            results[refId] = {
              frames: [{
                schema: {
                  refId,
                  meta: { 
                    type: 'table',
                    custom: { query: influxQuery }
                  },
                  fields: [
                    { name: 'tagKey', type: 'string' }
                  ]
                },
                data: {
                  values: [
                    ['host', 'region', 'datacenter', 'environment', 'service', 'cluster']
                  ]
                }
              }]
            };
          }
          else {
            // Regular data query response
            results[refId] = {
              frames: [{
                schema: {
                  refId,
                  meta: { 
                    type: 'timeseries',
                    custom: { query: influxQuery }
                  },
                  fields: [
                    { name: 'time', type: 'time', typeInfo: { frame: 'time.Time' } },
                    { name: 'value', type: 'number' },
                    { name: 'host', type: 'string' }
                  ]
                },
                data: {
                  values: [
                    this.generateTimeArray(from, to, 60000),
                    this.generateRandomValues(20, 30, 80),
                    Array(20).fill('server-1')
                  ]
                }
              }]
            };
          }
        }
      });
      
      res.json({ results });
    });
    
    // Dashboard search
    this.app.get('/api/search', (req, res) => {
      const { query = '', type, tag } = req.query;
      
      let dashboards = [
        {
          id: 1,
          uid: 'system-metrics',
          title: 'System Metrics Overview',
          tags: ['system', 'monitoring', 'infrastructure'],
          type: 'dash-db',
          url: '/d/system-metrics/system-metrics-overview'
        },
        {
          id: 2,
          uid: 'app-performance',
          title: 'Application Performance',
          tags: ['app', 'performance', 'apm'],
          type: 'dash-db',
          url: '/d/app-performance/application-performance'
        },
        {
          id: 3,
          uid: 'network-traffic',
          title: 'Network Traffic Analysis',
          tags: ['network', 'traffic', 'infrastructure'],
          type: 'dash-db',
          url: '/d/network-traffic/network-traffic-analysis'
        },
        {
          id: 4,
          uid: 'error-rates',
          title: 'Error Rate Dashboard',
          tags: ['errors', 'monitoring', 'alerts'],
          type: 'dash-db',
          url: '/d/error-rates/error-rate-dashboard'
        }
      ];
      
      // Filter by query
      if (query) {
        dashboards = dashboards.filter(d => 
          d.title.toLowerCase().includes(query.toLowerCase()) ||
          d.tags.some(t => t.includes(query.toLowerCase()))
        );
      }
      
      // Filter by tag
      if (tag) {
        dashboards = dashboards.filter(d => d.tags.includes(tag));
      }
      
      res.json(dashboards);
    });
    
    // Annotations
    this.app.get('/api/annotations', (req, res) => {
      res.json([
        {
          id: 1,
          alertId: 0,
          dashboardId: 1,
          panelId: 1,
          userId: 1,
          userName: 'admin',
          newState: '',
          prevState: '',
          time: Date.now() - 3600000,
          timeEnd: Date.now() - 3000000,
          text: 'Deployment started',
          tags: ['deployment']
        }
      ]);
    });
  }
  
  setupPrometheusRoutes() {
    // Prometheus metadata endpoints
    this.app.get('/api/datasources/proxy/:id/api/v1/label/__name__/values', (req, res) => {
      // Return metric names
      res.json({
        status: 'success',
        data: [
          'up',
          'node_cpu_seconds_total',
          'node_memory_MemAvailable_bytes',
          'node_memory_MemTotal_bytes',
          'node_disk_io_time_seconds_total',
          'node_network_receive_bytes_total',
          'node_network_transmit_bytes_total',
          'process_cpu_seconds_total',
          'process_resident_memory_bytes',
          'http_requests_total',
          'http_request_duration_seconds',
          'go_goroutines',
          'go_memstats_alloc_bytes'
        ]
      });
    });
    
    // Labels endpoint
    this.app.get('/api/datasources/proxy/:id/api/v1/labels', (req, res) => {
      res.json({
        status: 'success',
        data: [
          '__name__',
          'instance',
          'job',
          'cpu',
          'mode',
          'device',
          'mountpoint',
          'fstype',
          'method',
          'status',
          'handler',
          'env',
          'region',
          'datacenter',
          'service'
        ]
      });
    });
    
    // Label values
    this.app.get('/api/datasources/proxy/:id/api/v1/label/:label/values', (req, res) => {
      const { label } = req.params;
      
      const labelValues = {
        'job': ['prometheus', 'node-exporter', 'grafana', 'alertmanager'],
        'instance': ['localhost:9090', 'localhost:9100', 'server1:9100', 'server2:9100'],
        'cpu': ['0', '1', '2', '3', '4', '5', '6', '7'],
        'mode': ['idle', 'user', 'system', 'iowait', 'steal'],
        'device': ['sda', 'sdb', 'nvme0n1', 'nvme1n1'],
        'method': ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        'status': ['200', '201', '400', '401', '403', '404', '500', '502', '503'],
        'env': ['production', 'staging', 'development', 'test'],
        'region': ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-1'],
        'service': ['api', 'web', 'database', 'cache', 'queue']
      };
      
      res.json({
        status: 'success',
        data: labelValues[label] || []
      });
    });
    
    // Series endpoint
    this.app.get('/api/datasources/proxy/:id/api/v1/series', (req, res) => {
      res.json({
        status: 'success',
        data: [
          {
            __name__: 'up',
            job: 'prometheus',
            instance: 'localhost:9090'
          },
          {
            __name__: 'node_cpu_seconds_total',
            cpu: '0',
            mode: 'idle',
            instance: 'localhost:9100',
            job: 'node-exporter'
          }
        ]
      });
    });
    
    // Query endpoint
    this.app.post('/api/datasources/proxy/:id/api/v1/query', (req, res) => {
      const { query, time } = req.body;
      
      res.json({
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: {
                __name__: 'up',
                instance: 'localhost:9090',
                job: 'prometheus'
              },
              value: [Date.now() / 1000, '1']
            }
          ]
        }
      });
    });
    
    // Query range endpoint
    this.app.post('/api/datasources/proxy/:id/api/v1/query_range', (req, res) => {
      const { query, start, end, step } = req.body;
      
      const values = [];
      const startTime = parseInt(start);
      const endTime = parseInt(end);
      const stepSize = parseInt(step) || 60;
      
      for (let t = startTime; t <= endTime; t += stepSize) {
        values.push([t, String(0.8 + Math.random() * 0.2)]);
      }
      
      res.json({
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: {
                __name__: 'up',
                instance: 'localhost:9090',
                job: 'prometheus'
              },
              values: values
            }
          ]
        }
      });
    });
  }
  
  setupInfluxRoutes() {
    // InfluxDB query endpoint
    this.app.post('/api/datasources/proxy/:id/query', (req, res) => {
      const { q, db, epoch } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: 'missing required parameter "q"' });
      }
      
      const query = q.toUpperCase();
      
      // SHOW DATABASES
      if (query.includes('SHOW DATABASES')) {
        res.json({
          results: [{
            statement_id: 0,
            series: [{
              name: 'databases',
              columns: ['name'],
              values: [
                ['_internal'],
                ['test_db'],
                ['prod_db'],
                ['monitoring'],
                ['telegraf']
              ]
            }]
          }]
        });
      }
      // SHOW RETENTION POLICIES
      else if (query.includes('SHOW RETENTION POLICIES')) {
        res.json({
          results: [{
            statement_id: 0,
            series: [{
              name: 'retention_policies',
              columns: ['name', 'duration', 'shardGroupDuration', 'replicaN', 'default'],
              values: [
                ['autogen', '0s', '168h0m0s', 1, true],
                ['7d', '168h0m0s', '24h0m0s', 1, false],
                ['30d', '720h0m0s', '24h0m0s', 1, false],
                ['1y', '8760h0m0s', '168h0m0s', 1, false]
              ]
            }]
          }]
        });
      }
      // SHOW MEASUREMENTS
      else if (query.includes('SHOW MEASUREMENTS')) {
        res.json({
          results: [{
            statement_id: 0,
            series: [{
              name: 'measurements',
              columns: ['name'],
              values: [
                ['cpu_usage'],
                ['memory_usage'],
                ['disk_io'],
                ['network_traffic'],
                ['http_requests'],
                ['response_time'],
                ['error_rate'],
                ['queue_depth'],
                ['cache_hits'],
                ['database_connections']
              ]
            }]
          }]
        });
      }
      // SHOW FIELD KEYS
      else if (query.includes('SHOW FIELD KEYS')) {
        const measurement = query.match(/FROM\s+"?(\w+)"?/i)?.[1] || 'cpu_usage';
        
        const fieldKeys = {
          cpu_usage: [
            ['usage_idle', 'float'],
            ['usage_system', 'float'],
            ['usage_user', 'float'],
            ['usage_iowait', 'float']
          ],
          memory_usage: [
            ['used', 'integer'],
            ['free', 'integer'],
            ['cached', 'integer'],
            ['available', 'integer']
          ],
          disk_io: [
            ['read_bytes', 'integer'],
            ['write_bytes', 'integer'],
            ['read_time', 'float'],
            ['write_time', 'float']
          ],
          network_traffic: [
            ['bytes_sent', 'integer'],
            ['bytes_recv', 'integer'],
            ['packets_sent', 'integer'],
            ['packets_recv', 'integer']
          ]
        };
        
        res.json({
          results: [{
            statement_id: 0,
            series: [{
              name: measurement,
              columns: ['fieldKey', 'fieldType'],
              values: fieldKeys[measurement] || [['value', 'float']]
            }]
          }]
        });
      }
      // SHOW TAG KEYS
      else if (query.includes('SHOW TAG KEYS')) {
        const measurement = query.match(/FROM\s+"?(\w+)"?/i)?.[1];
        
        res.json({
          results: [{
            statement_id: 0,
            series: [{
              name: measurement || 'cpu_usage',
              columns: ['tagKey'],
              values: [
                ['host'],
                ['region'],
                ['datacenter'],
                ['environment'],
                ['service'],
                ['cluster']
              ]
            }]
          }]
        });
      }
      // SHOW TAG VALUES
      else if (query.includes('SHOW TAG VALUES')) {
        const tagKey = query.match(/KEY\s*=\s*"?(\w+)"?/i)?.[1] || 'host';
        
        const tagValues = {
          host: [
            ['server-1'],
            ['server-2'],
            ['server-3'],
            ['db-master'],
            ['db-replica'],
            ['cache-1']
          ],
          region: [
            ['us-east-1'],
            ['us-west-2'],
            ['eu-central-1'],
            ['ap-southeast-1']
          ],
          environment: [
            ['production'],
            ['staging'],
            ['development'],
            ['test']
          ],
          datacenter: [
            ['dc1'],
            ['dc2'],
            ['dc3']
          ],
          service: [
            ['api'],
            ['web'],
            ['worker'],
            ['scheduler']
          ]
        };
        
        res.json({
          results: [{
            statement_id: 0,
            series: [{
              name: 'cpu_usage',
              columns: ['key', 'value'],
              values: tagValues[tagKey] ? tagValues[tagKey].map(v => [tagKey, v[0]]) : []
            }]
          }]
        });
      }
      // Regular SELECT query
      else {
        const now = Date.now() * 1000000; // nanoseconds
        const hour = 3600000000000; // 1 hour in nanoseconds
        
        res.json({
          results: [{
            statement_id: 0,
            series: [{
              name: 'cpu_usage',
              tags: { host: 'server-1', region: 'us-east-1' },
              columns: ['time', 'usage_idle', 'usage_system', 'usage_user'],
              values: [
                [now - hour * 4, 75.2, 12.3, 12.5],
                [now - hour * 3, 72.8, 13.1, 14.1],
                [now - hour * 2, 78.5, 10.2, 11.3],
                [now - hour, 76.9, 11.8, 11.3],
                [now, 74.1, 12.9, 13.0]
              ]
            }]
          }]
        });
      }
    });
  }
  
  setupAIRoutes() {
    // Ollama models endpoint
    this.app.get('/api/tags', (req, res) => {
      res.json({
        models: [
          {
            name: 'llama3.1:8b',
            model: 'llama3.1:8b',
            modified_at: '2024-01-01T00:00:00Z',
            size: 4661224128,
            digest: 'abc123',
            details: {
              parent_model: '',
              format: 'gguf',
              family: 'llama',
              parameter_size: '8B',
              quantization_level: 'Q4_0'
            }
          },
          {
            name: 'gemma3:27b',
            model: 'gemma3:27b',
            modified_at: '2024-01-01T00:00:00Z',
            size: 27000000000,
            digest: 'def456',
            details: {
              parent_model: '',
              format: 'gguf',
              family: 'gemma',
              parameter_size: '27B',
              quantization_level: 'Q5_K_M'
            }
          },
          {
            name: 'mistral:7b',
            model: 'mistral:7b',
            modified_at: '2024-01-01T00:00:00Z',
            size: 7000000000,
            digest: 'ghi789',
            details: {
              parent_model: '',
              format: 'gguf',
              family: 'mistral',
              parameter_size: '7B',
              quantization_level: 'Q4_K_M'
            }
          }
        ]
      });
    });
    
    // Ollama generate endpoint
    this.app.post('/api/generate', (req, res) => {
      const { model, prompt, stream, options = {} } = req.body;
      
      if (!model || !prompt) {
        return res.status(400).json({ error: 'Missing model or prompt' });
      }
      
      const response = this.generateContextualResponse(prompt);
      
      res.json({
        model: model,
        created_at: new Date().toISOString(),
        response: response,
        done: true,
        context: [1, 2, 3, 4, 5],
        total_duration: 5000000000,
        load_duration: 500000000,
        prompt_eval_count: prompt.split(' ').length,
        prompt_eval_duration: 1000000000,
        eval_count: response.split(' ').length,
        eval_duration: 3500000000
      });
    });
    
    // OpenAI chat completions
    this.app.post('/v1/chat/completions', (req, res) => {
      const { model, messages, temperature = 0.7, max_tokens = 500 } = req.body;
      
      if (!messages || messages.length === 0) {
        return res.status(400).json({ error: 'No messages provided' });
      }
      
      const lastMessage = messages[messages.length - 1];
      const response = this.generateContextualResponse(lastMessage.content);
      
      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model || 'gpt-4',
        system_fingerprint: 'fp_mock_test',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response
          },
          logprobs: null,
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 150,
          total_tokens: 250
        }
      });
    });
    
    // Embeddings endpoint
    this.app.post('/api/embeddings', (req, res) => {
      const { model, prompt } = req.body;
      
      // Generate mock embeddings (768 dimensions for compatibility)
      const embedding = Array(768).fill(0).map(() => Math.random() * 2 - 1);
      
      res.json({
        embedding: embedding
      });
    });
  }
  
  setupFileRoutes() {
    // Mock file operations for testing
    this.app.post('/api/file/save', (req, res) => {
      const { path: filePath, content } = req.body;
      
      this.savedQueries[filePath] = {
        content,
        savedAt: new Date().toISOString()
      };
      
      res.json({ success: true, path: filePath });
    });
    
    this.app.get('/api/file/load', (req, res) => {
      const { path: filePath } = req.query;
      
      const file = this.savedQueries[filePath];
      if (file) {
        res.json({ success: true, content: file.content });
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    });
    
    this.app.get('/api/file/list', (req, res) => {
      const files = Object.keys(this.savedQueries).map(path => ({
        path,
        name: path.split('/').pop(),
        size: this.savedQueries[path].content.length,
        modified: this.savedQueries[path].savedAt
      }));
      
      res.json({ files });
    });
  }
  
  setupVariableRoutes() {
    // Variable management
    this.app.get('/api/variables', (req, res) => {
      res.json(Object.entries(this.variables).map(([key, value]) => ({
        name: key,
        value: value,
        type: typeof value === 'object' ? 'query' : 'constant'
      })));
    });
    
    this.app.post('/api/variables', (req, res) => {
      const { name, value } = req.body;
      this.variables[name] = value;
      res.json({ success: true });
    });
    
    this.app.delete('/api/variables/:name', (req, res) => {
      delete this.variables[req.params.name];
      res.json({ success: true });
    });
  }
  
  // Helper methods
  generateTimeArray(from, to, interval) {
    const times = [];
    const start = from ? new Date(from).getTime() : Date.now() - 3600000;
    const end = to ? new Date(to).getTime() : Date.now();
    
    for (let t = start; t <= end; t += interval) {
      times.push(t);
    }
    return times;
  }
  
  generateRandomValues(count, min, max) {
    return Array(count).fill(0).map(() => 
      min + Math.random() * (max - min)
    );
  }
  
  generateContextualResponse(prompt) {
    const promptLower = prompt.toLowerCase();
    
    // Query generation responses
    if (promptLower.includes('cpu') && (promptLower.includes('query') || promptLower.includes('show'))) {
      return `Here's a query for CPU usage:

\`\`\`sql
SELECT mean("usage_idle") AS "idle", 
       mean("usage_system") AS "system",
       mean("usage_user") AS "user"
FROM "cpu_usage"
WHERE time > now() - 1h
GROUP BY time(5m), "host"
ORDER BY time DESC
\`\`\`

This query calculates the average CPU usage broken down by idle, system, and user time, grouped by 5-minute intervals and host.`;
    }
    
    if (promptLower.includes('memory') && promptLower.includes('query')) {
      return `For memory usage monitoring:

\`\`\`sql
SELECT mean("used") * 100 / mean("total") AS "memory_percent"
FROM "memory_usage"
WHERE time > now() - 6h
GROUP BY time(10m), "host"
\`\`\`

This calculates memory usage percentage over the last 6 hours.`;
    }
    
    // Prometheus queries
    if (promptLower.includes('prometheus') || promptLower.includes('promql')) {
      return `Here's a PromQL query example:

\`\`\`promql
rate(http_requests_total[5m])
\`\`\`

This calculates the per-second rate of HTTP requests averaged over 5 minutes.

For more complex scenarios:
\`\`\`promql
sum by (status) (
  rate(http_requests_total[5m])
) 
\`\`\``;
    }
    
    // Optimization suggestions
    if (promptLower.includes('optimize') || promptLower.includes('improve')) {
      return `## Query Optimization Suggestions

1. **Add time constraints**: Always include \`WHERE time > now() - <duration>\`
2. **Use appropriate aggregations**: Prefer \`mean()\` or \`median()\` over \`SELECT *\`
3. **Group efficiently**: Use \`GROUP BY time()\` with appropriate intervals
4. **Limit results**: Add \`LIMIT\` clause for large datasets
5. **Index tags**: Ensure frequently queried tags are indexed

### Optimized version:
\`\`\`sql
SELECT mean("value") 
FROM "measurement"
WHERE time > now() - 1h 
  AND "tag" = 'specific_value'
GROUP BY time(1m)
LIMIT 100
\`\`\``;
    }
    
    // Anomaly detection
    if (promptLower.includes('anomaly') || promptLower.includes('anomalies')) {
      return `## Anomaly Detection Results

I've analyzed your data and found the following anomalies:

1. **CPU Spike** at 14:32:15
   - Normal range: 40-60%
   - Detected value: 95%
   - Duration: 5 minutes

2. **Memory Leak Pattern** on server-2
   - Gradual increase over 2 hours
   - No corresponding decrease
   - Recommendation: Investigate application logs

3. **Network Latency** increase
   - Baseline: 20ms
   - Current: 150ms
   - Affected services: API, Database

### Recommended Actions:
- Set up alerts for CPU > 80%
- Monitor memory trends
- Check network infrastructure`;
    }
    
    // Default helpful response
    return `I understand you're asking about "${prompt}". 

Based on your current setup, here are some suggestions:

1. Ensure your datasource is properly configured
2. Use appropriate time ranges in your queries
3. Consider using aggregation functions for better performance

Would you like me to help you write a specific query or analyze your data?`;
  }
  
  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🎭 Enhanced Mock Server running on http://localhost:${this.port}`);
        console.log(`📊 Simulating: Grafana, InfluxDB, Prometheus, AI Services`);
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

module.exports = EnhancedMockServer;