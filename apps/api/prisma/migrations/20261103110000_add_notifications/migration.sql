CREATE TYPE "notification_delivery_status" AS ENUM ('PENDING', 'PROCESSING', 'RETRY_PENDING', 'SENT', 'FAILED', 'DISABLED');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "recipient_id" UUID NOT NULL,
  "actor_id" UUID,
  "event_type" VARCHAR(80) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "resource_type" VARCHAR(60),
  "resource_id" VARCHAR(100),
  "action_url" VARCHAR(500),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "dedupe_key" VARCHAR(220) NOT NULL,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "event_type" VARCHAR(80) NOT NULL,
  "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "push_enabled" BOOLEAN NOT NULL DEFAULT false,
  "email_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_deliveries" (
  "id" UUID NOT NULL,
  "notification_id" UUID NOT NULL,
  "channel" VARCHAR(30) NOT NULL,
  "status" "notification_delivery_status" NOT NULL DEFAULT 'PENDING',
  "provider" VARCHAR(60),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "next_attempt_at" TIMESTAMP(3),
  "last_attempt_at" TIMESTAMP(3),
  "last_error" VARCHAR(1000),
  "delivered_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "provider_message_id" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
CREATE INDEX "notifications_recipient_id_read_at_created_at_idx" ON "notifications"("recipient_id", "read_at", "created_at");
CREATE INDEX "notifications_organization_id_event_type_created_at_idx" ON "notifications"("organization_id", "event_type", "created_at");
CREATE UNIQUE INDEX "notification_preferences_user_id_event_type_key" ON "notification_preferences"("user_id", "event_type");
CREATE INDEX "notification_preferences_user_id_in_app_enabled_idx" ON "notification_preferences"("user_id", "in_app_enabled");
CREATE UNIQUE INDEX "notification_deliveries_notification_id_channel_key" ON "notification_deliveries"("notification_id", "channel");
CREATE INDEX "notification_deliveries_status_next_attempt_at_idx" ON "notification_deliveries"("status", "next_attempt_at");

CREATE TABLE "push_devices" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "expo_push_token" VARCHAR(255) NOT NULL,
  "device_platform" VARCHAR(20) NOT NULL,
  "device_name" VARCHAR(120),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_devices_expo_push_token_key" ON "push_devices"("expo_push_token");
CREATE INDEX "push_devices_user_id_is_active_idx" ON "push_devices"("user_id", "is_active");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
