// Queries Module - Handles query execution and result display
// Uses DataAccess layer for unified database communication
const Queries = {
    // Execute query
    async executeQuery() {
        // Get datasource ID from global config (new interface)
        const datasourceId = GrafanaConfig.currentDatasourceId;
        const rawQuery = Editor.getQueryValue();
        
        if (!datasourceId) {
            Utils.showResults('Please select a data source', 'error');
            return;
        }
        
        if (!rawQuery) {
            Utils.showResults('Please enter a query', 'error');
            return;
        }
        
        // Substitute variables in the query
        const query = Variables.substituteVariables(rawQuery);
        
        // Log variable substitution for debugging
        if (query !== rawQuery) {
            console.log('Variable substitution applied:');
            console.log('Original query:', rawQuery);
            console.log('Substituted query:', query);
        }
        
        // Get datasource info from global config (new interface)
        const datasourceType = GrafanaConfig.selectedDatasourceType || 'prometheus';
        const datasourceNumericId = GrafanaConfig.selectedDatasourceId;
        
        const timeFromHours = parseFloat(document.getElementById('timeFrom').value) || 1;
        const timeToHours = parseFloat(document.getElementById('timeTo').value) || 0;
        const now = Date.now();
        const fromTime = now - (timeFromHours * 60 * 60 * 1000);
        const toTime = now - (timeToHours * 60 * 60 * 1000);
        
        const maxDataPoints = parseInt(document.getElementById('maxDataPoints').value) || 1000;
        const intervalMs = parseInt(document.getElementById('intervalMs').value) || 15000;
        const instantQuery = document.getElementById('instantQuery').checked;
        
        Utils.showResults('Executing query...', 'loading');
        
        // Track execution timing
        const executionStartTime = Date.now();
        
        try {
            // Handle database resolution for InfluxDB queries
            let database = null;
            if (datasourceType === 'influxdb' && typeof query === 'string') {
                database = await this._resolveInfluxDatabase(datasourceId, query);
            }
            
            const result = await DataAccess.executeQuery(datasourceId, query, {
                timeRange: {
                    from: fromTime.toString(),
                    to: toTime.toString()
                },
                maxDataPoints: maxDataPoints,
                interval: `${Math.floor(intervalMs / 1000)}s`,
                datasourceType: datasourceType,
                format: instantQuery && datasourceType === 'prometheus' ? 'instant' : 'time_series',
                requestBuilder: QueryRequestBuilder,
                database: database
            });
            
            // Calculate execution time
            const executionTime = Date.now() - executionStartTime;
            
            // The result from /api/ds/query should already have the format: { results: { A: {...} } }
            // where A is the refId of our query
            const data = result;
            
            // Add execution timing to the data for display
            data.executionTime = executionTime;
            
            console.log('Response data:', data);
            GrafanaConfig.currentResults = data;
            this.displayResults(data);
            
            Storage.saveToHistory(rawQuery, datasourceId, GrafanaConfig.selectedDatasourceName || 'Unknown Datasource');
            History.loadHistory();
            
        } catch (error) {
            Utils.showResults('Error: ' + error.message, 'error');
            console.error('Query error:', error);
        }
    },

    // Resolve database for InfluxDB queries - simplified approach to avoid test conflicts
    async _resolveInfluxDatabase(datasourceId, query) {
        try {
            // First check if query explicitly specifies database with ON clause
            const dbMatch = query.match(/\s+ON\s+"?([^"\s]+)"?/i);
            if (dbMatch) {
                console.log('Database specified in query:', dbMatch[1]);
                return dbMatch[1];
            }
            
            // If no database specified in query, return null and let backend handle it
            // This avoids the double DataAccess.executeQuery call that breaks tests
            console.log('No database specified in query, letting backend handle database resolution');
            return null;
            
        } catch (error) {
            console.warn('Database resolution failed, letting backend handle it:', error.message);
            return null;
        }
    },

    // Display query results
    displayResults(data, page = 1, seriesIndex = 0) {
        const resultsDiv = document.getElementById('results');
        
        if (!data.results || !data.results.A) {
            Utils.showResults('No data returned', 'error');
            return;
        }
        
        const result = data.results.A;
        
        if (result.error) {
            Utils.showResults('Query error: ' + result.error, 'error');
            return;
        }
        
        if (!result.frames || result.frames.length === 0) {
            Utils.showResults('No data found', 'success');
            return;
        }
        
        let html = '<div class="view-toggle">';
        html += '<button class="' + (GrafanaConfig.currentViewMode === 'table' ? 'active' : '') + '" onclick="setViewMode(\'table\')">Table View</button>';
        html += '<button class="' + (GrafanaConfig.currentViewMode === 'chart' ? 'active' : '') + '" onclick="setViewMode(\'chart\')">Chart View</button>';
        html += '</div>';
        
        const hasMultipleSeries = result.frames.length > 1;
        const hasGroupByData = this.hasGroupByData(result.frames);
        GrafanaConfig.selectedSeries = seriesIndex;
        
        if (hasMultipleSeries || hasGroupByData) {
            html += '<div class="series-selector">';
            html += '<label for="seriesSelect">Select Group (from GROUP BY clause):</label>';
            html += '<select id="seriesSelect" class="series-dropdown" onchange="selectSeries(this.value)">';
            
            result.frames.forEach(function(frame, frameIndex) {
                const selected = frameIndex === seriesIndex ? 'selected' : '';
                let seriesName = 'Group ' + (frameIndex + 1);
                
                // Extract meaningful series name
                seriesName = Utils.extractSeriesName(frame, frameIndex);
                
                html += '<option value="' + frameIndex + '" ' + selected + '>' + Utils.escapeHtml(seriesName) + '</option>';
            });
            
            html += '</select>';
            html += '</div>';
            
            // Add group summary statistics
            html += this.generateGroupSummary(result.frames);
        }
        
        const frameToDisplay = result.frames[seriesIndex] || result.frames[0];
        
        if (frameToDisplay && frameToDisplay.schema && frameToDisplay.schema.fields && frameToDisplay.data && frameToDisplay.data.values) {
            html += '<h3>Results</h3>';
            
            // Add query execution timing if available
            if (data.executionTime) {
                html += '<div class="query-timing execution-time" style="color: #cccccc; font-size: 12px; margin-bottom: 10px;">';
                html += 'Query executed in ' + data.executionTime + 'ms';
                html += '</div>';
            }
            
            // Removed redundant executed query display since it's visible in the editor
            
            try {
                if (GrafanaConfig.currentViewMode === 'chart') {
                    html += this.renderChartView(frameToDisplay, hasMultipleSeries ? result.frames : [frameToDisplay]);
                } else {
                    html += this.renderTableView(frameToDisplay, page);
                }
            } catch (error) {
                console.error('Error rendering view:', error);
                html += '<div class="error">Error rendering view: ' + error.message + '</div>';
            }
        }
        
        // Add all groups summary for multiple series
        if (hasMultipleSeries || hasGroupByData) {
            html += '<details style="margin-top: 20px;"><summary style="cursor: pointer; color: #f46800;">View All Groups Summary</summary>';
            html += '<div style="margin-top: 10px;">';
            result.frames.forEach(function(frame, frameIndex) {
                const rowCount = frame.data && frame.data.values && frame.data.values[0] ? frame.data.values[0].length : 0;
                const groupName = Utils.extractSeriesName(frame, frameIndex);
                html += '<p style="color: #b0b0b0; margin: 5px 0;"><strong>' + Utils.escapeHtml(groupName) + '</strong>: ' + rowCount + ' rows</p>';
            });
            html += '</div></details>';
        }
        
        html += '<details style="margin-top: 20px;"><summary style="cursor: pointer; color: #f46800;">View Raw Response</summary>';
        html += '<pre>' + Utils.escapeHtml(JSON.stringify(data, null, 2)) + '</pre>';
        html += '</details>';
        
        resultsDiv.innerHTML = html;
        
        // Initialize chart if in chart view mode
        if (GrafanaConfig.currentViewMode === 'chart') {
            setTimeout(function() {
                Charts.initializeChart(result.frames);
                
                // Attach event listeners after chart is initialized
                const showAllSeriesEl = document.getElementById('showAllSeries');
                const chartTypeEl = document.getElementById('chartType');
                const smoothLinesEl = document.getElementById('smoothLines');
                
                if (showAllSeriesEl && !showAllSeriesEl.hasAttribute('data-listener-attached')) {
                    showAllSeriesEl.setAttribute('data-listener-attached', 'true');
                    showAllSeriesEl.addEventListener('change', function() {
                        console.log('Show All Series changed to:', showAllSeriesEl.checked);
                        updateChart();
                    });
                }
                if (chartTypeEl && !chartTypeEl.hasAttribute('data-listener-attached')) {
                    chartTypeEl.setAttribute('data-listener-attached', 'true');
                    chartTypeEl.addEventListener('change', function() {
                        console.log('Chart Type changed to:', chartTypeEl.value);
                        updateChart();
                    });
                }
                if (smoothLinesEl && !smoothLinesEl.hasAttribute('data-listener-attached')) {
                    smoothLinesEl.setAttribute('data-listener-attached', 'true');
                    smoothLinesEl.addEventListener('change', function() {
                        console.log('Smooth Lines changed to:', smoothLinesEl.checked);
                        updateChart();
                    });
                }
            }, 50);
        }
    },

    // Render table view
    renderTableView(frameToDisplay, page) {
        GrafanaConfig.totalRows = frameToDisplay.data.values[0] ? frameToDisplay.data.values[0].length : 0;
        const startRow = (page - 1) * GrafanaConfig.pageSize;
        const endRow = Math.min(startRow + GrafanaConfig.pageSize, GrafanaConfig.totalRows);
        const totalPages = Math.ceil(GrafanaConfig.totalRows / GrafanaConfig.pageSize);
        GrafanaConfig.currentPage = page;
        
        let html = '<div class="table-container">';
        html += '<div class="table-wrapper"><table>';
        
        // Table header
        html += '<thead><tr>';
        frameToDisplay.schema.fields.forEach(function(field) {
            let headerText = field.name;
            if (field.config && field.config.displayNameFromDS) {
                headerText = field.config.displayNameFromDS;
            }
            html += '<th>' + headerText + ' (' + field.type + ')</th>';
        });
        html += '</tr></thead>';
        
        // Table body
        html += '<tbody>';
        for (let i = startRow; i < endRow; i++) {
            html += '<tr>';
            frameToDisplay.data.values.forEach(function(column, colIndex) {
                let value = column[i];
                const field = frameToDisplay.schema.fields[colIndex];
                
                // Format time values
                if (field.type === 'time') {
                    value = Utils.formatTimeValue(value);
                }
                
                // Format number values
                if (typeof value === 'number' && !Number.isInteger(value)) {
                    value = Utils.formatNumberValue(value);
                }
                
                // For Prometheus data, append labels to the value
                let displayValue = (value !== null && value !== undefined ? value : 'null');
                if (field.labels && Object.keys(field.labels).length > 0) {
                    const labels = Object.entries(field.labels)
                        .filter(([key, val]) => key !== '__name__') // Skip the metric name
                        .map(([key, val]) => `${key}=${val}`)
                        .join(', ');
                    if (labels) {
                        displayValue += ` {${labels}}`;
                    }
                }
                
                html += '<td>' + displayValue + '</td>';
            });
            html += '</tr>';
        }
        
        html += '</tbody></table></div>';
        html += '</div>'; // Close table-container
        
        // Pagination controls (outside the scrollable area)
        if (GrafanaConfig.totalRows > 0) {
            html += '<div class="pagination-controls">';
            
            html += '<div class="pagination-info">Showing ' + (startRow + 1) + '-' + endRow + ' of ' + GrafanaConfig.totalRows + ' rows</div>';
            
            html += '<div class="page-size-selector">';
            html += '<span>Rows per page:</span>';
            html += '<select onchange="changePageSize(this.value)">';
            [25, 50, 100, 250, 500].forEach(function(size) {
                const selected = size === GrafanaConfig.pageSize ? 'selected' : '';
                html += '<option value="' + size + '" ' + selected + '>' + size + '</option>';
            });
            html += '</select>';
            html += '</div>';
            
            html += '<div class="pagination-buttons">';
            html += '<button onclick="goToPage(1)" ' + (page === 1 ? 'disabled' : '') + '>First</button>';
            html += '<button onclick="goToPage(' + (page - 1) + ')" ' + (page === 1 ? 'disabled' : '') + '>Previous</button>';
            html += '<span style="margin: 0 8px; color: #b0b0b0; font-size: 11px;">Page ' + page + ' of ' + totalPages + '</span>';
            html += '<button onclick="goToPage(' + (page + 1) + ')" ' + (page === totalPages ? 'disabled' : '') + '>Next</button>';
            html += '<button onclick="goToPage(' + totalPages + ')" ' + (page === totalPages ? 'disabled' : '') + '>Last</button>';
            html += '</div>';
            
            html += '</div>';
        }
        
        return html;
    },

    // Render chart view
    renderChartView(frameToDisplay, allFrames) {
        let html = '<div class="chart-controls">';
        html += '<div class="chart-options">';
        html += '<div class="chart-option">';
        html += '<input type="checkbox" id="showAllSeries" ' + (allFrames.length > 1 ? '' : 'disabled') + '>';
        html += '<label for="showAllSeries">Show All Groups</label>';
        html += '</div>';
        html += '<div class="chart-option">';
        html += '<label for="chartType">Chart Type:</label>';
        html += '<select id="chartType">';
        html += '<option value="line" selected>Line</option>';
        html += '<option value="bar">Bar</option>';
        html += '<option value="scatter">Scatter</option>';
        html += '</select>';
        html += '</div>';
        html += '<div class="chart-option">';
        html += '<input type="checkbox" id="smoothLines" checked>';
        html += '<label for="smoothLines">Smooth Lines</label>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        html += '<div class="chart-container">';
        html += '<div class="chart-wrapper">';
        html += '<canvas id="timeSeriesChart"></canvas>';
        html += '</div>';
        html += '</div>';
        
        return html;
    },

    // Generate compact group summary statistics
    generateGroupSummary(frames) {
        if (!frames || frames.length <= 1) return '';
        
        // Total rows across all groups
        const totalRows = frames.reduce(function(sum, frame) {
            const rows = frame.data && frame.data.values && frame.data.values[0] ? frame.data.values[0].length : 0;
            return sum + rows;
        }, 0);
        
        // Largest and smallest groups
        const maxRows = Math.max.apply(Math, frames.map(function(frame) {
            return frame.data && frame.data.values && frame.data.values[0] ? frame.data.values[0].length : 0;
        }));
        const minRows = Math.min.apply(Math, frames.map(function(frame) {
            return frame.data && frame.data.values && frame.data.values[0] ? frame.data.values[0].length : 0;
        }));
        
        let html = '<div class="series-stats-compact">';
        html += '<span class="compact-stat"><strong>' + frames.length + '</strong> groups</span>';
        html += '<span class="compact-stat"><strong>' + totalRows.toLocaleString() + '</strong> total rows</span>';
        html += '<span class="compact-stat">Range: <strong>' + minRows + '</strong> - <strong>' + maxRows + '</strong> rows</span>';
        html += '</div>';
        return html;
    },

    // Check if frames contain GROUP BY data (even with single frame)
    hasGroupByData(frames) {
        if (!frames || frames.length === 0) return false;
        
        // Check each frame for tag/group columns
        return frames.some(frame => {
            if (!frame.schema || !frame.schema.fields) return false;
            
            // Look for tag fields (non-time string fields)
            const tagFields = frame.schema.fields.filter(field => 
                field.type === 'string' && 
                field.name !== 'time' && 
                !field.name.startsWith('_')
            );
            
            // Check if we have tag fields with actual values
            if (tagFields.length > 0 && frame.data && frame.data.values) {
                return tagFields.some(field => {
                    const fieldIndex = frame.schema.fields.indexOf(field);
                    if (fieldIndex >= 0 && frame.data.values[fieldIndex] && frame.data.values[fieldIndex].length > 0) {
                        const value = frame.data.values[fieldIndex][0];
                        return value !== null && value !== undefined && value !== '';
                    }
                    return false;
                });
            }
            
            return false;
        });
    },

    // Clean centralized query execution API
    // Used by AI, Analytics, Schema explorer, and other modules
    async executeQueryDirect(query, options = {}) {
        // Use provided options or sensible defaults from current connection
        const datasourceId = options.datasourceId || GrafanaConfig.currentDatasourceId;
        const datasourceType = options.datasourceType || GrafanaConfig.selectedDatasourceType || 'influxdb';
        
        // Time range options
        const timeFromHours = options.timeFromHours || 1; // Default: 1 hour ago
        const timeToHours = options.timeToHours || 0;     // Default: now
        const maxDataPoints = options.maxDataPoints || 1000;
        const intervalMs = options.intervalMs || 15000;
        
        if (!datasourceId) {
            throw new Error('No datasource ID provided');
        }
        
        if (!query) {
            throw new Error('No query provided');
        }
        
        try {
            // Calculate time range from options
            const now = Date.now();
            const fromTime = now - (timeFromHours * 60 * 60 * 1000);
            const toTime = now - (timeToHours * 60 * 60 * 1000);
            
            // Handle database resolution for InfluxDB queries
            let database = null;
            if (datasourceType === 'influxdb' && typeof query === 'string') {
                database = await this._resolveInfluxDatabase(datasourceId, query);
            }
            
            // Use new DataAccess layer
            const result = await DataAccess.executeQuery(datasourceId, query, {
                timeRange: {
                    from: fromTime.toString(),
                    to: toTime.toString()
                },
                maxDataPoints: maxDataPoints,
                interval: `${Math.floor(intervalMs / 1000)}s`,
                datasourceType: datasourceType,
                format: 'time_series',
                database: database,
                raw: true // Return raw result for compatibility
            });
            
            return result;
            
        } catch (error) {
            console.error('Direct query error:', error);
            throw error;
        }
    }
};

