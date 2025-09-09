<#
Deploy script:
- Build and push Docker image to ACR
- Update Container App image
- If Container App missing, offer to create Container Apps environment + Container App
Usage examples:
  # using env vars
  $env:ACR_NAME = "myacrname"
  $env:CONTAINERAPP_NAME = "soli-keeper"
  $env:RESOURCE_GROUP = "main"
  .\deploy-local.ps1

  # or pass args
  .\deploy-local.ps1 -AcrName myacrname -ContainerAppName soli-keeper -ResourceGroup main -Location eastus
#>

param(
  [string]$AcrName = $env:ACR_NAME,
  [string]$ContainerAppName = $env:CONTAINERAPP_NAME,
  [string]$ResourceGroup = $env:RESOURCE_GROUP,
  [string]$Location = $env:LOCATION -or "eastus",
  [string]$KeyVaultName = $env:KEYVAULT_NAME
)

$ErrorActionPreference = 'Stop'

Write-Host "== Deploy local: Build/push image and update Container App =="

# validations
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  Write-Error "Azure CLI 'az' not found. Install it and re-run."
  exit 1
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker not found. Install/start Docker Desktop and re-run."
  exit 1
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Warning "git not found: script will use timestamp for image tag instead of commit SHA."
}

if (-not $AcrName) { Write-Error "ACR_NAME not set. Provide -AcrName or set env var ACR_NAME."; exit 1 }
if (-not $ContainerAppName) { Write-Error "CONTAINERAPP_NAME not set. Provide -ContainerAppName or set env var CONTAINERAPP_NAME."; exit 1 }
if (-not $ResourceGroup) { Write-Error "RESOURCE_GROUP not set. Provide -ResourceGroup or set env var RESOURCE_GROUP."; exit 1 }

# compute image tag
try {
  $sha = (git rev-parse --short HEAD).Trim()
  if (-not $sha) { throw "empty" }
} catch {
  $sha = (Get-Date -Format yyyyMMddHHmmss)
  Write-Host "Using timestamp tag: $sha"
}
$Image = "$AcrName.azurecr.io/soli-keeper:$sha"
Write-Host "Image: $Image"

# azure login if needed
try {
  az account show > $null
} catch {
  Write-Host "Not logged in to Azure; opening interactive login..."
  az login | Out-Host
}

# ACR login
Write-Host "Logging in to ACR '$AcrName'..."
az acr login --name $AcrName

# Build image
Write-Host "Building Docker image..."
docker build -t $Image .

# Push image
Write-Host "Pushing Docker image to $AcrName..."
docker push $Image

# Ensure containerapp extension
Write-Host "Ensuring az containerapp extension..."
az extension add --name containerapp --yes 2>$null | Out-Null

# Try to update container app
Write-Host "Attempting to update Container App '$ContainerAppName' in resource group '$ResourceGroup'..."
$updateResult = & az containerapp update --name $ContainerAppName --resource-group $ResourceGroup --image $Image --output json 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "Container App updated successfully."
  $updateResult | ConvertFrom-Json | ConvertTo-Json -Depth 4
  exit 0
}

Write-Warning "Container App update failed. Output:"
Write-Host $updateResult

# If update failed, ask to create the environment + container app
$createChoice = Read-Host "Container App may not exist. Create Container Apps environment + Container App now? (y/N)"
if ($createChoice -notin @('y','Y')) {
  Write-Host "Aborting. If the Container App exists, you may need to check permissions or app name."
  exit 1
}

# Ask for environment name and log-analytics workspace names
$EnvName = Read-Host "Enter Container Apps environment name (default: soli-aca-env)"
if (-not $EnvName) { $EnvName = "soli-aca-env" }
$LawName = Read-Host "Enter Log Analytics workspace name (default: soli-law)"
if (-not $LawName) { $LawName = "soli-law" }

# Create Log Analytics workspace if missing
Write-Host "Checking Log Analytics workspace '$LawName' in $ResourceGroup..."
$law = az monitor log-analytics workspace show --resource-group $ResourceGroup --workspace-name $LawName --query id -o tsv 2>$null
if (-not $law) {
  Write-Host "Creating Log Analytics workspace '$LawName'..."
  az monitor log-analytics workspace create --resource-group $ResourceGroup --workspace-name $LawName --location $Location --sku PerGB2018 | Out-Host
  $law = az monitor log-analytics workspace show --resource-group $ResourceGroup --workspace-name $LawName --query id -o tsv
} else {
  Write-Host "Found Log Analytics workspace: $law"
}

