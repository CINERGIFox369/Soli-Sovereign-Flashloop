import { ethers } from "ethers";
import fs from 'fs';
import path from 'path';
import * as dotenv from "dotenv";
<<<<<<< HEAD
=======
import { secureWalletFactory, keyVaultManager } from '../src/azure-keyvault.js';
>>>>>>> fix/ci-oidc-on-origin
dotenv.config();

// Optional Application Insights integration
let appInsights: any = null;
let appInsightsClient: any = null;
if (process.env.APPINSIGHTS_INSTRUMENTATION_KEY) {
  try {
    // lazy-load to avoid adding a hard dependency; use ts-ignore to keep typechecker happy if not installed
    // @ts-ignore
    const appinsights: any = await import('applicationinsights');
    appinsights.default.setup(process.env.APPINSIGHTS_INSTRUMENTATION_KEY).start();
    appInsights = appinsights.default;
    appInsightsClient = appInsights.default.defaultClient;
    console.log('Application Insights enabled');
  } catch (e) {
    console.warn('Failed to init Application Insights (not installed or runtime error)', String(e));
  }
}

/**
 * Keeper / executor script (ethers v6)
 * - Probes candidate sizes using Uni v3 QuoterV2 + v2 getAmountsOut
 * - Fires FlashLoopExecutor.triggerFlashArb when edge > MIN_EDGE_BPS
 */

// Minimal ABIs
const exeAbi = [
  "function triggerFlashArb(address asset,uint256 amount,(bool,(address,address,uint24,uint256),(address[],uint256),uint256,uint256)) external",
  "function setSplit(uint16 bps) external",
  "function setTreasury(address) external"
];

// Uniswap v3 QuoterV2 (struct signature required)
const quoterAbi = [
  "function quoteExactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,uint256 amountIn,uint160 sqrtPriceLimitX96)) external view returns (uint256 amountOut)"
];

const v2Abi = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

function parseUnits(amount: string, decimals: number) {
  return ethers.parseUnits(amount, decimals);
}

