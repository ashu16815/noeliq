#!/bin/bash
# Simple log viewer - refreshes every 2 seconds

echo "🔍 Watching Backend Logs (refreshing every 2 seconds)"
echo "Press Ctrl+C to stop"
echo "=================================================="
echo ""

while true; do
  clear
  echo "🔍 Backend Logs - $(date '+%H:%M:%S')"
  echo "=================================================="
  tail -30 /tmp/backend.log 2>/dev/null || echo "No log file found"
  echo ""
  echo "=================================================="
  echo "Refreshing in 2 seconds... (Ctrl+C to stop)"
  sleep 2
done

