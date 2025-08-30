# Immediate rotation checklist

If secrets were exposed in the repository, rotate them immediately following this checklist. Treat all secrets as compromised until rotated.

1. Private keys
   - Revoke any private keys used for deployment or keeper wallets.
   - Create new keys, update your `.env` locally and any secrets stores (GitHub Secrets, Azure Key Vault), and deploy minimal test transactions to verify.

2. RPC / Provider API keys (Alchemy, Infura, QuickNode, etc.)
   - Regenerate API keys or create new project keys and update the secrets store.

3. Telegram bot token
   - Revoke the bot token via BotFather and create a new bot token if you use Telegram alerts.

4. Azure credentials (service principal)
   - Rotate the client secret for the Service Principal used by GitHub Actions (or create a new SP and update `AZURE_CLIENT_*` secrets).
   - Validate RBAC roles and reduce scopes to the minimum necessary (ACR push, Container App update).

5. GitHub secrets and tokens
   - Reset any personal access tokens or OAuth tokens which may be in the leaked files.
   - Re-create GitHub Actions secrets (Settings → Secrets → Actions) with new values.

6. Container registry credentials
   - Rotate ACR credentials (or service principal used by CI) and verify image pulls succeed.

7. Third-party keys (monitoring, Sentry, Datadog, etc.)
   - Rotate API keys and update the secrets store.

8. Communications
   - Notify collaborators that history was rewritten and that they must re-clone the repo.
   - Share a short handoff checklist that access to production systems was rotated.

9. Validate
   - Run CI (or trigger a workflow) to verify secrets are stored only in GitHub Secrets and that the secret-scan workflow passes.
   - Re-run `git rev-list --objects --all | grep -E '\.env$|local.settings.json$'` on a fresh clone to confirm the files are gone.

10. Prevent recurrence
    - Enable GitHub secret scanning (if available on your plan) and Dependabot.
    - Add pre-commit checks or a gitleaks pre-commit hook to prevent accidental commits of secrets.

Keep this checklist as the canonical post-incident rotation guide for this repository.
