-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sentimentScore" REAL,
    "emotions" TEXT,
    "keyTopics" TEXT,
    "therapeuticGoals" TEXT,
    "progressNotes" TEXT,
    "summary" TEXT,
    "confidenceScore" REAL,
    "processingTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "analyses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "analyses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_analyses" ("confidenceScore", "createdAt", "emotions", "id", "keyTopics", "patientId", "processingTime", "progressNotes", "sentimentScore", "sessionId", "summary", "therapeuticGoals", "updatedAt") SELECT "confidenceScore", "createdAt", "emotions", "id", "keyTopics", "patientId", "processingTime", "progressNotes", "sentimentScore", "sessionId", "summary", "therapeuticGoals", "updatedAt" FROM "analyses";
DROP TABLE "analyses";
ALTER TABLE "new_analyses" RENAME TO "analyses";
CREATE UNIQUE INDEX "analyses_sessionId_key" ON "analyses"("sessionId");
CREATE INDEX "analyses_patientId_idx" ON "analyses"("patientId");
CREATE INDEX "analyses_createdAt_idx" ON "analyses"("createdAt");
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" TEXT,
    "newValues" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_audit_logs" ("action", "createdAt", "id", "ipAddress", "newValues", "oldValues", "resource", "resourceId", "userAgent", "userId") SELECT "action", "createdAt", "id", "ipAddress", "newValues", "oldValues", "resource", "resourceId", "userAgent", "userId" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE TABLE "new_transcription_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "jobId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT
);
INSERT INTO "new_transcription_jobs" ("completedAt", "errorMessage", "id", "jobId", "metadata", "provider", "retryCount", "sessionId", "startedAt", "status") SELECT "completedAt", "errorMessage", "id", "jobId", "metadata", "provider", "retryCount", "sessionId", "startedAt", "status" FROM "transcription_jobs";
DROP TABLE "transcription_jobs";
ALTER TABLE "new_transcription_jobs" RENAME TO "transcription_jobs";
CREATE UNIQUE INDEX "transcription_jobs_sessionId_key" ON "transcription_jobs"("sessionId");
CREATE INDEX "transcription_jobs_status_idx" ON "transcription_jobs"("status");
CREATE INDEX "transcription_jobs_startedAt_idx" ON "transcription_jobs"("startedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
