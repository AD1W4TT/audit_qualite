CI/CD production policy (no PR)

Rule
- No PR flow.
- Validation is manual before main through .github/workflows/promote-to-main.yml.
- Push on main triggers technical verify + production deployment.

Release flow
1. Developer pushes to feature/*.
2. lthibaultAdiwatt runs promote-to-main.yml with a SHA.
3. Workflow verifies actor + SHA and fast-forwards main.
4. main-ci-cd.yml runs verify then deploy to production.

Rollback
- Technical rollback is automatic in deploy-iis.ps1 on deployment failure.
- No post-success rollback workflow is provided.

Test promote trigger 2026-02-24 17:34:32
