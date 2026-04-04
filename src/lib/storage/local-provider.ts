import fs from "fs";
import path from "path";
import os from "os";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { StorageProvider, SaveFileOptions, SaveBufferOptions } from "./provider";

/**
 * Default local storage paths.
 * On Vercel or in production-like restricted environments, /tmp is used for ephemeral intake data.
 */
const PRIVATE_STORAGE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "storage", "documents")
  : path.join(process.cwd(), "storage", "documents");

const PUBLIC_STORAGE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "public", "uploads", "inventory")
  : path.join(process.cwd(), "public", "uploads", "inventory");

export class LocalStorageProvider implements StorageProvider {
  async save(file: File, options: SaveFileOptions = {}): Promise<string> {
    const storageDir = options.isPublic ? PUBLIC_STORAGE_DIR : PRIVATE_STORAGE_DIR;

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extension = path.extname(file.name);
    const filename = options.filename || `${uuidv4()}${extension}`;
    const filePath = path.join(storageDir, filename);

    fs.writeFileSync(filePath, buffer);

    return filename;
  }

  async saveBuffer(buffer: Buffer, options: SaveBufferOptions): Promise<string> {
    const storageDir = options.isPublic ? PUBLIC_STORAGE_DIR : PRIVATE_STORAGE_DIR;
    const filename = options.filename;
    const filePath = path.join(storageDir, filename);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    return filename;
  }

  async getReadStream(key: string): Promise<Readable> {
    // Public inventory (vehicle photos) live under PUBLIC_STORAGE_DIR; private docs under PRIVATE.
    const publicPath = path.join(PUBLIC_STORAGE_DIR, key);
    if (fs.existsSync(publicPath)) {
      return fs.createReadStream(publicPath);
    }
    const privatePath = path.join(PRIVATE_STORAGE_DIR, key);
    if (fs.existsSync(privatePath)) {
      return fs.createReadStream(privatePath);
    }
    throw new Error(`File not found: ${key}`);
  }

  getPublicUrl(key: string): string {
    // Relative URL for standard serving of public uploads
    return `/uploads/inventory/${key}`;
  }

  async delete(key: string): Promise<void> {
    const privatePath = path.join(PRIVATE_STORAGE_DIR, key);
    const publicPath = path.join(PUBLIC_STORAGE_DIR, key);

    if (fs.existsSync(privatePath)) {
      fs.unlinkSync(privatePath);
    } else if (fs.existsSync(publicPath)) {
      fs.unlinkSync(publicPath);
    }
  }
}
