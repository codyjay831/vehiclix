import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LeadStatus } from "@prisma/client";
import { LeadListTable } from "@/components/admin/LeadListTable";
import { LeadFilters } from "@/components/admin/LeadFilters";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads Pipeline | Admin",
  description: "Manage your dealership leads and sales pipeline.",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; q?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    redirect("/login");
  }

  const { stage, q } = await searchParams;
  const currentStage = (stage?.toUpperCase() as LeadStatus) || "ALL";

  // Scoped query for leads
  const where: any = {
    organizationId: user.organizationId,
  };

  if (stage && stage !== "ALL") {
    where.status = currentStage;
  }

  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
    ];
  }

  const leads = await db.lead.findMany({
    where,
    include: {
      vehicle: {
        select: { year: true, make: true, model: true },
      },
      assignedTo: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { lastActivityAt: "desc" },
  });

  // Get counts for tabs
  const counts = await db.lead.groupBy({
    by: ["status"],
    where: { organizationId: user.organizationId },
    _count: true,
  });

  const totalCount = await db.lead.count({
    where: { organizationId: user.organizationId }
  });

  const countMap = counts.reduce((acc, curr) => {
    acc[curr.status] = curr._count;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-muted/30 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.8] italic">
            Sales <br />
            <span className="text-primary">Pipeline</span>
          </h1>
          <p className="text-muted-foreground font-medium max-w-xl">
            Manage your dealership leads and opportunities from a single interface.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <LeadFilters countMap={countMap} totalCount={totalCount} />

        <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
          <LeadListTable leads={leads} />
        </div>
      </div>
    </div>
  );
}
