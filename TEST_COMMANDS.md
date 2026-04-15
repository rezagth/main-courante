# Test Commands Reference

Cette documentation fournit tous les commandes pour exécuter les tests.

## Installation

```bash
# Installer les dépendances
npm install

# Setup base de données
npx prisma migrate dev

# (Optionnel) Seed données
npm run bootstrap:dev
```

## Commandes de Test Principales

### Tous les tests

```bash
# Mode interactif avec watch
npm run test

# Exécution unique
npm run test:run

# Mode UI (interface graphique interactive)
npm run test:ui

# Avec rapport de couverture
npm run test:coverage

# Mode watch avec logs verbeux
npm run test:watch
```

## Tester un fichier spécifique

```bash
# Tests d'authentification
npm run test -- auth/authentication.test.ts

# Tests RBAC
npm run test -- rbac/rbac.test.ts

# Tests API Personnel
npm run test -- api/personnel.test.ts

# Tests des entrées
npm run test -- api/entries.test.ts

# Tests Organisation
npm run test -- api/organization.test.ts

# Tests E2E
npm run test -- integration/e2e.test.ts

# Tests Validation
npm run test -- validation/validation.test.ts
```

## Filtrer les tests par nom

```bash
# Tous les tests mentionnant "user"
npm run test -- --grep "user"

# Tous les tests "should create"
npm run test -- --grep "should create"

# Tests d'une suite spécifique
npm run test -- --grep "Authentication"

# Tests avec regex
npm run test -- --grep "create|update|delete"
```

## Mode Debug

```bash
# Un seul worker (plus facile à déboguer)
npm run test -- --threads=1

# Sans parallelisation
npm run test -- --singleThread

# Avec output détaillé
npm run test -- --reporter=verbose

# Reporter TAP (Test Anything Protocol)
npm run test -- --reporter=tap

# Reporter JSON
npm run test -- --reporter=json
```

## Couverture de code

```bash
# Générer rapport couverture
npm run test:coverage

# Couverture en HTML (ouvert automatiquement)
npm run test:coverage -- --coverage.reporter=html

# Couverture spécifique à un dossier
npm run test:coverage -- --coverage.include="src/lib/**"

# Couverture minimale requise
npm run test:coverage -- --coverage.lines=85 --coverage.functions=85
```

## Tests spécifiques par domaine

### Tests d'authentification

```bash
# Tous les tests d'authentification
npm run test -- auth/

# Tests de création d'utilisateurs
npm run test -- --grep "User Creation"

# Tests de gestion de session
npm run test -- --grep "Session"

# Tests de statut utilisateur
npm run test -- --grep "User Status"
```

### Tests RBAC

```bash
# Tous les tests RBAC
npm run test -- rbac/

# Tests des rôles
npm run test -- --grep "Role Management"

# Tests des permissions
npm run test -- --grep "Permission"

# Tests d'assignation
npm run test -- --grep "User Role Assignment"
```

### Tests d'API

```bash
# Tous les tests d'API
npm run test -- api/

# Tests GET
npm run test -- --grep "GET"

# Tests POST (création)
npm run test -- --grep "POST|Create"

# Tests PATCH (mise à jour)
npm run test -- --grep "PATCH|Update"

# Tests DELETE
npm run test -- --grep "DELETE|Delete|Soft Delete"
```

### Tests d'entrées

```bash
# Tous les tests d'entrées
npm run test -- entries.test.ts

# Tests de création
npm run test -- --grep "Entry Creation"

# Tests de récupération
npm run test -- --grep "Entry Retrieval"

# Tests de filtrage
npm run test -- --grep "filter"

# Tests de suppression
npm run test -- --grep "Soft Delete"
```

### Tests d'organisation

```bash
# Tous les tests d'organisation
npm run test -- organization.test.ts

# Tests de tenants
npm run test -- --grep "Tenant"

# Tests de sites
npm run test -- --grep "Site"

# Tests d'équipes
npm run test -- --grep "Team"

# Tests de hiérarchie
npm run test -- --grep "Hierarchical"
```

### Tests d'intégration

```bash
# Tous les tests E2E
npm run test -- e2e.test.ts

# Tests de lifecycle utilisateur
npm run test -- --grep "Lifecycle"

# Tests de workflow
npm run test -- --grep "Workflow"

# Tests multi-tenant
npm run test -- --grep "multi-tenant"
```

### Tests de validation

```bash
# Tous les tests de validation
npm run test -- validation.test.ts

# Tests de validation d'email
npm run test -- --grep "Email"

# Tests de validation de mot de passe
npm run test -- --grep "Password"

# Tests de contraintes
npm run test -- --grep "Constraint"
```

## Tests avec conditions

