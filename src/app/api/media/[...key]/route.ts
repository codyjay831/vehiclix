import { NextRequest, NextResponse } from "next/server";
import { getReadStream } from "@/lib/storage";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Minimal image proxy for private-bucket GCS (and local dev).
 * Vehicle listing images are stored under `inventory/<key>` in the active provider;
 * this route streams them to the browser so the bucket never needs to be public.
 *
 * Only image extensions are allowed — documents and other private files are excluded.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const storageKey = key.join("/");

  const ext = storageKey.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const stream = await getReadStream(storageKey);

    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
