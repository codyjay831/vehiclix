/**
 * Phase 1 smart intake: extract plain text from PDF / images and find valid VINs (ISO 3779 check digit).
 * OCR is best-effort; image paths use ranked candidates + conservative OCR-error repair (see collectRankedVinCandidates).
 */

import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** LSTM English traineddata shipped in npm (avoids runtime fetch to jsdelivr; required under restricted egress). */
function resolveLocalTesseractEngLangPath(): string {
  try {
    const pkg = require.resolve("@tesseract.js-data/eng/package.json");
    return path.join(path.dirname(pkg), "4.0.0_best_int");
  } catch {
    return path.join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int");
  }
}

/** Positions 1–17 weights for check digit (1-based indexing in spec; we use 0-based here). */
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

const TRANSLITERATION: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
};

function transliterateChar(c: string): number {
  const v = TRANSLITERATION[c.toUpperCase()];
  return v ?? NaN;
}

/**
 * Returns true if the 17-character string satisfies VIN check digit (position 9, 0-based index 8).
 */
export function isValidVinCheckDigit(vinRaw: string): boolean {
  const vin = vinRaw.trim().toUpperCase();
  if (vin.length !== 17) return false;
  if (/[IOQ]/.test(vin)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    if (i === 8) continue;
    const val = transliterateChar(vin[i]!);
    if (Number.isNaN(val)) return false;
    sum += val * (VIN_WEIGHTS[i] ?? 0);
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? "X" : String(remainder);
  return vin[8] === expected;
}

const VIN_TOKEN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

/** Conservative OCR alternates for a single character (VIN-safe charset only). */
function alternativesForChar(c: string): string[] {
  const u = c.toUpperCase();
  const m: Record<string, string[]> = {
    B: ["B", "8"],
    "8": ["8", "B"],
    S: ["S", "5"],
    "5": ["5", "S"],
    G: ["G", "6"],
    "6": ["6", "G"],
    Z: ["Z", "2"],
    "2": ["2", "Z"],
    "9": ["9", "8", "6"],
  };
  return m[u] ?? [u];
}

function charIsAmbiguousForDoubleSwap(c: string): boolean {
  return alternativesForChar(c).length > 1;
}

/**
 * Fix illegal VIN letters that OCR often emits (I/O/Q) to legal digits.
 * Returns null if the result is not a valid VIN character set.
 */
function sanitizeIllegalVinLetters(slice: string): { s: string; fixes: number } | null {
  let fixes = 0;
  const chars = slice.toUpperCase().split("");
  for (let i = 0; i < 17; i++) {
    const c = chars[i]!;
    if (c === "I") {
      chars[i] = "1";
      fixes++;
    } else if (c === "O") {
      chars[i] = "0";
      fixes++;
    } else if (c === "Q") {
      chars[i] = "0";
      fixes++;
    }
  }
  const s = chars.join("");
  if (!VIN_TOKEN_RE.test(s)) return null;
  return { s, fixes };
}

export type RankedVinCandidate = {
  vin: string;
  /** Total OCR repair steps: illegal-letter fixes + per-position substitutions (1 or 2). */
  ocrSubstitutionCount: number;
  /** Earliest start index in normalized text (left-to-right scan). */
  firstIndex: number;
};

function upsertCandidate(
  best: Map<string, RankedVinCandidate>,
  vin: string,
  ocrSubstitutionCount: number,
  firstIndex: number
): void {
  const cur = best.get(vin);
  if (
    !cur ||
    ocrSubstitutionCount < cur.ocrSubstitutionCount ||
    (ocrSubstitutionCount === cur.ocrSubstitutionCount && firstIndex < cur.firstIndex)
  ) {
    best.set(vin, { vin, ocrSubstitutionCount, firstIndex });
  }
}

/**
 * Collect all plausible VINs from text: exact windows, illegal-letter fixes, then 1- and 2-position
 * conservative OCR swaps. Ranked by fewer repairs, then earlier position in the document.
 */
export function collectRankedVinCandidates(plainText: string): RankedVinCandidate[] {
  if (!plainText || !plainText.trim()) return [];
  const upper = plainText.toUpperCase().replace(/\s+/g, " ");
  const best = new Map<string, RankedVinCandidate>();

  for (let i = 0; i <= upper.length - 17; i++) {
    const rawSlice = upper.slice(i, i + 17);
    const sanitized = sanitizeIllegalVinLetters(rawSlice);
    if (!sanitized) continue;
    const baseEdits = sanitized.fixes;
    const s0 = sanitized.s;

    if (isValidVinCheckDigit(s0)) {
      upsertCandidate(best, s0, baseEdits, i);
      continue;
    }

    for (let p = 0; p < 17; p++) {
      for (const alt of alternativesForChar(s0[p]!)) {
        if (alt === s0[p]) continue;
        const next = s0.slice(0, p) + alt + s0.slice(p + 1);
        if (!VIN_TOKEN_RE.test(next) || /[IOQ]/.test(next)) continue;
        if (isValidVinCheckDigit(next)) {
          upsertCandidate(best, next, baseEdits + 1, i);
        }
      }
    }

    const ambIdx: number[] = [];
    for (let p = 0; p < 17; p++) {
      if (charIsAmbiguousForDoubleSwap(s0[p]!)) ambIdx.push(p);
    }
    if (ambIdx.length > 8) continue;

    for (let a = 0; a < ambIdx.length; a++) {
      for (let b = a + 1; b < ambIdx.length; b++) {
        const p = ambIdx[a]!;
        const q = ambIdx[b]!;
        for (const ap of alternativesForChar(s0[p]!)) {
          for (const aq of alternativesForChar(s0[q]!)) {
            if (ap === s0[p] && aq === s0[q]) continue;
            const chars = s0.split("");
            chars[p] = ap;
            chars[q] = aq;
            const next = chars.join("");
            if (!VIN_TOKEN_RE.test(next) || /[IOQ]/.test(next)) continue;
            if (isValidVinCheckDigit(next)) {
              upsertCandidate(best, next, baseEdits + 2, i);
            }
          }
        }
      }
    }
  }

  return Array.from(best.values()).sort(
    (a, b) => a.ocrSubstitutionCount - b.ocrSubstitutionCount || a.firstIndex - b.firstIndex
  );
}

/**
 * Scan text for 17-character VIN-like tokens that pass check digit without OCR repair (legacy / strict).
 */
export function findValidatedVinsInText(text: string): string[] {
  const ranked = collectRankedVinCandidates(text);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of ranked) {
    if (c.ocrSubstitutionCount !== 0) continue;
    if (seen.has(c.vin)) continue;
    seen.add(c.vin);
    out.push(c.vin);
  }
  return out;
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    return typeof textResult.text === "string" ? textResult.text : "";
  } finally {
    await parser.destroy();
  }
}

/**
 * OCR for PNG/JPEG; may be slow on large images. Caller should enforce timeout.
 * Uses vendored `@tesseract.js-data/eng` so workers do not fetch traineddata from a public CDN (breaks with PRIVATE_RANGES_ONLY egress).
 */
export async function extractTextFromImageBuffer(buffer: Buffer): Promise<string> {
  const { createWorker, OEM } = await import("tesseract.js");
  const langPath = resolveLocalTesseractEngLangPath();
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    langPath,
    cacheMethod: "none",
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return typeof text === "string" ? text : "";
  } finally {
    await worker.terminate();
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label = "Operation"): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
