-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "catalog";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "lending";

-- CreateEnum
CREATE TYPE "lending"."LoanStatus" AS ENUM ('active', 'returned');

-- CreateTable
CREATE TABLE "catalog"."Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT NOT NULL,
    "retired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lending"."Loan" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "lending"."LoanStatus" NOT NULL,
    "borrowedAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Book_isbn_idx" ON "catalog"."Book"("isbn");

-- CreateIndex
CREATE INDEX "Loan_bookId_idx" ON "lending"."Loan"("bookId");

-- CreateIndex
CREATE INDEX "Loan_memberId_idx" ON "lending"."Loan"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_one_active_per_book" ON "lending"."Loan"("bookId") WHERE (status = 'active');
