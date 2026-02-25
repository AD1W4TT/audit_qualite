# Notice CI/CD - POC ADIWATT

Date de mise a jour: 25/02/2026

## 1) Perimetre actuel

Le process CI/CD multi-utilisateurs est actif pour les depots PHP:
- analyse_risques
- audit_qualite
- controle_bon

Le depot C# `gestion_emplacements` est explicitement exclu.

## 2) Regle de validation (avec PR)

- Plus de validation manuelle par workflow de promotion.
- Le flux standard est base sur Pull Request vers `main`.
- La PR doit etre validee (review) avant merge.
- Le deploiement prod est automatique apres merge de la PR.

## 3) Sequence d'exploitation (flux reel)

1. Developpeur pousse sur une branche de travail (`feature/*`, `bugfix/*`, etc.).
2. Ouverture d'une PR vers `main`.
3. `ci-pr-php.yml` s'execute sur la PR (lint/tests PHP).
4. PR validee puis mergee dans `main`.
5. `deploy-prod-php.yml` se declenche sur l'evenement PR `closed` mergee.
6. Le workflow redeclenche une verification minimale puis deploie vers IIS.
7. En cas d'echec de deploiement, rollback technique automatique.

## 4) Workflows cibles (repos PHP)

- `.github/workflows/ci-pr-php.yml`
  - trigger: `pull_request` vers `main`
  - jobs: lint PHP + tests PHP

- `.github/workflows/deploy-prod-php.yml`
  - trigger: `pull_request` `closed` sur `main`
  - condition: `github.event.pull_request.merged == true`
  - jobs: verify + deploy IIS

## 5) Scripts de reference

- `deploy-iis.ps1`
  - Deploie vers IIS avec backup horodate + rollback automatique en echec technique.

- `decrypt-age.ps1`
  - Dechiffre les secrets `.age` avec `AGE_KEY_FILE`.

- `encrypt-age.ps1`
  - Chiffre un fichier vers `.age` via `.ci/age-recipients.txt`.

## 6) Variables / prerequis

Runner self-hosted (Windows, label `iis-prod`):
- `age.exe` installe (ou chemin connu)
- variable machine `AGE_KEY_FILE`
- acces ecriture vers `\\foadsysdev1p\deploy`

Variables GitHub Actions par repo PHP:
- `PROD_PHP_PATH`
- `PROD_PHP_BACKUP_PATH`

## 7) Rollback

- Rollback technique automatique uniquement en cas d'echec de deploiement.
- Pas de rollback post-succes dans le flux actuel.

## 8) Gouvernance recommandee

- Activer les protections de branche sur `main`:
  - Require a pull request before merging
  - Require approvals (au moins 1)
  - Require status checks to pass (`ci-pr-php / lint-test`)
  - Restrict who can push to matching branches (optionnel mais recommande)
- Aucune fonctionnalite GitHub payante requise (repos publics).
