import { Readable } from "stream";

export interface SaveFileOptions {
  filename?: string;
  isPublic?: boolean;
}

export interface SaveBufferOptions {
  /** Relative key including subpaths, e.g. `{vehicleId}/{mediaId}/thumb.jpg`. */
  filename: string;
  contentType?: string;
  isPublic?: boolean;
}

export interface StorageProvider {
  /**
   * Saves a file to the storage system.
   * @param file The file to save.
   * @param options Options for saving, like specifying a custom filename or if it's public.
   * @returns The relative storage key/filename.
   */
  save(file: File, options?: SaveFileOptions): Promise<string>;

  /**
   * Saves raw bytes (e.g. processed images). Same key semantics as {@link save}.
   */
  saveBuffer(buffer: Buffer, options: SaveBufferOptions): Promise<string>;

  /**
   * Returns a read stream for a given storage key.
   * @param key The relative storage key/filename.
   */
  getReadStream(key: string): Promise<Readable>;

  /**
   * Returns a public URL for a given storage key.
   * @param key The relative storage key/filename.
   */
  getPublicUrl(key: string): string;

  /**
   * Deletes a file from the storage system.
   * @param key The relative storage key/filename.
   */
  delete(key: string): Promise<void>;
}
