# Vercel Log Analysis Guide

## Understanding Log Status Codes

### Successful Status Codes
- **200 OK**: Request completed successfully
- **204 No Content**: Request successful but no content to return (OPTIONS requests)
- **304 Not Modified**: Resource hasn't changed (caching)

### Problematic Status Codes
- **---**: Incomplete or failed request (no status code)
- **401 Unauthorized**: Authentication failed
- **404 Not Found**: Endpoint not found
- **500 Internal Server Error**: Server error
- **502 Bad Gateway**: Upstream server error

## What to Check

### 1. Click on the Red Bars in Timeline
- Red bars indicate errors/warnings
- Click on them to see the actual error messages
- Check the "Messages" column for details

### 2. Check the `POST ---` Entry
- Click on the entry with `---` status
- Check the "Messages" column for error details
- Look at the right panel for full request/response details

### 3. Filter by Error Level
- Use the "Contains Console Level" filter
- Check "Error" and "Fatal" boxes
- This will show only error-level logs

### 4. Check Request Path
- Filter by "Request Path" if you see specific endpoints failing
- Common problematic paths: `/api/ask`, `/api/stores`

## Common Issues and Fixes

### Issue: `POST ---` Status
**Possible causes:**
- Request timeout
- Function execution timeout
- Network error
- Serverless function crash

**Fix:**
- Check function execution duration in right panel
- Look for timeout errors in messages
- Check if environment variables are set

### Issue: Red Bars but No Visible Errors
**Possible causes:**
- Errors occurred but are now filtered out
- Warnings that don't show in current view
- Errors in a different time period

**Fix:**
- Expand timeline to see more history
- Check "Warning" level in filters
- Look at different time periods

### Issue: 401 Unauthorized
**Fix:**
- Ensure `STAFF_TOKEN=staff-access` is set in backend env vars
- Check frontend is sending auth token

### Issue: 404 Not Found
**Fix:**
- Check endpoint paths (should be `/api/ask`, not `/ask`)
- Verify `VITE_API_BASE_URL` includes `/api`
- Check backend routes are properly configured

## How to Investigate

1. **Click on red bars** to see error details
2. **Click on `---` entry** to see what went wrong
3. **Check "Messages" column** for error messages
4. **Look at right panel** for:
   - Function invocation details
   - Execution duration
   - Error messages
   - Request/response details

## Next Steps

1. Click on the red bars in the timeline to see error details
2. Click on the `POST ---` entry to see what happened
3. Share the error messages you see, and I can help fix them