async function main() {
  const RPC = process.env.RPC || process.env.RPC_URL;
  if (!RPC) throw new Error('RPC URL not set in env (RPC or RPC_URL)');
  const provider = new ethers.JsonRpcProvider(RPC);
<<<<<<< HEAD
  // Support multiple gas wallets to parallelize nonces and avoid single-signer bottleneck
  const gasKeys = (process.env.GAS_WALLETS || process.env.PRIVATE_KEY || process.env.PRIV_KEY || "").split(",").map(s => s.trim()).filter(Boolean);
  let wallets: ethers.Wallet[] = [];
  if (gasKeys.length === 0) {
    if (process.env.DRY_RUN === 'true') {
      console.warn('No gas wallet private keys provided; creating ephemeral wallet for DRY_RUN (no real txs will be sent)');
      const tmp = ethers.Wallet.createRandom();
      wallets = [new ethers.Wallet(tmp.privateKey, provider)];
    } else {
      throw new Error("No gas wallet private keys found in GAS_WALLETS or PRIVATE_KEY/PRIV_KEY");
    }
  } else {
    const created: ethers.Wallet[] = [];
    for (const k of gasKeys) {
      try {
        created.push(new ethers.Wallet(k, provider));
      } catch (err) {
        console.warn('Invalid private key in GAS_WALLETS/PRIVATE_KEY - skipping one entry');
      }
    }
    if (created.length === 0) {
      if (process.env.DRY_RUN === 'true') {
        console.warn('All provided private keys invalid; creating ephemeral wallet for DRY_RUN');
        const tmp = ethers.Wallet.createRandom();
        wallets = [new ethers.Wallet(tmp.privateKey, provider)];
      } else {
        throw new Error('No valid private keys found in GAS_WALLETS or PRIVATE_KEY/PRIV_KEY');
      }
    } else {
      wallets = created;
=======
  
  // ========================================
  // WALLET CONFIGURATION
  // ========================================
  
  // Gas Fee Wallets (MetaMask) - Have private keys for transaction signing
  let wallets: ethers.Wallet[] = [];
  
  // Profit Treasury Wallet (Exodus) - Receive-only address (NO private key)
  const PROFIT_TREASURY = process.env.PROFIT_TREASURY_ADDRESS || process.env.TREASURY;
  if (!PROFIT_TREASURY) {
    console.warn('⚠️ No PROFIT_TREASURY_ADDRESS configured - profits will not be automatically transferred');
  } else {
    console.log(`💰 Profit treasury configured: ${PROFIT_TREASURY} (${process.env.TREASURY_WALLET_TYPE || 'unknown wallet type'})`);
  }
  
  try {
    // Test Azure Key Vault connection first
    console.log('🔐 Testing Azure Key Vault connection...');
    const kvConnected = await secureWalletFactory.testConnection();
    
    if (kvConnected && process.env.AZURE_KEY_VAULT_URL) {
      console.log('✅ Azure Key Vault connected - using secure key management');
      
      try {
        // Try to get wallets from Key Vault
        const gasWallets = await secureWalletFactory.createGasWallets(provider);
        if (gasWallets.length > 0) {
          wallets = gasWallets;
          console.log(`🔑 Loaded ${wallets.length} gas wallets from Azure Key Vault`);
        } else {
          // Fallback to primary wallet
          const primaryWallet = await secureWalletFactory.createPrimaryWallet(provider);
          wallets = [primaryWallet];
          console.log('🔑 Loaded primary wallet from Azure Key Vault');
        }
      } catch (kvError) {
        console.warn('⚠️ Key Vault wallet creation failed, falling back to environment variables:', kvError);
        throw kvError; // Will fall through to fallback method
      }
    } else {
      throw new Error('Azure Key Vault not configured or unreachable');
    }
  } catch (keyVaultError) {
    console.warn('⚠️ Azure Key Vault unavailable, using fallback method:', keyVaultError);
    
    // Fallback to environment variables (with security warning)
    const gasKeys = (process.env.GAS_WALLETS || process.env.PRIVATE_KEY || process.env.PRIV_KEY || "").split(",").map(s => s.trim()).filter(Boolean);
    
    if (gasKeys.length === 0) {
      if (process.env.DRY_RUN === 'true') {
        console.warn('🧪 DRY_RUN mode: creating ephemeral wallet (no real transactions)');
        const tmp = ethers.Wallet.createRandom();
        wallets = [new ethers.Wallet(tmp.privateKey, provider)];
      } else {
        throw new Error("🚫 No secure wallet source available! Please configure Azure Key Vault or set GAS_WALLETS/PRIVATE_KEY");
      }
    } else {
      console.warn('⚠️ SECURITY WARNING: Using private keys from environment variables');
      console.warn('⚠️ Recommend migrating to Azure Key Vault for production use');
      
      const created: ethers.Wallet[] = [];
      for (const k of gasKeys) {
        try {
          created.push(new ethers.Wallet(k, provider));
        } catch (err) {
          console.warn('Invalid private key in environment variables - skipping one entry');
        }
      }
      
      if (created.length === 0) {
        if (process.env.DRY_RUN === 'true') {
          console.warn('🧪 All environment keys invalid; creating ephemeral wallet for DRY_RUN');
          const tmp = ethers.Wallet.createRandom();
          wallets = [new ethers.Wallet(tmp.privateKey, provider)];
        } else {
          throw new Error('🚫 No valid private keys found in environment variables');
        }
      } else {
        wallets = created;
        console.log(`⚠️ Loaded ${wallets.length} wallets from environment variables (INSECURE)`);
      }
>>>>>>> fix/ci-oidc-on-origin
    }
  }
  let walletIndex = 0;

  function nextWallet(): ethers.Wallet {
    const w = wallets[walletIndex % wallets.length];
    walletIndex++;
    return w;
  }

  const EXECUTOR = process.env.EXECUTOR!;
  // Executor will be connected with specific wallet when sending transactions
  const exe = new ethers.Contract(EXECUTOR, exeAbi, provider);

  const DRY_RUN = (process.env.DRY_RUN === 'true');

  // global vars for preflight-produced values & ops
  let maxLoanCap: bigint | null = null;
  const logsDir = path.dirname(process.env.LOG_FILE_PATH || './logs/arbitrage.log');
  try { fs.mkdirSync(logsDir, { recursive: true }); } catch (e) {}
  const logFile = process.env.LOG_FILE_PATH || './logs/arbitrage.log';
  function logLine(s: string) { try { fs.appendFileSync(logFile, `${new Date().toISOString()} ${s}\n`); } catch (e) {} }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  async function sendTelegram(text: string) {
    try {
      if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }) });
    } catch (e) { logLine('Telegram send failed: ' + String(e)); }
  }

  let consecutiveLosses = 0;
  const maxConsecutiveLosses = Number(process.env.MAX_CONSECUTIVE_LOSSES || 3);
  const csvPath = 'sim/price_sweep.csv';
  const backoffSeconds = Number(process.env.CONSOLIDATION_BACKOFF_SECONDS || 300);

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- Preflight checks (connectivity, contract presence, feature probes, safety) ---
  async function preflightChecks() {
    // RPC connectivity
    try {
      const bn = await provider.getBlockNumber();
      console.log('RPC connected, block:', bn);
    } catch (err) {
      throw new Error('Failed to connect to RPC provider: ' + String(err));
    }

    if (!EXECUTOR) throw new Error('EXECUTOR contract address not provided in env');

    // Ensure the executor contract has code at the address
    const code = await provider.getCode(EXECUTOR);
    if (!code || code === '0x') throw new Error('No contract deployed at EXECUTOR address: ' + EXECUTOR);

    // If requested, probe for features by checking ABI functions where possible
    if (process.env.CONTRACT_SUPPORT_REQUIRED === 'true') {
      const required = (process.env.CONTRACT_FEATURES_REQUIRED || '').split(',').map(s => s.trim()).filter(Boolean);
      for (const feat of required) {
        try {
          // heuristics: look for function names in our minimal ABI as a proxy for feature support
          if (feat === 'ATOMIC_FLASH') {
            exe.interface.getFunction('triggerFlashArb');
          } else if (feat === 'PROFIT_REDISTRIBUTION') {
            exe.interface.getFunction('setSplit');
            exe.interface.getFunction('setTreasury');
          } else if (feat === 'REENTRANCY_GUARD') {
            // cannot be detected via ABI reliably; log guidance
            console.log('Preflight: cannot auto-detect REENTRANCY_GUARD; ensure contract implements a reentrancy guard');
          } else {
            try {
              exe.interface.getFunction(feat);
            } catch (err) {
              console.warn(`Preflight: feature probe for ${feat} did not find a matching function name`);
            }
          }
        } catch (err) {
          console.warn(`Preflight: required feature ${feat} probe failed: ${String(err)}`);
        }
      }
    }

    // Wallet sanity
    if (wallets.length === 0) throw new Error('No gas wallets available; set GAS_WALLETS or PRIVATE_KEY in env');

    // Safety: enforce DRY_RUN unless explicitly confirmed
    if (!DRY_RUN && process.env.CONFIRM_REAL !== 'true') {
      throw new Error('DRY_RUN is disabled. To proceed with real txs explicitly set CONFIRM_REAL=true in the environment.');
    }
    // Aave liquidity probe (best-effort): try to read available liquidity for ASSET
    let aaveAvailable: bigint | null = null;
    try {
      const poolAbi = ["function getReserveData(address asset) view returns (uint256 availableLiquidity, uint128 something)"];
      const aave = new ethers.Contract(process.env.AAVE_POOL || '', poolAbi, provider);
      const rd: any = await aave.getReserveData(process.env.ASSET);
      if (rd && rd[0] !== undefined) {
        aaveAvailable = BigInt(rd[0].toString());
        console.log('Aave available liquidity (raw):', aaveAvailable.toString());
      }
    } catch (err) {
      console.warn('Aave liquidity probe failed (continuing):', String(err));
    }

    // compute max loan cap from Aave liquidity (use a safe fraction)
    try {
      const frac = Number(process.env.AAVE_LOAN_FRACTION || 0.01);
      if (aaveAvailable !== null) {
        maxLoanCap = BigInt(Math.floor(Number(aaveAvailable) * frac));
        console.log('Computed maxLoanCap (raw units):', maxLoanCap.toString(), 'using fraction', frac);
        logLine(`Computed maxLoanCap=${maxLoanCap.toString()} frac=${frac}`);
      }
    } catch (err) {
      console.warn('Failed computing maxLoanCap:', String(err));
    }

    // prepare global effective cap and logging
    const logsDir = path.dirname(process.env.LOG_FILE_PATH || './logs/arbitrage.log');
    try { fs.mkdirSync(logsDir, { recursive: true }); } catch (e) {}
    const logFile = process.env.LOG_FILE_PATH || './logs/arbitrage.log';
    function logLine(s: string) { try { fs.appendFileSync(logFile, `${new Date().toISOString()} ${s}\n`); } catch (e) {} }

    // set up Telegram helper
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    async function sendTelegram(text: string) {
      try {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }) });
      } catch (e) { logLine('Telegram send failed: ' + String(e)); }
    }

  // consecutive losses / emergency stop
  // (values already declared above to be accessible outside preflight)


    // Small Monte Carlo throughput estimate (inline, quick): outputs expected successes/day
    try {
      const secondsPerDay = 86400;
      const arrivalRatePerSec = Number(process.env.SIM_ARRIVAL_RATE_PER_SEC || 0.001);
      const successProbBase = Number(process.env.SIM_SUCCESS_PROB_BASE || 0.6);
      const competitionFactor = Number(process.env.SIM_COMPETITION_FACTOR || 0.5);
      const attemptsPerOpportunity = Number(process.env.SIM_ATTEMPTS_PER_OP || 1);
      const simRuns = Number(process.env.SIM_RUNS || 1000);
      // quick deterministic estimate (no randomness) for reporting
      const events = Math.floor(secondsPerDay * arrivalRatePerSec);
      const p = successProbBase * (1 - competitionFactor);
      const expectedSuccesses = events * (1 - Math.pow(1 - p, attemptsPerOpportunity));
      console.log(`MonteCarlo estimate (deterministic): events/day=${events}, expected successes/day≈${expectedSuccesses.toFixed(2)}`);
    } catch (err) {
      console.warn('Monte Carlo quick estimate failed:', String(err));
    }

    // Probe V3 pools for available fee tiers and basic liquidity info (best-effort)
    let v3PoolInfo: Array<{fee:number,pool:string,liquidity?:bigint,tick?:number}> = [];
    try {
      const factoryAddr = process.env.UNISWAP_V3_FACTORY || '0x1F98431c8aD98523631AE4a59f267346ea31F984';
      const factoryAbi = ["function getPool(address,address,uint24) view returns (address)"];
      const factory = new ethers.Contract(factoryAddr, factoryAbi, provider);
      const probeFees = [100,500,3000,10000];
      const poolAbi = [
        "function liquidity() view returns (uint128)",
        "function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)"
      ];
      for (const fee of probeFees) {
        try {
          const poolAddr: string = await factory.getPool(process.env.V3_IN, process.env.V3_OUT, fee);
          if (poolAddr && poolAddr !== ethers.ZeroAddress) {
            const pool = new ethers.Contract(poolAddr, poolAbi, provider);
            try {
              const li: bigint = BigInt((await pool.liquidity()).toString());
              const s0: any = await pool.slot0();
              v3PoolInfo.push({ fee, pool: poolAddr, liquidity: li, tick: Number(s0[1]) });
            } catch (err) {
              v3PoolInfo.push({ fee, pool: poolAddr });
            }
          }
        } catch (err) {
          // ignore
        }
      }
      if (v3PoolInfo.length > 0) console.log('V3 pools found:', v3PoolInfo.map(p=>`${p.fee}@${p.pool}`));
    } catch (err) {
      console.warn('V3 pool probe failed (continuing):', String(err));
    }

    // Stablecoin-only enforcement for flash loans: only enforce that the loan asset (ASSET) is a stablecoin.
    const stableList = (process.env.STABLECOIN_LIST || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (stableList.length === 0) {
      console.warn('No STABLECOIN_LIST configured; skipping stablecoin-only enforcement');
    } else {
      const aset = (process.env.ASSET || '').toLowerCase();
      if (!aset || !stableList.includes(aset)) {
        throw new Error('Stablecoin-only policy: ASSET must be one of STABLECOIN_LIST');
      }
      // V3_IN/V3_OUT (e.g., WETH) are allowed for arbitrage legs and are not restricted here.
    }
    console.log('Preflight checks passed; DRY_RUN=' + DRY_RUN);
  }

  await preflightChecks();

  // CONFIG: tokens & routers
  const ASSET = process.env.ASSET!;      // e.g., USDC
  const V3_IN = process.env.V3_IN!;      // tokenIn for the first leg (e.g., USDC)
  const V3_OUT = process.env.V3_OUT!;    // tokenOut for the first leg (e.g., WETH)
  const DECIMALS = Number(process.env.DECIMALS || 6); // ASSET decimals (USDC=6, WETH=18)
  const V3_FEE = Number(process.env.V3_FEE || 500);
  const MIN_EDGE_BPS = Number(process.env.MIN_EDGE_BPS || 25);

  const QUOTER = process.env.QUOTER!; // Uni v3 QuoterV2 addr per chain
  const V2_ROUTER = process.env.V2_ROUTER!;

  const quoter = new ethers.Contract(QUOTER, quoterAbi, provider);
  const v2Router = new ethers.Contract(V2_ROUTER, v2Abi, provider);

  // Try multiple ways to get a v3 quote: different fee tiers and positional/tuple signatures
  async function tryQuote(amountIn: bigint): Promise<bigint | null> {
    const envFee = Number(process.env.V3_FEE || 0);
    const feeTiers = [...new Set([envFee, 500, 3000, 10000, 100].filter(Boolean))];
    for (const fee of feeTiers) {
      try {
        const params = { tokenIn: V3_IN, tokenOut: V3_OUT, fee: fee, amountIn: amountIn, sqrtPriceLimitX96: 0 };
        const out: bigint = await quoter.quoteExactInputSingle(params as any);
        return out;
      } catch (err) {
        // try positional signature
        try {
          const out2: bigint = await (quoter as any).quoteExactInputSingle(V3_IN, V3_OUT, fee, amountIn, 0);
          return out2;
        } catch (_) {
          // continue to next fee tier
        }
      }
    }
    return null;
  }

  // Candidate sizes (in ASSET units, string for readability)
  const candidateStrings = (process.env.SIZES || "5000,10000,20000,40000,80000").split(",");
  let sizes = candidateStrings.map(s => parseUnits(s.trim(), DECIMALS));
  // apply maxLoanCap if preflight computed it
  if (maxLoanCap !== null) {
    const before = sizes.length;
    sizes = sizes.filter(sz => sz <= maxLoanCap!);
    if (sizes.length !== before) {
      const msg = `Filtered candidate sizes by maxLoanCap=${String(maxLoanCap)}: ${before} -> ${sizes.length}`;
      console.log(msg);
      logLine(msg);
      await sendTelegram(msg);
    }
  }

  // ensure sweep csv exists and header present
  try {
    if (!fs.existsSync(csvPath)) {
      fs.mkdirSync(path.dirname(csvPath), { recursive: true });
      fs.writeFileSync(csvPath, 'timestamp,size,edge_bps,slippage_bps,method,notes\n');
    }
  } catch (e) { console.warn('CSV init failed', String(e)); }

