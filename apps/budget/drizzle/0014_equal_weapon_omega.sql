CREATE TABLE `price_retailer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`domain` text,
	`website` text,
	`logo_url` text,
	`color` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_retailer_workspace_slug_idx` ON `price_retailer` (`workspace_id`,`slug`);--> statement-breakpoint
CREATE INDEX `price_retailer_workspace_idx` ON `price_retailer` (`workspace_id`);--> statement-breakpoint
ALTER TABLE `price_product` ADD `retailer_id` integer REFERENCES price_retailer(id);--> statement-breakpoint
-- Defensive pre-dedup: if any live rows share an (account_id, fitid) pair,
-- null out fitid on all but the lowest-id row so the unique index below
-- can be built. Any row whose fitid is nulled falls back to the secondary
-- date+amount duplicate check in the import orchestrator. This only
-- mutates rows that were already broken (duplicates that slipped through
-- when detection was read-then-write racy); clean databases are untouched.
UPDATE "transaction"
SET fitid = NULL
WHERE fitid IS NOT NULL
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM "transaction" AS older
    WHERE older.account_id = "transaction".account_id
      AND older.fitid = "transaction".fitid
      AND older.deleted_at IS NULL
      AND older.id < "transaction".id
  );
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_account_fitid_uq` ON `transaction` (`account_id`,`fitid`) WHERE "transaction"."fitid" IS NOT NULL AND "transaction"."deleted_at" IS NULL;