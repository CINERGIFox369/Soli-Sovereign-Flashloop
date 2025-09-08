#!/usr/bin/env node
/**
 * Real-Time Arbitrage Status Dashboard
 * Live monitoring interface for keeper operations
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'fs';
import path from 'path';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Global state management
class ArbitrageStatusManager {
  constructor() {
    this.state = {
      // Operational Status
      isRunning: false,
      currentIteration: 0,
      lastUpdate: new Date(),
      
      // Market Conditions
      marketConditions: {
        gasPrice: 0,
        gasHistory: [],
        volatility: 0,
        mevCompetition: 0,
        networkHealth: 'unknown'
      },
      
      // Performance Metrics
      performance: {
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        totalProfitUSD: 0,
        totalCostsUSD: 0,
        netProfitUSD: 0,
        averageEdgeBps: 0,
        bestEdgeBps: 0,
        consecutiveLosses: 0,
        uptime: 0
      },
      
      // Recent Activities
      recentTrades: [],
      recentOpportunities: [],
      recentErrors: [],
      
      // Current Operation
      currentOperation: {
        status: 'idle',
        pair: null,
        size: null,
        dex1: null,
        dex2: null,
        expectedEdge: null,
        startTime: null
      },
      
      // DEX Status
      dexStatus: {
        uniswap_v3: { enabled: true, health: 'unknown', lastQuote: null },
        uniswap_v2: { enabled: true, health: 'unknown', lastQuote: null },
        pancakeswap: { enabled: false, health: 'unknown', lastQuote: null },
        sushiswap: { enabled: false, health: 'unknown', lastQuote: null },
        curve: { enabled: false, health: 'unknown', lastQuote: null }
      },
      
      // Circuit Breaker Status
      circuitBreaker: {
        status: 'normal',
        dailyLoss: 0,
        failures: 0,
        lastFailure: null,
        emergencyStop: false
      },
      
      // Configuration
      config: {
        activeThresholdBps: 75,
        maxDailyLoss: 1000,
        gasThreshold: 50,
        enabledDexes: [],
        walletCount: 0
      }
    };
    
    this.startTime = Date.now();
    this.logFile = process.env.LOG_FILE_PATH || './logs/arbitrage.log';
    this.statusFile = './logs/status.json';
    
    // Initialize file watching
    this.initializeFileWatching();
    this.initializePeriodicUpdates();
  }
  
  initializeFileWatching() {
    try {
      // Watch log file for new entries
      if (fs.existsSync(this.logFile)) {
        fs.watchFile(this.logFile, { interval: 1000 }, () => {
          this.parseLogUpdates();
        });
      }
      
      // Watch status file for keeper updates
      if (fs.existsSync(this.statusFile)) {
        fs.watchFile(this.statusFile, { interval: 500 }, () => {
          this.loadStatusFromFile();
        });
      }
    } catch (error) {
      console.warn('File watching setup failed:', error.message);
    }
  }
  
  initializePeriodicUpdates() {
    // Update uptime every second
    setInterval(() => {
      this.state.performance.uptime = Date.now() - this.startTime;
      this.broadcastUpdate('performance');
    }, 1000);
    
    // Calculate market health every 5 seconds
    setInterval(() => {
      this.updateMarketHealth();
    }, 5000);
    
    // Save state every 10 seconds
    setInterval(() => {
      this.saveState();
    }, 10000);
  }
  
  parseLogUpdates() {
    try {
      const logContent = fs.readFileSync(this.logFile, 'utf8');
      const lines = logContent.split('\n').slice(-50); // Last 50 lines
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const timestamp = line.substring(0, 24);
        const message = line.substring(25);
        
        // Parse different types of log entries
        if (message.includes('OPPORTUNITY:')) {
          this.parseOpportunity(timestamp, message);
        } else if (message.includes('Trade successful:') || message.includes('arb tx sent:')) {
          this.parseSuccessfulTrade(timestamp, message);
        } else if (message.includes('Trade failed:') || message.includes('Error')) {
          this.parseError(timestamp, message);
        } else if (message.includes('Market conditions:')) {
          this.parseMarketConditions(timestamp, message);
        } else if (message.includes('Iteration')) {
          this.parseIteration(timestamp, message);
        } else if (message.includes('Circuit breaker')) {
          this.parseCircuitBreaker(timestamp, message);
        }
      }
    } catch (error) {
      console.warn('Log parsing failed:', error.message);
    }
  }
  
  parseOpportunity(timestamp, message) {
    // Extract opportunity details from log message
    const sizeMatch = message.match(/size=([^,]+)/);
    const edgeMatch = message.match(/edge=([0-9.]+)bps/);
    const pairMatch = message.match(/pair=([^,]+)|([A-Z]+\/[A-Z]+)/);
    const dexMatch = message.match(/via ([^→]+)→([^,]+)/);
    
    const opportunity = {
      timestamp: new Date(timestamp),
      size: sizeMatch ? sizeMatch[1] : 'unknown',
      edge: edgeMatch ? parseFloat(edgeMatch[1]) : 0,
      pair: pairMatch ? (pairMatch[1] || pairMatch[2]) : 'unknown',
      dex1: dexMatch ? dexMatch[1].trim() : 'unknown',
      dex2: dexMatch ? dexMatch[2].trim() : 'unknown',
      message: message
    };
    
    this.state.recentOpportunities.unshift(opportunity);
    if (this.state.recentOpportunities.length > 20) {
      this.state.recentOpportunities.pop();
    }
    
    this.broadcastUpdate('opportunities');
  }
  
  parseSuccessfulTrade(timestamp, message) {
    const hashMatch = message.match(/([0-9a-fA-Fx]{66})/);
    const edgeMatch = message.match(/edge=([0-9.]+)bps/);
    const profitMatch = message.match(/\+\$([0-9.]+)/);
    
    const trade = {
      timestamp: new Date(timestamp),
      hash: hashMatch ? hashMatch[1] : null,
      edge: edgeMatch ? parseFloat(edgeMatch[1]) : 0,
      profit: profitMatch ? parseFloat(profitMatch[1]) : 0,
      status: 'success',
      message: message
    };
    
    this.state.recentTrades.unshift(trade);
    if (this.state.recentTrades.length > 50) {
      this.state.recentTrades.pop();
    }
    
    // Update performance metrics
    this.state.performance.totalTrades++;
    this.state.performance.successfulTrades++;
    this.state.performance.totalProfitUSD += trade.profit;
    this.state.performance.netProfitUSD = this.state.performance.totalProfitUSD - this.state.performance.totalCostsUSD;
    this.state.performance.consecutiveLosses = 0;
    
    if (trade.edge > this.state.performance.bestEdgeBps) {
      this.state.performance.bestEdgeBps = trade.edge;
    }
    
    this.broadcastUpdate('performance');
    this.broadcastUpdate('trades');
  }
  
  parseError(timestamp, message) {
    const error = {
      timestamp: new Date(timestamp),
      message: message,
      severity: message.includes('EMERGENCY') ? 'critical' : 
               message.includes('failed') ? 'error' : 'warning'
    };
    
    this.state.recentErrors.unshift(error);
    if (this.state.recentErrors.length > 30) {
      this.state.recentErrors.pop();
    }
    
    this.state.performance.failedTrades++;
    this.state.performance.consecutiveLosses++;
    
    this.broadcastUpdate('errors');
    this.broadcastUpdate('performance');
  }
  
  parseMarketConditions(timestamp, message) {
    const gasMatch = message.match(/gasGwei=([0-9.]+)/);
    const volMatch = message.match(/volatility=([0-9.]+)/);
    const mevMatch = message.match(/mevComp=([0-9.]+)/);
    
    if (gasMatch) {
      const gasPrice = parseFloat(gasMatch[1]);
      this.state.marketConditions.gasPrice = gasPrice;
      this.state.marketConditions.gasHistory.push({
        timestamp: new Date(timestamp),
        price: gasPrice
      });
      
      // Keep only last 100 gas price points
      if (this.state.marketConditions.gasHistory.length > 100) {
        this.state.marketConditions.gasHistory.shift();
      }
    }
    
    if (volMatch) {
      this.state.marketConditions.volatility = parseFloat(volMatch[1]);
    }
    
    if (mevMatch) {
      this.state.marketConditions.mevCompetition = parseFloat(mevMatch[1]);
    }
    
    this.broadcastUpdate('market');
  }
  
  parseIteration(timestamp, message) {
    const iterMatch = message.match(/Iteration (\d+)/);
    const thresholdMatch = message.match(/activeEdgeBps=(\d+)/);
    
    if (iterMatch) {
      this.state.currentIteration = parseInt(iterMatch[1]);
    }
    
    if (thresholdMatch) {
      this.state.config.activeThresholdBps = parseInt(thresholdMatch[1]);
    }
    
    this.state.isRunning = true;
    this.state.lastUpdate = new Date(timestamp);
    
    this.broadcastUpdate('status');
  }
  
  parseCircuitBreaker(timestamp, message) {
    if (message.includes('triggered')) {
      this.state.circuitBreaker.status = 'triggered';
      this.state.circuitBreaker.lastFailure = new Date(timestamp);
    } else if (message.includes('EMERGENCY STOP')) {
      this.state.circuitBreaker.emergencyStop = true;
      this.state.circuitBreaker.status = 'emergency';
    }
    
    const failureMatch = message.match(/failure #(\d+)/);
    if (failureMatch) {
      this.state.circuitBreaker.failures = parseInt(failureMatch[1]);
    }
    
    const lossMatch = message.match(/daily loss: \$([0-9.]+)/);
    if (lossMatch) {
      this.state.circuitBreaker.dailyLoss = parseFloat(lossMatch[1]);
    }
    
    this.broadcastUpdate('circuit');
  }
  
  loadStatusFromFile() {
    try {
      if (fs.existsSync(this.statusFile)) {
        const statusData = JSON.parse(fs.readFileSync(this.statusFile, 'utf8'));
        
        // Merge external status updates
        if (statusData.currentOperation) {
          this.state.currentOperation = { ...this.state.currentOperation, ...statusData.currentOperation };
        }
        
        if (statusData.dexStatus) {
          this.state.dexStatus = { ...this.state.dexStatus, ...statusData.dexStatus };
        }
        
        if (statusData.config) {
          this.state.config = { ...this.state.config, ...statusData.config };
        }
        
        this.broadcastUpdate('dex');
        this.broadcastUpdate('config');
      }
    } catch (error) {
      console.warn('Status file loading failed:', error.message);
    }
  }
  
  updateMarketHealth() {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // Check if we received updates recently
    const recentActivity = this.state.lastUpdate && (this.state.lastUpdate.getTime() > fiveMinutesAgo);
    
    if (!recentActivity) {
      this.state.isRunning = false;
      this.state.marketConditions.networkHealth = 'disconnected';
    } else {
      this.state.marketConditions.networkHealth = 'connected';
    }
    
    // Calculate success rate
    const total = this.state.performance.totalTrades;
    const successful = this.state.performance.successfulTrades;
    this.state.performance.successRate = total > 0 ? (successful / total) * 100 : 0;
    
    // Calculate average edge
    if (this.state.recentTrades.length > 0) {
      const totalEdge = this.state.recentTrades
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + t.edge, 0);
      this.state.performance.averageEdgeBps = totalEdge / this.state.recentTrades.length;
    }
    
    this.broadcastUpdate('health');
  }
  
  saveState() {
    try {
      const stateToSave = {
        ...this.state,
        savedAt: new Date().toISOString()
      };
      
      fs.writeFileSync('./logs/dashboard_state.json', JSON.stringify(stateToSave, null, 2));
    } catch (error) {
      console.warn('State save failed:', error.message);
    }
  }
  
  broadcastUpdate(type) {
    io.emit('status-update', {
      type,
      data: this.getDataForType(type),
      timestamp: new Date()
    });
  }
  
  getDataForType(type) {
    switch (type) {
      case 'performance': return this.state.performance;
      case 'market': return this.state.marketConditions;
      case 'trades': return this.state.recentTrades;
      case 'opportunities': return this.state.recentOpportunities;
      case 'errors': return this.state.recentErrors;
      case 'circuit': return this.state.circuitBreaker;
      case 'dex': return this.state.dexStatus;
      case 'config': return this.state.config;
      case 'operation': return this.state.currentOperation;
      case 'health': return { networkHealth: this.state.marketConditions.networkHealth, successRate: this.state.performance.successRate };
      default: return this.state;
    }
  }
  
  getFullState() {
    return this.state;
  }
  
  // API methods for external updates
  updateCurrentOperation(operation) {
    this.state.currentOperation = { ...this.state.currentOperation, ...operation };
    this.broadcastUpdate('operation');
  }
  
  updateDexHealth(dexName, health, lastQuote = null) {
    if (this.state.dexStatus[dexName]) {
      this.state.dexStatus[dexName].health = health;
      if (lastQuote) this.state.dexStatus[dexName].lastQuote = lastQuote;
      this.broadcastUpdate('dex');
    }
  }
  
  addManualProfit(amount, description) {
    this.state.performance.totalProfitUSD += amount;
    this.state.performance.netProfitUSD = this.state.performance.totalProfitUSD - this.state.performance.totalCostsUSD;
    
    const trade = {
      timestamp: new Date(),
      profit: amount,
      status: 'manual',
      message: description || 'Manual profit adjustment'
    };
    
    this.state.recentTrades.unshift(trade);
    this.broadcastUpdate('trades');
    this.broadcastUpdate('performance');
  }
}

// Initialize status manager
const statusManager = new ArbitrageStatusManager();

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// API Routes
app.get('/api/status', (req, res) => {
  res.json(statusManager.getFullState());
});

app.post('/api/operation', (req, res) => {
  statusManager.updateCurrentOperation(req.body);
  res.json({ success: true });
});

app.post('/api/dex-health', (req, res) => {
  const { dexName, health, lastQuote } = req.body;
  statusManager.updateDexHealth(dexName, health, lastQuote);
  res.json({ success: true });
});

app.post('/api/manual-profit', (req, res) => {
  const { amount, description } = req.body;
  statusManager.addManualProfit(amount, description);
  res.json({ success: true });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Dashboard client connected:', socket.id);
  
  // Send initial state
  socket.emit('initial-state', statusManager.getFullState());
  
  socket.on('disconnect', () => {
    console.log('Dashboard client disconnected:', socket.id);
  });
  
  socket.on('request-update', (type) => {
    socket.emit('status-update', {
      type,
      data: statusManager.getDataForType(type),
      timestamp: new Date()
    });
  });
});

// Start server
const PORT = process.env.DASHBOARD_PORT || 3000;
server.listen(PORT, () => {
  console.log(`📊 Arbitrage Status Dashboard running on http://localhost:${PORT}`);
  console.log(`📁 Monitoring logs: ${statusManager.logFile}`);
  console.log(`💾 Status file: ${statusManager.statusFile}`);
});

// Export for external use
export { statusManager };
