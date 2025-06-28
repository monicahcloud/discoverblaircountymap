import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT DISTINCT category FROM locations ORDER BY category"
    );
    const categories = result.rows.map(
      (row: { category: string }) => row.category
    );
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
