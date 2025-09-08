# 🔐 Wallet Configuration Guide

## Wallet Architecture Overview

The Soli Sovereign Flash-Loop system uses a **two-wallet architecture** for maximum security and operational efficiency:

### 1. Gas Fee Wallets (MetaMask) 💰
- **Purpose**: Pay for blockchain transaction fees (gas)
- **Type**: Hot wallets with programmatic access
- **Private Keys**: Required for transaction signing
- **Storage**: Azure Key Vault (production) or environment variables (development)
- **Access Pattern**: High frequency, automated

### 2. Profit Treasury Wallet (Exodus) 🏦  
- **Purpose**: Receive and store arbitrage profits
- **Type**: Cold wallet, receive-only
- **Private Keys**: NOT accessible to the system
- **Storage**: Only the address is stored in configuration
- **Access Pattern**: Manual withdrawal only

## Security Model

### Gas Wallets (MetaMask)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Gas Wallet 1  │────│  Transaction     │────│  Blockchain     │
│   (MetaMask)    │    │  Signing         │    │  Network        │
│   Private Key   │    │  (Automated)     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Azure Key      │
│  Vault          │
│  (Secure        │
│   Storage)      │
└─────────────────┘
```

### Treasury Wallet (Exodus)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Smart Contract │────│  Profit Transfer │────│  Treasury       │
│  (Arbitrage)    │    │  (Automated)     │    │  Wallet         │
│                 │    │                  │    │  (Exodus)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  Manual         │
                                                │  Withdrawal     │
                                                │  (Human Only)   │
                                                └─────────────────┘
```

## Configuration Examples

### .env.example (Development Template)
```bash
# Gas Fee Wallets (MetaMask - Private Keys Required)
GAS_WALLETS=0x1234...abcd,0x5678...efgh,0x9012...ijkl  # Multiple gas wallets
PRIV_KEY=0x1234567890abcdef...                          # Primary gas wallet

# Profit Treasury (Exodus - Address Only)
PROFIT_TREASURY_ADDRESS=0xYourExodusWalletAddress       # NO private key
TREASURY_WALLET_TYPE=exodus                             # Documentation
```

### .env.local (Production Configuration)
```bash
# Gas Fee Wallets (Stored in Azure Key Vault)
GAS_WALLETS=n/a                    # Retrieved from Azure Key Vault
PRIV_KEY=n/a                      # Retrieved from Azure Key Vault

# Profit Treasury (Exodus - Address Only)
PROFIT_TREASURY_ADDRESS=0xYourActualExodusAddress  # Replace with real address
TREASURY_WALLET_TYPE=exodus                        # This is receive-only
```

## Wallet Setup Instructions

### Step 1: Set Up Gas Wallets (MetaMask)

1. **Create MetaMask Wallets**:
   ```bash
   # Create 2-3 MetaMask wallets for gas fee payments
   # Export private keys (keep secure!)
   # Fund with small amounts of ETH/MATIC for gas
   ```

2. **Store in Azure Key Vault**:
   ```bash
   # Use the migration script to securely store keys
   npm run migrate-keys
   ```

3. **Configure Environment**:
   ```bash
   # In production, keys are retrieved from Key Vault
   AZURE_KEY_VAULT_URL="https://your-vault.vault.azure.net/"
   GAS_WALLETS_SECRET_NAME="gas-wallet-keys"
   ```

### Step 2: Set Up Treasury Wallet (Exodus)

1. **Create Exodus Wallet**:
   - Download and install Exodus wallet
   - Create a new wallet with strong seed phrase
   - **NEVER export the private key**
   - Copy the receiving address only

2. **Configure Treasury Address**:
   ```bash
   # Only the address - NO private key needed
   PROFIT_TREASURY_ADDRESS=0xYourExodusWalletAddressHere
   ```

3. **Verify Security**:
   - Ensure no private key is stored anywhere in the system
   - Test receiving a small amount to verify the address
   - Keep seed phrase offline and secure

## Security Best Practices

### Gas Wallets ⚡
- **✅ Use multiple gas wallets** for load distribution
- **✅ Store private keys in Azure Key Vault** for production
- **✅ Use minimal funding** - only enough for gas fees
- **✅ Monitor gas wallet balances** and refill as needed
- **❌ Never store large amounts** in gas wallets

