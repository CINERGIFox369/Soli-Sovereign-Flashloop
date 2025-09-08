/**
 * Enhanced Status Reporter for Keeper Integration
 * Provides real-time status updates to the dashboard
 */

import fs from 'fs';

export class StatusReporter {
  private dashboardPort: number;
  private apiUrl: string;
  private statusFile: string;
  private enabled: boolean;
  
  constructor() {
    this.dashboardPort = Number(process.env.DASHBOARD_PORT || 3000);
    this.apiUrl = `http://localhost:${this.dashboardPort}/api`;
    this.statusFile = './logs/status.json';
    this.enabled = process.env.ENABLE_STATUS_REPORTING !== 'false';
    
    if (this.enabled) {
      this.initializeStatusFile();
    }
  }
  
  private initializeStatusFile(): void {
    try {
      const initialStatus = {
        timestamp: new Date().toISOString(),
        keeper: {
          started: true,
          pid: process.pid,
          version: process.env.npm_package_version || '1.0.0'
        },
        currentOperation: {
          status: 'initializing',
          startTime: Date.now()
        },
        config: {
          activeThresholdBps: Number(process.env.BALANCED_MIN_EDGE_BPS || 75),
          maxDailyLoss: Number(process.env.MAX_DAILY_LOSS_USD || 1000),
          gasThreshold: Number(process.env.GAS_PRICE_THRESHOLD_GWEI || 50),
          enabledDexes: this.getEnabledDexes(),
          walletCount: this.getWalletCount()
        }
      };
      
      fs.writeFileSync(this.statusFile, JSON.stringify(initialStatus, null, 2));
    } catch (error) {
      console.warn('Status file initialization failed:', String(error));
    }
  }
  
  private getEnabledDexes(): string[] {
    const dexes = [];
    if (process.env.ENABLE_UNISWAP_V3 !== 'false') dexes.push('uniswap_v3');
    if (process.env.ENABLE_UNISWAP_V2 !== 'false') dexes.push('uniswap_v2');
    if (process.env.ENABLE_PANCAKESWAP === 'true') dexes.push('pancakeswap');
    if (process.env.ENABLE_SUSHISWAP === 'true') dexes.push('sushiswap');
    if (process.env.ENABLE_CURVE === 'true') dexes.push('curve');
    return dexes;
  }
  
  private getWalletCount(): number {
    const gasKeys = (process.env.GAS_WALLETS || process.env.PRIVATE_KEY || "").split(",").filter(Boolean);
    return gasKeys.length;
  }
  
  async updateCurrentOperation(operation: {
    status: string;
    pair?: string;
    size?: string;
    dex1?: string;
    dex2?: string;
    expectedEdge?: number;
    startTime?: number;
  }): Promise<void> {
    if (!this.enabled) return;
    
    try {
      // Update via API
      await this.sendApiUpdate('/operation', operation);
      
      // Update status file
      await this.updateStatusFile({ currentOperation: operation });
      
    } catch (error) {
      // Silent failure - don't interrupt keeper operations
    }
  }
  
  async updateDexHealth(dexName: string, health: 'healthy' | 'unhealthy' | 'unknown', lastQuote?: number): Promise<void> {
    if (!this.enabled) return;
    
    try {
      await this.sendApiUpdate('/dex-health', { dexName, health, lastQuote });
      
      const dexStatus = {};
      dexStatus[dexName] = { health, lastQuote, timestamp: new Date().toISOString() };
      await this.updateStatusFile({ dexStatus });
      
    } catch (error) {
      // Silent failure
    }
  }
  
  async reportMarketConditions(conditions: {
    gasPrice: number;
    volatility: number;
    mevCompetition: number;
    networkHealth: string;
  }): Promise<void> {
    if (!this.enabled) return;
    
    try {
      await this.updateStatusFile({ 
        marketConditions: {
          ...conditions,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      // Silent failure
    }
  }
  
  async reportTrade(trade: {
    hash?: string;
    edge: number;
    profit: number;
    status: 'success' | 'failure';
    pair?: string;
    size?: string;
    message: string;
  }): Promise<void> {
    if (!this.enabled) return;
    
    try {
      if (trade.status === 'success' && trade.profit > 0) {
        await this.sendApiUpdate('/manual-profit', {
          amount: trade.profit,
          description: `${trade.pair} arbitrage: ${trade.edge}bps edge`
        });
      }
    } catch (error) {
      // Silent failure
    }
  }
  
  async reportCircuitBreakerStatus(status: {
    status: 'normal' | 'triggered' | 'emergency';
    dailyLoss: number;
    failures: number;
    lastFailure?: Date;
    emergencyStop: boolean;
  }): Promise<void> {
    if (!this.enabled) return;
    
    try {
      await this.updateStatusFile({ 
        circuitBreaker: {
          ...status,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      // Silent failure
    }
  }
  
  async reportIteration(iteration: number, activeEdgeBps: number): Promise<void> {
    if (!this.enabled) return;
    
    try {
      await this.updateStatusFile({
        operational: {
          currentIteration: iteration,
          activeThresholdBps: activeEdgeBps,
          isRunning: true,
          lastUpdate: new Date().toISOString()
        }
      });
    } catch (error) {
      // Silent failure
    }
  }
  
  async reportOpportunity(opportunity: {
    pair: string;
    size: string;
    edge: number;
    dex1: string;
    dex2: string;
    profitable: boolean;
  }): Promise<void> {
    if (!this.enabled) return;
    
    try {
      await this.updateStatusFile({
        lastOpportunity: {
          ...opportunity,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      // Silent failure
    }
  }
  
  async reportError(error: {
    message: string;
    severity: 'warning' | 'error' | 'critical';
    context?: string;
  }): Promise<void> {
    if (!this.enabled) return;
    
    try {
      await this.updateStatusFile({
        lastError: {
          ...error,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      // Silent failure
    }
  }
  
  async shutdown(): Promise<void> {
    if (!this.enabled) return;
    
    try {
      await this.updateStatusFile({
        keeper: {
          started: false,
          shutdown: new Date().toISOString()
        },
        operational: {
          isRunning: false
        }
      });
    } catch (error) {
      // Silent failure
    }
  }
  
  private async sendApiUpdate(endpoint: string, data: any): Promise<void> {
    try {
      const response = await fetch(this.apiUrl + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
    } catch (error) {
      // If dashboard is not running, that's ok - just log to file
      console.warn('Dashboard API unavailable:', String(error));
    }
  }
  
  private async updateStatusFile(updates: any): Promise<void> {
    try {
      let currentStatus = {};
      
      // Read existing status
      if (fs.existsSync(this.statusFile)) {
        const statusContent = fs.readFileSync(this.statusFile, 'utf8');
        currentStatus = JSON.parse(statusContent);
      }
      
      // Merge updates
      const newStatus = {
        ...currentStatus,
        ...updates,
        lastUpdate: new Date().toISOString()
      };
      
      // Write back to file
      fs.writeFileSync(this.statusFile, JSON.stringify(newStatus, null, 2));
    } catch (error) {
      console.warn('Status file update failed:', String(error));
    }
  }
}

// Export singleton instance
export const statusReporter = new StatusReporter();
