# Testing the NoelIQ UI

## Quick Start Testing

### 1. **Ensure Backend and Frontend are Running**

Backend should be on port 5000:
```bash
cd backend && npm run dev
```

Frontend should be on port 3000:
```bash
cd frontend && npm run dev
```

### 2. **Set Up Authentication Token**

The UI requires a token for API access. Open your browser's Developer Console (F12) and run:

```javascript
localStorage.setItem('noeliq_token', 'YOUR_STAFF_TOKEN_HERE')
```

Replace `YOUR_STAFF_TOKEN_HERE` with the value from your `backend/.env` file under `STAFF_TOKEN`.

Or use this one-liner to get it from your .env:
```bash
grep STAFF_TOKEN backend/.env | cut -d'=' -f2
```

### 3. **Access the UI**

Open your browser to: **http://localhost:3000**

You should see the Sales Assistant interface.

### 4. **Test Queries**

#### Option A: With a Specific Product (SKU)

1. In the **SKU / Product Name** field, enter a product SKU from your XML (e.g., `237383`)
2. In the **Your Question** field, enter a question like:
   - "What are the key features of this product?"
   - "Is this good for gaming?"
   - "What's the price and are there any offers?"
   - "What are the warranty terms?"

3. Click **Ask** or press Enter

#### Option B: General Question (No SKU)

1. Leave the SKU field empty
2. Enter a general question like:
   - "What TV accessories do you have?"
   - "Show me gaming laptops"
   - "What products are on clearance?"

3. Click **Ask**

### 5. **What to Look For**

After asking a question, you should see:

- ✅ **Answer text** - The AI-generated response
- ✅ **Key sell points** - Bulleted list of important features
- ✅ **Recommended attachments** - Related products (if any)
- ✅ **Availability** - Stock information (if SKU provided)
- ✅ **Citations** - References to source chunks (for debugging)

### 6. **Common Test Cases**

Try these queries to verify different features:

1. **Pricing Query:**
   ```
   SKU: 237383
   Question: What's the price of this product?
   ```

2. **Feature Query:**
   ```
   SKU: 237383
   Question: What are the key features?
   ```

3. **Offer Query:**
   ```
   SKU: 237383
   Question: Are there any special offers or discounts?
   ```

4. **General Search:**
   ```
   SKU: (leave empty)
   Question: Tell me about TV adapters
   ```

### 7. **Debugging**

If queries fail:

1. **Check Browser Console (F12):**
   - Look for API errors
   - Check network tab for failed requests

2. **Check Backend Logs:**
   ```bash
   # Backend should show request logs
   ```

3. **Verify Token:**
   ```javascript
   // In browser console
   console.log(localStorage.getItem('noeliq_token'))
   ```

4. **Check Backend Health:**
   ```bash
   curl http://localhost:5000/api/health
   ```

5. **Test API Directly:**
   ```bash
   curl -X POST http://localhost:5000/api/ask \
     -H "Authorization: Bearer YOUR_STAFF_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"question": "What products do you have?", "sku": "237383"}'
   ```

### 8. **Expected Response Structure**

```json
{
  "answer_text": "Based on the product information...",
  "key_sell_points": [
    "Feature 1",
    "Feature 2"
  ],
  "recommended_attachments": [
    {
      "sku": "123456",
      "name": "Product Name",
      "why_sell": "Reason"
    }
  ],
  "availability": {
    "this_store_qty": null,
    "nearby": [],
    "fulfilment": ""
  },
  "alternative_if_oos": {
    "alt_sku": null,
    "alt_name": null,
    "why_this_alt": null,
    "key_diff": null
  },
  "citations": ["chunk_123...", "chunk_456..."]
}
```

### 9. **Testing After Indexing**

Once your reindex is complete (all 101,176 chunks indexed), you can test:

- ✅ Semantic search works (finding products by meaning, not exact keywords)
- ✅ Vector similarity search (finding similar products)
- ✅ Filtering by price, offers, clearance status
- ✅ Multi-product queries (comparing products)

---

**Note:** The UI uses React and should hot-reload when you make changes. If you don't see updates, try refreshing the browser.

