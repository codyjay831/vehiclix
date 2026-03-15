import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeHostname, isPlatformHost } from "@/lib/domain-shared";
import { DomainStatus } from "@prisma/client";

/**
 * Internal resolver to map a hostname to an organization slug.
 * This is used by middleware to handle custom domain rewrites.
 * Only VERIFIED domains are resolved.
 */
export async function GET(request: NextRequest) {
  const host = request.nextUrl.searchParams.get("host");

  if (!host) {
    return NextResponse.json({ error: "Missing host parameter" }, { status: 400 });
  }

  // 1. Skip platform hosts (middleware should handle these natively)
  if (isPlatformHost(host)) {
    return NextResponse.json({ isPlatform: true });
  }

  const normalizedHost = normalizeHostname(host);

  try {
    // 2. Lookup verified domain mapping
    const domainRecord = await db.organizationDomain.findUnique({
      where: { 
        hostname: normalizedHost,
        status: DomainStatus.VERIFIED
      },
      select: {
        organization: {
          select: {
            slug: true
          }
        }
      }
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found or unverified" }, { status: 404 });
    }

    return NextResponse.json({
      slug: domainRecord.organization.slug,
      hostname: normalizedHost
    });
  } catch (error) {
    console.error("[RESOLVE_DOMAIN_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
