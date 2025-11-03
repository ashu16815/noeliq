#!/bin/bash
# Script to set all backend environment variables in Vercel

echo "🔐 Setting Backend Environment Variables in Vercel"
echo "=================================================="
echo ""

# IMPORTANT: Replace these placeholder values with your actual credentials
# Get values from your local .env file or Azure Portal
# Never commit actual API keys to Git!

AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_API_KEY="your-api-key-here"
AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o"
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME="text-embedding-3-large"
AZURE_SEARCH_ENDPOINT="https://your-search-service.search.windows.net"
AZURE_SEARCH_API_KEY="your-search-api-key-here"
AZURE_SEARCH_INDEX_NAME="noeliq-products"
PORT="5000"
NODE_ENV="production"
ADMIN_TOKEN="admin-access"
STAFF_TOKEN="staff-access"
RAG_CHUNK_LIMIT="5"
USE_OPTIMIZED_RAG="false"

cd backend

echo "Setting environment variables..."
echo ""

# Set all variables for Production, Preview, and Development
vercel env add AZURE_OPENAI_ENDPOINT production <<< "$AZURE_OPENAI_ENDPOINT" 2>&1 || vercel env rm AZURE_OPENAI_ENDPOINT production --yes && vercel env add AZURE_OPENAI_ENDPOINT production <<< "$AZURE_OPENAI_ENDPOINT"
vercel env add AZURE_OPENAI_ENDPOINT preview <<< "$AZURE_OPENAI_ENDPOINT" 2>&1 || vercel env rm AZURE_OPENAI_ENDPOINT preview --yes && vercel env add AZURE_OPENAI_ENDPOINT preview <<< "$AZURE_OPENAI_ENDPOINT"
vercel env add AZURE_OPENAI_ENDPOINT development <<< "$AZURE_OPENAI_ENDPOINT" 2>&1 || vercel env rm AZURE_OPENAI_ENDPOINT development --yes && vercel env add AZURE_OPENAI_ENDPOINT development <<< "$AZURE_OPENAI_ENDPOINT"

vercel env add AZURE_OPENAI_API_KEY production <<< "$AZURE_OPENAI_API_KEY" 2>&1 || vercel env rm AZURE_OPENAI_API_KEY production --yes && vercel env add AZURE_OPENAI_API_KEY production <<< "$AZURE_OPENAI_API_KEY"
vercel env add AZURE_OPENAI_API_KEY preview <<< "$AZURE_OPENAI_API_KEY" 2>&1 || vercel env rm AZURE_OPENAI_API_KEY preview --yes && vercel env add AZURE_OPENAI_API_KEY preview <<< "$AZURE_OPENAI_API_KEY"
vercel env add AZURE_OPENAI_API_KEY development <<< "$AZURE_OPENAI_API_KEY" 2>&1 || vercel env rm AZURE_OPENAI_API_KEY development --yes && vercel env add AZURE_OPENAI_API_KEY development <<< "$AZURE_OPENAI_API_KEY"

vercel env add AZURE_OPENAI_DEPLOYMENT_NAME production <<< "$AZURE_OPENAI_DEPLOYMENT_NAME" 2>&1 || vercel env rm AZURE_OPENAI_DEPLOYMENT_NAME production --yes && vercel env add AZURE_OPENAI_DEPLOYMENT_NAME production <<< "$AZURE_OPENAI_DEPLOYMENT_NAME"
vercel env add AZURE_OPENAI_DEPLOYMENT_NAME preview <<< "$AZURE_OPENAI_DEPLOYMENT_NAME" 2>&1 || vercel env rm AZURE_OPENAI_DEPLOYMENT_NAME preview --yes && vercel env add AZURE_OPENAI_DEPLOYMENT_NAME preview <<< "$AZURE_OPENAI_DEPLOYMENT_NAME"
vercel env add AZURE_OPENAI_DEPLOYMENT_NAME development <<< "$AZURE_OPENAI_DEPLOYMENT_NAME" 2>&1 || vercel env rm AZURE_OPENAI_DEPLOYMENT_NAME development --yes && vercel env add AZURE_OPENAI_DEPLOYMENT_NAME development <<< "$AZURE_OPENAI_DEPLOYMENT_NAME"