### Treasury Wallet 🏦
- **✅ Use a cold wallet** (Exodus) for profit storage
- **✅ Keep private keys offline** and never in the system
- **✅ Use a hardware wallet** for maximum security (optional)
- **✅ Test with small amounts** before going live
- **❌ Never give the system** access to treasury private keys

### Operational Security 🛡️
- **✅ Regular audits** of wallet balances and transactions
- **✅ Monitor for unusual** gas wallet activity
- **✅ Separate development** and production wallets
- **✅ Use different treasury** addresses for different networks
- **❌ Never mix** personal and business wallets

## Profit Flow Architecture

```
┌─────────────────┐
│  Arbitrage      │
│  Opportunity    │
│  Detected       │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐    Gas Fees     ┌─────────────────┐
│  Gas Wallet     │◄────────────────│  Transaction    │
│  (MetaMask)     │                 │  Execution      │
│  Pays Fees      │                 │                 │
└─────────────────┘                 └─────────┬───────┘
                                              │
                                              ▼ Profits
                                    ┌─────────────────┐
                                    │  Treasury       │
                                    │  Wallet         │
                                    │  (Exodus)       │
                                    │  Receives All   │
                                    │  Profits        │
                                    └─────────────────┘
```

## Environment Variable Reference

### Required Gas Wallet Variables
```bash
# Development (Private keys in environment)
GAS_WALLETS=pk1,pk2,pk3           # Comma-separated private keys
PRIV_KEY=primary_private_key      # Primary gas wallet

# Production (Private keys in Azure Key Vault)
AZURE_KEY_VAULT_URL=              # Key Vault URL
GAS_WALLETS_SECRET_NAME=          # Secret name for gas wallet keys
PRIVATE_KEY_SECRET_NAME=          # Secret name for primary key
```

### Required Treasury Wallet Variables
```bash
# Treasury Configuration (Same for dev and production)
PROFIT_TREASURY_ADDRESS=          # Exodus wallet address (NO private key)
TREASURY_WALLET_TYPE=exodus       # Documentation field
```

### Optional Security Variables
```bash
# Advanced Configuration
TREASURY_NETWORK_ARBITRUM=        # Different treasury per network
TREASURY_NETWORK_POLYGON=         # Network-specific treasury addresses
GAS_WALLET_ROTATION_ENABLED=true  # Rotate gas wallets automatically
MIN_GAS_BALANCE=0.01              # Minimum gas balance threshold
```

## Troubleshooting

### Common Issues

1. **Gas Wallet Out of Funds**:
   ```bash
   # Monitor gas wallet balances
   # Set up automatic alerts when balance is low
   # Use multiple gas wallets for redundancy
   ```

2. **Treasury Address Invalid**:
   ```bash
   # Verify address format (0x followed by 40 hex characters)
   # Test with small amount first
   # Ensure address is for the correct network
   ```

3. **Azure Key Vault Access**:
   ```bash
   # Verify Key Vault permissions
   # Check Azure authentication credentials
   # Ensure network connectivity to Azure
   ```

## Final Security Checklist

### Before Deployment ✅
- [ ] Gas wallets created and funded with minimal amounts
- [ ] Private keys stored securely in Azure Key Vault
- [ ] Treasury wallet (Exodus) created with secure seed phrase
- [ ] Treasury private key **NEVER** stored in any config file
- [ ] Test transactions completed successfully
- [ ] All wallet addresses verified and documented
- [ ] Emergency procedures documented
- [ ] Team trained on wallet management procedures

### Ongoing Monitoring 📊
- [ ] Gas wallet balance alerts configured
- [ ] Treasury wallet transaction monitoring
- [ ] Regular security audits scheduled
- [ ] Backup procedures tested
- [ ] Access controls reviewed quarterly

## Emergency Procedures 🚨

### If Gas Wallet Compromised
1. Immediately pause the arbitrage system
2. Transfer remaining funds to new gas wallets
3. Update Azure Key Vault with new private keys
4. Review transaction history for unauthorized activity
5. Implement additional security measures

### If Treasury Address Error
1. Verify correct address configuration
2. Test with small amount before resuming operations
3. Update documentation with correct address
4. Notify team of address change

Remember: **The treasury wallet should NEVER have programmatic access**. It's designed to be a secure, manual-withdrawal-only destination for profits. This separation ensures that even if the arbitrage system is compromised, your profits remain safe in the Exodus wallet.
