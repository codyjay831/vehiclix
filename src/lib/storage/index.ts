import { Readable } from "stream";
import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";
import { StorageProvider, type SaveBufferOptions } from "./provider";
import { LocalStorageProvider } from "./local-provider";
import { GCSStorageProvider } from "./gcs-provider";

let instance: StorageProvider | null = null;

/**
 * Builds an {@link ExternalAccountClient} for Workload Identity Federation
 * (Vercel OIDC → GCP). Returns null when the required env vars are absent
 * (e.g. local dev).
 */
function buildWifAuthClient() {
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
  const projectNumber = process.env.GCP_PROJECT_NUMBER;
  const saEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;

  if (!poolId || !providerId || !projectNumber || !saEmail) return null;

  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: async () => {
        return await getVercelOidcToken();
      },
    },
  });

  if (!client) {
    console.error(
      JSON.stringify({
        tag: "storage.wif",
        phase: "init_failed",
        hint: "ExternalAccountClient.fromJSON returned null. Check WIF env vars.",
      })
    );
  }

  return client;
}

export function getStorageProvider(): StorageProvider {
  if (instance) return instance;

  const providerType =
    process.env.STORAGE_PROVIDER || (process.env.GCS_BUCKET_NAME ? "gcs" : "local");

  if (providerType === "gcs") {
    const bucketName = process.env.GCS_BUCKET_NAME;
    const projectId = process.env.GCS_PROJECT_ID;

    if (!bucketName) {
      throw new Error("GCS_BUCKET_NAME environment variable is not set");
    }

    // Prefer WIF (keyless); fall back to JSON key for non-Vercel environments.
    const authClient = buildWifAuthClient();

    let credentials;
    if (!authClient) {
      const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      if (credentialsJson) {
        try {
          credentials = JSON.parse(credentialsJson);
        } catch (e) {
          console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON", e);
        }
      }
    }

    instance = new GCSStorageProvider({
      bucketName,
      projectId,
      ...(authClient ? { authClient } : { credentials }),
    });

    const authMode = authClient ? "wif" : credentials ? "json-key" : "none";
    console.info(
      JSON.stringify({
        tag: "storage.init",
        provider: "gcs",
        bucket: bucketName,
        authMode,
      })
    );
  } else {
    instance = new LocalStorageProvider();

    console.info(
      JSON.stringify({
        tag: "storage.init",
        provider: "local",
        hint: providerType !== "local"
          ? `STORAGE_PROVIDER="${providerType}" not recognized; fell back to local.`
          : undefined,
      })
    );
  }

  return instance;
}

/**
 * Backward compatible wrapper: save a file via the configured provider.
 */
export async function saveFile(file: File, options?: { isPublic?: boolean }): Promise<string> {
  const provider = getStorageProvider();
  return provider.save(file, options ?? { isPublic: false });
}

/**
 * Persists processed bytes (e.g. vehicle image variants). Same key semantics as {@link saveFile}.
 */
export async function saveBuffer(buffer: Buffer, options: SaveBufferOptions): Promise<string> {
  return getStorageProvider().saveBuffer(buffer, options);
}

/**
 * Normalizes a storage key or URL for legacy compatibility.
 * Supported legacy shapes (for reads):
 * - Full URL: http(s)://... (e.g. https://storage.googleapis.com/bucket/inventory/foo.jpg) → returned as-is for display; not used for stream/delete.
 * - Local public path: /uploads/inventory/foo.jpg or uploads/inventory/foo.jpg → bare key foo.jpg.
 * - Prefixed key: inventory/foo.jpg or documents/foo.pdf → bare key.
 * Canonical persisted format remains bare key (filename); this is for read-side compatibility only.
 */
export function resolveStorageKey(pathOrUrl: string): { key: string; isFullUrl: boolean } {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return { key: pathOrUrl ?? "", isFullUrl: false };

  const trimmed = pathOrUrl.trim();
  if (!trimmed) return { key: "", isFullUrl: false };

  // 1. Full URLs (GCS, etc) — do not wrap again; return as-is for public URL; stream/delete no-op or throw
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { key: trimmed, isFullUrl: true };
  }

  // 2. Normalize leading slash
  let normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;

  // 3. Strip legacy prefixes to get the bare key
  const prefixes = ["uploads/inventory/", "inventory/", "documents/"];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
      break;
    }
  }

  return { key: normalized, isFullUrl: false };
}

/**
 * Returns the public URL for a given storage key (or legacy path/URL).
 * If the value is already a full URL, returns it unchanged. Empty key returns empty string.
 */
export function getPublicUrl(key: string): string {
  if (!key || typeof key !== "string") return "";
  const { key: resolvedKey, isFullUrl } = resolveStorageKey(key);
  if (isFullUrl) return resolvedKey;
  if (!resolvedKey) return "";
  return getStorageProvider().getPublicUrl(resolvedKey);
}

/**
 * Returns a readable stream for a given storage key (or legacy path).
 * Legacy prefixed paths (e.g. documents/foo.pdf) are normalized to bare key before provider read.
 * Full URLs are not streamable (throws).
 */
export async function getReadStream(key: string): Promise<Readable> {
  if (!key || typeof key !== "string") throw new Error("Storage key is required");
  const { key: resolvedKey, isFullUrl } = resolveStorageKey(key);
  if (isFullUrl) throw new Error("Cannot stream from an external full URL");
  if (!resolvedKey) throw new Error("Storage key is required");
  return getStorageProvider().getReadStream(resolvedKey);
}

/**
 * Deletes a file by storage key (or legacy path). No-op for full URLs or empty key.
 */
export async function deleteFile(key: string): Promise<void> {
  if (!key || typeof key !== "string") return;
  const { key: resolvedKey, isFullUrl } = resolveStorageKey(key);
  if (isFullUrl) return; // Cannot delete external URLs
  if (!resolvedKey) return;
  await getStorageProvider().delete(resolvedKey);
}

// Export common interface types
export * from "./provider";
export * from "./local-provider";
export * from "./gcs-provider";