vercel env add AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME production <<< "$AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME" 2>&1 || vercel env rm AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME production --yes && vercel env add AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME production <<< "$AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME"
vercel env add AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME preview <<< "$AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME" 2>&1 || vercel env rm AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME preview --yes && vercel env add AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME preview <<< "$AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME"
vercel env add AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME development <<< "$AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME" 2>&1 || vercel env rm AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME development --yes && vercel env add AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME development <<< "$AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME"

vercel env add AZURE_SEARCH_ENDPOINT production <<< "$AZURE_SEARCH_ENDPOINT" 2>&1 || vercel env rm AZURE_SEARCH_ENDPOINT production --yes && vercel env add AZURE_SEARCH_ENDPOINT production <<< "$AZURE_SEARCH_ENDPOINT"
vercel env add AZURE_SEARCH_ENDPOINT preview <<< "$AZURE_SEARCH_ENDPOINT" 2>&1 || vercel env rm AZURE_SEARCH_ENDPOINT preview --yes && vercel env add AZURE_SEARCH_ENDPOINT preview <<< "$AZURE_SEARCH_ENDPOINT"
vercel env add AZURE_SEARCH_ENDPOINT development <<< "$AZURE_SEARCH_ENDPOINT" 2>&1 || vercel env rm AZURE_SEARCH_ENDPOINT development --yes && vercel env add AZURE_SEARCH_ENDPOINT development <<< "$AZURE_SEARCH_ENDPOINT"

vercel env add AZURE_SEARCH_API_KEY production <<< "$AZURE_SEARCH_API_KEY" 2>&1 || vercel env rm AZURE_SEARCH_API_KEY production --yes && vercel env add AZURE_SEARCH_API_KEY production <<< "$AZURE_SEARCH_API_KEY"
vercel env add AZURE_SEARCH_API_KEY preview <<< "$AZURE_SEARCH_API_KEY" 2>&1 || vercel env rm AZURE_SEARCH_API_KEY preview --yes && vercel env add AZURE_SEARCH_API_KEY preview <<< "$AZURE_SEARCH_API_KEY"
vercel env add AZURE_SEARCH_API_KEY development <<< "$AZURE_SEARCH_API_KEY" 2>&1 || vercel env rm AZURE_SEARCH_API_KEY development --yes && vercel env add AZURE_SEARCH_API_KEY development <<< "$AZURE_SEARCH_API_KEY"

vercel env add AZURE_SEARCH_INDEX_NAME production <<< "$AZURE_SEARCH_INDEX_NAME" 2>&1 || vercel env rm AZURE_SEARCH_INDEX_NAME production --yes && vercel env add AZURE_SEARCH_INDEX_NAME production <<< "$AZURE_SEARCH_INDEX_NAME"
vercel env add AZURE_SEARCH_INDEX_NAME preview <<< "$AZURE_SEARCH_INDEX_NAME" 2>&1 || vercel env rm AZURE_SEARCH_INDEX_NAME preview --yes && vercel env add AZURE_SEARCH_INDEX_NAME preview <<< "$AZURE_SEARCH_INDEX_NAME"
vercel env add AZURE_SEARCH_INDEX_NAME development <<< "$AZURE_SEARCH_INDEX_NAME" 2>&1 || vercel env rm AZURE_SEARCH_INDEX_NAME development --yes && vercel env add AZURE_SEARCH_INDEX_NAME development <<< "$AZURE_SEARCH_INDEX_NAME"

vercel env add PORT production <<< "$PORT" 2>&1 || vercel env rm PORT production --yes && vercel env add PORT production <<< "$PORT"
vercel env add PORT preview <<< "$PORT" 2>&1 || vercel env rm PORT preview --yes && vercel env add PORT preview <<< "$PORT"
vercel env add PORT development <<< "$PORT" 2>&1 || vercel env rm PORT development --yes && vercel env add PORT development <<< "$PORT"

