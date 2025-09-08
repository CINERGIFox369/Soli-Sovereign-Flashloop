# 🧪 Soli Sovereign Flash-Loop - Manual Dry Run Deployment Script
# This script deploys the arbitrage bot in DRY_RUN mode for safe testing

Write-Host "🚀 Starting Soli Sovereign Flash-Loop Dry Run Deployment..." -ForegroundColor Cyan

# Configuration
$RESOURCE_GROUP = "main"
$ACR_NAME = "solisovereignacr"
$CONTAINER_APP_NAME = "soli-keeper-dry"
$ENVIRONMENT_NAME = "soli-env"
$KEY_VAULT_NAME = "soli-mainnet-kv"
$LOG_ANALYTICS_WORKSPACE = "soli-law"
$IMAGE_TAG = Get-Date -Format "yyyyMMddHHmmss"
$IMAGE_NAME = "$ACR_NAME.azurecr.io/soli-keeper:$IMAGE_TAG"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Resource Group: $RESOURCE_GROUP"
Write-Host "  Container App: $CONTAINER_APP_NAME"
Write-Host "  Image: $IMAGE_NAME"
Write-Host "  Mode: DRY_RUN=true (NO REAL TRADES)"

# Step 1: Build and push Docker image
Write-Host "`n🏗️  Building Docker image..." -ForegroundColor Green
docker build -t $IMAGE_NAME .

Write-Host "🔑 Logging into Azure Container Registry..." -ForegroundColor Green
az acr login --name $ACR_NAME

Write-Host "📤 Pushing image to registry..." -ForegroundColor Green
docker push $IMAGE_NAME

# Step 2: Create Container Apps environment if it doesn't exist
Write-Host "`n🌊 Setting up Container Apps environment..." -ForegroundColor Green
$envExists = az containerapp env show --name $ENVIRONMENT_NAME --resource-group $RESOURCE_GROUP 2>$null
if (-not $envExists) {
    Write-Host "Creating Container Apps environment..."
    $lawId = az monitor log-analytics workspace show --name $LOG_ANALYTICS_WORKSPACE --resource-group $RESOURCE_GROUP --query "id" -o tsv
    az containerapp env create `
        --name $ENVIRONMENT_NAME `
        --resource-group $RESOURCE_GROUP `
        --location eastus `
        --logs-workspace-id $lawId
    Write-Host "✅ Container Apps environment created"
} else {
    Write-Host "✅ Container Apps environment already exists"
}

# Step 3: Deploy container app in DRY RUN mode
Write-Host "`n🚀 Deploying container app in DRY RUN mode..." -ForegroundColor Green
$appExists = az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP 2>$null
if ($appExists) {
    Write-Host "Updating existing container app..."
    az containerapp update `
        --name $CONTAINER_APP_NAME `
        --resource-group $RESOURCE_GROUP `
        --image $IMAGE_NAME
} else {
    Write-Host "Creating new container app..."
    az containerapp create `
        --name $CONTAINER_APP_NAME `
        --resource-group $RESOURCE_GROUP `
        --environment $ENVIRONMENT_NAME `
        --image $IMAGE_NAME `
        --registry-server "$ACR_NAME.azurecr.io" `
        --cpu 1.0 `
        --memory 2.0Gi `
        --min-replicas 1 `
        --max-replicas 3 `
        --env-vars `
            "DRY_RUN=true" `
            "AZURE_KEY_VAULT_URL=https://$KEY_VAULT_NAME.vault.azure.net/" `
            "NETWORK_ID=42161" `
            "RPC_URL=https://arb1.arbitrum.io/rpc" `
            "MIN_EDGE_BPS=150" `
            "MAX_DAILY_LOSS=100" `
            "AAVE_LOAN_FRACTION=0.01" `
            "CONFIRM_REAL=false"
}

# Step 4: Configure managed identity and Key Vault permissions
Write-Host "`n🔐 Configuring managed identity and Key Vault access..." -ForegroundColor Green

# Enable system-assigned managed identity
az containerapp identity assign `
    --name $CONTAINER_APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --system-assigned

# Get the managed identity principal ID
$principalId = az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query "identity.principalId" -o tsv

if ($principalId -and $principalId -ne "null") {
    Write-Host "Assigning Key Vault permissions to managed identity..."
    az keyvault set-policy `
        --name $KEY_VAULT_NAME `
        --object-id $principalId `
        --secret-permissions get list
    Write-Host "✅ Key Vault permissions configured"
} else {
    Write-Host "❌ Failed to get managed identity principal ID"
}

# Step 5: Display deployment summary
Write-Host "`n🎉 Dry Run Deployment Complete!" -ForegroundColor Cyan
Write-Host "📊 Container App: $CONTAINER_APP_NAME" -ForegroundColor White
Write-Host "🔒 Mode: DRY_RUN=true (NO REAL TRADES)" -ForegroundColor Red
Write-Host "🌍 Network: Arbitrum (Chain ID: 42161)" -ForegroundColor White
Write-Host "🔑 Key Vault: $KEY_VAULT_NAME.vault.azure.net" -ForegroundColor White
Write-Host "🖼️ Image: $IMAGE_NAME" -ForegroundColor White

Write-Host "`n🔍 Monitor the deployment:" -ForegroundColor Yellow
Write-Host "az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --follow" -ForegroundColor Gray

Write-Host "`n⚠️  IMPORTANT: This is a DRY RUN - no real transactions will be executed!" -ForegroundColor Red
Write-Host "Monitor the logs to see the arbitrage detection and analysis without any financial risk." -ForegroundColor Yellow
