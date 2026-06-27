-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "commitSha" TEXT;

-- CreateTable
CREATE TABLE "UserRepo" (
    "id" TEXT NOT NULL,
    "userLogin" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isOwned" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPrPollAt" TIMESTAMP(3),

    CONSTRAINT "UserRepo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "commitSha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRepo_userLogin_fullName_key" ON "UserRepo"("userLogin", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_owner_repo_prNumber_key" ON "PullRequest"("owner", "repo", "prNumber");
