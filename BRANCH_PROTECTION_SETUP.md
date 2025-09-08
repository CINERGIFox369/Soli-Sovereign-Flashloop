# Quick Setup Guide for Branch Protection

## Overview
This repository now has comprehensive CI workflows in place to protect the main branch. Follow these steps to complete the branch protection setup.

## 1. Apply Branch Protection Rules

Navigate to: **Repository Settings → Branches → Add Protection Rule**

### Configuration:
- **Branch name pattern**: `main`
- **Settings to enable**:
  - ✅ Require pull request reviews before merging
    - Require 1 approving review
    - Dismiss stale reviews when new commits are pushed
  - ✅ Require status checks to pass before merging
    - Require branches to be up to date before merging
    - **Required status checks**:
      - `CI - Build and Test / build-and-test`
      - `Static Analysis / static-analysis`
  - ✅ Require conversation resolution before merging
  - ✅ Restrict pushes that create files larger than 100MB
  - ✅ Do not allow bypassing the above settings
  - ✅ Include administrators (recommended)

## 2. What This Protects Against

- **Direct pushes to main**: All changes must go through PR review
- **Broken code deployment**: CI must pass before merging
- **Security issues**: Static analysis catches potential secrets/vulnerabilities
- **Unreviewed changes**: Requires approval from team members
- **Incomplete discussions**: All conversations must be resolved

## 3. Workflow for Contributors

1. Create feature branch from main
2. Make changes and commit
3. Push branch and create pull request
4. CI workflows run automatically (build + static analysis)
5. Address any CI failures
6. Request review from team members
7. Resolve any review comments
8. Once approved and CI passes, merge is allowed
9. Deployment to Azure Container Apps happens automatically

## 4. CI Workflows Active

- **Build & Test** (`ci.yml`): Validates TypeScript build and runs simulator smoke test
- **Static Analysis** (`static-analysis.yml`): Checks for security issues and code quality
- **Deployment** (`deploy-acr-aca.yml`): Deploys to Azure only after CI validation

## 5. Emergency Procedures

If urgent fixes are needed:
- Create hotfix branch
- Follow normal PR process (can be expedited)
- Emergency deployments still require CI validation
- Consider enabling "Allow administrators to bypass" temporarily if absolutely necessary

## 6. Monitoring

Check GitHub Actions tab to monitor:
- CI workflow status on PRs
- Deployment success/failure
- Security scan results