vercel env add NODE_ENV production <<< "$NODE_ENV" 2>&1 || vercel env rm NODE_ENV production --yes && vercel env add NODE_ENV production <<< "$NODE_ENV"
vercel env add NODE_ENV preview <<< "$NODE_ENV" 2>&1 || vercel env rm NODE_ENV preview --yes && vercel env add NODE_ENV preview <<< "$NODE_ENV"
vercel env add NODE_ENV development <<< "$NODE_ENV" 2>&1 || vercel env rm NODE_ENV development --yes && vercel env add NODE_ENV development <<< "$NODE_ENV"

vercel env add ADMIN_TOKEN production <<< "$ADMIN_TOKEN" 2>&1 || vercel env rm ADMIN_TOKEN production --yes && vercel env add ADMIN_TOKEN production <<< "$ADMIN_TOKEN"
vercel env add ADMIN_TOKEN preview <<< "$ADMIN_TOKEN" 2>&1 || vercel env rm ADMIN_TOKEN preview --yes && vercel env add ADMIN_TOKEN preview <<< "$ADMIN_TOKEN"
vercel env add ADMIN_TOKEN development <<< "$ADMIN_TOKEN" 2>&1 || vercel env rm ADMIN_TOKEN development --yes && vercel env add ADMIN_TOKEN development <<< "$ADMIN_TOKEN"

vercel env add STAFF_TOKEN production <<< "$STAFF_TOKEN" 2>&1 || vercel env rm ADMIN_TOKEN production --yes && vercel env add STAFF_TOKEN production <<< "$STAFF_TOKEN"
vercel env add STAFF_TOKEN preview <<< "$STAFF_TOKEN" 2>&1 || vercel env rm STAFF_TOKEN preview --yes && vercel env add STAFF_TOKEN preview <<< "$STAFF_TOKEN"
vercel env add STAFF_TOKEN development <<< "$STAFF_TOKEN" 2>&1 || vercel env rm STAFF_TOKEN development --yes && vercel env add STAFF_TOKEN development <<< "$STAFF_TOKEN"

vercel env add RAG_CHUNK_LIMIT production <<< "$RAG_CHUNK_LIMIT" 2>&1 || vercel env rm RAG_CHUNK_LIMIT production --yes && vercel env add RAG_CHUNK_LIMIT production <<< "$RAG_CHUNK_LIMIT"
vercel env add RAG_CHUNK_LIMIT preview <<< "$RAG_CHUNK_LIMIT" 2>&1 || vercel env rm RAG_CHUNK_LIMIT preview --yes && vercel env add RAG_CHUNK_LIMIT preview <<< "$RAG_CHUNK_LIMIT"
vercel env add RAG_CHUNK_LIMIT development <<< "$RAG_CHUNK_LIMIT" 2>&1 || vercel env rm RAG_CHUNK_LIMIT development --yes && vercel env add RAG_CHUNK_LIMIT development <<< "$RAG_CHUNK_LIMIT"

vercel env add USE_OPTIMIZED_RAG production <<< "$USE_OPTIMIZED_RAG" 2>&1 || vercel env rm USE_OPTIMIZED_RAG production --yes && vercel env add USE_OPTIMIZED_RAG production <<< "$USE_OPTIMIZED_RAG"
vercel env add USE_OPTIMIZED_RAG preview <<< "$USE_OPTIMIZED_RAG" 2>&1 || vercel env rm USE_OPTIMIZED_RAG preview --yes && vercel env add USE_OPTIMIZED_RAG preview <<< "$USE_OPTIMIZED_RAG"
vercel env add USE_OPTIMIZED_RAG development <<< "$USE_OPTIMIZED_RAG" 2>&1 || vercel env rm USE_OPTIMIZED_RAG development --yes && vercel env add USE_OPTIMIZED_RAG development <<< "$USE_OPTIMIZED_RAG"

echo ""
echo "✅ Environment variables set!"
echo "🔄 Redeploying backend to apply changes..."
vercel --prod






