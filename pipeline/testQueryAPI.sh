#!/bin/bash

# Test the query API directly from command line using curl
# Usage: ./pipeline/testQueryAPI.sh "your question" [sku]

# Get token from .env
TOKEN=$(grep STAFF_TOKEN backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
if [ -z "$TOKEN" ]; then
  TOKEN="staff-access"  # default
fi

API_URL="${API_URL:-http://localhost:5000/api}"
QUESTION="$1"
SKU="$2"

if [ -z "$QUESTION" ]; then
  echo "Usage: $0 \"your question\" [sku]"
  echo ""
  echo "Examples:"
  echo "  $0 \"What products do you have?\""
  echo "  $0 \"What are the features?\" 237383"
  echo "  $0 \"Is this on sale?\" 237383"
  exit 1
fi

echo ""
echo "🧪 Testing Query API"
echo "============================================================"
echo "Question: $QUESTION"
if [ -n "$SKU" ]; then
  echo "SKU: $SKU"
fi
echo "============================================================"
echo ""

# Build JSON payload
PAYLOAD="{"
PAYLOAD+="\"question\": \"$QUESTION\""
if [ -n "$SKU" ]; then
  PAYLOAD+=", \"sku\": \"$SKU\""
fi
PAYLOAD+=", \"conversation_id\": \"test_$(date +%s)\""
PAYLOAD+="}"

# Make request
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL/ask" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ ERROR:"
  echo "Status: $HTTP_STATUS"
  echo "Response: $BODY"
  exit 1
fi

# Pretty print JSON if jq is available, otherwise just print
if command -v jq &> /dev/null; then
  echo "✅ RESPONSE:"
  echo ""
  echo "$BODY" | jq '.'
  echo ""
  echo "📊 Summary:"
  echo "$BODY" | jq -r '"  Answer length: " + (.answer_text | tostring | length | tostring) + " characters"'
  echo "$BODY" | jq -r '"  Key sell points: " + (.key_sell_points | length | tostring)'
  echo "$BODY" | jq -r '"  Recommended attachments: " + (.recommended_attachments | length | tostring)'
  echo "$BODY" | jq -r '"  Citations: " + (.citations | length | tostring)'
  
  CITATIONS=$(echo "$BODY" | jq -r '.citations[]?' 2>/dev/null)
  if [ -n "$CITATIONS" ]; then
    echo ""
    echo "📎 Citations:"
    echo "$CITATIONS" | while read -r citation; do
      echo "  - ${citation:0:60}..."
    done
  fi
else
  # Fallback without jq
  echo "✅ RESPONSE:"
  echo ""
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
fi

echo ""

