-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trackings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT,
    "trackingNumber" TEXT NOT NULL,
    "carrierSlug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "lastMileSlug" TEXT,
    "lastMileTracking" TEXT,
    "lastMileUrl" TEXT,
    "registeredWith17Track" BOOLEAN NOT NULL DEFAULT false,
    "lastPolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trackings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events_raw" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_raw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events_redacted" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "statusCode" TEXT,
    "messageRedacted" TEXT NOT NULL,
    "cityRedacted" TEXT,
    "countryRedacted" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_redacted_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shops_shopDomain_key" ON "shops"("shopDomain");

-- CreateIndex
CREATE INDEX "orders_shopId_idx" ON "orders"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shopId_shopifyOrderId_key" ON "orders"("shopId", "shopifyOrderId");

-- CreateIndex
CREATE INDEX "trackings_trackingNumber_idx" ON "trackings"("trackingNumber");

-- CreateIndex
CREATE INDEX "trackings_shopId_status_idx" ON "trackings"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trackings_shopId_trackingNumber_key" ON "trackings"("shopId", "trackingNumber");

-- CreateIndex
CREATE INDEX "events_raw_trackingId_occurredAt_idx" ON "events_raw"("trackingId", "occurredAt");

-- CreateIndex
CREATE INDEX "events_redacted_trackingId_occurredAt_idx" ON "events_redacted"("trackingId", "occurredAt");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trackings" ADD CONSTRAINT "trackings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trackings" ADD CONSTRAINT "trackings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events_raw" ADD CONSTRAINT "events_raw_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "trackings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events_redacted" ADD CONSTRAINT "events_redacted_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "trackings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
