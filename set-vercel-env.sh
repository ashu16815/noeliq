#!/bin/bash

# Script to set all environment variables for single Vercel project
# Usage: ./set-vercel-env.sh <project-name>

PROJECT_NAME=${1:-"noeliq"}

echo "Setting environment variables for Vercel project: $PROJECT_NAME"
echo "Note: You'll need to provide actual values for Azure services"
echo ""

# Read actual values from user or use defaults
read -p "Enter Azure OpenAI Endpoint: " AZURE_OPENAI_ENDPOINT
read -p "Enter Azure OpenAI API Key: " AZURE_OPENAI_API_KEY
read -p "Enter Azure Search Endpoint: " AZURE_SEARCH_ENDPOINT
read -p "Enter Azure Search API Key: " AZURE_SEARCH_API_KEY
read -p "Enter Admin Token (or press Enter for default): " ADMIN_TOKEN
ADMIN_TOKEN=${ADMIN_TOKEN:-"admin-token-$(openssl rand -hex 16)"}

# Set environment variables for Production, Preview, and Development
ENVIRONMENTS=("production" "preview" "development")

for env in "${ENVIRONMENTS[@]}"; do
  echo ""
  echo "Setting variables for $env environment..."
  
  # Azure OpenAI
  vercel env add AZURE_OPENAI_ENDPOINT "$env" <<< "$AZURE_OPENAI_ENDPOINT"
  vercel env add AZURE_OPENAI_API_KEY "$env" <<< "$AZURE_OPENAI_API_KEY"
  vercel env add AZURE_OPENAI_DEPLOYMENT_NAME "$env" <<< "gpt-4o"
  vercel env add AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME "$env" <<< "text-embedding-3-large"
  
  # Azure Search
  vercel env add AZURE_SEARCH_ENDPOINT "$env" <<< "$AZURE_SEARCH_ENDPOINT"
  vercel env add AZURE_SEARCH_API_KEY "$env" <<< "$AZURE_SEARCH_API_KEY"
  vercel env add AZURE_SEARCH_INDEX_NAME "$env" <<< "noeliq-products"
  
  # Server
  vercel env add PORT "$env" <<< "5000"
  vercel env add NODE_ENV "$env" <<< "production"
  
  # Auth
  vercel env add ADMIN_TOKEN "$env" <<< "$ADMIN_TOKEN"
  vercel env add STAFF_TOKEN "$env" <<< "staff-access"
  
  # RAG
  vercel env add RAG_CHUNK_LIMIT "$env" <<< "5"
  vercel env add USE_OPTIMIZED_RAG "$env" <<< "false"
  vercel env add USE_TURN_ORCHESTRATOR "$env" <<< "true"
  
  # Frontend URL (will be updated after deployment)
  vercel env add FRONTEND_URL "$env" <<< "https://$PROJECT_NAME.vercel.app"
done

echo ""
echo "✅ All environment variables set!"
echo "Next step: Deploy the project with 'vercel --prod'"
