-- NoelIQ Database Schema
-- PostgreSQL schema for sync status, logs, and metadata

-- Sync Status Table
CREATE TABLE IF NOT EXISTS sync_status (
    sku VARCHAR(255) PRIMARY KEY,
    last_seen_hash VARCHAR(64),
    last_embedded_hash VARCHAR(64),
    needs_reembed BOOLEAN DEFAULT false,
    last_successful_embed_ts TIMESTAMP,
    status VARCHAR(20) DEFAULT 'stale' CHECK (status IN ('synced', 'stale', 'error')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_status_status ON sync_status(status);
CREATE INDEX idx_sync_status_needs_reembed ON sync_status(needs_reembed);

-- Usage Logs Table
CREATE TABLE IF NOT EXISTS usage_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    store_id VARCHAR(50),
    staff_id VARCHAR(50),
    sku VARCHAR(255),
    question TEXT,
    answer_len INTEGER,
    oos_alternative_shown BOOLEAN DEFAULT false,
    attachments_suggested BOOLEAN DEFAULT false,
    conversation_id VARCHAR(255)
);

CREATE INDEX idx_usage_logs_timestamp ON usage_logs(timestamp DESC);
CREATE INDEX idx_usage_logs_store_id ON usage_logs(store_id);
CREATE INDEX idx_usage_logs_sku ON usage_logs(sku);
CREATE INDEX idx_usage_logs_conversation_id ON usage_logs(conversation_id);

-- Pipeline Activity Logs
CREATE TABLE IF NOT EXISTS pipeline_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sku VARCHAR(255),
    action VARCHAR(50), -- 'parse', 'chunk', 'embed', 'index'
    status VARCHAR(20), -- 'success', 'error', 'warning'
    error_message TEXT,
    metadata JSONB
);

CREATE INDEX idx_pipeline_logs_timestamp ON pipeline_logs(timestamp DESC);
CREATE INDEX idx_pipeline_logs_sku ON pipeline_logs(sku);
CREATE INDEX idx_pipeline_logs_status ON pipeline_logs(status);

-- Parsed Products Cache (optional - for quick retrieval)
CREATE TABLE IF NOT EXISTS parsed_products (
    sku VARCHAR(255) PRIMARY KEY,
    product_data JSONB,
    source_label VARCHAR(255),
    last_parsed_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parsed_products_source ON parsed_products(source_label);

-- Update trigger for sync_status
CREATE OR REPLACE FUNCTION update_sync_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_status_updated_at
    BEFORE UPDATE ON sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_status_updated_at();

