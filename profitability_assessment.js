#!/usr/bin/env node
/**
 * Profitability Assessment for Atomic Flashloan Strategy
 * Evaluates current Uniswap V3/V2 arbitrage opportunities
 */

import fs from 'fs';

// Simulation parameters based on keeper.ts configuration
const config = {
  // Default candidate sizes (USDC with 6 decimals)
  candidateSizes: ["5000", "10000", "20000", "40000", "80000"],
  decimals: 6,
  
  // Profit thresholds (basis points)
  thresholds: {
    conservative: 25,
    balanced: 75,
    aggressive: 250,
    whale: 500
  },
  
  // Cost factors
  costs: {
    aaveFlashFee: 0.0009, // 0.09% flash loan fee
    gasEstimate: 0.02, // ~$20 in gas at moderate prices
    slippageBuffer: 0.005, // 0.5% slippage buffer
    competitionFactor: 0.3 // 30% of opportunities lost to MEV bots
  },
  
  // Market simulation
  market: {
    dailyVolume: 50000000, // $50M daily volume
    priceVolatility: 0.02, // 2% daily volatility
    opportunityFreq: 0.001, // opportunities per second
    successRate: 0.6 // base success rate
  }
};

function parseUnits(amount, decimals) {
  return BigInt(amount) * BigInt(10 ** decimals);
}

function formatUnits(amount, decimals) {
  return Number(amount) / (10 ** decimals);
}

// Simulate price impact and slippage
function simulatePriceImpact(size, decimals) {
  const sizeUSD = formatUnits(size, decimals);
  
  // Empirical price impact model for Uniswap pools
  // Impact scales with sqrt of size relative to liquidity
  const avgPoolLiquidity = 10000000; // $10M average pool liquidity
  const impactFactor = Math.sqrt(sizeUSD / avgPoolLiquidity);
  const priceImpact = impactFactor * 0.003; // 0.3% at $1M size
  
  return Math.min(priceImpact, 0.05); // Cap at 5%
}

// Simulate market spread between V3 and V2
function simulateSpread() {
  // Random spread between 0.1% to 2% (realistic for USDC/WETH pairs)
  const baseSpread = 0.001 + Math.random() * 0.019;
  
  // Add volatility component
  const volatilityBonus = Math.random() * config.market.priceVolatility;
  
  return baseSpread + volatilityBonus;
}

// Calculate net profitability for a given size
function calculateNetProfit(size, decimals) {
  const sizeUSD = formatUnits(size, decimals);
  const spread = simulateSpread();
  const priceImpact = simulatePriceImpact(size, decimals);
  
  // Gross profit from spread
  const grossProfit = sizeUSD * spread;
  
  // Costs
  const flashLoanFee = sizeUSD * config.costs.aaveFlashFee;
  const gasCost = config.costs.gasEstimate;
  const slippageCost = sizeUSD * (priceImpact + config.costs.slippageBuffer);
  
  const totalCosts = flashLoanFee + gasCost + slippageCost;
  const netProfit = grossProfit - totalCosts;
  
  // Convert to basis points
  const netProfitBps = (netProfit / sizeUSD) * 10000;
  
  return {
    sizeUSD,
    spread: spread * 10000, // bps
    priceImpact: priceImpact * 10000, // bps
    grossProfit,
    flashLoanFee,
    gasCost,
    slippageCost,
    totalCosts,
    netProfit,
    netProfitBps,
    profitable: netProfitBps > config.thresholds.balanced
  };
}

// Monte Carlo simulation
function runMonteCarloSimulation(iterations = 10000) {
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    for (const sizeStr of config.candidateSizes) {
      const size = parseUnits(sizeStr, config.decimals);
      const result = calculateNetProfit(size, config.decimals);
      result.iteration = i;
      result.sizeCandidate = sizeStr;
      results.push(result);
    }
  }
  
  return results;
}

