import { ethers } from "ethers";
import fs from 'fs';
import path from 'path';
import * as dotenv from "dotenv";
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

  // Adaptive threshold helper
  function getActiveEdgeBps(): number {
    const mode = (process.env.ACTIVE_THRESHOLD_MODE || 'balanced').toLowerCase();
    switch (mode) {
      case 'conservative': return Number(process.env.CONSERVATIVE_MIN_EDGE_BPS || 25);
      case 'aggressive': return Number(process.env.AGGRESSIVE_MIN_EDGE_BPS || 250);
      case 'whale': return Number(process.env.WHALE_MIN_EDGE_BPS || 500);
      default: return Number(process.env.BALANCED_MIN_EDGE_BPS || 75);
    }
  }

  async function adjustForGasAndVolatility(baseBps: number): Promise<number> {
    try {
      const feeData = await provider.getFeeData();
      const gasGwei = Number(ethers.formatUnits(feeData.maxFeePerGas || feeData.gasPrice || 0n, 'gwei'));
      const gasThreshold = Number(process.env.GAS_PRICE_THRESHOLD_GWEI || 50);
      let adjusted = baseBps;
      if (gasGwei > gasThreshold) adjusted = Math.ceil(adjusted * Number(process.env.HIGH_GAS_MULTIPLIER || 1.5));
      // Simple volatility proxy: if TARGET_DAILY_RETURN_RATE is high, be more conservative
      const vol = Number(process.env.VOLATILITY_MULTIPLIER || 1.0);
      adjusted = Math.ceil(adjusted * vol);
      return adjusted;
    } catch (e) {
      return baseBps;
    }
  }

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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
