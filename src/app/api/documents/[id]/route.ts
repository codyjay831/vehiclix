import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "storage", "documents");

/**
 * GET /api/documents/[id]
 * Securely streams a private document to an authenticated user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Fetch the DealDocument record along with its parent Deal
  const document = await db.dealDocument.findUnique({
    where: { id },
    include: {
      deal: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!document || !document.fileUrl) {
    return new NextResponse("Document not found", { status: 404 });
  }

  // Authorization check
  if (user.role === "CUSTOMER") {
    // Customer can only access their own documents
    if (document.deal.userId !== user.id) {
      return new NextResponse("Forbidden: Access denied to this document", { status: 403 });
    }
  } else if (user.role !== "OWNER") {
    // Other roles are strictly forbidden
    return new NextResponse("Forbidden", { status: 403 });
  }

  // OWNER access is implicitly allowed if we've reached this point and user.role === "OWNER"

  const filePath = path.join(STORAGE_DIR, document.fileUrl);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("File not found on disk", { status: 404 });
  }

  // Stream the file
  const fileBuffer = fs.readFileSync(filePath);

  // Set appropriate headers based on file extension
  const ext = path.extname(filePath).toLowerCase();
  let contentType = "application/octet-stream";
  if (ext === ".pdf") contentType = "application/pdf";
  else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
  else if (ext === ".png") contentType = "image/png";

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${document.documentType}${ext}"`,
    },
  });
}
