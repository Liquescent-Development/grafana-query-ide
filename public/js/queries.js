const Queries = {
    // Execute query
    async executeQuery() {
        const datasourceId = document.getElementById('datasource').value;
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
        
        const selectedOption = document.getElementById('datasource').selectedOptions[0];
        const datasourceType = selectedOption.dataset.type;
        const datasourceNumericId = selectedOption.dataset.id;
        
        const timeFromHours = parseFloat(document.getElementById('timeFrom').value) || 1;
        const timeToHours = parseFloat(document.getElementById('timeTo').value) || 0;
        const now = Date.now();
        const fromTime = now - (timeFromHours * 60 * 60 * 1000);
        const toTime = now - (timeToHours * 60 * 60 * 1000);
        
        const maxDataPoints = parseInt(document.getElementById('maxDataPoints').value) || 1000;
        const intervalMs = parseInt(document.getElementById('intervalMs').value) || 15000;
        const instantQuery = document.getElementById('instantQuery').checked;
        
        Utils.showResults('Executing query...', 'loading');
        
        try {
            let requestBody;
            let urlParams = '';
            
            if (datasourceType === 'prometheus') {
                const requestId = Math.random().toString(36).substr(2, 9);
                urlParams = '?ds_type=prometheus&requestId=' + requestId;
                
                requestBody = {
                    queries: [{
                        refId: 'A',
                        datasource: { 
                            uid: datasourceId,
                            type: 'prometheus'
                        },
                        expr: query,
                        instant: instantQuery,
                        interval: '',
                        legendFormat: '',
                        editorMode: 'code',
                        exemplar: false,
                        requestId: requestId.substr(0, 3).toUpperCase(),
                        utcOffsetSec: new Date().getTimezoneOffset() * -60,
                        scopes: [],
                        adhocFilters: [],
                        datasourceId: parseInt(datasourceNumericId),
                        intervalMs: intervalMs,
                        maxDataPoints: maxDataPoints
                    }],
                    from: fromTime.toString(),
                    to: toTime.toString()
                };
            } else if (datasourceType === 'influxdb') {
                const requestId = Math.random().toString(36).substr(2, 9);
                urlParams = '?ds_type=influxdb&requestId=' + requestId;
                
                requestBody = {
                    queries: [{
                        refId: 'A',
                        datasource: { 
                            uid: datasourceId,
                            type: 'influxdb'
                        },
                        query: query,
                        rawQuery: true,
                        resultFormat: 'time_series',
                        requestId: requestId.substr(0, 3).toUpperCase(),
                        utcOffsetSec: new Date().getTimezoneOffset() * -60,
                        datasourceId: parseInt(datasourceNumericId),
                        intervalMs: intervalMs,
                        maxDataPoints: maxDataPoints
                    }],
                    from: fromTime.toString(),
                    to: toTime.toString()
                };
            }
            
            console.log('Request body:', JSON.stringify(requestBody, null, 2));
            
            const response = await API.makeApiRequest('/api/ds/query' + urlParams, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('Query failed: ' + response.statusText + ' - ' + errorText);
            }
            
            const data = await response.json();
            console.log('Response data:', data);
            GrafanaConfig.currentResults = data;
            this.displayResults(data);
            
            Storage.saveToHistory(rawQuery, datasourceId, selectedOption.textContent);
            History.loadHistory();
            
        } catch (error) {
            Utils.showResults('Error: ' + error.message, 'error');
            console.error('Query error:', error);
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
        
        let html = '<div class="status success">Query executed successfully</div>';
        
        html += '<div class="view-toggle">';
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
            html += '<div class="series-info">Showing group ' + (seriesIndex + 1) + ' of ' + result.frames.length + ' (each group represents one GROUP BY value)</div>';
            html += '</div>';
            
            // Add group summary statistics
            html += this.generateGroupSummary(result.frames);
        }
        
        const frameToDisplay = result.frames[seriesIndex] || result.frames[0];
        
        if (frameToDisplay && frameToDisplay.schema && frameToDisplay.schema.fields && frameToDisplay.data && frameToDisplay.data.values) {
            if (hasMultipleSeries || hasGroupByData) {
                const groupName = Utils.extractSeriesName(frameToDisplay, seriesIndex);
                html += '<h3>Group: ' + Utils.escapeHtml(groupName) + '</h3>';
            } else {
                html += '<h3>Results</h3>';
            }
            
            if (frameToDisplay.schema.meta && frameToDisplay.schema.meta.executedQueryString) {
                html += '<p style="color: #888; margin-bottom: 10px; font-size: 12px;">Executed: ' + Utils.escapeHtml(frameToDisplay.schema.meta.executedQueryString) + '</p>';
            }
            
            if (GrafanaConfig.currentViewMode === 'chart') {
                html += this.renderChartView(frameToDisplay, hasMultipleSeries ? result.frames : [frameToDisplay]);
            } else {
                html += this.renderTableView(frameToDisplay, page);
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
                Charts.initializeChart(hasMultipleSeries ? result.frames : [frameToDisplay]);
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
        
        let html = '<div class="table-wrapper"><table>';
        
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
                
                // Format time values
                if (frameToDisplay.schema.fields[colIndex].type === 'time') {
                    value = Utils.formatTimeValue(value);
                }
                
                // Format number values
                if (typeof value === 'number' && !Number.isInteger(value)) {
                    value = Utils.formatNumberValue(value);
                }
                
                html += '<td>' + (value !== null && value !== undefined ? value : 'null') + '</td>';
            });
            html += '</tr>';
        }
        
        html += '</tbody></table></div>';
        
        // Pagination controls
        if (GrafanaConfig.totalRows > 0) {
            html += '<div class="pagination-controls">';
            html += '<div class="pagination-info">Showing ' + (startRow + 1) + '-' + endRow + ' of ' + GrafanaConfig.totalRows + ' rows</div>';
            
            html += '<div class="page-size-selector">';
            html += 'Rows per page: ';
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
            html += '<span style="margin: 0 10px; color: #b0b0b0;">Page ' + page + ' of ' + totalPages + '</span>';
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
        html += '<input type="checkbox" id="showAllSeries" onchange="updateChart()" ' + (allFrames.length > 1 ? '' : 'disabled') + '>';
        html += '<label for="showAllSeries">Show All Groups</label>';
        html += '</div>';
        html += '<div class="chart-option">';
        html += '<label>Chart Type:</label>';
        html += '<select id="chartType" onchange="updateChart()">';
        html += '<option value="line">Line</option>';
        html += '<option value="bar">Bar</option>';
        html += '<option value="scatter">Scatter</option>';
        html += '</select>';
        html += '</div>';
        html += '<div class="chart-option">';
        html += '<input type="checkbox" id="smoothLines" onchange="updateChart()" checked>';
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

    // Generate group summary statistics
    generateGroupSummary(frames) {
        if (!frames || frames.length <= 1) return '';
        
        let html = '<div class="series-stats">';
        html += '<h4>Group Summary Statistics</h4>';
        html += '<div class="stats-grid">';
        
        // Total groups
        html += '<div class="stat-item">';
        html += '<div class="stat-label">Total Groups</div>';
        html += '<div class="stat-value">' + frames.length + '</div>';
        html += '</div>';
        
        // Total rows across all groups
        const totalRows = frames.reduce(function(sum, frame) {
            const rows = frame.data && frame.data.values && frame.data.values[0] ? frame.data.values[0].length : 0;
            return sum + rows;
        }, 0);
        
        html += '<div class="stat-item">';
        html += '<div class="stat-label">Total Rows</div>';
        html += '<div class="stat-value">' + totalRows.toLocaleString() + '</div>';
        html += '</div>';
        
        // Average rows per group
        const avgRows = frames.length > 0 ? Math.round(totalRows / frames.length) : 0;
        html += '<div class="stat-item">';
        html += '<div class="stat-label">Avg Rows/Group</div>';
        html += '<div class="stat-value">' + avgRows + '</div>';
        html += '</div>';
        
        // Largest group
        const maxRows = Math.max.apply(Math, frames.map(function(frame) {
            return frame.data && frame.data.values && frame.data.values[0] ? frame.data.values[0].length : 0;
        }));
        html += '<div class="stat-item">';
        html += '<div class="stat-label">Largest Group</div>';
        html += '<div class="stat-value">' + maxRows + '</div>';
        html += '</div>';
        
        // Smallest group
        const minRows = Math.min.apply(Math, frames.map(function(frame) {
            return frame.data && frame.data.values && frame.data.values[0] ? frame.data.values[0].length : 0;
        }));
        html += '<div class="stat-item">';
        html += '<div class="stat-label">Smallest Group</div>';
        html += '<div class="stat-value">' + minRows + '</div>';
        html += '</div>';
        
        html += '</div></div>';
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