-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SampleSource" AS ENUM ('USER', 'REFERENCE', 'IMPORT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "rbp4" DOUBLE PRECISION,
    "cxcl10" DOUBLE PRECISION NOT NULL,
    "nox4" DOUBLE PRECISION NOT NULL,
    "ccdrOri" INTEGER,
    "label" INTEGER,
    "source" "SampleSource" NOT NULL DEFAULT 'USER',
    "group" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskModel" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "thresholds" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeepAlive" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "pingedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeepAlive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Sample_source_idx" ON "Sample"("source");

-- CreateIndex
CREATE INDEX "Sample_userId_idx" ON "Sample"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskModel_version_key" ON "RiskModel"("version");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
