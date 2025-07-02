#!/bin/bash

echo "Setting up Support Backend..."

# Copy environment file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
  echo "Please edit .env if you need custom database settings"
else
  echo ".env already exists, skipping..."
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Run database migrations
echo "Setting up database..."
npm run db:generate
npm run db:migrate

echo "Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env if you need custom settings"
echo "2. Start the development server with: npm run dev"
echo "3. Backend will be available at http://localhost:3001"
