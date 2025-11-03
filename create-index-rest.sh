#!/bin/bash
# Create Azure AI Search index using REST API
# Usage: ./create-index-rest.sh

ENDPOINT="https://your-search-service.search.windows.net"
INDEX_NAME="noeliq-products"
API_KEY="your-search-api-key-here"
API_VERSION="2023-11-01"

echo "Creating index '${INDEX_NAME}' in Azure AI Search..."

curl -X PUT "${ENDPOINT}/indexes/${INDEX_NAME}?api-version=${API_VERSION}" \
  -H "Content-Type: application/json" \
  -H "api-key: ${API_KEY}" \
  -d @infra/azure-search-index-definition.json

echo ""
echo "Done! Check Azure Portal to verify the index was created."

