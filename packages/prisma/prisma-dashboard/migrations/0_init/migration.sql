-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "apiTokens" TEXT[],
    "credits" INTEGER NOT NULL DEFAULT 0,
    "accessLevel" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_apiTokens_key" ON "User"("apiTokens");
