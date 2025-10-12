-- tasks テーブルに archived_at カラムを追加
ALTER TABLE `tasks` ADD `archived_at` text;--> statement-breakpoint
-- archived_tasks テーブルのデータを tasks テーブルに戻す
INSERT INTO `tasks` (`id`, `user_id`, `content`, `column_id`, `created_at`, `archived_at`, `order`)
SELECT `id`, `user_id`, `content`, `column_id`, `created_at`, `archived_at`, `order`
FROM `archived_tasks`;--> statement-breakpoint
-- archived_tasks テーブルを削除
DROP TABLE `archived_tasks`;