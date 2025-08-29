# Soli Sovereign Flash‑Loop Arbitrage Kit (Arbitrum + Polygon)

This is a clean, file‑separated project with contracts, a Foundry deploy script, a TS keeper, and a sim helper.

## Prereqs
- Node 18+ (or 20+), pnpm or npm
- Foundry (`curl -L https://foundry.paradigm.xyz | bash` then `foundryup`)

## Install
```bash
pnpm i    # or: npm i
forge install foundry-rs/forge-std
```

## Configure
Copy `.env.example` → `.env` and fill:
- RPCs, keys, `TREASURY` (your Exodus address on each chain)
- Token/router addresses, QuoterV2, etc.

## Deploy (Arbitrum or Polygon)
```bash
export RPC_ARBITRUM=...
export RPC_POLYGON=...
export TREASURY=0xYourExodusChainAddress
export CHAIN=arbitrum  # or polygon
forge script script/DeployFlashLoop.s.sol:DeployFlashLoop \
  --rpc-url $RPC_ARBITRUM \
  --private-key $PRIVATE_KEY \
  --broadcast -vvvv
```

Alternatively use Remix to deploy `contracts/FlashLoopExecutor.sol` with constructor:
`(AAVE_POOL, UNI_V3_ROUTER, V2_ROUTER, TREASURY)`

## Keeper (live probing + execution)
```bash
# in .env fill: RPC, PRIV_KEY, EXECUTOR, ASSET, DECIMALS, V3_IN, V3_OUT, QUOTER, V2_ROUTER
pnpm keeper
```

The keeper probes candidate sizes via Uni v3 QuoterV2 + v2 `getAmountsOut` and calls
`triggerFlashArb` only when edge > `MIN_EDGE_BPS`. It sets tight deadlines and zero
minOut by default — set your own `minOut` safety margins when you wire a fixed pair.

## Notes
- Start tiny; confirm decimals, pair liquidity, and that addresses are correct.
- `profitSplitBps` defaults to **40%** to the treasury (Exodus) and **60%** retained.
- Polygon's gas token is **POL** (formerly MATIC). Fund with POL for Polygon and ETH for Arbitrum.
- For MEV hygiene on L2s, prefer private-tx RPCs from your provider; Flashbots Protect is L1‑focused.

-- CI note: the workflow includes a pre-deploy simulator smoke gate that runs `.github/actions/smoke/run-sim.sh` and fails the job if the simulator's "Avg successes/day" is below the `SIM_MIN_SUCCESS` threshold (default 1).

## Tests

A placeholder fork test is included; extend it with real pairs and invariants before production.
