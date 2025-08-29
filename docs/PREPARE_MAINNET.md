Mainnet deployment checklist — Soli keeper

1) Secrets & keys

2) Environment

# Mainnet deployment checklist — Soli keeper

## 1. Secrets & keys

- Put the executor signer and gas wallet private keys in an Azure Key Vault or use a hardware signer. Do NOT store private keys in plaintext in the repo.
- STORE: `PRIVATE_KEY` (executor), `GAS_WALLETS` (comma-separated gas/private keys for parallelism), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## 2. Environment

- Set `DRY_RUN=false` and `CONFIRM_REAL=true` only after fully testing in dry-run and on testnet.
- Confirm `ASSET` is in `STABLECOIN_LIST`.
- Tune `SIZES` candidate list to conservative values initially, then expand as you validate slippage and pool depth.
- Configure `AAVE_LOAN_FRACTION` to a conservative fraction (example: 0.001 = 0.1%) to reduce market impact.

## 3. Monitoring & Alerts

- Ensure Log Analytics and Application Insights are enabled and connected.
- Set alerts for:
  - Consecutive non-profitable attempts > X
  - Unexpected process restarts
  - High exception rate from keeper

## 4. Networking & Security

- Limit egress to required RPC providers. Use private link for Key Vault and ACR if necessary.
- Use Managed Identity and Key Vault for secrets; grant only get/list on Key Vault.

## 5. Deployment

- Build Docker image and push to ACR, then deploy to Container App.
- Test startup, environment variables, and logs in ACA.

## 6. Runbook

- Document safe shutdown, emergency pause, and manual profit extraction steps.
- Keep an operator on-call when enabling real funds.

## 7. Post-launch

- Start with low loan fraction and monitor slippage, pool depth, and realized profits.
- Increase sizes and loan cap gradually and only after successful runs.
- Build Docker image and push to ACR, then deploy to Container App.
