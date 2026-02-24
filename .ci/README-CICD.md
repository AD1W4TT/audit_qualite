CI/CD production author policy

Rule on main
- Commit authored by lthibaultAdiwatt: verify then automatic production deploy.
- Commit authored by Idir-zidour: verify then automatic deploy is blocked; manual approval deploy required from lthibaultAdiwatt.
- Any unknown author: treated as manual approval required.

Workflows
- .github/workflows/main-ci-cd.yml
- .github/workflows/manual-approve-deploy.yml

Required repository variables
- OWNER_LOGIN (default fallback: lthibaultAdiwatt)
- SECOND_DEV_LOGIN (default fallback: Idir-zidour)
- PROD_PATH
- PROD_BACKUP_PATH

Runner requirements
- Labels: self-hosted, windows, iis-prod
- AGE_KEY_FILE available on runner host
- age.exe available in PATH or under C:\CI\actions-runner\tools\age\age.exe