<<<<<<< HEAD
  // Adaptive threshold helper
  function getActiveEdgeBps(): number {
    const mode = (process.env.ACTIVE_THRESHOLD_MODE || 'balanced').toLowerCase();
    switch (mode) {
      case 'conservative': return Number(process.env.CONSERVATIVE_MIN_EDGE_BPS || 25);
      case 'aggressive': return Number(process.env.AGGRESSIVE_MIN_EDGE_BPS || 250);
      case 'whale': return Number(process.env.WHALE_MIN_EDGE_BPS || 500);
      default: return Number(process.env.BALANCED_MIN_EDGE_BPS || 75);
    }
=======
  // Network Detection
  const NETWORK_ID = await provider.getNetwork().then(n => n.chainId.toString());
  const isArbitrum = NETWORK_ID === '42161';
  const isPolygon = NETWORK_ID === '137';
  
  console.log(`🌐 Detected Network: ${isArbitrum ? 'Arbitrum' : isPolygon ? 'Polygon' : `Unknown (${NETWORK_ID})`}`);

  // Enhanced Multi-DEX Configuration with Network-Specific Addresses
  const DEX_CONFIGS = {
    uniswap_v3: {
      enabled: process.env.ENABLE_UNISWAP_V3 !== 'false',
      quoter: process.env.QUOTER || '0x61fFE014bA17989E743c5F6cB21bF9697530B21e', // Same on Arbitrum/Polygon
      fees: process.env.V3_FEES?.split(',').map(Number) || [100, 500, 3000, 10000],
      priority: parseInt(process.env.UNISWAP_V3_PRIORITY || '1'),
      minLiquidity: parseInt(process.env.MIN_LIQUIDITY_UNISWAP || '100000')
    },
    uniswap_v2: {
      enabled: process.env.ENABLE_UNISWAP_V2 !== 'false', 
      router: process.env.V2_ROUTER,
      fee: 300,
      priority: parseInt(process.env.UNISWAP_V2_PRIORITY || '2'),
      minLiquidity: parseInt(process.env.MIN_LIQUIDITY_UNISWAP || '100000')
    },
    sushiswap: {
      enabled: process.env.ENABLE_SUSHISWAP === 'true',
      router: isArbitrum ? process.env.SUSHI_ROUTER_ARBITRUM : 
              isPolygon ? process.env.SUSHI_ROUTER_POLYGON : 
              process.env.SUSHI_ROUTER,
      defaultRouter: isArbitrum ? '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506' :
                     isPolygon ? '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506' : null,
      fee: 300,
      priority: parseInt(process.env.SUSHISWAP_PRIORITY || '3'),
      minLiquidity: parseInt(process.env.MIN_LIQUIDITY_SUSHISWAP || '50000')
    },
    quickswap: {
      enabled: isPolygon && process.env.ENABLE_QUICKSWAP === 'true',
      router: process.env.QUICKSWAP_ROUTER_POLYGON || '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
      fee: 300,
      priority: parseInt(process.env.QUICKSWAP_PRIORITY || '3'),
      minLiquidity: parseInt(process.env.MIN_LIQUIDITY_QUICKSWAP || '25000'),
      network: 'polygon'
    },
    camelot: {
      enabled: isArbitrum && process.env.ENABLE_CAMELOT === 'true',
      router: process.env.CAMELOT_ROUTER_ARBITRUM || '0xc873fEcbd354f5A56E00E710B90EF4201db2448d',
      fees: process.env.CAMELOT_FEES?.split(',').map(Number) || [100, 500, 3000, 10000],
      priority: parseInt(process.env.CAMELOT_PRIORITY || '4'),
      minLiquidity: parseInt(process.env.MIN_LIQUIDITY_CAMELOT || '10000'),
      network: 'arbitrum',
      type: 'v3-like'
    },
    curve: {
      enabled: process.env.ENABLE_CURVE === 'true',
      router: isArbitrum ? process.env.CURVE_ROUTER_ARBITRUM || '0x7544Fe3d184b6B55D6B36c3FCA1157eE0Ba30287' :
              isPolygon ? process.env.CURVE_ROUTER_POLYGON || '0x094d12e5b541784701FD8d65F11fc0598FBC6332' :
              process.env.CURVE_ROUTER,
      priority: parseInt(process.env.CURVE_PRIORITY || '6'),
      minLiquidity: parseInt(process.env.MIN_LIQUIDITY_CURVE || '50000'),
      slippageBps: parseInt(process.env.DEX_SPECIFIC_SLIPPAGE_CURVE || '50'),
      specialization: 'stablecoins'
    },
    balancer: {
      enabled: process.env.ENABLE_BALANCER === 'true',
      vault: isArbitrum ? process.env.BALANCER_VAULT_ARBITRUM || '0xBA12222222228d8Ba445958a75a0704d566BF2C8' :
             isPolygon ? process.env.BALANCER_VAULT_POLYGON || '0xBA12222222228d8Ba445958a75a0704d566BF2C8' :
             process.env.BALANCER_VAULT,
      priority: parseInt(process.env.BALANCER_PRIORITY || '5'),
      slippageBps: parseInt(process.env.DEX_SPECIFIC_SLIPPAGE_BALANCER || '75'),
      type: 'weighted-pools'
    },
    dodo: {
      enabled: isPolygon && process.env.ENABLE_DODO === 'true',
      proxy: process.env.DODO_PROXY_POLYGON || '0xa222e6a71D1A1Dd5F279805fbe38d5329C1d0e70',
      priority: parseInt(process.env.DODO_PRIORITY || '7'),
      network: 'polygon',
      type: 'proactive-market-maker'
    }
  };

  // Network-Specific Token Configurations
  const NETWORK_TOKENS = {
    arbitrum: {
      USDC: process.env.USDC_ARBITRUM || '0xA0b86a33E6441b8bBDBB9F6a8fb3eAAF7A03E8a0',
      USDT: process.env.USDT_ARBITRUM || '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      WETH: process.env.WETH_ARBITRUM || '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      ARB: process.env.ARB_ARBITRUM || '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    polygon: {
      USDC: process.env.USDC_POLYGON || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      USDT: process.env.USDT_POLYGON || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      WETH: process.env.WETH_POLYGON || '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      WMATIC: process.env.WMATIC_POLYGON || '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
    }
  };

  const currentNetworkTokens = isArbitrum ? NETWORK_TOKENS.arbitrum : 
                               isPolygon ? NETWORK_TOKENS.polygon : {};

  // Filter enabled DEXs and log configuration
  const enabledDEXs = Object.entries(DEX_CONFIGS)
    .filter(([name, config]) => config.enabled)
    .map(([name, config]) => ({
      name,
      priority: config.priority,
      router: (config as any).router || (config as any).defaultRouter || (config as any).vault || (config as any).proxy || (config as any).quoter,
      type: (config as any).type || 'standard'
    }))
    .sort((a, b) => a.priority - b.priority);

  console.log(`🔀 Enabled DEXs (${enabledDEXs.length}):`, enabledDEXs.map(d => 
    `${d.name}(${d.priority})`).join(', '));

  // Market Condition Monitor
  class MarketConditionMonitor {
    private volatility24h: number = 0;
    private gasHistory: number[] = [];
    private mevCompetition: number = 0;
    private liquidityDepth: Map<string, number> = new Map();
    
    async updateMarketConditions() {
      try {
        // Gas price monitoring
        const feeData = await provider.getFeeData();
        const gasGwei = Number(ethers.formatUnits(feeData.maxFeePerGas || feeData.gasPrice || 0n, 'gwei'));
        this.gasHistory.push(gasGwei);
        if (this.gasHistory.length > 288) this.gasHistory.shift(); // Keep 24h (5min intervals)
        
        // Volatility estimation (simplified)
        if (this.gasHistory.length > 12) {
          const recent = this.gasHistory.slice(-12);
          const avg = recent.reduce((a, b) => a + b) / recent.length;
          const variance = recent.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / recent.length;
          this.volatility24h = Math.sqrt(variance) / avg;
        }
        
        // MEV competition estimation (based on pending tx count)
        const pendingTxCount = await provider.send('eth_getBlockTransactionCountByNumber', ['pending']);
        this.mevCompetition = Math.min(parseInt(pendingTxCount, 16) / 200, 1); // Normalize to 0-1
        
        logLine(`Market conditions: gasGwei=${gasGwei}, volatility=${this.volatility24h.toFixed(3)}, mevComp=${this.mevCompetition.toFixed(3)}`);
      } catch (err) {
        console.warn('Market condition update failed:', String(err));
      }
    }
    
    getConditions() {
      return {
        currentGas: this.gasHistory[this.gasHistory.length - 1] || 0,
        avgGas24h: this.gasHistory.reduce((a, b) => a + b, 0) / this.gasHistory.length || 0,
        volatility: this.volatility24h,
        mevCompetition: this.mevCompetition,
        liquidityDepth: this.liquidityDepth
      };
    }
  }

  const marketMonitor = new MarketConditionMonitor();

  // Circuit Breaker System
  class CircuitBreaker {
    private failures: number = 0;
    private lastFailure: number = 0;
    private emergencyStop: boolean = false;
    private maxDailyLoss: number;
    private dailyLoss: number = 0;
    private lastReset: number = Date.now();
    
    constructor() {
      this.maxDailyLoss = Number(process.env.MAX_DAILY_LOSS_USD || 1000);
    }
    
    checkBreakers(): { proceed: boolean, reason?: string } {
      const now = Date.now();
      
      // Reset daily counters
      if (now - this.lastReset > 86400000) { // 24 hours
        this.dailyLoss = 0;
        this.lastReset = now;
      }
      
      // Emergency stop check
      if (this.emergencyStop) {
        return { proceed: false, reason: 'Emergency stop activated' };
      }
      
      // Daily loss limit
      if (this.dailyLoss > this.maxDailyLoss) {
        return { proceed: false, reason: `Daily loss limit exceeded: $${this.dailyLoss}` };
      }
      
      // Consecutive failures
      const maxFailures = Number(process.env.MAX_CONSECUTIVE_FAILURES || 5);
      const cooldownMs = Number(process.env.FAILURE_COOLDOWN_MS || 300000); // 5 min
      
      if (this.failures >= maxFailures && (now - this.lastFailure) < cooldownMs) {
        return { proceed: false, reason: `Too many failures: ${this.failures}, cooling down` };
      }
      
      // Market condition checks
      const conditions = marketMonitor.getConditions();
      const maxGasLimit = Number(process.env.MAX_GAS_GWEI || 200);
      const maxVolatility = Number(process.env.MAX_VOLATILITY || 0.5);
      
      if (conditions.currentGas > maxGasLimit) {
        return { proceed: false, reason: `Gas too high: ${conditions.currentGas} gwei` };
      }
      
      if (conditions.volatility > maxVolatility) {
        return { proceed: false, reason: `Volatility too high: ${(conditions.volatility * 100).toFixed(1)}%` };
      }
      
      return { proceed: true };
    }
    
    recordFailure(lossUSD: number = 0) {
      this.failures++;
      this.lastFailure = Date.now();
      this.dailyLoss += lossUSD;
      logLine(`Circuit breaker: failure #${this.failures}, daily loss: $${this.dailyLoss}`);
    }
    
    recordSuccess() {
      this.failures = Math.max(0, this.failures - 1); // Gradually reduce failure count
    }
    
    emergencyHalt(reason: string) {
      this.emergencyStop = true;
      logLine(`EMERGENCY STOP: ${reason}`);
      sendTelegram(`🚨 EMERGENCY STOP: ${reason}`);
    }
  }

  const circuitBreaker = new CircuitBreaker();

  // MEV Protection & Private Mempool Integration
  class MEVProtection {
    private useFlashbots: boolean;
    private usePrivatePool: boolean;
    private bundleMode: boolean;
    
    constructor() {
      this.useFlashbots = process.env.USE_FLASHBOTS === 'true';
      this.usePrivatePool = process.env.USE_PRIVATE_POOL === 'true';
      this.bundleMode = process.env.USE_BUNDLE_MODE === 'true';
    }
    
    async submitTransaction(populatedTx: any, signer: ethers.Wallet): Promise<any> {
      const conditions = marketMonitor.getConditions();
      
      // High MEV competition -> use private pools
      if (conditions.mevCompetition > 0.7 || this.useFlashbots) {
        return this.submitViaFlashbots(populatedTx, signer);
      }
      
      // Medium competition -> use private mempool if available
      if (conditions.mevCompetition > 0.4 || this.usePrivatePool) {
        return this.submitViaPrivatePool(populatedTx, signer);
      }
      
      // Low competition -> public mempool with protection
      return this.submitWithProtection(populatedTx, signer);
    }
    
    private async submitViaFlashbots(populatedTx: any, signer: ethers.Wallet): Promise<any> {
      // Flashbots bundle submission (scaffold - requires flashbots SDK)
      console.log('🥷 Submitting via Flashbots bundle');
      
      if (process.env.FLASHBOTS_ENDPOINT && process.env.FLASHBOTS_SIGNATURE_KEY) {
        try {
          // This would integrate with @flashbots/ethers-provider-bundle
          // For now, fallback to regular submission with higher gas
          populatedTx.maxFeePerGas = populatedTx.maxFeePerGas * BigInt(120) / BigInt(100); // +20%
          return await signer.sendTransaction(populatedTx);
        } catch (err) {
          console.warn('Flashbots submission failed, using fallback:', String(err));
          return this.submitWithProtection(populatedTx, signer);
        }
      }
      
      return this.submitWithProtection(populatedTx, signer);
    }
    
    private async submitViaPrivatePool(populatedTx: any, signer: ethers.Wallet): Promise<any> {
      console.log('🔒 Submitting via private mempool');
      
      // Private pool integration (scaffold)
      if (process.env.PRIVATE_POOL_ENDPOINT) {
        try {
          // This would integrate with services like Eden Network, BloXroute, etc.
          // For now, use higher gas to compete
          populatedTx.maxFeePerGas = populatedTx.maxFeePerGas * BigInt(110) / BigInt(100); // +10%
          return await signer.sendTransaction(populatedTx);
        } catch (err) {
          console.warn('Private pool submission failed:', String(err));
          return this.submitWithProtection(populatedTx, signer);
        }
      }
      
      return this.submitWithProtection(populatedTx, signer);
    }
    
    private async submitWithProtection(populatedTx: any, signer: ethers.Wallet): Promise<any> {
      // Add nonce gaps and timing randomization to reduce predictability
      const delay = Math.random() * 2000; // 0-2 second random delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return await signer.sendTransaction(populatedTx);
    }
  }

  const mevProtection = new MEVProtection();

  // Enhanced Dynamic Gas Pricing
  class DynamicGasPricer {
    private gasHistory: number[] = [];
    private profitabilityThreshold: number = 75; // base bps
    
    async calculateOptimalGas(estimatedGas: bigint, profitUSD: number): Promise<{ gasPrice: bigint, gasLimit: bigint }> {
      const conditions = marketMonitor.getConditions();
      const feeData = await provider.getFeeData();
      
      let baseGasPrice = feeData.maxFeePerGas || feeData.gasPrice || 0n;
      let gasLimit = estimatedGas;
      
      // Dynamic adjustment based on market conditions
      if (conditions.volatility > 0.3) {
        // High volatility -> increase gas for faster execution
        baseGasPrice = baseGasPrice * BigInt(150) / BigInt(100); // +50%
      } else if (conditions.volatility < 0.1) {
        // Low volatility -> can afford to wait, reduce gas
        baseGasPrice = baseGasPrice * BigInt(90) / BigInt(100); // -10%
      }
      
      // MEV competition adjustment
      if (conditions.mevCompetition > 0.6) {
        baseGasPrice = baseGasPrice * BigInt(130) / BigInt(100); // +30%
      }
      
      // Profitability check
      const gasCostETH = Number(baseGasPrice * gasLimit) / 1e18;
      const ethPriceUSD = Number(process.env.ETH_PRICE_USD || 2500);
      const gasCostUSD = gasCostETH * ethPriceUSD;
      
      // Ensure gas cost doesn't exceed 50% of profit
      const maxGasCostUSD = profitUSD * 0.5;
      if (gasCostUSD > maxGasCostUSD) {
        const reductionFactor = maxGasCostUSD / gasCostUSD;
        baseGasPrice = BigInt(Math.floor(Number(baseGasPrice) * reductionFactor));
      }
      
      return { gasPrice: baseGasPrice, gasLimit };
    }
  }

  const gasPricer = new DynamicGasPricer();

  // Adaptive threshold helper with market conditions
  function getActiveEdgeBps(): number {
    const conditions = marketMonitor.getConditions();
    const mode = (process.env.ACTIVE_THRESHOLD_MODE || 'balanced').toLowerCase();
    
    let baseBps: number;
    switch (mode) {
      case 'conservative': baseBps = Number(process.env.CONSERVATIVE_MIN_EDGE_BPS || 25); break;
      case 'aggressive': baseBps = Number(process.env.AGGRESSIVE_MIN_EDGE_BPS || 250); break;
      case 'whale': baseBps = Number(process.env.WHALE_MIN_EDGE_BPS || 500); break;
      default: baseBps = Number(process.env.BALANCED_MIN_EDGE_BPS || 75);
    }
    
    // Auto-adjust based on market conditions
    if (conditions.mevCompetition > 0.6) baseBps *= 1.5; // Higher threshold when MEV competition is high
    if (conditions.volatility > 0.3) baseBps *= 1.3; // Higher threshold during high volatility
    if (conditions.currentGas > 100) baseBps *= 1.2; // Higher threshold during gas spikes
    
    return Math.ceil(baseBps);
>>>>>>> fix/ci-oidc-on-origin
  }

  async function adjustForGasAndVolatility(baseBps: number): Promise<number> {
    try {
<<<<<<< HEAD
      const feeData = await provider.getFeeData();
      const gasGwei = Number(ethers.formatUnits(feeData.maxFeePerGas || feeData.gasPrice || 0n, 'gwei'));
      const gasThreshold = Number(process.env.GAS_PRICE_THRESHOLD_GWEI || 50);
      let adjusted = baseBps;
      if (gasGwei > gasThreshold) adjusted = Math.ceil(adjusted * Number(process.env.HIGH_GAS_MULTIPLIER || 1.5));
      // Simple volatility proxy: if TARGET_DAILY_RETURN_RATE is high, be more conservative
      const vol = Number(process.env.VOLATILITY_MULTIPLIER || 1.0);
      adjusted = Math.ceil(adjusted * vol);
=======
      const conditions = marketMonitor.getConditions();
      let adjusted = baseBps;
      
      // Dynamic gas adjustment
      const gasThreshold = Number(process.env.GAS_PRICE_THRESHOLD_GWEI || 50);
      if (conditions.currentGas > gasThreshold) {
        const gasMultiplier = 1 + (conditions.currentGas - gasThreshold) / gasThreshold;
        adjusted = Math.ceil(adjusted * Math.min(gasMultiplier, 3)); // Cap at 3x
      }
      
      // Volatility adjustment
      if (conditions.volatility > 0.2) {
        const volMultiplier = 1 + conditions.volatility;
        adjusted = Math.ceil(adjusted * Math.min(volMultiplier, 2)); // Cap at 2x
      }
      
      // Competition adjustment
      if (conditions.mevCompetition > 0.5) {
        const compMultiplier = 1 + conditions.mevCompetition;
        adjusted = Math.ceil(adjusted * Math.min(compMultiplier, 2.5)); // Cap at 2.5x
      }
      
>>>>>>> fix/ci-oidc-on-origin
      return adjusted;
    } catch (e) {
      return baseBps;
    }
  }

<<<<<<< HEAD
=======
  // Enhanced Arbitrage Opportunity Detection with Multi-DEX Support
  async function checkEnhancedArbitrageOpportunities(): Promise<void> {
    logLine("🔍 Enhanced multi-DEX arbitrage scanning initiated");
    
    // Update market conditions
    const startTime = Date.now();
    await marketMonitor.updateMarketConditions();
    
    // Circuit breaker check
    const breakerStatus = circuitBreaker.checkBreakers();
    if (!breakerStatus.proceed) {
      logLine(`⛔ Circuit breaker triggered: ${breakerStatus.reason}`);
      return;
    }
    
    const activeEdgeBps = await adjustForGasAndVolatility(getActiveEdgeBps());
    logLine(`📊 Active edge threshold: ${activeEdgeBps}bps`);
    
    const enabledDexes = Object.entries(DEX_CONFIGS)
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => a[1].priority - b[1].priority);
    
    logLine(`🎯 Scanning ${enabledDexes.length} DEXes: ${enabledDexes.map(([name, _]) => name).join(", ")}`);
    
    // Multi-DEX arbitrage detection
    for (let i = 0; i < enabledDexes.length - 1; i++) {
      for (let j = i + 1; j < enabledDexes.length; j++) {
        const [dex1Name, dex1Config] = enabledDexes[i];
        const [dex2Name, dex2Config] = enabledDexes[j];
        
        await checkDexPairArbitrage(dex1Name, dex2Name, activeEdgeBps, startTime);
      }
    }
  }

  async function checkDexPairArbitrage(
    dex1Name: string, dex2Name: string, activeEdgeBps: number, startTime: number
  ): Promise<void> {
    logLine(`🔄 Checking arbitrage: ${dex1Name} → ${dex2Name}`);
    
    for (const sizeStr of candidateStrings) {
      const size = parseUnits(sizeStr.trim(), DECIMALS);
      
      try {
        // Get quotes from both DEXes
        const quote1 = await getEnhancedQuote(size, dex1Name, true);
        const quote2 = await getEnhancedQuote(quote1 || size, dex2Name, false);
        
        if (!quote1 || !quote2) continue;
        
        // Calculate precise arbitrage edge
        const edgeBps = calculatePreciseEdge(quote1, quote2, size, DECIMALS);
        
        if (edgeBps >= activeEdgeBps) {
          const profitUSD = estimateProfitUSD(edgeBps, sizeStr);
          logLine(`🎯 ARBITRAGE OPPORTUNITY: ${dex1Name}→${dex2Name}, size=${sizeStr}, edge=${edgeBps}bps, profit≈$${profitUSD.toFixed(2)}`);
          
          if (!DRY_RUN) {
            await executeEnhancedArbitrageTrade(dex1Name, dex2Name, sizeStr, size, edgeBps, profitUSD);
          } else {
            // Log dry run results
            try { 
              fs.appendFileSync(csvPath, `${new Date().toISOString()},${sizeStr},${edgeBps},0,${dex1Name}_${dex2Name},DRY_RUN_ENHANCED\n`); 
            } catch (err) {}
          }
          
          consecutiveLosses = 0;
          return; // Exit after finding first profitable opportunity
        }
        
      } catch (error) {
        logLine(`❌ Error checking ${dex1Name}→${dex2Name} for size ${sizeStr}: ${String(error)}`);
      }
    }
  }

  async function getEnhancedQuote(size: bigint, dexName: string, isInput: boolean): Promise<bigint | null> {
    const dexConfig = DEX_CONFIGS[dexName as keyof typeof DEX_CONFIGS];
    if (!dexConfig?.enabled) return null;
    
    try {
      switch (dexName) {
        case 'uniswap_v3':
          return await getUniswapV3EnhancedQuote(size, isInput);
        case 'uniswap_v2':
          return await getUniswapV2EnhancedQuote(size, isInput);
        case 'sushiswap':
          return await getSushiSwapQuote(size, isInput);
        case 'quickswap':
          return await getQuickSwapQuote(size, isInput);
        case 'camelot':
          return await getCamelotQuote(size, isInput);
        case 'curve':
          return await getCurveQuote(size, isInput);
        case 'balancer':
          return await getBalancerQuote(size, isInput);
        case 'dodo':
          return await getDodoQuote(size, isInput);
        default:
          return null;
      }
    } catch (error) {
      logLine(`❌ Enhanced quote error for ${dexName}: ${String(error)}`);
      return null;
    }
  }

  async function getUniswapV3EnhancedQuote(size: bigint, isInput: boolean): Promise<bigint | null> {
    return isInput ? await tryQuote(size) : null;
  }

  async function getUniswapV2EnhancedQuote(size: bigint, isInput: boolean): Promise<bigint | null> {
    if (isInput) return null; // V2 used for reverse leg
    
    try {
      const path = [V3_OUT, V3_IN];
      const amounts: bigint[] = await v2Router.getAmountsOut(size, path);
      return amounts[amounts.length - 1];
    } catch (error) {
      return null;
    }
  }

  async function getSushiSwapQuote(size: bigint, isInput: boolean): Promise<bigint | null> {
    const config = DEX_CONFIGS.sushiswap;
    if (!(config as any).router) return null;
    
    try {
      const routerContract = new ethers.Contract(
        (config as any).router,
        ["function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"],
        provider
      );
      
      const path = [isInput ? V3_IN : V3_OUT, isInput ? V3_OUT : V3_IN];
      const amounts: bigint[] = await routerContract.getAmountsOut(size, path);
      return amounts[amounts.length - 1];
    } catch (error) {
      return null;
    }
  }

  async function getQuickSwapQuote(size: bigint, isInput: boolean): Promise<bigint | null> {
    const config = DEX_CONFIGS.quickswap;
    if (!(config as any).router) return null;
    
    try {
      const routerContract = new ethers.Contract(
        (config as any).router,
        ["function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"],
        provider
      );
      
      const path = [isInput ? V3_IN : V3_OUT, isInput ? V3_OUT : V3_IN];
      const amounts: bigint[] = await routerContract.getAmountsOut(size, path);
      return amounts[amounts.length - 1];
    } catch (error) {
      return null;
    }
  }

  async function getCamelotQuote(size: bigint, isInput: boolean): Promise<bigint | null> {
    const config = DEX_CONFIGS.camelot;
    if (!(config as any).router) return null;
    
    try {
      const routerContract = new ethers.Contract(
        (config as any).router,
        ["function quoteExactInputSingle((address,address,uint24,uint256,uint160)) external returns (uint256)"],
        provider
      );
      
      for (const fee of (config as any).fees || [500, 3000]) {
        try {
          const params = {
            tokenIn: isInput ? V3_IN : V3_OUT,
            tokenOut: isInput ? V3_OUT : V3_IN,
            fee: fee,
            amountIn: size,
            sqrtPriceLimitX96: 0
          };
          
          const quote = await routerContract.quoteExactInputSingle(params);
          if (quote > 0n) return quote;
        } catch (e) {
          continue;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async function getCurveQuote(size: bigint, isInput: boolean): Promise<bigint | null> {
    const config = DEX_CONFIGS.curve;
    if (!(config as any).router) return null;
    
    try {
      // Curve has specialized functions for stablecoin swaps
      const curveContract = new ethers.Contract(
        (config as any).router,
        [
          "function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)",
          "function get_exchange_amount(address from, address to, uint256 amount) external view returns (uint256)"
        ],
        provider
      );
      
      // Try generic exchange function first
      try {
        const quote = await curveContract.get_exchange_amount(
          isInput ? V3_IN : V3_OUT,
          isInput ? V3_OUT : V3_IN,
          size
        );
        return quote;
      } catch (e) {
        // Fallback to indexed method if tokens are known stablecoins
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  async function getBalancerQuote(size: bigint, isInput: boolean): Promise<bigint | null> {
    const config = DEX_CONFIGS.balancer;
    if (!(config as any).vault) return null;
    
    try {
      // Balancer V2 vault query
      const balancerVault = new ethers.Contract(
        (config as any).vault,
        [
          "function queryBatchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds) external returns (int256[] memory assetDeltas)"
        ],
        provider
      );
      
      // This is a simplified implementation - would need pool discovery
      return null; // Placeholder - requires pool ID discovery
    } catch (error) {
      return null;
    }
  }

  async function getDodoQuote(size: bigint, isInput: boolean): Promise<bigint | null> {
    const config = DEX_CONFIGS.dodo;
    if (!(config as any).proxy) return null;
    
    try {
      // DODO proxy query
      const dodoProxy = new ethers.Contract(
        (config as any).proxy,
        [
          "function queryDODOSwap(address fromToken, address toToken, uint256 fromTokenAmount) external view returns (uint256 returnAmount)"
        ],
        provider
      );
      
      const quote = await dodoProxy.queryDODOSwap(
        isInput ? V3_IN : V3_OUT,
        isInput ? V3_OUT : V3_IN,
        size
      );
      return quote;
    } catch (error) {
      return null;
    }
  }

  function calculatePreciseEdge(quote1: bigint, quote2: bigint, size: bigint, decimals: number): number {
    try {
      const size_f = Number(ethers.formatUnits(size, decimals));
      const quote1_f = Number(ethers.formatUnits(quote1, decimals));
      const quote2_f = Number(ethers.formatUnits(quote2, decimals));
      
      // Precise arbitrage calculation: (output / input) - 1
      const rate1 = quote1_f / size_f;
      const rate2 = quote2_f / quote1_f;
      const totalRate = rate1 * rate2;
      const rawEdge = (totalRate - 1) * 10000;
      
      // Apply dynamic slippage buffer based on market conditions
      const conditions = marketMonitor.getConditions();
      const baseSlippage = 5; // 5bps base slippage
      const volatilitySlippage = conditions.volatility * 100; // Additional slippage for volatility
      const liquiditySlippage = Math.min(size_f / 100000, 50); // Max 50bps for large trades
      
      const totalSlippage = baseSlippage + volatilitySlippage + liquiditySlippage;
      
      return Math.max(0, rawEdge - totalSlippage);
    } catch (error) {
      return 0;
    }
  }

  function estimateProfitUSD(edgeBps: number, sizeStr: string): number {
    const sizeUSD = Number(sizeStr);
    const grossProfitUSD = sizeUSD * (edgeBps / 10000);
    
    // Enhanced cost estimation with dynamic pricing
    const conditions = marketMonitor.getConditions();
    const flashLoanFee = sizeUSD * 0.0009; // 0.09% Aave fee
    
    // Dynamic gas cost based on current conditions
    const baseGasCostUSD = Number(process.env.ESTIMATED_GAS_COST_USD || 20);
    const gasMultiplier = conditions.currentGas > 100 ? conditions.currentGas / 50 : 1;
    const gasCostUSD = baseGasCostUSD * Math.min(gasMultiplier, 5); // Cap at 5x
    
    // Dynamic slippage cost
    const baseSlippage = 0.005; // 0.5%
    const volatilitySlippage = conditions.volatility * 0.01; // 1% per unit volatility
    const totalSlippageRate = Math.min(baseSlippage + volatilitySlippage, 0.05); // Cap at 5%
    const slippageCost = sizeUSD * totalSlippageRate;
    
    // MEV competition cost (opportunity cost)
    const mevCost = sizeUSD * conditions.mevCompetition * 0.001; // Up to 0.1% for high competition
    
    const totalCosts = flashLoanFee + gasCostUSD + slippageCost + mevCost;
    
    return Math.max(0, grossProfitUSD - totalCosts);
  }

  async function executeEnhancedArbitrageTrade(
    dex1Name: string, dex2Name: string, sizeStr: string, size: bigint, 
    edgeBps: number, profitUSD: number
  ): Promise<void> {
    try {
      logLine(`🚀 Executing enhanced arbitrage: ${dex1Name}→${dex2Name}, size=${sizeStr}, profit=$${profitUSD.toFixed(2)}`);
      
      const signer = nextWallet();
      const exeWithSigner = exe.connect(signer);
      
      // Enhanced gas pricing
      const gasData = await gasPricer.calculateOptimalGas(BigInt(750000), profitUSD);
      
      // Build transaction with enhanced parameters
      const nonce = await provider.getTransactionCount(signer.address, 'pending');
      const arbitrageParams = encodeArbitrageParams(dex1Name, dex2Name, size);
      const populated = await (exeWithSigner as any).populateTransaction.triggerFlashArb(ASSET, size, arbitrageParams);
      
      populated.nonce = nonce;
      populated.gasLimit = gasData.gasLimit;
      populated.maxFeePerGas = gasData.gasPrice;
      populated.maxPriorityFeePerGas = gasData.gasPrice / BigInt(2);
      
      // Submit with MEV protection
      const tx = await mevProtection.submitTransaction(populated, signer);
      
      logLine(`📤 Enhanced arbitrage tx sent: ${tx.hash} from ${signer.address} nonce ${nonce}`);
      sendTelegram(`🚀 Enhanced arbitrage: ${dex1Name}→${dex2Name} size=${sizeStr} edge=${edgeBps}bps tx=${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        logLine(`✅ Enhanced arbitrage successful: ${tx.hash}`);
        circuitBreaker.recordSuccess();
        
        // Record success metrics
        try { 
          fs.appendFileSync(csvPath, `${new Date().toISOString()},${sizeStr},${edgeBps},0,${dex1Name}_${dex2Name},SUCCESS_ENHANCED\n`); 
        } catch (err) {}
        
        // Track profits (simplified)
        try { 
          if (appInsightsClient) {
            appInsightsClient.trackMetric({ name: 'enhancedArbitrageProfit', value: profitUSD });
            appInsightsClient.trackMetric({ name: 'enhancedArbitrageEdge', value: edgeBps });
          }
        } catch (e) {}
        
      } else {
        logLine(`❌ Enhanced arbitrage failed: ${tx.hash}`);
        circuitBreaker.recordFailure(profitUSD * 0.1); // Estimate 10% loss on failure
      }
      
    } catch (error) {
      logLine(`❌ Enhanced arbitrage execution error: ${String(error)}`);
      circuitBreaker.recordFailure();
      consecutiveLosses++;
    }
  }

  function encodeArbitrageParams(dex1Name: string, dex2Name: string, size: bigint): string {
    // This would encode specific DEX routing parameters
    // For now, return existing logic (placeholder)
    return "0x"; // Would encode actual routing data
  }

  // Original size-based arbitrage loop (enhanced with circuit breakers)
>>>>>>> fix/ci-oidc-on-origin
  for (const size of sizes) {
    // v3 leg: tokenIn -> tokenOut
    // First try V3 quoter with probing
    let v3Out: bigint | null = null;
    try {
      v3Out = await tryQuote(size);
    } catch (err) {
      console.warn('Quoter probing threw:', String(err));
      v3Out = null;
    }

  let roundTrip: bigint | null = null;
  let method = 'v3';

    if (v3Out) {
      // v2 leg: tokenOut -> tokenIn
      try {
        const amounts: bigint[] = await v2Router.getAmountsOut(v3Out, [V3_OUT, V3_IN]);
        roundTrip = amounts[amounts.length - 1];
      } catch (err) {
        console.warn('V2 router getAmountsOut failed for v3Out', v3Out.toString(), ':', String(err));
        roundTrip = null;
      }
    }

    // If V3 path failed, fallback to doing both legs via V2 router (in and out)
    if (!roundTrip) {
      try {
        const fwd = await v2Router.getAmountsOut(size, [V3_IN, V3_OUT]);
        const mid = fwd[fwd.length - 1];
    const back = await v2Router.getAmountsOut(mid, [V3_OUT, V3_IN]);
    roundTrip = back[back.length - 1];
  console.log('Fallback via V2 routers used for size', size.toString());
    method = 'v2_fallback';
      } catch (err) {
        console.warn('Fallback V2 routing failed for size', size.toString(), ':', String(err));
        continue;
      }
    }

    if (roundTrip === null) {
      console.warn('No roundTrip computed for size', size.toString());
      continue;
    }

    // edge in bps
    const edgeBps = Number((roundTrip - size) * 10_000n / size);

    // slippage check (based on roundTrip vs input)
    const slippageBps = Math.abs(Number((roundTrip - size) * 10_000n / size));
    const maxSlippage = Number(process.env.MAX_SLIPPAGE_BPS || 500);
    if (slippageBps > maxSlippage) {
      const skipMsg = `Skipping size ${size.toString()}: slippage ${slippageBps} bps exceeds max ${maxSlippage} bps`;
      console.log(skipMsg);
      try { fs.appendFileSync(csvPath, `${new Date().toISOString()},${size.toString()},,${slippageBps},skipped,slippage_exceeded\n`); } catch (err) {}
      continue;
    }

    // compute adaptive threshold
    const baseThreshold = getActiveEdgeBps();
    const adaptiveThreshold = await adjustForGasAndVolatility(baseThreshold);

    console.log(`size=${size.toString()} edge_bps=${edgeBps} adaptiveThreshold=${adaptiveThreshold} baseThreshold=${baseThreshold}`);

    if (edgeBps > adaptiveThreshold) {
      const now = Math.floor(Date.now() / 1000);
      const ap = [
        true,
        [V3_IN, V3_OUT, V3_FEE, 0n],
        [[V3_OUT, V3_IN], 0n],
        0n,
        BigInt(now + 60)
      ] as const;

  const profitMsg = `Profitable candidate size=${size.toString()} edge_bps=${edgeBps} threshold=${adaptiveThreshold} method=${method}`;
  console.log(profitMsg);
  logLine(profitMsg);
  await sendTelegram(profitMsg);
  consecutiveLosses = 0;
  // emit App Insights custom metric if enabled
  try { if (appInsightsClient) appInsightsClient.trackMetric({ name: 'profitableCandidates', value: 1 }); } catch (e) { /* noop */ }

      if (DRY_RUN) {
        try { fs.appendFileSync(csvPath, `${new Date().toISOString()},${size.toString()},${edgeBps},${slippageBps},${method},DRY_RUN\n`); } catch (err) {}
        continue;
      }

      const signer = nextWallet();
      const exeWithSigner = exe.connect(signer);
      if (process.env.USE_RELAY === 'true') {
        console.log('Relay mode enabled — bundling tx via private relay (scaffold only)');
      }
      const nonce = await provider.getTransactionCount(signer.address, 'pending');
      const populated = await (exeWithSigner as any).populateTransaction.triggerFlashArb(ASSET, size, ap);
      populated.nonce = nonce;
      const gasLimitMultiplier = Number(process.env.ATOMIC_GAS_LIMIT_MULTIPLIER || 1.2);
      const est = await provider.estimateGas({ to: EXECUTOR, data: populated.data });
      populated.gasLimit = BigInt(Math.ceil(Number(est) * gasLimitMultiplier));
      const sent = await signer.sendTransaction(populated as any);
      console.log('arb tx sent:', sent.hash, 'from', signer.address, 'nonce', nonce);
      await sent.wait();
      break;
    } else {
  const note = `Not profitable size=${size.toString()} edge_bps=${edgeBps} threshold=${adaptiveThreshold} method=${method}`;
  console.log(note);
  logLine(note);
  consecutiveLosses += 1;
  // emit metric for consecutive losses
  try { if (appInsightsClient) appInsightsClient.trackMetric({ name: 'consecutiveLosses', value: consecutiveLosses }); } catch (e) {}
  try { fs.appendFileSync(csvPath, `${new Date().toISOString()},${size.toString()},${edgeBps},${slippageBps},${method},NOT_PROFIT\n`); } catch (err) {}
      if (consecutiveLosses >= maxConsecutiveLosses) {
        const stopMsg = `Backoff: ${consecutiveLosses} consecutive non-profitable attempts reached (limit=${maxConsecutiveLosses}). Pausing keeper for ${backoffSeconds}s.`;
        console.error(stopMsg);
        logLine(stopMsg);
        await sendTelegram(stopMsg);
        // wait with exponential-ish backoff (simple) before continuing
        await sleep(backoffSeconds * 1000);
        consecutiveLosses = 0; // reset after backoff
        continue; // resume loop
      }
    }
  }
<<<<<<< HEAD
=======

  // Enhanced Multi-DEX Arbitrage Check (if original loop didn't find opportunities)
  if (consecutiveLosses > 0) {
    logLine(`🔄 Original arbitrage unsuccessful, trying enhanced multi-DEX scan...`);
    try {
      await checkEnhancedArbitrageOpportunities();
    } catch (enhancedError) {
      logLine(`❌ Enhanced arbitrage scan error: ${String(enhancedError)}`);
    }
  }
>>>>>>> fix/ci-oidc-on-origin
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
