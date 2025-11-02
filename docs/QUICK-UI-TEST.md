# Quick UI Testing Guide

## 🚀 Step-by-Step Testing

### 1. **Open the UI in Your Browser**

Frontend should be running at: **http://localhost:3000**

If it's not running:
```bash
cd frontend && npm run dev
```

### 2. **Set Authentication Token**

Open your browser's **Developer Console** (Press `F12` or `Cmd+Option+I` on Mac)

Run this command in the console:
```javascript
localStorage.setItem('noeliq_token', 'staff-access')
```

To verify it's set:
```javascript
console.log(localStorage.getItem('noeliq_token'))
```

Should print: `staff-access`

### 3. **Refresh the Page**

After setting the token, refresh the page (`Cmd+R` or `F5`)

### 4. **Test a Query**

#### Example 1: Product-Specific Question
1. **SKU field**: Enter `237383`
2. **Question field**: Enter `What are the key features of this product?`
3. Click **Ask** or press Enter

#### Example 2: Pricing Question
1. **SKU field**: Enter `237383`
2. **Question field**: Enter `What's the price and are there any offers?`
3. Click **Ask**

#### Example 3: General Question (No SKU)
1. **SKU field**: Leave empty
2. **Question field**: Enter `What TV accessories do you have?`
3. Click **Ask**

### 5. **What You Should See**

After asking, you should see:
- 📝 **Answer text** - The AI response
- ✅ **Key sell points** - Bullet points with important features
- 🔗 **Recommended attachments** - Related products (if any)
- 📊 **Availability** - Stock info (if SKU provided)
- 📎 **Citations** - Source chunk references (for debugging)

### 6. **Troubleshooting**

#### ❌ "Unauthorized" Error
- Check that token is set: `console.log(localStorage.getItem('noeliq_token'))`
- Verify backend has `STAFF_TOKEN=staff-access` in `backend/.env`

#### ❌ "Network Error" or No Response
- Check backend is running: `curl http://localhost:5000/api/health`
- Check frontend is running: Open http://localhost:3000
- Check browser console (F12) for errors

#### ❌ Generic Error Message
- Check backend terminal for error logs
- The index might not have enough data yet (need to finish reindexing)
- Try a simple question first: `"What products do you have?"`

### 7. **Test Scripts Available**

You can also test from command line:

```bash
# Test API directly
./pipeline/testQueryAPI.sh "What are the features?" 237383

# Test processing
node pipeline/testProcessing.js pipeline/data-source/noelleeming_catalogue.xml 3

# Verify what gets indexed
node pipeline/verifyIndexing.js pipeline/data-source/noelleeming_catalogue.xml 2
```

### 8. **Expected Behavior**

**While Reindexing (Only 3,500/101,176 chunks indexed):**
- ✅ Queries should work with the indexed chunks
- ⚠️ Some products might not be found if not yet indexed
- ✅ Vector search will work on available chunks

**After Full Reindex Completes:**
- ✅ All products searchable
- ✅ Better semantic search results
- ✅ More accurate answers

### 9. **Browser DevTools Tips**

To monitor API calls:
1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by "ask"
4. Click on the request to see:
   - Request payload (your question)
   - Response data (the answer)
   - Response time
   - Status code

### 10. **Sample Test Queries**

Try these to test different features:

| SKU | Question | What to Test |
|-----|----------|--------------|
| `237383` | `What are the key features?` | Feature extraction |
| `237383` | `What's the price?` | Pricing data |
| `237383` | `Are there any offers?` | Offer detection |
| (empty) | `What TV adapters do you have?` | Semantic search |
| (empty) | `Show me products on clearance` | Filtering |

---

**Ready to test?** Open http://localhost:3000 and start asking questions! 🎉

