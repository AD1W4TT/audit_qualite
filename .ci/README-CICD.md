CI/CD production manual validation policy

Rule on main
- Every commit on main requires manual validation before production deployment.
- Automatic deployment from push is disabled for all authors.
- Deployment must be triggered via .github/workflows/manual-approve-deploy.yml.

Current approver restriction
- Manual deployment remains restricted to lthibaultAdiwatt in workflow checks.

Workflows
- .github/workflows/main-ci-cd.yml
- .github/workflows/manual-approve-deploy.yml
