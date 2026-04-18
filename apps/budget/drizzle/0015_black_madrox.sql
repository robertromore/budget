CREATE INDEX `price_product_retailer_id_idx` ON `price_product` (`retailer_id`);--> statement-breakpoint
-- Seed price_retailer from existing product retailer strings
INSERT INTO price_retailer (workspace_id, slug, name, created_at, updated_at)
SELECT DISTINCT workspace_id, retailer,
  CASE retailer
    WHEN 'amazon' THEN 'Amazon'
    WHEN 'walmart' THEN 'Walmart'
    WHEN 'target' THEN 'Target'
    WHEN 'bestbuy' THEN 'Best Buy'
    WHEN 'ebay' THEN 'eBay'
    WHEN 'newegg' THEN 'Newegg'
    WHEN 'costco' THEN 'Costco'
    WHEN 'homedepot' THEN 'Home Depot'
    WHEN 'lowes' THEN 'Lowes'
    WHEN 'adorama' THEN 'Adorama'
    WHEN 'bhphoto' THEN 'B&H Photo'
    WHEN 'dwr' THEN 'Design Within Reach'
    WHEN 'lumens' THEN 'Lumens'
    WHEN '2modern' THEN '2Modern'
    ELSE UPPER(SUBSTR(retailer, 1, 1)) || SUBSTR(retailer, 2)
  END,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM price_product
WHERE retailer IS NOT NULL AND retailer != '' AND deleted_at IS NULL;
--> statement-breakpoint
-- Backfill retailer_id on existing products
UPDATE price_product SET retailer_id = (
  SELECT pr.id FROM price_retailer pr
  WHERE pr.workspace_id = price_product.workspace_id
  AND pr.slug = price_product.retailer
)
WHERE retailer_id IS NULL;