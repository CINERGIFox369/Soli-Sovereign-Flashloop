# Azure deployment notes for the Soli keeper

This file lists minimal Azure resources and secrets needed to deploy the keeper using GitHub Actions + ACR -> Azure Container Apps.

## Required Azure resources

- Resource group (RG)
- Azure Container Registry (ACR)
- Azure Container Apps environment + Container App
- Log Analytics workspace
- Key Vault

## Required GitHub secrets (set these in repo Settings > Secrets)

- `AZURE_CREDENTIALS`: JSON service principal used by `azure/login` action (or use federated credentials)
- `ACR_NAME`: name of your ACR (short name, without .azurecr.io)
- `RESOURCE_GROUP`: target resource group name
- `CONTAINERAPP_NAME`: name of the Container App
- `TELEGRAM_BOT_TOKEN`: (optional) bot token for alerts
- `TELEGRAM_CHAT_ID`: (optional) chat id for alerts

## Key Vault & secrets

- Store `PRIVATE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` in Key Vault.
- Grant the Container App's managed identity access (Get/list/unwrap) to pull secrets.

## Quick create (Azure CLI) examples

1) Create RG & ACR:

   az group create -n my-rg -l eastus
   az acr create -n myacrname -g my-rg --sku Standard

2) Create Log Analytics and Container Apps environment:

   az monitor log-analytics workspace create -g my-rg -n my-law
   az containerapp env create -g my-rg -n my-aca-env --logs-workspace-id /subscriptions/.../resourcegroups/my-rg/providers/microsoft.operationalinsights/workspaces/my-law

3) Create container app (initial):

   az containerapp create -g my-rg -n my-keeper --environment my-aca-env --image myacrname.azurecr.io/soli-keeper:latest --registry-login-server myacrname.azurecr.io

## CI/CD

- The included GitHub Actions workflow builds the container, pushes to ACR, and attempts to `az containerapp update`.
- First deployment typically requires a manual `az containerapp create` with correct environment/registry values; subsequent pushes update the image.

## Notes

- Use Key Vault to avoid storing private keys in GitHub secrets directly. If you must, use GitHub Secrets for `AZURE_CREDENTIALS` only.
- Consider using Private Endpoint / VNet for Key Vault and ACR when you need strict network isolation.
- Configure Application Insights / Log Analytics for alerting on custom metrics (consecutive losses, exception rate).
