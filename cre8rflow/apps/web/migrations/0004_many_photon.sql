CREATE TABLE "user_indexes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"index_id" text NOT NULL,
	"index_name" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_indexes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_indexes" ADD CONSTRAINT "user_indexes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;