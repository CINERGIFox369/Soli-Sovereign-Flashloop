
CI secrets and repository variables
=================================

This project requires the following GitHub repository secrets and variables for the `deploy-acr-aca` workflow to run successfully.

Define them under GitHub > Settings > Secrets and variables > Actions (or Repository > Secrets for secrets).

The important entries:

- `ACR_NAME` (secret) — Azure Container Registry short name (e.g. `solisovereignacr`). The workflow constructs the registry server as `${ACR_NAME}.azurecr.io`.
- `AZURE_CLIENT_ID` (secret) — Service principal client id used by `azure/login` (not required if using OIDC).
- `AZURE_CLIENT_SECRET` (secret) — Service principal client secret used by `azure/login` (not required if using OIDC).
- `AZURE_TENANT_ID` (secret) — Entra / tenant id used by `azure/login` (not required if using OIDC).
- `AZURE_SUBSCRIPTION_ID` (variable or secret) — Subscription id used for az operations. Set as a repository variable for better visibility.
- `CONTAINERAPP_NAME` (secret or variable) — Container App name (default `soli-keeper` when not provided).
- `RESOURCE_GROUP` (secret or variable) — Azure resource group name (default `main` when not provided).
- `FORK_RPC` (secret) — Optional RPC endpoint used by forked tests in CI (if you run fork tests in Actions).

Notes

- The workflow validates `ACR_NAME` at runtime and fails early if it is missing.
- We intentionally avoid writing secrets to `$GITHUB_ENV` to reduce leakage risk.
- If you prefer the workflow analyzer to stop warning about missing contexts, define the secrets/vars in repository settings.

Optional: use GitHub OIDC (recommended)

You can avoid storing a client secret in Actions by enabling GitHub OIDC and configuring a federated credential on an Azure service principal.

Steps (high level):

1. Create or use an existing Azure service principal.
2. Create a federated credential that allows tokens from this repository/workflow to assume the service principal. See the Azure docs for `az ad app federated-credential` or use the portal.
3. Change the workflow to use `azure/login` with `enable-oidc: true` (no client secret required). The workflow already includes a fallback path; changing to OIDC will remove the need to define `AZURE_CLIENT_SECRET` in GitHub.

I can update the workflow to use OIDC if you want — say the word and I'll change the `azure/login` step and add the exact `az` commands you need to create the federated credential.
