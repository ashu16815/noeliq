# NoelIQ - AI-Powered Retail Sales Assistant

AI-powered sales floor assistant for Noel Leeming using RAG (Retrieval-Augmented Generation) with Azure OpenAI and Azure AI Search.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm run install:all

# Start backend (terminal 1)
cd backend && npm start

# Start frontend (terminal 2)
cd frontend && npm run dev
```

Visit: http://localhost:5173

### Production Deployment

See [DEPLOY.md](./DEPLOY.md) for Vercel deployment instructions.

## 📚 Documentation

- [Deployment Guide](./docs/DEPLOYMENT.md)
- [RAG Optimization](./docs/RAG_OPTIMIZATION.md)
- [Environment Variables](./backend/ENV.md)
- [Testing Guide](./docs/TESTING-UI.md)

## 🏗️ Architecture

- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Node.js + Express
- **AI**: Azure OpenAI (GPT-5-mini, text-embedding-3-large)
- **Search**: Azure AI Search (vector + hybrid search)
- **Storage**: JSON files (MVP), ready for database migration

## 📦 Features

- Natural language product search
- Intelligent product recommendations
- Stock availability checking
- Conversational chat interface
- Store selection
- Alternative product suggestions

## 🔧 Configuration

Copy `backend/env.template` to `backend/.env` and fill in your Azure credentials.

## 📄 License

ISC

**NoelIQ is the in-store intelligent retail assistant for Noel Leeming.** It turns every consultant on the floor into the most knowledgeable expert in the store.

## Project Overview

NoelIQ is an AI-powered selling assistant with instant expert answers. Store staff can scan/enter a SKU, ask any question in plain English, and get a reliable answer instantly - complete with stock availability, alternative recommendations, and attachment suggestions.

## Architecture

The system follows a **Retrieval-Augmented Generation (RAG)** architecture:
- Document ingestion and chunking from XML product catalogue
- Embedding generation via Azure OpenAI (text-embedding-3-large)
- Vector indexing in Azure AI Search
- Semantic search and retrieval
- Answer generation via Azure OpenAI (gpt-4o/GPT-5)

## Repository Structure

```
NoelIQ/
├── frontend/          # React/Next.js frontend application
├── backend/           # Node.js + Express backend services
├── pipeline/          # Data ingestion and indexing scripts
├── prompts/           # LLM prompt templates
├── infra/             # Infrastructure configuration
└── docs/              # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- Azure OpenAI account
- Azure AI Search account
- PostgreSQL (optional, for metadata storage)

### Installation

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Configuration

1. Copy `infra/azure-openai-config.md` and fill in your Azure credentials
2. Configure `infra/azure-search-index-definition.json`
3. Set up environment variables (see `.env.example` files)

### Running Locally

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

## MVP Scope

See `docs/MVP-scope.md` for detailed MVP requirements and success criteria.

## Documentation

- [MVP Scope](docs/MVP-scope.md)
- [Pilot Store Runbook](docs/Pilot-store-runbook.md)
- [Admin Dashboard Operations](docs/Admin-dashboard-operations.md)

## Branding

- **Primary Colors**: Noel Leeming red (#e4002b), Dark charcoal (#1a1a1a), White/off-white (#ffffff/#f8f8f8), Accent yellow/gold
- **Tone of Voice**: Confident but friendly, clear and customer-first, practical and helpful, honest

## License

Proprietary - Noel Leeming Internal Use Only

