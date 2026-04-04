const { Pool } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_2ykAP5rSinwt@ep-plain-star-aniui67t-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query('SELECT vin, make, model, slug, "vehicleStatus", "createdAt" FROM "Vehicle" ORDER BY "createdAt" DESC LIMIT 50');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
