-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('Zomato', 'Swiggy');

-- CreateEnum
CREATE TYPE "Zone" AS ENUM ('Andheri', 'Bandra', 'Dadar', 'Dharavi', 'Kurla', 'Thane', 'NaviMumbai', 'Borivali');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('Basic', 'Standard', 'Premium');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('Active', 'Expired', 'Cancelled');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('Processing', 'Approved', 'Paid', 'Rejected');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('HeavyRain', 'SeverePollution', 'ExtremeHeat', 'PlatformOutage', 'CivilDisruption');

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "yearsActive" INTEGER NOT NULL,
    "zone" "Zone" NOT NULL,
    "weeklyHours" INTEGER NOT NULL,
    "weeklyEarnings" INTEGER NOT NULL,
    "peakHours" TEXT[],
    "riskScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "zone" "Zone" NOT NULL,
    "weeklyPremium" INTEGER NOT NULL,
    "coveragePerDay" INTEGER NOT NULL,
    "maxWeeklyClaim" INTEGER NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'Active',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "triggerType" "TriggerType" NOT NULL,
    "triggerEventId" TEXT NOT NULL,
    "disruptionHours" DOUBLE PRECISION NOT NULL,
    "payoutAmount" INTEGER NOT NULL,
    "upiRef" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'Processing',
    "fraudScore" INTEGER NOT NULL DEFAULT 0,
    "fraudFlags" TEXT[],
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriggerEvent" (
    "id" TEXT NOT NULL,
    "zone" "Zone" NOT NULL,
    "triggerType" "TriggerType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'simulation',

    CONSTRAINT "TriggerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumPayment" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PremiumPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "riderId" TEXT,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLPremiumSnapshot" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "zone" "Zone" NOT NULL,
    "weeklyPremium" INTEGER NOT NULL,
    "baseAmount" INTEGER NOT NULL,
    "seasonalAdj" INTEGER NOT NULL,
    "zoneDiscount" INTEGER NOT NULL,
    "personalDiscount" INTEGER NOT NULL,
    "fraudPenalty" INTEGER NOT NULL,
    "explanation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLPremiumSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneRiskSnapshot" (
    "id" TEXT NOT NULL,
    "zone" "Zone" NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weatherRisk" INTEGER NOT NULL,
    "strikeRisk" INTEGER NOT NULL,
    "outageRisk" INTEGER NOT NULL,
    "disruptionDays" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZoneRiskSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rider_phone_key" ON "Rider"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_policyNumber_key" ON "Policy"("policyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimNumber_key" ON "Claim"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneRiskSnapshot_zone_weekStart_key" ON "ZoneRiskSnapshot"("zone", "weekStart");

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_triggerEventId_fkey" FOREIGN KEY ("triggerEventId") REFERENCES "TriggerEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumPayment" ADD CONSTRAINT "PremiumPayment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLPremiumSnapshot" ADD CONSTRAINT "MLPremiumSnapshot_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
