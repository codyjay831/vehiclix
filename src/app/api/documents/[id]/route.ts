import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";
import path from "path";

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
          organizationId: true,
        },
      },
    },
  });

  if (!document || !document.fileUrl) {
    return new NextResponse("Document not found", { status: 404 });
  }

  // Authorization check
  const effectiveOrgId = user.isSupportMode ? user.supportOrgId : user.organizationId;

  if (user.role === "CUSTOMER") {
    // Customer can only access their own documents
    if (document.deal.userId !== user.id) {
      return new NextResponse("Forbidden: Access denied to this document", { status: 403 });
    }
  } else if (user.role === "OWNER" || (user.role === "SUPER_ADMIN" && user.isSupportMode)) {
    // Owner or Support can access documents belonging to the resolved organization
    if (document.deal.organizationId !== effectiveOrgId) {
      return new NextResponse("Forbidden: Access denied to this document", { status: 403 });
    }
  } else {
    // Other roles (including Super Admin NOT in support mode) are strictly forbidden
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const provider = getStorageProvider();
    const nodeStream = await provider.getReadStream(document.fileUrl);

    // Convert NodeJS.Readable to Web ReadableStream for NextResponse
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    // Set appropriate headers based on file extension
    const ext = path.extname(document.fileUrl).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${document.documentType}${ext}"`,
      },
    });
  } catch (error) {
    console.error(`Error streaming document: ${id}`, error);
    return new NextResponse("File not found or access denied", { status: 404 });
  }
}
