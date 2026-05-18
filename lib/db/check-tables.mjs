import pg from "pg";

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:qclVcOrQtiQmeovPWAAwXdunduEzpCmC@autorack.proxy.rlwy.net:43824/railway",
  });
  const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log("Tables:", r.rows.map((x) => x.table_name).join(", "));
  console.log("Count:", r.rows.length);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
