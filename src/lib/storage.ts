import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const STORAGE_DIR = path.join(process.cwd(), "storage", "documents");

/**
 * Saves a file to the private storage directory.
 * Returns the relative storage path.
 */
export async function saveFile(file: File): Promise<string> {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Generate a unique filename to avoid collisions and obscure the original name
  const extension = path.extname(file.name);
  const filename = `${uuidv4()}${extension}`;
  const filePath = path.join(STORAGE_DIR, filename);

  fs.writeFileSync(filePath, buffer);

  // Return the filename relative to the storage/documents directory
  return filename;
}

/**
 * Returns the absolute path for a given storage filename.
 */
export function getFilePath(filename: string): string {
  return path.join(STORAGE_DIR, filename);
}

/**
 * Deletes a file from the private storage directory.
 */
export function deleteFile(filename: string) {
  const filePath = path.join(STORAGE_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
