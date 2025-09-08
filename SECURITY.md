# Security guidance

- Never commit secrets (API keys, private keys, tokens) to the repository.
- Remove leaked secrets immediately and rotate credentials.
- Use a secrets manager (GitHub Secrets, Azure Key Vault) for CI and deployments.
- Enable secret scanning (GitHub Advanced Security or gitleaks) and Dependabot.

How to purge secrets from git history (example using git-filter-repo):

<<<<<<< HEAD
1. Install git-filter-repo ([git-filter-repo documentation](https://github.com/newren/git-filter-repo))
=======
1. Install git-filter-repo (https://github.com/newren/git-filter-repo)
>>>>>>> fix/ci-oidc-on-origin
2. Run the filter to remove .env and local.settings.json from history:

```bash
git clone --mirror <repo-url> repo-mirror.git
cd repo-mirror.git
git filter-repo --invert-paths --paths .env --paths local.settings.json
git push --force --all
git push --force --tags
```

<<<<<<< HEAD
If you prefer BFG, see the BFG Repo-Cleaner homepage: [BFG Repo-Cleaner homepage](https://rtyley.github.io/bfg-repo-cleaner/)
=======
If you prefer BFG, see the BFG Repo-Cleaner homepage: https://rtyley.github.io/bfg-repo-cleaner/
>>>>>>> fix/ci-oidc-on-origin

After history rewrite: rotate any credentials that may have been in those files.
