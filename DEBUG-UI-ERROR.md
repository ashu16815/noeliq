# Debugging UI Error: "I'm sorry, I encountered an error"

## Current Status

✅ **Backend API is working** - Tests show successful responses  
❌ **Frontend shows error** - Need to check browser

## Quick Checks

### 1. Check Browser Console
Press `F12` → Console tab, look for:
- Network errors
- Timeout errors
- Authentication errors
- Any red error messages

### 2. Check Network Tab
Press `F12` → Network tab:
- Find the `/api/ask` request
- Check Status code (should be 200)
- Check Response tab to see actual API response
- Check Timing to see if it times out

### 3. Verify Authentication Token
In browser console (F12), run:
```javascript
localStorage.getItem('noeliq_token')
```
Should return: `staff-access`

If not, set it:
```javascript
localStorage.setItem('noeliq_token', 'staff-access')
```

### 4. Check Frontend is Running
Frontend should be on: http://localhost:3000

### 5. Restart Frontend
```bash
cd frontend
npm run dev
```

## Common Issues

1. **Timeout**: Queries take 6+ seconds, default timeout might be too short
   - **Fixed**: Increased to 30 seconds in `apiClient.ts`
   - **Action**: Restart frontend

2. **Missing Auth Token**: API requires token
   - **Action**: Set token in localStorage (see above)

3. **CORS Error**: Cross-origin request blocked
   - **Check**: Backend should allow all origins (it does)

4. **Network Error**: Can't reach backend
   - **Check**: `curl http://localhost:5000/api/health`

## What to Check Now

1. Open browser DevTools (F12)
2. Go to Console tab
3. Make a query in the UI
4. Look for error messages
5. Share the error message you see

The new error logging should show details like:
- `Error details: { message: ..., timeout: ..., status: ... }`

