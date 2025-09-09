# Deploy existing container image in DRY_RUN mode
# Using Azure REST API since container app CLI extension has permission issues

Write-Host "🚀 Deploying Soli Sovereign Flash-Loop in DRY_RUN mode..." -ForegroundColor Cyan

$RESOURCE_GROUP = "main"
$SUBSCRIPTION_ID = "0e7ba183-6fbe-43d9-9b45-0f708bd65a56"
$CONTAINER_APP_NAME = "soli-keeper-dry"
$ENVIRONMENT_NAME = "soli-env"
$KEY_VAULT_NAME = "soli-mainnet-kv"
$LOG_ANALYTICS_WORKSPACE = "soli-law"
$EXISTING_IMAGE = "solisovereignacr.azurecr.io/soli-keeper:20250904202453"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Resource Group: $RESOURCE_GROUP"
Write-Host "  Container App: $CONTAINER_APP_NAME"
Write-Host "  Existing Image: $EXISTING_IMAGE"
Write-Host "  Mode: DRY_RUN=true (NO REAL TRADES)"

# Step 1: Create Container Apps environment using ARM template
Write-Host "`n🌊 Creating Container Apps environment..." -ForegroundColor Green

# Get Log Analytics workspace resource ID
$lawResourceId = az monitor log-analytics workspace show --name $LOG_ANALYTICS_WORKSPACE --resource-group $RESOURCE_GROUP --query "id" -o tsv

# Create environment ARM template
$envTemplate = @{
    '$schema' = "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#"
    contentVersion = "1.0.0.0"
    parameters = @{}
    resources = @(
        @{
            type = "Microsoft.App/managedEnvironments"
            apiVersion = "2023-05-01"
            name = $ENVIRONMENT_NAME
            location = "eastus"
            properties = @{
                appLogsConfiguration = @{
                    destination = "log-analytics"
                    logAnalyticsConfiguration = @{
                        customerId = $lawResourceId
                    }
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10

# Deploy environment
Write-Host "Deploying Container Apps environment..."
$envTemplate | Out-File -FilePath "environment-template.json" -Encoding UTF8
az deployment group create --resource-group $RESOURCE_GROUP --template-file "environment-template.json" --name "deploy-container-env"

# Step 2: Create Container App using ARM template
Write-Host "`n🚀 Creating Container App in DRY_RUN mode..." -ForegroundColor Green

$appTemplate = @{
    '$schema' = "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#"
    contentVersion = "1.0.0.0"
    parameters = @{}
    resources = @(
        @{
            type = "Microsoft.App/containerApps"
            apiVersion = "2023-05-01"
            name = $CONTAINER_APP_NAME
            location = "eastus"
            identity = @{
                type = "SystemAssigned"
            }
            properties = @{
                managedEnvironmentId = "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/managedEnvironments/$ENVIRONMENT_NAME"
                configuration = @{
                    ingress = @{
                        external = $false
                        targetPort = 3000
                    }
                    registries = @(
                        @{
                            server = "solisovereignacr.azurecr.io"
                            identity = "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ManagedIdentity/userAssignedIdentities/default"
                        }
                    )
                }
                template = @{
                    containers = @(
                        @{
                            name = "soli-keeper"
                            image = $EXISTING_IMAGE
                            resources = @{
                                cpu = 1.0
                                memory = "2.0Gi"
                            }
                            env = @(
                                @{ name = "DRY_RUN"; value = "true" }
                                @{ name = "AZURE_KEY_VAULT_URL"; value = "https://$KEY_VAULT_NAME.vault.azure.net/" }
                                @{ name = "NETWORK_ID"; value = "42161" }
                                @{ name = "RPC_URL"; value = "https://arb1.arbitrum.io/rpc" }
                                @{ name = "MIN_EDGE_BPS"; value = "150" }
                                @{ name = "MAX_DAILY_LOSS"; value = "100" }
                                @{ name = "AAVE_LOAN_FRACTION"; value = "0.01" }
                                @{ name = "CONFIRM_REAL"; value = "false" }
                            )
                        }
                    )
                    scale = @{
                        minReplicas = 1
                        maxReplicas = 3
                    }
                }
            }
        }
    )
} | ConvertTo-Json -Depth 15

# Deploy container app
Write-Host "Deploying Container App..."
$appTemplate | Out-File -FilePath "containerapp-template.json" -Encoding UTF8
az deployment group create --resource-group $RESOURCE_GROUP --template-file "containerapp-template.json" --name "deploy-container-app"

# Step 3: Configure Key Vault permissions
Write-Host "`n🔐 Configuring Key Vault permissions..." -ForegroundColor Green

# Get the container app's managed identity
$principalId = az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query "identity.principalId" -o tsv 2>$null

if ($principalId -and $principalId -ne "null") {
    Write-Host "Assigning Key Vault permissions to managed identity: $principalId"
    az keyvault set-policy --name $KEY_VAULT_NAME --object-id $principalId --secret-permissions get list
    Write-Host "✅ Key Vault permissions configured"
} else {
    Write-Host "❌ Failed to get managed identity principal ID"
}

# Clean up template files
Remove-Item "environment-template.json" -ErrorAction SilentlyContinue
Remove-Item "containerapp-template.json" -ErrorAction SilentlyContinue

# Step 4: Display deployment summary
Write-Host "`n🎉 Dry Run Deployment Complete!" -ForegroundColor Cyan
Write-Host "📊 Container App: $CONTAINER_APP_NAME" -ForegroundColor White
Write-Host "🔒 Mode: DRY_RUN=true (NO REAL TRADES)" -ForegroundColor Red
Write-Host "🌍 Network: Arbitrum (Chain ID: 42161)" -ForegroundColor White
Write-Host "🔑 Key Vault: $KEY_VAULT_NAME.vault.azure.net" -ForegroundColor White
Write-Host "🖼️ Image: $EXISTING_IMAGE" -ForegroundColor White

Write-Host "`n🔍 Monitor the deployment:" -ForegroundColor Yellow
Write-Host "az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --follow" -ForegroundColor Gray

Write-Host "`n⚠️ IMPORTANT: This is a DRY RUN - no real transactions will be executed!" -ForegroundColor Red
Write-Host "The arbitrage system will analyze opportunities but not execute any trades." -ForegroundColor Yellow
