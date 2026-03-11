import crypto from "crypto";

/**
 * Verifies the DocuSign Connect HMAC signature.
 * @param rawBody The raw request body as a string.
 * @param signature The signature from the x-docusign-signature-1 header.
 * @returns true if the signature is valid.
 */
export function verifyDocuSignSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.DOCUSIGN_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("DOCUSIGN_WEBHOOK_SECRET is not defined. Skipping verification in development?");
    return process.env.NODE_ENV === "development";
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const computedSignature = hmac.digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(signature)
  );
}

/**
 * Mocks the creation of a DocuSign envelope.
 * In a real implementation, this would call the DocuSign API.
 */
export async function createMockEnvelope() {
  // Generate a random envelope ID
  return {
    envelopeId: `mock-${crypto.randomUUID()}`,
  };
}
