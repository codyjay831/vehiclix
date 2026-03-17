import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { StorageProvider, SaveFileOptions } from "./provider";

const PRIVATE_STORAGE_DIR = path.join(process.cwd(), "storage", "documents");
const PUBLIC_STORAGE_DIR = path.join(process.cwd(), "public", "uploads", "inventory");

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

  async getReadStream(key: string): Promise<Readable> {
    // Note: private files are the primary use case for getReadStream
    const filePath = path.join(PRIVATE_STORAGE_DIR, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    return fs.createReadStream(filePath);
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
