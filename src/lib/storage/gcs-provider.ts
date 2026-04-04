import { Storage } from "@google-cloud/storage";
import type { AuthClient } from "google-auth-library";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { StorageProvider, SaveFileOptions, SaveBufferOptions } from "./provider";
import path from "path";

export interface GCSStorageProviderOptions {
  bucketName: string;
  projectId?: string;
  /** Legacy: parsed service account JSON key. */
  credentials?: any;
  /** Federated auth client (WIF on Vercel). Takes precedence over credentials. */
  authClient?: AuthClient;
}

export class GCSStorageProvider implements StorageProvider {
  private storage: Storage;
  private bucketName: string;

  constructor(options: GCSStorageProviderOptions) {
    this.storage = new Storage({
      projectId: options.projectId,
      ...(options.authClient
        ? { authClient: options.authClient }
        : { credentials: options.credentials }),
    });
    this.bucketName = options.bucketName;
  }

  async save(file: File, options: SaveFileOptions = {}): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);

    const extension = path.extname(file.name);
    const filename = options.filename || `${uuidv4()}${extension}`;

    // Prefix-based prefixing
    const prefix = options.isPublic ? "inventory/" : "documents/";
    const storageKey = `${prefix}${filename}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const gcsFile = bucket.file(storageKey);
    await gcsFile.save(buffer, {
      resumable: false,
      contentType: file.type,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    return filename;
  }

  async saveBuffer(buffer: Buffer, options: SaveBufferOptions): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const filename = options.filename;
    const prefix = options.isPublic ? "inventory/" : "documents/";
    const storageKey = `${prefix}${filename}`;

    const gcsFile = bucket.file(storageKey);
    await gcsFile.save(buffer, {
      resumable: false,
      contentType: options.contentType ?? "application/octet-stream",
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    return filename;
  }

  async getReadStream(key: string): Promise<Readable> {
    const bucket = this.storage.bucket(this.bucketName);
    const inventoryFile = bucket.file(`inventory/${key}`);
    const [invExists] = await inventoryFile.exists();
    if (invExists) {
      return inventoryFile.createReadStream();
    }
    const docFile = bucket.file(`documents/${key}`);
    const [docExists] = await docFile.exists();
    if (docExists) {
      return docFile.createReadStream();
    }
    throw new Error(`File not found in GCS: ${key}`);
  }

  getPublicUrl(key: string): string {
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      process.env.APP_URL?.replace(/\/$/, "") ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "");
    return `${base}/api/media/${key}`;
  }

  async delete(key: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);

    // Try deleting from both prefixes to be safe
    try {
      await bucket.file(`documents/${key}`).delete({ ignoreNotFound: true });
      await bucket.file(`inventory/${key}`).delete({ ignoreNotFound: true });
    } catch (error) {
      console.error(`Error deleting from GCS: ${key}`, error);
    }
  }
}
