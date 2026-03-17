import { Storage } from "@google-cloud/storage";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { StorageProvider, SaveFileOptions } from "./provider";
import path from "path";

export interface GCSStorageProviderOptions {
  bucketName: string;
  projectId?: string;
}

export class GCSStorageProvider implements StorageProvider {
  private storage: Storage;
  private bucketName: string;

  constructor(options: GCSStorageProviderOptions) {
    this.storage = new Storage({
      projectId: options.projectId,
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
      // Bucket settings usually handle public/private, but we can set them explicitly
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    return filename;
  }

  async getReadStream(key: string): Promise<Readable> {
    const bucket = this.storage.bucket(this.bucketName);
    const gcsFile = bucket.file(`documents/${key}`);
    const [exists] = await gcsFile.exists();
    if (!exists) {
      throw new Error(`File not found in GCS: ${key}`);
    }
    return gcsFile.createReadStream();
  }

  getPublicUrl(key: string): string {
    // Return standard GCS public URL for the inventory prefix
    return `https://storage.googleapis.com/${this.bucketName}/inventory/${key}`;
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
