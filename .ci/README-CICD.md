# CI/CD rapide (GitHub Free + IIS)

## Branching
- Dev: `feature/*` -> deploy auto vers `DEV`
- Prod: merge PR sur `main` -> deploy auto vers `deploy`

## Variables Actions (optionnelles)
- `DEV_PATH` (defaut: `\\foadsysdev1p\DEV\<repo>`)
- `DEV_BACKUP_PATH` (defaut: `\\foadsysdev1p\DEV\_backups\<repo>\dev`)
- `PROD_PATH` (defaut: `\\foadsysdev1p\deploy\<repo>`)
- `PROD_BACKUP_PATH` (defaut: `\\foadsysdev1p\deploy\_backups\<repo>\prod`)

### Dotnet (gestion_emplacements)
- `DOTNET_SOLUTION_FILE` (defaut: premier `*.sln` trouve)
- `DOTNET_BACKEND_CSPROJ` (defaut: `backend/Atelier.Api.csproj`)
- `DOTNET_FRONTEND_CSPROJ` (defaut: `frontend/frontend.csproj`)
- `DEV_API_PATH`, `DEV_FRONTEND_PATH`, `PROD_API_PATH`, `PROD_FRONTEND_PATH`
- `DEV_API_BACKUP_PATH`, `DEV_FRONTEND_BACKUP_PATH`, `PROD_API_BACKUP_PATH`, `PROD_FRONTEND_BACKUP_PATH`

## Runner
- Labels: `self-hosted`, `windows`, `iis-prod`
- Outils: `dotnet` (repo .NET), `php` (repos PHP)
- Variable machine obligatoire: `AGE_KEY_FILE`

## Secrets chiffrés
- Stockes dans `.ci/secrets/*.age`
- Le deploy dechiffre uniquement sur le runner

## Gate PR
- Le deploy prod est bloque si le commit `main` n'est pas issu d'une PR mergee avec approbation externe.


## Chemin runner confirme
- Dossier runner: \\foadsysdev1p\CI\actions-runner`r
- Cle age attendue par defaut: C:\CI\actions-runner\keys\cicd-runner-20260223.key`r




## Important IIS
- Les variables de chemins IIS sont obligatoires (aucun fallback automatique).
- Cela evite toute ecriture accidentelle sur un mauvais chemin IIS.

