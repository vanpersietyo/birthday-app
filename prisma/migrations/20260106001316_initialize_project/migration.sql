-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRY');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('BIRTHDAY', 'ANNIVERSARY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "birthday" VARCHAR(10) NOT NULL,
    "timezone" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'BIRTHDAY',
    "message" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_date" VARCHAR(10) NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "lock_id" VARCHAR(100),
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_birthday_idx" ON "users"("birthday");

-- CreateIndex
CREATE INDEX "message_logs_user_id_idx" ON "message_logs"("user_id");

-- CreateIndex
CREATE INDEX "message_logs_status_idx" ON "message_logs"("status");

-- CreateIndex
CREATE INDEX "message_logs_scheduled_date_idx" ON "message_logs"("scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "message_logs_user_id_message_type_scheduled_date_key" ON "message_logs"("user_id", "message_type", "scheduled_date");

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
