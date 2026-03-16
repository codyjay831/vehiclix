import { getStorageProvider } from "./storage/index";

/**
 * Backward compatible wrapper for the saveFile function.
 * @param file The file to save.
 * @returns The relative storage key/filename.
 */
export async function saveFile(file: File): Promise<string> {
  const provider = getStorageProvider();
  return provider.save(file, { isPublic: false });
}

/**
 * Returns the public URL for a given storage key.
 * @param key The storage key.
 * @returns The public URL.
 */
export function getPublicUrl(key: string): string {
  const provider = getStorageProvider();
  return provider.getPublicUrl(key);
}

/**
 * Deletes a file from the storage system.
 * @param key The storage key.
 */
export async function deleteFile(key: string) {
  const provider = getStorageProvider();
  await provider.delete(key);
}
