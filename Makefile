.PHONY: help install dev build test lint clean db-migrate db-reset docker-up docker-down deploy-dev deploy-prod

help:
	@echo "Main Courante - Makefile Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install          - Install dependencies"
	@echo "  make dev              - Start development server"
	@echo "  make build            - Build production bundle"
	@echo "  make test             - Run test suite"
	@echo "  make test-watch       - Run tests in watch mode"
	@echo "  make lint             - Run ESLint"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate       - Run Prisma migrations"
	@echo "  make db-reset         - Reset database (dev only!)"
	@echo "  make db-seed          - Seed test data"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        - Start Docker Compose stack"
	@echo "  make docker-down      - Stop Docker Compose stack"
	@echo "  make docker-logs      - View Docker logs"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-dev       - Deploy to staging"
	@echo "  make deploy-prod      - Deploy to production"

install:
	pnpm install

dev:
	docker-compose up -d
	pnpm dev

build:
	NODE_OPTIONS="--max-old-space-size=4096" pnpm build

test:
	pnpm test:run

test-watch:
	pnpm test

test-coverage:
	pnpm test:coverage

lint:
	pnpm lint

type-check:
	pnpm exec tsc --noEmit

clean:
	rm -rf .next node_modules dist coverage

db-migrate:
	pnpm exec prisma migrate deploy

db-reset:
	pnpm exec prisma migrate reset --force

db-seed:
	pnpm exec prisma db seed

docker-up:
	docker-compose up -d
	@echo "✓ Stack started. App: http://localhost:3000"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f app

docker-clean:
	docker-compose down -v

deploy-dev:
	git push develop
	@echo "✓ Triggered CI/CD for staging"

deploy-prod:
	git push main
	@echo "✓ Triggered CI/CD for production"

pre-commit: lint type-check test
	@echo "✓ Pre-commit checks passed"
