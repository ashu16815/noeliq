#!/bin/bash
# Backend Deployment Script for Vercel
# This script prepares the backend for Vercel deployment

echo "🚀 Backend Deployment Preparation"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
  echo "❌ Error: Please run this script from the NoelIQ root directory"
  exit 1
fi

echo "✅ Backend structure verified"
echo ""
echo "📋 Next Steps for Vercel:"
echo ""
echo "1. Go to: https://vercel.com/dashboard"
echo "2. Click 'Add New' → 'Project'"
echo "3. Import your GitHub repository: noeliq"
echo "4. Configure:"
echo "   - Root Directory: backend"
echo "   - Framework Preset: Other"
echo "   - Build Command: (leave empty)"
echo "   - Output Directory: (leave empty)"
echo "5. Before deploying, add environment variables (see VERCEL_ENV_VARS.md)"
echo ""
echo "Required Environment Variables:"
echo "  - AZURE_OPENAI_ENDPOINT"
echo "  - AZURE_OPENAI_API_KEY"
echo "  - AZURE_OPENAI_DEPLOYMENT_NAME"
echo "  - AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME"
echo "  - AZURE_SEARCH_ENDPOINT"
echo "  - AZURE_SEARCH_API_KEY"
echo "  - AZURE_SEARCH_INDEX_NAME"
echo "  - PORT=5000"
echo "  - NODE_ENV=production"
echo "  - ADMIN_TOKEN"
echo "  - STAFF_TOKEN"
echo "  - RAG_CHUNK_LIMIT=5"
echo "  - USE_OPTIMIZED_RAG=false"
echo ""
echo "After deployment, save the backend URL for frontend configuration!"


