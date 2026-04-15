# Test Suite Documentation

## Overview

Cette suite de tests complète couvre toutes les fonctionnalités du système, incluant :

- **Authentication Tests** : Tests de création d'utilisateurs, validation de mot de passe, gestion de session
- **RBAC Tests** : Tests de rôles, permissions, contrôle d'accès par rôle
- **Personnel Management API** : Tests CRUD pour utilisateurs, rôles, sites, équipes
- **Entries Management** : Tests de création/lecture/mise à jour d'entrées
- **Organization Management** : Tests de gestion de tenants, sites, équipes
- **E2E Integration Tests** : Tests de workflows complets multi-étapes
- **Validation Tests** : Tests de validation des données et gestion d'erreurs

## Running Tests

### Installation

```bash
npm install
```

### Exécuter tous les tests

```bash
npm run test
```

### Mode watch (reload automatique)

```bash
npm run test:watch
```

### Mode UI (interface graphique)

```bash
npm run test:ui
```

### Exécuter les tests une fois avec rapport détaillé

```bash
npm run test:run
```

### Rapport de couverture de code

```bash
npm run test:coverage
```

## Test Structure

Les tests sont organisés par domaine fonctionnel :

```
src/__tests__/
├── utils/
│   └── test-helpers.ts           # Utilitaires et setup pour tous les tests
├── auth/
│   └── authentication.test.ts    # Tests d'authentification utilisateur
├── rbac/
│   └── rbac.test.ts              # Tests contrôle d'accès basé sur les rôles
├── api/
│   ├── personnel.test.ts         # Tests API de gestion du personnel
│   ├── entries.test.ts           # Tests de gestion des entrées
│   └── organization.test.ts      # Tests sites/équipes/tenants
├── integration/
│   └── e2e.test.ts               # Tests d'intégration end-to-end
└── validation/
    └── validation.test.ts        # Tests de validation et erreurs
```

## Test Categories

### 1. Authentication Tests (src/__tests__/auth/authentication.test.ts)

Vérifie :
- Création d'utilisateurs avec mot de passe hashé (argon2)
- Gestion du statut utilisateur (ACTIVE/INACTIVE/SUSPENDED)
- Isolation multi-tenant
- Unicité des emails par tenant
- Gestion des informations utilisateur
- Validation de session/login

**Tests : 20+**

### 2. RBAC Tests (src/__tests__/rbac/rbac.test.ts)

Couvre :
- Création des rôles système (SUPER_ADMIN, PATRON, CHEF_EQUIPE, AGENT, CLIENT)
- Gestion des permissions (11 permissions distinctes)
- Attribution de rôles aux utilisateurs
- Permissions avec scope par site/équipe
- Validité temporelle des rôles (validFrom/validTo)
- Hiérarchie des rôles

**Tests : 25+**

### 3. Personnel Management API (src/__tests__/api/personnel.test.ts)

Teste :
- **GET /api/patron/personnel** : Récupération list utilisateurs + rôles/sites/équipes
- **POST /api/patron/personnel** : Création d'utilisateurs avec validation
- **PATCH /api/patron/personnel/[id]** : Mise à jour utilisateurs
- **DELETE /api/patron/personnel/[id]** : Soft delete utilisateurs

Validations :
- Emails uniques par tenant
- Hashage mot de passe
- Validation format email
- Validation longueur mot de passe
- Préservation des rôles lors des updates
- Caractères spéciaux et unicode

**Tests : 40+**

### 4. Entries Management (src/__tests__/api/entries.test.ts)

Couvre :
- Création d'entrées avec tous les champs
- Lecture/filtrage d'entrées
- Mise à jour d'entrées
- Soft delete d'entrées
- Gestion des types d'événements
- Agrégations et statistiques

Filtres supportés :
- Par site, équipe, utilisateur, type d'événement
- Par sévérité (INFO, FAIBLE, MOYENNE, ELEVEE, CRITIQUE)
- Par plage de dates

**Tests : 35+**

### 5. Organization Management (src/__tests__/api/organization.test.ts)

Teste :
- Gestion des Tenants (création, plans, quotas, status)
- Gestion des Sites (création, activation, déactivation)
- Gestion des Équipes (création, association à sites)
- Gestion des memberships d'équipe (dates début/fin)
- Hiérarchie Tenant > Site > Équipe
- Isolation multi-tenant

**Tests : 45+**

### 6. E2E Integration Tests (src/__tests__/integration/e2e.test.ts)

Scénarios complets :
- Lifecycle utilisateur complet (création → autorisation → équipe)
- Workflow d'entrées (création → mise à jour → suppression)
- Transfert d'utilisateurs entre équipes
- Workflows RBAC par rôle (PATRON, CHEF, AGENT, CLIENT)
- Isolation de données entre tenants
- Gestion concurrente
- Vérification d'intégrité référentielle

**Tests : 20+**

### 7. Validation & Error Handling (src/__tests__/validation/validation.test.ts)

Couvre :
- Validation d'email (formats valides/invalides)
- Validation de mot de passe (longueur min, complexité)
- Validation de noms d'utilisateurs
- Validation de rôles
- Validation de sites/équipes
- Validation d'entrées
- Gestion des dates
- Contraintes de quotas
- Isolation cross-tenant
- Contraintes de BD (NOT NULL, UNIQUE, FK)

