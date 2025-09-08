import { keyVaultManager } from '../src/azure-keyvault.js';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Key Vault Migration Script
 * 
 * SECURITY WARNING: This script helps migrate the exposed private key
 * to Azure Key Vault. Run this ONCE and then delete this file.
 * 
 * Usage:
 * 1. Set up Azure Key Vault first (see AZURE_KEYVAULT_SETUP.md)
 * 2. Configure AZURE_KEY_VAULT_URL and credentials in .env.local
 * 3. Run: npm run migrate-keys
 * 4. Verify keys are stored correctly
 * 5. DELETE this script file for security
 */

async function migrateKeysToKeyVault() {
  console.log('🔐 Starting Key Vault Migration...');
  
  try {
    // Test connection first
    const connected = await keyVaultManager.testConnection();
    if (!connected) {
      throw new Error('Azure Key Vault connection failed');
    }
    
    console.log('✅ Azure Key Vault connection successful');
    
    // SECURITY NOTE: Replace this with a NEW private key!
    // The exposed key should be regenerated for security
    const exposedKey = 'aa17b66610ffd9cfce2aa21e94a0c4bd6c064540958cf445db34b8f95cd58e27';
    
    // Generate a NEW private key for enhanced security
    const newWallet = ethers.Wallet.createRandom();
    const newPrivateKey = newWallet.privateKey;
    
    console.log('🔑 Generated new private key for enhanced security');
    console.log('📍 New wallet address:', newWallet.address);
    console.log('⚠️ IMPORTANT: Transfer funds from old address to new address:');
    console.log('   Old address: (derive from exposed key)');
    console.log('   New address:', newWallet.address);
    
    // Store the NEW private key in Key Vault
    await keyVaultManager.setSecret('arbitrage-private-key', newPrivateKey);
    console.log('✅ New private key stored in Azure Key Vault');
    
    // Example: Store multiple gas wallet keys
    const gasWallet1 = ethers.Wallet.createRandom();
    const gasWallet2 = ethers.Wallet.createRandom();
    const gasWallet3 = ethers.Wallet.createRandom();
    
    const gasWalletKeys = [
      gasWallet1.privateKey,
      gasWallet2.privateKey, 
      gasWallet3.privateKey
    ].join(',');
    
    await keyVaultManager.setSecret('gas-wallet-keys', gasWalletKeys);
    console.log('✅ Gas wallet keys stored in Azure Key Vault');
    console.log('📍 Gas wallet addresses:');
    console.log('   Wallet 1:', gasWallet1.address);
    console.log('   Wallet 2:', gasWallet2.address);
    console.log('   Wallet 3:', gasWallet3.address);
    
    // Generate Flashbots signing key
    const flashbotsWallet = ethers.Wallet.createRandom();
    await keyVaultManager.setSecret('flashbots-signing-key', flashbotsWallet.privateKey);
    console.log('✅ Flashbots signing key stored in Azure Key Vault');
    console.log('📍 Flashbots signer address:', flashbotsWallet.address);
    
    console.log('');
    console.log('🎉 Migration Complete!');
    console.log('');
    console.log('⚠️ CRITICAL NEXT STEPS:');
    console.log('1. Transfer funds from exposed address to new addresses');
    console.log('2. Update any external services with new addresses');
    console.log('3. Test the keeper with Key Vault integration');
    console.log('4. DELETE this migration script for security');
    console.log('5. Consider the exposed key compromised - never use again');
    console.log('');
    console.log('🔑 New Configuration Summary:');
    console.log('   Primary Wallet:', newWallet.address);
    console.log('   Gas Wallets: 3 wallets generated');
    console.log('   Flashbots Signer:', flashbotsWallet.address);
    console.log('   Storage: Azure Key Vault (secure)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Ensure Azure Key Vault is created and configured');
    console.log('2. Check AZURE_KEY_VAULT_URL in .env.local');
    console.log('3. Verify Azure credentials (CLIENT_ID, CLIENT_SECRET, TENANT_ID)');
    console.log('4. Ensure Key Vault permissions are set correctly');
    process.exit(1);
  }
}

// Run migration
migrateKeysToKeyVault().catch(console.error);
