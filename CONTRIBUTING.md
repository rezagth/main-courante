# Contributing to Main Courante

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (recommended)

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/yourorg/main-courante.git
cd main-courante

# 2. Install dependencies
pnpm install

# 3. Start stack with Docker Compose
docker-compose up -d

# 4. Set up environment
cp .env.example .env

# 5. Run migrations
pnpm exec prisma migrate dev

# 6. Start dev server
pnpm dev
```

App will be available at `http://localhost:3000`

---

## Development Workflow

### Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API routes
│   ├── (admin)/      # Admin routes
│   ├── (agent)/      # Agent dashboard
│   └── ...
├── components/       # React components
├── lib/              # Utilities & helpers
├── hooks/            # React hooks
├── types/            # TypeScript types
└── __tests__/        # Test suite
```

### Creating a New Feature

1. **Create branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** and test locally:
   ```bash
   pnpm dev        # Dev server
   pnpm test       # Run tests in watch mode
   pnpm lint       # Check linting
   ```

3. **Write tests** for your feature:
   ```bash
   # Add tests to src/__tests__/
   pnpm test:run   # Run full suite
   ```

4. **Commit with semantic commit messages**:
   ```bash
   git commit -m "feat: add new feature description"
   ```

   Prefixes:
   - `feat:` — New feature
   - `fix:` — Bug fix
   - `docs:` — Documentation
   - `refactor:` — Code refactoring
   - `perf:` — Performance improvement
   - `test:` — Test additions/changes
   - `ci:` — CI/CD changes

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

---

## Code Standards

### TypeScript
- Strict mode enabled
- No `any` types without good reason
- Proper type definitions for all functions

### React Components
- Functional components only
- Use hooks for state management
- Memoize expensive components with `React.memo`

### API Endpoints
- Use HTTP status codes correctly
- Return consistent JSON format
- Include error messages
- Document with JSDoc comments

Example API response:
```typescript
export async function POST(req: NextRequest) {
  try {
    // Your logic
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Git Commit Messages
```
feat(entries): add bulk export to CSV

- Implement new CSV export endpoint
- Add batch processing for large datasets
- Add performance test for 10k entries

Fixes #123
```

---

## Testing

### Running Tests
```bash
pnpm test           # Watch mode
pnpm test:run       # Single run
pnpm test:coverage  # With coverage
pnpm test:ui        # Visual UI
```

### Writing Tests
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Name', () => {
  let context: any;

  beforeEach(async () => {
    context = await setupTestContext();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should do something', async () => {
    // Arrange
    const user = context.users.agent;

    // Act
    const result = await prisma.entreeMainCourante.create({
      data: { /* ... */ }
    });

    // Assert
    expect(result).toBeDefined();
  });
});
```

---

## Database Changes

### Creating a Migration

1. **Modify `prisma/schema.prisma`**:
   ```prisma
   model NewModel {
     id    String  @id @default(uuid())
     name  String
   }
   ```

2. **Create migration**:
   ```bash
   pnpm exec prisma migrate dev --name add_new_model
   ```

3. **Review generated SQL** in `prisma/migrations/`

4. **Commit migration files**:
   ```bash
   git add prisma/migrations/
   git commit -m "database: add new_models table"
   ```

### Testing Migrations
```bash
# Reset database (dev only!)
pnpm exec prisma migrate reset

# Test on specific database
DATABASE_URL="..." pnpm exec prisma migrate deploy
```

---

## Debugging

### VS Code Debugging
Add to `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "preLaunchTask": "npm: dev"
    }
  ]
}
```

Then run:
```bash
NODE_OPTIONS='--inspect' pnpm dev
```

### Database Debugging
```bash
docker-compose exec postgres psql -U postgres -d main_courante

# Useful commands
\dt                    # List tables
\d table_name          # Show table schema
SELECT * FROM users;   # Query
```

### Redis Debugging
```bash
docker-compose exec redis redis-cli
```

---

## Performance Tips

### Query Optimization
- Use `include` carefully (avoid N+1 queries)
- Add database indexes for frequently queried fields
- Use `select` to limit returned fields

### Frontend Optimization
- Lazy load components with `React.lazy`
- Memoize expensive calculations
- Use virtualization for large lists

### Build Optimization
```bash
# Analyze bundle
pnpm exec next-bundle-analyzer
```

---

## Common Issues

### "Cannot find module" Error
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Database Migration Failed
```bash
# Check migration status
pnpm exec prisma migrate status

# Manually fix database and mark as resolved
pnpm exec prisma migrate resolve --rolled-back <migration-name>
```

### Port Already in Use
```bash
# Change port in .env
PORT=3001 pnpm dev

# Or kill process
lsof -ti:3000 | xargs kill -9
```

---

## Code Review Checklist

Before submitting PR, ensure:
- [ ] Code follows style guide
- [ ] Tests pass: `pnpm test:run`
- [ ] Linting passes: `pnpm lint`
- [ ] No console.log in production code
- [ ] Database changes are in migration files
- [ ] API changes are documented
- [ ] Breaking changes are noted
- [ ] Commit messages are clear

---

## Useful Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Vitest Guide](https://vitest.dev/guide)
- [React Best Practices](https://react.dev/reference)

---

## Questions?

- Check [docs/](docs/) folder
- Open an issue on GitHub
- Ask in Discord/Slack channel