// Analyze results
function analyzeResults(results) {
  const profitable = results.filter(r => r.profitable);
  const unprofitable = results.filter(r => !r.profitable);
  
  const profitabilityRate = profitable.length / results.length;
  
  // Group by size
  const bySize = {};
  config.candidateSizes.forEach(size => {
    const sizeResults = results.filter(r => r.sizeCandidate === size);
    const sizeProfitable = sizeResults.filter(r => r.profitable);
    
    bySize[size] = {
      total: sizeResults.length,
      profitable: sizeProfitable.length,
      rate: sizeProfitable.length / sizeResults.length,
      avgNetProfitBps: sizeProfitable.reduce((sum, r) => sum + r.netProfitBps, 0) / sizeProfitable.length || 0,
      avgNetProfitUSD: sizeProfitable.reduce((sum, r) => sum + r.netProfit, 0) / sizeProfitable.length || 0
    };
  });
  
  // Daily projections
  const secondsPerDay = 86400;
  const opportunitiesPerDay = secondsPerDay * config.market.opportunityFreq;
  const successfulOpportunities = opportunitiesPerDay * profitabilityRate * config.market.successRate * (1 - config.costs.competitionFactor);
  
  const avgProfitPerOp = profitable.reduce((sum, r) => sum + r.netProfit, 0) / profitable.length || 0;
  const dailyProfitProjection = successfulOpportunities * avgProfitPerOp;
  
  return {
    totalIterations: results.length,
    profitableCount: profitable.length,
    profitabilityRate,
    bySize,
    projections: {
      opportunitiesPerDay,
      successfulOpportunities,
      avgProfitPerOp,
      dailyProfitProjection,
      monthlyProjection: dailyProfitProjection * 30,
      annualProjection: dailyProfitProjection * 365
    },
    costBreakdown: {
      avgFlashLoanFee: profitable.reduce((sum, r) => sum + r.flashLoanFee, 0) / profitable.length || 0,
      avgGasCost: config.costs.gasEstimate,
      avgSlippageCost: profitable.reduce((sum, r) => sum + r.slippageCost, 0) / profitable.length || 0
    }
  };
}

// Risk assessment
function assessRisks() {
  return {
    liquidityRisk: "Medium - Dependent on Uniswap pool liquidity",
    competitionRisk: "High - MEV bots can front-run profitable opportunities",
    technicalRisk: "Low - Atomic transactions eliminate most failure modes",
    regulatoryRisk: "Low - No leverage or complex derivatives involved",
    smartContractRisk: "Medium - Depends on Aave and Uniswap contract security",
    gasRisk: "High - Network congestion can eliminate profitability",
    recommendations: [
      "Focus on larger size candidates during high volatility periods",
      "Implement private mempool or flashbots integration to reduce MEV competition - IMPLEMENTED",
      "Consider dynamic gas pricing to maintain profitability during congestion - IMPLEMENTED", 
      "Monitor pool liquidity in real-time to avoid high slippage trades",
      "Implement circuit breakers for extreme market conditions - IMPLEMENTED",
      "Expand to multiple DEXes: PancakeSwap, SushiSwap, Curve for broader opportunities - IMPLEMENTED",
      "Use adaptive threshold adjustment based on market volatility and competition - IMPLEMENTED",
      "Deploy on low-gas networks (Arbitrum, Polygon) for higher profitability margins",
      "Integrate MEV protection services (Flashbots, Eden Network) for competitive advantage"
    ]
  };
}

