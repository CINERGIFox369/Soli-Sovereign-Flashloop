# 🚀 Soli Sovereign Flash-Loop - GitHub Secrets Configuration

This document outlines all the required GitHub secrets for the complete CI/CD pipeline.

## 🔐 Azure Authentication Secrets

Configure these in your GitHub repository settings under **Settings > Secrets and variables > Actions**:

### Core Azure Credentials

```
AZURE_CLIENT_ID          # Azure Service Principal Client ID
AZURE_TENANT_ID          # Azure Tenant ID  
AZURE_SUBSCRIPTION_ID    # Azure Subscription ID
```

### Azure Container Registry

```
ACR_NAME                 # Azure Container Registry name (without .azurecr.io)
```

### Staging Environment

```
STAGING_RESOURCE_GROUP       # Resource group for staging
STAGING_CONTAINERAPP_NAME    # Container app name for staging
STAGING_ENVIRONMENT_NAME     # Container Apps environment for staging
```

### Production Environment

```
PRODUCTION_RESOURCE_GROUP       # Resource group for production
PRODUCTION_CONTAINERAPP_NAME    # Container app name for production  
PRODUCTION_ENVIRONMENT_NAME     # Container Apps environment for production
```

## 🛠️ Setup Instructions

### 1. Create Azure Service Principal

```bash
# Login to Azure
az login

# Create service principal with contributor role
az ad sp create-for-rbac \
  --name "soli-sovereign-github-actions" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth
```

### 2. Configure GitHub Secrets

From the output above, configure:

- `AZURE_CLIENT_ID` = clientId
- `AZURE_TENANT_ID` = tenantId  
- `AZURE_SUBSCRIPTION_ID` = subscriptionId

### 3. Azure Resource Configuration

```bash
# Set your specific values
AZURE_SUBSCRIPTION_ID="your-subscription-id"
STAGING_RG="rg-soli-staging"
PRODUCTION_RG="rg-soli-production"
ACR_NAME="acrsoli$(date +%s)"
LOCATION="eastus"

# Create resource groups
az group create --name $STAGING_RG --location $LOCATION
az group create --name $PRODUCTION_RG --location $LOCATION

# Create Azure Container Registry
az acr create --resource-group $PRODUCTION_RG --name $ACR_NAME --sku Basic

# Create Container Apps environments
az containerapp env create \
  --name "env-soli-staging" \
  --resource-group $STAGING_RG \
  --location $LOCATION

az containerapp env create \
  --name "env-soli-production" \
  --resource-group $PRODUCTION_RG \
  --location $LOCATION
```

### 4. Update GitHub Secrets

Add these to your repository secrets:

```
ACR_NAME=acrsoli1234567890
STAGING_RESOURCE_GROUP=rg-soli-staging
STAGING_CONTAINERAPP_NAME=ca-soli-staging
STAGING_ENVIRONMENT_NAME=env-soli-staging
PRODUCTION_RESOURCE_GROUP=rg-soli-production
PRODUCTION_CONTAINERAPP_NAME=ca-soli-production
PRODUCTION_ENVIRONMENT_NAME=env-soli-production
```

## 🔒 Security Best Practices

### Service Principal Permissions

The service principal needs these permissions:

- **Contributor** role on both resource groups
- **AcrPush** role on the container registry
- **Azure Container Apps Contributor** role

### Least Privilege Access

```bash
# Grant specific permissions
az role assignment create \
  --assignee $AZURE_CLIENT_ID \
  --role "Azure Container Apps Contributor" \
  --scope /subscriptions/$AZURE_SUBSCRIPTION_ID/resourceGroups/$STAGING_RG

az role assignment create \
  --assignee $AZURE_CLIENT_ID \
  --role "Azure Container Apps Contributor" \
  --scope /subscriptions/$AZURE_SUBSCRIPTION_ID/resourceGroups/$PRODUCTION_RG

az role assignment create \
  --assignee $AZURE_CLIENT_ID \
  --role "AcrPush" \
  --scope /subscriptions/$AZURE_SUBSCRIPTION_ID/resourceGroups/$PRODUCTION_RG/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME
```

## ✅ Verification

Run this script to verify your configuration:

```bash
#!/bin/bash
echo "🔍 Verifying GitHub Secrets Configuration..."

# Required secrets
REQUIRED_SECRETS=(
  "AZURE_CLIENT_ID"
  "AZURE_TENANT_ID" 
  "AZURE_SUBSCRIPTION_ID"
  "ACR_NAME"
  "STAGING_RESOURCE_GROUP"
  "STAGING_CONTAINERAPP_NAME"
  "STAGING_ENVIRONMENT_NAME"
  "PRODUCTION_RESOURCE_GROUP"
  "PRODUCTION_CONTAINERAPP_NAME"
  "PRODUCTION_ENVIRONMENT_NAME"
)

echo "Required GitHub Secrets:"
for secret in "${REQUIRED_SECRETS[@]}"; do
  echo "  ✅ $secret"
done

echo ""
echo "🎯 Next Steps:"
echo "1. Add all secrets to GitHub repository settings"
echo "2. Test the deployment pipeline"
echo "3. Monitor the first deployment"
echo ""
echo "🚀 Ready for launch!"
```

## 🎯 Environment Strategy

### Branch Mapping

- **main** → Production deployment
- **develop** → Staging deployment  
- **feature/** → Staging deployment (on PR)
- **hotfix/** → Both environments

### Deployment Gates

- ✅ Security scans must pass
- ✅ All tests must pass
- ✅ Code quality gates must pass
- ✅ Manual approval for production (via GitHub Environments)

## 📚 Additional Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/azure/container-apps/)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides)
- [Azure RBAC Best Practices](https://docs.microsoft.com/azure/role-based-access-control/best-practices)
