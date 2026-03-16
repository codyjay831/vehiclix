-- CreateTable
CREATE TABLE "OrganizationHomepage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "showPromo" BOOLEAN NOT NULL DEFAULT false,
    "promoText" VARCHAR(100),
    "heroHeadline" VARCHAR(100),
    "heroSubheadline" TEXT,
    "heroPrimaryCtaLabel" VARCHAR(30),
    "heroPrimaryCtaRoute" TEXT DEFAULT 'inventory',
    "showTrustHighlights" BOOLEAN NOT NULL DEFAULT true,
    "trustHighlightsJson" JSONB,
    "showFeaturedInventory" BOOLEAN NOT NULL DEFAULT true,
    "showTestimonial" BOOLEAN NOT NULL DEFAULT false,
    "testimonialQuote" TEXT,
    "testimonialAuthor" VARCHAR(100),
    "showAboutTeaser" BOOLEAN NOT NULL DEFAULT true,
    "aboutTeaser" TEXT,
    "showContactCta" BOOLEAN NOT NULL DEFAULT true,
    "contactCtaHeadline" VARCHAR(100),
    "contactCtaBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationHomepage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationHomepage_organizationId_key" ON "OrganizationHomepage"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationHomepage" ADD CONSTRAINT "OrganizationHomepage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
