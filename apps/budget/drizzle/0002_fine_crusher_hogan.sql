ALTER TABLE `transaction` ADD `fitid` text;--> statement-breakpoint
CREATE INDEX `transaction_fitid_idx` ON `transaction` (`fitid`);