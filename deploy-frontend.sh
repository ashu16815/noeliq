#!/bin/bash
# Frontend Deployment Script for Vercel
# This script prepares the frontend for Vercel deployment

echo "🎨 Frontend Deployment Preparation"
echo "==================================="
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
  echo "❌ Error: Please run this script from the NoelIQ root directory"
  exit 1
fi

echo "✅ Frontend structure verified"
echo ""
echo "📋 Next Steps for Vercel:"
echo ""
echo "1. Go to: https://vercel.com/dashboard"
echo "2. Click 'Add New' → 'Project'"
echo "3. Import your GitHub repository: noeliq (same repo!)"
echo "4. Configure:"
echo "   - Root Directory: frontend"
echo "   - Framework Preset: Vite"
echo "   - Build Command: npm run build (auto-filled)"
echo "   - Output Directory: dist (auto-filled)"
echo ""
echo "Required Environment Variable:"
echo "  VITE_API_BASE_URL=https://YOUR_BACKEND_URL/api"
echo ""
echo "⚠️  Replace YOUR_BACKEND_URL with your actual backend deployment URL!"
echo ""
echo "Example:"
echo "  VITE_API_BASE_URL=https://noeliq-api-xyz123.vercel.app/api"