# Create Container Apps environment if missing
Write-Host "Checking Container Apps environment '$EnvName' in $ResourceGroup..."
$envId = az containerapp env show --name $EnvName --resource-group $ResourceGroup --query id -o tsv 2>$null
if (-not $envId) {
  Write-Host "Creating Container Apps environment '$EnvName'..."
  az containerapp env create --name $EnvName --resource-group $ResourceGroup --location $Location --logs-workspace-id $law | Out-Host
  $envId = az containerapp env show --name $EnvName --resource-group $ResourceGroup --query id -o tsv
} else {
  Write-Host "Found Container App environment: $envId"
}

# Create the Container App with system-assigned identity
Write-Host "Creating Container App '$ContainerAppName' pointing at image $Image ..."
$createCmd = @{
  name = $ContainerAppName
  resource_group = $ResourceGroup
  environment = $EnvName
  image = $Image
  cpu = "0.5"
  memory = "1.0Gi"
  revision_suffix = "init"
  assign_identity = "system"
}

# Build az CLI create command
$createArgs = @(
  "containerapp", "create",
  "--name", $createCmd.name,
  "--resource-group", $createCmd.resource_group,
  "--environment", $createCmd.environment,
  "--image", $createCmd.image,
  "--cpu", $createCmd.cpu,
  "--memory", $createCmd.memory,
  "--revision-suffix", $createCmd.revision_suffix,
  "--assign-identity", $createCmd.assign_identity,
  "--min-replicas", "1",
  "--max-replicas", "1",
  "--ingress", "external",
  "--target-port", "3000"
)
Write-Host "Running az $($createArgs -join ' ')"
$createOut = az @createArgs 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed creating Container App. Output:`n$createOut"
  exit 1
}
Write-Host "Container App created."

# Get principal id of the system-assigned identity
$principalId = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query identity.principalId -o tsv
Write-Host "Container App system-assigned identity principalId: $principalId"

# Optionally grant AcrPull on ACR
$acrResource = az acr show --name $AcrName --resource-group $ResourceGroup --query id -o tsv 2>$null
if (-not $acrResource) {
  # try find ACR in subscription (less safe); ask before continuing
  $foundAcr = az acr list --query "[?name=='$AcrName'] | [0].id" -o tsv 2>$null
  if ($foundAcr) { $acrResource = $foundAcr }
}
if ($acrResource) {
  $doAcr = Read-Host "Grant 'AcrPull' to the Container App identity on ACR '$AcrName'? (y/N)"
  if ($doAcr -in @('y','Y')) {
    Write-Host "Assigning AcrPull..."
    az role assignment create --assignee-object-id $principalId --role AcrPull --scope $acrResource | Out-Host
    Write-Host "AcrPull assigned."
  }
} else {
  Write-Warning "Could not find ACR resource id automatically. You can assign AcrPull manually later."
}

# Optionally grant Key Vault Secrets User on Key Vault (if provided)
if ($KeyVaultName) {
  $kv = az keyvault show --name $KeyVaultName --resource-group $ResourceGroup --query id -o tsv 2>$null
  if (-not $kv) { $kv = az keyvault show --name $KeyVaultName --query id -o tsv 2>$null }
  if ($kv) {
    $doKV = Read-Host "Grant 'Key Vault Secrets User' role to Container App identity for Key Vault '$KeyVaultName'? (y/N)"
    if ($doKV -in @('y','Y')) {
      # role id for Key Vault Secrets User built-in: "4633458b-17de-408a-b874-0445c86b69e6"
      az role assignment create --assignee-object-id $principalId --role "Key Vault Secrets User" --scope $kv | Out-Host
      Write-Host "Key Vault role assigned."
    }
  } else {
    Write-Warning "Key Vault '$KeyVaultName' not found; skipping Key Vault role assignment."
  }
}

Write-Host "All done. Container App should be running the image: $Image"