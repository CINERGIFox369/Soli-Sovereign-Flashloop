# Enhanced Keeper Configuration

## Network-Specific Multi-DEX Configuration

### Arbitrum Network DEXs

#### SushiSwap (Arbitrum)
```bash
ENABLE_SUSHISWAP=true
SUSHI_ROUTER_ARBITRUM=0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506
SUSHISWAP_PRIORITY=3
MIN_LIQUIDITY_SUSHISWAP=50000
```

#### Camelot DEX (Arbitrum Native)
```bash
ENABLE_CAMELOT=true
CAMELOT_ROUTER_ARBITRUM=0xc873fEcbd354f5A56E00E710B90EF4201db2448d
CAMELOT_FEES=100,500,3000,10000
CAMELOT_PRIORITY=4
MIN_LIQUIDITY_CAMELOT=10000
```

#### Balancer V2 (Arbitrum)
```bash
ENABLE_BALANCER=true
BALANCER_VAULT_ARBITRUM=0xBA12222222228d8Ba445958a75a0704d566BF2C8
BALANCER_PRIORITY=5
DEX_SPECIFIC_SLIPPAGE_BALANCER=75
```

#### Curve Finance (Arbitrum)
```bash
ENABLE_CURVE=true
CURVE_ROUTER_ARBITRUM=0x7544Fe3d184b6B55D6B36c3FCA1157eE0Ba30287
CURVE_PRIORITY=6
MIN_LIQUIDITY_CURVE=50000
DEX_SPECIFIC_SLIPPAGE_CURVE=50
```

### Polygon Network DEXs

#### QuickSwap (Polygon Native)
```bash
ENABLE_QUICKSWAP=true
QUICKSWAP_ROUTER_POLYGON=0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff
QUICKSWAP_PRIORITY=3
MIN_LIQUIDITY_QUICKSWAP=25000
```

#### SushiSwap (Polygon)
```bash
ENABLE_SUSHISWAP=true
SUSHI_ROUTER_POLYGON=0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506
SUSHISWAP_PRIORITY=3
```

#### Balancer V2 (Polygon)
```bash
ENABLE_BALANCER=true
BALANCER_VAULT_POLYGON=0xBA12222222228d8Ba445958a75a0704d566BF2C8
BALANCER_PRIORITY=5
```

#### Curve Finance (Polygon)
```bash
ENABLE_CURVE=true
CURVE_ROUTER_POLYGON=0x094d12e5b541784701FD8d65F11fc0598FBC6332
CURVE_PRIORITY=6
```

#### DODO (Polygon)
```bash
ENABLE_DODO=true
DODO_PROXY_POLYGON=0xa222e6a71D1A1Dd5F279805fbe38d5329C1d0e70
DODO_PRIORITY=7
```

## Network-Specific Token Addresses

### Arbitrum Tokens
```bash
USDC_ARBITRUM=0xA0b86a33E6441b8bBDBB9F6a8fb3eAAF7A03E8a0
USDT_ARBITRUM=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
WETH_ARBITRUM=0x82aF49447D8a07e3bd95BD0d56f35241523fBab1
ARB_ARBITRUM=0x912CE59144191C1204E64559FE8253a0e49E6548
```

### Polygon Tokens
```bash
USDC_POLYGON=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
USDT_POLYGON=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
WETH_POLYGON=0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619
WMATIC_POLYGON=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270
```

## Market Condition Monitoring

### Gas Price Management
```bash
GAS_PRICE_THRESHOLD_GWEI=50          # Threshold for high gas conditions
MAX_GAS_GWEI=200                     # Maximum gas price to operate
HIGH_GAS_MULTIPLIER=1.5              # Threshold multiplier during high gas
ESTIMATED_GAS_COST_USD=20            # Base gas cost estimate
ETH_PRICE_USD=2500                   # ETH price for gas calculations
```

### Volatility and Competition
```bash
VOLATILITY_MULTIPLIER=1.0            # Base volatility adjustment
MAX_VOLATILITY=0.5                   # Maximum volatility before halt
MAX_CONSECUTIVE_FAILURES=5           # Circuit breaker failure limit
FAILURE_COOLDOWN_MS=300000           # 5 minute cooldown after failures
```

### MEV Protection
```bash
USE_FLASHBOTS=true                   # Enable Flashbots bundle submission
FLASHBOTS_ENDPOINT=https://relay.flashbots.net
FLASHBOTS_SIGNATURE_KEY=0x...        # Flashbots signing key

USE_PRIVATE_POOL=true                # Enable private mempool
PRIVATE_POOL_ENDPOINT=wss://...      # Private pool WebSocket endpoint

USE_BUNDLE_MODE=false                # Bundle multiple transactions
```

## Circuit Breaker Configuration

