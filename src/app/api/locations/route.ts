// app/api/locations/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  try {
    const result = await pool.query("SELECT * FROM locations");
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
