# NoelIQ Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Azure account with:
  - Azure OpenAI resource (with gpt-4o and text-embedding-3-large deployments)
  - Azure AI Search resource
- PostgreSQL database (optional, for metadata storage)

## Quick Start

### 1. Clone and Install

```bash
cd /path/to/NoelIQ

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your Azure credentials

# Frontend
cd ../frontend
npm install
# Create .env file with: VITE_API_BASE_URL=http://localhost:5000/api
```

### 2. Configure Azure Services

#### Azure OpenAI
1. Create Azure OpenAI resource in Azure Portal
2. Deploy models:
   - `gpt-4o` for chat completions
   - `text-embedding-3-large` for embeddings
3. Get endpoint and API key
4. Update `backend/.env`:
   ```
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-key
   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
   AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large
   ```

#### Azure AI Search
1. Create Azure AI Search resource
2. Create index using `infra/azure-search-index-definition.json`
3. Get endpoint and API key
4. Update `backend/.env`:
   ```
   AZURE_SEARCH_ENDPOINT=https://your-service.search.windows.net
   AZURE_SEARCH_API_KEY=your-key
   AZURE_SEARCH_INDEX_NAME=noeliq-products
   ```

#### Data Storage
- **No database needed!** The system uses JSON file storage in `backend/data/`
- Files are automatically created when you first use the system:
  - `sync-status.json` - Product sync status
  - `logs.json` - Usage logs
  - `parsed-products.json` - Parsed product catalogue

### 3. Set Authentication Tokens

Update `backend/.env`:
```
ADMIN_TOKEN=your-secure-admin-token
STAFF_TOKEN=your-secure-staff-token
```

### 4. Run Services

#### Terminal 1: Backend
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

#### Terminal 2: Frontend
```bash
cd frontend
npm run dev
# App runs on http://localhost:3000
```

### 5. Load Initial Data

1. Open Admin Dashboard: http://localhost:3000/admin
2. Upload XML product catalogue
3. Wait for parsing to complete
4. Click "Reindex" for changed SKUs (or wait for automated process)

### 6. Test

1. Open Sales View: http://localhost:3000/sales
2. Enter a SKU from your catalogue
3. Ask: "Is this good for gaming?"
4. Verify answer appears

## Development Notes

### Project Structure
```
NoelIQ/
├── frontend/        # React + Vite frontend
├── backend/         # Express backend API
├── pipeline/        # Data processing scripts
├── prompts/         # LLM prompt templates
├── infra/           # Infrastructure configs
└── docs/            # Documentation
```

### Key Files
- `backend/app.js` - Main Express server
- `backend/routes/ask.js` - Q&A endpoint
- `backend/services/generationService.js` - LLM answer generation
- `frontend/src/pages/SalesAssistantView.tsx` - Main UI
- `prompts/noeliq_system_prompt.md` - System prompt template

### Common Tasks

**Reindex all products:**
```bash
node pipeline/runFullReindex.js data/catalog.xml
```

**Reindex specific SKUs:**
```bash
node pipeline/runIncrementalUpdate.js SKU1 SKU2 SKU3
```

**Check backend health:**
```bash
curl http://localhost:5000/api/health
```

## Troubleshooting

### Backend won't start
- Check `.env` file exists and has all required variables
- Verify Azure credentials are correct
- Check port 5000 isn't in use

### Frontend can't connect to backend
- Verify backend is running on port 5000
- Check `VITE_API_BASE_URL` in frontend `.env`
- Check browser console for CORS errors

### "Let me check" for all questions
- Verify Azure AI Search index is created and populated
- Check embeddings were generated correctly
- Review sync status in admin dashboard

### Slow responses
- Check Azure OpenAI quota/limits
- Reduce chunk retrieval count in `ragRetrievalService.js`
- Monitor network latency

## Next Steps

1. Review `docs/MVP-scope.md` for MVP priorities
2. Read `docs/Pilot-store-runbook.md` for deployment guide
3. Customize prompts in `prompts/` for your brand voice
4. Adapt XML parser in `backend/services/xmlParserService.js` to your schema

## Support

For issues:
1. Check logs in backend console
2. Review admin dashboard for sync status
3. Verify Azure service status pages
4. Consult troubleshooting sections in documentation

