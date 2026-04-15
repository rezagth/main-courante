#!/usr/bin/env pwsh
# Windows setup script for Main Courante development

Write-Host "🚀 Setting up Main Courante development environment..." -ForegroundColor Green

# Check Docker
Write-Host "📋 Checking prerequisites..." -ForegroundColor Cyan
$dockerInstalled = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
if (-not $dockerInstalled) {
    Write-Host "❌ Docker not found. Please install Docker Desktop" -ForegroundColor Red
    exit 1
}

# Check pnpm
$pnpmInstalled = $null -ne (Get-Command pnpm -ErrorAction SilentlyContinue)
if (-not $pnpmInstalled) {
    Write-Host "📦 Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
pnpm install

# Create .env file
if (-not (Test-Path ".env")) {
    Write-Host "⚙️  Creating .env file..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env"
    Write-Host "✓ .env created - update with your values" -ForegroundColor Green
}

# Start Docker services
Write-Host "🐳 Starting Docker services..." -ForegroundColor Cyan
docker-compose down 2>&1 | Out-Null
docker-compose up -d

# Wait for services
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Run migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Cyan
pnpm exec prisma migrate dev --skip-generate 2>&1 | Out-Null

# Success
Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update .env file with your secrets"
Write-Host "  2. Run: pnpm dev"
Write-Host "  3. Open: http://localhost:3000"
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  pnpm test          - Run tests"
Write-Host "  pnpm lint          - Check linting"
Write-Host "  make dev           - Start dev server"
Write-Host "  make docker-logs   - View Docker logs"
