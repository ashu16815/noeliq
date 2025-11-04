# Fix JSON Parsing Warnings

## Problem

Vercel logs show warnings:
1. `LLM intent classification failed, using pattern-based: No valid JSON found in LLM response`
2. `[QueryRewriter] JSON parse error, trying to fix: Unexpected end of JSON input`

These warnings cause:
- **Intent classifier** to fall back to pattern-based detection (less accurate)
- **Query rewriter** to fall back to simple rewriting (less sophisticated)
- **Different responses** between Vercel and localhost

## Root Cause

1. **Incomplete JSON responses** from Azure OpenAI
   - LLM sometimes returns incomplete JSON (cut off mid-response)
   - Network latency or timeout in Vercel might cause incomplete responses
   - LLM might add text before/after JSON

2. **JSON extraction issues**
   - Not properly extracting JSON from markdown code blocks
   - Not handling text before/after JSON
   - Not fixing incomplete JSON (missing closing braces)

3. **Insufficient token limits**
   - `maxTokens: 200` for intent classifier might be too low
   - `maxTokens: 500` for query rewriter might be too low
   - Responses get cut off before completion

## Fixes Applied

### 1. Increased Token Limits
- **Intent Classifier**: `200` → `300` tokens
- **Query Rewriter**: `500` → `600` tokens
- Ensures complete JSON responses

### 2. Added JSON Response Format
- Added `response_format: { type: 'json_object' }` to force JSON responses
- Should make Azure OpenAI return pure JSON (if supported)

### 3. Improved JSON Extraction
- Better regex matching to extract JSON from text
- Handles markdown code blocks
- Extracts JSON even if surrounded by text

### 4. Enhanced JSON Fixing
- Counts opening/closing braces to fix incomplete JSON
- Adds missing closing braces automatically
- Tries to find last complete JSON object

### 5. Better Error Handling
- More detailed error logging (300 char previews)
- Clearer fallback messages
- Better recovery when JSON parsing fails

### 6. Improved Prompts
- More explicit: "Return ONLY valid JSON, no markdown, no code blocks"
- Added "CRITICAL" emphasis on JSON-only requirement
- Clearer instructions about JSON format

## Expected Impact

After these fixes:
- ✅ Fewer JSON parsing errors
- ✅ More reliable intent classification
- ✅ Better query rewriting
- ✅ More consistent responses between Vercel and localhost
- ✅ Better fallback handling when errors occur

## Testing

After deployment, test with:
- Query: "I need laptop under 1000 dollar for work, please advise"
- Should see:
  - No JSON parsing warnings in logs
  - Detailed recommendations like localhost
  - Proper intent classification
  - Good query rewriting

## Monitoring

Watch for these in Vercel logs:
- ✅ No more "Unexpected end of JSON input" warnings
- ✅ No more "No valid JSON found in LLM response" warnings
- ✅ Intent classifier using LLM (not pattern-based fallback)
- ✅ Query rewriter using LLM (not fallback rewrite)

## If Warnings Persist

If warnings still occur:
1. Check Azure OpenAI API response format support
2. Verify `response_format` is being passed correctly
3. Consider increasing token limits further
4. Add retry logic for incomplete responses
5. Consider using a different model that's more JSON-reliable

