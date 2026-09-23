CREATE TABLE `review_artifacts` (
 `id` text PRIMARY KEY NOT NULL, `source_document_id` text NOT NULL, `title` text NOT NULL,
 `review_type` text NOT NULL, `detail_level` text NOT NULL, `scope` text, `question_count` integer NOT NULL,
 `include_model_answers` integer NOT NULL, `content_json` text NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL
);
