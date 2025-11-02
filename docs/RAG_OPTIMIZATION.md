# RAG Optimization Strategy

## Overview

The optimized RAG retrieval strategy addresses the challenge of handling thousands of product chunks efficiently while maintaining high answer quality.

## Problem Statement

- Product XML creates **thousands of chunks** once parsed and embedded (~101k chunks for 14k products)
- Azure OpenAI has token limits (~16k–128k tokens depending on model)
- Many chunks are redundant or low-value
- Dumping all chunks → diluted context → worse answer quality

## Solution: Optimized Retrieval Pipeline

### 1. Hybrid Search

Combines semantic vector search + keyword/lexical match in the same query:

```javascript
{
  search: question,              // keyword/lexical match
  vectors: [{
    value: questionEmbedding,
    fields: "embeddingVector",
    k: 30                       // retrieve top 30 semantic matches
  }],
  filter: "category eq 'TV'",   // metadata filters
  top: 30                       // total hybrid top N
}
```

**Benefits:**
- Lexical match ensures exact product terms (model numbers, features) aren't lost
- Semantic search ensures conceptual similarity
- Azure AI Search automatically combines both

### 2. Intelligent Chunking at Ingestion

Chunks are created by semantic sections (not fixed token size):

- **Section Types**: Product Overview, Features, Specifications, Pricing, etc.
- **Importance Scores**: Each section has a score (0.0–1.0) indicating retrieval priority
  - Product Overview: 1.0 (most important)
  - Selling Points: 0.9
  - Features: 0.8
  - Specifications: 0.7
  - Pricing: 0.6
  - Warranty: 0.3

### 3. Rerank Before Sending to LLM

After getting ~30 top results:

1. **Filter by score threshold**: Reject chunks with `@search.score < 0.55`
2. **Deduplicate**: Group by `(sku, section_type)` and keep highest-scoring
3. **Ensure diversity**: Prioritize different section types and SKUs
4. **Keep top N**: Final ~10 highest-scoring, diverse chunks

### 4. Context Summarization (Optional)

Before calling main LLM, if context exceeds token limits:

- Run lightweight summarizer (`gpt-4o-mini`) to compress 10 chunks → single summary (~1k tokens)
- Preserves all product-specific facts
- Reduces token usage for main LLM

### 5. Dynamic Context Windowing

Adaptive chunk limits based on question type:

| Situation | Chunks | Model |
|-----------|--------|-------|
| Quick Q (e.g., "refresh rate?") | 3–5 | gpt-5-mini |
| Broad Q (e.g., "best for gaming under $2k") | 8–12 | Optimized → gpt-5-mini |
| Compare 2 SKUs | 6 each (12 total) | Optimized → gpt-5-mini |

### 6. Metadata Filters

Reduce noise before retrieval:

```javascript
filter: "brand eq 'Samsung' and category eq 'Television' and importance_score ge 0.5"
```

### 7. Score Threshold

Reject low-relevance chunks:

```javascript
results = results.filter(r => r['@search.score'] >= 0.55)
```

Below threshold, noise outweighs benefit.

## Configuration

### Environment Variables

```bash
# Standard RAG configuration
RAG_CHUNK_LIMIT=5              # Final chunks sent to LLM

# Optimized RAG configuration
USE_OPTIMIZED_RAG=true         # Enable optimized retrieval
```

### Optimized RAG Config (in code)

```javascript
{
  azure_search_top: 30,           // Initial retrieval for reranking
  rerank_max_chunks: 10,           // Final chunks after reranking
  chunk_score_threshold: 0.55,     // Minimum relevance score
  max_context_tokens: 5000,        // Max tokens before summarization
  use_summarization: true,          // Enable context compression
}
```

## Optimized Pipeline Flow

```
User Question
   ↓
Embed Question → Azure AI Search hybrid query
   (vector + keyword, k=30)
   ↓
Filter by score threshold (>0.55)
   ↓
Rerank + Deduplicate + Diversify
   (keep max 10 chunks, diverse sections)
   ↓
Optional: Summarize if >5000 tokens
   (gpt-4o-mini → compressed summary)
   ↓
Compose final prompt
   (system + context + question)
   ↓
Call main LLM (gpt-5-mini)
   ↓
Return structured JSON answer
```

## Index Schema Updates

Added fields to support optimization:

- `section_type` (Edm.String): Type of chunk (Product Overview, Features, etc.)
- `importance_score` (Edm.Double): Retrieval priority score (0.0–1.0)

Both fields are:
- Filterable (can use in filters)
- Sortable (`importance_score`)
- Facetable (`section_type`)

## Usage

### Enable Optimized RAG

1. Update `backend/.env`:
   ```bash
   USE_OPTIMIZED_RAG=true
   RAG_CHUNK_LIMIT=10
   ```

2. Restart backend server

3. Optimized retrieval will be used automatically

### Performance Benefits

- **Reduced token usage**: 10 optimized chunks vs 30+ raw chunks
- **Better answer quality**: Focused, high-relevance context
- **Faster responses**: Less context = faster LLM processing
- **Cost savings**: Fewer tokens = lower API costs

## Migration Path

1. **Current**: Simple vector search (5 chunks)
2. **Phase 1**: Enable optimized RAG with same limit (test quality)
3. **Phase 2**: Increase limit to 10 chunks (optimized handles it well)
4. **Phase 3**: Enable summarization for very long contexts

## Monitoring

Check backend logs for:
- `[RAG] Context too large (X tokens), summarizing...` - Summarization triggered
- `[Query] Extracted SKU from chunks: X` - SKU extraction working
- `[Query] Found X relevant chunks (requested: Y)` - Retrieval results

## Troubleshooting

### If optimized RAG fails:
- Falls back to simple retrieval automatically
- Check logs for error messages
- Verify index has `section_type` and `importance_score` fields

### If answers are less relevant:
- Lower `chunk_score_threshold` (try 0.45)
- Increase `azure_search_top` (try 50)
- Check if chunks have proper `importance_score` values
