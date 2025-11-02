# Creating Azure AI Search Index

## Issue
The index creation script may fail due to Azure SDK version differences. Here are manual steps and alternatives.

## Option 1: Create via Azure Portal (Recommended)

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to your Azure AI Search service**: `noeliq-ai-search`
3. **Click "Indexes"** in the left menu
4. **Click "+ Add index"** or "Create index"
5. **Basic settings**:
   - Index name: `noeliq-products`
6. **Add Fields** (one by one):

   | Field Name | Type | Key | Searchable | Filterable | Sortable | Retrievable |
   |------------|------|-----|------------|------------|----------|-------------|
   | chunk_id | Edm.String | ✓ | - | ✓ | - | ✓ |
   | sku | Edm.String | - | - | ✓ | ✓ | ✓ |
   | section_title | Edm.String | - | ✓ | - | - | ✓ |
   | section_body | Edm.String | - | ✓ | - | - | ✓ |
   | embedding_vector | Collection(Edm.Single) | - | - | - | - | ✓ |
   | warranty_restrictions | Edm.String | - | - | ✓ | - | ✓ |
   | last_updated_ts | Edm.DateTimeOffset | - | - | ✓ | ✓ | ✓ |
   | source_hash | Edm.String | - | - | ✓ | - | ✓ |

7. **For embedding_vector field**:
   - Dimensions: `3072` (for text-embedding-3-large)
   - Vector Search Profile: `default-vector-profile`

8. **Configure Vector Search**:
   - Go to "Vector Search" tab
   - Add Algorithm:
     - Name: `default-algorithm`
     - Type: `HNSW`
     - Metric: `Cosine`
     - M: `4`
     - efConstruction: `400`
     - efSearch: `500`
   - Add Profile:
     - Name: `default-vector-profile`
     - Algorithm: `default-algorithm`

9. **Create the index**

## Option 2: Use REST API

```bash
# Get your admin key from Azure Portal
ADMIN_KEY="your-admin-key"
ENDPOINT="https://noeliq-ai-search.search.windows.net"
INDEX_NAME="noeliq-products"

curl -X PUT "${ENDPOINT}/indexes/${INDEX_NAME}?api-version=2023-11-01" \
  -H "Content-Type: application/json" \
  -H "api-key: ${ADMIN_KEY}" \
  -d @infra/azure-search-index-definition.json
```

## Option 3: Fix and run script

The script at `backend/createIndex.js` should work once the JSON format is correct.

## Verify Index Creation

After creating, verify:
1. Go to Azure Portal → Your Search Service → Indexes
2. You should see `noeliq-products` listed
3. Click on it to see field definitions

## Next Steps

Once the index exists, run the reindex:
```bash
node pipeline/runFullReindex.js pipeline/data-source/noelleeming_catalogue.xml
```

