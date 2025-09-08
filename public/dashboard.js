// Real-time Dashboard JavaScript
class ArbitrageDashboard {
    constructor() {
        this.socket = io();
        this.gasChart = null;
        this.state = {};
        
        this.initializeSocket();
        this.initializeCharts();
        this.startPeriodicUpdates();
    }
    
    initializeSocket() {
        this.socket.on('connect', () => {
            console.log('Connected to status server');
            this.updateConnectionStatus('connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from status server');
            this.updateConnectionStatus('disconnected');
        });
        
        this.socket.on('initial-state', (state) => {
            console.log('Received initial state', state);
            this.state = state;
            this.updateFullDashboard();
        });
        
        this.socket.on('status-update', (update) => {
            console.log('Status update:', update.type, update.data);
            this.handleStatusUpdate(update);
        });
    }
    
    initializeCharts() {
        const ctx = document.getElementById('gas-chart');
        if (ctx) {
            this.gasChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Gas Price (gwei)',
                        data: [],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Gas Price (gwei)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Time'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    }
    
    startPeriodicUpdates() {
        // Update uptime display every second
        setInterval(() => {
            this.updateUptime();
        }, 1000);
        
        // Request fresh data every 30 seconds
        setInterval(() => {
            this.socket.emit('request-update', 'all');
        }, 30000);
    }
    
    updateConnectionStatus(status) {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        if (status === 'connected') {
            statusDot.className = 'status-dot running';
            statusText.textContent = this.state.isRunning ? 'Running' : 'Connected';
        } else {
            statusDot.className = 'status-dot stopped';
            statusText.textContent = 'Disconnected';
        }
    }
    
    handleStatusUpdate(update) {
        switch (update.type) {
            case 'performance':
                this.updatePerformanceMetrics(update.data);
                break;
            case 'market':
                this.updateMarketConditions(update.data);
                break;
            case 'trades':
                this.updateRecentTrades(update.data);
                break;
            case 'opportunities':
                this.updateRecentOpportunities(update.data);
                break;
            case 'errors':
                this.updateErrorLog(update.data);
                break;
            case 'circuit':
                this.updateCircuitBreaker(update.data);
                break;
            case 'dex':
                this.updateDexStatus(update.data);
                break;
            case 'operation':
                this.updateCurrentOperation(update.data);
                break;
            case 'status':
                this.updateOperationalStatus(update.data);
                break;
            default:
                // Handle full state updates
                this.state = { ...this.state, ...update.data };
                this.updateFullDashboard();
        }
    }
    
    updateFullDashboard() {
        this.updatePerformanceMetrics(this.state.performance || {});
        this.updateMarketConditions(this.state.marketConditions || {});
        this.updateRecentTrades(this.state.recentTrades || []);
        this.updateRecentOpportunities(this.state.recentOpportunities || []);
        this.updateErrorLog(this.state.recentErrors || []);
        this.updateCircuitBreaker(this.state.circuitBreaker || {});
        this.updateDexStatus(this.state.dexStatus || {});
        this.updateCurrentOperation(this.state.currentOperation || {});
        this.updateConnectionStatus('connected');
    }
    
    updatePerformanceMetrics(performance) {
        const netProfit = performance.netProfitUSD || 0;
        const totalTrades = performance.totalTrades || 0;
        const successfulTrades = performance.successfulTrades || 0;
        const successRate = totalTrades > 0 ? (successfulTrades / totalTrades * 100) : 0;
        
        this.setElementText('net-profit', this.formatCurrency(netProfit));
        this.setElementText('total-trades', totalTrades.toString());
        this.setElementText('success-rate', `${successRate.toFixed(1)}% success`);
        this.setElementText('successful-trades', successfulTrades.toString());
        this.setElementText('failed-trades', (performance.failedTrades || 0).toString());
        this.setElementText('consecutive-losses', (performance.consecutiveLosses || 0).toString());
        this.setElementText('best-edge', `${(performance.bestEdgeBps || 0).toFixed(1)} bps`);
        this.setElementText('average-edge', `${(performance.averageEdgeBps || 0).toFixed(1)} bps`);
        
        // Update profit card color
        const profitElement = document.getElementById('net-profit');
        if (profitElement) {
            profitElement.className = netProfit >= 0 ? 'value' : 'value negative';
        }
    }
    
    updateMarketConditions(market) {
        this.setElementText('gas-price', `${(market.gasPrice || 0).toFixed(1)} gwei`);
        this.setElementText('volatility', `${((market.volatility || 0) * 100).toFixed(2)}%`);
        this.setElementText('mev-competition', `${((market.mevCompetition || 0) * 100).toFixed(1)}%`);
        this.setElementText('network-health', market.networkHealth || 'Unknown');
        
        // Update gas chart
        if (this.gasChart && market.gasHistory) {
            const history = market.gasHistory.slice(-20); // Last 20 points
            const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString());
            const data = history.map(h => h.price);
            
            this.gasChart.data.labels = labels;
            this.gasChart.data.datasets[0].data = data;
            this.gasChart.update('none');
        }
        
        // Color-code gas price
        const gasElement = document.getElementById('gas-price');
        if (gasElement && market.gasPrice) {
            if (market.gasPrice > 100) {
                gasElement.className = 'metric-value negative';
            } else if (market.gasPrice > 50) {
                gasElement.className = 'metric-value warning';
            } else {
                gasElement.className = 'metric-value';
            }
        }
    }
    
    updateRecentTrades(trades) {
        const container = document.getElementById('recent-trades');
        if (!container || !Array.isArray(trades)) return;
        
        if (trades.length === 0) {
            container.innerHTML = '<div class="loading">No trades yet</div>';
            return;
        }
        
        const tradesHtml = trades.slice(0, 10).map(trade => {
            const statusClass = trade.status === 'success' ? 'success' : 
                               trade.status === 'manual' ? 'success' : 'error';
            const profitClass = trade.profit > 0 ? 'positive' : 'negative';
            
            return `
                <div class="trade-item">
                    <div class="trade-status ${statusClass}"></div>
                    <div class="trade-details">
                        <div class="trade-time">${this.formatTime(trade.timestamp)}</div>
                        <div class="trade-info">${this.truncateMessage(trade.message || '')}</div>
                    </div>
                    <div class="trade-profit ${profitClass}">
                        ${trade.profit ? this.formatCurrency(trade.profit) : ''}
                        ${trade.edge ? `${trade.edge.toFixed(1)}bps` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = tradesHtml;
    }
    
    updateRecentOpportunities(opportunities) {
        const container = document.getElementById('recent-opportunities');
        if (!container || !Array.isArray(opportunities)) return;
        
        if (opportunities.length === 0) {
            container.innerHTML = '<div class="loading">Scanning for opportunities...</div>';
            return;
        }
        
        const opportunitiesHtml = opportunities.slice(0, 10).map(opp => {
            const edgeClass = opp.edge > 100 ? 'positive' : opp.edge > 50 ? 'warning' : '';
            
            return `
                <div class="trade-item">
                    <div class="trade-status warning"></div>
                    <div class="trade-details">
                        <div class="trade-time">${this.formatTime(opp.timestamp)}</div>
                        <div class="trade-info">${opp.pair} via ${opp.dex1}→${opp.dex2} (${opp.size})</div>
                    </div>
                    <div class="trade-profit ${edgeClass}">
                        ${opp.edge.toFixed(1)}bps
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = opportunitiesHtml;
    }
    
    updateErrorLog(errors) {
        const container = document.getElementById('error-log');
        if (!container || !Array.isArray(errors)) return;
        
        if (errors.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #6b7280;">No errors logged</div>';
            return;
        }
        
        const errorsHtml = errors.slice(0, 10).map(error => {
            return `
                <div class="error-item">
                    [${this.formatTime(error.timestamp)}] ${error.message}
                </div>
            `;
        }).join('');
        
        container.innerHTML = errorsHtml;
    }
    
    updateCircuitBreaker(circuit) {
        const container = document.getElementById('circuit-breaker-status');
        if (!container) return;
        
        if (circuit.status === 'normal' || !circuit.status) {
            container.innerHTML = '';
            return;
        }
        
        const statusClass = circuit.emergencyStop ? 'emergency' : 
                           circuit.status === 'triggered' ? 'triggered' : '';
        
        const statusText = circuit.emergencyStop ? '🚨 EMERGENCY STOP' :
                          circuit.status === 'triggered' ? '⚠️ Circuit Breaker Triggered' :
                          '⚡ Circuit Breaker Active';
        
        container.innerHTML = `
            <div class="circuit-breaker ${statusClass}">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">${statusText}</div>
                <div>Daily Loss: ${this.formatCurrency(circuit.dailyLoss || 0)}</div>
                <div>Failures: ${circuit.failures || 0}</div>
                ${circuit.lastFailure ? `<div>Last Failure: ${this.formatTime(circuit.lastFailure)}</div>` : ''}
            </div>
        `;
    }
    
    updateDexStatus(dexStatus) {
        const container = document.getElementById('dex-status');
        if (!container || !dexStatus) return;
        
        const dexHtml = Object.entries(dexStatus).map(([name, status]) => {
            const healthClass = status.health === 'healthy' ? 'healthy' :
                               status.health === 'unhealthy' ? 'unhealthy' : 'unknown';
            
            const displayName = name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            return `
                <div class="dex-item ${healthClass}">
                    <div class="dex-name">${displayName}</div>
                    <div class="dex-health">${status.health || 'unknown'}</div>
                    ${status.enabled ? '' : '<div style="font-size: 0.6rem; color: #666;">Disabled</div>'}
                </div>
            `;
        }).join('');
        
        container.innerHTML = dexHtml;
    }
    
    updateCurrentOperation(operation) {
        this.setElementText('operation-status', operation.status || 'Idle');
        this.setElementText('operation-pair', operation.pair || '-');
        this.setElementText('operation-size', operation.size || '-');
        this.setElementText('operation-route', 
            operation.dex1 && operation.dex2 ? `${operation.dex1}→${operation.dex2}` : '-');
        this.setElementText('operation-edge', 
            operation.expectedEdge ? `${operation.expectedEdge}bps` : '-');
    }
    
    updateOperationalStatus(status) {
        this.setElementText('iteration', `Iteration ${status.currentIteration || 0}`);
        this.setElementText('current-edge', status.activeThresholdBps || 0);
        
        // Update status indicator
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        if (status.isRunning) {
            statusDot.className = 'status-dot running';
            statusText.textContent = 'Running';
        } else {
            statusDot.className = 'status-dot stopped';
            statusText.textContent = 'Stopped';
        }
    }
    
    updateUptime() {
        if (this.state.performance && this.state.performance.uptime) {
            const uptime = this.formatUptime(this.state.performance.uptime);
            this.setElementText('uptime', uptime);
        }
    }
    
    // Utility functions
    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }
    
    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }
    
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000) % 60;
        const minutes = Math.floor(ms / (1000 * 60)) % 60;
        const hours = Math.floor(ms / (1000 * 60 * 60));
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    truncateMessage(message, maxLength = 50) {
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Arbitrage Dashboard...');
    window.dashboard = new ArbitrageDashboard();
});
