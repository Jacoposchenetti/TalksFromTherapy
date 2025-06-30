-- AlterTable
ALTER TABLE "analyses" ADD COLUMN "analysisVersion" TEXT;
ALTER TABLE "analyses" ADD COLUMN "emotionFlowerPlot" TEXT;
ALTER TABLE "analyses" ADD COLUMN "emotionalValence" REAL;
ALTER TABLE "analyses" ADD COLUMN "language" TEXT;
ALTER TABLE "analyses" ADD COLUMN "semanticFrameResults" TEXT;
ALTER TABLE "analyses" ADD COLUMN "significantEmotions" TEXT;
ALTER TABLE "analyses" ADD COLUMN "topicAnalysisResult" TEXT;
