import { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local-provider";
import { GCSStorageProvider } from "./gcs-provider";

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (instance) return instance;

  const providerType = process.env.STORAGE_PROVIDER || "local";

  if (providerType === "gcs") {
    const bucketName = process.env.GCS_BUCKET_NAME;
    const projectId = process.env.GCS_PROJECT_ID;

    if (!bucketName) {
      throw new Error("GCS_BUCKET_NAME environment variable is not set");
    }

    instance = new GCSStorageProvider({
      bucketName,
      projectId,
    });
  } else {
    instance = new LocalStorageProvider();
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
 * Normalizes a storage key or URL for legacy compatibility.
 * Returns the bare key for local/GCS paths, or the original if it's a full URL.
 */
export function resolveStorageKey(pathOrUrl: string): { key: string; isFullUrl: boolean } {
  if (!pathOrUrl) return { key: pathOrUrl, isFullUrl: false };

  // 1. Full URLs (GCS, etc)
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return { key: pathOrUrl, isFullUrl: true };
  }

  // 2. Normalize leading slash
  let normalized = pathOrUrl.startsWith("/") ? pathOrUrl.slice(1) : pathOrUrl;

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
 * Returns the public URL for a given storage key.
 */
export function getPublicUrl(key: string): string {
  const { key: resolvedKey, isFullUrl } = resolveStorageKey(key);
  if (isFullUrl) return resolvedKey;
  return getStorageProvider().getPublicUrl(resolvedKey);
}

/**
 * Returns a readable stream for a given storage key.
 */
export async function getReadStream(key: string): Promise<any> {
  const { key: resolvedKey, isFullUrl } = resolveStorageKey(key);
  if (isFullUrl) {
    throw new Error("Cannot stream from an external full URL");
  }
  return getStorageProvider().getReadStream(resolvedKey);
}
export async function deleteFile(key: string): Promise<void> {
  const { key: resolvedKey, isFullUrl } = resolveStorageKey(key);
  if (isFullUrl) return; // Cannot delete external URLs
  await getStorageProvider().delete(resolvedKey);
}

// Export common interface types
export * from "./provider";
export * from "./local-provider";
export * from "./gcs-provider";
