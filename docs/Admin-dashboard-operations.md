# Admin Dashboard Operations Guide

## Overview

The Admin Dashboard is used to manage product catalogue data, monitor sync status, and troubleshoot issues.

## Access

- URL: `https://noeliq.noelleeming.co.nz/admin`
- Authentication: Admin token required (set in `ADMIN_TOKEN` environment variable)

## Main Functions

### 1. Upload XML Catalogue

#### When to Use
- Initial data load
- Weekly/monthly catalogue updates
- After product data changes in source system

#### Steps
1. Click "Upload XML Catalogue"
2. Select XML file from your computer
3. (Optional) Enter source label (e.g., `nightly_feed_2025-11-02`)
4. Click "Upload & Process XML"
5. Wait for parsing to complete (may take a few minutes for large files)

#### What Happens
- XML is parsed into product records
- Changes are detected (new/changed/removed SKUs)
- Sync status is updated
- **Note**: Embedding and indexing happens separately (use Reindex button)

#### Troubleshooting
- **Upload fails**: Check XML format is valid
- **No products parsed**: Verify XML structure matches expected format
- **Error message displayed**: Read error details and fix XML or contact support

### 2. Sync Status Table

#### Status Indicators
- **🟢 Synced (green)**: Product fully indexed and ready
- **🟡 Stale (amber)**: Changes detected but not yet re-embedded
- **🔴 Error (red)**: Error during processing

#### Actions
- **Reindex**: Click "Reindex" button to reprocess a specific SKU
- **Bulk Reindex**: Use `/admin/reindex` API endpoint with list of SKUs

#### When to Reindex
- After XML upload with changes
- When sync status shows "stale"
- After fixing product data issues
- When answers are inaccurate (may indicate embedding issue)

### 3. Recent Activity Logs

#### What's Logged
- Timestamp
- SKU
- Action (parse, chunk, embed, index)
- Status (success, error, warning)
- Error message (if any)

#### How to Use
- Monitor for errors after uploads/reindexes
- Identify problematic SKUs
- Track processing times
- Debug issues

#### Common Log Patterns

**All Success**: Green statuses for all actions → System healthy

**Embedding Errors**: 
- Check Azure OpenAI quota/limits
- Verify embedding deployment name
- Check API key validity

**Index Errors**:
- Check Azure AI Search connection
- Verify index exists and fields match schema
- Check API key validity

## Best Practices

### Daily Checks
1. Open dashboard
2. Verify overall status is green
3. Check recent logs for errors
4. Address any red status items

### After XML Upload
1. Wait for parsing to complete
2. Check sync status table for changed SKUs
3. Review any errors in logs
4. Trigger reindex for changed SKUs (or wait for automated process)

### Weekly Tasks
1. Review logs for patterns (slow operations, recurring errors)
2. Check sync freshness (when was last successful embed?)
3. Verify all active SKUs show as synced

### Troubleshooting Specific Issues

#### Issue: SKUs stuck in "stale"
**Action**: Click "Reindex" for affected SKUs

#### Issue: Many "error" statuses
**Action**: 
1. Check logs for error messages
2. Verify Azure service status
3. Check API keys/quotas
4. Contact technical support if needed

#### Issue: Slow reindex operations
**Action**:
1. Check Azure OpenAI rate limits
2. Consider processing in smaller batches
3. Monitor concurrent operations

## API Usage

### Trigger Reindex via API
```bash
curl -X POST https://noeliq.noelleeming.co.nz/api/admin/reindex \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"skus": ["SKU1", "SKU2", "SKU3"]}'
```

### Check Sync Status via API
```bash
curl -X GET "https://noeliq.noelleeming.co.nz/api/admin/sync-status?sku=SKU123" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Security Notes

- Admin token should be rotated periodically
- Never share admin token
- Logs may contain sensitive product information - handle with care
- Use HTTPS in production

## Support

For issues not covered here:
1. Check logs for specific error messages
2. Verify Azure service status
3. Contact technical support with:
   - SKU(s) affected
   - Timestamp of issue
   - Error message from logs
   - Steps to reproduce