// Global functions for HTML onclick handlers
function selectSeries(seriesIndex) {
    const index = parseInt(seriesIndex);
    if (GrafanaConfig.currentResults && index >= 0) {
        GrafanaConfig.currentPage = 1; // Reset to first page when changing series
        Queries.displayResults(GrafanaConfig.currentResults, GrafanaConfig.currentPage, index);
    }
}

function setViewMode(mode) {
    GrafanaConfig.currentViewMode = mode;
    if (GrafanaConfig.currentResults) {
        Queries.displayResults(GrafanaConfig.currentResults, GrafanaConfig.currentPage, GrafanaConfig.selectedSeries);
    }
}

function goToPage(page) {
    if (GrafanaConfig.currentResults && page >= 1 && page <= Math.ceil(GrafanaConfig.totalRows / GrafanaConfig.pageSize)) {
        Queries.displayResults(GrafanaConfig.currentResults, page, GrafanaConfig.selectedSeries);
    }
}

function changePageSize(newSize) {
    GrafanaConfig.pageSize = parseInt(newSize);
    GrafanaConfig.currentPage = 1; // Reset to first page when changing page size
    if (GrafanaConfig.currentResults) {
        Queries.displayResults(GrafanaConfig.currentResults, GrafanaConfig.currentPage, GrafanaConfig.selectedSeries);
    }
}