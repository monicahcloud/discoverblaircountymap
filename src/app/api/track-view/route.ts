// src/app/api/track-view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: NextRequest) {
  const { type, name } = await req.json();
  if (!type || !name || !["location", "category"].includes(type)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const table = type === "location" ? "locations" : "categories";

  try {
    const client = await pool.connect();
    const result = await client.query(
      `UPDATE ${table}
       SET view_count = COALESCE(view_count, 0) + 1
       WHERE name = $1
       RETURNING id, view_count`,
      [name]
    );
    client.release();

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...result.rows[0] });
  } catch (err) {
    console.error("Tracking error:", err);
    return NextResponse.json(
      { error: "Failed to track view" },
      { status: 500 }
    );
  }
}
