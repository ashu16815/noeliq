# Differences Between Vercel and Localhost

## Why You See Different Results

### 1. **Random Stock Quantities** (Main Issue)

The availability service uses **random numbers** for stock quantities:

```javascript
// Line 69 in availabilityService.js
const thisStoreQty = Math.floor(Math.random() * 10) // 0-9 units (random!)
```

**This means:**
- Vercel: Shows random number (e.g., 1 unit)
- Localhost: Shows different random number (e.g., 9 units)
- **Every request gets a different random number**

This is why you see:
- **Vercel**: "1 unit in this store"
- **Localhost**: "9 units in this store"

### 2. **Different Store Data Sources**

**Vercel (Serverless):**
- Cannot write to files (read-only filesystem)
- Store data comes from:
  - In-memory cache (if available)
  - Fallback stores if API fails
  - May not have latest XML data

**Localhost:**
- Can read/write to `backend/data/stores.json`
- May have different or more recent store data
- Full access to parsed XML data

### 3. **Different Environment Variables**

**Vercel:**
- Uses environment variables from Vercel Dashboard
- May have different Azure Search index data
- May have different RAG chunk limits

**Localhost:**
- Uses `.env` file
- May connect to different Azure resources
- May have different configuration

### 4. **Different Conversation State**

**Vercel:**
- Conversation state stored in memory (per serverless function instance)
- State may be lost between requests
- Each cold start = fresh state

**Localhost:**
- Conversation state may persist longer
- Same Node.js process keeps state
- May have different conversation history

### 5. **LLM Response Variations**

Even with the same prompt, LLMs can return different responses:
- Different tokens/words
- Different formatting
- Different levels of detail

## The Real Issue: Mock Stock Data

The stock quantities are **mocked with random numbers**. This is a placeholder for real inventory data.

**Current code:**
```javascript
// Mock stock for this store (TODO: Replace with real inventory API)
const thisStoreQty = Math.floor(Math.random() * 10) // 0-9 units
```

**This needs to be replaced with:**
- Real inventory API calls
- Database queries
- Integration with actual stock system

## Solutions

### Option 1: Use Consistent Mock Data (For Testing)

Replace random with consistent hash-based values:

```javascript
// Use SKU + store_id to generate consistent "random" number
const hash = (sku + store_id).split('').reduce((acc, char) => 
  acc + char.charCodeAt(0), 0)
const thisStoreQty = hash % 10 // Always same number for same SKU+store
```

### Option 2: Connect to Real Inventory System

Replace mock data with real API calls to your inventory system.

### Option 3: Use Seed Value for Random

Use a seed value so "random" is consistent:

```javascript
// Use SKU as seed for consistent "random" numbers
const seed = parseInt(sku) || 0
const rng = seed % 10
const thisStoreQty = rng // Always same for same SKU
```

## Quick Fix for Testing

To make stock quantities consistent between Vercel and localhost, we can use SKU-based hashing instead of pure random.

Would you like me to implement a fix to make stock quantities consistent?

