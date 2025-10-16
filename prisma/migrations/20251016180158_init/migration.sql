-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    CONSTRAINT "orders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trackings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT,
    "trackingNumber" TEXT NOT NULL,
    "carrierSlug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "lastMileSlug" TEXT,
    "lastMileTracking" TEXT,
    "lastMileUrl" TEXT,
    "registeredWith17Track" BOOLEAN NOT NULL DEFAULT false,
    "lastPolledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "trackings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trackings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events_raw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "events_raw_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "trackings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events_redacted" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingId" TEXT NOT NULL,
    "statusCode" TEXT,
    "messageRedacted" TEXT NOT NULL,
    "cityRedacted" TEXT,
    "countryRedacted" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "events_redacted_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "trackings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
