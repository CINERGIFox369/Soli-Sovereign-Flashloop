import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential, ClientSecretCredential } from "@azure/identity";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Azure Key Vault Secret Manager
 * Securely retrieves private keys and sensitive data from Azure Key Vault
 * 
 * Setup Instructions:
 * 1. Create Azure Key Vault
 * 2. Create App Registration with Key Vault access
 * 3. Store secrets in Key Vault
 * 4. Configure environment variables for authentication
 */

export class AzureKeyVaultManager {
  private client!: SecretClient;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
      if (!vaultUrl) {
        throw new Error('AZURE_KEY_VAULT_URL environment variable is required');
      }

      // Try different authentication methods
      let credential;
      
      if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID) {
        // Service Principal authentication (recommended for production)
        credential = new ClientSecretCredential(
          process.env.AZURE_TENANT_ID,
          process.env.AZURE_CLIENT_ID,
          process.env.AZURE_CLIENT_SECRET
        );
        console.log('🔐 Using Service Principal authentication for Azure Key Vault');
      } else {
        // Default Azure credential (works with Azure CLI, Managed Identity, etc.)
        credential = new DefaultAzureCredential();
        console.log('🔐 Using Default Azure credential for Key Vault');
      }

      this.client = new SecretClient(vaultUrl, credential);
      this.isInitialized = true;
      console.log('✅ Azure Key Vault client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Azure Key Vault client:', error);
      throw error;
    }
  }

  /**
   * Retrieve a secret from Azure Key Vault
   */
  async getSecret(secretName: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Azure Key Vault client not initialized');
    }

    try {
      console.log(`🔍 Retrieving secret: ${secretName}`);
      const secret = await this.client.getSecret(secretName);
      
      if (!secret.value) {
        throw new Error(`Secret ${secretName} has no value`);
      }

      console.log(`✅ Successfully retrieved secret: ${secretName}`);
      return secret.value;
    } catch (error) {
      console.error(`❌ Failed to retrieve secret ${secretName}:`, error);
      throw error;
    }
  }

  /**
   * Get private key from Key Vault
   */
  async getPrivateKey(): Promise<string> {
    const secretName = process.env.PRIVATE_KEY_SECRET_NAME || 'arbitrage-private-key';
    return await this.getSecret(secretName);
  }

  /**
   * Get gas wallet private keys from Key Vault
   */
  async getGasWallets(): Promise<string[]> {
    const secretName = process.env.GAS_WALLETS_SECRET_NAME || 'gas-wallet-keys';
    const gasWalletsString = await this.getSecret(secretName);
    return gasWalletsString.split(',').map(key => key.trim()).filter(Boolean);
  }

  /**
   * Get Flashbots signing key from Key Vault
   */
  async getFlashbotsKey(): Promise<string> {
    const secretName = process.env.FLASHBOTS_KEY_SECRET_NAME || 'flashbots-signing-key';
    return await this.getSecret(secretName);
  }

  /**
   * Store a secret in Azure Key Vault (for setup)
   */
  async setSecret(secretName: string, secretValue: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Azure Key Vault client not initialized');
    }

    try {
      console.log(`💾 Storing secret: ${secretName}`);
      await this.client.setSecret(secretName, secretValue);
      console.log(`✅ Successfully stored secret: ${secretName}`);
    } catch (error) {
      console.error(`❌ Failed to store secret ${secretName}:`, error);
      throw error;
    }
  }

  /**
   * Test connection to Azure Key Vault
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to list secrets (just to test connectivity)
      const secretsIterator = this.client.listPropertiesOfSecrets();
      await secretsIterator.next();
      console.log('✅ Azure Key Vault connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Azure Key Vault connection test failed:', error);
      return false;
    }
  }
}

/**
 * Secure Wallet Factory
 * Creates ethers wallets using keys from Azure Key Vault
 */
export class SecureWalletFactory {
  private keyVaultManager: AzureKeyVaultManager;

  constructor() {
    this.keyVaultManager = new AzureKeyVaultManager();
  }

  /**
   * Create primary wallet from Key Vault
   */
  async createPrimaryWallet(provider: any): Promise<any> {
    const privateKey = await this.keyVaultManager.getPrivateKey();
    const { ethers } = await import('ethers');
    return new ethers.Wallet(privateKey, provider);
  }

  /**
   * Create gas wallets from Key Vault
   */
  async createGasWallets(provider: any): Promise<any[]> {
    const gasWalletKeys = await this.keyVaultManager.getGasWallets();
    const { ethers } = await import('ethers');
    
    return gasWalletKeys.map(key => new ethers.Wallet(key, provider));
  }

  /**
   * Test Key Vault connectivity
   */
  async testConnection(): Promise<boolean> {
    return await this.keyVaultManager.testConnection();
  }
}

// Export singleton instance
export const keyVaultManager = new AzureKeyVaultManager();
export const secureWalletFactory = new SecureWalletFactory();
