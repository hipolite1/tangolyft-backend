-- CreateTable
CREATE TABLE "TripDelivery" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "noteToCourier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripDelivery_tripId_key" ON "TripDelivery"("tripId");

-- CreateIndex
CREATE INDEX "TripDelivery_tripId_idx" ON "TripDelivery"("tripId");

-- AddForeignKey
ALTER TABLE "TripDelivery" ADD CONSTRAINT "TripDelivery_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
