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

    // #region agent log
    console.info(JSON.stringify({tag:"DBG:d1f470",h:"H2,H4,H5",loc:"gcs-provider.ts:saveBuffer:pre",storageKey,bufLen:buffer.length,bucket:this.bucketName,ts:Date.now()}));
    fetch('http://127.0.0.1:7253/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d1f470'},body:JSON.stringify({sessionId:'d1f470',location:'gcs-provider.ts:saveBuffer:pre',message:'before gcsFile.save',data:{storageKey,bufLen:buffer.length,bucket:this.bucketName},timestamp:Date.now(),hypothesisId:'H2,H4,H5'})}).catch(()=>{});
    // #endregion

    const gcsFile = bucket.file(storageKey);
    try {
      await gcsFile.save(buffer, {
        resumable: false,
        contentType: options.contentType ?? "application/octet-stream",
        metadata: {
          cacheControl: "public, max-age=31536000",
        },
      });
      // #region agent log
      console.info(JSON.stringify({tag:"DBG:d1f470",h:"H2,H3",loc:"gcs-provider.ts:saveBuffer:ok",storageKey,ts:Date.now()}));
      fetch('http://127.0.0.1:7253/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d1f470'},body:JSON.stringify({sessionId:'d1f470',location:'gcs-provider.ts:saveBuffer:ok',message:'gcsFile.save succeeded',data:{storageKey},timestamp:Date.now(),hypothesisId:'H2,H3'})}).catch(()=>{});
      // #endregion
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack?.slice(0, 500) : undefined;
      const errName = err instanceof Error ? err.name : undefined;
      const errCode = (err as any)?.code;
      const errStatus = (err as any)?.response?.status ?? (err as any)?.status;
      // #region agent log
      console.info(JSON.stringify({tag:"DBG:d1f470",h:"H2,H3,H4",loc:"gcs-provider.ts:saveBuffer:err",storageKey,errMsg,errName,errCode,errStatus,errStack,ts:Date.now()}));
      fetch('http://127.0.0.1:7253/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d1f470'},body:JSON.stringify({sessionId:'d1f470',location:'gcs-provider.ts:saveBuffer:err',message:'gcsFile.save FAILED',data:{storageKey,errMsg,errName,errCode,errStatus,errStack},timestamp:Date.now(),hypothesisId:'H2,H3,H4'})}).catch(()=>{});
      // #endregion
      throw err;
    }

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
    // Proxy through the app so the bucket stays private (no public object access needed).
    return `/api/media/${key}`;
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
