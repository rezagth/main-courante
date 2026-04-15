#!/bin/bash
set -e

echo "🚀 Setting up Main Courante development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git"
    exit 1
fi

# Clone repository if needed
if [ ! -d ".git" ]; then
    echo "📥 Cloning repository..."
    git clone https://github.com/yourorg/main-courante.git
    cd main-courante
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✓ .env created - update with your values"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
pnpm exec prisma migrate dev --skip-generate 2>/dev/null || true

# Success message
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update .env file with your secrets"
echo "  2. Run: pnpm dev"
echo "  3. Open: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  pnpm test          - Run tests"
echo "  pnpm lint          - Check linting"
echo "  make dev           - Start dev server"
echo "  make docker-logs   - View Docker logs"
echo ""
