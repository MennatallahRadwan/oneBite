-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "bestSeller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cakeTextMaxLength" INTEGER,
ADD COLUMN     "cakeTextPoints" INTEGER,
ADD COLUMN     "cakeTextPriceFils" INTEGER,
ADD COLUMN     "giftable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "seasonal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "servingsAr" TEXT,
ADD COLUMN     "servingsEn" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryArea_nameEn_key" ON "DeliveryArea"("nameEn");

