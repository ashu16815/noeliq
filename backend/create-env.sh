#!/bin/bash
# Quick script to create .env from template
if [ -f .env ]; then
  echo "⚠️  .env file already exists. Backing up to .env.backup"
  cp .env .env.backup
fi
cp env.template .env
echo "✅ Created .env file from template"
echo "📝 Please edit .env and add your Azure credentials"
