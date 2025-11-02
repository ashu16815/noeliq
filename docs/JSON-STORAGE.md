# JSON File Storage Architecture

## Overview

NoelIQ uses JSON file storage instead of a database for simplicity and MVP requirements. All data is stored in the `backend/data/` directory.

## Storage Files

### `sync-status.json`
Stores product synchronization status for each SKU.

**Structure:**
```json
[
  {
    "sku": "SKU123",
    "status": "synced",
    "needs_reembed": false,
    "last_seen_hash": "abc123...",
    "last_embedded_hash": "abc123...",
    "last_successful_embed_ts": "2025-11-02T10:00:00Z",
    "error_message": null,
    "created_at": "2025-11-01T10:00:00Z",
    "updated_at": "2025-11-02T10:00:00Z"
  }
]
```

### `logs.json`
Stores usage logs (questions, answers, metrics).

**Structure:**
```json
[
  {
    "timestamp": "2025-11-02T10:00:00Z",
    "store_id": "store_001",
    "staff_id": "staff_123",
    "sku": "SKU123",
    "question": "Is this good for gaming?",
    "answer_len": 245,
    "oos_alternative_shown": false,
    "attachments_suggested": true
  }
]
```

**Note:** Only the last 10,000 logs are kept to prevent file from growing too large.

### `parsed-products.json`
Stores the parsed product catalogue keyed by SKU.

**Structure:**
```json
{
  "SKU123": {
    "sku": "SKU123",
    "name": "LG C3 OLED 55",
    "brand": "LG",
    "category": "TV",
    "specs": { ... },
    "features": [ ... ],
    "source_label": "nightly_feed_2025-11-02",
    "last_parsed_ts": "2025-11-02T10:00:00Z"
  },
  "_metadata": {
    "last_source_label": "nightly_feed_2025-11-02",
    "last_parsed_ts": "2025-11-02T10:00:00Z",
    "total_skus": 1234
  }
}
```

## File Management

### Automatic Creation
- Files are automatically created when first accessed
- Directory (`backend/data/`) is created on module load
- Missing files return empty arrays/objects by default

### Backup Recommendations
- Regularly backup `backend/data/` directory
- Consider automated backups before major operations
- Keep backups of parsed products for disaster recovery

### Performance Considerations
- File operations are synchronous (one at a time)
- For large catalogues (10k+ SKUs), consider:
  - Batching operations
  - Using a database for production scale
  - Implementing file locking for concurrent writes

## Migration to Database (Future)

If you need to migrate to a database later:
1. Export JSON files to CSV or JSON format
2. Use migration scripts to import into PostgreSQL
3. Update `dbClient.js` to use database instead of files
4. Keep JSON files as backup during migration

## File Size Limits

- **sync-status.json**: Typically small (< 1MB for 10k SKUs)
- **logs.json**: Auto-trimmed to last 10,000 entries
- **parsed-products.json**: Can grow large; monitor size for very large catalogues

For catalogues with 50k+ products, consider:
- Splitting by category
- Using compression
- Moving to database storage

