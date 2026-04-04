const { Pool } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_2ykAP5rSinwt@ep-plain-star-aniui67t-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const pool = new Pool({ connectionString });
  try {
    console.log("Checking for duplicate VINs...");
    const res = await pool.query('SELECT vin, COUNT(*) as count FROM "Vehicle" GROUP BY vin HAVING COUNT(*) > 1');
    console.log("Duplicates:", JSON.stringify(res.rows, null, 2));

    console.log("\nChecking for the Tesla VIN specifically...");
    const teslaRes = await pool.query('SELECT * FROM "Vehicle" WHERE vin = \'5YJ3E1EBXSF969484\'');
    console.log("Tesla rows:", JSON.stringify(teslaRes.rows, null, 2));
    
    console.log("\nChecking for most recent non-provisional VINs...");
    const recentRes = await pool.query('SELECT vin, make, model, slug, "vehicleStatus", "createdAt" FROM "Vehicle" WHERE vin NOT LIKE \'0INTAKE%\' ORDER BY "createdAt" DESC LIMIT 10');
    console.log("Recent non-provisional:", JSON.stringify(recentRes.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
