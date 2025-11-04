# Debug Response Differences: Vercel vs Localhost

## Problem

Same prompt: "I need laptop under 1000 dollar for work, please advise"

**Vercel Response:**
- Shows "0 units in stock"
- Generic response
- Doesn't provide specific recommendations
- Says "No specific product was selected"

**Localhost Response:**
- Detailed recommendations (Core i5, 8GB RAM, 256GB SSD, etc.)
- Helpful advice about screen size, battery life
- Actionable recommendations
- Better structured

## Possible Causes

### 1. **USE_TURN_ORCHESTRATOR Setting Mismatch**

**Check:**
- Localhost `.env`: `USE_TURN_ORCHESTRATOR=true` or `false`?
- Vercel env var: `USE_TURN_ORCHESTRATOR` set to what value?

**Impact:**
- If Vercel has `USE_TURN_ORCHESTRATOR=false`, it uses legacy flow (less sophisticated)
- If Localhost has `USE_TURN_ORCHESTRATOR=true`, it uses turn orchestrator (better)

### 2. **Different Azure Search Results**

**Possible reasons:**
- Different Azure Search index data
- Different search query being generated
- Different filters being applied
- Different retrieval limits

**How to check:**
- Compare Azure Search logs between Vercel and localhost
- Check if same products are being retrieved

### 3. **General Recommendation Query Not Detected**

The query "laptop under 1000 dollar" should be detected as a general recommendation query.

**Check `entityResolverService.isGeneralRecommendationQuery()`:**
- Pattern: `/(laptop|phone|tv).*(below|under|less than|around|about|max|budget)/i`
- Should match: "laptop under 1000 dollar"

**If not detected:**
- `active_sku` might be set incorrectly
- `candidate_skus` might not be populated
- Retrieval might search for single SKU instead of general

### 4. **Product Search Not Finding Results**

**Check `productSearchService.searchProducts()`:**
- Is it finding products for "laptop under 1000"?
- Are products being returned with valid SKUs?
- Is `candidate_skus` being populated?

### 5. **Different Store Data**

**Check:**
- Vercel: Store data might not be loaded (read-only filesystem)
- Localhost: Store data from `backend/data/stores.json`
- Different stores = different stock availability

### 6. **Different Conversation State**

**Check:**
- Vercel: Fresh conversation (no state)
- Localhost: Might have persisted conversation state
- Different state = different context

### 7. **LLM Response Variations**

Even with same prompt, LLMs can return different responses:
- Different tokens/words
- Different level of detail
- Different formatting

**But this shouldn't explain:**
- "0 units" vs detailed recommendations
- Missing product recommendations

## Debugging Steps

### Step 1: Check Environment Variables

**Vercel:**
```bash
# Check USE_TURN_ORCHESTRATOR
vercel env ls | grep USE_TURN_ORCHESTRATOR
```

**Localhost:**
```bash
# Check .env file
cat backend/.env | grep USE_TURN_ORCHESTRATOR
```

### Step 2: Check Logs

**Vercel:**
- Check Vercel logs for:
  - `[TurnOrchestrator]` messages
  - `[EntityResolver]` messages
  - `[RAG]` retrieval messages
  - Product search results

**Localhost:**
- Check console logs for same messages
- Compare retrieval results

### Step 3: Check Entity Resolution

Look for logs showing:
```
[EntityResolver] General recommendation query detected
[EntityResolver] Found candidate_skus: [xxx, yyy, zzz]
```

If Vercel doesn't show these, entity resolution might be failing.

### Step 4: Check Product Search

Look for logs showing:
```
[ProductSearch] Found X products for query: "laptop under 1000"
```

If Vercel doesn't find products, Azure Search might be:
- Returning different results
- Not configured correctly
- Missing data

### Step 5: Check Retrieval

Look for logs showing:
```
[RAG] General query - retrieved X chunks from all SKUs
```

If Vercel shows fewer chunks or different SKUs, retrieval is different.

## Quick Fixes to Try

### Fix 1: Ensure USE_TURN_ORCHESTRATOR is Enabled

**Vercel:**
1. Go to Vercel Dashboard → Backend → Settings → Environment Variables
2. Set: `USE_TURN_ORCHESTRATOR=true`
3. Redeploy

### Fix 2: Check Azure Search Index

Verify both environments are using:
- Same Azure Search endpoint
- Same Azure Search index
- Same API key

### Fix 3: Verify Store Data

For Vercel, stores might not be loaded. Check:
- Are stores being fetched from API?
- Is fallback store data available?
- Is store_id being sent correctly?

### Fix 4: Add Debug Logging

Add console.log statements to track:
- Entity resolution results
- Product search results
- Retrieval results
- LLM prompt being sent

## Expected Behavior

For "laptop under 1000 dollar":

1. **Entity Resolution:**
   - Detects: `isGeneralRecommendation = true`
   - Extracts: `budget = 1000`, `category = laptop`, `use_case = work`
   - Searches: `productSearchService.searchProducts("laptop under 1000", 5)`
   - Returns: `candidate_skus = [sku1, sku2, sku3, sku4, sku5]`
   - Does NOT set `active_sku`

2. **Retrieval:**
   - Retrieves chunks for ALL candidate SKUs
   - Gets diverse chunks from multiple products
   - Returns: `topChunks` with multiple SKUs

3. **Generation:**
   - Receives chunks from multiple SKUs
   - Detects: `isGeneralRecommendation = true`
   - Generates: Detailed recommendations with specs
   - Includes: Product names and SKUs for options

4. **Response:**
   - Shows 3-5 laptop options
   - Includes specs (Core i5, 8GB RAM, etc.)
   - Provides advice on screen size, battery, etc.
   - Shows stock for found products

## Next Steps

1. Check `USE_TURN_ORCHESTRATOR` setting in both environments
2. Compare Vercel and localhost logs
3. Verify Azure Search is returning same results
4. Check if general recommendation query is being detected

