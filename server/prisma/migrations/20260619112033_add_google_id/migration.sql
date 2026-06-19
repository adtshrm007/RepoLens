/*
  Warnings:

  - You are about to drop the column `githubToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `User` table. All the data in the column will be lost.
  - The `provider` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CUSTOM', 'GOOGLE', 'GITHUB');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "githubToken",
DROP COLUMN "refreshToken",
ADD COLUMN     "appRefreshToken" TEXT,
ADD COLUMN     "githubAccessToken" TEXT,
ADD COLUMN     "githubRefreshToken" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "provider",
ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'CUSTOM';

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
