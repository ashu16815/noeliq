#!/bin/bash
# Show backend logs

echo "=== Backend Logs ==="
echo ""
tail -100 /tmp/backend.log 2>/dev/null || echo "No log file found at /tmp/backend.log"
echo ""
echo "=== To watch logs in real-time ==="
echo "Run: tail -f /tmp/backend.log"
echo ""
echo "=== To see only errors ==="
echo "Run: tail -f /tmp/backend.log | grep -i error"

