/**
 * One-off Pre-Phase-2 VIN sample audit. Fetches vPIC decodevinvaluesextended for each VIN
 * and extracts candidate fields. Run: node scripts/vpic-sample-audit.mjs
 * Output: scripts/vpic-audit-results.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { createWriteStream } from 'fs';

const VINS_PATH = new URL('./vpic-audit-vins.txt', import.meta.url);
const OUT_PATH = new URL('./vpic-audit-results.json', import.meta.url);

const FIELDS = [
  'ModelYear', 'Make', 'Model', 'Trim', 'Trim2',
  'BodyClass', 'DriveType', 'EngineConfiguration', 'EngineModel', 'EngineHP',
  'FuelTypePrimary', 'FuelTypeSecondary', 'TransmissionStyle', 'TransmissionSpeeds',
  'Doors', 'EVDriveUnit', 'BatteryKWh', 'ElectrificationLevel', 'OtherEngineInfo',
  'VehicleType', 'NCSABodyType'
];

const vins = readFileSync(VINS_PATH, 'utf8')
  .split('\n')
  .map(s => s.trim())
  .filter(Boolean);

const results = [];
const delay = (ms) => new Promise(r => setTimeout(r, ms));

for (let i = 0; i < vins.length; i++) {
  const vin = vins[i];
  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/${vin}?format=json`;
    const res = await fetch(url);
    const data = await res.json();
    const r0 = data.Results?.[0] || {};
    const row = { vin, count: data.Count ?? 0, error: data.Message?.includes('Error') ? data.Message : null };
    FIELDS.forEach(f => { row[f] = r0[f] ?? ''; });
    results.push(row);
    process.stderr.write(`[${i + 1}/${vins.length}] ${vin} ${r0.Make || '?'} ${r0.Model || '?'}\n`);
  } catch (e) {
    results.push({ vin, error: e.message, count: 0 });
  }
  await delay(400);
}

writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
console.error('Wrote', OUT_PATH.pathname);
