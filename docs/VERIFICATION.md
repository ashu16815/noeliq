# NoelIQ System Verification Guide

## Quick Verification

Run the verification script to check all system components:

```bash
cd /Users/323905/Documents/VibeCoding/NoelIQ
node pipeline/verifySystem.js
```

## Azure Portal Verification

Check the Azure AI Search portal to confirm:

1. **Index Status**
   - Index name: `noeliq-products`
   - Document count: Should show **131,476+ documents**
   - Vector index quota: Should show **1.51 GB**
   - Total storage: Should show **5.14 GB**

2. **What to Look For**
   - ✅ High document count (100k+) indicates all chunks indexed
   - ✅ Vector index quota shows embeddings are stored
   - ✅ Total storage confirms data is persisted

## Component Checklist

### ✅ Azure AI Search
- [x] Index exists: `noeliq-products`
- [x] Documents indexed: 131,476
- [x] Vector embeddings stored: 1.51 GB
- [x] Search working: Can retrieve chunks

### ✅ Embeddings
- [x] Model: `text-embedding-3-large`
- [x] Dimensions: 3072
- [x] Generation working: Test passes

### ✅ RAG (Retrieval-Augmented Generation)
- [x] Vector search working
- [x] Chunks retrieved: 5 per query (configurable)
- [x] Embeddings attached to chunks

### ✅ Product Search
- [x] Natural language search working
- [x] Products found and displayed
- [x] SKU auto-fill working

### ✅ Data Files
- [x] Stores: 115 stores loaded
- [x] Logs: Available
- [ ] Parsed products: Optional (data in Azure Search)
- [ ] Sync status: Optional (for incremental updates)

### ✅ Backend API
- [x] Server running on port 5000
- [x] `/api/ask` endpoint working
- [x] `/api/stores` endpoint working
- [x] `/api/products/search` endpoint working

### ✅ Frontend
- [x] React app building
- [x] Chat interface working
- [x] Store selector working
- [x] Product search working

## Verification Script Output

When running `verifySystem.js`, you should see:

```
✅ PASS Azure AI Search Index
✅ PASS Vector Search
✅ PASS Embedding Generation
✅ PASS Product Search
✅ PASS Environment Configuration
⚠️  WARN Data Files (some optional files missing - OK)
```

## Troubleshooting

### If documents show 0 or low count:
1. Check if reindex completed: `tail /tmp/reindex.log`
2. Verify Azure credentials in `.env`
3. Check Azure portal for index status

### If vector search fails:
1. Verify embeddings model is deployed
2. Check `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` in `.env`
3. Test embedding generation: `node -e "import('./backend/lib/azureOpenAIClient.js').then(m => m.embeddingClient.getEmbeddings(['test']).then(console.log))"`

### If API returns errors:
1. Check backend logs: `tail /tmp/backend.log`
2. Verify authentication token: `localStorage.getItem('noeliq_token')`
3. Check backend is running: `curl http://localhost:5000/api/health`

## Expected Numbers

- **Total Documents**: ~131,476 (matches Azure portal)
- **Products**: ~14,621 products
- **Chunks per Product**: ~7 chunks average
- **Unique SKUs**: 698+ (from sample queries)
- **Vector Embeddings**: 3072 dimensions each
- **Storage**: ~5.14 GB total

## Success Indicators

✅ **System is ready when:**
- Azure portal shows 131,476+ documents
- Verification script shows all ✅ PASS
- API queries return results
- Frontend can search and display products
- Store selector shows 115 stores

## Next Steps

Once verified:
1. Test UI queries in the chat interface
2. Try natural language product search
3. Test store selection and availability
4. Verify stock information displays correctly
