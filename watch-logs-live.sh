#!/bin/bash
# Watch logs in real-time with colored output

echo "🔍 Watching Backend Logs - Make a query in the UI!"
echo "=================================================="
echo ""
echo "📦 Test Product:"
echo "   SKU: 237383"
echo "   Question: 'What are the key features?'"
echo ""
echo "📺 Logs (press Ctrl+C to stop):"
echo "=================================================="
tail -f /tmp/backend.log