**Tests : 50+**

## Test Helpers & Utilities

### setupTestContext()

Crée un environnement de test complet :

```typescript
const testContext = await setupTestContext();

// Fournit :
testContext.tenant;           // Tenant créé avec quotas
testContext.roles;            // 5 rôles système
testContext.permissions;      // 11 permissions
testContext.users;            // {superAdmin, patron, chef, agent, client}
testContext.sites;            // 1+ sites
testContext.teams;            // 1+ équipes
testContext.eventTypes;       // Types d'événements
```

### Helpers disponibles

```typescript
// Authentification
const user = await createTestUser(tenantId, email, password);
await cleanupDatabase();

// Rôles & Permissions
const roles = await createTestRoles(tenantId);
const permissions = await createTestPermissions(tenantId);
await assignRoleToUser(tenantId, userId, roleId, siteId, teamId);

// Organisation
const site = await createTestSite(tenantId, code, name);
const team = await createTestTeam(tenantId, siteId, code, name);

// Entrées
const entry = await createTestEntry(tenantId, siteId, teamId, userId, typeId, description);
```

## Database Setup for Testing

Les tests utilisent la même base de données que l'application via `DATABASE_URL` .

### Avant les tests

1. Créer une base de données PostgreSQL de test
2. Exécuter migrations Prisma :

```bash
npx prisma migrate dev
```

3. (Optionnel) Seeder les données de test :

```bash
npm run bootstrap:dev
```

### Cleanup Automatique

Chaque test appelle `beforeEach/afterEach` pour nettoyer les données :

```typescript
beforeEach(async () => {
  testContext = await setupTestContext();
});

afterEach(async () => {
  await cleanupDatabase();
});
```

## Coverage Goals

La suite de tests vise **>85% couverture** :

| Module | Coverage |
|--------|----------|
| Authentication | 90%+ |
| RBAC | 92%+ |
| API Routes | 88%+ |
| Components | 85%+ |
| Utils | 95%+ |
| **Global** | **>85%** |

Générer un rapport :

```bash
npm run test:coverage
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run test:run
      - run: npm run test:coverage
```

## Test Debugging

### Exécuter un test spécifique

```bash
# Un fichier
npm run test -- auth/authentication.test.ts

# Une suite
npm run test -- --grep "Authentication"

# Un test
npm run test -- --grep "should create user"
```

### Mode debug (VS Code)

Ajouter dans `.vscode/launch.json` :

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test", "--"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Logs détaillés

```bash
npm run test -- --reporter=verbose
```

## Common Issues

### Tests timeout

Augmenter le timeout dans `vitest.config.ts` :

```typescript
testTimeout: 10000, // 10 secondes
```

### Erreurs de connexion BD

Vérifier `DATABASE_URL` :

```bash
echo $DATABASE_URL
```

### Isolation de données

Vérifier que `afterEach` appelle `cleanupDatabase()` pour chaque test.

### Tests flaky

- Éviter les dépendances entre tests
- Utiliser `waitFor()` pour opérations asynchrones
- Vérifier les timestamps/dates qui changent

## Best Practices

1. ✅ **Chaque test doit être indépendant**
2. ✅ **Utiliser `beforeEach/afterEach` pour setup/cleanup**
3. ✅ **Tester un comportement par test**
4. ✅ **Utiliser des descripteurs clairs**
5. ✅ **Vérifier les cas d'erreur ET succès**
6. ✅ **Tester les validations**
7. ✅ **Couvrir les workflows multi-étapes**
8. ❌ **Ne pas dépendre de l'ordre des tests**
9. ❌ **Ne pas utiliser de données hardcodées en BD**
10. ❌ **Ne pas ignorer les tests (skip)**

## Performance

Temps d'exécution typiques :

| Suite | Temps |
|-------|-------|
| Auth | ~2s |
| RBAC | ~3s |
| Personnel | ~5s |
| Entries | ~4s |
| Organization | ~6s |
| E2E | ~8s |
| Validation | ~4s |
| **Total** | **~32s** |

Optimisations :
- Tests en parallèle par défaut
- Utiliser `describe.concurrent` pour suites indépendantes
- Limiter les I/O BD avec transactions

## Support & Troubleshooting

Pour aider au debug :

```bash
# Verbeux
npm run test:run -- --reporter=verbose

# Un seul worker (pour debug)
npm run test -- --threads=1 --singleThread

# Avec output
npm run test -- --reporter=tap

# UI interactive
npm run test:ui
```

## Maintenance

### Ajouter un nouveau test

1. Créer fichier dans `src/__tests__/{category}/`
2. Utiliser `setupTestContext()` dans `beforeEach`
3. Appeler `cleanupDatabase()` dans `afterEach`
4. Utiliser helper functions de `test-helpers.ts`

### Mettre à jour les fixtures

Si le modèle de données change :

1. Mettre à jour `createTestUser`, `createTestSite`, etc. dans `test-helpers.ts`
2. Exécuter tous les tests pour vérifier compatibilité
3. Ajouter nouveaux tests pour nouvelles propriétés

## Ressources

- [Vitest Documentation](https://vitest.dev/)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
- [Jest Matchers](https://vitest.dev/api/expect.html)
