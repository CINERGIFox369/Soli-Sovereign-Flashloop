param(
  [string]$rgName = 'soli-rg',
  [string]$location = 'eastus',
  [string]$acrName = 'solisoliacr',
  [string]$lawName = 'soli-law',
  [string]$acaEnvName = 'soli-aca-env',
  [string]$containerAppName = 'soli-keeper',
  [string]$kvName = 'soli-kv'
)

Write-Output "Creating resource group $rgName in $location"
az group create -n $rgName -l $location

Write-Output "Creating ACR $acrName"
az acr create -n $acrName -g $rgName --sku Standard --admin-enabled false

Write-Output "Creating Log Analytics workspace $lawName"
az monitor log-analytics workspace create -g $rgName -n $lawName
$lawId = az monitor log-analytics workspace show -g $rgName -n $lawName --query id -o tsv

Write-Output "Creating Container Apps environment $acaEnvName"
az containerapp env create -g $rgName -n $acaEnvName --logs-workspace-id $lawId

Write-Output "Creating Container App $containerAppName (placeholder image)"
az containerapp create -g $rgName -n $containerAppName --environment $acaEnvName --image mcr.microsoft.com/oss/nodejs/node:20-alpine --cpu 0.5 --memory 1.0 --ingress 'disabled'

Write-Output "Creating Key Vault $kvName"
az keyvault create -g $rgName -n $kvName --sku standard

Write-Output "Assign managed identity to container app and grant Key Vault access"
$principalId = az containerapp show -g $rgName -n $containerAppName --query identity.principalId -o tsv
if ($principalId) {
  az keyvault set-policy -n $kvName --object-id $principalId --secret-permissions get list
} else {
  Write-Output "No principalId found; ensure the container app has system-assigned identity enabled"
}

Write-Output "Done. Remember to push your container image to $acrName.azurecr.io and update the container app image." 
