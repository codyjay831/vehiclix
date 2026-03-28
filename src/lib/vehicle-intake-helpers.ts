const VIN_TAIL_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";

export function isProvisionalIntakeVin(vin: string): boolean {
  const v = vin.trim().toUpperCase();
  return /^0INTAKE[A-HJ-NPR-Z0-9]{10}$/.test(v);
}

/** 17-char placeholder unique per caller checks; not a road-legal VIN (decode not required). */
export function randomProvisionalVin(): string {
  let tail = "";
  for (let i = 0; i < 10; i++) {
    tail += VIN_TAIL_CHARS[Math.floor(Math.random() * VIN_TAIL_CHARS.length)]!;
  }
  return `0INTAKE${tail}`;
}
