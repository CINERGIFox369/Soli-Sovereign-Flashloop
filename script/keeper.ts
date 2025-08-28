import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

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
  "function quoteExactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,uint256 amountIn,uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)"
];

const v2Abi = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

function parseUnits(amount: string, decimals: number) {
  return ethers.parseUnits(amount, decimals);
}

async function main() {
  const RPC = process.env.RPC!;
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(process.env.PRIV_KEY!, provider);

  const EXECUTOR = process.env.EXECUTOR!;
  const exe = new ethers.Contract(EXECUTOR, exeAbi, wallet);

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

  // Candidate sizes (in ASSET units, string for readability)
  const candidateStrings = (process.env.SIZES || "5000,10000,20000,40000,80000").split(",");
  const sizes = candidateStrings.map(s => parseUnits(s.trim(), DECIMALS));

  for (const size of sizes) {
    // v3 leg: tokenIn -> tokenOut
    const params = { tokenIn: V3_IN, tokenOut: V3_OUT, fee: V3_FEE, amountIn: size, sqrtPriceLimitX96: 0 };
    const v3Out: bigint = await quoter.quoteExactInputSingle(params);

    // v2 leg: tokenOut -> tokenIn
    const amounts: bigint[] = await v2Router.getAmountsOut(v3Out, [V3_OUT, V3_IN]);
    const roundTrip = amounts[amounts.length - 1];

    // edge in bps
    const edgeBps = Number((roundTrip - size) * 10_000n / size);

    console.log(`size=${size.toString()} edge_bps=${edgeBps}`);

    if (edgeBps > MIN_EDGE_BPS) {
      const now = Math.floor(Date.now() / 1000);
      // Build ArbParams tuple expected by the contract
      const ap = [
        true,                                 // v3First
        [V3_IN, V3_OUT, V3_FEE, 0n],          // v3 leg
        [[V3_OUT, V3_IN], 0n],                // v2 leg
        0n,                                   // minProfit (optional buffer)
        BigInt(now + 60)                      // deadline
      ] as const;

      const tx = await exe.triggerFlashArb(ASSET, size, ap);
      console.log("arb tx:", tx.hash);
      await tx.wait();
      break;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
