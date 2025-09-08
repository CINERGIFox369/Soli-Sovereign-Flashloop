
# GitHub Actions OIDC -> Azure setup

This document shows the minimal steps to allow GitHub Actions to authenticate to Azure using OIDC and a federated credential on a service principal. After these steps the workflow can use `azure/login@v2` with `enable-oidc: true` and no client secret in GitHub.


# High-level flow


1. Create (or reuse) an Azure AD application / service principal.
2. Create a federated identity credential that binds the GitHub repository or organization to the application.
3. Assign the application a minimal role for the resources it needs (AcrPull on ACR, Contributor or narrower on RG).

Commands (run in az CLI; you must be an Azure AD admin for steps that modify app federation):

1. Create a service principal (if you don't have one already)
GitHub Actions OIDC -> Azure setup
---------------------------------

This document shows the minimal steps to allow GitHub Actions to authenticate to Azure using OIDC and a federated credential on a service principal. After these steps the workflow can use `azure/login@v2` with `enable-oidc: true` and no client secret in GitHub.

## High-level flow

1. Create (or reuse) an Azure AD application / service principal.
2. Create a federated identity credential that binds the GitHub repository or organization to the application.
3. Assign the application a minimal role for the resources it needs (AcrPull on ACR, Contributor or narrower on RG).

Commands (run in az CLI; you must be an Azure AD admin for steps that modify app federation):

1. Create a service principal (if you don't have one already)

```bash
az ad app create --display-name "github-actions-soli-keeper" --identifier-uris "api://github-actions-soli-keeper" --query appId -o tsv
```

Use the returned appId as `APP_ID` in the next steps.

1. Create a service principal for the app

```bash
az ad sp create --id <APP_ID>
```

1. Create the federated credential (subject format depends on your scope, this example binds the repo branch)

Replace `APP_ID`, `OWNER`, `REPO`, and `refs/heads/main` with your values.

```bash
az rest --method POST --uri "https://graph.microsoft.com/v1.0/applications/<APP_ID>/federatedIdentityCredentials" --headers "Content-Type=application/json" --body '{
  "name": "github-actions-<OWNER>-<REPO>-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:<OWNER>/<REPO>:ref:refs/heads/main",
  "description": "Federated credential for GitHub Actions from <OWNER>/<REPO> main branch",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

1. Assign roles: AcrPull on registry and Contributor or specific role on resource-group

```bash
az role assignment create --assignee <APP_ID> --role "AcrPull" --scope "/subscriptions/<SUB_ID>/resourceGroups/<RG>/providers/Microsoft.ContainerRegistry/registries/<ACR_NAME>"
az role assignment create --assignee <APP_ID> --role "Contributor" --scope "/subscriptions/<SUB_ID>/resourceGroups/<RG>"
```

## Notes

- Use a minimal set of permissions for the app. Prefer `AcrPull` and limited contributor on the resource group rather than subscription-wide Contributor.
- If you cannot create federated credentials yourself, ask your Azure AD admin to run steps 3 and 4.
- After federated credential creation, update workflow to call `azure/login@v2` with `enable-oidc: true`.
