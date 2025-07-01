// app/api/categories/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT name, icon FROM categories ORDER BY name ASC"
    );
    client.release();

    return NextResponse.json(result.rows); // [{ name: "Golf", icon: "Golf" }, ...]
  } catch (error) {
    console.error("GET /api/categories failed", error);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  }
}
