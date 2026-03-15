import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  const org = await db.organization.findFirst({
    where: {
      OR: [
        { id: id },
        { slug: id }
      ]
    },
    select: { slug: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  return NextResponse.json({ slug: org.slug });
}
