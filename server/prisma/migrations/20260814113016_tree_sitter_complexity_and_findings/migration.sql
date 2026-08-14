/*
  Warnings:

  - You are about to drop the column `analysisId` on the `Finding` table. All the data in the column will be lost.
  - You are about to drop the column `codeSnippet` on the `Finding` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `Finding` table. All the data in the column will be lost.
  - You are about to drop the column `issue` on the `Finding` table. All the data in the column will be lost.
  - You are about to drop the column `lineNumber` on the `Finding` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Finding` table. All the data in the column will be lost.
  - You are about to drop the column `suggestion` on the `Finding` table. All the data in the column will be lost.
  - You are about to drop the `Analysis` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `explanation` to the `Finding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file` to the `Finding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `line` to the `Finding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `Finding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recommendation` to the `Finding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ruleId` to the `Finding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scanId` to the `Finding` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Analysis" DROP CONSTRAINT "Analysis_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "Finding" DROP CONSTRAINT "Finding_analysisId_fkey";

-- AlterTable
ALTER TABLE "Finding" DROP COLUMN "analysisId",
DROP COLUMN "codeSnippet",
DROP COLUMN "filePath",
DROP COLUMN "issue",
DROP COLUMN "lineNumber",
DROP COLUMN "reason",
DROP COLUMN "suggestion",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "explanation" TEXT NOT NULL,
ADD COLUMN     "file" TEXT NOT NULL,
ADD COLUMN     "line" INTEGER NOT NULL,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "metrics" JSONB,
ADD COLUMN     "recommendation" TEXT NOT NULL,
ADD COLUMN     "ruleId" TEXT NOT NULL,
ADD COLUMN     "scanId" TEXT NOT NULL,
ADD COLUMN     "symbol" TEXT;

-- DropTable
DROP TABLE "Analysis";

-- CreateTable
CREATE TABLE "RepositoryScan" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "analyzedFiles" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositoryScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryFile" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "importanceScore" INTEGER,

    CONSTRAINT "RepositoryFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileClassification" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "FileClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileMetrics" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "linesOfCode" INTEGER NOT NULL,
    "functionCount" INTEGER NOT NULL,
    "componentCount" INTEGER NOT NULL,
    "hookUsage" INTEGER NOT NULL,
    "avgFunctionLength" DOUBLE PRECISION NOT NULL,
    "largestFunction" INTEGER NOT NULL,
    "nestingDepth" INTEGER NOT NULL,
    "dependencyCount" INTEGER NOT NULL,
    "deadCodeIndicators" INTEGER NOT NULL DEFAULT 0,
    "cyclomaticComplexity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cognitiveComplexity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duplicateCodeBlocks" INTEGER NOT NULL DEFAULT 0,
    "contentHash" TEXT,

    CONSTRAINT "FileMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityFinding" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "snippet" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,

    CONSTRAINT "SecurityFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DependencyGraph" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "cycles" JSONB,
    "hotspots" JSONB,
    "metrics" JSONB,

    CONSTRAINT "DependencyGraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthScore" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "maintainability" INTEGER NOT NULL,
    "security" INTEGER NOT NULL,
    "architecture" INTEGER NOT NULL,
    "documentation" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,

    CONSTRAINT "HealthScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureModel" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "frontendLayer" TEXT,
    "apiLayer" TEXT,
    "serviceLayer" TEXT,
    "dataLayer" TEXT,
    "authLayer" TEXT,
    "summary" TEXT,

    CONSTRAINT "ArchitectureModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingGuide" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "entryPoints" JSONB NOT NULL,
    "moduleFlow" JSONB NOT NULL,

    CONSTRAINT "OnboardingGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileDocumentation" (
    "id" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "purpose" TEXT,
    "architecture" TEXT,
    "source" TEXT NOT NULL DEFAULT 'analysis',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FileDocumentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileClassification_fileId_key" ON "FileClassification"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "FileMetrics_fileId_key" ON "FileMetrics"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "DependencyGraph_scanId_key" ON "DependencyGraph"("scanId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthScore_scanId_key" ON "HealthScore"("scanId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchitectureModel_scanId_key" ON "ArchitectureModel"("scanId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingGuide_scanId_key" ON "OnboardingGuide"("scanId");

-- CreateIndex
CREATE UNIQUE INDEX "FileDocumentation_userId_repoFullName_filePath_key" ON "FileDocumentation"("userId", "repoFullName", "filePath");

-- AddForeignKey
ALTER TABLE "RepositoryScan" ADD CONSTRAINT "RepositoryScan_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryFile" ADD CONSTRAINT "RepositoryFile_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "RepositoryScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileClassification" ADD CONSTRAINT "FileClassification_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "RepositoryFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileMetrics" ADD CONSTRAINT "FileMetrics_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "RepositoryFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityFinding" ADD CONSTRAINT "SecurityFinding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "RepositoryScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyGraph" ADD CONSTRAINT "DependencyGraph_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "RepositoryScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScore" ADD CONSTRAINT "HealthScore_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "RepositoryScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureModel" ADD CONSTRAINT "ArchitectureModel_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "RepositoryScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingGuide" ADD CONSTRAINT "OnboardingGuide_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "RepositoryScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileDocumentation" ADD CONSTRAINT "FileDocumentation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "RepositoryScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
