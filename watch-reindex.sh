#!/bin/bash
# Watch reindex logs in real-time with helpful info

echo "📊 Watching Full Reindex Progress"
echo "=================================="
echo ""
echo "Press Ctrl+C to stop watching (reindex will continue in background)"
echo ""

tail -f /tmp/reindex.log | while read line; do
  # Highlight important lines
  if echo "$line" | grep -qE "Indexed|Uploaded|✅"; then
    echo -e "\033[32m$line\033[0m"  # Green for success
  elif echo "$line" | grep -qE "Error|❌|Failed"; then
    echo -e "\033[31m$line\033[0m"  # Red for errors
  elif echo "$line" | grep -qE "Step|Parsed|Chunk"; then
    echo -e "\033[33m$line\033[0m"  # Yellow for progress
  else
    echo "$line"
  fi
done

