#!/bin/bash

set -e

echo "🎂 Birthday Messaging System - Setup Script"
echo "==========================================="
echo ""

if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
  echo "✅ .env file created. Please update it with your configuration."
else
  echo "⚠️  .env file already exists. Skipping..."
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Generating Prisma client..."
npm run prisma:generate

echo ""
echo "📊 Running database migrations..."
read -p "Do you want to run database migrations now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
  npm run prisma:migrate
  echo "✅ Database migrations completed"
else
  echo "⏭️  Skipping migrations. Run 'npm run prisma:migrate' later."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with proper configuration"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000/health to check if the server is running"
echo ""
echo "For more information, see README.md"