// Generate comprehensive report
function generateReport() {
  console.log("🔬 ATOMIC FLASHLOAN PROFITABILITY ASSESSMENT");
  console.log("=" .repeat(50));
  
  console.log("\n📊 CONFIGURATION:");
  console.log(`Candidate Sizes: ${config.candidateSizes.join(", ")} USDC`);
  console.log(`Profit Thresholds: Conservative ${config.thresholds.conservative}bps, Balanced ${config.thresholds.balanced}bps`);
  console.log(`Aave Flash Fee: ${(config.costs.aaveFlashFee * 100).toFixed(3)}%`);
  console.log(`Estimated Gas Cost: $${config.costs.gasEstimate}`);
  
  console.log("\n🎲 RUNNING MONTE CARLO SIMULATION...");
  const results = runMonteCarloSimulation(1000);
  const analysis = analyzeResults(results);
  
  console.log("\n📈 PROFITABILITY ANALYSIS:");
  console.log(`Overall Profitability Rate: ${(analysis.profitabilityRate * 100).toFixed(2)}%`);
  console.log(`Profitable Opportunities: ${analysis.profitableCount} / ${analysis.totalIterations}`);
  
  console.log("\n💰 PROFITABILITY BY SIZE:");
  Object.entries(analysis.bySize).forEach(([size, data]) => {
    console.log(`${size} USDC: ${(data.rate * 100).toFixed(1)}% profitable, avg ${data.avgNetProfitBps.toFixed(1)}bps (≈$${data.avgNetProfitUSD.toFixed(2)})`);
  });
  
  console.log("\n🔮 REVENUE PROJECTIONS:");
  console.log(`Daily Opportunities: ${analysis.projections.opportunitiesPerDay.toFixed(1)}`);
  console.log(`Successful Trades/Day: ${analysis.projections.successfulOpportunities.toFixed(1)}`);
  console.log(`Average Profit/Trade: $${analysis.projections.avgProfitPerOp.toFixed(2)}`);
  console.log(`Projected Daily Revenue: $${analysis.projections.dailyProfitProjection.toFixed(2)}`);
  console.log(`Projected Monthly Revenue: $${analysis.projections.monthlyProjection.toFixed(2)}`);
  console.log(`Projected Annual Revenue: $${analysis.projections.annualProjection.toFixed(2)}`);
  
  console.log("\n💸 COST BREAKDOWN:");
  console.log(`Avg Flash Loan Fee: $${analysis.costBreakdown.avgFlashLoanFee.toFixed(2)}`);
  console.log(`Avg Gas Cost: $${analysis.costBreakdown.avgGasCost.toFixed(2)}`);
  console.log(`Avg Slippage Cost: $${analysis.costBreakdown.avgSlippageCost.toFixed(2)}`);
  
  console.log("\n⚠️  RISK ASSESSMENT:");
  const risks = assessRisks();
  Object.entries(risks).forEach(([key, value]) => {
    if (key !== 'recommendations') {
      console.log(`${key}: ${value}`);
    }
  });
  
  console.log("\n💡 RECOMMENDATIONS:");
  risks.recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
  
  console.log("\n🎯 STRATEGIC ASSESSMENT:");
  if (analysis.projections.dailyProfitProjection > 100) {
    console.log("✅ VIABLE: Strategy shows strong profitability potential");
  } else if (analysis.projections.dailyProfitProjection > 50) {
    console.log("⚠️  MARGINAL: Strategy may be profitable but requires optimization");
  } else {
    console.log("❌ NOT VIABLE: Current market conditions insufficient for profitability");
  }
  
  // Save detailed results to CSV
  const csvData = results.map(r => ({
    size: r.sizeCandidate,
    sizeUSD: r.sizeUSD.toFixed(2),
    spreadBps: r.spread.toFixed(1),
    priceImpactBps: r.priceImpact.toFixed(1),
    grossProfit: r.grossProfit.toFixed(4),
    totalCosts: r.totalCosts.toFixed(4),
    netProfit: r.netProfit.toFixed(4),
    netProfitBps: r.netProfitBps.toFixed(1),
    profitable: r.profitable
  }));
  
  const csvHeader = Object.keys(csvData[0]).join(',');
  const csvRows = csvData.map(row => Object.values(row).join(','));
  const csvContent = [csvHeader, ...csvRows].join('\n');
  
  try {
    fs.writeFileSync('profitability_analysis.csv', csvContent);
    console.log("\n📁 Detailed results saved to: profitability_analysis.csv");
  } catch (e) {
    console.warn("Could not save CSV file:", e.message);
  }
}

// Run the assessment
generateReport();
