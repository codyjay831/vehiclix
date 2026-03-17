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
 * Returns the public URL for a given storage key.
 */
export function getPublicUrl(key: string): string {
  return getStorageProvider().getPublicUrl(key);
}

/**
 * Deletes a file from the storage system.
 */
export async function deleteFile(key: string): Promise<void> {
  await getStorageProvider().delete(key);
}

// Export common interface types
export * from "./provider";
export * from "./local-provider";
export * from "./gcs-provider";
