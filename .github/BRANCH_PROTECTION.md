# Branch Protection Rules Configuration

This document outlines the branch protection rules that should be configured for the main branch to ensure code quality and security.

## Required Branch Protection Settings for `main`

### Pull Request Requirements
- ✅ **Require pull request reviews before merging**
  - Require at least 1 approving review
  - Dismiss stale reviews when new commits are pushed
  - Require review from code owners (if CODEOWNERS file exists)

### Status Check Requirements  
- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Required status checks:
    - `CI - Build and Test / build-and-test`
    - `Static Analysis / static-analysis`

### Additional Restrictions
- ✅ **Require conversation resolution before merging**
- ✅ **Restrict pushes that create files larger than 100MB**
- ✅ **Do not allow bypassing the above settings**
- ✅ **Include administrators** (recommended for security)

## Benefits

These protection rules ensure:

1. **Code Quality**: All code is reviewed and tested before merging
2. **Security**: Static analysis catches potential security issues
3. **Stability**: Deployment only happens after CI validation
4. **Collaboration**: Requires discussion and resolution of issues
5. **Accountability**: Maintains audit trail of all changes

## How to Apply

1. Go to Repository Settings → Branches
2. Click "Add protection rule"
3. Enter `main` as the branch name pattern
4. Configure the settings as outlined above
5. Save the protection rule

## CI Workflow Integration

The CI workflows (`ci.yml` and `static-analysis.yml`) are configured to run on:
- All pull requests targeting main
- All pushes to main (for immediate feedback)

The deployment workflow (`deploy-acr-aca.yml`) will only run after CI validation passes.