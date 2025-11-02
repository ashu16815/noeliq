#!/bin/bash
# Watch backend logs in real-time

echo "Watching backend logs... (Press Ctrl+C to stop)"
echo "Make a query in the UI to see the logs"
echo "=========================================="
tail -f /tmp/backend.log

