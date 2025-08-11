const GrafanaConfig = {
    // Connection state
    connected: false,
    url: '',
    username: '',
    password: '',
    authHeader: '',
    currentConnectionId: null,
    
    // Application state
    currentQueryType: 'influxql',
    datasources: [],
    currentResults: null,
    currentPage: 1,
    pageSize: 100,
    totalRows: 0,
    selectedSeries: 0,
    currentViewMode: 'table',
    chartInstance: null,
    queryEditor: null,
    currentEditingConnectionId: null
};

// Query type keywords for autocomplete
const QueryKeywords = {
    promql: [
        'up', 'rate', 'increase', 'sum', 'avg', 'count', 'min', 'max',
        'histogram_quantile', 'topk', 'bottomk', 'sort', 'sort_desc',
        'absent', 'ceil', 'floor', 'round', 'sqrt', 'exp', 'ln', 'log2', 'log10',
        'abs', 'delta', 'deriv', 'predict_linear', 'irate', 'resets',
        'changes', 'label_replace', 'label_join', 'time', 'timestamp',
        'minute', 'hour', 'day_of_month', 'day_of_week', 'days_in_month',
        'month', 'year', 'vector', 'scalar', 'bool', 'by', 'without',
        'group_left', 'group_right', 'offset', 'ignoring', 'on', 'and', 'or', 'unless'
    ],
    influxql: [
        // Keywords from specification
        'ALL', 'ALTER', 'ANALYZE', 'ANY', 'AS', 'ASC', 'BEGIN', 'BY', 'CREATE', 'CONTINUOUS', 
        'DATABASE', 'DATABASES', 'DEFAULT', 'DELETE', 'DESC', 'DESTINATIONS', 'DIAGNOSTICS', 
        'DISTINCT', 'DROP', 'DURATION', 'END', 'EVERY', 'EXPLAIN', 'FIELD', 'FOR', 'FROM', 
        'GRANT', 'GRANTS', 'GROUP', 'GROUPS', 'IN', 'INF', 'INSERT', 'INTO', 'KEY', 'KEYS', 
        'KILL', 'LIMIT', 'SHOW', 'MEASUREMENT', 'MEASUREMENTS', 'NAME', 'OFFSET', 'ON', 'ORDER', 
        'PASSWORD', 'POLICY', 'POLICIES', 'PRIVILEGES', 'QUERIES', 'QUERY', 'READ', 'REPLICATION', 
        'RESAMPLE', 'RETENTION', 'REVOKE', 'SELECT', 'SERIES', 'SET', 'SHARD', 'SHARDS', 'SLIMIT', 
        'SOFFSET', 'STATS', 'SUBSCRIPTION', 'SUBSCRIPTIONS', 'TAG', 'TO', 'USER', 'USERS', 
        'VALUES', 'WHERE', 'WITH', 'WRITE',
        
        // Functions and aggregates
        'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV', 'SUM', 'COUNT', 'DISTINCT', 'INTEGRAL', 
        'DERIVATIVE', 'DIFFERENCE', 'NON_NEGATIVE_DERIVATIVE', 'ELAPSED', 'MOVING_AVERAGE', 
        'CUMULATIVE_SUM', 'HOLT_WINTERS', 'PERCENTILE', 'SAMPLE', 'TOP', 'BOTTOM', 'FIRST', 
        'LAST', 'MAX', 'MIN',
        
        // Operators and literals
        'AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'NULL', 'IS', 'LIKE', 'REGEX', 'FILL', 'LINEAR',
        'NONE', 'PREVIOUS', 'NOW', 'TIME', 'TZ',
        
        // Additional common terms
        'CONTINUOUS QUERY', 'RETENTION POLICY', 'SHARD DURATION', 'REPLICATION', 'ALL PRIVILEGES'
    ]
};

// Enhanced autocompletion data for InfluxQL
const InfluxQLHelpers = {
    aggregateFunctions: [
        'COUNT', 'SUM', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV',
        'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE', 'SAMPLE', 'TOP', 'BOTTOM'
    ],
    selectorFunctions: [
        'FIRST', 'LAST', 'MAX', 'MIN', 'SAMPLE', 'TOP', 'BOTTOM'
    ],
    transformationFunctions: [
        'DERIVATIVE', 'DIFFERENCE', 'NON_NEGATIVE_DERIVATIVE', 'INTEGRAL', 
        'ELAPSED', 'MOVING_AVERAGE', 'CUMULATIVE_SUM', 'HOLT_WINTERS'
    ],
    dateFunctions: [
        'NOW', 'TIME'
    ],
    fillOptions: [
        'FILL(null)', 'FILL(none)', 'FILL(previous)', 'FILL(linear)', 'FILL(0)'
    ],
    durationUnits: [
        'u', 'µ', 'ms', 's', 'm', 'h', 'd', 'w'
    ],
    operators: [
        '=', '!=', '<>', '<', '<=', '>', '>=', '=~', '!~', 'AND', 'OR', 'NOT'
    ],
    showStatements: [
        'SHOW DATABASES', 'SHOW MEASUREMENTS', 'SHOW SERIES', 'SHOW TAG KEYS',
        'SHOW TAG VALUES', 'SHOW FIELD KEYS', 'SHOW RETENTION POLICIES', 
        'SHOW USERS', 'SHOW GRANTS', 'SHOW QUERIES', 'SHOW SHARDS', 
        'SHOW SHARD GROUPS', 'SHOW SUBSCRIPTIONS', 'SHOW CONTINUOUS QUERIES'
    ],
    createStatements: [
        'CREATE DATABASE', 'CREATE RETENTION POLICY', 'CREATE USER', 
        'CREATE CONTINUOUS QUERY', 'CREATE SUBSCRIPTION'
    ]
};

// Chart color palette - VS Code theme compatible
const ChartColors = [
    '#007acc', // VS Code blue (primary)
    '#4fc3f7', // Light blue
    '#66bb6a', // Green
    '#ffb74d', // Orange
    '#ba68c8', // Purple
    '#f06292', // Pink
    '#64b5f6', // Medium blue
    '#81c784', // Light green
    '#ffab40', // Amber
    '#9575cd', // Deep purple
    '#4dd0e1', // Cyan
    '#aed581'  // Light lime
];