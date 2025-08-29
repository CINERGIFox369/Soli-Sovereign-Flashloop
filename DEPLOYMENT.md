# Deployment notes (safe defaults)

## Local dry-run (recommended before any live deploy)

1. Create a local `.env` from `.env.example` and fill non-sensitive placeholders. NEVER commit the file.
2. Ensure `DRY_RUN=true` in your local environment to prevent real transactions.
3. Run the keeper locally:

```powershell
# PowerShell example
$env:DRY_RUN='true'; npx ts-node-esm script/keeper.ts
```

## CI / GitHub Actions

- The repository has a workflow to build a Docker image and update an Azure Container App. Provide the following repository secrets in GitHub: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`, `ACR_NAME`, `RESOURCE_GROUP`, `CONTAINERAPP_NAME`.
- The workflow runs a pre-deploy simulator smoke gate. Keep `SIM_MIN_SUCCESS` secret set to an appropriate threshold.

## Azure Container Apps (high-level)

1. Create an Azure service principal and store credentials in the `AZURE_CLIENT_*` secrets.
2. Create an Azure Container Registry (ACR) and set `ACR_NAME` in Secrets.
3. Create or initialize an Azure Container App, then allow the workflow to run and update it.

## Secrets hygiene

- Remove `.env` and `local.settings.json` from the repo and rotate any credentials that were exposed.
- Use `git-filter-repo` or BFG to remove files from history (see `SECURITY.md`).