```bash
# Tests à exclure (inverse grep)
npm run test -- --grep "should not"

# Tests concurrents uniquement
npm run test -- --grep "concurrent"

# Tests de date/temps
npm run test -- --grep "Date|Time"

# Tests de validation cross-tenant
npm run test -- --grep "Cross-tenant"
```

## CI/CD Integration

### Tests rapides (avant commit)

```bash
npm run test:run -- --timeout=5000
```

### Tests complets (avant push)

```bash
npm run test:run && npm run test:coverage
```

### Tests avec rapport détaillé

```bash
npm run test:run -- --reporter=verbose --reporter=json > test-results.json
```

## Debugging Avancé

### Tests avec breakpoints (VSCode)

1. Ajouter dans `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test", "--"],
  "console": "integratedTerminal"
}
```

2. Lancer avec F5 et placer breakpoints

### Tests avec logs détaillés

```bash
DEBUG=* npm run test -- auth/
```

### Profiler les tests

```bash
npm run test:run -- --reporter=verbose --singleThread
```

## Tests flaky (instables)

```bash
# Réexécuter un test instable 10 fois
npm run test -- --grep "unstable-test" --repeat=10

# Exécution avec seed aléatoire
npm run test -- --random
```

## Performance

### Benchmark des tests

```bash
# Afficher durée de chaque test
npm run test:run -- --reporter=verbose

# Top 10 tests les plus lents
npm run test:run -- --reporter=verbose | sort -k3 -rn | head -10
```

### Optimiser performance

```bash
# Utiliser tous les workers disponibles
npm run test -- --threads=auto

# Limiter à 2 workers
npm run test -- --threads=2

# Sans workers (mode séquentiel)
npm run test -- --singleThread
```

## Monitoring & Metrics

```bash
# Générer rapport JUnit (pour CI)
npm run test:run -- --reporter=junit

# Générer rapport JSON
npm run test:run -- --reporter=json

# Afficher summary
npm run test:run -- --reporter=default
```

## Watch Mode Avancé

```bash
# Watch toute les modifications
npm run test:watch

# Watch fichiers spécifiques
npm run test:watch -- api/

# Watch avec filtres
npm run test:watch -- --grep "user"

# Redémarrer watch à chaque modification
npm run test:watch -- --reporter=verbose
```

## Cleanup & Reset

```bash
# Nettoyer cache de test
rm -rf .vitest

# Réinitialiser la base de données
npm run db:wipe

# Réinitialiser et seeder
npm run db:wipe && npm run bootstrap:dev

# Run tous les tests après reset
npm run db:wipe && npm run bootstrap:dev && npm run test:run
```

## Commandes Composées

### Workflow de développement

```bash
# Tester une fonctionnalité spécifique en development
npm run test:watch -- --grep "Personnel"

# Avant commit
npm run test:run -- api/personnel.test.ts && npm run lint

# Avant push
npm run test:run && npm run test:coverage && npm run lint
```

### Tests de validation complets

```bash
# Tous les tests de validation
npm run test -- validation/ --reporter=verbose

# Validation + coverage
npm run test:run -- validation/ && npm run test:coverage
```

### Tests multi-domaines

```bash
# RBAC + Personnel
npm run test -- --grep "RBAC|Personnel"

# Authentification + E2E
npm run test -- auth/ e2e.test.ts

# Tous les tests sauf validation
npm run test -- --grep "^(?!.*Validation)"
```

## Troubleshooting

### Si les tests timeout

```bash
# Augmenter timeout globalement
npm run test -- --testTimeout=30000

# Timeout spécifique
npm run test -- --grep "slow-test" --testTimeout=60000
```

### Si les tests flaky

```bash
# Exécuter avec isolation stricte
npm run test -- --singleThread --reporter=verbose

# Avec logs détaillés
npm run test -- --singleThread --reporter=verbose 2>&1 | tee test-debug.log
```

### Si la BD est lockée

```bash
# Fermer toutes les connexions
npm run db:wipe

# Redémarrer PostgreSQL
docker-compose restart postgres

# Réexécuter les tests
npm run test
```

### Si manque des dépendances

```bash
npm install @vitejs/plugin-react @vitest/coverage-v8 vitest --save-dev
```

## Quick Reference

| Commande | Utilité |
|----------|---------|
| `npm run test` | Tests en mode watch |
| `npm run test:run` | Tests une seule fois |
| `npm run test:ui` | Tests avec UI |
| `npm run test:coverage` | Rapport de couverture |
| `npm run test -- --grep "pattern"` | Filtrer tests |
| `npm run test -- --threads=1` | Mode séquentiel |
| `npm run test:watch -- api/` | Watch dossier |
| `npm run test:run -- --reporter=verbose` | Output détaillé |

Pour plus d'aide : `npm run test -- --help`
