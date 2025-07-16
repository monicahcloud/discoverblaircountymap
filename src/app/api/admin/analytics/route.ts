// /api/admin/analytics.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  const client = await pool.connect();
  try {
    const topListingsRes = await client.query(`
  SELECT name, MAX(view_count) AS views, category, address
  FROM locations
  GROUP BY name, category, address
  ORDER BY views DESC
  LIMIT 10
`);

    const topCategoriesRes = await client.query(`
  SELECT name, view_count AS views FROM categories
  ORDER BY view_count DESC
  LIMIT 10
`);

    return NextResponse.json({
      topListings: topListingsRes.rows,
      topCategories: topCategoriesRes.rows,
    });
  } finally {
    client.release();
  }
}