### Loss Limits
```bash
MAX_DAILY_LOSS_USD=1000              # Maximum daily loss before halt
MONITORING_INTERVAL_MS=300000        # Market condition update interval
```

### Adaptive Thresholds
```bash
ACTIVE_THRESHOLD_MODE=balanced       # conservative/balanced/aggressive/whale
CONSERVATIVE_MIN_EDGE_BPS=25         # Conservative mode threshold
BALANCED_MIN_EDGE_BPS=75             # Balanced mode threshold  
AGGRESSIVE_MIN_EDGE_BPS=250          # Aggressive mode threshold
WHALE_MIN_EDGE_BPS=500               # Whale mode threshold
```

## Enhanced Execution

### Multi-Wallet Support
```bash
GAS_WALLETS=0xkey1,0xkey2,0xkey3     # Comma-separated private keys
```

### Trade Size Optimization
```bash
SIZES=5000,10000,20000,40000,80000   # USDC amounts to test
ATOMIC_GAS_LIMIT_MULTIPLIER=1.2      # Gas limit safety multiplier
```

### Monitoring and Alerts
```bash
TELEGRAM_BOT_TOKEN=...               # Telegram bot for alerts
TELEGRAM_CHAT_ID=...                 # Telegram chat ID

# Application Insights (Azure)
APPLICATIONINSIGHTS_CONNECTION_STRING=...
```

## DEX Priority and Fees

### Uniswap V3
```bash
ENABLE_UNISWAP_V3=true               # Default enabled
QUOTER=0xb27308f9F90D607463bb33eA04F2f
V3_FEE=3000                          # Primary fee tier
```

### Uniswap V2  
```bash
ENABLE_UNISWAP_V2=true               # Default enabled
V2_ROUTER=0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
```

## Real-World Deployment

### Network-Specific Settings

#### Ethereum Mainnet
```bash
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/...
ESTIMATED_GAS_COST_USD=50            # Higher gas costs
BALANCED_MIN_EDGE_BPS=150            # Higher threshold needed
```

#### Arbitrum
```bash  
RPC_URL=https://arb-mainnet.g.alchemy.com/v2/...
ESTIMATED_GAS_COST_USD=0.5           # Very low gas costs
BALANCED_MIN_EDGE_BPS=25             # Lower threshold viable
```

#### Polygon
```bash
RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/...
ESTIMATED_GAS_COST_USD=5             # Moderate gas costs  
BALANCED_MIN_EDGE_BPS=50             # Moderate threshold
```

## Safety Features

### Emergency Controls
```bash
DRY_RUN=false                        # Set to true for testing
USE_RELAY=false                      # Enable relay mode (dev only)
CONTRACT_SUPPORT_REQUIRED=true       # Validate contract features
```

### Backoff and Recovery
```bash
MAX_CONSECUTIVE_LOSSES=3             # Consecutive loss limit
CONSOLIDATION_BACKOFF_SECONDS=300    # Backoff time after losses
```

## Example Production Configuration

```bash
# Network
RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
EXECUTOR=0xYourFlashLoopExecutorAddress

# Multi-DEX
ENABLE_UNISWAP_V3=true
ENABLE_UNISWAP_V2=true  
ENABLE_PANCAKESWAP=true
ENABLE_SUSHISWAP=true

# Adaptive Strategy
ACTIVE_THRESHOLD_MODE=balanced
BALANCED_MIN_EDGE_BPS=75
GAS_PRICE_THRESHOLD_GWEI=50
MAX_DAILY_LOSS_USD=1000

# MEV Protection
USE_FLASHBOTS=true
USE_PRIVATE_POOL=true

# Monitoring
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
APPLICATIONINSIGHTS_CONNECTION_STRING=your_azure_connection

# Wallets
GAS_WALLETS=0xkey1,0xkey2,0xkey3

# Safety
DRY_RUN=false
MONITORING_INTERVAL_MS=300000
MAX_CONSECUTIVE_FAILURES=5
```

## Performance Tuning

### For High-Frequency Trading
- Reduce `MONITORING_INTERVAL_MS` to 60000 (1 minute)
- Use multiple `GAS_WALLETS` for parallel execution  
- Enable `USE_PRIVATE_POOL=true` for better execution
- Set lower thresholds on low-gas networks

### For Conservative Operation
- Set `ACTIVE_THRESHOLD_MODE=conservative`
- Increase `MAX_CONSECUTIVE_FAILURES=10`
- Set higher `BALANCED_MIN_EDGE_BPS=150`
- Enable circuit breakers with lower `MAX_DAILY_LOSS_USD=500`

### For Multi-Chain Deployment
- Deploy separate keeper instances per chain
- Adjust thresholds based on gas costs per network
- Use chain-specific RPC endpoints with failover
- Monitor cross-chain arbitrage opportunities
